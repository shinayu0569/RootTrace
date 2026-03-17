
import { LanguageInput, ReconstructionResult, TreeNode, SoundChangeNote, ReconstructionMethod, DistinctiveFeatures, ReconstructionParams, InferredShift, GeneralizedSoundLaw } from '../types';
import { tokenizeIPA, needlemanWunsch, GAP_CHAR, getPhoneticDistance, FEATURE_MAP, GAP_PENALTY, getEffectiveFeatures, evaluateNaturalness, getSonority } from './phonetics';
import { identifySoundChange, NATURAL_SOUND_CHANGES, ChangeContext, DistinctiveFeaturesWithSymbol } from './soundChangeDb';
import { generalizeSoundChanges } from './generalizer';
import { applyShifts } from './soundShifter';
import diachronicaFreqs from '../diachronica_freqs.json';
import featureFreqs from '../feature_freqs.json';

/**
 * PILLAR 1: Phonotactic & Syllabic Constraints
 * Evaluates the naturalness of a reconstructed sequence.
 * Penalizes sonority violations and excessive clustering.
 */
const evaluateSequenceNaturalness = (sequence: string[]): number => {
  const tokens = sequence.filter(t => t !== GAP_CHAR && t !== '.' && t !== ',');
  if (tokens.length === 0) return 0;

  let penalty = 0;
  const sonorities = tokens.map(getSonority);

  for (let i = 0; i < sonorities.length; i++) {
    const current = sonorities[i];
    const prev = i > 0 ? sonorities[i - 1] : null;
    const next = i < sonorities.length - 1 ? sonorities[i + 1] : null;

    // 1. Sonority Sequencing Principle (SSP)
    // Sonority should generally increase toward the nucleus (vowel) and decrease toward margins.
    if (i === 1 && prev !== null && prev < 10 && current < 10) {
      if (prev > current) {
        // Decreasing sonority at start (e.g., *rt-) is highly unnatural.
        penalty += 5.0;
      }
    }

    // 2. Excessive Clustering
    if (prev !== null && prev < 10 && current < 10) {
      // Two consonants in a row
      penalty += 0.5; 
      if (i > 1 && sonorities[i-2] < 10) {
        // Three consonants in a row!
        penalty += 2.0;
      }
    }
  }

  return penalty;
};

/**
 * PILLAR 2: Inventory Systemics (The "Symmetry" Prior)
 * Evaluates the feature economy and symmetry of the phonemes used in the sequence.
 * Penalizes sequences that use many features for few phonemes.
 */
const evaluateInventorySymmetry = (sequence: string[]): number => {
  const uniqueTokens = Array.from(new Set(sequence.filter(t => t !== GAP_CHAR && t !== '.' && t !== ',')));
  if (uniqueTokens.length <= 1) return 0;

  let penalty = 0;
  
  // 1. Feature Economy
  // Count the number of unique features used across all phonemes in the sequence
  const usedFeatures = new Set<string>();
  let validTokens = 0;

  uniqueTokens.forEach(token => {
    const features = getEffectiveFeatures(token);
    if (features) {
      validTokens++;
      Object.entries(features).forEach(([key, value]) => {
        // Only count "marked" or active features (true or non-zero)
        if (value === true || (typeof value === 'number' && value !== 0)) {
          usedFeatures.add(`${key}:${value}`);
        }
      });
    }
  });

  if (validTokens > 0) {
    // Feature Economy Ratio: Features used / Phonemes
    // A highly symmetrical inventory reuses features (e.g., voicing across all places of articulation).
    // A lower ratio means better economy.
    const economyRatio = usedFeatures.size / validTokens;
    
    // Penalize high ratios (inefficient feature usage)
    if (economyRatio > 2.0) {
      penalty += (economyRatio - 2.0) * 1.5;
    }
  }

  // 2. Consonant/Vowel Balance
  // A word shouldn't be composed entirely of consonants or entirely of vowels (unless it's very short)
  let consonants = 0;
  let vowels = 0;
  
  sequence.forEach(token => {
    if (token === GAP_CHAR) return;
    const features = getEffectiveFeatures(token);
    if (features) {
      if (features.syllabic) vowels++;
      else if (features.consonantal) consonants++;
    }
  });

  if (sequence.length > 2) {
    if (vowels === 0) penalty += 3.0; // No vowels is very bad
    if (consonants === 0) penalty += 1.0; // No consonants is slightly bad
    
    // Extreme imbalance
    if (consonants > 0 && vowels > 0) {
      const ratio = consonants / vowels;
      if (ratio > 4.0) penalty += 1.0; // Too many consonants per vowel
    }
  }

  return penalty;
};

/**
 * PILLAR 3: Weighted Diachronic Transducers (Chain Shift Awareness)
 * Evaluates the implied sound changes for each descendant language.
 * Penalizes mergers and rewards chain shifts (push/drag shifts) that maintain phonemic contrast.
 */
