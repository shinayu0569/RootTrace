/**
 * RootTrace SCA - Stress Assignment System
 * 
 * A comprehensive stress assignment system with clear, unambiguous patterns.
 * Supports primary and secondary stress assignment with multiple algorithms.
 * 
 * ## Stress Patterns
 * 
 * ### Fixed Position Patterns
 * - `initial`: First syllable receives stress
 * - `final`: Last syllable receives stress  
 * - `penultimate`: Second-to-last syllable receives stress
 * - `antepenult`: Third-to-last syllable receives stress
 * - `custom`: User-defined absolute or relative position
 * 
 * ### Rhythmic Patterns (with secondary stress)
 * - `trochaic`: Strong-Weak alternating from left (SW-SW...)
 * - `iambic`: Weak-Strong alternating from left (WS-WS...)
 * - `dactylic`: Strong-Weak-Weak from left (SWW-SWW...)
 * - `anapestic`: Weak-Weak-Strong from left (WWS-WWS...)
 * 
 * ### Weight-Sensitive Patterns
 * - `mobile`: Stress rightmost heavy syllable, default to position 0
 * - `random-mobile`: Random placement with optional seed for reproducibility
 * 
 * ### Secondary Stress Options
 * - `alternating`: Place secondary stress at regular intervals
 * - Direction: `ltr` (left-to-right) or `rtl` (right-to-left)
 * - Skip primary: Always true (primary stress takes precedence)
 * 
 * ## Usage Examples
 * 
 * ```
 * // Simple initial stress
 * Stress: initial
 * 
 * // Trochaic with secondary stress
 * Stress: trochaic secondary:alternating 2nd-dir:ltr
 * 
 * // Mobile stress with fallback
 * Stress: mobile fallback:next
 * 
 * // Custom position (0-indexed)
 * Stress: custom pos:2
 * 
 * // Random stress with seed for reproducibility
 * Stress: random-mobile seed:12345 fallback:previous
 * ```
 */

import { tokenizeIPA, getEffectiveFeatures } from './phonetics';

// Stress mark characters
export const PRIMARY_STRESS = 'ˈ';
export const SECONDARY_STRESS = 'ˌ';

// Valid stress patterns
export type StressPattern = 
  | 'initial'
  | 'final'
  | 'penultimate'
  | 'antepenult'
  | 'trochaic'
  | 'iambic'
  | 'dactylic'
  | 'anapestic'
  | 'mobile'
  | 'random-mobile'
  | 'custom';

// Secondary stress configuration
export interface SecondaryStressConfig {
  enabled: boolean;
  pattern: 'alternating' | 'custom';
  direction: 'ltr' | 'rtl';
  interval?: number;  // For custom patterns (default: 2 for binary, 3 for ternary)
}

// Full stress configuration
export interface StressConfig {
  pattern: StressPattern | null;
  autoFix: boolean;           // Reassign stress after sound changes
  heavySyllablePattern: string; // Pattern for identifying heavy syllables (e.g., 'VC', 'VV')
  customPosition: string;     // For 'custom' pattern: absolute index or negative offset
  randomMobile: {
    enabled: boolean;
    fallbackDirection: 'next' | 'previous';
    seed: number | null;
  };
  secondaryStress: SecondaryStressConfig;
  userAdjustments: Array<{
    word: string;
    syllableIndex: number;
    stressType: 'primary' | 'secondary' | 'none';
  }>;
}

// Default configuration
export const DEFAULT_STRESS_CONFIG: StressConfig = {
  pattern: null,
  autoFix: false,
  heavySyllablePattern: 'VC',
  customPosition: '',
  randomMobile: {
    enabled: false,
    fallbackDirection: 'next',
    seed: null
  },
  secondaryStress: {
    enabled: false,
    pattern: 'alternating',
    direction: 'ltr',
    interval: 2
  },
  userAdjustments: []
};

// Syllable weight classification
export type SyllableWeight = 'light' | 'heavy' | 'superheavy';

/**
 * Check if a syllable is "heavy" based on the configured pattern
 * 
 * Patterns:
 * - 'VC': Closed syllable (vowel + consonant)
 * - 'VV': Long vowel/diphthong
 * - 'VVC': Long vowel + coda
 * - 'VVCC': Superheavy
 */
export function classifySyllableWeight(
  syllable: string, 
  pattern: string = 'VC'
): SyllableWeight {
  const phonemes = tokenizeIPA(syllable);
  
  let hasLongVowel = false;
  let hasCoda = false;
  let vowelCount = 0;
  
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    const features = getEffectiveFeatures(p);
    
    if (features?.syllabic) {
      vowelCount++;
      // Check if followed by another vowel (diphthong) or length mark
      if (i < phonemes.length - 1) {
        const next = phonemes[i + 1];
        if (getEffectiveFeatures(next)?.syllabic || next === 'ː' || next === ':') {
          hasLongVowel = true;
        }
      }
      // Check for length mark attached to this vowel
      if (p.includes('ː') || p.includes(':') || p.includes('ˑ')) {
        hasLongVowel = true;
      }
    } else if (vowelCount > 0) {
      // Non-vowel after a vowel = coda
      hasCoda = true;
    }
  }
  
  // Classify based on pattern
  if (pattern === 'VC') {
    return hasCoda ? 'heavy' : 'light';
  } else if (pattern === 'VV') {
    return (hasLongVowel || vowelCount > 1) ? 'heavy' : 'light';
  } else if (pattern === 'VVC' || pattern === 'VVCC') {
    if (hasLongVowel && hasCoda) return 'superheavy';
    if (hasLongVowel || vowelCount > 1) return 'heavy';
    return 'light';
  }
  
  return 'light';
}

