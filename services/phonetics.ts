
import { DistinctiveFeatures } from '../types';
import { scoreFeatureTransition } from './typologyMatrix';

// Default "zero" features
const BASE_FEATURES: DistinctiveFeatures = {
  syllabic: false,
  consonantal: false,
  sonorant: false,
  voice: false,
  spreadGlottis: false,
  constrictedGlottis: false,
  continuant: false,
  nasal: false,
  strident: false,
  lateral: false,
  delayedRelease: false,
  labial: false,
  coronal: false,
  dorsal: false,
  high: false,
  low: false,
  back: false,
  round: false,
  tense: false,
  long: false,
  stress: false,
  tone: 0
};

// Helper to build features by overriding base
const f = (overrides: Partial<DistinctiveFeatures>): DistinctiveFeatures => ({
  ...BASE_FEATURES,
  ...overrides,
});

// Comprehensive Feature Matrix for IPA Symbols
export const FEATURE_MAP: Record<string, DistinctiveFeatures> = {
  // --- STOPS ---
  'p': f({ consonantal: true, labial: true }),
  'b': f({ consonantal: true, labial: true, voice: true }),
  't': f({ consonantal: true, coronal: true }),
  'd': f({ consonantal: true, coronal: true, voice: true }),
  'ʈ': f({ consonantal: true, coronal: true, back: true }), // Retroflex
  'ɖ': f({ consonantal: true, coronal: true, back: true, voice: true }),
  'c': f({ consonantal: true, dorsal: true, high: true }), // Palatal
  'ɟ': f({ consonantal: true, dorsal: true, high: true, voice: true }),
  'ȶ': f({ consonantal: true, coronal: true, dorsal: true, high: true }), // Alveolo-palatal
  'ȡ': f({ consonantal: true, coronal: true, dorsal: true, high: true, voice: true }),
  'k': f({ consonantal: true, dorsal: true, high: true, back: true }),
  'g': f({ consonantal: true, dorsal: true, high: true, back: true, voice: true }),
  'q': f({ consonantal: true, dorsal: true, back: true }),
  'ɢ': f({ consonantal: true, dorsal: true, back: true, voice: true }),
  'ʔ': f({ consonantal: true, constrictedGlottis: true }),
  'Ɂ': f({ consonantal: true, constrictedGlottis: true }), // Alternative glottal stop
  'ʡ': f({ consonantal: true, constrictedGlottis: true }), // Epiglottal stop
  'Q': f({ consonantal: true, constrictedGlottis: true }), // Alternative epiglottal stop

  // --- IMPLOSIVES ---
  'ɓ': f({ consonantal: true, labial: true, voice: true, constrictedGlottis: true }),
  'ɗ': f({ consonantal: true, coronal: true, voice: true, constrictedGlottis: true }),
  'ᶑ': f({ consonantal: true, coronal: true, back: true, voice: true, constrictedGlottis: true }), // Retroflex implosive
  'ʄ': f({ consonantal: true, dorsal: true, high: true, voice: true, constrictedGlottis: true }),
  'ɠ': f({ consonantal: true, dorsal: true, high: true, back: true, voice: true, constrictedGlottis: true }),
  'ʛ': f({ consonantal: true, dorsal: true, back: true, voice: true, constrictedGlottis: true }),

  // --- CLICKS ---
  'ʘ': f({ consonantal: true, labial: true, delayedRelease: true }),
  'ǀ': f({ consonantal: true, coronal: true, delayedRelease: true }),
  'ǃ': f({ consonantal: true, coronal: true, back: true, delayedRelease: true }),
  'ǂ': f({ consonantal: true, coronal: true, high: true, delayedRelease: true }),
  'ǁ': f({ consonantal: true, coronal: true, lateral: true, delayedRelease: true }),

  // --- NASALS ---
  'm': f({ consonantal: true, sonorant: true, nasal: true, labial: true, voice: true }),
  'ɱ': f({ consonantal: true, sonorant: true, nasal: true, labial: true, voice: true, coronal: true }),
  'n': f({ consonantal: true, sonorant: true, nasal: true, coronal: true, voice: true }),
  'ɳ': f({ consonantal: true, sonorant: true, nasal: true, coronal: true, back: true, voice: true }),
  'ɲ': f({ consonantal: true, sonorant: true, nasal: true, dorsal: true, high: true, voice: true }),
  'ȵ': f({ consonantal: true, sonorant: true, nasal: true, coronal: true, dorsal: true, high: true, voice: true }), // Alveolo-palatal nasal
  'ŋ': f({ consonantal: true, sonorant: true, nasal: true, dorsal: true, high: true, back: true, voice: true }),
  'ɴ': f({ consonantal: true, sonorant: true, nasal: true, dorsal: true, back: true, voice: true }),

  // --- FRICATIVES ---
  'ɸ': f({ consonantal: true, continuant: true, labial: true }),
  'β': f({ consonantal: true, continuant: true, labial: true, voice: true }),
  'f': f({ consonantal: true, continuant: true, labial: true, strident: true }),
  'v': f({ consonantal: true, continuant: true, labial: true, strident: true, voice: true }),
  'θ': f({ consonantal: true, continuant: true, coronal: true }),
  'ð': f({ consonantal: true, continuant: true, coronal: true, voice: true }),
  's': f({ consonantal: true, continuant: true, coronal: true, strident: true }),
  'z': f({ consonantal: true, continuant: true, coronal: true, strident: true, voice: true }),
  'ʃ': f({ consonantal: true, continuant: true, coronal: true, strident: true, high: true }),
  'ʒ': f({ consonantal: true, continuant: true, coronal: true, strident: true, high: true, voice: true }),
  'ʂ': f({ consonantal: true, continuant: true, coronal: true, strident: true, back: true }),
  'ʐ': f({ consonantal: true, continuant: true, coronal: true, strident: true, back: true, voice: true }),
  'ɕ': f({ consonantal: true, continuant: true, coronal: true, strident: true, high: true }),
  'ʑ': f({ consonantal: true, continuant: true, coronal: true, strident: true, high: true, voice: true }),
  'ç': f({ consonantal: true, continuant: true, dorsal: true, high: true }),
  'ʝ': f({ consonantal: true, continuant: true, dorsal: true, high: true, voice: true }),
  'x': f({ consonantal: true, continuant: true, dorsal: true, high: true, back: true }),
  'ɣ': f({ consonantal: true, continuant: true, dorsal: true, high: true, back: true, voice: true }),
  'χ': f({ consonantal: true, continuant: true, dorsal: true, back: true }),
  'ʁ': f({ consonantal: true, continuant: true, dorsal: true, back: true, voice: true }),
  'ħ': f({ consonantal: true, continuant: true, dorsal: true, back: true, low: true }),
  'ʕ': f({ consonantal: true, continuant: true, dorsal: true, back: true, low: true, voice: true }),
  'h': f({ continuant: true, spreadGlottis: true }),
  'ɦ': f({ continuant: true, spreadGlottis: true, voice: true }),
  'ɬ': f({ consonantal: true, continuant: true, lateral: true, coronal: true, strident: true }),
  'ɮ': f({ consonantal: true, continuant: true, lateral: true, coronal: true, strident: true, voice: true }),
  'ʜ': f({ consonantal: true, continuant: true, dorsal: true, back: true, low: true }), // Epiglottal fricative
  'ʢ': f({ consonantal: true, continuant: true, dorsal: true, back: true, low: true, voice: true }),
  'ʍ': f({ consonantal: true, continuant: true, labial: true, dorsal: true, high: true, back: true }), // Voiceless labial-velar fricative

  // --- AFFRICATES ---
  'pf': f({ consonantal: true, labial: true, delayedRelease: true, strident: true }),
  'bv': f({ consonantal: true, labial: true, delayedRelease: true, strident: true, voice: true }),
  'ts': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true }),
  'dz': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true, voice: true }),
  'tʃ': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true, high: true }),
  'dʒ': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true, high: true, voice: true }),
  'tɕ': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true, high: true }),
  'dʑ': f({ consonantal: true, coronal: true, delayedRelease: true, strident: true, high: true, voice: true }),
  'ȶɕ': f({ consonantal: true, coronal: true, dorsal: true, delayedRelease: true, strident: true, high: true }),
  'ȡʑ': f({ consonantal: true, coronal: true, dorsal: true, delayedRelease: true, strident: true, high: true, voice: true }),
  'kx': f({ consonantal: true, dorsal: true, delayedRelease: true, high: true, back: true }),
  'qχ': f({ consonantal: true, dorsal: true, delayedRelease: true, back: true }),
  'Qħ': f({ consonantal: true, dorsal: true, delayedRelease: true, back: true, low: true }), // Epiglottal affricate

  // --- LIQUIDS / GLIDES / TRILLS / FLAPS ---
  'r': f({ consonantal: true, sonorant: true, continuant: true, coronal: true, voice: true }),
  'ɾ': f({ consonantal: true, sonorant: true, coronal: true, voice: true }),
  'ɹ': f({ consonantal: true, sonorant: true, continuant: true, coronal: true, voice: true }),
  'l': f({ consonantal: true, sonorant: true, continuant: true, lateral: true, coronal: true, voice: true }),
  'ɭ': f({ consonantal: true, sonorant: true, continuant: true, lateral: true, coronal: true, back: true, voice: true }),
  'ȴ': f({ consonantal: true, sonorant: true, continuant: true, lateral: true, coronal: true, dorsal: true, high: true, voice: true }), // Alveolo-palatal lateral
  'ʎ': f({ consonantal: true, sonorant: true, continuant: true, lateral: true, dorsal: true, high: true, voice: true }),
  'ʟ': f({ consonantal: true, sonorant: true, continuant: true, lateral: true, dorsal: true, high: true, back: true, voice: true }),
  'w': f({ sonorant: true, continuant: true, labial: true, dorsal: true, high: true, back: true, round: true, voice: true }),
  'j': f({ sonorant: true, continuant: true, dorsal: true, high: true, voice: true }),
  'ɥ': f({ sonorant: true, continuant: true, labial: true, dorsal: true, high: true, round: true, voice: true }),
  'ɰ': f({ sonorant: true, continuant: true, dorsal: true, high: true, back: true, voice: true }), // Velar approximant
  'ʋ': f({ sonorant: true, continuant: true, labial: true, voice: true }), // Labiodental approximant
  'ɻ': f({ sonorant: true, continuant: true, coronal: true, back: true, voice: true }), // Retroflex approximant
  'ⱱ': f({ consonantal: true, sonorant: true, labial: true, voice: true }), // Labiodental flap
  'ɽ': f({ consonantal: true, sonorant: true, coronal: true, back: true, voice: true }), // Retroflex flap
  'ɺ': f({ consonantal: true, sonorant: true, lateral: true, coronal: true, voice: true }), // Alveolar lateral flap
  'ʙ': f({ consonantal: true, sonorant: true, continuant: true, labial: true, voice: true }), // Bilabial trill
  'ʀ': f({ consonantal: true, sonorant: true, continuant: true, dorsal: true, back: true, voice: true }), // Uvular trill

  // --- VOWELS ---
  // High
  'i': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, voice: true, tense: true }),
  'y': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, round: true, voice: true, tense: true }),
  'ɨ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, voice: true }), // Central unrounded
  'ʉ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, round: true, voice: true }), // Central rounded
  'ï': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, voice: true }), // Central unrounded (alt)
  'ÿ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, round: true, voice: true }), // Central rounded (alt)
  'ü': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, round: true, voice: true, tense: true }), // Front rounded (alt)
  'u': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, back: true, round: true, voice: true, tense: true }),
  'ɯ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, back: true, voice: true }),
  
  // Near-High
  'ɪ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, voice: true }),
  'ʏ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, round: true, voice: true }),
  'ʊ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, high: true, back: true, round: true, voice: true }),

  // Mid
  'e': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true, tense: true }),
  'ø': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, round: true, voice: true, tense: true }),
  'ɘ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true, tense: true }), // Close-mid central unrounded
  'ɵ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, round: true, voice: true }), // Close-mid central rounded
  'ë': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true, tense: true }), // Mid central unrounded (alt)
  'ö': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, round: true, voice: true, tense: true }), // Mid front rounded (alt)
  'o': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, back: true, round: true, voice: true, tense: true }),
  'ɤ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, back: true, voice: true, tense: true }),
  'ə': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true }),

  // Open-Mid
  'ɛ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true }),
  'œ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, round: true, voice: true }),
  'ɜ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, voice: true }), // Open-mid central unrounded
  'ɞ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, round: true, voice: true }), // Open-mid central rounded
  'ɔ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, back: true, round: true, voice: true }),
  'ʌ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, back: true, voice: true }),

  // Low
  'æ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, voice: true }),
  'a': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, voice: true }),
  'ɶ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, round: true, voice: true }),
  'ɑ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, back: true, voice: true }),
  'ɒ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, back: true, round: true, voice: true }),
  'ɐ': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, voice: true }), // Near-open central
  'ä': f({ syllabic: true, sonorant: true, continuant: true, dorsal: true, low: true, voice: true }), // Open central unrounded
};

