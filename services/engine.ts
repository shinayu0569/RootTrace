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
  Paradigm, ParadigmCell,
} from '../types';

// Re-export ReconstructionMethod for consumers of this module
export { ReconstructionMethod } from '../types';
import {
  tokenizeIPA, needlemanWunsch, GAP_CHAR, getPhoneticDistance, FEATURE_MAP,
  getEffectiveFeatures, evaluateNaturalness, getSonority,
} from './phonetics';
import {
  identifySoundChange, NATURAL_SOUND_CHANGES, ChangeContext, DistinctiveFeaturesWithSymbol,
} from './soundChangeDb';
import { generalizeSoundChanges } from './generalizer';
import { applyShifts } from './soundShifter';
import { getAttestedShiftInfo } from './diachronicaApi';
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
 * Measures retention rate: how closely a language's reflexes match the proto-form.
 * Uses continuous distance metric for gradual conservatism scoring.
 */
const computeWc = (
  langIdx: number,
  alignmentMatrix: string[][],
  protoTokens: string[]  // Current proto-form estimate for comparison
): number => {
  const nLangs = alignmentMatrix.length;
  if (nLangs <= 1) return 1.0;
  const langRow = alignmentMatrix[langIdx];
  if (!langRow || protoTokens.length === 0) return 0.5;

  // Count positions where reflex matches proto (with continuous distance)
  let totalPositions = 0;
  let retainedPositions = 0;
  
  for (let col = 0; col < Math.min(langRow.length, protoTokens.length); col++) {
    const reflex = langRow[col];
    const proto = protoTokens[col];
    if (!reflex || !proto || reflex === GAP_CHAR || proto === GAP_CHAR) continue;
    
    totalPositions++;
    const dist = getPhoneticDistance(proto, reflex, 0.5, 0.8);
    // Convert distance to similarity (0.8 distance = 0.2 similarity)
    retainedPositions += Math.max(0, 1.0 - dist);
  }

  return totalPositions > 0
    ? Math.max(0.30, retainedPositions / totalPositions)
    : 0.50;
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
 * Uses iterative renormalization to ensure the constraint holds for all languages.
 */
const applyFloorThreshold = (rawWeights: number[]): number[] => {
  const weights = [...rawWeights];
  const MAX_ITER = 20;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return weights.map(() => 1.0);
    let changed = false;
    for (let i = 0; i < weights.length; i++) {
      const proportion = weights[i] / total;
      if (proportion > WEIGHT_FLOOR) {
        weights[i] *= WEIGHT_FLOOR / proportion;
        changed = true;
      }
    }
    if (!changed) break;  // Convergence - all constraints satisfied
  }
  return weights;
};

