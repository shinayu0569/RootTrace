export interface DistinctiveFeatures {
  // Major Class Features
  syllabic: boolean;
  consonantal: boolean;
  sonorant: boolean;
  
  // Laryngeal Features
  voice: boolean;
  spreadGlottis: boolean;
  constrictedGlottis: boolean;

  // Manner Features
  continuant: boolean;
  nasal: boolean;
  strident: boolean;
  lateral: boolean;
  delayedRelease: boolean;

  // Place Features (Primary nodes)
  labial: boolean;
  coronal: boolean;
  dorsal: boolean;
  pharyngeal: boolean;
  laryngeal: boolean;
  
  // Specific Place Features
  alveolar: boolean;
  palatal: boolean;
  velar: boolean;
  uvular: boolean;
  glottal: boolean;
  retroflex: boolean;

  // Vowel Specifics
  high: boolean;
  mid: boolean;
  low: boolean;
  front: boolean;
  central: boolean;
  back: boolean;
  round: boolean;
  tense: boolean;

  // Secondary Articulations
  labialized: boolean;
  palatalized: boolean;
  velarized: boolean;
  pharyngealized: boolean;

  // Suprasegmentals & Diacritics
  long: boolean;
  stress: boolean;
  tone?: ToneContour;  // UPDATED: Proper contour representation (Feature 4.3)
}

/**
 * Feature 4.3: Tone Contour Representation
 * Replaces simple `tone: number` with proper contour support for:
 * - Tone contours (rising, falling, dipping) using Chao tone letters
 * - Register distinctions (high/mid/low level tones)
 * - Downstep and upstep
 */
export interface ToneContour {
  levels: number[];   // sequence of Chao tone letters (1=low, 5=high), e.g., [3,5] = rising 35
  register?: 'default' | 'downstepped' | 'upstepped';
}

export interface PhonemeDef {
  symbol: string;
  features: DistinctiveFeatures;
}

export interface LanguageInput {
  id: string;
  name: string;
  word: string;
  spelling?: string;
  gloss?: string;
  descendants?: LanguageInput[];
  attestationYear?: number;
  isLoan?: boolean;
  isUnattested?: boolean;    // ADD: marks a language as phonetically unknown (no direct attestation)
}

export interface ReconstructionParams {
  mcmcIterations: number;
  gapPenalty: number;
  unknownCharPenalty: number;
}

/**
 * Feature 2.1: Cognate-Set Batch Mode
 * Groups LanguageInput records by gloss for batch reconstruction.
 * The correspondence table accumulates counts across all sets before reconstruction,
 * making regularity scores statistically meaningful.
 */
export interface CognateSet {
  gloss: string;           // The meaning/concept (e.g., "hand", "water", "to run")
  forms: LanguageInput[];  // Language forms for this gloss
  cognacyGroup?: string;   // Optional grouping for cognacy sets (for loanword detection)
}

/**
 * Feature 5.3: Paradigm/Conjugation Layer
 * Represents an inflectional or derivational paradigm for a lexeme.
 * Supports conjugation (verbal), declension (nominal), and adjectival paradigms.
 */
export interface ParadigmCell {
  form: string;           // Phonetic form (IPA)
  gloss: string;          // Grammatical gloss (e.g., "1SG.PRES", "NOM.SG", "ACC.PL")
  isIrregular?: boolean;    // Flag for forms that don't follow regular sound changes
}

export interface Paradigm {
  id: string;             // Unique identifier for the paradigm
  lexeme: string;         // Citation form / dictionary headword
  languageId: string;     // ID of the language this paradigm belongs to
  languageName: string;   // Display name of the language
  paradigmType: 'verbal' | 'nominal' | 'adjectival' | 'pronominal';
  cells: ParadigmCell[];
  reconstructedStem?: string;  // Filled after reconstruction
}

/**
 * Feature 2.1: Batch Reconstruction Result
 * Contains reconstructed forms for multiple cognate sets,
 * with accumulated correspondence statistics.
 */
export interface BatchReconstructionResult {
  protoLanguage: string;
  individualResults: Map<string, ReconstructionResult>;  // gloss -> result
  accumulatedCorrespondences: CorrespondenceTable;
  regularityScores: Map<string, number>;  // correspondence key -> regularity (0-1)
}

/**
 * Feature 2.1: Correspondence Table Entry
 * Accumulates evidence across multiple cognate sets.
 */
export interface CorrespondenceTable {
  [columnKey: string]: {
    [phoneme: string]: number;  // count of occurrences
  };
}