// --- PILLAR 1: SONORITY SCALE ---
// Higher = more sonorous. Used for Sonority Sequencing Principle (SSP)
export const getSonority = (token: string): number => {
  if (token === GAP_CHAR) return 0;
  const f = getEffectiveFeatures(token);
  if (!f) return 0;

  if (f.syllabic) return 10; // Vowels
  if (token === 'w' || token === 'j' || token === 'ɥ' || token === 'ɰ') return 9; // Glides
  if (f.lateral || token === 'r' || token === 'ɾ' || token === 'ɹ') return 8; // Liquids
  if (f.nasal) return 7; // Nasals
  if (f.continuant && f.voice) return 6; // Voiced Fricatives
  if (f.continuant) return 5; // Voiceless Fricatives
  if (f.delayedRelease && f.voice) return 4; // Voiced Affricates
  if (f.delayedRelease) return 3; // Voiceless Affricates
  if (f.voice) return 2; // Voiced Stops
  return 1; // Voiceless Stops
};

// Maps diacritics to feature modifications
const DIACRITIC_MAP: Record<string, Partial<DistinctiveFeatures>> = {
  // --- Phonation ---
  '\u0325': { voice: false }, // Ring below (voiceless) ̥
  '\u030A': { voice: false }, // Ring above (voiceless) ̊
  '\u032C': { voice: true },  // Caron below (voiced) ̬
  '\u02B0': { spreadGlottis: true }, // Superscript h (aspirated) ʰ
  '\u02B1': { spreadGlottis: true, voice: true }, // Superscript h with hook (breathy aspirated) ʱ
  '\u0324': { spreadGlottis: true }, // Breathy voice (dieresis below) ̤
  '\u0330': { constrictedGlottis: true }, // Creaky voice (tilde below) ̰
  '\u02BC': { constrictedGlottis: true }, // Ejective apostrophe ʼ
  '\u02C0': { constrictedGlottis: true }, // Glottal stop letter ˀ

  // --- Secondary Articulation ---
  '\u02B7': { round: true, labial: true }, // Superscript w ʷ
  '\u02B2': { high: true, coronal: false, dorsal: true }, // Superscript j ʲ
  '\u02E0': { back: true, dorsal: true }, // Superscript gamma ˠ
  '\u02E4': { back: true, low: true, dorsal: true }, // Superscript pharyngeal ˤ
  '\u0303': { nasal: true }, // Tilde (nasalized) ̃
  '\u207F': { nasal: true }, // Superscript n ⁿ
  '\u02E1': { lateral: true }, // Superscript l ˡ
  
  // --- Place / Tongue ---
  '\u032A': { coronal: true }, // Dental bridge ̪
  '\u033A': { coronal: true }, // Apical (inverted bridge) ̺
  '\u033B': { coronal: true }, // Laminal (square) ̻
  '\u033C': { labial: true, coronal: true }, // Linguolabial (seagull below) ̼
  '\u031F': { back: false }, // Advanced + ̟ (pulls forward)
  '\u0320': { back: true }, // Retracted - ̠ (pulls back)
  '\u031D': { high: true }, // Raised ̝
  '\u031E': { low: true }, // Lowered ̞
  '\u0318': { tense: true }, // Advanced Tongue Root ̘ (Mapping to tense for approx)
  '\u0319': { tense: false }, // Retracted Tongue Root ̙ (Mapping to lax)
  '\u0334': { back: true, dorsal: true }, // Tilde overlay (Velarized/Pharyngealized)
  '\u0339': { round: true }, // Right half ring below (More rounded) ̹
  '\u031C': { round: false }, // Left half ring below (Less rounded) ̜
  '\u0308': { back: false }, // Dieresis (Centralized) ̈
  '\u033D': { high: false, low: false, back: false }, // Cross above (Mid-centralized) ̽

  // --- Syllabicity ---
  '\u0329': { syllabic: true }, // Vertical line below (Syllabic) ̩
  '\u030D': { syllabic: true }, // Vertical line above (Syllabic) ̍
  '\u032F': { syllabic: false }, // Inverted breve below (Non-syllabic) ̯
  
  // --- Rhoticity ---
  '\u02DE': { coronal: true, back: true }, // Rhotic hook ˞ (Approximation)

  // --- Suprasegmentals ---
  '\u02D0': { long: true }, // Long ː
  '\u02D1': { long: true }, // Half-long ˑ
  '\u0306': { long: false }, // Breve (extra short) ̆
  '\u02C8': { stress: true }, // Primary stress ˈ
  '\u02CC': { stress: true }, // Secondary stress ˌ

  // --- Tone (Generic Mapping) ---
  '\u0301': { tone: 1 }, // Acute (High) ́
  '\u0300': { tone: -1 }, // Grave (Low) ̀
  '\u0304': { tone: 0.5 }, // Macron (Mid) ̄
  '\u030C': { tone: 0.8 }, // Caron (Rising) ̌
  '\u0302': { tone: -0.8 }, // Circumflex (Falling) ̂
  '\u02E5': { tone: 2 }, // Extra high ˥
  '\u02E6': { tone: 1 }, // High ˦
  '\u02E7': { tone: 0 }, // Mid ˧
  '\u02E8': { tone: -1 }, // Low ˨
  '\u02E9': { tone: -2 }, // Extra low ˩
  '\uA71B': { tone: 2 }, // Raised up arrow ꜛ
  '\uA71C': { tone: -2 }, // Lowered down arrow ꜜ
  '#': f({}), // Boundary marker
  ',': f({}), // Cognate set boundary marker
};