/** Full W(Lᵢ) = Wt × Wc × Wr, then apply floor threshold across all languages */
const computeFullWeights = (
  topLevelForms: { year: number; name: string }[],
  alignmentMatrix: string[][],
  protoYear: number,
  protoTokens: string[]  // Current proto-form for conservatism calculation
): number[] => {
  const raw = topLevelForms.map((f, idx) =>
    computeWt(f.year, protoYear) * computeWcWithPriors(idx, f.name, alignmentMatrix, protoTokens) * computeWr(f.year)
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
const LAMBDA_MDL = 0.03;  // Was 0.12 - reduce by 75% to avoid destroying confidence scores

const computeMDLComplexity = (
  candidateChars: string[],
  alignmentMatrix: string[][]
): number => {
  const cleanLen = candidateChars.filter(c => c !== GAP_CHAR).length;
  if (cleanLen === 0) return 0;

  // 1. Inventory cost - normalize by word length
  const distinctProto = new Set(candidateChars.filter(c => c !== GAP_CHAR));
  const inventoryCost = (distinctProto.size / cleanLen) * 0.5;

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
  const ruleCost = (impliedRules.size / cleanLen) * 0.4;

  // 3. No length penalty - length should be driven by data, not penalized
  // Remove the length penalty that was unfairly penalizing longer words

  return inventoryCost + ruleCost;
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

/** Pillar 1: Sonority Sequencing Principle + cluster penalties
 * 
 * GRADED SONORITY HIERARCHY IMPLEMENTATION:
 * Instead of binary violation detection, this function calculates penalties
 * proportional to the degree of SSP violation. Small sonority rises are 
 * penalized less than flat or inverted sonority profiles.
 * 
 * Sonority scale (0-10):
 *   10 = Vowels (most sonorous)
 *    9 = Glides (j, w, ɥ, ɰ)
 *    8 = Liquids (r, l, ɾ, ɹ)
 *    7 = Nasals (m, n, ŋ, ɲ)
 *    6 = Voiced fricatives (v, z, ð, ɣ)
 *    5 = Voiceless fricatives (f, s, θ, x)
 *    4 = Voiced affricates (dz, dʒ)
 *    3 = Voiceless affricates (ts, tʃ)
 *    2 = Voiced stops (b, d, g)
 *    1 = Voiceless stops (p, t, k) (least sonorous)
 *    0 = Gaps, syllable boundaries
 */
const evaluateSequenceNaturalness = (sequence: string[]): number => {
  const tokens = sequence.filter(t => t !== GAP_CHAR && t !== '.' && t !== ',');
  if (tokens.length === 0) return 0;
  
  let penalty = 0;
  const sonorities = tokens.map(getSonority);
  
  // Identify syllable nuclei (positions with sonority = 10, i.e., vowels)
  const nucleiPositions: number[] = [];
  for (let i = 0; i < sonorities.length; i++) {
    if (sonorities[i] === 10) {
      nucleiPositions.push(i);
    }
  }
  
  // If no vowels found, heavy penalty for vowel-less sequence
  if (nucleiPositions.length === 0) {
    penalty += 3.0;
  }
  
  // Helper: Calculate sonority rise/drop between two positions
  const sonorityDelta = (from: number, to: number): number => sonorities[to] - sonorities[from];
  
  // Helper: Check if position is part of an onset (preceding a nucleus)
  const isOnsetPosition = (pos: number): boolean => {
    for (const nucleusPos of nucleiPositions) {
      if (pos < nucleusPos && nucleusPos - pos <= 3) {
        // Check if there's no intervening vowel between pos and nucleus
        for (let i = pos + 1; i < nucleusPos; i++) {
          if (sonorities[i] === 10) return false;
        }
        return true;
      }
    }
    return false;
  };
  
  // Process each position in the sequence
  for (let i = 0; i < sonorities.length; i++) {
    const current = sonorities[i];
    const prev = i > 0 ? sonorities[i - 1] : null;
    const next = i < sonorities.length - 1 ? sonorities[i + 1] : null;
    
    // Skip gaps/boundaries
    if (current === 0) continue;
    
    // === ONSET ANALYSIS (positions before a vowel) ===
    if (isOnsetPosition(i)) {
      // Find the target nucleus
      let targetNucleus = -1;
      for (const nucleusPos of nucleiPositions) {
        if (i < nucleusPos) {
          targetNucleus = nucleusPos;
          break;
        }
      }
      
      if (targetNucleus !== -1) {
        // Calculate expected sonority at this position for ideal SSP
        // The closer to the nucleus, the higher the expected sonority
        const distanceToNucleus = targetNucleus - i;
        
        // For a well-formed onset, sonority should increase as we approach the nucleus
        // Ideal: voiceless stop (1) → voiced stop (2) → affricate (3-4) → fricative (5-6) 
        //        → nasal (7) → liquid (8) → glide (9) → vowel (10)
        
        if (i > 0 && prev !== null && prev < 10 && current < 10) {
          // This is a consonant cluster within the onset
          const sonorityRise = current - prev;
          
          if (sonorityRise < 0) {
            // INVERTED SONORITY: severe violation (e.g., /pn-/, /tl-/)
            // Penalty proportional to the degree of inversion
            const inversionDegree = Math.abs(sonorityRise);
            penalty += 3.0 + (inversionDegree * 0.8);
          } else if (sonorityRise === 0) {
            // FLAT SONORITY: moderate violation (e.g., /sn-/, /st-/)
            // Same sonority level is better than inverted, but still bad
            penalty += 1.5 + (0.5 * distanceToNucleus);
          } else if (sonorityRise < 2) {
            // SMALL RISE: slight penalty for insufficient rise
            // e.g., /kn-/ (1→2 = rise of 1) or /pr-/ (1→8 = rise of 7 is good)
            penalty += 0.3 * (2 - sonorityRise);
          }
          // sonorityRise >= 2: Good rise, no penalty
        }
        
        // Word-initial position special handling
        if (i === 0 && current < 10) {
          // Word-initial stops are fine (most common)
          // But if we have a complex onset, check its well-formedness
          if (next !== null && next < 10) {
            // Initial cluster - sonority should rise
            const initialRise = next - current;
            if (initialRise < 0) {
              // Initial inverted sonority is particularly bad
              penalty += 2.0 + (Math.abs(initialRise) * 0.5);
            }
          }
        }
      }
    }
    
    // === CODA ANALYSIS (positions after a vowel) ===
    // In codas, sonority should ideally fall (mirror of onset)
    // But this is less strictly enforced than onset SSP
    const isCodaPosition = (pos: number): boolean => {
      for (const nucleusPos of nucleiPositions) {
        if (pos > nucleusPos && pos - nucleusPos <= 3) {
          // Check if there's no intervening vowel between nucleus and pos
          for (let i = nucleusPos + 1; i < pos; i++) {
            if (sonorities[i] === 10) return false;
          }
          return true;
        }
      }
      return false;
    };
    
    if (isCodaPosition(i) && prev !== null && prev < 10 && current < 10) {
      // In coda, sonority ideally falls (higher → lower as we move away from nucleus)
      // But falling sonority is less strictly required than in onsets
      const sonorityChange = current - prev; // Negative = falling (good for coda)
      
      if (sonorityChange > 0) {
        // Rising sonority in coda is slightly dispreferred
        penalty += 0.2 * sonorityChange;
      }
    }
    
    // === EXCESSIVE CLUSTERING PENALTY ===
    // Check for clusters of 3+ consonants (regardless of sonority profile)
    if (i >= 2 && prev !== null && sonorities[i - 2] < 10 && prev < 10 && current < 10) {
      // Triple consonant cluster detected
      penalty += 1.0;
      
      // Check if any of these positions are syllable onsets
      // If none are, this is a very bad medial cluster
      const anyInOnset = isOnsetPosition(i) || isOnsetPosition(i - 1) || isOnsetPosition(i - 2);
      if (!anyInOnset) {
        penalty += 1.5; // Excessive medial clustering
      }
    }
  }
  
  // === SYLLABLE CONTACT LAW (bonus for good inter-syllabic transitions) ===
  // When a coda meets an onset, prefer rising sonority
  for (let i = 1; i < sonorities.length - 1; i++) {
    if (sonorities[i] === 10) continue; // Skip nuclei
    
    // Check if this position could be at syllable boundary
    // (preceded by vowel or followed by vowel, but not both)
    const prevIsVowel = i > 0 && sonorities[i - 1] === 10;
    const nextIsVowel = i < sonorities.length - 1 && sonorities[i + 1] === 10;
    
    if (prevIsVowel && !nextIsVowel) {
      // Coda position - check next consonant
      for (let j = i + 1; j < sonorities.length && sonorities[j] !== 10; j++) {
        if (j < sonorities.length - 1) {
          const codaSonority = sonorities[i];
          const nextOnsetSonority = sonorities[j];
          
          // Syllable Contact Law: prefer coda to be less sonorous than following onset
          if (codaSonority > nextOnsetSonority) {
            // Rising sonority across syllable boundary is good
            penalty -= 0.1; // Small bonus
          } else if (codaSonority < nextOnsetSonority) {
            // Falling sonority across syllable boundary is dispreferred
            penalty += 0.3 * (nextOnsetSonority - codaSonority);
          }
        }
        break; // Only check first consonant of next onset
      }
    }
  }
  
  return Math.max(0, penalty);
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
// §5b — ADDITIONAL NATURALISM ENHANCEMENTS (Algorithm Analysis Implementation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * NATURAL CLASS GENERALIZATION BONUS
 * 
 * Detects when multiple sound shifts form a consistent pattern by natural class.
 * Example: if all labials weaken, all coronals palatalize → bonus for elegance.
 * 
 * This rewards reconstructions where phoneme changes follow systematic 
 * class-level patterns rather than arbitrary individual changes.
 */
const NATURAL_CLASSES = {
  labial: (f: DistinctiveFeatures) => f.labial,
  coronal: (f: DistinctiveFeatures) => f.coronal,
  dorsal: (f: DistinctiveFeatures) => f.dorsal,
  voiced: (f: DistinctiveFeatures) => f.voice,
  voiceless: (f: DistinctiveFeatures) => !f.voice && f.consonantal,
  stop: (f: DistinctiveFeatures) => f.consonantal && !f.continuant,
  fricative: (f: DistinctiveFeatures) => f.continuant && !f.sonorant,
  nasal: (f: DistinctiveFeatures) => f.nasal,
  liquid: (f: DistinctiveFeatures) => f.sonorant && !f.nasal && !f.syllabic,
  highVowel: (f: DistinctiveFeatures) => f.syllabic && f.high,
  lowVowel: (f: DistinctiveFeatures) => f.syllabic && f.low,
};

const evaluateNaturalClassPattern = (
  sequence: string[],
  alignmentMatrix: string[][]
): number => {
  let bonus = 0;
  
  for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
    const descendantWord = alignmentMatrix[langIdx];
    
    // Collect all shifts for this language
    const shifts: { proto: string; reflex: string; protoFeatures: DistinctiveFeatures | null; reflexFeatures: DistinctiveFeatures | null }[] = [];
    
    for (let col = 0; col < sequence.length; col++) {
      const proto = sequence[col];
      const reflex = descendantWord?.[col];
      if (!reflex || proto === GAP_CHAR || reflex === GAP_CHAR || proto === reflex) continue;
      
      shifts.push({
        proto,
        reflex,
        protoFeatures: getEffectiveFeatures(proto),
        reflexFeatures: getEffectiveFeatures(reflex)
      });
    }
    
    if (shifts.length < 2) continue; // Need at least 2 shifts to detect pattern
    
    // Check each natural class for consistent behavior
    for (const [className, classTest] of Object.entries(NATURAL_CLASSES)) {
      const classShifts = shifts.filter(s => s.protoFeatures && classTest(s.protoFeatures));
      
      if (classShifts.length >= 2) {
        // Check if all shifts in this class have the same operation
        const operations = classShifts.map(s => {
          if (!s.protoFeatures || !s.reflexFeatures) return null;
          
          // Identify what changed
          if (s.protoFeatures.voice !== s.reflexFeatures.voice) return 'voicing';
          if (s.protoFeatures.continuant !== s.reflexFeatures.continuant) return 'spirantization';
          if (s.protoFeatures.labial !== s.reflexFeatures.labial) return 'labialization';
          if (s.protoFeatures.coronal !== s.reflexFeatures.coronal) return 'coronalization';
          if (s.protoFeatures.dorsal !== s.reflexFeatures.dorsal) return 'velarization';
          if (s.protoFeatures.nasal !== s.reflexFeatures.nasal) return 'nasalization';
          if (s.protoFeatures.syllabic !== s.reflexFeatures.syllabic) return 'vocalization';
          return 'other';
        });
        
        // Check if all operations are the same
        const uniqueOps = new Set(operations.filter(o => o !== null));
        if (uniqueOps.size === 1 && !uniqueOps.has('other')) {
          // Consistent class-level pattern detected!
          bonus += 0.15 * Math.min(classShifts.length, 4); // Cap at 0.6
        }
      }
    }
  }
  
  return Math.min(bonus, 0.5); // Cap total bonus
};

/**
 * POST-PROCESSING PLAUSIBILITY FILTER
 * 
 * Validates proto-forms against cross-linguistic phonological universals.
 * Preforms that violate typologically rare patterns are penalized.
 */
interface UniversalConstraint {
  name: string;
  test: (form: string[], features: (DistinctiveFeatures | null)[]) => boolean;
  violationPenalty: number;
}

const UNIVERSAL_CONSTRAINTS: UniversalConstraint[] = [
  {
    name: 'No initial geminates',
    test: (form, features) => {
      if (form.length < 2) return true;
      const f1 = features[0], f2 = features[1];
      // Check for geminate (same place, same manner)
      return !(f1 && f2 && 
        f1.consonantal && f2.consonantal &&
        f1.labial === f2.labial &&
        f1.coronal === f2.coronal &&
        f1.dorsal === f2.dorsal &&
        f1.continuant === f2.continuant);
    },
    violationPenalty: 1.0
  },
  {
    name: 'Has at least one vowel',
    test: (form, features) => features.some(f => f?.syllabic),
    violationPenalty: 0.8
  },
  {
    name: 'No vowel-less sequences > 3',
    test: (form, features) => {
      let maxConsonantRun = 0;
      let currentRun = 0;
      for (const f of features) {
        if (f?.consonantal) {
          currentRun++;
          maxConsonantRun = Math.max(maxConsonantRun, currentRun);
        } else {
          currentRun = 0;
        }
      }
      return maxConsonantRun <= 3;
    },
    violationPenalty: 0.6
  },
  {
    name: 'Sonority rises to nucleus',
    test: (form, features) => {
      // Find first vowel
      const firstVowelIdx = features.findIndex(f => f?.syllabic);
      if (firstVowelIdx <= 0) return true;
      
      // Check that sonority generally rises toward nucleus
      const sonorities = features.slice(0, firstVowelIdx).map(f => {
        if (!f) return 0;
        if (f.sonorant && !f.syllabic) return 8;
        if (f.nasal) return 7;
        if (f.continuant && f.voice) return 6;
        if (f.continuant) return 5;
        if (f.voice) return 2;
        return 1;
      });
      
      // Count sonority drops (should be minimal in onset)
      let drops = 0;
      for (let i = 1; i < sonorities.length; i++) {
        if (sonorities[i] < sonorities[i-1]) drops++;
      }
      return drops <= 1; // Allow one drop for complex clusters
    },
    violationPenalty: 0.5
  },
  {
    name: 'Consonant/vowel ratio balanced',
    test: (form, features) => {
      const consonants = features.filter(f => f?.consonantal).length;
      const vowels = features.filter(f => f?.syllabic).length;
      if (vowels === 0) return false;
      return consonants / vowels <= 5.0;
    },
    violationPenalty: 0.4
  }
];

const evaluateUniversalConstraints = (sequence: string[]): number => {
  const features = sequence.map(c => c !== GAP_CHAR ? getEffectiveFeatures(c) : null);
  
  let totalPenalty = 0;
  for (const constraint of UNIVERSAL_CONSTRAINTS) {
    if (!constraint.test(sequence, features)) {
      totalPenalty += constraint.violationPenalty;
    }
  }
  
  return totalPenalty;
};

/**
 * FAMILY CONSERVATISM PRIORS
 * 
 * Pre-defined conservatism weights for known historically conservative languages.
 * These initialize Wc before dynamic adjustment based on phonetic distance.
 */
const CONSERVATISM_PRIORS: Record<string, Record<string, number>> = {
  'indo_european': {
    'Lithuanian': 1.3,
    'Latvian': 1.2,
    'Vedic Sanskrit': 1.2,
    'Sanskrit': 1.15,
    'Hittite': 1.4,
    'Ancient Greek': 1.1,
    'Greek': 1.05,
    'Latin': 1.1,
    'Old Church Slavonic': 1.15,
    'Old Persian': 1.1,
    'Avestan': 1.25,
    'Gothic': 1.1,
    'Old Icelandic': 1.05,
    'Old Irish': 1.1,
  },
  'uralic': {
    'Finnish': 1.2,
    'Estonian': 1.1,
    'Hungarian': 1.05,
    'Sami': 1.15,
    'Mordvin': 1.1,
  },
  'sino_tibetan': {
    'Classical Tibetan': 1.2,
    'Old Chinese': 1.3,
    'Middle Chinese': 1.15,
  },
  'semitic': {
    'Classical Arabic': 1.15,
    'Hebrew': 1.1,
    'Aramaic': 1.2,
    'Geʿez': 1.25,
    'Akkadian': 1.2,
    'Ugaritic': 1.3,
  },
  'turkic': {
    'Old Turkic': 1.2,
    'Chuvash': 1.25,
    'Yakut': 1.15,
  },
  'mongolic': {
    'Middle Mongol': 1.2,
    'Written Mongol': 1.15,
  },
  'tungusic': {
    'Evenki': 1.15,
    'Even': 1.1,
  },
  'dravidian': {
    'Tamil': 1.2,
    'Kannada': 1.15,
    'Telugu': 1.1,
    'Malayalam': 1.15,
    'Brahui': 1.2,
  },
  'austronesian': {
    'Proto-Austronesian': 1.0, // Baseline
    'Malay': 1.05,
    'Javanese': 1.05,
    'Tagalog': 1.1,
    'Fijian': 1.15,
    'Hawaiian': 1.1,
  },
  'afroasiatic': {
    'Egyptian': 1.25,
    'Coptic': 1.15,
    'Berber': 1.2,
    'Hausa': 1.05,
  }
};

/**
 * Get conservatism prior for a language based on its family.
 * Returns 1.0 if no prior is defined (neutral).
 */
const getConservatismPrior = (langName: string, familyHint?: string): number => {
  // Normalize language name for matching
  const normalizedName = langName.replace(/^\*?/, '').replace(/\s*\(Spelling\)$/, '').trim();
  
  // If family hint provided, check that family first
  if (familyHint && CONSERVATISM_PRIORS[familyHint]) {
    const prior = CONSERVATISM_PRIORS[familyHint][normalizedName];
    if (prior) return prior;
  }
  
  // Search all families
  for (const [family, languages] of Object.entries(CONSERVATISM_PRIORS)) {
    const prior = languages[normalizedName];
    if (prior) return prior;
    
    // Try partial match
    for (const [lang, p] of Object.entries(languages)) {
      if (normalizedName.toLowerCase().includes(lang.toLowerCase()) ||
          lang.toLowerCase().includes(normalizedName.toLowerCase())) {
        return p;
      }
    }
  }
  
  return 1.0; // Default: neutral
};

/**
 * Enhanced Wc computation with family conservatism priors.
 * Initializes Wc with prior knowledge before dynamic adjustment.
 */
const computeWcWithPriors = (
  langIdx: number,
  langName: string,
  alignmentMatrix: string[][],
  protoTokens: string[],
  familyHint?: string
): number => {
  // Get base dynamic conservatism
  const dynamicWc = computeWc(langIdx, alignmentMatrix, protoTokens);
  
  // Apply family prior (if any)
  const prior = getConservatismPrior(langName, familyHint);
  
  // Blend prior with dynamic: 30% prior, 70% dynamic (based on evidence)
  // For unattested languages, rely more on prior
  const priorWeight = 0.3;
  const blendedWc = prior * priorWeight + dynamicWc * (1 - priorWeight);
  
  return Math.max(0.30, Math.min(1.5, blendedWc)); // Allow up to 1.5 for very conservative languages
};
/**
 * Assigns a bonus to a proto→reflex correspondence based on:
 *   1. Matched rules in the NATURAL_SOUND_CHANGES database
 *   2. Index Diachronica frequency data (with environment context matching)
 *   3. LIVE Index Diachronica API data (async version)
 *   4. Feature-shift frequency data (featureFreqs.json)
 *   5. Generative naturalness evaluation (evaluateNaturalness)
 *   6. Positional weighting (lenition in weak positions, stability in strong)
 *   7. Nasal assimilation and palatalization bonuses
 *   8. Directional penalties for fortition and denasalisation
 *
 * ENHANCED: Live API integration for real-time attestation verification.
 * The async version queries Index Diachronica directly for the most
 * up-to-date attestation data.
 *
 * The bonus is subtracted from the phonetic distance before weighting,
 * so natural changes incur lower effective cost than unnatural ones.
 */

// Cache for live API results to avoid repeated calls within a reconstruction
const liveApiCache = new Map<string, number>();

/**
 * Async version of getNaturalChangeBonus that queries the live Index Diachronica API.
 * Falls back to the sync version if the API is unavailable or times out.
 */
const getNaturalChangeBonusAsync = async (
  p: string,
  reflex: string,
  left: string | null,
  right: string | null
): Promise<number> => {
  const cacheKey = `${p}>${reflex}|${left || '_'}-${right || '_'}`;
  
  // Check live API cache first
  if (liveApiCache.has(cacheKey)) {
    return liveApiCache.get(cacheKey)!;
  }
  
  // Get the base bonus from local data
  const baseBonus = getNaturalChangeBonusSync(p, reflex, left, right);
  
  try {
    // Query the live Index Diachronica API
    const attestationInfo = await getAttestedShiftInfo(p, reflex, left, right);
    
    if (attestationInfo.isAttested) {
      // Apply additional bonus for attested shifts from live API
      // This stacks with local data bonuses for maximum reward
      const liveApiBonus = attestationInfo.bonus * 0.5; // Scale to not overpower local data
      const totalBonus = baseBonus + liveApiBonus;
      
      liveApiCache.set(cacheKey, totalBonus);
      return totalBonus;
    }
  } catch (error) {
    // API failure - fall back to base bonus
    console.warn('Index Diachronica API query failed, using local data:', error);
  }
  
  return baseBonus;
};

/**
 * Clear the live API cache between reconstructions
 */
export const clearLiveApiCache = (): void => {
  liveApiCache.clear();
};

/**
 * Pre-fetch attestation data for a set of candidate proto-phonemes and their reflexes.
 * This allows batch API queries before the main reconstruction loop, improving performance.
 */
export const prefetchAttestedShifts = async (
  candidates: Array<{ proto: string; reflexes: Array<{ phoneme: string; left: string | null; right: string | null }> }>
): Promise<void> => {
  const promises: Promise<void>[] = [];
  
  for (const candidate of candidates) {
    for (const reflex of candidate.reflexes) {
      const promise = getAttestedShiftInfo(
        candidate.proto,
        reflex.phoneme,
        reflex.left,
        reflex.right
      ).then(info => {
        const cacheKey = `${candidate.proto}>${reflex.phoneme}|${reflex.left || '_'}-${reflex.right || '_'}`;
        const baseBonus = getNaturalChangeBonusSync(candidate.proto, reflex.phoneme, reflex.left, reflex.right);
        liveApiCache.set(cacheKey, baseBonus + (info.isAttested ? info.bonus * 0.5 : 0));
      }).catch(() => {
        // Silently fail - will fall back to sync version
      });
      
      promises.push(promise);
    }
  }
  
  // Wait for all prefetches to complete (with timeout)
  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
  ]);
};

/**
 * CONDITIONED CHANGE SCORING
 * 
 * This function implements environment-aware bonus scaling. The core insight:
 * A sound change like /t/ > /d/ is highly natural in intervocalic position,
 * but unnatural word-initially. The bonus should reflect this.
 * 
 * Algorithm:
 *   1. Compute base bonus from rules, Diachronica frequencies, and features
 *   2. Compute environment match score (0.0–1.0) comparing actual context 
 *      against attested/expected environments for this change
 *   3. Scale bonus: finalBonus = baseBonus * (0.5 + 0.5 * envMatchScore)
 * 
 * This ensures:
 *   - Perfect environment match → full bonus
 *   - Partial match → reduced bonus
 *   - Mismatched environment → minimal bonus (50% floor)
 */
const getNaturalChangeBonusSync = (p: string, reflex: string, left: string | null, right: string | null): number => {
  const fP = getEffectiveFeatures(p), fR = getEffectiveFeatures(reflex);
  if (!fP || !fR) return 0;
  
  // === STEP 1: Compute base bonus (unchanged components) ===
  let baseBonus = 0;
  const ctx: ChangeContext = {
    left: left && left !== GAP_CHAR ? getEffectiveFeatures(left) : null,
    right: right && right !== GAP_CHAR ? getEffectiveFeatures(right) : null,
    leftChar: left === GAP_CHAR ? null : left,
    rightChar: right === GAP_CHAR ? null : right,
  };
  const fP_full: DistinctiveFeaturesWithSymbol = { ...fP, symbol: p };
  const fR_full: DistinctiveFeaturesWithSymbol = { ...fR, symbol: reflex };
  
  // Rule matching bonus
  const matchedRules = NATURAL_SOUND_CHANGES.filter(rule => rule.test(fP_full, fR_full, ctx));
  if (matchedRules.length > 0) baseBonus += matchedRules[0].priority * 0.03;

  // Diachronica frequency bonus (already environment-aware)
  const diachronicaBonus = getDiachronicaEnvironmentBonus(p, reflex, left, right);
  baseBonus += diachronicaBonus;

  // Fallback: Basic frequency bonus for shifts with high frequency
  const shiftKey = `${p}>${reflex}`;
  const freqData = (diachronicaFreqs as any)[shiftKey];
  if (freqData && freqData.count >= 3) {
    baseBonus += 0.02 + Math.log10(freqData.count) * 0.04;
  } else if (freqData && freqData.count > 0) {
    baseBonus += 0.01;
  } else {
    baseBonus += 0.005;
  }

  // Feature-based naturalness
  const delta: string[] = [];
  for (const k in fP) {
    if (fP[k as keyof typeof fP] !== fR[k as keyof typeof fR]) delta.push(`${k}:${fR[k as keyof typeof fR]}`);
  }
  if (delta.length > 0) {
    const deltaKey = delta.sort().join(',');
    const featureFreq = (featureFreqs as any)[deltaKey];
    if (featureFreq) {
      baseBonus += 0.02 + Math.log10(featureFreq) * 0.03;
    }
    const naturalness = evaluateNaturalness(p, reflex, left, right);
    baseBonus += naturalness.score * 0.15;
  }

  // Positional bonuses (these become environment-dependent)
  const isVowel = (c: string | null) => c && FEATURE_MAP[c]?.syllabic;
  const isConsonant = (c: string | null) => c && FEATURE_MAP[c]?.consonantal && !FEATURE_MAP[c]?.syllabic;
  const isIntervocalic = isVowel(left) && isVowel(right);
  const isWordInitial = left === null || left === GAP_CHAR;
  const isWordFinal = right === null || right === GAP_CHAR;
  const isPreConsonantal = isConsonant(right);
  const isPostConsonantal = isConsonant(left);

  // Lenition bonuses (strongest in intervocalic/word-final positions)
  if (isIntervocalic || isWordFinal) {
    if ((!fP.voice && fR.voice) || (fP.consonantal && !fR.consonantal) || reflex === GAP_CHAR) {
      baseBonus += 0.12;
    }
  }
  
  // Word-initial stability (no bonus for changes here unless supported by data)
  if (isWordInitial && p === reflex) {
    baseBonus += 0.04;
  }
  
  // Nasal assimilation (context-sensitive)
  if (fP.nasal && right && !isVowel(right)) {
    const rf = FEATURE_MAP[right];
    if (rf && ((fR.labial && rf.labial) || (fR.coronal && rf.coronal) || (fR.dorsal && rf.dorsal))) {
      baseBonus += 0.12;
    }
  }
  
  // Palatalization (requires high/front vowel/glide following)
  if ((fP.dorsal || fP.coronal) && fR.coronal && fR.delayedRelease) {
    if (right && FEATURE_MAP[right] && (FEATURE_MAP[right].high || FEATURE_MAP[right].coronal) && !FEATURE_MAP[right].consonantal) {
      baseBonus += 0.12;
    }
  }
  
  // Fortition penalty (unless in strong positions)
  if (p !== reflex && reflex !== GAP_CHAR) {
    if (fP.continuant && !fR.continuant && !fR.nasal && !fP.lateral) {
      // Fortition is more acceptable word-initially or post-consonantally
      if (!isWordInitial && !isPostConsonantal) {
        baseBonus -= 0.15;
      }
    }
  }

  // === STEP 2: Compute environment match score (0.0–1.0) ===
  const envMatchScore = computeEnvironmentMatchScore(p, reflex, left, right, fP, fR, matchedRules);

  // === STEP 3: Scale bonus by environment match ===
  // Formula: scaledBonus = baseBonus * (0.5 + 0.5 * envMatchScore)
  // Range: 0.5× (no match) to 1.0× (perfect match)
  const scalingFactor = 0.5 + (0.5 * envMatchScore);
  const finalBonus = baseBonus * scalingFactor;

  return finalBonus;
};

/**
 * Compute a comprehensive environment match score (0.0–1.0) for a sound change.
 * 
 * This function evaluates how well the actual phonetic context matches the
 * expected/attested environments for the given sound change.
 * 
 * Score components:
 *   - Diachronica attestation match (40% weight)
 *   - Rule-based expected environment (30% weight)  
 *   - Positional naturalness (30% weight)
 */
const computeEnvironmentMatchScore = (
  p: string,
  reflex: string,
  left: string | null,
  right: string | null,
  fP: DistinctiveFeatures,
  fR: DistinctiveFeatures,
  matchedRules: any[]
): number => {
  let totalScore = 0;
  let totalWeight = 0;

  // Component 1: Diachronica environment match (weight: 0.40)
  const diachronicaEnvScore = getDiachronicaEnvironmentMatchScore(p, reflex, left, right);
  totalScore += diachronicaEnvScore * 0.40;
  totalWeight += 0.40;

  // Component 2: Rule-based expected environment (weight: 0.30)
  const ruleEnvScore = computeRuleEnvironmentMatch(matchedRules, left, right, fP, fR);
  totalScore += ruleEnvScore * 0.30;
  totalWeight += 0.30;

  // Component 3: Positional naturalness (weight: 0.30)
  const positionalScore = computePositionalNaturalnessScore(p, reflex, left, right, fP, fR);
  totalScore += positionalScore * 0.30;
  totalWeight += 0.30;

  return totalWeight > 0 ? totalScore / totalWeight : 0.5;
};

/**
 * Get environment match score from Diachronica data (0.0–1.0).
 * Uses the best matching attested environment pattern.
 */
const getDiachronicaEnvironmentMatchScore = (
  p: string,
  reflex: string,
  left: string | null,
  right: string | null
): number => {
  const shiftKey = `${p}>${reflex}`;
  const freqData = (diachronicaFreqs as any)[shiftKey];
  if (!freqData || !freqData.envs || freqData.envs.length === 0) return 0.5; // Neutral if no data

  // Find best matching environment
  let bestMatchScore = 0;
  for (const env of freqData.envs) {
    if (env && env.l !== undefined && env.r !== undefined) {
      const matchScore = matchDiachronicaEnvironment(env, left, right);
      if (matchScore > bestMatchScore) bestMatchScore = matchScore;
    }
  }

  // Scale: 0.0–1.0 match quality
  return bestMatchScore;
};

/**
 * Compute how well the actual environment matches the expected environment
 * for the matched sound change rules.
 */
const computeRuleEnvironmentMatch = (
  matchedRules: any[],
  left: string | null,
  right: string | null,
  fP: DistinctiveFeatures,
  fR: DistinctiveFeatures
): number => {
  if (matchedRules.length === 0) return 0.5; // Neutral if no rules matched

  const isVowel = (c: string | null) => c && FEATURE_MAP[c]?.syllabic;
  const isConsonant = (c: string | null) => c && FEATURE_MAP[c]?.consonantal && !FEATURE_MAP[c]?.syllabic;
  const isHighFront = (c: string | null) => {
    if (!c) return false;
    const f = FEATURE_MAP[c];
    return f && f.syllabic && f.high && !f.back;
  };
  const isRound = (c: string | null) => {
    if (!c) return false;
    const f = FEATURE_MAP[c];
    return f && f.round;
  };

  let score = 0.5;
  const ruleName = matchedRules[0].name;

  // Rule-specific environment expectations
  switch (ruleName) {
    case 'Intervocalic Voicing':
    case 'Intervocalic Spirantization':
      if (isVowel(left) && isVowel(right)) score = 1.0;
      else if (isVowel(left) || isVowel(right)) score = 0.6;
      else score = 0.2;
      break;

    case 'Final Devoicing':
      if (right === null || right === GAP_CHAR) score = 1.0;
      else score = 0.3;
      break;

    case 'Velar Palatalization':
    case 'Palatalization of Alveolars':
    case 'Assibilation':
      if (isHighFront(right)) score = 1.0;
      else if (isVowel(right) && !isRound(right)) score = 0.6;
      else score = 0.3;
      break;

    case 'Labialization':
      if (isRound(right)) score = 1.0;
      else score = 0.3;
      break;

    case 'Nasal Assimilation':
      if (isConsonant(right)) score = 1.0;
      else score = 0.4;
      break;

    case 'Umlaut (i-mutation)':
      if (isHighFront(right)) score = 1.0;
      else score = 0.3;
      break;

    case 'Rhotacism':
      if (isVowel(left) && isVowel(right)) score = 1.0;
      else score = 0.5;
      break;

    case 'Spirantization':
    case 'Spirantization (Grimm\'s Law)':
      // Spirantization is natural in various positions
      score = 0.7;
      break;

    case 'Debuccalization':
      // Debuccalization often happens word-finally or pre-consonantal
      if (right === null || right === GAP_CHAR || isConsonant(right)) score = 0.9;
      else score = 0.5;
      break;

    case 'Syncope':
      if (isConsonant(left) && isConsonant(right)) score = 1.0;
      else score = 0.4;
      break;

    case 'Apocope':
      if (right === null || right === GAP_CHAR) score = 1.0;
      else score = 0.2;
      break;

    case 'Prothesis':
      if (left === null || left === GAP_CHAR) score = 1.0;
      else score = 0.2;
      break;

    default:
      // Default: neutral score
      score = 0.5;
  }

  return score;
};

/**
 * Compute positional naturalness score based on cross-linguistic
 * patterns of sound change by position.
 */
const computePositionalNaturalnessScore = (
  p: string,
  reflex: string,
  left: string | null,
  right: string | null,
  fP: DistinctiveFeatures,
  fR: DistinctiveFeatures
): number => {
  const isVowel = (c: string | null) => c && FEATURE_MAP[c]?.syllabic;
  const isConsonant = (c: string | null) => c && FEATURE_MAP[c]?.consonantal && !FEATURE_MAP[c]?.syllabic;
  
  const isWordInitial = left === null || left === GAP_CHAR;
  const isWordFinal = right === null || right === GAP_CHAR;
  const isIntervocalic = isVowel(left) && isVowel(right);
  const isPreConsonantal = isConsonant(right);
  const isPostConsonantal = isConsonant(left);

  // Identify change type
  const isLenition = fP.consonantal && (
    (!fP.voice && fR.voice) ||           // Voicing
    (!fP.continuant && fR.continuant) || // Spirantization
    (!fP.consonantal && fR.sonorant)     // Vocalization
  );
  
  const isFortition = fP.continuant && !fR.continuant && fR.consonantal;
  const isDeletion = reflex === GAP_CHAR;
  const isInsertion = p === GAP_CHAR || p === '';

  // Position-specific naturalness
  if (isLenition) {
    // Lenition is most natural intervocalically, then word-finally
    if (isIntervocalic) return 1.0;
    if (isWordFinal) return 0.85;
    if (isPreConsonantal) return 0.70;
    if (isPostConsonantal) return 0.50;
    if (isWordInitial) return 0.30; // Lenition in initial position is rare
    return 0.60;
  }

  if (isFortition) {
    // Fortition is most natural word-initially or post-consonantally
    if (isWordInitial) return 0.90;
    if (isPostConsonantal) return 0.75;
    if (isPreConsonantal) return 0.60;
    if (isIntervocalic) return 0.40; // Fortition between vowels is rare
    if (isWordFinal) return 0.50;
    return 0.60;
  }

  if (isDeletion) {
    // Deletion patterns
    if (isWordFinal && fP.syllabic && fP.high) return 0.95; // High vowel apocope
    if (isWordFinal) return 0.70;
    if (isPreConsonantal && fP.syllabic) return 0.80; // Syncope
    if (isPreConsonantal) return 0.60;
    if (p === 'h' || p === 'ʔ') return 0.85; // Weak segments delete easily
    if (isIntervocalic) return 0.65;
    if (isWordInitial) return 0.30; // Initial deletion is rare
    return 0.50;
  }

  if (isInsertion) {
    // Insertion patterns
    if (isWordInitial && isConsonant(right) && right && 
        (right.includes('s') || right.includes('ʃ'))) {
      return 0.90; // Prothesis before sibilant
    }
    if (isPreConsonantal && fR.syllabic) return 0.70; // Epenthesis in clusters
    return 0.50;
  }

  // Default: neutral
  return 0.5;
};

/**
 * Match a Diachronica environment pattern against actual phonetic context.
 * Returns a similarity score (0.0–1.0) based on how well the pattern fits.
 * Source language info is NOT extracted - patterns are anonymized.
 */
const matchDiachronicaEnvironment = (
  pattern: { l: string; r: string },
  left: string | null,
  right: string | null
): number => {
  let score = 0;
  let checks = 0;

  // Helper to normalize pattern symbols
  const normalizePattern = (p: string): string => {
    return p.replace(/[{}]/g, '').replace(/\[\+?([a-zA-Z]+)\]/g, '$1');
  };

  // Match left context
  if (pattern.l) {
    checks++;
    const leftPat = normalizePattern(pattern.l);
    if (!leftPat || leftPat === '' || leftPat === '∅') {
      // Word-initial pattern
      if (left === null || left === GAP_CHAR || left === '#') score += 1;
    } else if (leftPat === '#' || leftPat === '$') {
      // Word boundary pattern
      if (left === null || left === GAP_CHAR) score += 1;
    } else if (leftPat.includes(',') || leftPat.includes('|')) {
      // Alternation pattern like {p,k} or {V,C}
      const options = leftPat.split(/[,|]/);
      for (const opt of options) {
        if (left === opt.trim()) {
          score += 1;
          break;
        }
        // Feature-based matching for classes like V, C, N
        if (left && FEATURE_MAP[left]) {
          const lf = FEATURE_MAP[left];
          if ((opt === 'V' && lf.syllabic) ||
              (opt === 'C' && lf.consonantal) ||
              (opt === 'N' && lf.nasal)) {
            score += 0.9;
            break;
          }
        }
      }
    } else if (leftPat === 'V') {
      // Vowel context
      if (left && FEATURE_MAP[left]?.syllabic) score += 1;
    } else if (leftPat === 'C') {
      // Consonant context
      if (left && FEATURE_MAP[left]?.consonantal) score += 1;
    } else {
      // Specific phoneme match
      if (left === leftPat) score += 1;
    }
  }

  // Match right context
  if (pattern.r) {
    checks++;
    const rightPat = normalizePattern(pattern.r);
    if (!rightPat || rightPat === '' || rightPat === '∅') {
      // Word-final pattern
      if (right === null || right === GAP_CHAR || right === '#') score += 1;
    } else if (rightPat === '#' || rightPat === '$') {
      // Word boundary pattern
      if (right === null || right === GAP_CHAR) score += 1;
    } else if (rightPat.includes(',') || rightPat.includes('|')) {
      // Alternation pattern
      const options = rightPat.split(/[,|]/);
      for (const opt of options) {
        if (right === opt.trim()) {
          score += 1;
          break;
        }
        // Feature-based matching
        if (right && FEATURE_MAP[right]) {
          const rf = FEATURE_MAP[right];
          if ((opt === 'V' && rf.syllabic) ||
              (opt === 'C' && rf.consonantal) ||
              (opt === 'N' && rf.nasal)) {
            score += 0.9;
            break;
          }
        }
      }
    } else if (rightPat === 'V') {
      if (right && FEATURE_MAP[right]?.syllabic) score += 1;
    } else if (rightPat === 'C') {
      if (right && FEATURE_MAP[right]?.consonantal) score += 1;
    } else {
      // Specific phoneme match
      if (right === rightPat) score += 1;
    }
  }

  // Normalize score by number of checks
  return checks > 0 ? score / checks : 0.5; // Default 0.5 if no environment specified
};

/**
 * Get environment-aware Diachronica bonus.
 * This enhances the basic frequency bonus by considering how well
 * the actual phonetic context matches attested environments.
 * Source languages are NOT exposed - only pattern frequencies are used.
 */
const getDiachronicaEnvironmentBonus = (
  p: string,
  reflex: string,
  left: string | null,
  right: string | null
): number => {
  const shiftKey = `${p}>${reflex}`;
  const freqData = (diachronicaFreqs as any)[shiftKey];
  if (!freqData || !freqData.envs || freqData.envs.length === 0) return 0;

  // Calculate average environment match score
  let totalEnvScore = 0;
  let validEnvs = 0;

  for (const env of freqData.envs) {
    if (env && env.l !== undefined && env.r !== undefined) {
      const matchScore = matchDiachronicaEnvironment(env, left, right);
      totalEnvScore += matchScore;
      validEnvs++;
    }
  }

  if (validEnvs === 0) return 0;

  const avgMatch = totalEnvScore / validEnvs;
  const frequencyWeight = Math.log10(freqData.count + 1) * 0.05;

  // Bonus scales with both frequency AND environment match quality
  return avgMatch * frequencyWeight;
};

/**
 * Synchronous version for backward compatibility.
 * Use getNaturalChangeBonusAsync for live API integration.
 */
const getNaturalChangeBonus = getNaturalChangeBonusSync;

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

/**
 * §1/6 — TREE-GUIDED MULTIPLE SEQUENCE ALIGNMENT (UPGMA-style progressive)
 * 
 * Performs phylogenetically-informed alignment: aligns within clades first,
 * then merges clade consensus sequences up the tree. This respects historical
 * relationships and produces more linguistically accurate alignments than
 * center-star methods.
 * 
 * Strategy:
 *   1. For leaf nodes: return tokenized sequence
 *   2. For internal nodes with children: align all child consensus sequences
 *   3. Build consensus for this node's clade (simple majority vote)
 *   4. Return full alignment grid for this subtree
 * 
 * @param node - Root of the phylogenetic subtree to align
 * @param params - Reconstruction parameters
 * @returns Object containing alignment matrix for this subtree and leaf index mapping
 */
interface TreeAlignmentResult {
  alignment: string[][];  // Rows: aligned sequences for all leaves in this subtree
  consensus: string[];    // Consensus sequence for this clade
  leafIndices: string[]; // Language IDs in order of alignment rows
}

const alignSubtree = (node: LanguageInput, params: ReconstructionParams): TreeAlignmentResult => {
  const nodeId = node.id || node.name;
  
  // Leaf node: just tokenize and return
  if (!node.descendants || node.descendants.length === 0) {
    const tokens = tokenizeIPA(node.word || '');
    return {
      alignment: [tokens],
      consensus: tokens,
      leafIndices: [nodeId]
    };
  }
  
  // Internal node: align all children first
  const childResults = node.descendants.map(child => alignSubtree(child, params));
  
  // Collect child consensus sequences for alignment
  const childConsensuses = childResults.map(r => r.consensus);
  const childLeafIndices = childResults.flatMap(r => r.leafIndices);
  
  // Align all child consensuses to each other using progressive center-star
  // The longest child consensus becomes the initial center
  let centerIdx = 0;
  let maxLen = 0;
  childConsensuses.forEach((c, i) => {
    if (c.length > maxLen) {
      maxLen = c.length;
      centerIdx = i;
    }
  });
  
  let cladeConsensus = [...childConsensuses[centerIdx]];
  let alignedChildren: string[][] = [];
  
  // Align each child to the evolving consensus
  for (let i = 0; i < childConsensuses.length; i++) {
    if (i === centerIdx) {
      alignedChildren.push(childConsensuses[i]);
      continue;
    }
    
    const { alignedA, alignedB } = needlemanWunsch(
      cladeConsensus, 
      childConsensuses[i], 
      params.gapPenalty, 
      params.unknownCharPenalty
    );
    
    // Update clade consensus with gaps from this alignment
    if (alignedA.length > cladeConsensus.length) {
      cladeConsensus = alignedA;
    }
    alignedChildren.push(alignedB);
  }
  
  // Now propagate gaps to all children to match final consensus length
  const finalConsensus = cladeConsensus;
  for (let i = 0; i < alignedChildren.length; i++) {
    if (alignedChildren[i].length < finalConsensus.length) {
      // Pad with gaps
      while (alignedChildren[i].length < finalConsensus.length) {
        alignedChildren[i].push(GAP_CHAR);
      }
    }
  }
  
  // Build full alignment by concatenating child alignments (with propagated gaps)
  // Each child alignment needs to be expanded to match the new consensus length
  const fullAlignment: string[][] = [];
  
  for (let childIdx = 0; childIdx < childResults.length; childIdx++) {
    const childResult = childResults[childIdx];
    const childConsensusAligned = alignedChildren[childIdx];
    
    // Create gap map: which positions in final consensus came from gaps
    const gapMap: boolean[] = [];
    let consensusPtr = 0;
    for (let k = 0; k < childConsensusAligned.length; k++) {
      if (childConsensusAligned[k] === GAP_CHAR && 
          (consensusPtr >= childResult.consensus.length || 
           childResult.consensus[consensusPtr] !== GAP_CHAR)) {
        gapMap.push(true);  // New gap introduced
      } else {
        gapMap.push(false); // Position from original consensus
        consensusPtr++;
      }
    }
    
    // Propagate gaps to each leaf in this child
    for (let leafIdx = 0; leafIdx < childResult.alignment.length; leafIdx++) {
      const originalRow = childResult.alignment[leafIdx];
      const newRow: string[] = [];
      let originalPtr = 0;
      
      for (let k = 0; k < gapMap.length; k++) {
        if (gapMap[k]) {
          newRow.push(GAP_CHAR);
        } else {
          newRow.push(originalRow[originalPtr] ?? GAP_CHAR);
          originalPtr++;
        }
      }
      
      fullAlignment.push(newRow);
    }
  }
  
  return {
    alignment: fullAlignment,
    consensus: finalConsensus,
    leafIndices: childLeafIndices
  };
};

/**
 * Tree-guided MSA entry point.
 * Aligns all languages in the tree using phylogenetic structure.
 * Falls back to center-star MSA for flat (no-descendants) inputs.
 */
const performMSA_treeGuided = (
  inputs: LanguageInput[], 
  params: ReconstructionParams
): { alignmentMatrix: string[][], leafOrder: string[] } => {
  // Check if any input has descendants (tree structure)
  const hasTreeStructure = inputs.some(i => i.descendants && i.descendants.length > 0);
  
  if (!hasTreeStructure || inputs.length === 0) {
    // Fall back to center-star MSA
    const flatAlignment = performMSA(
      inputs.map(i => ({ word: i.word })), 
      params
    );
    return {
      alignmentMatrix: flatAlignment,
      leafOrder: inputs.map(i => i.id || i.name)
    };
  }
  
  // Create a virtual root to hold all top-level inputs as siblings
  const virtualRoot: LanguageInput = {
    id: '__root__',
    name: '__root__',
    word: '',
    descendants: inputs
  };
  
  const result = alignSubtree(virtualRoot, params);
  
  return {
    alignmentMatrix: result.alignment,
    leafOrder: result.leafIndices
  };
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
 * Feature 2.3: Single MCMC chain runner for multi-chain MCMC.
 * Runs one independent chain from a specified starting point.
 */
interface MCMCChainResult {
  counts: Record<string, number>;
  samples: string[];  // All samples for convergence calculation
  startPoint: string;
}

const runSingleMCMCChain = (
  matrix: string[][],
  colIdx: number,
  params: ReconstructionParams,
  languageWeights?: number[],
  columnSpreadMultiplier?: number,
  startPoint?: string,
  chainId?: number
): MCMCChainResult => {
  const spreadMult = columnSpreadMultiplier ?? 1.0;
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  
  if (validReflexes.length === 0) return { counts: {}, samples: [], startPoint: '' };

  const uniqueTokens = Array.from(new Set(matrix.flat().filter(c => c !== GAP_CHAR)));
  const universe = Array.from(new Set([...Object.keys(FEATURE_MAP), ...uniqueTokens]));
  const counts: Record<string, number> = {};
  const samples: string[] = [];

  const neighborsMap: Record<string, string[]> = {};
  universe.forEach(u => {
    neighborsMap[u] = universe.filter(
      v => getPhoneticDistance(u, v, params.gapPenalty, params.unknownCharPenalty) <= 0.35 && v !== u
    );
  });

  // Feature 2.3: Initialize from specified start point or medoid
  let current: string;
  if (startPoint && universe.includes(startPoint)) {
    current = startPoint;
  } else {
    // Default: medoid initialization
    let minInitDist = Infinity;
    validReflexes.forEach(candidate => {
      const totalDist = validReflexes.reduce(
        (sum, r) => sum + getPhoneticDistance(candidate, r, params.gapPenalty, params.unknownCharPenalty), 0
      );
      if (totalDist < minInitDist) { minInitDist = totalDist; current = candidate; }
    });
    current = current || validReflexes[0];
  }

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
  
  // Feature 2.3: 30% burn-in instead of 20%
  const burnInStart = Math.floor(params.mcmcIterations * 0.3);
  
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
    
    if (acceptanceRatio > 1 || Math.random() < acceptanceRatio) {
      current = proposal;
      currentLogP = proposalLogP;
    }
    
    // Feature 2.3: Store samples after burn-in
    if (i >= burnInStart) {
      counts[current] = (counts[current] || 0) + 1;
      samples.push(current);
    }
  }

  return { counts, samples, startPoint: current };
};

/**
 * Feature 2.3: Compute chain convergence using inter-chain mode agreement.
 * Returns fraction of chains that agree on the same mode (1.0 = full agreement).
 * This is more appropriate for categorical variables like phonemes than PSRF.
 */
const computeChainConvergence = (chainSamples: string[][]): number => {
  if (chainSamples.length < 2) return 1.0;
  
  // Get mode (most common phoneme) of each chain
  const modes = chainSamples.map(samples => {
    const counts: Record<string, number> = {};
    for (const s of samples) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
    // Return the most common phoneme
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] ?? '';
  });
  
  // Count how many chains agree on each mode
  const modeCounts: Record<string, number> = {};
  for (const m of modes) {
    modeCounts[m] = (modeCounts[m] ?? 0) + 1;
  }
  
  // Fraction of chains agreeing on the most common mode
  const maxAgreement = Math.max(...Object.values(modeCounts));
  return maxAgreement / chainSamples.length;
};