const evaluateChainShifts = (sequence: string[], alignmentMatrix: string[][]): number => {
  let penalty = 0;

  // For each descendant language (row in the alignment matrix)
  for (let langIdx = 0; langIdx < alignmentMatrix.length; langIdx++) {
    const descendantWord = alignmentMatrix[langIdx];
    
    // Map of Proto-Phoneme -> Set of Descendant Reflexes
    const shifts = new Map<string, Set<string>>();
    
    // Map of Descendant Reflex -> Set of Proto-Phonemes that merged into it
    const mergers = new Map<string, Set<string>>();

    for (let col = 0; col < sequence.length; col++) {
      const proto = sequence[col];
      const reflex = descendantWord[col];
      
      if (proto === GAP_CHAR || reflex === GAP_CHAR) continue;

      // Record the shift
      if (!shifts.has(proto)) shifts.set(proto, new Set());
      shifts.get(proto)!.add(reflex);

      // Record the merger
      if (!mergers.has(reflex)) mergers.set(reflex, new Set());
      mergers.get(reflex)!.add(proto);
    }

    // Penalize Mergers (Multiple proto-phonemes becoming the same reflex)
    // While mergers happen, a reconstruction that posits too many mergers is often incorrect
    // (e.g., reconstructing *p, *t, *k all becoming 't' is highly suspicious).
    mergers.forEach((protoSet, reflex) => {
      if (protoSet.size > 1) {
        // Penalty scales with the number of merged phonemes
        penalty += (protoSet.size - 1) * 0.5;
      }
    });

    // Reward Chain Shifts (e.g., *a > e, *e > i)
    // If A > B, and B > C, this is a chain shift maintaining contrast.
    shifts.forEach((reflexSet, proto) => {
      reflexSet.forEach(reflex => {
        if (proto !== reflex && shifts.has(reflex)) {
          const chainedReflexes = shifts.get(reflex)!;
          // If the reflex also shifted to something else (that isn't back to the proto), it's a chain shift
          chainedReflexes.forEach(chainedReflex => {
            if (chainedReflex !== proto && chainedReflex !== reflex) {
              penalty -= 0.5; // Reward (negative penalty)
            }
          });
        }
      });
    });
  }

  return penalty;
};

const performMSA = (inputs: LanguageInput[], params: ReconstructionParams): string[][] => {
  if (inputs.length === 0) return [];
  const tokensList = inputs.map(i => tokenizeIPA(i.word));
  if (inputs.length === 1) return tokensList;

  let centerIdx = 0;
  let maxLen = 0;
  tokensList.forEach((t, i) => {
    if (t.length > maxLen) {
      maxLen = t.length;
      centerIdx = i;
    }
  });

  let alignmentGrid: string[][] = [tokensList[centerIdx]];
  const gridIndexToInputIndex = [centerIdx];

  tokensList.forEach((seq, idx) => {
    if (idx === centerIdx) return;
    const centerSeq = alignmentGrid[0];
    const { alignedA, alignedB } = needlemanWunsch(centerSeq, seq, params.gapPenalty, params.unknownCharPenalty);
    
    if (alignedA.length > centerSeq.length) {
      const newGrid: string[][] = [];
      let oldPtr = 0;
      for(let r=0; r<alignmentGrid.length; r++) newGrid[r] = [];

      for (let k = 0; k < alignedA.length; k++) {
        if (alignedA[k] === GAP_CHAR && (oldPtr >= centerSeq.length || centerSeq[oldPtr] !== GAP_CHAR)) {
          for(let r=0; r<alignmentGrid.length; r++) newGrid[r].push(GAP_CHAR);
        } else {
          for(let r=0; r<alignmentGrid.length; r++) newGrid[r].push(alignmentGrid[r][oldPtr]);
          oldPtr++;
        }
      }
      alignmentGrid = newGrid;
    }
    alignmentGrid.push(alignedB);
    gridIndexToInputIndex.push(idx);
  });

  const finalGrid: string[][] = Array(inputs.length).fill([]);
  gridIndexToInputIndex.forEach((origIdx, currentGridIdx) => {
    finalGrid[origIdx] = alignmentGrid[currentGridIdx];
  });

  return finalGrid;
};

/**
 * PILLAR 4: Joint Alignment and Reconstruction
 * Re-aligns all descendant words to a hypothesized proto-word.
 */