export const GAP_CHAR = '-';
export const UNKNOWN_CHAR_PENALTY = 8;
export const GAP_PENALTY = 10;
export const BOUNDARY_PENALTY = 20;

// Regex Components for IPA Tokenization
const baseRange = "a-zA-Z\\u00C0-\\u02AF\\u0370-\\u03FF\\u1D00-\\u1DBF\\u01C0-\\u01C3\\u0294\\u0295\\u02A1\\u02A2";
const combiningRange = "\\u0300-\\u036F\\u1DC0-\\u1DFF\\u20D0-\\u20FF\\uFE20-\\uFE2F";
const spacingModifierRange = "\\u02B0-\\u02FF\\u1D2C-\\u1D6A\\u2070-\\u209F\\u02D0\\u02D1";
const toneLetters = "\\u02E5-\\u02EB\\uA700-\\uA71F";
const stressMarks = "\\u02C8\\u02CC";
const tieBars = "\\u0361\\u035C";

// Combined regex for stripping diacritics to find base char
const STRIP_REGEX = new RegExp(`[${combiningRange}${spacingModifierRange}${toneLetters}${stressMarks}]`, 'g');

/**
 * Computes the effective features of a phoneme segment (Base + Diacritics).
 */
export const getEffectiveFeatures = (token: string): DistinctiveFeatures | null => {
  // 1. Identify Base Character
  // Remove all known modifiers to find the base
  const baseChar = token.replace(STRIP_REGEX, '');
  
  // 2. Get Base Features
  // Try exact match, then first char match (for ligatures like ts if not explicitly mapped)
  let features = FEATURE_MAP[baseChar] ? { ...FEATURE_MAP[baseChar] } : (FEATURE_MAP[baseChar[0]] ? { ...FEATURE_MAP[baseChar[0]] } : null);
  
  // Handle ligatures connected with tie bars if base not found
  if (!features && baseChar.length > 1) {
    // A heuristic: take features of the last segment (often the release matters most) or blend?
    // For now, try the first character as the primary articulator base
    features = FEATURE_MAP[baseChar[0]] ? { ...FEATURE_MAP[baseChar[0]] } : null;
  }

  if (!features) return null;

  // 3. Apply Diacritics
  // Iterate through every character in the token
  for (const char of token) {
    if (DIACRITIC_MAP[char]) {
      features = { ...features, ...DIACRITIC_MAP[char] };
    }
  }

  // Special handling for stress: if the token starts with stress mark, set stress
  if (/^[ˈˌ]/.test(token)) {
    features.stress = true;
  }

  return features;
};