/**
 * Feature 2.3: Merge samples from multiple chains.
 * Combines counts and computes convergence using mode agreement.
 */
const mergeChainSamples = (chainResults: MCMCChainResult[]): { counts: Record<string, number>; convergence: number } => {
  const mergedCounts: Record<string, number> = {};
  
  // Sum counts across all chains
  chainResults.forEach(result => {
    Object.entries(result.counts).forEach(([phoneme, count]) => {
      mergedCounts[phoneme] = (mergedCounts[phoneme] || 0) + count;
    });
  });
  
  // Compute convergence using mode agreement
  const allSamples = chainResults.map(r => r.samples);
  const convergence = computeChainConvergence(allSamples);
  
  return { counts: mergedCounts, convergence };
};

/**
 * Feature 2.3: Multi-chain MCMC solver with convergence detection.
 * Runs 3-4 independent chains from diverse starting points and merges results.
 * Uses PSRF (Gelman-Rubin statistic) to detect convergence.
 */
const solveMCMCMultiChain = (
  matrix: string[][],
  colIdx: number,
  params: ReconstructionParams,
  languageWeights?: number[],
  columnSpreadMultiplier?: number
): { char: string; dist: { [key: string]: number }; convergence: number } => {
  const NUM_CHAINS = 4;
  
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  
  if (validReflexes.length === 0) return { char: '', dist: {}, convergence: 1.0 };
  
  const uniqueTokens = Array.from(new Set(matrix.flat().filter(c => c !== GAP_CHAR)));
  const universe = Array.from(new Set([...Object.keys(FEATURE_MAP), ...uniqueTokens]));
  
  // Select diverse starting points
  const startPoints: string[] = [];
  
  // Chain 1: Medoid (minimum sum of distances to all reflexes)
  let medoid = validReflexes[0];
  let minTotalDist = Infinity;
  validReflexes.forEach(candidate => {
    const totalDist = validReflexes.reduce(
      (sum, r) => sum + getPhoneticDistance(candidate, r, params.gapPenalty, params.unknownCharPenalty), 0
    );
    if (totalDist < minTotalDist) { minTotalDist = totalDist; medoid = candidate; }
  });
  startPoints.push(medoid);
  
  // Chain 2: Random valid reflex
  startPoints.push(validReflexes[Math.floor(Math.random() * validReflexes.length)]);
  
  // Chain 3: Most common phoneme in FEATURE_MAP (high prior)
  const sortedByPrior = Object.entries(PHONETIC_PRIOR)
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p)
    .filter(p => universe.includes(p));
  startPoints.push(sortedByPrior[0] || validReflexes[0]);
  
  // Chain 4: Random from universe (exploration-focused)
  startPoints.push(universe[Math.floor(Math.random() * universe.length)]);
  
  // Run chains in parallel (simulated with sequential for now)
  const chainResults: MCMCChainResult[] = [];
  for (let i = 0; i < NUM_CHAINS; i++) {
    const result = runSingleMCMCChain(
      matrix, colIdx, params, languageWeights, columnSpreadMultiplier,
      startPoints[i], i
    );
    chainResults.push(result);
  }
  
  // Merge samples and compute convergence
  const { counts, convergence } = mergeChainSamples(chainResults);
  
  // Build distribution
  const dist: Record<string, number> = {};
  let best = '', maxProb = -1;
  const totalSamples = Object.values(counts).reduce((a, b) => a + b, 0);
  
  if (totalSamples > 0) {
    Object.entries(counts).forEach(([k, v]) => {
      const p = v / totalSamples;
      dist[k] = p;
      if (p > maxProb) { maxProb = p; best = k; }
    });
  }
  
  return { char: best, dist, convergence };
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
 *  • Feature 2.3: Now uses multi-chain MCMC with mode-agreement convergence detection.
 */