/**
 * §0 — COGNATE COMPATIBILITY FLAG
 * Produced by the NED + SCA-class pre-screening step (§1 Core Methodology).
 * Each pair of input forms is scored with:
 *   nedDistance   — Normalized Edit Distance on phoneme token arrays (0=identical, 1=fully different)
 *   scaClassMatch — Proportion of aligned positions sharing the same SCA broad class (0–1)
 *
 * Verdict heuristics:
 *   'possible_loan'  — ned < 0.20 AND scaMatch > 0.80  (suspiciously similar → recent borrowing)
 *   'questionable'   — ned > 0.80 OR  scaMatch < 0.20  (too dissimilar → uncertain cognacy)
 *   'cognate'        — everything in between (expected regular divergence pattern)
 */
export interface CognateCompatibilityFlag {
  langA: string;
  langB: string;
  nedDistance: number;
  scaClassMatch: number;
  verdict: 'cognate' | 'possible_loan' | 'questionable';
}

/**
 * §4b / §8 — PHYLOGENETIC SPREAD SCORE
 * Per-column score indicating how many independent top-level lineages
 * contribute non-gap evidence to that alignment column.
 *
 * A low spread (< 0.50) means the correspondence is attested in fewer
 * than half the independent lineages — it may be an areal / contact feature
 * rather than an inherited one (Sprachbund detection heuristic).
 * Columns with spread < 0.33 receive reduced weight in voting (§2 weighting).
 */
export interface PhylogeneticSpreadScore {
  columnId: number;
  spread: number;           // 0–1; fraction of lineages with non-gap evidence
  evidencingLineages: number;
  totalLineages: number;
}

export interface ReconstructionResult {
  protoForm: string;
  protoTokens: string[];
  confidence: number;
  alignmentMatrix: string[][];
  soundChanges: SoundChangeNote[];
  inferredShifts: InferredShift[];
  generalizedLaws?: GeneralizedSoundLaw[];
  exceptions?: string[];
  treeData: TreeNode;
  distribution?: { [phoneme: string]: number }[];
  candidates?: { form: string; probability: number }[];
  languageWeights?: number[];
  simulationErrorRate?: number;

  /**
   * §0 — NED + SCA-class cognate compatibility flags for every input pair.
   * 'possible_loan' or 'questionable' pairs are flagged for human review.
   */
  cognateCompatibilityFlags?: CognateCompatibilityFlag[];

  /**
   * §4b — Phylogenetic spread per alignment column (0–1).
   * Values below 0.5 suggest an areal rather than inherited correspondence.
   */
  phylogeneticSpreadScores?: PhylogeneticSpreadScore[];

  /**
   * §8 — Analogical leveling detection flags.
   * Strings describe specific languages and positions where suspicious
   * paradigm-uniform reflexes may have erased inherited alternations.
   */
  analogicalLevelingFlags?: string[];

  /**
   * §0 — User-facing warnings about reconstruction conditions.
   * E.g., missing attestation years disables chronological weighting.
   */
  warnings?: string[];

  /**
   * §1 — Per-column regularity score (0–1).
   * Implements the Neogrammarian regularity criterion computationally:
   * 1.0 = all attested reflexes are regular (match proto or via natural rule).
   * < 0.6 = irregular correspondence, should be flagged for manual review.
   */
  regularityScores?: number[];

  /**
   * §8 — Per-segment confidence tiers (naturalism enhancement).
   * Breaks down the scalar confidence into segment-level tiers:
   *   secure (>0.85), probable (0.65-0.85), uncertain (0.45-0.65), highly_uncertain (<0.45)
   * Each segment includes alternative reconstructions with their probabilities.
   */
  segmentConfidence?: SegmentConfidence[];
}

/**
 * Feature 5.5: Per-Segment Confidence Tiering
 * Provides granular confidence information for each proto-segment.
 */
export interface SegmentConfidence {
  segment: string;
  tier: 'secure' | 'probable' | 'uncertain' | 'highly_uncertain';
  probability: number;
  alternatives: { phoneme: string; probability: number }[];
  supportingLanguages: string[];
  conflictingLanguages: string[];
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
  isUnattested?: boolean;
}

export interface EvolverNode {
  id: string;
  name: string;
  wordsText: string;
  subStages: number;
  subStageWeights?: number[];   // ADD: relative temporal positions, must sum to 1.0 (e.g., [0.2, 0.5, 0.3])
  descendants: EvolverNode[];
}

export enum ReconstructionMethod {
  FEATURE_WEIGHTED = 'FEATURE_WEIGHTED',
  BAYESIAN_MCMC = 'BAYESIAN_MCMC',
  BAYESIAN_AI = 'BAYESIAN_AI'
}