// Calculate phonetic distance using Hamming Distance of features
export const getPhoneticDistance = (charA: string, charB: string, gapPenalty: number = 10, unknownCharPenalty: number = 8): number => {
  if (charA === charB) return 0;
  if (charA === GAP_CHAR || charB === GAP_CHAR) return gapPenalty;

  // Explicitly handle syllable boundaries to prevent aligning them with segments
  if (charA === '.' || charB === '.' || charA === ',' || charB === ',') return BOUNDARY_PENALTY;

  const fA = getEffectiveFeatures(charA);
  const fB = getEffectiveFeatures(charB);

  if (!fA || !fB) return unknownCharPenalty;

  let distance = 0;
  const keys = Object.keys(fA) as (keyof DistinctiveFeatures)[];
  
  for (const key of keys) {
    // Handle tone numerically
    if (key === 'tone') {
       distance += Math.abs(fA.tone - fB.tone) * 0.5; // Scale tone diff
    } else {
      if (fA[key] !== fB[key]) {
        // Weight major class features more heavily
        if (key === 'syllabic' || key === 'consonantal' || key === 'sonorant') {
          distance += 2.5; 
        } else if (key === 'stress') {
          distance += 0.5; // Stress mismatch is minor
        } else if (key === 'long') {
          distance += 0.8; // Length mismatch
        } else {
          distance += 1.0;
        }
      }
    }
  }

  return distance;
};