const solveMCMC = (
  matrix: string[][], colIdx: number, params: ReconstructionParams,
  languageWeights?: number[], columnSpreadMultiplier?: number
): { char: string; dist: { [key: string]: number } } => {
  // Feature 2.3: Use multi-chain MCMC
  const result = solveMCMCMultiChain(matrix, colIdx, params, languageWeights, columnSpreadMultiplier);
  
  // Log convergence for diagnostics
  if (result.convergence < 0.5) {
    console.warn(`MCMC column ${colIdx}: Convergence=${result.convergence.toFixed(2)} - chains may not have converged`);
  }
  
  return { char: result.char, dist: result.dist };
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

/**
 * REGULARITY PENALTY FEEDBACK (§3 Enhancement)
 * 
 * Computes a penalty for candidate proto-forms that require sporadic 
 * (exception-ridden) sound changes to derive the descendant forms.
 * 
 * This implements the Neogrammarian principle that sound change is regular
 * (exceptionless). Candidates requiring sporadic changes are penalized,
 * making "regular" reconstructions preferred over those with many exceptions.
 * 
 * Algorithm:
 *   1. For the candidate proto-form, compute all required sound changes
 *   2. Generalize these into sound laws
 *   3. Check application rate of each law
 *   4. Penalize based on sporadic laws: penalty = Σ(1 - applicationRate) × 0.3
 */
const computeCandidateRegularityPenalty = (
  candidateTokens: string[],
  alignmentMatrix: string[][],
  topLevelForms: { name: string; word: string }[],
  langNames: string[],
  params: ReconstructionParams
): number => {
  // Quick exit if no alignment data
  if (alignmentMatrix.length === 0 || candidateTokens.length === 0) return 0;

  // Collect sound changes for this candidate
  const candidateSoundChanges: SoundChangeNote[] = [];
  const candidateInferredShifts: InferredShift[] = [];

  // Analyze each position for each language
  candidateTokens.forEach((pChar, col) => {
    topLevelForms.forEach((lang, idx) => {
      if (!alignmentMatrix[idx]) return;
      const reflex = alignmentMatrix[idx][col];
      if (!reflex || reflex === pChar) return; // No change

      const left = col > 0 ? candidateTokens[col - 1] : null;
      const right = col < candidateTokens.length - 1 ? candidateTokens[col + 1] : null;

      // Record the change
      const id = identifySoundChange(pChar, reflex, left, right);
      candidateSoundChanges.push({
        language: lang.name,
        from: pChar === GAP_CHAR ? '∅' : pChar,
        to: reflex === GAP_CHAR ? '∅' : reflex,
        environment: `${left || '#'} _ ${right || '#'}`,
        name: id.name,
        description: id.description
      });

      // Add inferred shift for naturalness evaluation
      if (id.name.includes('Shift') || id.name.includes('Assimilation')) {
        const nat = evaluateNaturalness(pChar, reflex, left, right);
        candidateInferredShifts.push({
          language: lang.name,
          from: pChar === GAP_CHAR ? '∅' : pChar,
          to: reflex === GAP_CHAR ? '∅' : reflex,
          environment: `${left || '#'} _ ${right || '#'}`,
          naturalnessScore: nat.score,
          typologicalCategory: nat.category
        });
      }
    });
  });

  // If no changes, no penalty
  if (candidateSoundChanges.length === 0) return 0;

  // Generalize sound changes into laws
  const candidateLaws = generalizeSoundChanges(candidateSoundChanges, candidateInferredShifts);

  // Calculate penalty based on sporadic laws
  let penalty = 0;
  
  for (const law of candidateLaws) {
    if (!law.ruleString) continue;

    // Count how many times this law applies in this candidate's derivation
    const applicable = candidateSoundChanges.filter(c =>
      c.language === law.language &&
      law.examples.some(ex => ex.includes(`${c.from} > ${c.to}`))
    );

    // Count total potential environments for this law
    const totalEnvironments = candidateTokens.length * topLevelForms.filter(f => f.name === law.language).length;
    
    if (totalEnvironments === 0) continue;

    // Calculate application rate
    const applicationRate = applicable.length / Math.max(1, totalEnvironments);
    
    // Flag as sporadic if rate is very low
    if (applicationRate < 0.15 || applicable.length < 2) {
      // Sporadic change penalty: higher penalty for lower application rates
      const sporadicPenalty = (1 - applicationRate) * 0.3;
      penalty += sporadicPenalty;
      
      // Additional penalty for single-instance sporadic changes
      if (applicable.length === 1) {
        penalty += 0.1; // Extra penalty for isolated exceptions
      }
    }

    // Check for regularity in the correspondence columns
    // If this law affects positions that are otherwise regular, that's suspicious
    const affectedCols = candidateSoundChanges
      .filter(c => c.language === law.language && law.examples.some(ex => ex.includes(`${c.from} > ${c.to}`)))
      .map(c => candidateTokens.indexOf(c.from))
      .filter(idx => idx >= 0);

    // If sporadic changes cluster in specific columns, that's less suspicious
    // than if they're scattered (scattered = more likely exceptions)
    const uniqueCols = new Set(affectedCols);
    if (uniqueCols.size > 1 && affectedCols.length <= uniqueCols.size) {
      // Each sporadic change in a different column = more suspicious
      penalty += 0.05 * uniqueCols.size;
    }
  }

  // Additional penalty for irregular column correspondences
  // If the candidate requires many individual phoneme changes rather than systematic ones
  const systematicChanges = candidateLaws.filter(l => l.ruleString && !l.isSporadic).length;
  const sporadicChanges = candidateLaws.filter(l => l.isSporadic).length;
  
  if (systematicChanges === 0 && sporadicChanges > 0) {
    // All changes are sporadic = very irregular reconstruction
    penalty += 0.2;
  }

  // Scale penalty by number of languages (more languages = higher expectation of regularity)
  const languageScale = Math.log2(Math.max(2, topLevelForms.length)) / 3;
  penalty *= languageScale;

  return Math.min(penalty, 0.5); // Cap penalty at 0.5 to avoid over-penalizing
};

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

  // Use tree-guided MSA when tree structure is available, fall back to center-star for flat inputs
  const msaResult = performMSA_treeGuided(validInputs, params);
  let alignmentMatrix = msaResult.alignmentMatrix;
  
  // Reorder alignmentMatrix to match topLevelForms order
  const leafOrder = msaResult.leafOrder;
  const reorderedMatrix: string[][] = [];
  for (const form of topLevelForms) {
    const formId = form.id || form.name;
    const idx = leafOrder.indexOf(formId);
    if (idx >= 0) {
      reorderedMatrix.push(alignmentMatrix[idx]);
    }
  }
  alignmentMatrix = reorderedMatrix;
  
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

  // ── §6: EM loop: align → reconstruct → re-align (up to 8 iterations) ─────
  const MAX_ITERATIONS = 8;  // Increased from 3 for better convergence
  const CONVERGENCE_THRESHOLD = 0;  // Stop when proto-form doesn't change
  let spreadScores: PhylogeneticSpreadScore[] = [];
  let columnSpreadMults: number[] = [];
  let previousProtoForm = '';  // Track for convergence

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {

    // §2: Full three-component weights from iteration 1 onward
    if (iteration > 0) languageWeights = computeFullWeights(topLevelForms, alignmentMatrix, protoYear, reconstructedTokens);

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
    // §3: Regularity penalty feedback — penalize sporadic sound changes
    candidates = candidatePaths.map(p => {
      const phonotacticPenalty = evaluateSequenceNaturalness(p.chars);
      const inventoryPenalty   = evaluateInventorySymmetry(p.chars);
      const chainShiftPenalty  = evaluateChainShifts(p.chars, alignmentMatrix);
      const mdlComplexity      = computeMDLComplexity(p.chars, alignmentMatrix);
      
      // NEW: Natural class pattern bonus (rewards systematic class-level changes)
      const naturalClassBonus  = evaluateNaturalClassPattern(p.chars, alignmentMatrix);
      
      // NEW: Universal constraints penalty (typological impossibility filter)
      const universalPenalty   = evaluateUniversalConstraints(p.chars);
      
      // Compute regularity penalty for this candidate
      const regularityPenalty  = computeCandidateRegularityPenalty(
        p.chars, alignmentMatrix, topLevelForms, langNames, params
      );

      // Combined naturalness multiplier with new bonuses
      const naturalnessMult = Math.exp(-(phonotacticPenalty + inventoryPenalty * 0.8 + chainShiftPenalty * 0.5 + universalPenalty - naturalClassBonus) / 2);
      const naturalProb     = p.prob * naturalnessMult;
      // Apply both MDL complexity penalty and regularity penalty
      const mdlAdjusted     = Math.max(0, naturalProb - LAMBDA_MDL * mdlComplexity - regularityPenalty);

      const filteredChars = p.chars.filter(c => c !== GAP_CHAR);
      const form = '*' + filteredChars.join('').replace(/\.{2,}/g, '.');  // Collapse consecutive syllable boundaries
      return { form, probability: naturalProb, mdlAdjustedScore: mdlAdjusted, chars: filteredChars };
    }).sort((a, b) => b.mdlAdjustedScore - a.mdlAdjustedScore);

    reconstructedTokens = candidates[0]?.chars ?? segments.filter(c => c !== GAP_CHAR);

    // Check for convergence: stop if proto-form hasn't changed
    const currentProtoForm = reconstructedTokens.join('');
    if (currentProtoForm === previousProtoForm && iteration > 0) {
      break;  // Converged - proto-form is stable
    }
    previousProtoForm = currentProtoForm;

    // Pillar 4: re-align to refined proto-form
    const res = performMSA_to_proto(topLevelForms, reconstructedTokens, params);
    alignmentMatrix = res.alignmentMatrix;
    reconstructedTokens = res.protoTokens;
  }

  // ── §2: Final Wt × Wc × Wr weights ────────────────────────────────────────
  languageWeights = computeFullWeights(topLevelForms, alignmentMatrix, protoYear, reconstructedTokens);

  const protoForm = (candidates[0]?.form ?? '*' + segments.filter(c => c !== GAP_CHAR).join(''))
    .replace(/\.{2,}/g, '.');  // Collapse consecutive syllable boundaries

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

  // ── §0: Check for missing attestation years and add warning ──────────────
  const warnings: string[] = [];
  const allLackYears = validInputs.every(i => i.attestationYear === undefined);
  if (allLackYears && validInputs.length > 0) {
    warnings.push(
      'No attestation years provided. Chronological weighting (Wt) is disabled. ' +
      'Add attestationYear fields to enable archaic-language prioritization.'
    );
  }

  // NEW: Compute per-segment confidence tiers
  const segmentConfidence = computePerSegmentConfidence(
    reconstructedTokens,
    distributionArr,
    alignmentMatrix,
    langNames,
    regularityScores
  );

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

    // §0 — User-facing warnings
    warnings: warnings.length > 0 ? warnings : undefined,

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

    // NEW: Per-segment confidence tiers
    segmentConfidence,
  } as any;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Feature 2.1: COGNATE-SET BATCH MODE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Reconstructs multiple cognate sets simultaneously, accumulating correspondence
 * statistics across all sets to make regularity scores statistically meaningful.
 * 
 * A correspondence appearing in 40/50 cognate sets is genuinely systematic;
 * one appearing in 2 is not.
 */
