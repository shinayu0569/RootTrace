
import { DistinctiveFeatures } from '../types';
import { FEATURE_MAP, getEffectiveFeatures, getToneDistance } from './phonetics';

// Extend DistinctiveFeatures to include the character symbol for rules that check specific segments
export interface DistinctiveFeaturesWithSymbol extends DistinctiveFeatures {
  symbol: string;
}

export interface ChangeContext {
  left: DistinctiveFeatures | null;
  right: DistinctiveFeatures | null;
  leftChar: string | null;
  rightChar: string | null;
}

export interface SoundChangeRule {
  name: string;
  priority: number; // Higher priority rules trigger first
  test: (p: DistinctiveFeaturesWithSymbol, r: DistinctiveFeaturesWithSymbol, ctx: ChangeContext) => boolean;
  description: (p: string, r: string, ctx: ChangeContext) => string;
}

/**
 * Helper to analyze the specific feature differences between two phonemes.
 * Returns a naturalistic list of changes (e.g. "devoicing", "raising").
 */
export function analyzeFeatureDelta(p: DistinctiveFeatures, r: DistinctiveFeatures): string[] {
  const changes: string[] = [];

  // Laryngeal / Phonation
  if (p.voice !== r.voice) changes.push(r.voice ? "voicing" : "devoicing");
  if (p.spreadGlottis !== r.spreadGlottis) changes.push(r.spreadGlottis ? "aspiration" : "deaspiration");
  if (p.constrictedGlottis !== r.constrictedGlottis) changes.push(r.constrictedGlottis ? "glottalization" : "deglottalization");

  // Manner
  if (p.nasal !== r.nasal) changes.push(r.nasal ? "nasalization" : "denasalization");
  if (!p.continuant && r.continuant && p.consonantal === r.consonantal) changes.push("spirantization");
  if (p.continuant && !r.continuant && p.consonantal === r.consonantal) changes.push("occlusivization");
  if (!p.lateral && r.lateral) changes.push("lateralization");
  if (p.consonantal && !r.consonantal && r.sonorant) changes.push("vocalization");
  if (!p.consonantal && r.consonantal) changes.push("fortition");
  if (!p.delayedRelease && r.delayedRelease) changes.push("affrication");
  if (p.delayedRelease && !r.delayedRelease) changes.push("deaffrication");

  // Suprasegmentals
  if (p.long !== r.long) changes.push(r.long ? "lengthening" : "shortening");
  if (p.stress !== r.stress) changes.push(r.stress ? "stress assignment" : "destressing");
  // Feature 4.3: Use getToneDistance for proper ToneContour comparison
  if (p.tone && r.tone) {
    if (getToneDistance(p.tone, r.tone) > 0.5) changes.push("tonal shift");
  } else if (p.tone !== r.tone) {
    changes.push("tonal shift");
  }

  // Place (Consonants)
  if (p.consonantal) {
    if (!p.labial && r.labial) changes.push("labialization");
    if (!p.coronal && r.coronal) changes.push("coronalization");
    if (p.dorsal !== r.dorsal) {
      if (r.dorsal) changes.push("velarization");
    }
    if (!p.high && r.high) changes.push("palatalization");
    if (p.back && !r.back) changes.push("fronting");
    if (!p.back && r.back) changes.push("backing");
    if (!p.round && r.round) changes.push("rounding");
  }

  // Vowels
  if (p.syllabic && r.syllabic) {
    if (!p.high && r.high) changes.push("raising");
    if (p.high && !r.high) changes.push("lowering");
    if (p.back && !r.back) changes.push("fronting");
    if (!p.back && r.back) changes.push("backing");
    if (!p.round && r.round) changes.push("rounding");
    if (p.round && !r.round) changes.push("unrounding");
    if (p.tense && !r.tense) changes.push("laxing");
    if (!p.tense && r.tense) changes.push("tensing");
  }

  return changes;
}

/**
 * Extended Database of Diachronic Sound Shifts based on Index Diachronica patterns.
 * Priorities: 1 (General) to 10 (Specific/Contextual).
 */