/**
 * Check if a syllable is heavy (convenience function)
 */
export function isHeavySyllable(syllable: string, pattern: string = 'VC'): boolean {
  const weight = classifySyllableWeight(syllable, pattern);
  return weight === 'heavy' || weight === 'superheavy';
}

/**
 * Seeded random number generator for reproducible stress assignment
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    // Linear congruential generator
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Calculate secondary stress indices
 * 
 * @param syllableCount - Total syllables in word
 * @param primaryIndex - Index of primary stress (excluded from secondary)
 * @param interval - Foot size (2 for binary, 3 for ternary)
 * @param direction - 'ltr' or 'rtl'
 * @returns Array of indices for secondary stress
 */
export function calculateSecondaryStress(
  syllableCount: number,
  primaryIndex: number,
  interval: number = 2,
  direction: 'ltr' | 'rtl' = 'ltr'
): number[] {
  const indices: number[] = [];
  
  if (direction === 'rtl') {
    // Build from right edge
    for (let i = syllableCount - 1; i >= 0; i--) {
      const distFromRight = syllableCount - 1 - i;
      if (i !== primaryIndex && distFromRight % interval === 0) {
        indices.push(i);
      }
    }
    return indices.reverse();
  } else {
    // LTR: positions where (i - primary) is positive multiple of interval
    for (let i = 0; i < syllableCount; i++) {
      const dist = i - primaryIndex;
      // Use modular arithmetic for circular distance
      const mod = ((dist % interval) + interval) % interval;
      if (i !== primaryIndex && mod === 0) {
        indices.push(i);
      }
    }
    return indices;
  }
}

/**
 * Find primary stress position based on pattern
 */
export function findPrimaryStressPosition(
  syllables: string[],
  pattern: StressPattern,
  config: StressConfig
): number {
  const count = syllables.length;
  
  switch (pattern) {
    case 'initial':
      return 0;
      
    case 'final':
      return count - 1;
      
    case 'penultimate':
      return Math.max(0, count - 2);
      
    case 'antepenult':
      return Math.max(0, count - 3);
      
    case 'trochaic':
      // Primary on first syllable
      return 0;
      
    case 'iambic':
      // Primary on second syllable, or last if only 1 syllable
      return Math.min(1, count - 1);
      
    case 'dactylic':
      // Primary on first syllable
      return 0;
      
    case 'anapestic':
      // Primary on third syllable, or last if fewer
      return Math.min(2, count - 1);
      
    case 'mobile': {
      // Find rightmost heavy syllable
      for (let i = count - 1; i >= 0; i--) {
        if (isHeavySyllable(syllables[i], config.heavySyllablePattern)) {
          return i;
        }
      }
      return 0; // Default to initial
    }
    
    case 'random-mobile': {
      const rng = config.randomMobile.seed !== null 
        ? createSeededRandom(config.randomMobile.seed)
        : Math.random;
      return Math.floor(rng() * count);
    }
    
    case 'custom': {
      const pos = parseInt(config.customPosition, 10);
      if (!isNaN(pos)) {
        if (pos >= 0) {
          return Math.min(pos, count - 1);
        } else {
          return Math.max(0, count + pos);
        }
      }
      return 0;
    }
    
    default:
      return 0;
  }
}

/**
 * Assign stress to a syllabified word
 * 
 * @param syllabifiedWord - Word with syllable boundaries (e.g., "pa.ta.ta")
 * @param config - Stress configuration
 * @param originalWord - Original word for user adjustment matching
 * @returns Word with stress marks applied
 */