export interface BatchReconstructionResult {
  protoLanguage: string;
  individualResults: Map<string, ReconstructionResult>;  // gloss -> result
  accumulatedCorrespondences: { [columnKey: string]: { [phoneme: string]: number } };
  regularityScores: Map<string, number>;  // correspondence key -> regularity (0-1)
}

/**
 * Reconstructs multiple cognate sets in batch mode.
 * Accumulates correspondence statistics across all sets.
 */
export const reconstructBatch = async (
  cognateSets: { gloss: string; forms: LanguageInput[] }[],
  method: ReconstructionMethod = ReconstructionMethod.BAYESIAN_AI,
  params: ReconstructionParams = { mcmcIterations: 3000, gapPenalty: 10, unknownCharPenalty: 8 }
): Promise<BatchReconstructionResult> => {
  const individualResults = new Map<string, ReconstructionResult>();
  const accumulatedCorrespondences: { [columnKey: string]: { [phoneme: string]: number } } = {};

  // Process each cognate set
  for (const set of cognateSets) {
    const result = await reconstructProtoWord(set.forms, method, params);
    individualResults.set(set.gloss, result);

    // Accumulate correspondence statistics from this set's table
    if (result.correspondenceTable) {
      for (const [colKey, phonemes] of Object.entries(result.correspondenceTable)) {
        if (!accumulatedCorrespondences[colKey]) {
          accumulatedCorrespondences[colKey] = {};
        }
        for (const [phoneme, count] of Object.entries(phonemes)) {
          accumulatedCorrespondences[colKey][phoneme] = 
            (accumulatedCorrespondences[colKey][phoneme] || 0) + (count as number);
        }
      }
    }
  }

  // Compute regularity scores from accumulated correspondences
  // A correspondence is regular if it appears consistently across many cognate sets
  const regularityScores = new Map<string, number>();
  
  for (const [colKey, phonemes] of Object.entries(accumulatedCorrespondences)) {
    const totalOccurrences = Object.values(phonemes).reduce((sum, count) => sum + count, 0);
    const numDistinct = Object.keys(phonemes).length;
    
    // Regularity = 1.0 if only 1 phoneme appears (perfectly regular)
    // Regularity decreases as more distinct phonemes appear
    // Uses entropy-based regularity score
    let entropy = 0;
    for (const count of Object.values(phonemes)) {
      const p = count / totalOccurrences;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(Math.max(numDistinct, 2));
    const regularity = 1 - (entropy / maxEntropy);
    
    regularityScores.set(colKey, regularity);
  }

  // Determine proto-language name from the first set
  const protoLanguage = cognateSets[0]?.forms[0]?.name 
    ? `Proto-${cognateSets[0].forms[0].name}` 
    : 'Proto-Language';

  return {
    protoLanguage,
    individualResults,
    accumulatedCorrespondences,
    regularityScores
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Feature 5.3: PARADIGM RECONSTRUCTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Reconstructs inflectional/derivational paradigms across related languages.
 * Paradigm reconstruction operates in three stages:
 *
 *   Stage 1 — Stem extraction: Identify the shared stem across paradigm cells
 *   Stage 2 — Stem reconstruction: Use standard word reconstruction on stems
 *   Stage 3 — Affix reconstruction: Reconstruct each paradigm cell's affixes
 *   Stage 4 — Leveling detection: Identify analogical leveling patterns
 *
 * Input: Array of Paradigm objects from different languages, each representing
 *        the same lexeme (e.g., "to be" verb) with the same cell structure.
 *
 * Output: ReconstructedParadigm with:
 *   - protoStem: reconstructed common stem
 *   - protoCells: reconstructed forms for each paradigm cell
 *   - soundChanges: per-language change analysis
 *   - levelingFlags: detected analogical leveling patterns
 */

export interface ReconstructedParadigm {
  protoStem: string;
  protoStemConfidence: number;
  protoCells: {
    gloss: string;
    protoForm: string;
    confidence: number;
    soundChanges: SoundChangeNote[];
  }[];
  paradigmType: 'verbal' | 'nominal' | 'adjectival' | 'pronominal';
  levelingFlags: string[];
  irregularCellFlags: { gloss: string; language: string; reason: string }[];
}

/**
 * Extract the shared stem from a paradigm cell form.
 * Uses longest common substring across all cells in a paradigm.
 */
const extractParadigmStem = (forms: string[]): string => {
  if (forms.length === 0) return '';
  if (forms.length === 1) return forms[0];

  // Find longest common substring across all forms
  const findLCS = (a: string, b: string): string => {
    let maxLen = 0;
    let endIndex = 0;
    const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) {
            maxLen = dp[i][j];
            endIndex = i;
          }
        }
      }
    }
    return a.substring(endIndex - maxLen, endIndex);
  };

  let common = forms[0];
  for (let i = 1; i < forms.length; i++) {
    common = findLCS(common, forms[i]);
    if (common.length === 0) break;
  }

  return common || forms[0]; // Fallback to first form if no common substring
};