const performMSA_to_proto = (inputs: { word: string }[], protoTokens: string[], params: ReconstructionParams): string[][] => {
  if (inputs.length === 0) return [];
  const tokensList = inputs.map(i => tokenizeIPA(i.word));
  
  let alignmentGrid: string[][] = [protoTokens];
  const gridIndexToInputIndex = [-1]; // -1 for protoTokens

  tokensList.forEach((seq, idx) => {
    const centerSeq = alignmentGrid[0];
    const { alignedA, alignedB } = needlemanWunsch(centerSeq, seq, params.gapPenalty, params.unknownCharPenalty);
    
    if (alignedA.length > centerSeq.length) {
      const newGrid: string[][] = [];
      let oldPtr = 0;
      for(let r=0; r<alignmentGrid.length; r++) newGrid[r] = [];

      for (let k = 0; k < alignedA.length; k++) {
        if (alignedA[k] === GAP_CHAR && (oldPtr >= centerSeq.length || centerSeq[oldPtr] !== GAP_CHAR)) {
          for(let r=0; r<alignmentGrid.length; r++) newGrid[r].push(GAP_CHAR);
        } else {
          for(let r=0; r<alignmentGrid.length; r++) newGrid[r].push(alignmentGrid[r][oldPtr]);
          oldPtr++;
        }
      }
      alignmentGrid = newGrid;
    }
    alignmentGrid.push(alignedB);
    gridIndexToInputIndex.push(idx);
  });

  const finalGrid: string[][] = Array(inputs.length).fill([]);
  gridIndexToInputIndex.forEach((origIdx, currentGridIdx) => {
    if (origIdx !== -1) {
      finalGrid[origIdx] = alignmentGrid[currentGridIdx];
    }
  });

  return finalGrid;
};

// Naturalness Prior: Weights based on cross-linguistic phoneme frequency
const PHONETIC_PRIOR: Record<string, number> = {
  'p': 1.2, 't': 1.5, 'k': 1.4, 's': 1.2, 'm': 1.1, 'n': 1.3,
  'a': 1.5, 'i': 1.3, 'u': 1.2, 'e': 1.0, 'o': 1.0,
  'h': 0.8, 'ʔ': 0.9, 'j': 1.1, 'w': 1.0, 'l': 1.1, 'r': 1.2
};

/**
 * Heuristic to detect common "natural" sound changes given a context.
 * Returns a score bonus (reducing penalty) if the change p -> reflex is natural in this environment.
 */
const naturalChangeBonusCache: Record<string, number> = {};

const getNaturalChangeBonus = (p: string, reflex: string, left: string | null, right: string | null): number => {
  const cacheKey = `${p}|${reflex}|${left}|${right}`;
  if (naturalChangeBonusCache[cacheKey] !== undefined) return naturalChangeBonusCache[cacheKey];

  const fP = getEffectiveFeatures(p);
  const fR = getEffectiveFeatures(reflex);
  if (!fP || !fR) {
    naturalChangeBonusCache[cacheKey] = 0;
    return 0;
  }

  let bonus = 0;

  const ctx: ChangeContext = {
    left: left && left !== GAP_CHAR ? getEffectiveFeatures(left) : null,
    right: right && right !== GAP_CHAR ? getEffectiveFeatures(right) : null,
    leftChar: left === GAP_CHAR ? null : left,
    rightChar: right === GAP_CHAR ? null : right,
  };

  const fP_full: DistinctiveFeaturesWithSymbol = { ...fP, symbol: p };
  const fR_full: DistinctiveFeaturesWithSymbol = { ...fR, symbol: reflex };

  // 1. Check against our linguistic rules database
  const matchedRules = NATURAL_SOUND_CHANGES.filter(rule => rule.test(fP_full, fR_full, ctx));
  if (matchedRules.length > 0) {
    // Give bonus based on rule priority (priority is 1-10)
    bonus += matchedRules[0].priority * 0.4; 
  }

  // 2. Index Diachronica Frequency Bonus
  const shiftKey = `${p}>${reflex}`;
  const freqData = (diachronicaFreqs as any)[shiftKey];
  if (freqData && freqData.count) {
    bonus += 0.5 + Math.log10(freqData.count);
  } else {
    // 3. Naturalistic Fallback: Feature Shift Frequency
    // If the exact shift isn't found, calculate the feature delta and see if it's a common type of change.
    const delta: string[] = [];
    for (const k in fP) {
      if (fP[k as keyof typeof fP] !== fR[k as keyof typeof fR]) {
        delta.push(`${k}:${fR[k as keyof typeof fR]}`);
      }
    }
    if (delta.length > 0) {
      const deltaKey = delta.sort().join(',');
      const featureFreq = (featureFreqs as any)[deltaKey];
      if (featureFreq) {
        // Scale down the feature frequency bonus so it doesn't overpower exact matches
        bonus += 0.2 + (Math.log10(featureFreq) * 0.5);
      } else {
        // 4. Generative Naturalistic Fallback using evaluateNaturalness
        const naturalness = evaluateNaturalness(p, reflex, left, right);
        bonus += naturalness.score * 2.0; // Scale the naturalness score to be a meaningful bonus
      }
    }
  }

  // 5. Positional Weighting (Pillar 1)
  // Lenition (voicing, spirantization, deletion) is more natural in "weak" positions (intervocalic, coda).
  // Fortition is more natural in "strong" positions (word-initial).
  const isVowel = (char: string | null) => char && FEATURE_MAP[char]?.syllabic;
  const isIntervocalic = left && right && isVowel(left) && isVowel(right);
  const isInitial = left === null;
  const isFinal = right === null;

  // Lenition bonus in weak positions
  if (isIntervocalic || isFinal) {
    if ((!fP.voice && fR.voice) || (fP.consonantal && !fR.consonantal) || (reflex === GAP_CHAR)) {
      bonus += 1.5; // Increased bonus to make this a primary expectation
    }
  }
  
  // Stability bonus in strong positions
  if (isInitial && p === reflex) {
    bonus += 0.3;
  }

  // Nasal Assimilation (Environment-Specific Weight)
  if (fP.nasal && right && FEATURE_MAP[right] && !FEATURE_MAP[right].syllabic) {
    const rightFeatures = FEATURE_MAP[right];
    // If the reflex nasal matches the place of articulation of the following consonant
    if ((fR.labial && rightFeatures.labial) || 
        (fR.coronal && rightFeatures.coronal) || 
        (fR.dorsal && rightFeatures.dorsal)) {
      bonus += 1.5; // Primary expectation
    }
  }

  // Palatalization (Environment-Specific Weight)
  // Velar/Alveolar > Palato-alveolar/Palatal before front vowels or glides
  if ((fP.dorsal || fP.coronal) && fR.coronal && fR.delayedRelease) {
    if (right && FEATURE_MAP[right] && (FEATURE_MAP[right].high || FEATURE_MAP[right].coronal) && !FEATURE_MAP[right].consonantal) {
      bonus += 1.5; // Primary expectation
    }
  }

  // 6. Directional Probabilities (Pillar 3)
  // Penalize highly unnatural directions (e.g., *h > s, *ʔ > k, *r > d)
  // These are "fortitions" that are extremely rare outside of specific environments.
  if (p !== reflex && reflex !== GAP_CHAR) {
    // Fricative to Stop (without a nasal/stop preceding it)
    if (fP.continuant && !fR.continuant && !fR.nasal && !fP.lateral) {
      if (left && FEATURE_MAP[left] && !FEATURE_MAP[left].nasal && !FEATURE_MAP[left].consonantal) {
        bonus -= 1.5; // Heavy penalty for spontaneous fortition
      }
    }
    
    // Glottal to Oral
    if ((p === 'h' || p === 'ʔ') && (fR.labial || fR.coronal || fR.dorsal)) {
      bonus -= 2.0; // Almost impossible
    }

    // De-nasalization (unless before oral stop)
    if (fP.nasal && !fR.nasal) {
      if (!right || !FEATURE_MAP[right] || FEATURE_MAP[right].continuant || FEATURE_MAP[right].syllabic) {
        bonus -= 1.0; // Unlikely to lose nasality before a vowel or fricative
      }
    }

    // Depalatalization (Affricate > Velar Stop)
    if (fP.delayedRelease && fP.coronal && fR.dorsal && !fR.continuant) {
      bonus -= 1.5; // Very rare
    }
  }

  naturalChangeBonusCache[cacheKey] = bonus;
  return bonus;
};

