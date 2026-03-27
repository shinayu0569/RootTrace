/**
 * RootTrace — Proto-Language Reconstruction Engine (v3)
 *
 * Architecture: Hybrid pipeline (rule-based + probabilistic) implementing
 * the comparative method computationally across nine components:
 *
 *  §0  Cognate screening      — NED + SCA-class pre-screening of input pairs
 *  §1  Core methodology       — MSA alignment + formal correspondence table
 *                               + per-column regularity scores (Neogrammarian)
 *  §2  Language weighting     — Wt × Wc × Wr with floor threshold
 *  §3  Sound change model     — NaturalChangeBonus + diachronica frequencies
 *  §4  Uncertainty            — MCMC / Medoid solvers + missing-data imputation
 *  §4b Phylogenetic spread    — per-column areal diffusion / Sprachbund detection
 *  §5  Naturalness filters    — phonotactics, inventory symmetry, chain shifts
 *  §6  Algorithm pipeline     — EM loop (align → reconstruct → re-align, ×3)
 *  §7  Candidate scoring      — MDL Occam penalty + annotated k-best list
 *  §8  Edge-case handling     — merger detection, loanword signals, regularity,
 *                               analogical leveling detection
 */

import {
  LanguageInput, ReconstructionResult, TreeNode, SoundChangeNote,
  ReconstructionMethod, DistinctiveFeatures, ReconstructionParams,
  InferredShift, GeneralizedSoundLaw,
  CognateCompatibilityFlag, PhylogeneticSpreadScore,
} from '../types';
import {
  tokenizeIPA, needlemanWunsch, GAP_CHAR, getPhoneticDistance, FEATURE_MAP,
  getEffectiveFeatures, evaluateNaturalness, getSonority,
} from './phonetics';
import {
  identifySoundChange, NATURAL_SOUND_CHANGES, ChangeContext, DistinctiveFeaturesWithSymbol,
} from './soundChangeDb';
import { generalizeSoundChanges } from './generalizer';
import { applyShifts } from './soundShifter';
import diachronicaFreqs from '../diachronica_freqs.json';
import featureFreqs from '../feature_freqs.json';

// ═══════════════════════════════════════════════════════════════════════════════
// §8 — MERGER DETECTION  (Pulgram's Theorem)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * A merger occurs when a language collapses two distinct proto-phonemes into a
 * single reflex, erasing the distinction irrecoverably from that witness.
 *
 * Detection criterion:
 *   For columns A and B in the alignment:
 *     langRow[A] === langRow[B]  AND  proto[A] ≠ proto[B]
 *     AND at least one other language distinguishes A from B
 *   → flag a merger event for that language.
 *
 * The evidenceStrength is the fraction of OTHER languages that preserve the
 * distinction, providing a measure of how reliable the merger inference is.
 */
export interface MergerEvent {
  langName: string;
  colA: number;
  colB: number;
  mergedInto: string;
  protoA: string;
  protoB: string;
  evidenceStrength: number; // 0–1
}

