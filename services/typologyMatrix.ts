import { DistinctiveFeatures } from '../types';
import { getEffectiveFeatures } from './phonetics';

export interface FeatureTransition {
  name: string;
  condition: (from: DistinctiveFeatures, to: DistinctiveFeatures, left: DistinctiveFeatures | null, right: DistinctiveFeatures | null) => boolean;
  probability: number; // 0.0 to 1.0
}

export const TYPOLOGY_MATRIX: FeatureTransition[] = [
  {
    name: 'Intervocalic Voicing (Lenition)',
    condition: (f, t, l, r) => !f.voice && t.voice && !!l?.syllabic && !!r?.syllabic,
    probability: 0.9
  },
  {
    name: 'Intervocalic Spirantization (Lenition)',
    condition: (f, t, l, r) => !f.continuant && t.continuant && !!l?.syllabic && !!r?.syllabic,
    probability: 0.85
  },
  {
    name: 'Word-Initial Fortition',
    condition: (f, t, l, r) => f.continuant && !t.continuant && !l,
    probability: 0.6
  },
  {
    name: 'Palatalization before Front Vowels',
    condition: (f, t, l, r) => (f.coronal || f.dorsal) && t.coronal && t.high && !!r?.syllabic && !r.back,
    probability: 0.85
  },
  {
    name: 'Word-Final Devoicing',
    condition: (f, t, l, r) => f.voice && !t.voice && !r,
    probability: 0.95
  },
  {
    name: 'Nasal Assimilation (Place)',
    condition: (f, t, l, r) => f.nasal && t.nasal && !!r?.consonantal && (t.labial === r.labial && t.coronal === r.coronal && t.dorsal === r.dorsal),
    probability: 0.9
  },
  {
    name: 'Unnatural Labial to Velar',
    condition: (f, t, l, r) => f.labial && !f.dorsal && t.dorsal && !t.labial && !r,
    probability: 0.01 // Heavily penalized
  },
  {
    name: 'Vowel Raising before High Vowels',
    condition: (f, t, l, r) => f.syllabic && t.syllabic && !f.high && t.high && !!r?.syllabic && r.high,
    probability: 0.7
  },
  {
    name: 'Vowel Lowering before Low Vowels',
    condition: (f, t, l, r) => f.syllabic && t.syllabic && !f.low && t.low && !!r?.syllabic && r.low,
    probability: 0.7
  },
  {
    name: 'Rhotacism',
    condition: (f, t, l, r) => f.coronal && f.continuant && f.strident && t.sonorant && t.continuant && t.coronal && !!l?.syllabic && !!r?.syllabic, // s > r / V_V
    probability: 0.8
  },
  {
    name: 'Consonant Cluster Simplification',
    condition: (f, t, l, r) => f.consonantal && t.consonantal && ((!!l?.consonantal && !r) || (!l && !!r?.consonantal)),
    probability: 0.75
  },
  {
    name: 'Vowel Nasalization before Nasal',
    condition: (f, t, l, r) => f.syllabic && !f.nasal && t.syllabic && t.nasal && !!r?.nasal,
    probability: 0.9
  },
  {
    name: 'Vowel Deletion (Syncope)',
    condition: (f, t, l, r) => f.syllabic && !t.syllabic && !!l?.consonantal && !!r?.consonantal,
    probability: 0.6
  },
  {
    name: 'Vowel Deletion (Apocope)',
    condition: (f, t, l, r) => f.syllabic && !t.syllabic && !!l?.consonantal && !r,
    probability: 0.7
  },
  {
    name: 'Consonant Deletion (Word-Final)',
    condition: (f, t, l, r) => f.consonantal && !t.consonantal && !r,
    probability: 0.8
  },
  {
    name: 'Consonant Deletion (Intervocalic)',
    condition: (f, t, l, r) => f.consonantal && !t.consonantal && !!l?.syllabic && !!r?.syllabic,
    probability: 0.6
  },
  {
    name: 'Vocalization of Velars',
    condition: (f, t, l, r) => f.consonantal && f.dorsal && t.syllabic && !!l?.syllabic,
    probability: 0.6
  },
  {
    name: 'Vocalization of Laterals',
    condition: (f, t, l, r) => f.consonantal && f.lateral && t.syllabic && !!l?.syllabic,
    probability: 0.7
  },
  {
    name: 'Spirantization of Velars',
    condition: (f, t, l, r) => f.dorsal && !f.continuant && t.continuant && !!l?.syllabic && !!r?.syllabic,
    probability: 0.8
  },
  {
    name: 'Spirantization of Labials',
    condition: (f, t, l, r) => f.labial && !f.continuant && t.continuant && !!l?.syllabic && !!r?.syllabic,
    probability: 0.8
  },
  {
    name: 'Spirantization of Coronals',
    condition: (f, t, l, r) => f.coronal && !f.continuant && t.continuant && !!l?.syllabic && !!r?.syllabic,
    probability: 0.8
  },
  {
    name: 'Debuccalization (s > h)',
    condition: (f, t, l, r) => f.coronal && f.strident && f.continuant && !t.coronal && t.continuant && t.spreadGlottis,
    probability: 0.8
  },
  {
    name: 'Debuccalization (t > ʔ)',
    condition: (f, t, l, r) => f.coronal && !f.continuant && !t.coronal && !t.continuant && t.constrictedGlottis,
    probability: 0.7
  },
  {
    name: 'Fronting of Velars',
    condition: (f, t, l, r) => f.dorsal && t.coronal && !!r?.syllabic && !r.back,
    probability: 0.85
  },
  {
    name: 'Backing of Coronals',
    condition: (f, t, l, r) => f.coronal && t.dorsal && !!r?.syllabic && r.back,
    probability: 0.6
  },
  {
    name: 'Rounding Assimilation',
    condition: (f, t, l, r) => f.syllabic && !f.round && t.syllabic && t.round && !!r?.syllabic && r.round,
    probability: 0.8
  },
  {
    name: 'Unrounding Assimilation',
    condition: (f, t, l, r) => f.syllabic && f.round && t.syllabic && !t.round && !!r?.syllabic && !r.round,
    probability: 0.8
  },
  {
    name: 'Vowel Lengthening (Compensatory)',
    condition: (f, t, l, r) => f.syllabic && !f.long && t.syllabic && t.long && !!r?.consonantal, // simplified
    probability: 0.6
  },
  {
    name: 'Vowel Shortening',
    condition: (f, t, l, r) => f.syllabic && f.long && t.syllabic && !t.long,
    probability: 0.7
  },
  {
    name: 'Glide Hardening',
    condition: (f, t, l, r) => !f.consonantal && f.sonorant && !f.syllabic && t.consonantal && !t.sonorant,
    probability: 0.6
  },
  {
    name: 'Glide Formation',
    condition: (f, t, l, r) => f.syllabic && t.sonorant && !t.syllabic && !t.consonantal && !!r?.syllabic,
    probability: 0.8
  },
  {
    name: 'Assibilation',
    condition: (f, t, l, r) => f.coronal && !f.strident && t.strident && !!r?.syllabic && r.high && !r.back,
    probability: 0.8
  },
  {
    name: 'Affrication',
    condition: (f, t, l, r) => !f.delayedRelease && t.delayedRelease && !!r?.syllabic && r.high && !r.back,
    probability: 0.7
  },
  {
    name: 'Deaffrication',
    condition: (f, t, l, r) => f.delayedRelease && !t.delayedRelease && t.continuant,
    probability: 0.8
  }
];

export function scoreFeatureTransition(from: DistinctiveFeatures, to: DistinctiveFeatures, left: DistinctiveFeatures | null, right: DistinctiveFeatures | null): { name: string, probability: number } | null {
  for (const transition of TYPOLOGY_MATRIX) {
    if (transition.condition(from, to, left, right)) {
      return { name: transition.name, probability: transition.probability };
    }
  }
  return null;
}