/**
 * Compute similarity between two strings (0-1 scale)
 */
const stringSimilarity = (a: string, b: string): number => {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;

  // Simple edit distance
  const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return 1 - (dp[a.length][b.length] / maxLen);
};

/**
 * Detect analogical leveling within a single paradigm.
 * Returns true if all non-irregular forms appear to be identical due to leveling.
 */
const detectParadigmLeveling = (
  paradigm: Paradigm,
  protoCellForms: Map<string, string>
): { isLeveled: boolean; flag: string | null } => {
  const regularForms = paradigm.cells.filter(c => !c.isIrregular).map(c => c.form);
  if (regularForms.length < 2) return { isLeveled: false, flag: null };

  // Check if all regular forms are identical (suspicious)
  const uniqueForms = new Set(regularForms);
  if (uniqueForms.size === 1) {
    // All regular forms are the same - possible leveling
    const form = regularForms[0];
    const glosses = paradigm.cells.filter(c => !c.isIrregular).map(c => c.gloss);

    // Check if proto-forms differ (confirming leveling)
    const protoForms = glosses
      .map(g => protoCellForms.get(g))
      .filter((f): f is string => f !== undefined);
    const uniqueProtos = new Set(protoForms);

    if (uniqueProtos.size > 1) {
      return {
        isLeveled: true,
        flag: `${paradigm.languageName}: possible paradigm leveling — '${form}' used for all cells (${glosses.join(', ')}), proto-forms differ (${Array.from(uniqueProtos).join(', ')})`
      };
    }
  }

  return { isLeveled: false, flag: null };
};

/**
 * Reconstruct a proto-paradigm from descendant paradigms.
 */