/**
 * Enhanced IPA Tokenizer.
 * Segments: [Stress] + [Base] + [Tie+Base]* + [Modifiers/Diacritics]*
 * Also supports '.' as a distinct token for syllable boundaries.
 */
export const tokenizeIPA = (word: string): string[] => {
  const modifiers = `[${combiningRange}${spacingModifierRange}${toneLetters}]`;
  const stress = `[${stressMarks}]`;

  // Pattern: Optional Stress -> Base -> (Tie+Base repeats) -> Any number of modifiers
  // OR: Literal dot for syllable boundary
  // OR: Literal comma for cognate set boundary
  const pattern = new RegExp(
    `(?:${stress}?[${baseRange}](?:${tieBars}[${baseRange}])*${modifiers}*)|\\.|,`, 
    'gu'
  );

  return word.match(pattern) || [];
};

export const needlemanWunsch = (seqA: string[], seqB: string[], gapPenaltyParam: number = 10, unknownCharPenalty: number = 8): { alignedA: string[], alignedB: string[] } => {
  const scoreMatch = 6;
  const baseGapPenalty = -gapPenaltyParam;
  const baseTranspositionPenalty = -6; // Default penalty for metathesis

  const n = seqA.length;
  const m = seqB.length;
  const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

  // Helper for Gap Naturalness (Pillar 4)
  const getGapPenalty = (char: string, isFinal: boolean): number => {
    let penalty = baseGapPenalty;
    const f = getEffectiveFeatures(char);
    if (f) {
      // Deletion of word-final high vowels is very common
      if (isFinal && f.syllabic && f.high) {
        penalty = baseGapPenalty * 0.4; // 60% reduction in penalty
      }
      // Deletion of glottals/laryngeals is common
      else if (char === 'h' || char === 'ʔ') {
        penalty = baseGapPenalty * 0.6; // 40% reduction
      }
      // Deletion of unstressed short vowels is common
      else if (f.syllabic && !f.stress && !f.long) {
        penalty = baseGapPenalty * 0.8; // 20% reduction
      }
    }
    return penalty;
  };

  // Helper for Phonetic Metathesis (Phase 1 Upgrade)
  const getTranspositionPenalty = (char1: string, char2: string): number => {
    const son1 = getSonority(char1);
    const son2 = getSonority(char2);
    
    const isVowel1 = son1 === 10;
    const isVowel2 = son2 === 10;
    const isResonant1 = son1 >= 7 && son1 <= 9; // Glides, Liquids, Nasals
    const isResonant2 = son2 >= 7 && son2 <= 9;
    
    // Highly probable metathesis (e.g., er -> re) to optimize syllable structure
    if ((isVowel1 && isResonant2) || (isResonant1 && isVowel2)) {
      return -2; // Much lower penalty
    } 
    // Two consonants swapping (e.g., sk -> ks) is also somewhat common
    else if (son1 < 10 && son2 < 10) {
      return -4;
    }
    
    // Unlikely metathesis (e.g., swapping two vowels)
    return baseTranspositionPenalty;
  };

  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] + getGapPenalty(seqA[i - 1], i === n);
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = dp[0][j - 1] + getGapPenalty(seqB[j - 1], j === m);
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const distance = getPhoneticDistance(seqA[i - 1], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
      const matchScore = scoreMatch - distance; 
      
      const gapPenaltyA = getGapPenalty(seqA[i - 1], i === n);
      const gapPenaltyB = getGapPenalty(seqB[j - 1], j === m);

      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + matchScore,
        dp[i - 1][j] + gapPenaltyA,
        dp[i][j - 1] + gapPenaltyB
      );

      // Transposition check (Phonetic Damerau-Levenshtein)
      if (i > 1 && j > 1) {
        const distCross1 = getPhoneticDistance(seqA[i - 1], seqB[j - 2], gapPenaltyParam, unknownCharPenalty);
        const distCross2 = getPhoneticDistance(seqA[i - 2], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
        const distStraight1 = getPhoneticDistance(seqA[i - 1], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
        const distStraight2 = getPhoneticDistance(seqA[i - 2], seqB[j - 2], gapPenaltyParam, unknownCharPenalty);

        if (distCross1 + distCross2 < distStraight1 + distStraight2 && distCross1 < 5 && distCross2 < 5) {
          const dynamicTransPenalty = getTranspositionPenalty(seqA[i - 2], seqA[i - 1]);
          const transScore = (scoreMatch * 2) - (distCross1 + distCross2) + dynamicTransPenalty;
          dp[i][j] = Math.max(dp[i][j], dp[i - 2][j - 2] + transScore);
        }
      }
    }
  }

  let i = n, j = m;
  const alignedA: string[] = [], alignedB: string[] = [];

  while (i > 0 || j > 0) {
    if (i > 1 && j > 1) {
      const distCross1 = getPhoneticDistance(seqA[i - 1], seqB[j - 2], gapPenaltyParam, unknownCharPenalty);
      const distCross2 = getPhoneticDistance(seqA[i - 2], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
      const distStraight1 = getPhoneticDistance(seqA[i - 1], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
      const distStraight2 = getPhoneticDistance(seqA[i - 2], seqB[j - 2], gapPenaltyParam, unknownCharPenalty);

      if (distCross1 + distCross2 < distStraight1 + distStraight2 && distCross1 < 5 && distCross2 < 5) {
        const dynamicTransPenalty = getTranspositionPenalty(seqA[i - 2], seqA[i - 1]);
        const transScore = (scoreMatch * 2) - (distCross1 + distCross2) + dynamicTransPenalty;
        
        if (Math.abs(dp[i][j] - (dp[i - 2][j - 2] + transScore)) < 0.001) {
          alignedA.unshift(seqA[i - 1]);
          alignedB.unshift(seqB[j - 1]);
          alignedA.unshift(seqA[i - 2]);
          alignedB.unshift(seqB[j - 2]);
          i -= 2;
          j -= 2;
          continue;
        }
      }
    }

    if (i > 0 && j > 0) {
      const matchScore = scoreMatch - getPhoneticDistance(seqA[i - 1], seqB[j - 1], gapPenaltyParam, unknownCharPenalty);
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchScore)) < 0.001) {
        alignedA.unshift(seqA[i - 1]);
        alignedB.unshift(seqB[j - 1]);
        i--; j--;
        continue;
      }
    }
    
    const gapPenaltyA = i > 0 ? getGapPenalty(seqA[i - 1], i === n) : 0;
    
    if (i > 0 && (j === 0 || Math.abs(dp[i][j] - (dp[i - 1][j] + gapPenaltyA)) < 0.001)) {
      alignedA.unshift(seqA[i - 1]);
      alignedB.unshift(GAP_CHAR);
      i--;
    } else {
      alignedA.unshift(GAP_CHAR);
      alignedB.unshift(seqB[j - 1]);
      j--;
    }
  }

  return { alignedA, alignedB };
};

