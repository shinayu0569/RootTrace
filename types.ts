
export interface DistinctiveFeatures {
  // Major Class Features
  syllabic: boolean;     // Vowels vs Glides/Consonants
  consonantal: boolean;  // True consonants (stops, fricatives, nasals, liquids)
  sonorant: boolean;     // Vowels, glides, liquids, nasals
  
  // Laryngeal Features
  voice: boolean;        // Vibrating vocal cords
  spreadGlottis: boolean; // Aspiration /h/
  constrictedGlottis: boolean; // Glottal stop / ejectives

  // Manner Features
  continuant: boolean;   // Airflow is not blocked (Fricatives, vowels, glides)
  nasal: boolean;        // Airflow through nose
  strident: boolean;     // High frequency noise (s, z, sh, ch)
  lateral: boolean;      // Airflow around sides (l)
  delayedRelease: boolean; // Affricates

  // Place Features
  labial: boolean;       // Lips (p, b, m, f)
  coronal: boolean;      // Tongue tip/blade (t, d, n, s)
  dorsal: boolean;       // Tongue body (k, g, vowels)
  
  // Vowel/Dorsal Specifics
  high: boolean;
  low: boolean;
  back: boolean;
  round: boolean;
  tense: boolean;        // i vs ɪ

  // Suprasegmentals & Diacritics
  long: boolean;         // Length (ː)
  stress: boolean;       // Stress (ˈ, ˌ)
  tone: number;          // 0: Neutral, >0 High/Rising, <0 Low/Falling (Generic representation)
}

export interface PhonemeDef {
  symbol: string;
  features: DistinctiveFeatures;
}

export interface LanguageInput {
  id: string;
  name: string;
  word: string; // The raw IPA string (actual pronunciation)
  spelling?: string; // Optional spelling in IPA (reflects older pronunciation)
  gloss?: string;
  descendants?: LanguageInput[]; // Recursive descendants
}

export interface ReconstructionParams {
  mcmcIterations: number;
  gapPenalty: number;
  unknownCharPenalty: number;
}

export interface ReconstructionResult {
  protoForm: string;
  protoTokens: string[]; // NEW: The actual tokens of the proto-form
  confidence: number;
  alignmentMatrix: string[][]; // Rows are languages, cols are segments
  soundChanges: SoundChangeNote[];
  inferredShifts: InferredShift[]; // NEW: Hypothesized changes
  generalizedLaws?: GeneralizedSoundLaw[]; // NEW: Generalized laws
  exceptions?: string[]; // NEW: Exceptions to sound laws
  treeData: TreeNode;
  distribution?: { [phoneme: string]: number }[]; // Prob of each char at each position
  candidates?: { form: string; probability: number }[]; // Alternative whole-word hypotheses
  languageWeights?: number[]; // PILLAR 5: Conservatism weights
}

export interface SoundChangeNote {
  language: string;
  from: string;
  to: string;
  environment: string;
  name: string;
  description: string;
}

export interface GeneralizedSoundLaw {
  language: string;
  name: string;
  description: string;
  examples: string[];
  naturalnessScore: number;
  typologicalCategory: string;
  stage?: number;
  ruleString?: string;
  isSporadic?: boolean;
  isException?: boolean;
  applicationRate?: number;
}

export interface InferredShift {
  language: string;
  from: string;
  to: string;
  environment: string;
  naturalnessScore: number;
  typologicalCategory: string;
}

export interface TreeNode {
  name: string;
  children?: TreeNode[];
  distance?: number;
  reconstruction?: string;
}

export interface EvolverNode {
  id: string;
  name: string;
  wordsText: string;
  subStages: number;
  descendants: EvolverNode[];
}

export enum ReconstructionMethod {
  FEATURE_WEIGHTED = 'FEATURE_WEIGHTED',
  BAYESIAN_MCMC = 'BAYESIAN_MCMC'
}