export const reconstructParadigm = async (
  paradigms: Paradigm[],
  method: ReconstructionMethod = ReconstructionMethod.BAYESIAN_AI,
  params: ReconstructionParams = { mcmcIterations: 3000, gapPenalty: 10, unknownCharPenalty: 8 }
): Promise<ReconstructedParadigm | null> => {
  if (paradigms.length === 0) return null;
  if (paradigms.length === 1) {
    // Single language - just extract stem and return as-is
    const single = paradigms[0];
    const stem = extractParadigmStem(single.cells.map(c => c.form));
    return {
      protoStem: stem,
      protoStemConfidence: 0.5,
      protoCells: single.cells.map(c => ({
        gloss: c.gloss,
        protoForm: c.form,
        confidence: 0.5,
        soundChanges: []
      })),
      paradigmType: single.paradigmType,
      levelingFlags: [],
      irregularCellFlags: []
    };
  }

  // Collect all unique glosses across paradigms
  const allGlosses = new Set<string>();
  paradigms.forEach(p => p.cells.forEach(c => allGlosses.add(c.gloss)));
  const glossList = Array.from(allGlosses).sort();

  // Stage 1: Extract stems from each paradigm
  const languageStems: { language: string; stem: string; forms: Map<string, string> }[] = [];

  for (const paradigm of paradigms) {
    const forms = new Map<string, string>();
    paradigm.cells.forEach(c => forms.set(c.gloss, c.form));

    const cellForms = paradigm.cells.map(c => c.form);
    const stem = extractParadigmStem(cellForms);

    languageStems.push({
      language: paradigm.languageName,
      stem,
      forms
    });
  }

  // Stage 2: Reconstruct the proto-stem
  const stemInputs: LanguageInput[] = languageStems.map((ls, idx) => ({
    id: `stem-${idx}`,
    name: ls.language,
    word: ls.stem
  }));

  const stemResult = await reconstructProtoWord(stemInputs, method, params);
  const protoStem = stemResult.protoForm.replace(/^\*/, ''); // Remove asterisk

  // Stage 3: Reconstruct each paradigm cell
  const protoCells: ReconstructedParadigm['protoCells'] = [];
  const levelingFlags: string[] = [];
  const irregularCellFlags: ReconstructedParadigm['irregularCellFlags'] = [];

  for (const gloss of glossList) {
    // Collect this cell's forms across all languages
    const cellInputs: LanguageInput[] = [];

    for (let i = 0; i < paradigms.length; i++) {
      const paradigm = paradigms[i];
      const cell = paradigm.cells.find(c => c.gloss === gloss);

      if (cell) {
        cellInputs.push({
          id: `${paradigm.languageId}-${gloss}`,
          name: paradigm.languageName,
          word: cell.form
        });

        // Flag irregular cells
        if (cell.isIrregular) {
          irregularCellFlags.push({
            gloss,
            language: paradigm.languageName,
            reason: 'Marked as irregular in source paradigm'
          });
        }
      }
    }

    if (cellInputs.length === 0) continue;

    // Reconstruct this cell's proto-form
    const cellResult = await reconstructProtoWord(cellInputs, method, params);

    protoCells.push({
      gloss,
      protoForm: cellResult.protoForm,
      confidence: cellResult.confidence,
      soundChanges: cellResult.soundChanges || []
    });
  }

  // Stage 4: Detect analogical leveling
  const protoCellForms = new Map(protoCells.map(c => [c.gloss, c.protoForm]));

  for (const paradigm of paradigms) {
    const leveling = detectParadigmLeveling(paradigm, protoCellForms);
    if (leveling.flag) {
      levelingFlags.push(leveling.flag);
    }
  }

  // Cross-paradigm leveling: check if different languages show the same pattern
  const protoFormSet = new Set(protoCells.map(c => c.protoForm));
  if (protoFormSet.size === 1 && protoCells.length > 1) {
    // All proto-forms are identical - possible proto-paradigm leveling
    levelingFlags.push(
      `Proto-paradigm: All cells reconstruct to identical form '${Array.from(protoFormSet)[0]}' — may indicate ancestral paradigm leveling or root-only reconstruction`
    );
  }

  return {
    protoStem,
    protoStemConfidence: stemResult.confidence,
    protoCells,
    paradigmType: paradigms[0].paradigmType,
    levelingFlags,
    irregularCellFlags
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Feature 5.4: ALLOMORPH RECONSTRUCTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Reconstructs proto-allomorphs (stem alternations) from descendant forms.
 * Allomorphy is common in inflectional morphology:
 *   - Ablaut (PIE *sing/sang/sung, *pod/ped)
 *   - Consonant gradation (Finnish k ~ 0 alternation)
 *   - Suppletion (go/went)
 *   - Stem selection (Germanic strong verbs)
 *
 * This module identifies and reconstructs these patterns by:
 *   1. Detecting allomorph sets within each language
 *   2. Aligning allomorphs across languages
 *   3. Reconstructing proto-allomorphs with conditioning environments
 *   4. Validating against known typological patterns
 */

export interface AllomorphSet {
  gloss: string;
  allomorphs: {
    form: string;
    environment: string;  // Conditioning environment (e.g., "_i", "_#")
    frequency: number;    // How often this allomorph appears
  }[];
}

export interface ReconstructedAllomorph {
  protoForm: string;
  conditioning: string;        // Phonological conditioning
  confidence: number;
  typologicalCategory: string; // Ablaut, gradation, suppletion, etc.
  descendantForms: { language: string; form: string; environment: string }[];
}

export interface AllomorphReconstructionResult {
  protoLexeme: string;
  primaryAllomorph: string;
  allomorphs: ReconstructedAllomorph[];
  suppletionDetected: boolean;
  ablautPattern?: {
    vowelAlternation: string;  // e.g., "e~o~∅"
    positions: ('zero' | 'full' | 'lengthened')[];
  };
}

/**
 * Detect allomorphic alternations within a single language's paradigm.
 * Returns a set of allomorphs for each grammatical context.
 */
const detectAllomorphsInParadigm = (paradigm: Paradigm): AllomorphSet => {
  const cells = paradigm.cells.filter(c => !c.isIrregular);
  if (cells.length < 2) {
    return {
      gloss: paradigm.lexeme,
      allomorphs: cells.map(c => ({
        form: c.form,
        environment: c.gloss,
        frequency: 1
      }))
    };
  }

  // Extract stems from each cell (remove affixes)
  const stems = cells.map(c => ({
    gloss: c.gloss,
    stem: extractParadigmStem(cells.map(x => x.form)),
    fullForm: c.form
  }));

  // Group cells by stem similarity
  const stemGroups: Map<string, { glosses: string[]; forms: string[] }> = new Map();

  for (const cell of cells) {
    // Try to extract the stem by comparing with other forms
    let matched = false;

    for (const [stemKey, group] of stemGroups) {
      // Check if this form shares significant substring with group
      const lcs = findLongestCommonSubstring(cell.form, group.forms[0]);
      if (lcs.length >= 2) {  // At least 2 characters in common
        group.glosses.push(cell.gloss);
        group.forms.push(cell.form);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Create new stem group
      stemGroups.set(cell.form, {
        glosses: [cell.gloss],
        forms: [cell.form]
      });
    }
  }

  // Build allomorph set from stem groups
  const allomorphs: AllomorphSet['allomorphs'] = [];

  stemGroups.forEach((group, stem) => {
    const environments = group.glosses.join('|');
    allomorphs.push({
      form: stem,
      environment: environments,
      frequency: group.forms.length
    });
  });

  return {
    gloss: paradigm.lexeme,
    allomorphs
  };
};

/**
 * Find longest common substring between two strings
 */
const findLongestCommonSubstring = (a: string, b: string): string => {
  let maxLen = 0;
  let endIndex = 0;
  const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIndex = i;
        }
      }
    }
  }

  return a.substring(endIndex - maxLen, endIndex);
};

/**
 * Classify the type of allomorphy based on phonological patterns
 */
const classifyAllomorphyType = (
  allomorphs: ReconstructedAllomorph[]
): { category: string; pattern?: string } => {
  if (allomorphs.length < 2) return { category: 'No allomorphy' };

  // Check for suppletion (completely unrelated forms)
  const similarities: number[] = [];
  for (let i = 0; i < allomorphs.length; i++) {
    for (let j = i + 1; j < allomorphs.length; j++) {
      const sim = phoneticSimilarity(allomorphs[i].protoForm, allomorphs[j].protoForm);
      similarities.push(sim);
    }
  }
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  if (avgSimilarity < 0.3) {
    return { category: 'Suppletion' };
  }

  // Check for ablaut (vowel alternations)
  const vowelPatterns = allomorphs.map(a => extractVowelPattern(a.protoForm));
  const uniqueVowels = new Set(vowelPatterns);

  if (uniqueVowels.size > 1 && allomorphs.every(a => a.protoForm.length > 2)) {
    const pattern = Array.from(uniqueVowels).join('~');
    return { category: 'Ablaut', pattern };
  }

  // Check for consonant gradation (lenition/fortition)
  const hasLenition = allomorphs.some(a =>
    a.conditioning.includes('V_V') &&
    allomorphs.some(other =>
      other.protoForm.length > a.protoForm.length
    )
  );

  if (hasLenition) {
    return { category: 'Consonant gradation' };
  }

  // Check for stress-based alternations
  const hasStressPattern = allomorphs.some(a =>
    a.conditioning.includes('stress')
  );

  if (hasStressPattern) {
    return { category: 'Stress-based' };
  }

  return { category: 'Morphological selection' };
};

/**
 * Compute phonetic similarity between two forms
 */
const phoneticSimilarity = (a: string, b: string): number => {
  const tokensA = tokenizeIPA(a);
  const tokensB = tokenizeIPA(b);

  const { alignedA, alignedB } = needlemanWunsch(tokensA, tokensB, 2, 3);

  let matches = 0;
  let total = 0;

  for (let i = 0; i < alignedA.length; i++) {
    if (alignedA[i] === GAP_CHAR || alignedB[i] === GAP_CHAR) continue;
    total++;
    if (alignedA[i] === alignedB[i]) {
      matches++;
    } else {
      const dist = getPhoneticDistance(alignedA[i], alignedB[i], 2, 3);
      if (dist < 2) matches += 0.5;  // Partial credit for similar phonemes
    }
  }

  return total > 0 ? matches / total : 0;
};

/**
 * Extract vowel pattern from a form
 */
const extractVowelPattern = (form: string): string => {
  const tokens = tokenizeIPA(form);
  const vowels = tokens.filter(t => {
    const f = getEffectiveFeatures(t);
    return f && f.syllabic;
  });
  return vowels.join('') || '∅';
};

/**
 * Reconstruct proto-allomorphs from descendant paradigm sets
 */