const detectMergers = (
  langIdx: number,
  langName: string,
  alignmentMatrix: string[][],
  reconstructedTokens: string[]
): MergerEvent[] => {
  const events: MergerEvent[] = [];
  const langRow = alignmentMatrix[langIdx];
  if (!langRow || reconstructedTokens.length === 0) return events;

  const numCols = Math.min(langRow.length, reconstructedTokens.length);
  const nLangs = alignmentMatrix.length;

  for (let colA = 0; colA < numCols; colA++) {
    const reflexA = langRow[colA];
    if (reflexA === GAP_CHAR) continue;
    for (let colB = colA + 1; colB < numCols; colB++) {
      const reflexB = langRow[colB];
      if (reflexB === GAP_CHAR || reflexA !== reflexB) continue;
      const protoA = reconstructedTokens[colA];
      const protoB = reconstructedTokens[colB];
      if (!protoA || !protoB || protoA === protoB || protoA === GAP_CHAR || protoB === GAP_CHAR) continue;

      // Count witnesses that distinguish colA from colB
      let distinctionWitnesses = 0;
      for (let otherIdx = 0; otherIdx < nLangs; otherIdx++) {
        if (otherIdx === langIdx) continue;
        const otA = alignmentMatrix[otherIdx]?.[colA];
        const otB = alignmentMatrix[otherIdx]?.[colB];
        if (otA && otB && otA !== GAP_CHAR && otB !== GAP_CHAR && otA !== otB) distinctionWitnesses++;
      }
      if (distinctionWitnesses >= 1) {
        events.push({
          langName, colA, colB,
          mergedInto: reflexA, protoA, protoB,
          evidenceStrength: Math.min(1.0, distinctionWitnesses / (nLangs - 1)),
        });
      }
    }
  }
  return events;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §8 — LOANWORD SIGNAL DETECTION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Automatic borrowing heuristics — supplements the manual `isLoan` flag.
 *
 * Signal (a): Phonological irregularity — form deviates from proto-form
 *   more than natural change can account for. Irregular correspondences
 *   (high adjusted distance after naturalness bonus) are counted;
 *   ≥ 2 triggers a loan signal.
 *
 * Signal (b): Contact proximity — form is suspiciously similar to one
 *   sibling language while being far from the proto-form, consistent with
 *   horizontal borrowing rather than vertical inheritance.
 *
 * Signal strength ∈ [0,1]:  ≥ 0.65 → "likely loan"  |  ≥ 0.40 → "possible loan"
 */
export interface LoanwordSignal {
  langName: string;
  strength: number;
  reason: string;
}

const detectLoanwordSignals = (
  form: { word: string; name: string },
  otherForms: { word: string; name: string }[],
  reconstructedTokens: string[],
  params: ReconstructionParams
): LoanwordSignal[] => {
  const signals: LoanwordSignal[] = [];
  if (reconstructedTokens.length === 0 || otherForms.length === 0) return signals;

  const formTokens = tokenizeIPA(form.word);
  const { alignedA, alignedB } = needlemanWunsch(
    reconstructedTokens, formTokens, params.gapPenalty, params.unknownCharPenalty
  );

  let irregularPositions = 0, totalAdjustedDist = 0, assessedPositions = 0;
  for (let i = 0; i < alignedA.length; i++) {
    const proto = alignedA[i], reflex = alignedB[i];
    if (proto === GAP_CHAR || reflex === GAP_CHAR) continue;
    const dist = getPhoneticDistance(proto, reflex, params.gapPenalty, params.unknownCharPenalty);
    const bonus = getNaturalChangeBonus(
      proto, reflex,
      i > 0 ? alignedA[i - 1] : null,
      i < alignedA.length - 1 ? alignedA[i + 1] : null
    );
    const adj = Math.max(0, dist - bonus);
    totalAdjustedDist += adj; assessedPositions++;
    if (adj > 0.55) irregularPositions++;
  }

  if (assessedPositions > 0 && irregularPositions >= 2) {
    signals.push({
      langName: form.name,
      strength: Math.min(0.85, irregularPositions * 0.22 + 0.15),
      reason: `${irregularPositions} phonologically irregular correspondences with proto-form`,
    });
  }

  const avgProtoDist = assessedPositions > 0 ? totalAdjustedDist / assessedPositions : 1.0;
  for (const other of otherForms) {
    if (other.name === form.name) continue;
    const otherTokens = tokenizeIPA(other.word);
    const { alignedA: oa, alignedB: ob } = needlemanWunsch(
      formTokens, otherTokens, params.gapPenalty, params.unknownCharPenalty
    );
    let contactDist = 0, contactPos = 0;
    for (let i = 0; i < oa.length; i++) {
      if (oa[i] === GAP_CHAR || ob[i] === GAP_CHAR) continue;
      contactDist += getPhoneticDistance(oa[i], ob[i], params.gapPenalty, params.unknownCharPenalty);
      contactPos++;
    }
    const avgContact = contactPos > 0 ? contactDist / contactPos : 1.0;
    if (avgContact < avgProtoDist * 0.35 && avgProtoDist > 0.30) {
      signals.push({
        langName: form.name, strength: 0.52,
        reason: `Unusually close to ${other.name} while distant from proto-form (possible contact borrowing)`,
      });
    }
  }
  return signals;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §0 — NED + SCA-CLASS COGNATE COMPATIBILITY SCREENING
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Pre-screening step implementing §1 Core Methodology (NED + LexStat-style
 * SCA class overlap) applied to every pair of input forms BEFORE alignment.
 *
 * NED (Normalized Edit Distance):
 *   sim(wᵢ, wⱼ) = editDist(tokᵢ, tokⱼ) / max(|tokᵢ|, |tokⱼ|)
 *   Operates on phoneme token arrays, not raw characters.
 *
 * SCA-class overlap:
 *   After pairwise NW alignment, the proportion of non-gap columns where
 *   both tokens share the same broad Sound-Class Model class (P/S/N/L/V/G).
 *   This captures structural correspondences that raw edit distance misses
 *   (e.g., p~f = same class P = cognate; p~a = different = not cognate).
 *
 * Verdict heuristics (tuned for cross-family screening, not within-family):
 *   ned < 0.20 AND scaMatch > 0.80 → 'possible_loan'  (too similar)
 *   ned > 0.80 OR  scaMatch < 0.20 → 'questionable'   (too dissimilar)
 *   otherwise                      → 'cognate'         (normal divergence)
 */

/** Simple SCA broad class assignment */
const getSCAClass = (phoneme: string): string => {
  if (phoneme === GAP_CHAR) return '_';
  const ft = getEffectiveFeatures(phoneme);
  if (!ft) return 'X';
  if (ft.syllabic) return 'V';                                 // Vowel
  if (ft.nasal) return 'N';                                    // Nasal
  if (ft.lateral || (ft.sonorant && ft.continuant && ft.consonantal)) return 'L'; // Liquid
  if (ft.continuant && ft.consonantal) return 'S';             // Fricative
  if (ft.consonantal && !ft.continuant) return 'P';            // Plosive/Affricate
  if (ft.sonorant && !ft.syllabic) return 'G';                 // Glide
  return 'X';
};

/** Normalised Edit Distance on phoneme token arrays */
const computeTokenNED = (a: string[], b: string[]): number => {
  if (a.length === 0 && b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[a.length][b.length] / maxLen;
};

/** SCA-class overlap on an already-aligned pair */
const computeSCAOverlap = (alignedA: string[], alignedB: string[]): number => {
  let matches = 0, total = 0;
  for (let i = 0; i < alignedA.length; i++) {
    const a = alignedA[i], b = alignedB[i];
    if (a === GAP_CHAR || b === GAP_CHAR) continue;
    total++;
    if (getSCAClass(a) === getSCAClass(b)) matches++;
  }
  return total > 0 ? matches / total : 0;
};

/**
 * Screen all pairs of input forms for cognate compatibility.
 * Returns one flag per ordered pair (i < j).
 */
const screenCognateCompatibility = (
  forms: { word: string; name: string }[],
  params: ReconstructionParams
): CognateCompatibilityFlag[] => {
  const flags: CognateCompatibilityFlag[] = [];
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      const tokA = tokenizeIPA(forms[i].word);
      const tokB = tokenizeIPA(forms[j].word);
      const ned = computeTokenNED(tokA, tokB);
      const { alignedA, alignedB } = needlemanWunsch(
        tokA, tokB, params.gapPenalty, params.unknownCharPenalty
      );
      const scaMatch = computeSCAOverlap(alignedA, alignedB);

      let verdict: 'cognate' | 'possible_loan' | 'questionable';
      if (ned < 0.20 && scaMatch > 0.80) verdict = 'possible_loan';
      else if (ned > 0.80 || scaMatch < 0.20)  verdict = 'questionable';
      else                                       verdict = 'cognate';

      flags.push({
        langA: forms[i].name,
        langB: forms[j].name,
        nedDistance: parseFloat(ned.toFixed(3)),
        scaClassMatch: parseFloat(scaMatch.toFixed(3)),
        verdict,
      });
    }
  }
  return flags;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §1 — PER-COLUMN REGULARITY SCORE  (Neogrammarian Regularity Criterion)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * For each alignment column, compute how "regular" the correspondence is:
 *   regularityScore(col) = Σ w(Lᵢ) · regularity(Lᵢ, col) / Σ w(Lᵢ)
 *
 * where regularity(Lᵢ, col) is:
 *   1.0  if the reflex equals the proto-form (no change)
 *   max(0, 1 − adjustedDist)  where adjustedDist = dist(reflex, proto) − naturalChangeBonus
 *   0.0  for gap cells (missing data, does not contribute)
 *
 * A score of 1.0 means all attested reflexes are regular (either unchanged or
 * traceable through a plausible natural change rule). A score < 0.6 means at
 * least one language shows a hard-to-explain irregular correspondence and
 * the column should be flagged for manual review (MIN_REGULARITY_THRESHOLD).
 *
 * This is the computational implementation of the Neogrammarian principle:
 * sound change is regular (exceptionless) — exceptions must be explained
 * by borrowing, analogy, or lexical diffusion.
 */
const MIN_REGULARITY_THRESHOLD = 0.60; // Columns below this are flagged

const computeRegularityScores = (
  alignmentMatrix: string[][],
  reconstructedTokens: string[],
  languageWeights: number[]
): number[] => {
  const numCols = reconstructedTokens.length;
  const scores: number[] = [];

  for (let col = 0; col < numCols; col++) {
    const proto = reconstructedTokens[col];
    if (!proto || proto === GAP_CHAR) { scores.push(1.0); continue; }

    let totalWeight = 0;
    let regularWeight = 0;

    alignmentMatrix.forEach((row, langIdx) => {
      const reflex = row?.[col];
      if (!reflex || reflex === GAP_CHAR) return; // missing data: no contribution
      const w = languageWeights[langIdx] ?? 1.0;
      totalWeight += w;

      if (reflex === proto) {
        regularWeight += w; // identical: perfectly regular
      } else {
        const left  = col > 0 ? reconstructedTokens[col - 1] : null;
        const right = col < numCols - 1 ? reconstructedTokens[col + 1] : null;
        const dist  = getPhoneticDistance(reflex, proto, 0.5, 0.8);
        const bonus = getNaturalChangeBonus(proto, reflex, left, right);
        const adjustedDist = Math.max(0, dist - bonus);
        // Regularity contribution falls off linearly with adjusted distance;
        // a perfectly natural change (adjustedDist ≈ 0) scores 1.0.
        regularWeight += w * Math.max(0, 1 - adjustedDist);
      }
    });

    scores.push(totalWeight > 0 ? Math.min(1.0, regularWeight / totalWeight) : 1.0);
  }
  return scores;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §4b — PHYLOGENETIC SPREAD SCORING  (Sprachbund / Areal Diffusion Detection)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * For each alignment column, count how many of the top-level independent
 * lineages provide non-gap evidence.
 *
 * spread(col) = evidencingLineages(col) / totalLineages
 *
 * Interpretation:
 *   spread ≥ 0.66 → correspondence is well-attested across the family
 *                   (unlikely to be areal)
 *   spread 0.33–0.66 → partial evidence; treat with caution
 *   spread < 0.33 → correspondence is confined to a geographic cluster;
 *                   flag as possible areal feature (Sprachbund)
 *
 * This implements the §8 phylogenetic position check heuristic:
 *   "If a supposed cognate appears only in geographically adjacent languages
 *    and not in more distant relatives, borrowing is the more parsimonious
 *    explanation."
 *
 * Note: In single-word reconstruction the "lineages" are the top-level
 * LanguageInput nodes. In a batch system, subtree representatives would
 * be used (already implemented via inferCladeRepresentative).
 */
const computePhylogeneticSpread = (
  alignmentMatrix: string[][],
  totalLineages: number
): PhylogeneticSpreadScore[] => {
  if (alignmentMatrix.length === 0 || totalLineages === 0) return [];
  const numCols = alignmentMatrix[0].length;
  const scores: PhylogeneticSpreadScore[] = [];

  for (let col = 0; col < numCols; col++) {
    let evidencing = 0;
    for (let row = 0; row < alignmentMatrix.length; row++) {
      const ph = alignmentMatrix[row]?.[col];
      if (ph && ph !== GAP_CHAR) evidencing++;
    }
    scores.push({
      columnId: col,
      spread: parseFloat((evidencing / totalLineages).toFixed(3)),
      evidencingLineages: evidencing,
      totalLineages,
    });
  }
  return scores;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §8 — ANALOGICAL LEVELING DETECTION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Detects suspicious within-language paradigm uniformity that may indicate
 * analogical leveling has erased inherited ablaut grades or
 * morphophonological alternations.
 *
 * Detection criterion (§8 Analogical Leveling):
 *   A language is flagged when it shows the SAME reflex across ≥ 2 consecutive
 *   alignment columns while the reconstructed proto-form shows DISTINCT segments
 *   at those same positions. This is consistent with a daughter language having
 *   generalised one grade of an alternation paradigm throughout.
 *
 * Example (PIE ablaut):
 *   Proto: *e … *o (ablaut grades)
 *   Latin: e … e   (levelled to e-grade) → flag: col N–N+1
 *
 * False-positive mitigation:
 *   Only flags runs of length ≥ 2 to avoid flagging a single identical segment
 *   (extremely common for high-frequency consonants like /p/, /t/).
 *   Flags are not used to penalise reconstruction; they are informational only.
 */
const detectAnalogicalLeveling = (
  alignmentMatrix: string[][],
  langNames: string[],
  reconstructedTokens: string[]
): string[] => {
  const flags: string[] = [];

  alignmentMatrix.forEach((row, langIdx) => {
    const langName = langNames[langIdx] || `lang_${langIdx}`;
    let uniformRunLen = 0;
    let lastReflex: string | null = null;
    let runStartCol = 0;

    for (let col = 0; col < row.length; col++) {
      const reflex = row[col];
      const proto  = reconstructedTokens[col];

      // Skip gaps and columns where proto is also a gap
      if (!reflex || reflex === GAP_CHAR || !proto || proto === GAP_CHAR) {
        uniformRunLen = 0; lastReflex = null; continue;
      }

      if (reflex === lastReflex && proto !== lastReflex) {
        // Same reflex, different proto — extending a suspicious uniform run
        if (uniformRunLen === 0) runStartCol = col - 1;
        uniformRunLen++;
      } else {
        uniformRunLen = 0;
      }
      lastReflex = reflex;

      if (uniformRunLen >= 2) {
        const protoAlternation = reconstructedTokens
          .slice(runStartCol, col + 1)
          .filter(t => t !== GAP_CHAR)
          .join('');
        const flag = `${langName}: possible analogical leveling — '${reflex}' appears uniformly `
          + `at positions ${runStartCol}–${col} masking proto-alternation *${protoAlternation}`;
        if (!flags.includes(flag)) flags.push(flag);
      }
    }
  });

  return flags;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §2 — THREE-COMPONENT LANGUAGE WEIGHTING  W(Lᵢ) = Wt × Wc × Wr
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Wt — Chronological weight (hyperbolic decay 1/(1+α·Δt)):
 *   Older languages have undergone fewer changes → higher fidelity.
 *   Hyperbolic rather than exponential: phonological change is not time-linear.
 *
 * Wc — Phonological conservatism score:
 *   Ratio of phonemic distinctions retained relative to the most conservative
 *   attested language. Languages with many mergers receive lower Wc, reducing
 *   their vote weight specifically at merger-prone positions.
 *   Wc(Lᵢ) = |retained distinctions| / |max distinctions across family|
 *
 * Wr — Data reliability weight:
 *   Proxy from attestation era. In production this uses explicit corpus metadata
 *   (text genre diversity, corpus size, editorial standardisation). Here we use
 *   an era-based schedule: ancient literary traditions score highest.
 *
 * Phylogenetic spread downscaling (§4b integration):
 *   At columns where spread < SPREAD_THRESHOLD, the weights of ALL languages
 *   are scaled down by SPREAD_SCALE_FACTOR, reducing the influence of a
 *   potentially areal (non-inherited) correspondence on the reconstruction.
 *   This is a soft penalty, not a hard exclusion.
 *
 * Floor threshold (WEIGHT_FLOOR = 0.40):
 *   No single language may exceed this fraction of total weight mass.
 *   Prevents archaism bias (§2: bottleneck effect) where one very old but
 *   sparse language dominates the reconstruction.
 */

const ALPHA_DECAY        = 0.05;  // hyperbolic decay constant for Wt (centuries)
const WEIGHT_FLOOR       = 0.40;  // max fraction of total weight any one language holds
const SPREAD_THRESHOLD   = 0.33;  // phylogenetic spread below this triggers downscaling
const SPREAD_SCALE_FACTOR = 0.70; // weight multiplier applied when spread is low

/** Wt: hyperbolic chronological decay */
const computeWt = (yearOfLanguage: number, protoYear: number): number => {
  const deltaT = Math.max(0, (yearOfLanguage - protoYear) / 100);
  return 1 / (1 + ALPHA_DECAY * deltaT);
};

/**
 * Wc: phonological conservatism.
 * Measures phoneme diversity at all assessed positions; applies a continuous
 * penalty for positions where this language shows merger evidence.
 */
const computeWc = (langIdx: number, alignmentMatrix: string[][]): number => {
  const nLangs = alignmentMatrix.length;
  if (nLangs <= 1) return 1.0;
  const langRow = alignmentMatrix[langIdx];
  if (!langRow) return 0.5;

  const langDistinct = new Set(langRow.filter(p => p !== GAP_CHAR));
  let maxOtherDistinct = 0;
  for (let otherIdx = 0; otherIdx < nLangs; otherIdx++) {
    if (otherIdx === langIdx) continue;
    const d = new Set((alignmentMatrix[otherIdx] || []).filter(p => p !== GAP_CHAR)).size;
    if (d > maxOtherDistinct) maxOtherDistinct = d;
  }
  if (maxOtherDistinct === 0) return 1.0;

  // Continuous merger penalty: positions where others show 2+ phonemes but we show 1
  let mergerPenalty = 0;
  for (let col = 0; col < langRow.length; col++) {
    const myPhoneme = langRow[col];
    if (myPhoneme === GAP_CHAR) continue;
    const otherPhonemes = new Set<string>();
    for (let otherIdx = 0; otherIdx < nLangs; otherIdx++) {
      if (otherIdx === langIdx) continue;
      const op = alignmentMatrix[otherIdx]?.[col];
      if (op && op !== GAP_CHAR) otherPhonemes.add(op);
    }
    if (otherPhonemes.size >= 2 && otherPhonemes.has(myPhoneme)) mergerPenalty += 0.02;
  }

  const rawConservatism = langDistinct.size / maxOtherDistinct;
  return Math.max(0.30, Math.min(1.0, rawConservatism - mergerPenalty));
};

/** Wr: data reliability (era-based schedule) */
const computeWr = (year: number): number => {
  if (year <= -1000) return 1.00; // Vedic, Mycenaean, Hittite
  if (year <= -500)  return 0.97; // Archaic Latin, Old Avestan
  if (year <=  500)  return 0.94; // Classical Sanskrit, Homeric Greek, Latin
  if (year <= 1000)  return 0.88; // Old English, Old Church Slavonic
  if (year <= 1300)  return 0.83; // Middle High German, Old French
  if (year <= 1600)  return 0.78; // Early Modern attestations
  if (year <= 1800)  return 0.73;
  return 0.68;
};

/**
 * Apply floor threshold: rescale any language whose proportion of total weight
 * exceeds WEIGHT_FLOOR down to exactly that proportion.
 */
const applyFloorThreshold = (rawWeights: number[]): number[] => {
  const total = rawWeights.reduce((s, w) => s + w, 0);
  if (total === 0) return rawWeights.map(() => 1.0);
  return rawWeights.map(w => {
    const proportion = w / total;
    return proportion > WEIGHT_FLOOR ? w * (WEIGHT_FLOOR / proportion) : w;
  });
};

/** Full W(Lᵢ) = Wt × Wc × Wr, then apply floor threshold across all languages */
const computeFullWeights = (
  topLevelForms: { year: number }[],
  alignmentMatrix: string[][],
  protoYear: number
): number[] => {
  const raw = topLevelForms.map((f, idx) =>
    computeWt(f.year, protoYear) * computeWc(idx, alignmentMatrix) * computeWr(f.year)
  );
  return applyFloorThreshold(raw);
};

/**
 * Column-level weight scaling for low-spread columns (§4b integration).
 * Returns a per-column weight multiplier array (1.0 = no scaling).
 */
const computeColumnSpreadMultipliers = (
  spreadScores: PhylogeneticSpreadScore[]
): number[] => {
  return spreadScores.map(s =>
    s.spread < SPREAD_THRESHOLD ? SPREAD_SCALE_FACTOR : 1.0
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// §1 — FORMAL CORRESPONDENCE TABLE
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Φₖ = { (L₁, s₁), (L₂, s₂), …, (Lₙ, sₙ) }
 *
 * A correspondence is SYSTEMATIC if it recurs across ≥ MIN_SUPPORT_THRESHOLD
 * independent cognate pairs (Neogrammarian regularity criterion).
 *
 * In single-word reconstruction mode (the current architecture), each column
 * has supportCount = 1. In a batch/system mode, counts accumulate across many
 * cognate sets and only systematic correspondences drive reconstruction.
 *
 * mergerEvidence lists positions where the same reflex appears to absorb
 * phonemes that other languages distinguish.
 */
const MIN_SUPPORT_THRESHOLD = 3;

interface CorrespondenceSet {
  columnId: number;
  entries: Map<string, string | null>;
  supportCount: number;
  isSystematic: boolean;
  mergerEvidence: string[];
}

const buildCorrespondenceTable = (
  langNames: string[],
  alignmentMatrix: string[][]
): CorrespondenceSet[] => {
  if (alignmentMatrix.length === 0) return [];
  const numCols = alignmentMatrix[0].length;
  const table: CorrespondenceSet[] = [];

  for (let col = 0; col < numCols; col++) {
    const entries = new Map<string, string | null>();
    const mergerEvidence: string[] = [];
    const seenReflexes = new Map<string, string[]>();

    for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
      const langName = langNames[langIdx] || `lang_${langIdx}`;
      const phoneme = alignmentMatrix[langIdx]?.[col] ?? GAP_CHAR;
      entries.set(langName, phoneme === GAP_CHAR ? null : phoneme);
      if (phoneme !== GAP_CHAR) {
        if (!seenReflexes.has(phoneme)) seenReflexes.set(phoneme, []);
        seenReflexes.get(phoneme)!.push(langName);
      }
    }

    // Flag potential merger: same reflex used by multiple languages at this column
    const uniqueReflexCount = seenReflexes.size;
    if (uniqueReflexCount < entries.size * 0.5 && entries.size >= 3) {
      seenReflexes.forEach((langs, reflex) => {
        if (langs.length > 1) mergerEvidence.push(`*?→${reflex} in {${langs.join(', ')}}`);
      });
    }

    table.push({
      columnId: col,
      entries,
      supportCount: 1,
      isSystematic: true, // becomes false in batch mode when supportCount < threshold
      mergerEvidence,
    });
  }
  return table;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §4 — MISSING DATA IMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Predict the expected reflex for a missing cell (langIdx, col) given:
 *   1. The current proto-form candidate at that column.
 *   2. The attested reflexes of other languages at that column.
 *
 * The imputed value is down-weighted by IMPUTATION_DECAY (0.50) to reflect
 * epistemic uncertainty: imputed evidence is half as reliable as attested evidence.
 *
 * Strategy: score each possible phoneme by combining:
 *   (a) log-frequency among attested sibling reflexes (majority preference)
 *   (b) phonetic closeness to the proto-phoneme (naturalness preference)
 * and return the highest-scoring candidate.
 */
const IMPUTATION_DECAY = 0.50;

const imputeMissingPhoneme = (
  protoPhoneme: string,
  colIdx: number,
  alignmentMatrix: string[][],
  excludeLangIdx: number
): { phoneme: string; confidenceMultiplier: number } => {
  if (protoPhoneme === GAP_CHAR) return { phoneme: GAP_CHAR, confidenceMultiplier: 0.3 };

  const freq = new Map<string, number>();
  for (let idx = 0; idx < alignmentMatrix.length; idx++) {
    if (idx === excludeLangIdx) continue;
    const reflex = alignmentMatrix[idx]?.[colIdx];
    if (reflex && reflex !== GAP_CHAR) freq.set(reflex, (freq.get(reflex) || 0) + 1);
  }

  if (freq.size === 0) return { phoneme: protoPhoneme, confidenceMultiplier: IMPUTATION_DECAY };

  let bestPhoneme = protoPhoneme, bestScore = -Infinity;
  freq.forEach((count, phoneme) => {
    const dist = getPhoneticDistance(protoPhoneme, phoneme, 0.5, 0.8);
    const score = Math.log(count + 1) + Math.max(0, 1.0 - dist) * 0.5;
    if (score > bestScore) { bestScore = score; bestPhoneme = phoneme; }
  });
  return { phoneme: bestPhoneme, confidenceMultiplier: IMPUTATION_DECAY };
};

// ═══════════════════════════════════════════════════════════════════════════════
// §7 — MDL COMPLEXITY PENALTY  (Occam's Razor)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Score(candidate) = P(data | candidate) − λ · Complexity(candidate)
 *
 * Complexity is measured by:
 *   1. Inventory cost: number of distinct proto-phonemes used
 *   2. Rule cost: number of unique implied sound-change rules (A → B)
 *   3. Length penalty: sequences longer than the attested average
 *
 * λ = LAMBDA_MDL = 0.12 controls parsimony strength.
 * A lower λ permits more complex reconstructions; a higher λ aggressively
 * prefers the simplest candidates.
 */
const LAMBDA_MDL = 0.12;

const computeMDLComplexity = (
  candidateChars: string[],
  alignmentMatrix: string[][]
): number => {
  let complexity = 0;

  // 1. Inventory cost
  const distinctProto = new Set(candidateChars.filter(c => c !== GAP_CHAR));
  complexity += distinctProto.size * 0.08;

  // 2. Rule cost: unique implied proto → reflex correspondences
  const impliedRules = new Set<string>();
  for (let col = 0; col < candidateChars.length; col++) {
    const proto = candidateChars[col];
    if (proto === GAP_CHAR) continue;
    for (const row of alignmentMatrix) {
      const reflex = row?.[col];
      if (reflex && reflex !== GAP_CHAR && reflex !== proto) impliedRules.add(`${proto}→${reflex}`);
    }
  }
  complexity += impliedRules.size * 0.06;

  // 3. Length penalty
  const avgAttestedLen = alignmentMatrix.length > 0
    ? alignmentMatrix.reduce((s, r) => s + r.filter(c => c !== GAP_CHAR).length, 0) / alignmentMatrix.length
    : candidateChars.length;
  const excess = Math.max(0, candidateChars.filter(c => c !== GAP_CHAR).length - avgAttestedLen);
  complexity += excess * 0.04;

  return complexity;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §7 — ANNOTATED CANDIDATE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Confidence level classification:
 *   HIGH       — probability > 0.70, ≥ 80% languages support, no mergers
 *   MEDIUM     — probability > 0.45, ≥ 60% support, ≤ 1 merger
 *   LOW        — probability > 0.25, ≥ 40% support
 *   SPECULATIVE — weak evidence, contradictory data, or strong loan signals
 */
export interface AnnotatedCandidate {
  form: string;
  probability: number;
  chars: string[];
  mdlAdjustedScore: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'speculative';
  supportingLanguages: string[];
  conflictingLanguages: string[];
  impliedRules: string[];
  mergerFlags: string[];
  loanSignals: LoanwordSignal[];
}

const classifyConfidence = (
  probability: number,
  supportingRatio: number,
  mergerCount: number,
  loanSignalStrength: number
): 'high' | 'medium' | 'low' | 'speculative' => {
  if (loanSignalStrength > 0.6) return 'speculative';
  if (probability >= 0.70 && supportingRatio >= 0.80 && mergerCount === 0) return 'high';
  if (probability >= 0.45 && supportingRatio >= 0.60 && mergerCount <= 1) return 'medium';
  if (probability >= 0.25 && supportingRatio >= 0.40) return 'low';
  return 'speculative';
};

const annotateCandidate = (
  candidate: { form: string; probability: number; chars: string[] },
  topLevelForms: { name: string; word: string }[],
  mergerEvents: MergerEvent[],
  loanSignals: LoanwordSignal[],
  params: ReconstructionParams
): AnnotatedCandidate => {
  const { alignmentMatrix, protoTokens } = performMSA_to_proto(topLevelForms, candidate.chars, params);
  const langNames = topLevelForms.map(f => f.name);
  const supporting: string[] = [], conflicting: string[] = [];
  const impliedRules = new Set<string>();

  for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
    const langName = langNames[langIdx] || `lang_${langIdx}`;
    const row = alignmentMatrix[langIdx];
    if (!row) continue;
    let langConflict = false;
    for (let col = 0; col < protoTokens.length; col++) {
      const proto = protoTokens[col], reflex = row[col];
      if (!reflex || proto === GAP_CHAR) continue;
      if (reflex !== GAP_CHAR && reflex !== proto) {
        impliedRules.add(`*${proto} → ${reflex}`);
        const dist = getPhoneticDistance(proto, reflex, params.gapPenalty, params.unknownCharPenalty);
        const bonus = getNaturalChangeBonus(proto, reflex,
          col > 0 ? protoTokens[col - 1] : null,
          col < protoTokens.length - 1 ? protoTokens[col + 1] : null
        );
        if (Math.max(0, dist - bonus) > 0.7) langConflict = true;
      }
    }
    if (langConflict) conflicting.push(langName);
    else supporting.push(langName);
  }

  const supportingRatio = supporting.length / Math.max(1, langNames.length);
  const maxLoanStrength = loanSignals.reduce((m, s) => Math.max(m, s.strength), 0);
  const complexity = computeMDLComplexity(protoTokens, alignmentMatrix);
  const mdlAdjustedScore = Math.max(0, candidate.probability - LAMBDA_MDL * complexity);

  return {
    form: candidate.form,
    probability: candidate.probability,
    chars: candidate.chars,
    mdlAdjustedScore,
    confidenceLevel: classifyConfidence(mdlAdjustedScore, supportingRatio, mergerEvents.length, maxLoanStrength),
    supportingLanguages: supporting,
    conflictingLanguages: conflicting,
    impliedRules: Array.from(impliedRules),
    mergerFlags: mergerEvents.map(m =>
      `Merger in ${m.langName}: *${m.protoA} and *${m.protoB} both → ${m.mergedInto} (confidence ${m.evidenceStrength.toFixed(2)})`
    ),
    loanSignals,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// §5 — NATURALNESS PILLARS
// ═══════════════════════════════════════════════════════════════════════════════

/** Pillar 1: Sonority Sequencing Principle + cluster penalties */
const evaluateSequenceNaturalness = (sequence: string[]): number => {
  const tokens = sequence.filter(t => t !== GAP_CHAR && t !== '.' && t !== ',');
  if (tokens.length === 0) return 0;
  let penalty = 0;
  const sonorities = tokens.map(getSonority);
  for (let i = 0; i < sonorities.length; i++) {
    const current = sonorities[i];
    const prev = i > 0 ? sonorities[i - 1] : null;
    if (i === 1 && prev !== null && prev < 10 && current < 10 && prev > current) penalty += 5.0;
    if (prev !== null && prev < 10 && current < 10) {
      penalty += 0.5;
      if (i > 1 && sonorities[i - 2] < 10) penalty += 2.0;
    }
  }
  return penalty;
};

/** Pillar 2: Feature economy + consonant/vowel balance */
const evaluateInventorySymmetry = (sequence: string[]): number => {
  const uniqueTokens = Array.from(new Set(sequence.filter(t => t !== GAP_CHAR && t !== '.' && t !== ',')));
  if (uniqueTokens.length <= 1) return 0;
  let penalty = 0;
  const usedFeatures = new Set<string>();
  let validTokens = 0;
  uniqueTokens.forEach(token => {
    const features = getEffectiveFeatures(token);
    if (features) {
      validTokens++;
      Object.entries(features).forEach(([key, value]) => {
        if (value === true || (typeof value === 'number' && value !== 0)) usedFeatures.add(`${key}:${value}`);
      });
    }
  });
  if (validTokens > 0) {
    const economyRatio = usedFeatures.size / validTokens;
    if (economyRatio > 2.0) penalty += (economyRatio - 2.0) * 1.5;
  }
  let consonants = 0, vowels = 0;
  sequence.forEach(token => {
    if (token === GAP_CHAR) return;
    const f = getEffectiveFeatures(token);
    if (f) { if (f.syllabic) vowels++; else if (f.consonantal) consonants++; }
  });
  if (sequence.length > 2) {
    if (vowels === 0) penalty += 3.0;
    if (consonants === 0) penalty += 1.0;
    if (consonants > 0 && vowels > 0 && consonants / vowels > 4.0) penalty += 1.0;
  }
  return penalty;
};

/** Pillar 3: Chain shift awareness — reward contrast-preserving shifts, penalise mergers */
const evaluateChainShifts = (sequence: string[], alignmentMatrix: string[][]): number => {
  let penalty = 0;
  for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
    const descendantWord = alignmentMatrix[langIdx];
    const shifts = new Map<string, Set<string>>();
    const mergers = new Map<string, Set<string>>();
    for (let col = 0; col < sequence.length; col++) {
      const proto = sequence[col], reflex = descendantWord?.[col];
      if (!reflex || proto === GAP_CHAR || reflex === GAP_CHAR) continue;
      if (!shifts.has(proto)) shifts.set(proto, new Set());
      shifts.get(proto)!.add(reflex);
      if (!mergers.has(reflex)) mergers.set(reflex, new Set());
      mergers.get(reflex)!.add(proto);
    }
    mergers.forEach(protoSet => { if (protoSet.size > 1) penalty += (protoSet.size - 1) * 0.5; });
    shifts.forEach((reflexSet, proto) => {
      reflexSet.forEach(reflex => {
        if (proto !== reflex && shifts.has(reflex)) {
          shifts.get(reflex)!.forEach(chainedReflex => {
            if (chainedReflex !== proto && chainedReflex !== reflex) penalty -= 0.5;
          });
        }
      });
    });
  }
  return penalty;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §3 — NATURAL CHANGE BONUS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Assigns a bonus to a proto→reflex correspondence based on:
 *   1. Matched rules in the NATURAL_SOUND_CHANGES database
 *   2. Index Diachronica frequency data
 *   3. Feature-shift frequency data (featureFreqs.json)
 *   4. Generative naturalness evaluation (evaluateNaturalness)
 *   5. Positional weighting (lenition in weak positions, stability in strong)
 *   6. Nasal assimilation and palatalization bonuses
 *   7. Directional penalties for fortition and denasalisation
 *
 * The bonus is subtracted from the phonetic distance before weighting,
 * so natural changes incur lower effective cost than unnatural ones.
 */
const getNaturalChangeBonus = (p: string, reflex: string, left: string | null, right: string | null): number => {
  const fP = getEffectiveFeatures(p), fR = getEffectiveFeatures(reflex);
  if (!fP || !fR) return 0;
  let bonus = 0;
  const ctx: ChangeContext = {
    left: left && left !== GAP_CHAR ? getEffectiveFeatures(left) : null,
    right: right && right !== GAP_CHAR ? getEffectiveFeatures(right) : null,
    leftChar: left === GAP_CHAR ? null : left,
    rightChar: right === GAP_CHAR ? null : right,
  };
  const fP_full: DistinctiveFeaturesWithSymbol = { ...fP, symbol: p };
  const fR_full: DistinctiveFeaturesWithSymbol = { ...fR, symbol: reflex };
  const matchedRules = NATURAL_SOUND_CHANGES.filter(rule => rule.test(fP_full, fR_full, ctx));
  if (matchedRules.length > 0) bonus += matchedRules[0].priority * 0.03;
  const shiftKey = `${p}>${reflex}`;
  const freqData = (diachronicaFreqs as any)[shiftKey];
  if (freqData && freqData.count) {
    bonus += 0.03 + Math.log10(freqData.count) * 0.075;
  } else {
    const delta: string[] = [];
    for (const k in fP) {
      if (fP[k as keyof typeof fP] !== fR[k as keyof typeof fR]) delta.push(`${k}:${fR[k as keyof typeof fR]}`);
    }
    if (delta.length > 0) {
      const deltaKey = delta.sort().join(',');
      const featureFreq = (featureFreqs as any)[deltaKey];
      if (featureFreq) {
        bonus += 0.02 + Math.log10(featureFreq) * 0.03;
      } else {
        const naturalness = evaluateNaturalness(p, reflex, left, right);
        bonus += naturalness.score * 0.15;
      }
    }
  }
  const isVowel = (c: string | null) => c && FEATURE_MAP[c]?.syllabic;
  const isIntervocalic = left && right && isVowel(left) && isVowel(right);
  if (isIntervocalic || right === null) {
    if ((!fP.voice && fR.voice) || (fP.consonantal && !fR.consonantal) || reflex === GAP_CHAR) bonus += 0.12;
  }
  if (left === null && p === reflex) bonus += 0.04;
  if (fP.nasal && right && FEATURE_MAP[right] && !FEATURE_MAP[right].syllabic) {
    const rf = FEATURE_MAP[right];
    if ((fR.labial && rf.labial) || (fR.coronal && rf.coronal) || (fR.dorsal && rf.dorsal)) bonus += 0.12;
  }
  if ((fP.dorsal || fP.coronal) && fR.coronal && fR.delayedRelease) {
    if (right && FEATURE_MAP[right] && (FEATURE_MAP[right].high || FEATURE_MAP[right].coronal) && !FEATURE_MAP[right].consonantal) bonus += 0.12;
  }
  if (p !== reflex && reflex !== GAP_CHAR) {
    if (fP.continuant && !fR.continuant && !fR.nasal && !fP.lateral) {
      if (left && FEATURE_MAP[left] && !FEATURE_MAP[left].nasal && !FEATURE_MAP[left].consonantal) bonus -= 0.15;
    }
    if ((p === 'h' || p === 'ʔ') && (fR.labial || fR.coronal || fR.dorsal)) bonus -= 0.20;
    if (fP.nasal && !fR.nasal) {
      if (!right || !FEATURE_MAP[right] || FEATURE_MAP[right].continuant || FEATURE_MAP[right].syllabic) bonus -= 0.10;
    }
    if (fP.delayedRelease && fP.coronal && fR.dorsal && !fR.continuant) bonus -= 0.15;
  }
  return bonus;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §1/6 — MULTIPLE SEQUENCE ALIGNMENT (progressive centre-star)
// ═══════════════════════════════════════════════════════════════════════════════

const performMSA = (inputs: { word: string }[], params: ReconstructionParams): string[][] => {
  if (inputs.length === 0) return [];
  const tokensList = inputs.map(i => tokenizeIPA(i.word));
  if (inputs.length === 1) return tokensList;
  let centerIdx = 0, maxLen = 0;
  tokensList.forEach((t, i) => { if (t.length > maxLen) { maxLen = t.length; centerIdx = i; } });
  let alignmentGrid: string[][] = [tokensList[centerIdx]];
  const gridIndexToInputIndex = [centerIdx];
  tokensList.forEach((seq, idx) => {
    if (idx === centerIdx) return;
    const centerSeq = alignmentGrid[0];
    const { alignedA, alignedB } = needlemanWunsch(centerSeq, seq, params.gapPenalty, params.unknownCharPenalty);
    if (alignedA.length > centerSeq.length) {
      const newGrid: string[][] = [];
      let oldPtr = 0;
      for (let r = 0; r < alignmentGrid.length; r++) newGrid[r] = [];
      for (let k = 0; k < alignedA.length; k++) {
        if (alignedA[k] === GAP_CHAR && (oldPtr >= centerSeq.length || centerSeq[oldPtr] !== GAP_CHAR)) {
          for (let r = 0; r < alignmentGrid.length; r++) newGrid[r].push(GAP_CHAR);
        } else {
          for (let r = 0; r < alignmentGrid.length; r++) newGrid[r].push(alignmentGrid[r][oldPtr]);
          oldPtr++;
        }
      }
      alignmentGrid = newGrid;
    }
    alignmentGrid.push(alignedB);
    gridIndexToInputIndex.push(idx);
  });
  const finalGrid: string[][] = Array(inputs.length).fill([]);
  gridIndexToInputIndex.forEach((origIdx, gi) => { finalGrid[origIdx] = alignmentGrid[gi]; });
  return finalGrid;
};

/** Pillar 4: Joint alignment — re-align descendants to hypothesised proto-word */
export const performMSA_to_proto = (inputs: { word: string }[], protoTokens: string[], params: ReconstructionParams): { alignmentMatrix: string[][], protoTokens: string[] } => {
  if (inputs.length === 0) return { alignmentMatrix: [], protoTokens: [] };
  const tokensList = inputs.map(i => tokenizeIPA(i.word));
  let alignmentGrid: string[][] = [protoTokens];
  const gridIndexToInputIndex = [-1];
  tokensList.forEach((seq, idx) => {
    const centerSeq = alignmentGrid[0];
    const { alignedA, alignedB } = needlemanWunsch(centerSeq, seq, params.gapPenalty, params.unknownCharPenalty);
    if (alignedA.length > centerSeq.length) {
      const newGrid: string[][] = [];
      let oldPtr = 0;
      for (let r = 0; r < alignmentGrid.length; r++) newGrid[r] = [];
      for (let k = 0; k < alignedA.length; k++) {
        if (alignedA[k] === GAP_CHAR && (oldPtr >= centerSeq.length || centerSeq[oldPtr] !== GAP_CHAR)) {
          for (let r = 0; r < alignmentGrid.length; r++) newGrid[r].push(GAP_CHAR);
        } else {
          for (let r = 0; r < alignmentGrid.length; r++) newGrid[r].push(alignmentGrid[r][oldPtr]);
          oldPtr++;
        }
      }
      alignmentGrid = newGrid;
    }
    alignmentGrid.push(alignedB);
    gridIndexToInputIndex.push(idx);
  });
  const finalGrid: string[][] = Array(inputs.length).fill([]);
  gridIndexToInputIndex.forEach((origIdx, gi) => { if (origIdx !== -1) finalGrid[origIdx] = alignmentGrid[gi]; });
  return { alignmentMatrix: finalGrid, protoTokens: alignmentGrid[0] };
};

// ═══════════════════════════════════════════════════════════════════════════════
// §4 — PHOIBLE-INFORMED PHONETIC PRIOR
// ═══════════════════════════════════════════════════════════════════════════════

const PHONETIC_PRIOR: Record<string, number> = {
  'p': 1.20, 'b': 1.00, 't': 1.50, 'd': 1.30, 'k': 1.40, 'g': 1.10,
  'ʔ': 0.90, 'q': 0.50, 'pʰ': 0.70, 'tʰ': 0.75, 'kʰ': 0.70,
  'f': 0.80, 'v': 0.75, 'θ': 0.60, 'ð': 0.60,
  's': 1.20, 'z': 0.90, 'ʃ': 0.80, 'ʒ': 0.65,
  'x': 0.70, 'ɣ': 0.65, 'h': 0.80, 'ɦ': 0.55,
  'ɸ': 0.45, 'β': 0.55, 'χ': 0.50, 'ʁ': 0.55,
  'm': 1.10, 'n': 1.30, 'ŋ': 0.90, 'ɲ': 0.70,
  'l': 1.10, 'r': 1.20, 'ɾ': 0.90, 'ɹ': 0.70, 'ʀ': 0.50,
  'ɭ': 0.40, 'ʎ': 0.60, 'j': 1.10, 'w': 1.00, 'ɥ': 0.40,
  'ts': 0.65, 'dz': 0.55, 'tʃ': 0.70, 'dʒ': 0.65,
  'i': 1.30, 'y': 0.60, 'ɨ': 0.55, 'u': 1.20, 'ɯ': 0.45,
  'ɪ': 0.80, 'ʊ': 0.75, 'e': 1.00, 'ø': 0.55, 'ə': 0.95,
  'o': 1.00, 'ɤ': 0.40, 'ɛ': 0.85, 'œ': 0.50, 'ɔ': 0.80,
  'a': 1.50, 'æ': 0.75, 'ɑ': 0.80, 'ɒ': 0.55,
  'aː': 0.80, 'eː': 0.70, 'iː': 0.70, 'oː': 0.65, 'uː': 0.60,
  'r\u0329': 0.20, 'l\u0329': 0.20, 'n\u0329': 0.20, 'm\u0329': 0.20,
};

// ═══════════════════════════════════════════════════════════════════════════════
// §4 — COLUMN SOLVERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Medoid solver: deterministic warm-start.
 * Proposes only from attested reflexes (the observation set).
 * Missing data positions use imputation rather than the flat gap penalty.
 *
 * columnSpreadMultiplier: §4b integration — scales the effective weight
 * of ALL languages at this column when phylogenetic spread is low.
 */
const solveMedoid = (
  matrix: string[][], colIdx: number, params: ReconstructionParams,
  languageWeights?: number[], columnSpreadMultiplier?: number
): { char: string; dist: { [key: string]: number } } => {
  const spreadMult = columnSpreadMultiplier ?? 1.0;
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  if (validReflexes.length === 0) return { char: '', dist: {} };
  const universe = Array.from(new Set(validReflexes));
  let bestChar = universe[0], minCost = Infinity;
  const dist: Record<string, number> = {};

  universe.forEach(proto => {
    let cost = 0;
    matrix.forEach((row, langIdx) => {
      const weight = (languageWeights ? languageWeights[langIdx] : 1.0) * spreadMult;
      const reflex = row[colIdx];
      const left = colIdx > 0 ? row[colIdx - 1] : null;
      const right = colIdx < row.length - 1 ? row[colIdx + 1] : null;
      if (reflex === GAP_CHAR) {
        const imp = imputeMissingPhoneme(proto, colIdx, matrix, langIdx);
        const d = getPhoneticDistance(proto, imp.phoneme, params.gapPenalty, params.unknownCharPenalty);
        cost += d * weight * imp.confidenceMultiplier;
      } else {
        const d = getPhoneticDistance(proto, reflex, params.gapPenalty, params.unknownCharPenalty);
        const bonus = getNaturalChangeBonus(proto, reflex, left, right);
        cost += Math.max(0, d - bonus) * weight;
      }
    });
    if (cost < minCost) { minCost = cost; bestChar = proto; }
  });

  universe.forEach(p => {
    let cost = 0;
    matrix.forEach((row, langIdx) => {
      const weight = (languageWeights ? languageWeights[langIdx] : 1.0) * spreadMult;
      const reflex = row[colIdx];
      const left = colIdx > 0 ? row[colIdx - 1] : null;
      const right = colIdx < row.length - 1 ? row[colIdx + 1] : null;
      if (reflex === GAP_CHAR) {
        const imp = imputeMissingPhoneme(p, colIdx, matrix, langIdx);
        const d = getPhoneticDistance(p, imp.phoneme, params.gapPenalty, params.unknownCharPenalty);
        cost += d * weight * imp.confidenceMultiplier;
      } else {
        const d = getPhoneticDistance(p, reflex, params.gapPenalty, params.unknownCharPenalty);
        const bonus = getNaturalChangeBonus(p, reflex, left, right);
        cost += Math.max(0, d - bonus) * weight;
      }
    });
    dist[p] = Math.exp(-cost / 5);
  });
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  Object.keys(dist).forEach(k => dist[k] /= sum);
  return { char: bestChar, dist };
};

/**
 * Bayesian MCMC solver: explores the full phoneme universe.
 *
 * Improvements over v2:
 *  • columnSpreadMultiplier: §4b integration — scales language weights at
 *    low-spread columns to reduce the influence of areal correspondences.
 *  • Gap positions use imputation (§4) rather than flat gap penalty.
 *  • Syllabic consonants treated as weak vowel witnesses (not full gaps).
 *  • Weights use full Wt × Wc × Wr system (§2) after first EM iteration.
 *  • Neighbourhood threshold 0.35 prevents the degenerate all-neighbours case.
 *  • MCMC initialised from minimum-distance medoid for reproducibility.
 */
const solveMCMC = (
  matrix: string[][], colIdx: number, params: ReconstructionParams,
  languageWeights?: number[], columnSpreadMultiplier?: number
): { char: string; dist: { [key: string]: number } } => {
  const spreadMult = columnSpreadMultiplier ?? 1.0;
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  if (validReflexes.length === 0) return { char: '', dist: {} };

  const uniqueTokens = Array.from(new Set(matrix.flat().filter(c => c !== GAP_CHAR)));
  const universe = Array.from(new Set([...Object.keys(FEATURE_MAP), ...uniqueTokens]));
  const counts: Record<string, number> = {};

  const neighborsMap: Record<string, string[]> = {};
  universe.forEach(u => {
    neighborsMap[u] = universe.filter(
      v => getPhoneticDistance(u, v, params.gapPenalty, params.unknownCharPenalty) <= 0.35 && v !== u
    );
  });

  // Initialise from medoid of attested reflexes
  let current = validReflexes[0], minInitDist = Infinity;
  validReflexes.forEach(candidate => {
    const totalDist = validReflexes.reduce(
      (sum, r) => sum + getPhoneticDistance(candidate, r, params.gapPenalty, params.unknownCharPenalty), 0
    );
    if (totalDist < minInitDist) { minInitDist = totalDist; current = candidate; }
  });

  const getLogPosterior = (p: string) => {
    let logP = Math.log(PHONETIC_PRIOR[p] || 0.35);
    for (let langIdx = 0; langIdx < matrix.length; langIdx++) {
      const weight = (languageWeights ? languageWeights[langIdx] : 1.0) * spreadMult;
      const reflex = matrix[langIdx][colIdx];
      const left = colIdx > 0 ? matrix[langIdx][colIdx - 1] : null;
      const right = colIdx < matrix[0].length - 1 ? matrix[langIdx][colIdx + 1] : null;
      if (reflex === GAP_CHAR) {
        const imp = imputeMissingPhoneme(p, colIdx, matrix, langIdx);
        const d = getPhoneticDistance(p, imp.phoneme, params.gapPenalty, params.unknownCharPenalty);
        logP -= d * weight * imp.confidenceMultiplier * 1.1;
      } else {
        const reflexFeats = getEffectiveFeatures(reflex);
        const isSyllabicCons = reflexFeats && reflexFeats.syllabic && reflexFeats.consonantal;
        if (isSyllabicCons) {
          logP -= 1.0 * weight;
        } else {
          const d = getPhoneticDistance(p, reflex, params.gapPenalty, params.unknownCharPenalty);
          const bonus = getNaturalChangeBonus(p, reflex, left, right);
          logP -= Math.max(0, d - bonus) * 1.1 * weight;
        }
      }
    }
    return logP;
  };

  let currentLogP = getLogPosterior(current);
  for (let i = 0; i < params.mcmcIterations; i++) {
    const currentNeighbors = neighborsMap[current];
    const proposal = (Math.random() < 0.75 && currentNeighbors.length > 0)
      ? currentNeighbors[Math.floor(Math.random() * currentNeighbors.length)]
      : universe[Math.floor(Math.random() * universe.length)];
    const proposalLogP = getLogPosterior(proposal);
    const qForward = (currentNeighbors.includes(proposal) ? 0.75 / currentNeighbors.length : 0) + 0.25 / universe.length;
    const proposalNeighbors = neighborsMap[proposal];
    const qBackward = (proposalNeighbors.includes(current) ? 0.75 / proposalNeighbors.length : 0) + 0.25 / universe.length;
    const acceptanceRatio = Math.exp(proposalLogP - currentLogP) * (qBackward / qForward);
    if (acceptanceRatio > 1 || Math.random() < acceptanceRatio) { current = proposal; currentLogP = proposalLogP; }
    if (i >= params.mcmcIterations * 0.2) counts[current] = (counts[current] || 0) + 1;
  }

  const dist: Record<string, number> = {};
  let best = '', maxProb = -1;
  const samples = params.mcmcIterations * 0.8;
  Object.entries(counts).forEach(([k, v]) => {
    const p = v / samples; dist[k] = p;
    if (p > maxProb) { maxProb = p; best = k; }
  });
  return { char: best, dist };
};

// ═══════════════════════════════════════════════════════════════════════════════
// §6 — CLADE REPRESENTATIVE (prevents branch-weight inflation)
// ═══════════════════════════════════════════════════════════════════════════════

const getAttestationYear = (node: LanguageInput): number => {
  if (node.attestationYear !== undefined) return node.attestationYear;
  if (!node.descendants || node.descendants.length === 0) return 2000;
  return Math.min(...node.descendants.map(getAttestationYear)) - 100;
};

/**
 * Collapse a clade (ancestor + all descendants) to a single representative form
 * before the root MCMC/Medoid sees it. This implements the bottom-up phylogenetic
 * weighting strategy: each independent lineage gets exactly one vote at the root.
 * 
 * For unattested nodes (isUnattested: true), the node's own word is ignored and
 * instead reconstructed from its descendants only.
 * 
 * PHASE 1: Reconstruct unattested nodes from descendants (bottom-up)
 * PHASE 2: Use reconstructed forms for ancestor reconstruction
 */
const inferCladeRepresentative = (
  node: LanguageInput, method: ReconstructionMethod, params: ReconstructionParams, protoYear: number,
  reconstructedCache: Map<string, string> = new Map()  // Cache for reconstructed forms
): string => {
  
  // Check cache first
  const cacheKey = `${node.id}-${node.name}`;
  if (reconstructedCache.has(cacheKey)) {
    return reconstructedCache.get(cacheKey)!;
  }
  
  // If node is unattested and has descendants, ignore its own word and reconstruct from descendants
  if (node.isUnattested && node.descendants && node.descendants.length > 0) {
    const descendantWords = node.descendants.map(d => ({
      word: inferCladeRepresentative(d, method, params, protoYear, reconstructedCache),
      year: getAttestationYear(d),
      isLoan: d.isLoan,
    })).filter(w => w.word && w.word.trim() !== '' && !w.isLoan);
    
    if (descendantWords.length === 0) {
      // No valid descendants, return empty (will be filtered out)
      reconstructedCache.set(cacheKey, '');
      return '';
    }
    if (descendantWords.length === 1) {
      const result = descendantWords[0].word;
      reconstructedCache.set(cacheKey, result);
      return result;
    }
    
    const grid = performMSA(descendantWords, params);
    if (grid.length === 0) {
      const result = descendantWords[0].word;
      reconstructedCache.set(cacheKey, result);
      return result;
    }
    const weights = descendantWords.map(w => computeWt(w.year, protoYear));
    const numCols = grid[0].length;
    const repTokens: string[] = [];
    for (let col = 0; col < numCols; col++) {
      const res = method === ReconstructionMethod.BAYESIAN_MCMC
        ? solveMCMC(grid, col, params, weights)
        : solveMedoid(grid, col, params, weights);
      if (res.char && res.char !== GAP_CHAR) repTokens.push(res.char);
    }
    const result = repTokens.length > 0 ? repTokens.join('') : descendantWords[0].word;
    reconstructedCache.set(cacheKey, result);
    return result;
  }
  
  // For attested nodes with descendants, include their own word
  const ownWord = node.spelling || node.word;
  const hasValidOwnWord = ownWord && ownWord.trim() !== '';
  
  if (!node.descendants || node.descendants.length === 0) {
    const result = ownWord || '';
    reconstructedCache.set(cacheKey, result);
    return result;
  }
  
  // For nodes with both own word and descendants
  const cladeWords = [
    ...(hasValidOwnWord ? [{ word: ownWord, year: getAttestationYear(node), isLoan: node.isLoan, isUnattested: node.isUnattested }] : []),
    ...node.descendants.map(d => ({
      word: inferCladeRepresentative(d, method, params, protoYear, reconstructedCache),
      year: getAttestationYear(d), isLoan: d.isLoan, isUnattested: d.isUnattested,
    })),
  ].filter(w => w.word && w.word.trim() !== '' && !w.isLoan && !w.isUnattested);
  
  if (cladeWords.length === 0) {
    const result = ownWord || '';
    reconstructedCache.set(cacheKey, result);
    return result;
  }
  if (cladeWords.length === 1) {
    const result = cladeWords[0].word;
    reconstructedCache.set(cacheKey, result);
    return result;
  }
  
  const grid = performMSA(cladeWords, params);
  if (grid.length === 0) {
    const result = ownWord || cladeWords[0].word;
    reconstructedCache.set(cacheKey, result);
    return result;
  }
  const weights = cladeWords.map(w => computeWt(w.year, protoYear));
  const numCols = grid[0].length;
  const repTokens: string[] = [];
  for (let col = 0; col < numCols; col++) {
    const res = method === ReconstructionMethod.BAYESIAN_MCMC
      ? solveMCMC(grid, col, params, weights)
      : solveMedoid(grid, col, params, weights);
    if (res.char && res.char !== GAP_CHAR) repTokens.push(res.char);
  }
  const result = repTokens.length > 0 ? repTokens.join('') : (ownWord || cladeWords[0].word);
  reconstructedCache.set(cacheKey, result);
  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §1/3 — SOUND CHANGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export const findPairwiseSoundChanges = (
  parentWord: string, childWord: string, childName: string, params: ReconstructionParams
): SoundChangeNote[] => {
  const pTokens = tokenizeIPA(parentWord);
  const cTokens = tokenizeIPA(childWord);
  const { alignedA, alignedB } = needlemanWunsch(pTokens, cTokens, params.gapPenalty, params.unknownCharPenalty);
  const changes: SoundChangeNote[] = [];
  for (let i = 0; i < alignedA.length; i++) {
    const pChar = alignedA[i], cChar = alignedB[i];
    if (i < alignedA.length - 1 && pChar !== GAP_CHAR && cChar !== GAP_CHAR &&
        alignedA[i + 1] !== GAP_CHAR && alignedB[i + 1] !== GAP_CHAR) {
      const d1 = getPhoneticDistance(pChar, alignedB[i+1], params.gapPenalty, params.unknownCharPenalty);
      const d2 = getPhoneticDistance(alignedA[i+1], cChar, params.gapPenalty, params.unknownCharPenalty);
      const d3 = getPhoneticDistance(pChar, cChar, params.gapPenalty, params.unknownCharPenalty);
      const d4 = getPhoneticDistance(alignedA[i+1], alignedB[i+1], params.gapPenalty, params.unknownCharPenalty);
      if ((d1 + d2 < d3 + d4 && d1 < 5 && d2 < 5) ||
          (pChar === alignedB[i+1] && alignedA[i+1] === cChar && pChar !== cChar)) {
        const left = i > 0 ? alignedA[i-1] : null, right = i < alignedA.length-2 ? alignedA[i+2] : null;
        changes.push({ language: childName, from: `${pChar}${alignedA[i+1]}`, to: `${cChar}${alignedB[i+1]}`,
          environment: `${left || '#'} _ ${right || '#'}`, name: 'Metathesis', description: 'Metathesis' });
        i++; continue;
      }
    }
    if (pChar !== cChar && pChar !== GAP_CHAR) {
      const left = i > 0 ? alignedA[i-1] : null, right = i < alignedA.length-1 ? alignedA[i+1] : null;
      const id = identifySoundChange(pChar, cChar, left, right);
      changes.push({ language: childName, from: pChar, to: cChar === GAP_CHAR ? '∅' : cChar,
        environment: `${left || '#'} _ ${right || '#'}`, name: id.name, description: id.description });
    } else if (pChar === GAP_CHAR && cChar !== GAP_CHAR) {
      const left = i > 0 ? alignedA[i-1] : null, right = i < alignedA.length-1 ? alignedA[i+1] : null;
      const id = identifySoundChange('∅', cChar, left, right);
      changes.push({ language: childName, from: '∅', to: cChar,
        environment: `${left || '#'} _ ${right || '#'}`, name: id.name, description: id.description });
    }
  }
  return changes;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §6 — MAIN RECONSTRUCTION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

const stringLevenshtein = (a: string, b: string): number => {
  const m = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return m[a.length][b.length];
};

export const reconstructProtoWord = (
  inputs: LanguageInput[],
  method: ReconstructionMethod,
  params: ReconstructionParams
): ReconstructionResult => {

  // ── PHASE 0: Pre-process unattested nodes with bidirectional reconstruction ─────────
  // Create a cache to store reconstructed forms for unattested nodes
  const reconstructedCache = new Map<string, string>();
  
  /**
   * Bidirectional reconstruction for unattested nodes:
   * If an unattested node has BOTH an attested ancestor AND attested descendants,
   * reconstruct from both directions and average the results.
   */
  const performBidirectionalReconstruction = (node: LanguageInput, parentForm: string | null): string => {
    const cacheKey = `${node.id}-${node.name}`;
    if (reconstructedCache.has(cacheKey)) {
      return reconstructedCache.get(cacheKey)!;
    }
    
    // First, reconstruct from descendants (bottom-up)
    const descendantReconstruction = node.descendants && node.descendants.length > 0
      ? inferCladeRepresentative(node, method, params, 0, reconstructedCache)
      : '';
    
    // If we have a parent form and descendants, do bidirectional reconstruction
    if (parentForm && parentForm.trim() !== '' && descendantReconstruction && descendantReconstruction.trim() !== '') {
      // Align parent and descendant reconstructions
      const pTokens = tokenizeIPA(parentForm);
      const dTokens = tokenizeIPA(descendantReconstruction);
      const { alignedA, alignedB } = needlemanWunsch(pTokens, dTokens, params.gapPenalty, params.unknownCharPenalty);
      
      // Average the two reconstructions position by position
      const averagedTokens: string[] = [];
      for (let i = 0; i < alignedA.length; i++) {
        const pChar = alignedA[i];
        const dChar = alignedB[i];
        
        if (pChar === GAP_CHAR && dChar === GAP_CHAR) continue;
        if (pChar === GAP_CHAR) {
          averagedTokens.push(dChar);  // Only descendant has a phoneme here
        } else if (dChar === GAP_CHAR) {
          averagedTokens.push(pChar);  // Only parent has a phoneme here
        } else {
          // Both have phonemes - pick the one closer to the middle phonetically
          const pFeatures = getEffectiveFeatures(pChar);
          const dFeatures = getEffectiveFeatures(dChar);
          if (pFeatures && dFeatures) {
            // Simple averaging: if they're similar enough, use parent form as base
            const dist = getPhoneticDistance(pChar, dChar, params.gapPenalty, params.unknownCharPenalty);
            averagedTokens.push(dist < 3 ? pChar : dChar);  // Threshold for similarity
          } else {
            averagedTokens.push(pChar);
          }
        }
      }
      
      const result = averagedTokens.join('');
      reconstructedCache.set(cacheKey, result);
      return result;
    }
    
    // Otherwise, return the descendant reconstruction (or empty if none)
    const result = descendantReconstruction;
    reconstructedCache.set(cacheKey, result);
    return result;
  };
  
  // Pre-process all inputs to reconstruct unattested nodes
  const processUnattestedNodes = (nodes: LanguageInput[], parentForm: string | null = null): LanguageInput[] => {
    return nodes.map(node => {
      if (node.isUnattested) {
        // Reconstruct this unattested node
        const reconstructedForm = performBidirectionalReconstruction(node, parentForm);
        
        // Process descendants with this reconstructed form as their parent
        const processedDescendants = node.descendants 
          ? processUnattestedNodes(node.descendants, reconstructedForm)
          : [];
        
        return {
          ...node,
          word: reconstructedForm || node.word,  // Use reconstructed form if available
          descendants: processedDescendants
        };
      } else {
        // For attested nodes, use their actual word as parent for descendants
        const ownForm = node.spelling || node.word;
        const processedDescendants = node.descendants 
          ? processUnattestedNodes(node.descendants, ownForm)
          : [];
        
        return {
          ...node,
          descendants: processedDescendants
        };
      }
    });
  };
  
  // Apply preprocessing to reconstruct all unattested nodes
  const processedInputs = processUnattestedNodes(inputs);

  // ── §8: Strip confirmed loanwords from phonetic evidence ─────────
  // Note: Unattested nodes now have their reconstructed forms and are included
  const validInputs = processedInputs.filter(i => !i.isLoan);
  const protoYear = validInputs.length > 0
    ? Math.min(...validInputs.map(getAttestationYear)) - 100 : 0;

  // ── §0: NED + SCA-class cognate compatibility screening ────────────────────
  const cognateCompatibilityFlags = screenCognateCompatibility(
    validInputs.map(i => ({ word: i.spelling || i.word, name: i.name })),
    params
  );

  // ── §6: Collapse clades → one representative per independent lineage ───────
  // All unattested nodes now have reconstructed forms from the preprocessing step
  const topLevelForms = validInputs.map(i => ({
    id: i.id, name: i.name,
    word: i.word,  // This now includes reconstructed forms for unattested nodes
    year: getAttestationYear(i),
    isUnattested: i.isUnattested,
  })).filter(f => f.word && f.word.trim() !== '');

  let alignmentMatrix = performMSA(topLevelForms, params);
  if (alignmentMatrix.length === 0) {
    return {
      protoForm: '???', protoTokens: [], confidence: 0, alignmentMatrix: [],
      soundChanges: [], inferredShifts: [], treeData: { name: '?' },
      cognateCompatibilityFlags,
    };
  }

  const langNames = topLevelForms.map(f => f.name);
  let reconstructedTokens: string[] = [];
  let candidatePaths: { chars: string[]; prob: number }[] = [];
  let segments: string[] = [];
  let distributionArr: { [phoneme: string]: number }[] = [];
  let candidates: any[] = [];

  // ── §2: Bootstrap with Wt-only weights; Wc needs an alignment first ────────
  let languageWeights = applyFloorThreshold(topLevelForms.map(f => computeWt(f.year, protoYear)));

  // ── §6: EM loop: align → reconstruct → re-align (×3) ──────────────────────
  const MAX_ITERATIONS = 3;
  let spreadScores: PhylogeneticSpreadScore[] = [];
  let columnSpreadMults: number[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {

    // §2: Full three-component weights from iteration 1 onward
    if (iteration > 0) languageWeights = computeFullWeights(topLevelForms, alignmentMatrix, protoYear);

    // §4b: Compute phylogenetic spread for this alignment
    spreadScores = computePhylogeneticSpread(alignmentMatrix, topLevelForms.length);
    columnSpreadMults = computeColumnSpreadMultipliers(spreadScores);

    const numCols = alignmentMatrix[0].length;
    distributionArr = []; segments = [];

    // §1/4: Per-column reconstruction (with spread multipliers)
    for (let col = 0; col < numCols; col++) {
      const spreadMult = columnSpreadMults[col] ?? 1.0;
      const res = method === ReconstructionMethod.BAYESIAN_MCMC
        ? solveMCMC(alignmentMatrix, col, params, languageWeights, spreadMult)
        : solveMedoid(alignmentMatrix, col, params, languageWeights, spreadMult);
      segments.push(res.char);
      distributionArr.push(res.dist);
    }

    // §7: k-best candidate paths from per-column distributions
    candidatePaths = [{ chars: [], prob: 1.0 }];
    distributionArr.forEach(dist => {
      const sorted = Object.entries(dist).sort((a, b) => (b[1] as number)-(a[1] as number)).slice(0, 2);
      const newPaths: { chars: string[]; prob: number }[] = [];
      candidatePaths.forEach(path => {
        sorted.forEach(([char, p]) => newPaths.push({ chars: [...path.chars, char], prob: path.prob * (p as number) }));
      });
      candidatePaths = newPaths.sort((a, b) => b.prob - a.prob).slice(0, 6);
    });

    // §5 + §7: Naturalness filters AND MDL penalty on each candidate
    candidates = candidatePaths.map(p => {
      const phonotacticPenalty = evaluateSequenceNaturalness(p.chars);
      const inventoryPenalty   = evaluateInventorySymmetry(p.chars);
      const chainShiftPenalty  = evaluateChainShifts(p.chars, alignmentMatrix);
      const mdlComplexity      = computeMDLComplexity(p.chars, alignmentMatrix);

      const naturalnessMult = Math.exp(-(phonotacticPenalty + inventoryPenalty * 0.8 + chainShiftPenalty * 0.5) / 2);
      const naturalProb     = p.prob * naturalnessMult;
      const mdlAdjusted     = Math.max(0, naturalProb - LAMBDA_MDL * mdlComplexity);

      const filteredChars = p.chars.filter(c => c !== GAP_CHAR);
      return { form: '*' + filteredChars.join(''), probability: naturalProb, mdlAdjustedScore: mdlAdjusted, chars: filteredChars };
    }).sort((a, b) => b.mdlAdjustedScore - a.mdlAdjustedScore);

    reconstructedTokens = candidates[0]?.chars ?? segments.filter(c => c !== GAP_CHAR);

    // Pillar 4: re-align to refined proto-form
    const res = performMSA_to_proto(topLevelForms, reconstructedTokens, params);
    alignmentMatrix = res.alignmentMatrix;
    reconstructedTokens = res.protoTokens;
  }

  // ── §2: Final Wt × Wc × Wr weights ────────────────────────────────────────
  languageWeights = computeFullWeights(topLevelForms, alignmentMatrix, protoYear);

  const protoForm = candidates[0]?.form ?? '*' + segments.filter(c => c !== GAP_CHAR).join('');

  // ── §1: Per-column regularity scores (Neogrammarian criterion) ─────────────
  const regularityScores = computeRegularityScores(alignmentMatrix, reconstructedTokens, languageWeights);
  const irregularColumns = regularityScores
    .map((s, col) => s < MIN_REGULARITY_THRESHOLD ? col : -1)
    .filter(col => col !== -1);

  // ── §8: Merger detection ───────────────────────────────────────────────────
  const allMergers: MergerEvent[] = [];
  topLevelForms.forEach((lang, idx) => {
    allMergers.push(...detectMergers(idx, lang.name, alignmentMatrix, reconstructedTokens));
  });

  // ── §8: Loanword signal detection ─────────────────────────────────────────
  const otherForms = topLevelForms.map(f => ({ word: f.word, name: f.name }));
  const allLoanSignals: LoanwordSignal[] = [];
  topLevelForms.forEach(form => {
    const others = otherForms.filter(o => o.name !== form.name);
    allLoanSignals.push(...detectLoanwordSignals({ word: form.word, name: form.name }, others, reconstructedTokens, params));
  });

  // ── §8: Analogical leveling detection ─────────────────────────────────────
  const analogicalLevelingFlags = detectAnalogicalLeveling(alignmentMatrix, langNames, reconstructedTokens);

  // ── §1: Formal correspondence table ───────────────────────────────────────
  const correspondenceTable = buildCorrespondenceTable(langNames, alignmentMatrix);

  // ── §7: Annotate all candidates ────────────────────────────────────────────
  const annotatedCandidates: AnnotatedCandidate[] = candidates.map(c =>
    annotateCandidate(c, topLevelForms, allMergers, allLoanSignals, params)
  );

  // ── §3: Sound change analysis ─────────────────────────────────────────────
  const soundChanges: SoundChangeNote[] = [];
  const inferredShifts: InferredShift[] = [];
  const transitions: { language: string; sourceWord: string; targetWord: string }[] = [];
  const skipMetathesis: Record<string, Set<number>> = {};

  topLevelForms.forEach(lang => {
    skipMetathesis[lang.name] = new Set();
    transitions.push({ language: lang.name, sourceWord: protoForm, targetWord: lang.word });
  });

  reconstructedTokens.forEach((pChar, col) => {
    topLevelForms.forEach((lang, idx) => {
      if (skipMetathesis[lang.name].has(col) || !alignmentMatrix[idx]) return;
      const reflex = alignmentMatrix[idx][col];
      if (col < reconstructedTokens.length - 1) {
        const nextPChar = reconstructedTokens[col+1], nextReflex = alignmentMatrix[idx][col+1];
        if (pChar !== GAP_CHAR && reflex !== GAP_CHAR && nextPChar !== GAP_CHAR && nextReflex !== GAP_CHAR) {
          const d1 = getPhoneticDistance(pChar, nextReflex, params.gapPenalty, params.unknownCharPenalty);
          const d2 = getPhoneticDistance(nextPChar, reflex, params.gapPenalty, params.unknownCharPenalty);
          const d3 = getPhoneticDistance(pChar, reflex, params.gapPenalty, params.unknownCharPenalty);
          const d4 = getPhoneticDistance(nextPChar, nextReflex, params.gapPenalty, params.unknownCharPenalty);
          if ((d1+d2 < d3+d4 && d1<5 && d2<5) || (pChar===nextReflex && nextPChar===reflex && pChar!==nextPChar)) {
            const left = col>0?reconstructedTokens[col-1]:null, right = col<reconstructedTokens.length-2?reconstructedTokens[col+2]:null;
            soundChanges.push({ language: lang.name, from: `${pChar}${nextPChar}`, to: `${reflex}${nextReflex}`,
              environment: `${left||'#'} _ ${right||'#'}`, name: 'Metathesis', description: 'Metathesis' });
            inferredShifts.push({ language: lang.name, from: `${pChar}${nextPChar}`, to: `${reflex}${nextReflex}`,
              environment: `${left||'#'} _ ${right||'#'}`, naturalnessScore: 0.8, typologicalCategory: 'Other' });
            skipMetathesis[lang.name].add(col+1); return;
          }
        }
      }
      const left = col>0?reconstructedTokens[col-1]:null, right = col<reconstructedTokens.length-1?reconstructedTokens[col+1]:null;
      if (reflex && reflex !== pChar) {
        if (pChar === GAP_CHAR) {
          const id = identifySoundChange('∅', reflex, left, right);
          soundChanges.push({ language: lang.name, from: '∅', to: reflex, environment: `${left||'#'} _ ${right||'#'}`, name: id.name, description: id.description });
        } else {
          const id = identifySoundChange(pChar, reflex, left, right);
          soundChanges.push({ language: lang.name, from: pChar, to: reflex===GAP_CHAR?'∅':reflex,
            environment: `${left||'#'} _ ${right||'#'}`, name: id.name, description: id.description });
          if (id.name === 'Phonetic Shift' || id.name === 'Unknown Shift' || id.name.includes('Assimilation')) {
            const nat = evaluateNaturalness(pChar, reflex, left, right);
            let category = nat.category, score = nat.score;
            const fd = (diachronicaFreqs as any)[`${pChar}>${reflex===GAP_CHAR?'∅':reflex}`];
            if (fd && fd.count > 0) { category = `Attested (${fd.count>5?'Common':'Rare'})`; score = Math.min(0.99, score+0.2+Math.log10(fd.count)*0.1); }
            inferredShifts.push({ language: lang.name, from: pChar, to: reflex===GAP_CHAR?'∅':reflex,
              environment: `${left||'#'} _ ${right||'#'}`, naturalnessScore: score, typologicalCategory: category });
          }
        }
      }
    });
  });

  const processDescendants = (node: LanguageInput, isTopLevel: boolean, parentForm: string) => {
    const oldestForm = node.spelling || node.word;
    const hasSpelling = !!node.spelling && node.spelling !== node.word;
    if (!isTopLevel) {
      const langName = hasSpelling ? `${node.name} (Spelling)` : node.name;
      soundChanges.push(...findPairwiseSoundChanges(parentForm, oldestForm, langName, params));
      transitions.push({ language: langName, sourceWord: parentForm, targetWord: oldestForm });
    }
    if (hasSpelling) {
      soundChanges.push(...findPairwiseSoundChanges(node.spelling!, node.word, node.name, params));
      transitions.push({ language: node.name, sourceWord: node.spelling!, targetWord: node.word });
    }
    if (node.descendants) node.descendants.forEach(desc => processDescendants(desc, false, node.word));
  };
  processedInputs.forEach(input => processDescendants(input, true, protoForm));

  const buildTree = (node: LanguageInput): TreeNode => {
    const hasSpelling = !!node.spelling && node.spelling !== node.word;
    const children = node.descendants ? node.descendants.map(buildTree) : [];
    // Use the word field which now contains reconstructed forms for unattested nodes
    const displayReconstruction = node.word || '';
    // Mark unattested nodes with * prefix (standard historical-linguistic convention)
    const displayName = node.isUnattested ? `*${node.name}` : node.name;
    if (hasSpelling) return { name: `${displayName} (Spelling)`, reconstruction: node.spelling, distance: 1, isUnattested: node.isUnattested,
      children: [{ name: displayName, reconstruction: displayReconstruction, distance: 1, isUnattested: node.isUnattested, children }] };
    return { name: displayName, reconstruction: displayReconstruction, distance: 1, isUnattested: node.isUnattested, children };
  };

  // ── §3: Generalise sound laws + statistical thresholding ──────────────────
  const generalizedLaws = generalizeSoundChanges(soundChanges, inferredShifts);
  const exceptions: string[] = [];

  for (const law of generalizedLaws) {
    if (!law.ruleString) continue;
    const langTransitions = transitions.filter(t => t.language === law.language);
    if (langTransitions.length === 0) continue;
    const sourceWords = langTransitions.map(t => t.sourceWord);
    const shiftResults = applyShifts(sourceWords, law.ruleString);
    let validEnvironments = 0, actualApplications = 0;
    for (let i = 0; i < sourceWords.length; i++) {
      if (shiftResults[i].history.length > 0) {
        validEnvironments++;
        const applied = soundChanges.some(c =>
          c.language === law.language && law.examples.includes(`*${c.from} > ${c.to} / ${c.environment}`)
        );
        if (applied) actualApplications++;
        else exceptions.push(`Word '*${sourceWords[i]}' should have undergone '${law.ruleString}' in ${law.language} but didn't (Exception / Possible Borrowing).`);
      }
    }
    if (validEnvironments > 0) {
      const rate = actualApplications / validEnvironments;
      law.applicationRate = rate;
      if (rate < 0.15) {
        law.isSporadic = true;
        let classification = 'Sporadic Shift';
        const parts = law.ruleString.split('/');
        if (parts.length === 2) {
          const [changePart, envPart] = parts;
          const [fromPart, toPart] = changePart.split('>');
          if (fromPart && toPart && envPart) {
            const fromChars = fromPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            const toChars = toPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            if (fromChars.some(c => envPart.includes(c))) classification = 'Sporadic Dissimilation';
            else if (toChars.some(c => envPart.includes(c))) classification = 'Sporadic Assimilation';
            else classification = 'Analogical Leveling';
          }
        }
        law.typologicalCategory = classification;
      }
    }
  }

  // ── §6: Forward simulation & validation ───────────────────────────────────
  let totalError = 0, totalWords = 0;
  for (const input of validInputs) {
    const langLaws = generalizedLaws.filter(l => l.language === input.name && l.ruleString && !l.isSporadic);
    let simulatedForm = protoForm;
    for (const law of langLaws) {
      if (law.ruleString) {
        const res = applyShifts([simulatedForm], law.ruleString);
        if (res.length > 0) simulatedForm = res[0].final;
      }
    }
    totalError += stringLevenshtein(simulatedForm, input.spelling || input.word);
    totalWords++;
  }

  // ── Compile and return all results ────────────────────────────────────────
  return {
    protoForm,
    protoTokens: reconstructedTokens,
    confidence: annotatedCandidates[0]?.mdlAdjustedScore ?? candidates[0]?.probability ?? 0.5,
    alignmentMatrix,
    soundChanges,
    inferredShifts,
    generalizedLaws,
    exceptions,
    treeData: { name: protoForm, children: processedInputs.map(buildTree) },
    distribution: distributionArr,
    candidates: annotatedCandidates,
    languageWeights,
    simulationErrorRate: totalWords > 0 ? totalError / totalWords : 0,

    // §0 — NED + SCA-class cognate pre-screening
    cognateCompatibilityFlags,

    // §1 — Per-column Neogrammarian regularity scores
    regularityScores,

    // §4b — Phylogenetic spread per alignment column (areal diffusion detection)
    phylogeneticSpreadScores: spreadScores,

    // §8 — Analogical leveling flags
    analogicalLevelingFlags,

    // §8 extended diagnostics (consumed by App.tsx display layer)
    mergerEvents: allMergers,
    loanwordSignals: allLoanSignals,
    correspondenceTable,
  } as any;
};