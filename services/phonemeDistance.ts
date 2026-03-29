
import { DistinctiveFeatures } from '../types';
import { FEATURE_MAP, getEffectiveFeatures } from './phonetics';

/**
 * Weights for different feature categories.
 * Major class features (syllabic, consonantal, sonorant) are most important.
 * Place and manner are secondary.
 * Laryngeal and diacritics are tertiary.
 */
const FEATURE_WEIGHTS: Record<keyof DistinctiveFeatures, number> = {
  syllabic: 10.0,
  consonantal: 10.0,
  sonorant: 10.0,
  
  voice: 2.0,
  spreadGlottis: 3.0,
  constrictedGlottis: 3.0,
  
  continuant: 5.0,
  nasal: 5.0,
  strident: 3.0,
  lateral: 4.0,
  delayedRelease: 4.0,
  
  labial: 6.0,
  coronal: 6.0,
  dorsal: 6.0,
  pharyngeal: 6.0,
  laryngeal: 6.0,

  alveolar: 2.0,
  palatal: 2.0,
  velar: 2.0,
  uvular: 2.0,
  glottal: 2.0,
  retroflex: 2.0,
  
  high: 4.0,
  mid: 4.0,
  low: 4.0,
  front: 4.0,
  central: 4.0,
  back: 4.0,
  round: 3.0,
  tense: 2.0,

  labialized: 2.0,
  palatalized: 2.0,
  velarized: 2.0,
  pharyngealized: 2.0,
  
  long: 1.0,
  stress: 1.0,
  tone: 1.0
};

/**
 * Calculates the weighted Hamming distance between two feature sets.
 */
export function getWeightedDistance(f1: DistinctiveFeatures, f2: DistinctiveFeatures): number {
  let distance = 0;
  let totalWeight = 0;

  for (const key in FEATURE_WEIGHTS) {
    const featureKey = key as keyof DistinctiveFeatures;
    const weight = FEATURE_WEIGHTS[featureKey];
    totalWeight += weight;

    if (f1[featureKey] !== f2[featureKey]) {
      distance += weight;
    }
  }

  return distance / totalWeight;
}

/**
 * Calculates the phonetic distance between two symbols.
 * Uses FEATURE_MAP (200+ segments) with diacritic support via getEffectiveFeatures.
 */
export function phonemeDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (s1 === '-' || s2 === '-') return 1.0; // Gap penalty

  const f1 = getEffectiveFeatures(s1);
  const f2 = getEffectiveFeatures(s2);

  // If either is unknown, compute distance from whatever features are available
  if (!f1 || !f2) {
    // Partial match: if both are clearly consonants or both vowels, use 0.5
    // otherwise 0.9 (class mismatch)
    const s1InMap = s1 in FEATURE_MAP;
    const s2InMap = s2 in FEATURE_MAP;
    if (!s1InMap && !s2InMap) return 0.9; // Both unknown
    
    // One known, one unknown - check if class matches
    const knownChar = s1InMap ? s1 : s2;
    const knownFeatures = FEATURE_MAP[knownChar];
    const knownClass = knownFeatures.syllabic ? 'V' : (knownFeatures.consonantal ? 'C' : '?');
    
    // For unknown, try to infer from character properties
    // Vowels are typically in certain Unicode ranges or common letters
    const unknownChar = s1InMap ? s2 : s1;
    const isVowelLike = /[aeiouyɑɛɔæøœɪʊəɨʉɯ]/i.test(unknownChar);
    const unknownClass = isVowelLike ? 'V' : 'C';
    
    return knownClass === unknownClass ? 0.5 : 0.9;
  }

  return getWeightedDistance(f1, f2);
}

/**
 * Returns a normalized distance between 0 and 1.
 */
export function normalisedDistance(s1: string, s2: string): number {
  return phonemeDistance(s1, s2);
}

/**
 * Contextual distance (placeholder for now, can be expanded for assimilation etc).
 */
export function contextualDistance(s1: string, s2: string, context: string[]): number {
  return phonemeDistance(s1, s2);
}

/**
 * Gap penalty for alignment.
 */
export function gapPenalty(): number {
  return 0.5;
}

/**
 * Builds a distance matrix for a set of phonemes.
 */
export function buildDistanceMatrix(phonemes: string[]): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < phonemes.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < phonemes.length; j++) {
      matrix[i][j] = phonemeDistance(phonemes[i], phonemes[j]);
    }
  }
  return matrix;
}

/**
 * Finds the N nearest neighbours for a phoneme.
 */
export function nearestNeighbours(symbol: string, n: number = 5): { symbol: string, distance: number }[] {
  // Use FEATURE_MAP keys instead of featureMatrix
  const allSymbols = Object.keys(FEATURE_MAP);
  const distances = allSymbols
    .filter(s => s !== symbol)
    .map(s => ({ symbol: s, distance: phonemeDistance(symbol, s) }))
    .sort((a, b) => a.distance - b.distance);
  
  return distances.slice(0, n);
}

/**
 * Scores a proto-segment candidate based on its distance to observed segments.
 */
export function scoreProtoSegment(candidate: string, observed: string[]): number {
  if (observed.length === 0) return 0;
  const sumDist = observed.reduce((acc, obs) => acc + phonemeDistance(candidate, obs), 0);
  return sumDist / observed.length;
}