const solveMedoid = (matrix: string[][], colIdx: number, params: ReconstructionParams, languageWeights?: number[]): { char: string, dist: { [key: string]: number } } => {
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  if (validReflexes.length === 0) return { char: '', dist: {} };
  
  const uniqueTokens = Array.from(new Set(validReflexes));
  // In Medoid, we only propose from the existing reflexes
  const universe = uniqueTokens;
  let bestChar = universe[0];
  let minCost = Infinity;
  const dist: Record<string, number> = {};

  universe.forEach(proto => {
    let cost = 0;
    matrix.forEach((row, langIdx) => {
      const weight = languageWeights ? languageWeights[langIdx] : 1.0;
      const reflex = row[colIdx];
      const left = colIdx > 0 ? row[colIdx - 1] : null;
      const right = colIdx < row.length - 1 ? row[colIdx + 1] : null;

      if (reflex === GAP_CHAR) {
        cost += params.gapPenalty * weight;
      } else {
        const d = getPhoneticDistance(proto, reflex, params.gapPenalty, params.unknownCharPenalty);
        const bonus = getNaturalChangeBonus(proto, reflex, left, right);
        cost += Math.max(0, d - bonus) * weight;
      }
    });
    if (cost < minCost) {
      minCost = cost;
      bestChar = proto;
    }
  });

  universe.forEach(p => {
    let cost = 0;
    matrix.forEach((row, langIdx) => {
      const weight = languageWeights ? languageWeights[langIdx] : 1.0;
      const reflex = row[colIdx];
      const left = colIdx > 0 ? row[colIdx - 1] : null;
      const right = colIdx < row.length - 1 ? row[colIdx + 1] : null;
      if (reflex === GAP_CHAR) cost += params.gapPenalty * weight;
      else {
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

const globalNeighborsMap: Record<string, string[]> = {};

const solveMCMC = (matrix: string[][], colIdx: number, params: ReconstructionParams, languageWeights?: number[]): { char: string, dist: { [key: string]: number } } => {
  const column = matrix.map(row => row[colIdx]);
  const validReflexes = column.filter(c => c !== GAP_CHAR);
  if (validReflexes.length === 0) return { char: '', dist: {} };

  const uniqueTokens = Array.from(new Set(matrix.flat().filter(c => c !== GAP_CHAR)));
  const universe = Array.from(new Set([...Object.keys(FEATURE_MAP), ...uniqueTokens]));
  const counts: Record<string, number> = {};
  
  const neighborsMap: Record<string, string[]> = {};
  universe.forEach(u => {
    if (!globalNeighborsMap[u]) {
      globalNeighborsMap[u] = Object.keys(FEATURE_MAP).filter(v => getPhoneticDistance(u, v, params.gapPenalty, params.unknownCharPenalty) <= 2.5 && v !== u);
    }
    // Also check against uniqueTokens that might not be in FEATURE_MAP
    const extraNeighbors = uniqueTokens.filter(v => !FEATURE_MAP[v] && getPhoneticDistance(u, v, params.gapPenalty, params.unknownCharPenalty) <= 2.5 && v !== u);
    neighborsMap[u] = [...globalNeighborsMap[u].filter(v => universe.includes(v)), ...extraNeighbors];
  });
  
  let current = validReflexes[Math.floor(Math.random() * validReflexes.length)];
  
  const logPosteriorMap: Record<string, number> = {};
  const getLogPosterior = (p: string) => {
    if (logPosteriorMap[p] !== undefined) return logPosteriorMap[p];
    let logP = Math.log(PHONETIC_PRIOR[p] || 0.4);
    for (let langIdx = 0; langIdx < matrix.length; langIdx++) {
      const weight = languageWeights ? languageWeights[langIdx] : 1.0;
      const reflex = matrix[langIdx][colIdx];
      const left = colIdx > 0 ? matrix[langIdx][colIdx - 1] : null;
      const right = colIdx < matrix[0].length - 1 ? matrix[langIdx][colIdx + 1] : null;

      if (reflex === GAP_CHAR) {
        logP -= 3.5 * weight; // Could scale with params.gapPenalty
      } else {
        const d = getPhoneticDistance(p, reflex, params.gapPenalty, params.unknownCharPenalty);
        const bonus = getNaturalChangeBonus(p, reflex, left, right);
        logP -= (Math.max(0, d - bonus) * 1.1) * weight;
      }
    }
    logPosteriorMap[p] = logP;
    return logP;
  };

  let currentLogP = getLogPosterior(current);

  for (let i = 0; i < params.mcmcIterations; i++) {
    let proposal = '';
    const currentNeighbors = neighborsMap[current];
    if (Math.random() < 0.75 && currentNeighbors.length > 0) {
      proposal = currentNeighbors[Math.floor(Math.random() * currentNeighbors.length)];
    } else {
      proposal = universe[Math.floor(Math.random() * universe.length)];
    }

    const proposalLogP = getLogPosterior(proposal);
    
    const qForward = (currentNeighbors.includes(proposal) ? 0.75 / currentNeighbors.length : 0) + 0.25 / universe.length;
    const proposalNeighbors = neighborsMap[proposal];
    const qBackward = (proposalNeighbors.includes(current) ? 0.75 / proposalNeighbors.length : 0) + 0.25 / universe.length;
    
    const acceptanceRatio = Math.exp(proposalLogP - currentLogP) * (qBackward / qForward);

    if (acceptanceRatio > 1 || Math.random() < acceptanceRatio) {
      current = proposal;
      currentLogP = proposalLogP;
    }
    if (i >= params.mcmcIterations * 0.2) counts[current] = (counts[current] || 0) + 1;
  }

  const dist: Record<string, number> = {};
  let best = '', maxProb = -1;
  const samples = params.mcmcIterations * 0.8;

  Object.entries(counts).forEach(([k, v]) => {
    const p = v / samples;
    dist[k] = p;
    if (p > maxProb) { maxProb = p; best = k; }
  });

  return { char: best, dist };
};

export const findPairwiseSoundChanges = (parentWord: string, childWord: string, childName: string, params: ReconstructionParams): SoundChangeNote[] => {
  const pTokens = tokenizeIPA(parentWord);
  const cTokens = tokenizeIPA(childWord);
  const { alignedA, alignedB } = needlemanWunsch(pTokens, cTokens, params.gapPenalty, params.unknownCharPenalty);
  
  const changes: SoundChangeNote[] = [];
  for (let i = 0; i < alignedA.length; i++) {
    const pChar = alignedA[i];
    const cChar = alignedB[i];

    // Check for Metathesis
    if (i < alignedA.length - 1 && 
        pChar !== GAP_CHAR && cChar !== GAP_CHAR &&
        alignedA[i + 1] !== GAP_CHAR && alignedB[i + 1] !== GAP_CHAR) {
      
      const distCross1 = getPhoneticDistance(pChar, alignedB[i+1], params.gapPenalty, params.unknownCharPenalty);
      const distCross2 = getPhoneticDistance(alignedA[i+1], cChar, params.gapPenalty, params.unknownCharPenalty);
      const distStraight1 = getPhoneticDistance(pChar, cChar, params.gapPenalty, params.unknownCharPenalty);
      const distStraight2 = getPhoneticDistance(alignedA[i+1], alignedB[i+1], params.gapPenalty, params.unknownCharPenalty);

      if ((distCross1 + distCross2 < distStraight1 + distStraight2 && distCross1 < 5 && distCross2 < 5) ||
          (pChar === alignedB[i + 1] && alignedA[i + 1] === cChar && pChar !== cChar)) {
        
        const left = i > 0 ? alignedB[i - 1] : null;
        const right = i < alignedB.length - 2 ? alignedB[i + 2] : null;

        changes.push({
          language: childName,
          from: `${pChar}${alignedA[i+1]}`,
          to: `${cChar}${alignedB[i+1]}`,
          environment: `${left || '#'} _ ${right || '#'}`,
          name: 'Metathesis',
          description: 'Metathesis'
        });
        i++; // Skip the next character since it's part of this metathesis
        continue;
      }
    }

    if (pChar !== cChar && pChar !== GAP_CHAR) {
      const left = i > 0 ? alignedB[i - 1] : null;
      const right = i < alignedB.length - 1 ? alignedB[i + 1] : null;
      const identified = identifySoundChange(pChar, cChar, left, right);
      changes.push({
        language: childName,
        from: pChar,
        to: cChar === GAP_CHAR ? '∅' : cChar,
        environment: `${left || '#'} _ ${right || '#'}`,
        name: identified.name,
        description: identified.description
      });
    } else if (pChar === GAP_CHAR && cChar !== GAP_CHAR) {
      // Epenthesis
      const left = i > 0 ? alignedB[i - 1] : null;
      const right = i < alignedB.length - 1 ? alignedB[i + 1] : null;
      const identified = identifySoundChange('∅', cChar, left, right);
      changes.push({
        language: childName,
        from: '∅',
        to: cChar,
        environment: `${left || '#'} _ ${right || '#'}`,
        name: identified.name,
        description: identified.description
      });
    }
  }
  return changes;
};

export const reconstructProtoWord = (inputs: LanguageInput[], method: ReconstructionMethod, params: ReconstructionParams): ReconstructionResult => {
  const topLevelForms = inputs.map(i => ({
    id: i.id,
    name: i.name,
    word: i.spelling || i.word
  }));

  let alignmentMatrix = performMSA(topLevelForms, params);
  if (alignmentMatrix.length === 0) return { protoForm: '???', protoTokens: [], confidence: 0, alignmentMatrix: [], soundChanges: [], inferredShifts: [], treeData: { name: '?' } };

  let reconstructedTokens: string[] = [];
  let candidatePaths: { chars: string[], prob: number }[] = [];
  let segments: string[] = [];
  let distributionArr: { [phoneme: string]: number }[] = [];
  let candidates: any[] = [];
  let languageWeights = new Array(topLevelForms.length).fill(1.0);

  // PILLAR 4: Joint Alignment and Reconstruction (EM Loop)
  const MAX_ITERATIONS = 3;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const numCols = alignmentMatrix[0].length;
    distributionArr = [];
    segments = [];

    for (let col = 0; col < numCols; col++) {
      const res = method === ReconstructionMethod.BAYESIAN_MCMC 
        ? solveMCMC(alignmentMatrix, col, params, languageWeights) 
        : solveMedoid(alignmentMatrix, col, params, languageWeights);
      segments.push(res.char);
      distributionArr.push(res.dist);
    }

    candidatePaths = [{ chars: [], prob: 1.0 }];
    distributionArr.forEach(dist => {
      const sorted = Object.entries(dist).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 2);
      const newPaths: { chars: string[], prob: number }[] = [];
      candidatePaths.forEach(path => {
        sorted.forEach(([char, p]) => {
          newPaths.push({ chars: [...path.chars, char], prob: path.prob * (p as number) });
        });
      });
      candidatePaths = newPaths.sort((a, b) => b.prob - a.prob).slice(0, 6);
    });

    candidates = candidatePaths.map(p => {
      const phonotacticPenalty = evaluateSequenceNaturalness(p.chars);
      const inventoryPenalty = evaluateInventorySymmetry(p.chars);
      const chainShiftPenalty = evaluateChainShifts(p.chars, alignmentMatrix);
      
      // Convert penalty to a probability multiplier (exponential decay)
      // We sum the penalties. Inventory penalty is weighted slightly less than phonotactics.
      const totalPenalty = phonotacticPenalty + (inventoryPenalty * 0.8) + (chainShiftPenalty * 0.5);
      const multiplier = Math.exp(-totalPenalty / 2);
      
      return { 
        form: '*' + p.chars.join(''), 
        probability: p.prob * multiplier,
        chars: p.chars
      };
    }).sort((a, b) => b.probability - a.probability);

    reconstructedTokens = candidates[0] ? candidates[0].chars : segments;

    // PILLAR 5: "Majority Rule" vs. "Archaic Retention"
    // Calculate distance of each language to the reconstructed proto-word
    const distances = topLevelForms.map((form, langIdx) => {
      const row = alignmentMatrix[langIdx];
      let dist = 0;
      for (let col = 0; col < numCols; col++) {
        const reflex = row[col];
        const proto = reconstructedTokens[col];
        if (!proto) continue;
        if (reflex === GAP_CHAR && proto === GAP_CHAR) continue;
        if (reflex === GAP_CHAR || proto === GAP_CHAR) {
          dist += params.gapPenalty;
        } else {
          dist += getPhoneticDistance(proto, reflex, params.gapPenalty, params.unknownCharPenalty);
        }
      }
      return dist;
    });

    // Update weights: more conservative (smaller distance) -> higher weight
    // We use a simple linear scaling: max weight = 2.0 (most conservative), min weight = 1.0 (most innovative)
    const maxDist = Math.max(...distances, 0.001); // avoid div by 0
    languageWeights = distances.map(d => 1.0 + ((maxDist - d) / maxDist));

    // If this is not the last iteration, re-align the descendant words to the newly reconstructed proto-word
    if (iteration < MAX_ITERATIONS - 1) {
      alignmentMatrix = performMSA_to_proto(topLevelForms, reconstructedTokens, params);
    }
  }

  const protoForm = candidates[0]?.form || "*" + segments.join('');
  
  // CRITICAL FIX: Use the actual token list for sound change analysis, not the character-split string.
  // Splitting the string breaks multi-character tokens (e.g., affricates, tie-bars) and causes index misalignment.
  const soundChanges: SoundChangeNote[] = [];
  const inferredShifts: InferredShift[] = []; // NEW: Hypothesized changes
  const transitions: { language: string, sourceWord: string, targetWord: string }[] = [];

  const skipMetathesis: Record<string, Set<number>> = {};
  topLevelForms.forEach(lang => {
    skipMetathesis[lang.name] = new Set();
    transitions.push({
      language: lang.name,
      sourceWord: protoForm,
      targetWord: lang.word
    });
  });

  reconstructedTokens.forEach((pChar, col) => {
    topLevelForms.forEach((lang, idx) => {
      if (skipMetathesis[lang.name].has(col)) return;

      if (!alignmentMatrix[idx]) return;
      const reflex = alignmentMatrix[idx][col];
      
      // Check for Metathesis
      if (col < reconstructedTokens.length - 1) {
        const nextPChar = reconstructedTokens[col + 1];
        const nextReflex = alignmentMatrix[idx][col + 1];
        if (pChar !== GAP_CHAR && reflex !== GAP_CHAR && nextPChar !== GAP_CHAR && nextReflex !== GAP_CHAR) {
          
          const distCross1 = getPhoneticDistance(pChar, nextReflex, params.gapPenalty, params.unknownCharPenalty);
          const distCross2 = getPhoneticDistance(nextPChar, reflex, params.gapPenalty, params.unknownCharPenalty);
          const distStraight1 = getPhoneticDistance(pChar, reflex, params.gapPenalty, params.unknownCharPenalty);
          const distStraight2 = getPhoneticDistance(nextPChar, nextReflex, params.gapPenalty, params.unknownCharPenalty);

          if ((distCross1 + distCross2 < distStraight1 + distStraight2 && distCross1 < 5 && distCross2 < 5) ||
              (pChar === nextReflex && nextPChar === reflex && pChar !== nextPChar)) {
            
            const left = col > 0 ? alignmentMatrix[idx][col - 1] : null;
            const right = col < alignmentMatrix[idx].length - 2 ? alignmentMatrix[idx][col + 2] : null;

            soundChanges.push({
              language: lang.name,
              from: `${pChar}${nextPChar}`,
              to: `${reflex}${nextReflex}`,
              environment: `${left || '#'} _ ${right || '#'}`,
              name: 'Metathesis',
              description: 'Metathesis'
            });
            
            inferredShifts.push({
              language: lang.name,
              from: `${pChar}${nextPChar}`,
              to: `${reflex}${nextReflex}`,
              environment: `${left || '#'} _ ${right || '#'}`,
              naturalnessScore: 0.8, // Metathesis is relatively common
              typologicalCategory: 'Other'
            });

            skipMetathesis[lang.name].add(col + 1);
            return;
          }
        }
      }

      const left = col > 0 ? alignmentMatrix[idx][col - 1] : null;
      const right = col < alignmentMatrix[idx].length - 1 ? alignmentMatrix[idx][col + 1] : null;

      if (reflex && reflex !== pChar) {
        if (pChar === GAP_CHAR) {
          const identified = identifySoundChange('∅', reflex, left, right);
          soundChanges.push({
            language: lang.name,
            from: '∅',
            to: reflex,
            environment: `${left || '#'} _ ${right || '#'}`,
            name: identified.name,
            description: identified.description
          });
        } else {
          const identified = identifySoundChange(pChar, reflex, left, right);
          soundChanges.push({
            language: lang.name,
            from: pChar,
            to: reflex === GAP_CHAR ? '∅' : reflex,
            environment: `${left || '#'} _ ${right || '#'}`,
            name: identified.name,
            description: identified.description
          });

          // Check if it's an unknown shift (not in DB) and add to inferredShifts
          if (identified.name === 'Phonetic Shift' || identified.name === 'Unknown Shift' || identified.name.includes('Assimilation')) {
             const naturalness = evaluateNaturalness(pChar, reflex, left, right);
             
             let category = naturalness.category;
             let score = naturalness.score;
             
             const shiftKey = `${pChar}>${reflex === GAP_CHAR ? '∅' : reflex}`;
             const freqData = (diachronicaFreqs as any)[shiftKey];
             
             if (freqData && freqData.count > 0) {
               category = `Attested (${freqData.count > 5 ? 'Common' : 'Rare'})`;
               score = Math.min(0.99, score + 0.2 + (Math.log10(freqData.count) * 0.1));
             }

             inferredShifts.push({
               language: lang.name,
               from: pChar,
               to: reflex === GAP_CHAR ? '∅' : reflex,
               environment: `${left || '#'} _ ${right || '#'}`,
               naturalnessScore: score,
               typologicalCategory: category
             });
          }
        }
      }
    });
  });

  // Process descendants and spelling
  const processDescendants = (node: LanguageInput, isTopLevel: boolean, parentForm: string) => {
    const oldestForm = node.spelling || node.word;
    const hasSpelling = !!node.spelling && node.spelling !== node.word;

    if (!isTopLevel) {
      const langName = hasSpelling ? `${node.name} (Spelling)` : node.name;
      const changes = findPairwiseSoundChanges(parentForm, oldestForm, langName, params);
      soundChanges.push(...changes);
      transitions.push({
        language: langName,
        sourceWord: parentForm,
        targetWord: oldestForm
      });
    }

    if (hasSpelling) {
      const changes = findPairwiseSoundChanges(node.spelling!, node.word, node.name, params);
      soundChanges.push(...changes);
      transitions.push({
        language: node.name,
        sourceWord: node.spelling!,
        targetWord: node.word
      });
    }

    if (node.descendants) {
      node.descendants.forEach(desc => processDescendants(desc, false, node.word));
    }
  };

  inputs.forEach(input => processDescendants(input, true, protoForm));

  // Build Tree Data
  const buildTree = (node: LanguageInput): TreeNode => {
    const hasSpelling = !!node.spelling && node.spelling !== node.word;
    const children = node.descendants ? node.descendants.map(buildTree) : [];

    if (hasSpelling) {
      return {
        name: `${node.name} (Spelling)`,
        reconstruction: node.spelling,
        distance: 1,
        children: [
          {
            name: node.name,
            reconstruction: node.word,
            distance: 1,
            children: children
          }
        ]
      };
    } else {
      return {
        name: node.name,
        reconstruction: node.word,
        distance: 1,
        children: children
      };
    }
  };

  const generalizedLaws = generalizeSoundChanges(soundChanges, inferredShifts);
  const exceptions: string[] = [];

  // Phase 4: Statistical Thresholding (Handling Sporadic Shifts)
  for (const law of generalizedLaws) {
    if (!law.ruleString) continue;
    
    // Find transitions for this language
    const langTransitions = transitions.filter(t => t.language === law.language);
    if (langTransitions.length === 0) continue;

    const sourceWords = langTransitions.map(t => t.sourceWord);
    const shiftResults = applyShifts(sourceWords, law.ruleString);
    
    let validEnvironments = 0;
    let actualApplications = 0;
    
    for (let i = 0; i < sourceWords.length; i++) {
      const predicted = shiftResults[i];
      const changed = predicted.history.length > 0;
      
      if (changed) {
        validEnvironments++;
        // Check if it actually applied
        const applied = soundChanges.some(c => 
          c.language === law.language && law.examples.includes(`*${c.from} > ${c.to} / ${c.environment}`)
        );
        
        if (applied) {
          actualApplications++;
        } else {
          exceptions.push(`Word '*${sourceWords[i]}' should have undergone '${law.ruleString}' in ${law.language} but didn't (Exception / Possible Borrowing).`);
        }
      }
    }

    if (validEnvironments > 0) {
      const rate = actualApplications / validEnvironments;
      law.applicationRate = rate;
      
      if (rate < 0.15) {
        law.isSporadic = true;
        let classification = "Sporadic Shift";
        const parts = law.ruleString.split('/');
        if (parts.length === 2) {
          const [changePart, envPart] = parts;
          const [fromPart, toPart] = changePart.split('>');
          if (fromPart && toPart && envPart) {
            const fromChars = fromPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            const toChars = toPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            
            const isDissimilation = fromChars.some(c => envPart.includes(c));
            const isAssimilation = toChars.some(c => envPart.includes(c));
            
            if (isDissimilation) classification = "Sporadic Dissimilation";
            else if (isAssimilation) classification = "Sporadic Assimilation";
            else classification = "Analogical Leveling";
          }
        }
        law.typologicalCategory = classification;
      }
    }
  }

  return {
    protoForm,
    protoTokens: reconstructedTokens,
    confidence: candidates[0]?.probability || 0.5,
    alignmentMatrix,
    soundChanges,
    inferredShifts,
    generalizedLaws,
    exceptions,
    treeData: {
      name: protoForm,
      children: inputs.map(buildTree)
    },
    distribution: distributionArr,
    candidates,
    languageWeights
  };
};