export const NATURAL_SOUND_CHANGES: SoundChangeRule[] = [
  // --- STRUCTURAL CHANGES ---
  {
    name: 'Apocope',
    priority: 10,
    test: () => false, // Handled explicitly in identifySoundChange logic
    description: (p) => `Loss of word-final *${p}`
  },
  
  // --- CONSONANTAL PLACE SHIFTS ---
  {
    name: 'Velar Palatalization',
    priority: 9,
    test: (p, r, ctx) => p.dorsal && (r.coronal || (r.dorsal && r.high)) && r.strident && 
                         (!!ctx.right && (ctx.right.high || ctx.right.syllabic) && !ctx.right.back),
    description: (p, r, ctx) => `Velar *${p} palatalized to ${r} before front vowel/glide`
  },
  {
    name: 'Assibilation',
    priority: 8,
    test: (p, r, ctx) => p.consonantal && !p.continuant && !p.strident && r.strident && !!ctx.right && ctx.right.high,
    description: (p, r) => `Stop *${p} assibilated to ${r} before high vowel`
  },
  {
    name: 'Labialization',
    priority: 7,
    test: (p, r, ctx) => !p.round && r.round && !!ctx.right && ctx.right.round,
    description: (p, r) => `*${p} labialized to ${r} under influence of following round vowel`
  },
  {
    name: 'Debuccalization',
    priority: 8,
    test: (p, r) => p.consonantal && !p.spreadGlottis && (r.symbol === 'h' || r.symbol === 'ʔ'),
    description: (p, r) => `Oral consonant *${p} debuccalized to glottal [${r}]`
  },
  
  // --- LENITION CHAINS ---
  {
    name: 'Intervocalic Voicing',
    priority: 8,
    test: (p, r, ctx) => !p.voice && r.voice && p.consonantal && !!ctx.left?.syllabic && !!ctx.right?.syllabic,
    description: (p, r) => `Voiceless *${p} voiced to ${r} between vowels`
  },
  {
    name: 'Intervocalic Spirantization',
    priority: 8,
    test: (p, r, ctx) => !p.continuant && r.continuant && p.consonantal && r.consonantal && !!ctx.left?.syllabic && !!ctx.right?.syllabic,
    description: (p, r) => `Stop *${p} spirantized to ${r} between vowels`
  },
  {
    name: 'Spirantization',
    priority: 6,
    test: (p, r) => !p.continuant && r.continuant && p.consonantal && r.consonantal && p.labial === r.labial && p.coronal === r.coronal && p.dorsal === r.dorsal,
    description: (p, r) => `Stop *${p} weakened to fricative ${r}`
  },
  {
    name: 'Approximantization',
    priority: 5,
    test: (p, r) => p.consonantal && !r.consonantal && r.sonorant && !r.syllabic,
    description: (p, r) => `Consonant *${p} weakened to approximant/glide ${r}`
  },
  {
    name: 'L-Vocalization',
    priority: 9,
    test: (p, r) => p.lateral && (r.symbol === 'w' || r.symbol === 'u' || r.symbol === 'o'),
    description: (p, r) => `Lateral *${p} vocalized to ${r}`
  },

  // --- FORTITION ---
  {
    name: 'Glide Hardening',
    priority: 7,
    test: (p, r) => !p.consonantal && p.sonorant && r.consonantal && !r.sonorant, // e.g. j -> dʒ, w -> v
    description: (p, r) => `Glide *${p} hardened to obstruent ${r}`
  },
  {
    name: 'Final Devoicing',
    priority: 8,
    test: (p, r, ctx) => p.voice && !r.voice && (!ctx.right || ctx.rightChar === '-'),
    description: (p, r) => `Word-final devoicing of *${p}`
  },

  // --- MANNER CHANGES ---
  {
    name: 'Deaffrication',
    priority: 7,
    test: (p, r) => p.delayedRelease && !r.delayedRelease && r.continuant,
    description: (p, r) => `Affricate *${p} simplified to fricative ${r}`
  },
  {
    name: 'Rhotacism',
    priority: 9,
    test: (p, r, ctx) => (p.symbol === 's' || p.symbol === 'z') && (r.symbol === 'r' || r.symbol === 'ɾ') && !!ctx.left?.syllabic && !!ctx.right?.syllabic,
    description: (p, r) => `Intervocalic *${p} rhotacized to ${r}`
  },
  {
    name: 'Lambdacism',
    priority: 7,
    test: (p, r) => (p.symbol === 'd' || p.symbol === 't' || p.symbol === 'r') && r.lateral,
    description: (p, r) => `*${p} shifted to lateral ${r}`
  },
  {
    name: 'Nasal Assimilation',
    priority: 8,
    test: (p, r, ctx) => p.nasal && r.nasal && !!ctx.right && ctx.right.consonantal && 
                         ((ctx.right.labial && r.labial) || (ctx.right.dorsal && r.dorsal) || (ctx.right.coronal && r.coronal)) &&
                         (p.labial !== r.labial || p.dorsal !== r.dorsal),
    description: (p, r, ctx) => `Nasal *${p} assimilated to place of following [${ctx.rightChar}]`
  },
  {
    name: 'Aspiration Loss',
    priority: 6,
    test: (p, r) => p.spreadGlottis && !r.spreadGlottis && p.voice === r.voice,
    description: (p, r) => `Deaspiration of *${p}`
  },
  {
    name: 'Betacism',
    priority: 8,
    test: (p, r) => p.symbol === 'w' && (r.symbol === 'v' || r.symbol === 'β' || r.symbol === 'b'),
    description: (p, r) => `Labio-velar approximant *${p} hardened to ${r} (Betacism)`
  },
  {
    name: 'Palatalization of Alveolars',
    priority: 9,
    test: (p, r, ctx) => p.coronal && !p.delayedRelease && r.delayedRelease && !!ctx.right && ctx.right.high && !ctx.right.back,
    description: (p, r) => `Alveolar *${p} palatalized to affricate ${r} before front vowel/glide`
  },
  {
    name: 'Satemization',
    priority: 8,
    test: (p, r) => p.dorsal && p.high && !p.back && r.coronal && r.continuant,
    description: (p, r) => `Palatovelar *${p} fronted to sibilant ${r} (Satemization)`
  },
  {
    name: 'Labiovelar Shift',
    priority: 8,
    test: (p, r) => p.dorsal && p.round && r.labial && !r.dorsal,
    description: (p, r) => `Labiovelar *${p} shifted to labial ${r}`
  },
  {
    name: 'Spirantization (Grimm\'s Law)',
    priority: 8,
    test: (p, r) => !p.voice && !p.continuant && p.consonantal && !r.voice && r.continuant && r.consonantal,
    description: (p, r) => `Voiceless stop *${p} spirantized to fricative ${r}`
  },
  {
    name: 'Devoicing (Grimm\'s Law)',
    priority: 8,
    test: (p, r) => p.voice && !p.continuant && p.consonantal && !r.voice && !r.continuant && r.consonantal,
    description: (p, r) => `Voiced stop *${p} devoiced to ${r}`
  },
  {
    name: 'Deaspiration (Grimm\'s Law)',
    priority: 8,
    test: (p, r) => p.voice && p.spreadGlottis && r.voice && !r.spreadGlottis,
    description: (p, r) => `Voiced aspirate *${p} deaspirated to ${r}`
  },
  {
    name: 'Debuccalization of Sibilants',
    priority: 8,
    test: (p, r) => p.coronal && p.strident && p.continuant && r.symbol === 'h',
    description: (p, r) => `Sibilant *${p} debuccalized to ${r}`
  },
  {
    name: 'Degemination',
    priority: 7,
    test: (p, r) => p.long && p.consonantal && !r.long && r.consonantal,
    description: (p, r) => `Geminate *${p} simplified to ${r}`
  },

  // --- VOWEL SHIFTS ---
  {
    name: 'Umlaut (i-mutation)',
    priority: 9,
    test: (p, r, ctx) => p.syllabic && r.syllabic && p.back && !r.back && 
                         (!!ctx.right && ctx.right.high && !ctx.right.back),
    description: (p, r) => `Back vowel *${p} fronted to ${r} due to following high front segment (Umlaut)`
  },
  {
    name: 'Vowel Harmony (Front/Back)',
    priority: 8,
    test: (p, r, ctx) => p.syllabic && r.syllabic && p.back !== r.back && 
                         ((!!ctx.left?.syllabic && ctx.left.back === r.back) || (!!ctx.right?.syllabic && ctx.right.back === r.back)),
    description: (p, r) => `Vowel *${p} assimilated in backness to adjacent vowel (Vowel Harmony)`
  },
  {
    name: 'Vowel Reduction',
    priority: 6,
    test: (p, r) => p.syllabic && r.syllabic && (p.low || p.high) && !r.low && !r.high && !r.round && !r.back, // Roughly checking for schwa-like qualities
    description: (p, r) => `Vowel *${p} reduced to ${r}`
  },
  {
    name: 'Compensatory Lengthening',
    priority: 7,
    test: (p, r, ctx) => p.syllabic && r.syllabic && !p.long && r.long && ctx.right === null && ctx.leftChar !== '-', // Crude check for loss of following char
    description: (p, r) => `Lengthening of *${p} to ${r} (likely compensatory)`
  },
  {
    name: 'Diphthongization',
    priority: 7,
    test: (p, r) => p.syllabic && !r.syllabic && (r.symbol.length > 1 || ['ai', 'au', 'ei', 'ou', 'oi'].includes(r.symbol)), // Symbol check for complex segments
    description: (p, r) => `Breaking/Diphthongization of *${p} to ${r}`
  },
  {
    name: 'Monophthongization',
    priority: 7,
    test: (p, r, ctx) => ctx.left?.syllabic && !ctx.left?.consonantal && r.syllabic && p.symbol !== r.symbol,
    description: (p, r) => `Monophthongization merging *${p} into ${r}`
  },
  {
    name: 'Vowel Raising',
    priority: 5,
    test: (p, r) => p.syllabic && r.syllabic && !p.high && r.high,
    description: (p, r) => `Raising of *${p} to ${r}`
  },
  {
    name: 'Vowel Lowering',
    priority: 5,
    test: (p, r) => p.syllabic && r.syllabic && p.high && !r.high,
    description: (p, r) => `Lowering of *${p} to ${r}`
  },
  {
    name: 'Nasalization',
    priority: 8,
    test: (p, r, ctx) => p.syllabic && !p.nasal && r.nasal && (!!ctx.right?.nasal || !!ctx.left?.nasal),
    description: (p, r) => `Vowel *${p} nasalized due to proximity of nasal consonant`
  },
  {
    name: 'Vowel Centralization',
    priority: 6,
    test: (p, r) => p.syllabic && r.syllabic && p.back && !r.back && !r.high && !r.low,
    description: (p, r) => `Vowel *${p} centralized to ${r}`
  },
  {
    name: 'Syncope',
    priority: 8,
    test: (p, r, ctx) => p.syllabic && (r.symbol === '-' || r.symbol === '∅') && !!ctx.left?.consonantal && !!ctx.right?.consonantal,
    description: (p, r) => `Medial vowel *${p} lost via syncope`
  },
  {
    name: 'Apocope',
    priority: 8,
    test: (p, r, ctx) => p.syllabic && (r.symbol === '-' || r.symbol === '∅') && (!ctx.right || ctx.rightChar === '-'),
    description: (p, r) => `Final vowel *${p} lost via apocope`
  },
  {
    name: 'Aphaeresis',
    priority: 8,
    test: (p, r, ctx) => p.syllabic && (r.symbol === '-' || r.symbol === '∅') && (!ctx.left || ctx.leftChar === '-'),
    description: (p, r) => `Initial vowel *${p} lost via aphaeresis`
  },
  {
    name: 'Prothesis',
    priority: 9,
    test: (p, r, ctx) => p.symbol === '-' && r.syllabic && !!ctx.right?.strident && ctx.rightChar !== null,
    description: (p, r) => `Prothetic vowel ${r} inserted before sibilant cluster`
  }
];