export function assignStress(
  syllabifiedWord: string,
  config: StressConfig,
  originalWord: string = ''
): string {
  if (!config.pattern) return syllabifiedWord;
  
  // Split into syllables
  const syllables = syllabifiedWord.split('.');
  if (syllables.length === 0) return syllabifiedWord;
  
  // Remove existing stress marks for clean slate
  const cleanSyllables = syllables.map(s => 
    s.replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), '')
  );
  
  // Check for user adjustment first
  const userAdj = config.userAdjustments.find(a => a.word === originalWord);
  
  let primaryIndex: number;
  let secondaryIndices: number[] = [];
  
  if (userAdj) {
    if (userAdj.stressType === 'none') {
      // User wants no stress on this word
      return cleanSyllables.join('.');
    }
    if (userAdj.stressType === 'primary') {
      primaryIndex = userAdj.syllableIndex;
    } else {
      // Secondary stress specified by user
      primaryIndex = findPrimaryStressPosition(cleanSyllables, config.pattern, config);
      secondaryIndices = [userAdj.syllableIndex];
    }
  } else {
    // Calculate primary stress position
    primaryIndex = findPrimaryStressPosition(cleanSyllables, config.pattern, config);
  }
  
  // Calculate secondary stress if enabled
  if (config.secondaryStress.enabled && secondaryIndices.length === 0) {
    const interval = config.secondaryStress.interval || 
      (['dactylic', 'anapestic'].includes(config.pattern) ? 3 : 2);
    
    secondaryIndices = calculateSecondaryStress(
      cleanSyllables.length,
      primaryIndex,
      interval,
      config.secondaryStress.direction
    );
  }
  
  // Apply stress marks
  const result = cleanSyllables.map((s, i) => {
    if (i === primaryIndex) {
      return `${PRIMARY_STRESS}${s}`;
    } else if (secondaryIndices.includes(i)) {
      return `${SECONDARY_STRESS}${s}`;
    }
    return s;
  });
  
  return result.join('.');
}

/**
 * Fix stress placement after sound changes
 * 
 * @param word - Current word (with stress marks)
 * @param originalWord - Original word before changes
 * @param config - Stress configuration
 * @param syllabify - Function to syllabify a word
 * @returns Word with fixed stress
 */
export function fixStress(
  word: string,
  originalWord: string,
  config: StressConfig,
  syllabify: (w: string) => string
): string {
  if (!config.autoFix && !config.pattern) return word;
  
  // Remove existing stress
  const unstressed = word.replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), '');
  
  // Re-syllabify
  const syllabified = syllabify(unstressed);
  
  // For random-mobile, try to preserve original position if possible
  if (config.pattern === 'random-mobile') {
    const stressedMatch = word.match(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]([^.]+)`));
    if (stressedMatch) {
      const stressedSyllable = stressedMatch[1].replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), '');
      const syllables = syllabified.split('.');
      const currentIndex = syllables.findIndex(s => 
        s.replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), '') === stressedSyllable
      );
      
      if (currentIndex !== -1) {
        // Syllable still exists, keep stress there
        const cleanSyllables = syllables.map(s => s.replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), ''));
        return cleanSyllables.map((s, i) => 
          i === currentIndex ? `${PRIMARY_STRESS}${s}` : s
        ).join('.');
      }
      
      // Syllable disappeared, relocate based on fallback
      const { fallbackDirection } = config.randomMobile;
      const originalIndex = parseInt(originalWord.match(/\d+/)?.[0] || '0', 10);
      
      let newIndex: number;
      if (fallbackDirection === 'next') {
        newIndex = Math.min(originalIndex, syllables.length - 1);
      } else {
        newIndex = Math.max(0, originalIndex - 1);
      }
      
      const cleanSyllables = syllables.map(s => s.replace(new RegExp(`[${PRIMARY_STRESS}${SECONDARY_STRESS}]`, 'g'), ''));
      return cleanSyllables.map((s, i) => 
        i === newIndex ? `${PRIMARY_STRESS}${s}` : s
      ).join('.');
    }
  }
  
  // Default: re-run stress assignment
  return assignStress(syllabified, config, originalWord);
}

/**
 * Validate stress configuration
 * Returns array of error messages (empty if valid)
 */
export function validateStressConfig(config: StressConfig): string[] {
  const errors: string[] = [];
  
  if (!config.pattern) {
    return []; // No pattern is valid (no stress assignment)
  }
  
  const validPatterns: StressPattern[] = [
    'initial', 'final', 'penultimate', 'antepenult',
    'trochaic', 'iambic', 'dactylic', 'anapestic',
    'mobile', 'random-mobile', 'custom'
  ];
  
  if (!validPatterns.includes(config.pattern)) {
    errors.push(`Invalid stress pattern: ${config.pattern}`);
  }
  
  if (config.pattern === 'custom') {
    const pos = parseInt(config.customPosition, 10);
    if (isNaN(pos)) {
      errors.push('Custom pattern requires a valid position (e.g., pos:2 or pos:-1)');
    }
  }
  
  if (config.secondaryStress.enabled) {
    if (!['alternating', 'custom'].includes(config.secondaryStress.pattern)) {
      errors.push('Secondary stress pattern must be "alternating" or "custom"');
    }
    if (!['ltr', 'rtl'].includes(config.secondaryStress.direction)) {
      errors.push('Secondary stress direction must be "ltr" or "rtl"');
    }
  }
  
  return errors;
}

export default {
  assignStress,
  fixStress,
  calculateSecondaryStress,
  findPrimaryStressPosition,
  isHeavySyllable,
  classifySyllableWeight,
  createSeededRandom,
  validateStressConfig,
  PRIMARY_STRESS,
  SECONDARY_STRESS,
  DEFAULT_STRESS_CONFIG
};