export const describeFeatures = (char: string): string => {
  if (char === '.') return "Syllable Break";
  
  const f = getEffectiveFeatures(char);
  if (!f) return "Unknown Segment";
  
  const parts = [];
  if (f.stress) parts.push("Stressed");
  if (f.long) parts.push("Long");
  if (f.voice) parts.push("Voiced"); else parts.push("Voiceless");
  if (f.nasal) parts.push("Nasal");
  if (f.labial) parts.push("Labial");
  if (f.coronal) parts.push("Coronal");
  if (f.dorsal) parts.push("Dorsal");
  if (f.spreadGlottis) parts.push("Aspirated");
  if (f.constrictedGlottis) parts.push("Glottalized/Ejective");
  
  if (f.tone !== 0) parts.push(f.tone > 0 ? "High/Rising Tone" : "Low/Falling Tone");

  if (f.syllabic) parts.push("Vowel");
  else if (f.consonantal) parts.push("Consonant");
  
  return parts.join(" ");
};

export const evaluateNaturalness = (
  pChar: string, 
  rChar: string, 
  leftEnv: string | null, 
  rightEnv: string | null
): { score: number, category: string } => {
  if (pChar === GAP_CHAR || rChar === GAP_CHAR) {
      return { score: 0.5, category: 'Other' }; // Epenthesis/Deletion
  }

  const pFeat = getEffectiveFeatures(pChar);
  const rFeat = getEffectiveFeatures(rChar);
  
  if (!pFeat || !rFeat) return { score: 0.01, category: 'Other' };

  const leftFeat = leftEnv && leftEnv !== GAP_CHAR ? getEffectiveFeatures(leftEnv) : null;
  const rightFeat = rightEnv && rightEnv !== GAP_CHAR ? getEffectiveFeatures(rightEnv) : null;

  const typology = scoreFeatureTransition(pFeat, rFeat, leftFeat, rightFeat);
  if (typology) {
    return { score: typology.probability, category: typology.name };
  }

  // Fallback to basic feature distance penalty
  const distance = getPhoneticDistance(pChar, rChar);
  return { score: Math.max(0.01, 1 - (distance / 10)), category: 'Other' };
};