export const identifySoundChange = (protoChar: string, reflexChar: string, leftChar: string | null, rightChar: string | null): { name: string, description: string } => {
  // 1. Load Features
  // Fallback to base character if modifier not found
  const fP = getEffectiveFeatures(protoChar);
  const fR = getEffectiveFeatures(reflexChar);
  
  if (!fP || !fR) {
    if (reflexChar === '-' || reflexChar === '∅') {
      const isFinal = !rightChar || rightChar === '-';
      const isInitial = !leftChar || leftChar === '-';
      
      if (isFinal) return { name: 'Apocope', description: `Loss of word-final *${protoChar}` };
      if (isInitial) return { name: 'Aphaeresis', description: `Loss of word-initial *${protoChar}` };
      return { name: 'Syncope', description: `Elision of *${protoChar} in medial position` };
    }

    if (protoChar === '-' || protoChar === '∅') {
      const isInitial = !leftChar || leftChar === '-';
      if (isInitial) return { name: 'Prothesis', description: `Prothetic insertion of ${reflexChar}` };
      return { name: 'Epenthesis', description: `Epenthetic insertion of ${reflexChar}` };
    }
    return { name: 'Unknown Shift', description: `*${protoChar} → ${reflexChar}` };
  }

  // 2. Populate Context
  const ctx: ChangeContext = {
    left: leftChar && leftChar !== '-' ? getEffectiveFeatures(leftChar) : null,
    right: rightChar && rightChar !== '-' ? getEffectiveFeatures(rightChar) : null,
    leftChar: leftChar === '-' ? null : leftChar,
    rightChar: rightChar === '-' ? null : rightChar,
  };

  // Add symbol to features for specific checks
  const fP_full: DistinctiveFeaturesWithSymbol = { ...fP, symbol: protoChar };
  const fR_full: DistinctiveFeaturesWithSymbol = { ...fR, symbol: reflexChar };

  // 3. Algorithmic Description using Feature Deltas
  const changes = analyzeFeatureDelta(fP, fR);

  // 4. Check Named Rules (Sorted by priority)
  const matchedRules = NATURAL_SOUND_CHANGES
    .filter(rule => rule.test(fP_full, fR_full, ctx))
    .sort((a, b) => b.priority - a.priority);

  if (matchedRules.length > 0) {
    const rule = matchedRules[0];
    const featureChangeStr = changes.length > 0 ? ` (${changes.join(", ")})` : '';
    return { name: rule.name, description: rule.description(protoChar, reflexChar, ctx) + featureChangeStr };
  }
  
  let desc = `*${protoChar} became ${reflexChar}`;
  let name = 'Phonetic Shift';

  if (changes.length > 0) {
    // Check for assimilation
    const assimilatedToLeft = ctx.left && changes.some(c => {
      if (c === 'voicing' && ctx.left?.voice) return true;
      if (c === 'nasalization' && ctx.left?.nasal) return true;
      if (c === 'palatalization' && ctx.left?.high && !ctx.left?.back) return true;
      if (c === 'labialization' && ctx.left?.round) return true;
      if (c === 'fronting' && !ctx.left?.back) return true;
      if (c === 'backing' && ctx.left?.back) return true;
      return false;
    });
    
    const assimilatedToRight = ctx.right && changes.some(c => {
      if (c === 'voicing' && ctx.right?.voice) return true;
      if (c === 'nasalization' && ctx.right?.nasal) return true;
      if (c === 'palatalization' && ctx.right?.high && !ctx.right?.back) return true;
      if (c === 'labialization' && ctx.right?.round) return true;
      if (c === 'fronting' && !ctx.right?.back) return true;
      if (c === 'backing' && ctx.right?.back) return true;
      return false;
    });

    if (assimilatedToLeft && assimilatedToRight) {
       name = 'Assimilation';
       desc = `Assimilation to surrounding environment: ${changes.join(", ")} of *${protoChar} to ${reflexChar}`;
    } else if (assimilatedToLeft) {
       name = 'Progressive Assimilation';
       desc = `Progressive assimilation to preceding [${ctx.leftChar}]: ${changes.join(", ")} of *${protoChar} to ${reflexChar}`;
    } else if (assimilatedToRight) {
       name = 'Regressive Assimilation';
       desc = `Regressive assimilation to following [${ctx.rightChar}]: ${changes.join(", ")} of *${protoChar} to ${reflexChar}`;
    } else {
       const changeList = changes.join(", ");
       const upperChange = changeList.charAt(0).toUpperCase() + changeList.slice(1);
       name = changes[0].charAt(0).toUpperCase() + changes[0].slice(1);
       desc = `${upperChange} of *${protoChar} to ${reflexChar}`;
    }
  }

  return { name, description: desc };
};