export const reconstructAllomorphs = async (
  paradigms: Paradigm[],
  method: ReconstructionMethod = ReconstructionMethod.BAYESIAN_AI,
  params: ReconstructionParams = { mcmcIterations: 3000, gapPenalty: 10, unknownCharPenalty: 8 }
): Promise<AllomorphReconstructionResult | null> => {
  if (paradigms.length === 0) return null;

  const lexeme = paradigms[0].lexeme;

  // Stage 1: Detect allomorphs in each language
  const languageAllomorphs = paradigms.map(p => ({
    language: p.languageName,
    allomorphSet: detectAllomorphsInParadigm(p)
  }));

  // Stage 2: Collect unique allomorph forms across languages
  const allomorphForms = new Map<string, { language: string; environment: string }[]>();

  for (const { language, allomorphSet } of languageAllomorphs) {
    for (const allomorph of allomorphSet.allomorphs) {
      const key = allomorph.form;
      if (!allomorphForms.has(key)) {
        allomorphForms.set(key, []);
      }
      allomorphForms.get(key)!.push({
        language,
        environment: allomorph.environment
      });
    }
  }

  // Stage 3: Reconstruct each unique allomorph
  const reconstructedAllomorphs: ReconstructedAllomorph[] = [];

  for (const [form, descendants] of allomorphForms) {
    const inputs: LanguageInput[] = descendants.map((d, idx) => ({
      id: `allomorph-${idx}`,
      name: d.language,
      word: form
    }));

    const result = await reconstructProtoWord(inputs, method, params);

    reconstructedAllomorphs.push({
      protoForm: result.protoForm,
      conditioning: descendants.map(d => d.environment).join(' | '),
      confidence: result.confidence,
      typologicalCategory: 'Unknown',
      descendantForms: descendants
    });
  }

  // Stage 4: Classify allomorphy type
  const classification = classifyAllomorphyType(reconstructedAllomorphs);

  // Update categories
  reconstructedAllomorphs.forEach(a => {
    a.typologicalCategory = classification.category;
  });

  // Stage 5: Determine primary allomorph (most frequent/default)
  const primaryAllomorph = reconstructedAllomorphs
    .sort((a, b) => b.descendantForms.length - a.descendantForms.length)[0]?.protoForm || '';

  // Stage 6: Build ablaut pattern if applicable
  let ablautPattern: AllomorphReconstructionResult['ablautPattern'] | undefined;
  if (classification.category === 'Ablaut' && classification.pattern) {
    const vowelPositions = reconstructedAllomorphs.map(a => {
      const vowels = extractVowelPattern(a.protoForm);
      if (vowels === '∅') return 'zero';
      if (vowels.length > 1) return 'lengthened';
      return 'full';
    });

    ablautPattern = {
      vowelAlternation: classification.pattern,
      positions: vowelPositions as ('zero' | 'full' | 'lengthened')[]
    };
  }

  // Stage 7: Detect suppletion
  const isSuppletion = classification.category === 'Suppletion';

  return {
    protoLexeme: lexeme,
    primaryAllomorph,
    allomorphs: reconstructedAllomorphs,
    suppletionDetected: isSuppletion,
    ablautPattern
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Feature 2.1 Enhanced: BATCH MODE WITH ALLOMORPH AWARENESS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enhanced batch reconstruction that:
 *   1. Accumulates correspondence statistics across cognate sets
 *   2. Detects and tracks allomorphic variation across the lexicon
 *   3. Builds proto-allomorph reconstructions for sets showing stem alternation
 *   4. Provides cross-linguistic regularity scores for allomorph patterns
 */

export interface EnhancedBatchResult extends BatchReconstructionResult {
  allomorphSets: Map<string, AllomorphReconstructionResult>;  // lexeme -> allomorphs
  allomorphRegularityScores: Map<string, number>;  // pattern -> regularity
  paradigmReconstructions: Map<string, ReconstructedParadigm>;  // lexeme -> paradigm
}

/**
 * Enhanced batch reconstruction with allomorph and paradigm support.
 * 
 * @param cognateSets Array of cognate sets (gloss + forms)
 * @param paradigms Optional array of paradigms for allomorph detection
 * @param method Reconstruction method
 * @param params Reconstruction parameters
 * @returns Enhanced batch results with allomorph and paradigm data
 */
export const reconstructBatchEnhanced = async (
  cognateSets: { gloss: string; forms: LanguageInput[] }[],
  paradigms?: Paradigm[],
  method: ReconstructionMethod = ReconstructionMethod.BAYESIAN_AI,
  params: ReconstructionParams = { mcmcIterations: 3000, gapPenalty: 10, unknownCharPenalty: 8 }
): Promise<EnhancedBatchResult> => {
  // Run standard batch reconstruction
  const baseResult = await reconstructBatch(cognateSets, method, params);

  // Initialize enhanced result containers
  const allomorphSets = new Map<string, AllomorphReconstructionResult>();
  const allomorphRegularityScores = new Map<string, number>();
  const paradigmReconstructions = new Map<string, ReconstructedParadigm>();

  // Process paradigms if provided
  if (paradigms && paradigms.length > 0) {
    // Group paradigms by lexeme
    const paradigmsByLexeme = new Map<string, Paradigm[]>();
    for (const p of paradigms) {
      if (!paradigmsByLexeme.has(p.lexeme)) {
        paradigmsByLexeme.set(p.lexeme, []);
      }
      paradigmsByLexeme.get(p.lexeme)!.push(p);
    }

    // Reconstruct each lexeme's paradigm
    for (const [lexeme, lexemeParadigms] of paradigmsByLexeme) {
      const paradigmResult = await reconstructParadigm(lexemeParadigms, method, params);
      if (paradigmResult) {
        paradigmReconstructions.set(lexeme, paradigmResult);
      }

      // Reconstruct allomorphs for this lexeme
      const allomorphResult = await reconstructAllomorphs(lexemeParadigms, method, params);
      if (allomorphResult) {
        allomorphSets.set(lexeme, allomorphResult);

        // Calculate regularity score for this allomorph pattern
        const regularity = calculateAllomorphRegularity(allomorphResult, lexemeParadigms);
        allomorphRegularityScores.set(lexeme, regularity);
      }
    }
  }

  // Compute allomorph pattern regularity across all sets
  const allomorphPatterns = new Map<string, { count: number; languages: Set<string> }>();
  for (const [, result] of allomorphSets) {
    const pattern = result.ablautPattern?.vowelAlternation || result.allomorphs[0]?.typologicalCategory;
    if (pattern) {
      if (!allomorphPatterns.has(pattern)) {
        allomorphPatterns.set(pattern, { count: 0, languages: new Set() });
      }
      const entry = allomorphPatterns.get(pattern)!;
      entry.count++;
      result.allomorphs.forEach(a => {
        a.descendantForms.forEach(d => entry.languages.add(d.language));
      });
    }
  }

  // Regularity = number of languages showing pattern / total languages with paradigms
  const allLanguages = new Set(paradigms?.map(p => p.languageName) || []);
  for (const [pattern, data] of allomorphPatterns) {
    const regularity = data.languages.size / Math.max(1, allLanguages.size);
    allomorphRegularityScores.set(`pattern:${pattern}`, regularity);
  }

  return {
    ...baseResult,
    allomorphSets,
    allomorphRegularityScores,
    paradigmReconstructions
  };
};

/**
 * Calculate regularity score for an allomorph set based on cross-linguistic consistency
 */
const calculateAllomorphRegularity = (
  allomorphResult: AllomorphReconstructionResult,
  paradigms: Paradigm[]
): number => {
  const totalLanguages = paradigms.length;
  if (totalLanguages === 0) return 0;

  // Count how many languages preserve the expected allomorph count
  let consistentLanguages = 0;
  const expectedAllomorphCount = allomorphResult.allomorphs.length;

  for (const paradigm of paradigms) {
    const detected = detectAllomorphsInParadigm(paradigm);
    // Allow some variation (±1 allomorph) due to leveling or innovation
    if (Math.abs(detected.allomorphs.length - expectedAllomorphCount) <= 1) {
      consistentLanguages++;
    }
  }

  return consistentLanguages / totalLanguages;
};

// ═══════════════════════════════════════════════════════════════════════════════
// §5c — PER-SEGMENT CONFIDENCE TIERS & TONE CONTOUR NATURALNESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute per-segment confidence tiers.
 * Breaks down the scalar confidence into segment-level information:
 *   - secure: probability > 0.85
 *   - probable: probability 0.65-0.85
 *   - uncertain: probability 0.45-0.65
 *   - highly_uncertain: probability < 0.45
 * 
 * Each segment includes alternatives with probabilities and supporting/conflicting
 * language information.
 */
const computePerSegmentConfidence = (
  protoTokens: string[],
  distributionArr: { [phoneme: string]: number }[],
  alignmentMatrix: string[][],
  langNames: string[],
  regularityScores: number[]
): SegmentConfidence[] => {
  if (!protoTokens || protoTokens.length === 0) return [];

  return protoTokens.map((segment, idx) => {
    const dist = distributionArr[idx] || {};
    const regularity = regularityScores[idx] || 0.5;
    
    // Get probability of the selected segment
    const segmentProb = dist[segment] || 0;
    
    // Get alternatives (other phonemes in distribution)
    const alternatives = Object.entries(dist)
      .filter(([phoneme]) => phoneme !== segment && phoneme !== GAP_CHAR)
      .map(([phoneme, prob]) => ({ phoneme, probability: prob as number }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3); // Top 3 alternatives
    
    // Determine confidence tier based on probability and regularity
    const combinedScore = segmentProb * 0.7 + regularity * 0.3;
    let tier: SegmentConfidence['tier'];
    if (combinedScore > 0.85) tier = 'secure';
    else if (combinedScore > 0.65) tier = 'probable';
    else if (combinedScore > 0.45) tier = 'uncertain';
    else tier = 'highly_uncertain';
    
    // Determine supporting and conflicting languages
    const supporting: string[] = [];
    const conflicting: string[] = [];
    
    for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
      const reflex = alignmentMatrix[langIdx]?.[idx];
      if (!reflex || reflex === GAP_CHAR) continue;
      
      // Check if reflex matches proto or is a natural change
      const dist = getPhoneticDistance(segment, reflex, 10, 8);
      const bonus = getNaturalChangeBonus(segment, reflex, 
        idx > 0 ? protoTokens[idx - 1] : null,
        idx < protoTokens.length - 1 ? protoTokens[idx + 1] : null
      );
      
      if (segment === reflex || dist - bonus < 0.5) {
        supporting.push(langNames[langIdx]);
      } else {
        conflicting.push(langNames[langIdx]);
      }
    }
    
    return {
      segment,
      tier,
      probability: segmentProb,
      alternatives,
      supportingLanguages: supporting,
      conflictingLanguages: conflicting
    };
  });
};

/**
 * TONE CONTOUR NATURALNESS
 * 
 * Evaluates the naturalness of tone contours based on:
 * 1. Contour complexity (level < simple contour < complex contour)
 * 2. Register stability (downstep/upstep patterns)
 * 3. Cross-linguistic tone change patterns
 * 
 * Returns a naturalness score (0-1) and penalty for unnatural patterns.
 */
const evaluateToneNaturalness = (
  protoTone: ToneContour,
  reflexTone: ToneContour,
  context: { left?: ToneContour | null; right?: ToneContour | null }
): { score: number; penalty: number; category: string } => {
  let score = 0.5;
  let penalty = 0;
  let category = 'Neutral';
  
  // 1. Contour complexity analysis
  const protoComplexity = protoTone.levels.length;
  const reflexComplexity = reflexTone.levels.length;
  
  // Level tones (1 level) are most stable
  // Simple contours (2 levels: rising/falling) are common
  // Complex contours (3+ levels: dipping/peaking) are rarer
  const complexityOrder = [1, 2, 3, 4]; // increasing complexity
  const protoComplexityIdx = complexityOrder.indexOf(Math.min(protoComplexity, 4));
  const reflexComplexityIdx = complexityOrder.indexOf(Math.min(reflexComplexity, 4));
  
  // Simplification is natural (complex → simple)
  if (reflexComplexityIdx < protoComplexityIdx) {
    score += 0.2;
    category = 'Simplification';
  }
  // Complication is less natural
  else if (reflexComplexityIdx > protoComplexityIdx) {
    score -= 0.15;
    penalty += 0.3;
    category = 'Complication';
  }
  
  // 2. Register analysis
  if (protoTone.register !== reflexTone.register) {
    // Downstep is natural in many tone languages
    if (reflexTone.register === 'downstepped') {
      score += 0.1;
      category = category === 'Neutral' ? 'Downstep' : category;
    }
    // Upstep is rarer
    else if (reflexTone.register === 'upstepped') {
      score -= 0.1;
      penalty += 0.2;
      category = 'Upstep';
    }
  }
  
  // 3. Contour direction naturalness
  if (protoComplexity === 1 && reflexComplexity === 2) {
    // Level → Contour is common (context-conditioned)
    score += 0.15;
    category = 'Contour formation';
  }
  
  if (protoComplexity === 2 && reflexComplexity === 2) {
    // Rising → Falling or vice versa (tone flip)
    const protoDir = protoTone.levels[protoTone.levels.length - 1] - protoTone.levels[0];
    const reflexDir = reflexTone.levels[reflexTone.levels.length - 1] - reflexTone.levels[0];
    
    if (protoDir > 0 && reflexDir < 0) {
      // Rising → Falling (contextual sandhi)
      score += 0.1;
      category = 'Direction flip';
    }
    else if (protoDir < 0 && reflexDir > 0) {
      // Falling → Rising (less common)
      score -= 0.05;
      penalty += 0.15;
    }
  }
  
  // 4. Tone sandhi patterns
  if (context.left) {
    // High tone + low tone → dissimilation is natural
    const leftHigh = Math.max(...context.left.levels) >= 4;
    const protoHigh = Math.max(...protoTone.levels) >= 4;
    
    if (leftHigh && protoHigh && reflexTone.levels[0] < protoTone.levels[0]) {
      score += 0.15; // Dissimilation (OCP effect)
      category = 'Dissimilation';
    }
  }
  
  return {
    score: Math.max(0, Math.min(1, score)),
    penalty,
    category
  };
};

/**
 * Compute tone contour complexity metric for naturalness evaluation.
 * Used in inventory symmetry evaluation for tone languages.
 */
const computeToneContourComplexity = (tones: ToneContour[]): number => {
  if (!tones || tones.length === 0) return 0;
  
  let complexity = 0;
  
  for (const tone of tones) {
    // Base complexity from number of level points
    complexity += tone.levels.length * 0.3;
    
    // Additional complexity for register shifts
    if (tone.register === 'downstepped' || tone.register === 'upstepped') {
      complexity += 0.5;
    }
    
    // Rare contours (4+ levels) add significant complexity
    if (tone.levels.length >= 4) {
      complexity += 0.8;
    }
  }
  
  return complexity / tones.length;
};