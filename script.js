// ========== IPA Feature Sets ==========

// ========== IPA Feature Sets (Expanded) ==========

const featureMap = {
  // Stops (Pulmonic)
  'p': { place: 'bilabial', manner: 'stop', voice: 'voiceless' },
  'b': { place: 'bilabial', manner: 'stop', voice: 'voiced' },
  't': { place: 'alveolar', manner: 'stop', voice: 'voiceless' },
  'd': { place: 'alveolar', manner: 'stop', voice: 'voiced' },
  'ʈ': { place: 'retroflex', manner: 'stop', voice: 'voiceless' },
  'ɖ': { place: 'retroflex', manner: 'stop', voice: 'voiced' },
  'c': { place: 'palatal', manner: 'stop', voice: 'voiceless' },
  'ɟ': { place: 'palatal', manner: 'stop', voice: 'voiced' },
  'k': { place: 'velar', manner: 'stop', voice: 'voiceless' },
  'g': { place: 'velar', manner: 'stop', voice: 'voiced' },
  'q': { place: 'uvular', manner: 'stop', voice: 'voiceless' },
  'ɢ': { place: 'uvular', manner: 'stop', voice: 'voiced' },
  'ʡ': { place: 'epiglottal', manner: 'stop', voice: 'voiceless' },
  'ʔ': { place: 'glottal', manner: 'stop', voice: 'voiceless' },

  // Nasals (Pulmonic)
  'm': { place: 'bilabial', manner: 'nasal', voice: 'voiced' },
  'ɱ': { place: 'labiodental', manner: 'nasal', voice: 'voiced' },
  'n': { place: 'alveolar', manner: 'nasal', voice: 'voiced' },
  'ɳ': { place: 'retroflex', manner: 'nasal', voice: 'voiced' },
  'ɲ': { place: 'palatal', manner: 'nasal', voice: 'voiced' },
  'ŋ': { place: 'velar', manner: 'nasal', voice: 'voiced' },
  'ɴ': { place: 'uvular', manner: 'nasal', voice: 'voiced' },

  // Fricatives (Pulmonic)
  'ɸ': { place: 'bilabial', manner: 'fricative', voice: 'voiceless' },
  'β': { place: 'bilabial', manner: 'fricative', voice: 'voiced' },
  'f': { place: 'labiodental', manner: 'fricative', voice: 'voiceless' },
  'v': { place: 'labiodental', manner: 'fricative', voice: 'voiced' },
  'θ': { place: 'dental', manner: 'fricative', voice: 'voiceless' },
  'ð': { place: 'dental', manner: 'fricative', voice: 'voiced' },
  's': { place: 'alveolar', manner: 'fricative', voice: 'voiceless' },
  'z': { place: 'alveolar', manner: 'fricative', voice: 'voiced' },
  'ʃ': { place: 'postalveolar', manner: 'fricative', voice: 'voiceless' },
  'ʒ': { place: 'postalveolar', manner: 'fricative', voice: 'voiced' },
  'ɕ': { place: 'alveolo-palatal', manner: 'fricative', voice: 'voiceless' },
  'ʑ': { place: 'alveolo-palatal', manner: 'fricative', voice: 'voiced' },
  'ʂ': { place: 'retroflex', manner: 'fricative', voice: 'voiceless' },
  'ʐ': { place: 'retroflex', manner: 'fricative', voice: 'voiced' },
  'ç': { place: 'palatal', manner: 'fricative', voice: 'voiceless' },
  'ʝ': { place: 'palatal', manner: 'fricative', voice: 'voiced' },
  'x': { place: 'velar', manner: 'fricative', voice: 'voiceless' },
  'ɣ': { place: 'velar', manner: 'fricative', voice: 'voiced' },
  'χ': { place: 'uvular', manner: 'fricative', voice: 'voiceless' },
  'ʁ': { place: 'uvular', manner: 'fricative', voice: 'voiced' },
  'ħ': { place: 'pharyngeal', manner: 'fricative', voice: 'voiceless' },
  'ʕ': { place: 'pharyngeal', manner: 'fricative', voice: 'voiced' },
  'h': { place: 'glottal', manner: 'fricative', voice: 'voiceless' },
  'ɦ': { place: 'glottal', manner: 'fricative', voice: 'voiced' },

  // Lateral fricatives
  'ɬ': { place: 'alveolar', manner: 'lateral fricative', voice: 'voiceless' },
  'ɮ': { place: 'alveolar', manner: 'lateral fricative', voice: 'voiced' },

  // Approximants (Pulmonic)
  'ʋ': { place: 'labiodental', manner: 'approximant', voice: 'voiced' },
  'ɹ': { place: 'alveolar', manner: 'approximant', voice: 'voiced' },
  'ɻ': { place: 'retroflex', manner: 'approximant', voice: 'voiced' },
  'j': { place: 'palatal', manner: 'approximant', voice: 'voiced' },
  'ɰ': { place: 'velar', manner: 'approximant', voice: 'voiced' },
  'w': { place: 'labial-velar', manner: 'approximant', voice: 'voiced' },

  // Laterals (Pulmonic)
  'l': { place: 'alveolar', manner: 'lateral approximant', voice: 'voiced' },
  'ɭ': { place: 'retroflex', manner: 'lateral approximant', voice: 'voiced' },
  'ʎ': { place: 'palatal', manner: 'lateral approximant', voice: 'voiced' },
  'ʟ': { place: 'velar', manner: 'lateral approximant', voice: 'voiced' },

  // Trills (Pulmonic)
  'ʙ': { place: 'bilabial', manner: 'trill', voice: 'voiced' },
  'r': { place: 'alveolar', manner: 'trill', voice: 'voiced' },
  'ʀ': { place: 'uvular', manner: 'trill', voice: 'voiced' },

  // Flaps/Taps (Pulmonic)
  'ⱱ': { place: 'labiodental', manner: 'tap', voice: 'voiced' },
  'ɾ': { place: 'alveolar', manner: 'tap', voice: 'voiced' },
  'ɽ': { place: 'retroflex', manner: 'tap', voice: 'voiced' },

  // Affricates (all main IPA, no diacritics)
  't͡s': { place: 'alveolar', manner: 'affricate', voice: 'voiceless' },
  'd͡z': { place: 'alveolar', manner: 'affricate', voice: 'voiced' },
  't͡ɕ': { place: 'alveolo-palatal', manner: 'affricate', voice: 'voiceless' },
  'd͡ʑ': { place: 'alveolo-palatal', manner: 'affricate', voice: 'voiced' },
  't͡ʃ': { place: 'postalveolar', manner: 'affricate', voice: 'voiceless' },
  'd͡ʒ': { place: 'postalveolar', manner: 'affricate', voice: 'voiced' },
  'ʈ͡ʂ': { place: 'retroflex', manner: 'affricate', voice: 'voiceless' },
  'ɖ͡ʐ': { place: 'retroflex', manner: 'affricate', voice: 'voiced' },
  'c͡ç': { place: 'palatal', manner: 'affricate', voice: 'voiceless' },
  'ɟ͡ʝ': { place: 'palatal', manner: 'affricate', voice: 'voiced' },
  'k͡x': { place: 'velar', manner: 'affricate', voice: 'voiceless' },
  'g͡ɣ': { place: 'velar', manner: 'affricate', voice: 'voiced' },
  'q͡χ': { place: 'uvular', manner: 'affricate', voice: 'voiceless' },
  'ɢ͡ʁ': { place: 'uvular', manner: 'affricate', voice: 'voiced' },

  // Clicks (with voiceless, voiced, nasalized)
  'ʘ': { place: 'bilabial', manner: 'click', voice: 'voiceless' },
  'ǀ': { place: 'dental', manner: 'click', voice: 'voiceless' },
  'ǃ': { place: 'postalveolar', manner: 'click', voice: 'voiceless' },
  'ǂ': { place: 'palatal', manner: 'click', voice: 'voiceless' },
  'ǁ': { place: 'lateral', manner: 'click', voice: 'voiceless' },
  // Voiced clicks (symbol + ɡ)
  'ɡʘ': { place: 'bilabial', manner: 'click', voice: 'voiced' },
  'ɡǀ': { place: 'dental', manner: 'click', voice: 'voiced' },
  'ɡǃ': { place: 'postalveolar', manner: 'click', voice: 'voiced' },
  'ɡǂ': { place: 'palatal', manner: 'click', voice: 'voiced' },
  'ɡǁ': { place: 'lateral', manner: 'click', voice: 'voiced' },
  // Nasal clicks (ŋ + click)
  'ŋʘ': { place: 'bilabial', manner: 'click', voice: 'nasal' },
  'ŋǀ': { place: 'dental', manner: 'click', voice: 'nasal' },
  'ŋǃ': { place: 'postalveolar', manner: 'click', voice: 'nasal' },
  'ŋǂ': { place: 'palatal', manner: 'click', voice: 'nasal' },
  'ŋǁ': { place: 'lateral', manner: 'click', voice: 'nasal' },

  // Implosives (voiced)
  'ɓ': { place: 'bilabial', manner: 'implosive', voice: 'voiced' },
  'ɗ': { place: 'alveolar', manner: 'implosive', voice: 'voiced' },
  'ʄ': { place: 'palatal', manner: 'implosive', voice: 'voiced' },
  'ɠ': { place: 'velar', manner: 'implosive', voice: 'voiced' },
  'ʛ': { place: 'uvular', manner: 'implosive', voice: 'voiced' },

  // Vowels (all main IPA vowels)
  'i': { height: 'close', frontness: 'front', rounded: false },
  'y': { height: 'close', frontness: 'front', rounded: true },
  'ɨ': { height: 'close', frontness: 'central', rounded: false },
  'ʉ': { height: 'close', frontness: 'central', rounded: true },
  'ɯ': { height: 'close', frontness: 'back', rounded: false },
  'u': { height: 'close', frontness: 'back', rounded: true },
  'ɪ': { height: 'near-close', frontness: 'front', rounded: false },
  'ʏ': { height: 'near-close', frontness: 'front', rounded: true },
  'ʊ': { height: 'near-close', frontness: 'back', rounded: true },
  'e': { height: 'close-mid', frontness: 'front', rounded: false },
  'ø': { height: 'close-mid', frontness: 'front', rounded: true },
  'ɘ': { height: 'close-mid', frontness: 'central', rounded: false },
  'ɵ': { height: 'close-mid', frontness: 'central', rounded: true },
  'ɤ': { height: 'close-mid', frontness: 'back', rounded: false },
  'o': { height: 'close-mid', frontness: 'back', rounded: true },
  'ə': { height: 'mid', frontness: 'central', rounded: false },
  'ɛ': { height: 'open-mid', frontness: 'front', rounded: false },
  'œ': { height: 'open-mid', frontness: 'front', rounded: true },
  'ɜ': { height: 'open-mid', frontness: 'central', rounded: false },
  'ɞ': { height: 'open-mid', frontness: 'central', rounded: true },
  'ʌ': { height: 'open-mid', frontness: 'back', rounded: false },
  'ɔ': { height: 'open-mid', frontness: 'back', rounded: true },
  'æ': { height: 'near-open', frontness: 'front', rounded: false },
  'ɐ': { height: 'near-open', frontness: 'central', rounded: false },
  'a': { height: 'open', frontness: 'front', rounded: false },
  'ɶ': { height: 'open', frontness: 'front', rounded: true },
  'ɑ': { height: 'open', frontness: 'back', rounded: false },
  'ɒ': { height: 'open', frontness: 'back', rounded: true }
};

const vowels = [
  "i", "y", "ɨ", "ʉ", "ɯ", "u",
  "ɪ", "ʏ", "ʊ",
  "e", "ø", "ɘ", "ɵ", "ɤ", "o",
  "ə",
  "ɛ", "œ", "ɜ", "ɞ", "ʌ", "ɔ",
  "æ", "ɐ",
  "a", "ɶ", "ɑ", "ɒ"
];

const consonants = [
  // Pulmonic consonants (all places and manners)
  "p", "b", "t", "d", "ʈ", "ɖ", "c", "ɟ", "k", "g", "q", "ɢ", "ʡ", "ʔ",
  "m", "ɱ", "n", "ɳ", "ɲ", "ŋ", "ɴ",
  "ʙ", "r", "ʀ",
  "ⱱ", "ɾ", "ɽ",
  "ɸ", "β", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "ʂ", "ʐ", "ç", "ʝ", "x", "ɣ", "χ", "ʁ", "ħ", "ʕ", "h", "ɦ",
  "ɬ", "ɮ",
  "ʋ", "ɹ", "ɻ", "j", "ɰ",
  "l", "ɭ", "ʎ", "ʟ",
  // Implosives
  "ɓ", "ɗ", "ʄ", "ɠ", "ʛ",
  // Clicks (basic forms)
  "ʘ", "ǀ", "ǃ", "ǂ", "ǁ",
  // Voiced clicks
  "ɡʘ", "ɡǀ", "ɡǃ", "ɡǂ", "ɡǁ",
  // Nasal clicks
  "ŋʘ", "ŋǀ", "ŋǃ", "ŋǂ", "ŋǁ"
];

const affricates = [
  "t͡s", "d͡z",
  "t͡ɕ", "d͡ʑ",
  "t͡ʃ", "d͡ʒ",
  "ʈ͡ʂ", "ɖ͡ʐ",
  "c͡ç", "ɟ͡ʝ",
  "k͡x", "g͡ɣ",
  "q͡χ", "ɢ͡ʁ"
];

const ipaFeatures = {
  vowels,
  consonants,
  affricates
};

const soundChanges = {
  lenition: [
    { from: "p", to: "b", environment: "V_V" }, // Intervocalic voicing
    { from: "t", to: "d", environment: "V_V" },
    { from: "k", to: "g", environment: "V_V" },
    { from: "s", to: "z", environment: "V_V" },
    { from: "b", to: "β", environment: "V_V" }, // Spirantization
    { from: "d", to: "ð", environment: "V_V" },
    { from: "g", to: "ɣ", environment: "V_V" },
    { from: "v", to: "β", environment: "V_V" },
    { from: "z", to: "ʒ", environment: "V_V" },
    { from: "ʒ", to: "j", environment: "V_V" }, // Further lenition
    { from: "d", to: "r", environment: "V_V" }, // Rhoticization
    { from: "t", to: "ɾ", environment: "V_V" }, // Tap
    { from: "k", to: "x", environment: "V_V" }, // Spirantization
    { from: "g", to: "ɰ", environment: "V_V" }, // Approximant
    // More lenition rules
  ],

  fortition: [
    { from: "β", to: "b", environment: "#_" }, // Word-initial strengthening
    { from: "ð", to: "d", environment: "#_" },
    { from: "ɣ", to: "g", environment: "#_" },
    { from: "ɾ", to: "t", environment: "#_" },
    { from: "j", to: "dʒ", environment: "#_" },
    // More fortition rules
  ],

  palatalization: [
    { from: "k", to: "tʃ", environment: "_i" }, // Palatalization before front vowels
    { from: "k", to: "c", environment: "_j" },
    { from: "g", to: "dʒ", environment: "_i" },
    { from: "g", to: "ɟ", environment: "_j" },
    { from: "t", to: "tʃ", environment: "_i" },
    { from: "d", to: "dʒ", environment: "_i" },
    { from: "n", to: "ɲ", environment: "_i" },
    { from: "s", to: "ʃ", environment: "_i" },
    { from: "l", to: "ʎ", environment: "_i" },
    // More palatalization rules
  ],

  depalatalization: [
    { from: "tʃ", to: "t", environment: "_a" }, // Before back vowels
    { from: "dʒ", to: "d", environment: "_a" },
    { from: "ʃ", to: "s", environment: "_a" },
    { from: "ʎ", to: "l", environment: "_a" },
    // More depalatalization rules
  ],

  assimilation: [
    { from: "n", to: "m", environment: "_p" }, // Place assimilation
    { from: "n", to: "ŋ", environment: "_k" },
    { from: "n", to: "ɲ", environment: "_j" },
    { from: "s", to: "ʃ", environment: "_ʃ" }, // Regressive
    { from: "d", to: "t", environment: "_t" }, // Voicing assimilation
    // More assimilation rules
  ],

  dissimilation: [
    { from: "r", to: "l", environment: "r_r" }, // Liquid dissimilation
    { from: "n", to: "l", environment: "n_n" },
    // More dissimilation rules
  ],

  metathesis: [
    { from: "CV", to: "VC", environment: "" }, // General metathesis
    // More metathesis rules
  ],

  epenthesis: [
    { from: "", to: "ə", environment: "C_C" }, // Schwa insertion
    { from: "", to: "t", environment: "s_s" }, // Stop insertion
    // More epenthesis rules
  ],

  deletion: [
    { from: "t", to: "", environment: "_#" }, // Word-final stop deletion
    { from: "ə", to: "", environment: "V_V" }, // Syncope
    { from: "n", to: "", environment: "_s" }, // Cluster simplification
    // More deletion rules
  ],

  vowelHarmony: {
    frontBack: true,
    rounding: true,
    height: false
  },

  vowelChanges: [
    { from: "i", to: "e", environment: "" }, // Lowering
    { from: "e", to: "i", environment: "" }, // Raising
    { from: "a", to: "æ", environment: "" }, // Fronting
    { from: "u", to: "o", environment: "" }, // Lowering
    { from: "o", to: "u", environment: "" }, // Raising
    { from: "a", to: "ə", environment: "V_V" }, // Reduction
    // More vowel changes
  ]
};

// ========== Utility Functions ==========
function splitGroups(input) {
  return input.trim().split(/\n+/).map(g => g.trim().split(/\s+/));
}

function syllabify(word) {
  return word.includes(".") ? word.split(".") : null;
}

function extractStress(word) {
  return word.includes("ˈ") ? word.indexOf("ˈ") : null;
}

function tokenizeIPA(word) {
  const allPhonemes = [...affricates, ...consonants, ...vowels];
  let result = [];
  let i = 0;
  while (i < word.length) {
    let match = allPhonemes.find(p => word.startsWith(p, i));
    if (match) {
      result.push(match);
      i += match.length;
    } else {
      i++; // skip unknown or diacritic for now
    }
  }
  return result;
}

function detectSoundChanges(group) {
  // Identify potential sound changes that might have happened
  // This can help determine which forms are innovations vs. retentions
  let changes = [];
  
  // Implementation would involve comparing cognate sets and finding patterns
  // This is a simplified version
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const word1 = tokenizeIPA(group[i]);
      const word2 = tokenizeIPA(group[j]);
      
      // Compare phonemes at each position
      const minLength = Math.min(word1.length, word2.length);
      for (let k = 0; k < minLength; k++) {
        if (word1[k] !== word2[k]) {
          // Potential sound change
          changes.push({
            from: word1[k],
            to: word2[k],
            position: k,
            context: getPhoneticContext(word1, k)
          });
        }
      }
    }
  }
  
  return changes;
}

function weightedReconstruction(group) {
  // First get the basic reconstruction candidates
  const phonemeLists = group.map(tokenizeIPA);
  const maxLen = Math.max(...phonemeLists.map(x => x.length));
  let candidates = [];

  for (let i = 0; i < maxLen; i++) {
    const column = phonemeLists.map(p => p[i]).filter(Boolean);
    if (column.length === 0) continue;
    
    // Calculate the likelihood of each phoneme being the proto-form
    let scores = {};
    for (let p of column) {
      scores[p] = 0;
      
      // Check if this could be the result of a common sound change
      for (let otherP of column) {
        if (p === otherP) continue;
        
        // Check if this is a known sound change
        if (isKnownSoundChange(p, otherP)) {
          // Give higher score to the form that would be the source
          scores[p] += 2; 
        }
        
        // Give higher scores to phonemes that are typologically more common in proto-languages
        scores[p] += getTypologicalFrequency(p);
        
        // Consider phoneme stability (some phonemes change less often)
        scores[p] += getPhonemeStability(p);
      }
    }
    
    // Sort by score and keep the top candidates
    const rankedCandidates = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
      
    candidates.push(rankedCandidates.slice(0, 3)); // Keep top 3 candidates
  }

  return combineCandidates(candidates);
}

function isKnownSoundChange(source, result) {
  // Expanded list of common sound changes, including more manners, places, and vowels
  const commonChanges = {
    // Lenition and voicing
    "p": ["b", "β", "f", "v", "ɸ"],
    "b": ["β", "v", "p"],
    "t": ["d", "ð", "θ", "s", "ɾ", "ʃ", "ts", "tʃ"],
    "d": ["ð", "z", "t", "ɾ", "ʒ", "dz", "dʒ"],
    "k": ["g", "ɣ", "x", "c", "tʃ", "q", "ʔ"],
    "g": ["ɣ", "x", "k", "ɰ", "ʁ"],
    "f": ["v", "β", "ɸ"],
    "v": ["β", "f"],
    "s": ["z", "ʃ", "h", "θ"],
    "z": ["ʒ", "s"],
    "ʃ": ["ʒ", "s", "ç"],
    "ʒ": ["ʃ", "z", "j"],
    "θ": ["ð", "s"],
    "ð": ["θ", "d", "z"],
    "x": ["ɣ", "k", "h"],
    "ɣ": ["x", "g", "ʁ"],
    "h": ["ɦ", "x", "ʔ"],
    "ɦ": ["h"],
    "m": ["ɱ", "n"],
    "n": ["ŋ", "ɲ", "m", "ɳ"],
    "ŋ": ["n", "ɲ"],
    "ɲ": ["n", "ŋ"],
    "l": ["ɫ", "ʎ", "r"],
    "r": ["ɾ", "l"],
    "ɾ": ["r", "d", "t"],
    "j": ["ʝ", "i"],
    "w": ["v", "u"],

    // Palatalization
    "k": ["c", "tʃ", "t͡ɕ", "ɕ"],
    "g": ["ɟ", "dʒ", "d͡ʑ", "ʑ"],
    "t": ["tʃ", "t͡ɕ", "ʃ", "ɕ"],
    "d": ["dʒ", "d͡ʑ", "ʒ", "ʑ"],
    "n": ["ɲ"],
    "l": ["ʎ"],

    // Depalatalization
    "tʃ": ["t", "ts", "ʃ", "s"],
    "dʒ": ["d", "dz", "ʒ", "z"],
    "ʃ": ["s", "tʃ"],
    "ʒ": ["z", "dʒ"],
    "ɲ": ["n"],
    "ʎ": ["l"],

    // Affrication
    "t": ["ts", "tʃ"],
    "d": ["dz", "dʒ"],
    "s": ["ts"],
    "z": ["dz"],

    // Deaffrication
    "ts": ["s", "t"],
    "dz": ["z", "d"],
    "tʃ": ["ʃ", "t"],
    "dʒ": ["ʒ", "d"],

    // Vowel raising/lowering
    "i": ["ɪ", "e", "j"],
    "ɪ": ["i", "e"],
    "e": ["ɛ", "i", "ə"],
    "ɛ": ["e", "æ", "a"],
    "a": ["æ", "ɑ", "ə"],
    "æ": ["a", "ɛ"],
    "ɑ": ["a", "ɒ"],
    "ɒ": ["ɑ", "ɔ"],
    "u": ["ʊ", "o", "w"],
    "ʊ": ["u", "o"],
    "o": ["ɔ", "u", "ə"],
    "ɔ": ["o", "ɒ"],
    "ə": ["a", "e", "o"],

    // Diphthongization/monophthongization (simplified)
    "e": ["ei", "ie"],
    "o": ["ou", "uo"],
    "ai": ["e", "a"],
    "au": ["o", "a"],

    // Nasalization
    "a": ["ã"],
    "e": ["ẽ"],
    "i": ["ĩ"],
    "o": ["õ"],
    "u": ["ũ"],

    // Glottalization
    "t": ["ʔ"],
    "k": ["ʔ"],

    // Miscellaneous
    "ʔ": [""], // deletion
    "h": [""], // deletion
    "ə": [""], // syncope
    "n": [""], // deletion in clusters
    "t": [""], // word-final deletion
  };

  // Also allow for reverse direction (e.g., b > p)
  if (commonChanges[source]?.includes(result)) return true;
  // Check if the reverse is a known change (less common, but possible)
  if (commonChanges[result]?.includes(source)) return true;
  return false;
}

function getTypologicalFrequency(phoneme) {
  // Simplified frequency data based on UPSID and other databases
  const frequencies = {
    "m": 0.94, "k": 0.89, "j": 0.84, "i": 0.92, "a": 0.88, "u": 0.88,
    "p": 0.83, "w": 0.76, "n": 0.73, "s": 0.83, "h": 0.73, "t": 0.98,
    // Add more frequencies
  };
  
  return frequencies[phoneme] || 0.5; // Default medium frequency
}

function getPhonemeStability(phoneme) {
  // Some phonemes are more resistant to change
  const stability = {
    "m": 0.9, "n": 0.85, "k": 0.8, "p": 0.8, "t": 0.8,
    "i": 0.85, "a": 0.9, "u": 0.85,
    // More stability values
  };
  
  return stability[phoneme] || 0.5;
}

function findCorrespondences(groups) {
  let correspondences = {};
  
  groups.forEach(group => {
    const tokenizedWords = group.map(tokenizeIPA);
    const maxLen = Math.max(...tokenizedWords.map(w => w.length));
    
    for (let i = 0; i < maxLen; i++) {
      const column = tokenizedWords.map(w => w[i] || "_").filter(p => p !== "_");
      if (column.length < 2) continue;
      
      // Create a correspondence set
      const key = column.join(":");
      if (!correspondences[key]) {
        correspondences[key] = {
          phonemes: column,
          count: 1,
          positions: [i]
        };
      } else {
        correspondences[key].count++;
        correspondences[key].positions.push(i);
      }
    }
  });
  
  return correspondences;
}

function applyCorrespondences(correspondences, group) {
  // For each position in the group, check if a correspondence set exists
  // If so, prefer the proto-phoneme inferred from previous data
  const tokenizedWords = group.map(tokenizeIPA);
  const maxLen = Math.max(...tokenizedWords.map(w => w.length));
  let protoForm = [];

  for (let i = 0; i < maxLen; i++) {
    const column = tokenizedWords.map(w => w[i] || "_").filter(p => p !== "_");
    if (column.length < 2) {
      protoForm.push(column[0] || "");
      continue;
    }
    const key = column.join(":");
    if (correspondences[key] && correspondences[key].proto) {
      protoForm.push(correspondences[key].proto);
    } else {
      // fallback: majority vote
      let counts = {};
      for (let p of column) counts[p] = (counts[p] || 0) + 1;
      const maxFreq = Math.max(...Object.values(counts));
      const top = Object.entries(counts).filter(([k, v]) => v === maxFreq)[0][0];
      protoForm.push(top);
    }
  }
  return protoForm.join("");
}

function detectMorphology(groups) {
  // Look for recurring patterns that might indicate morphemes
  const possibleAffixes = findRecurringPatterns(groups);
  
  return {
    possibleRoots: [],
    possiblePrefixes: possibleAffixes.filter(a => a.position === "start"),
    possibleSuffixes: possibleAffixes.filter(a => a.position === "end")
  };
}

function findRecurringPatterns(groups) {
  // Flatten all words in all groups
  const allWords = groups.flat();
  const minLength = 3; // Minimum length for a pattern to be considered
  let prefixCounts = {};
  let suffixCounts = {};

  // Count prefixes and suffixes
  allWords.forEach(word => {
    // Tokenize to phonemes for more accurate pattern finding
    const tokens = tokenizeIPA(word);
    // Check prefixes
    for (let len = 1; len <= Math.min(3, tokens.length); len++) {
      const prefix = tokens.slice(0, len).join("");
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    }
    // Check suffixes
    for (let len = 1; len <= Math.min(3, tokens.length); len++) {
      const suffix = tokens.slice(-len).join("");
      suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
    }
  });

  // Find recurring prefixes
  const possiblePrefixes = Object.entries(prefixCounts)
    .filter(([pat, count]) => count > 1 && pat.length >= minLength)
    .map(([pat]) => ({ pattern: pat, position: "start" }));

  // Find recurring suffixes
  const possibleSuffixes = Object.entries(suffixCounts)
    .filter(([pat, count]) => count > 1 && pat.length >= minLength)
    .map(([pat]) => ({ pattern: pat, position: "end" }));

  // Optionally, look for recurring infixes or roots (not implemented here)

  return [...possiblePrefixes, ...possibleSuffixes];
}

function applySyllableConstraints(candidates) {
  const syllablePatterns = {
    onsets: ["p", "t", "k", "b", "d", "g", "f", "s", "m", "n", "l", "r", "w", "j"],
    codas: ["p", "t", "k", "m", "n", "l", "r", "s"],
    clusters: {
      onset: ["pr", "tr", "kr", "pl", "kl", "sp", "st", "sk"],
      coda: ["mp", "nt", "ŋk", "lt", "rt", "st"]
    },
    // More syllable structure constraints
  };
  
  return candidates.filter(candidate => {
    const syllables = syllabify(candidate) || [candidate];
    
    // Check if syllables follow the constraints
    return syllables.every(syll => {
      // Analyze onset and coda
      // Return true if valid, false if invalid
      return true; // Simplified implementation
    });
  });
}

function reconstructProto(group) {
  const phonemeLists = group.map(tokenizeIPA);
  const maxLen = Math.max(...phonemeLists.map(x => x.length));
  let candidates = [];

  for (let i = 0; i < maxLen; i++) {
    const column = phonemeLists.map(p => p[i]).filter(Boolean);
    let counts = {};
    for (let p of column) counts[p] = (counts[p] || 0) + 1;
    const maxFreq = Math.max(...Object.values(counts));
    const topCandidates = Object.entries(counts).filter(([k, v]) => v === maxFreq);
    candidates.push(topCandidates.map(x => x[0]));
  }

  const stresses = group.map(extractStress).filter(v => v !== null);
  const stressPos = stresses.length ? mode(stresses) : null;
  const reconstructedForms = combineCandidates(candidates);
  return reconstructedForms.map(form => applyStress(form, stressPos));
}

function combineCandidates(candidates) {
  if (candidates.some(c => c.length > 1)) {
    return cartesian(candidates).map(arr => arr.join(""));
  } else {
    return [candidates.map(c => c[0]).join("")];
  }
}

function cartesian(arr) {
  return arr.reduce((acc, val) => acc.flatMap(d => val.map(e => [...d, e])), [[]]);
}

function applyStress(form, pos) {
  if (pos == null || pos >= form.length) return form;
  return form.slice(0, pos) + "ˈ" + form.slice(pos);
}

function mode(arr) {
  return Object.entries(arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0][0];
}

function highlightConservative(group, protoCandidates) {
  let distances = protoCandidates.map(proto => {
    return group.map(word => editDistance(tokenizeIPA(proto), tokenizeIPA(word))).reduce((a, b) => a + b);
  });
  const min = Math.min(...distances);
  const idx = distances.indexOf(min);
  return protoCandidates[idx];
}

function phonemeDistance(a, b) {
  if (a === b) return 0;
  const f1 = featureMap[a], f2 = featureMap[b];
  if (!f1 || !f2) return 2; // unknown phoneme, max penalty

  let score = 0;
  if (f1.place !== f2.place) score++;
  if (f1.manner !== f2.manner) score++;
  if (f1.voice !== f2.voice) score++;
  return score;
}

function editDistance(a, b) {
  const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i * 2;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j * 2;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = phonemeDistance(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost, // substitution
        dp[i][j - 1] + 2,       // insertion
        dp[i - 1][j] + 2        // deletion
      );
    }
  }

  return dp[a.length][b.length];
}

function generateEvolutionDiagram(proto, descendants, intermediates = []) {
  // Simple vertical tree: proto -> intermediates -> descendants
  let lines = [];
  lines.push(`  ${proto}`);
  if (intermediates.length > 0) {
    intermediates.forEach((inter, idx) => {
      lines.push(`   |`);
      lines.push(`  [${inter}]`);
    });
    lines.push(`   |`);
  } else {
    lines.push(`   |`);
  }
  // Draw branches to descendants
  if (descendants.length === 1) {
    lines.push(`  ${descendants[0]}`);
  } else {
    // Draw a fork
    lines.push(`  |`);
    for (let i = 0; i < descendants.length; i++) {
      lines.push(`  +-- ${descendants[i]}`);
    }
  }
  return lines.join('\n');
}

function generateEvolutionSVG(proto, descendants, intermediates = []) {
  // Responsive SVG with dynamic spacing
  const minWidth = 320;
  const nodeWidth = 90;
  const nodeHeight = 36;
  const hPad = 30;
  const vPad = 30;
  const fontSize = 18;
  const levels = 2 + intermediates.length;
  const width = Math.max(minWidth, descendants.length * (nodeWidth + hPad) + hPad);
  const height = (levels + 1) * (nodeHeight + vPad);

  // Calculate positions
  const nodes = [];
  let y = vPad + nodeHeight / 2;
  nodes.push({ text: proto, x: width / 2, y });

  intermediates.forEach((inter, i) => {
    y += nodeHeight + vPad;
    nodes.push({ text: inter, x: width / 2, y });
  });

  y += nodeHeight + vPad;
  const descY = y;
  const descCount = descendants.length;
  const descSpacing = descCount === 1 ? 0 : (width - 2 * hPad) / (descCount - 1);
  descendants.forEach((desc, i) => {
    const x = descCount === 1 ? width / 2 : hPad + i * descSpacing;
    nodes.push({ text: desc, x, y: descY });
  });

  // SVG elements
  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" class="evo-diagram">`;

  // Draw lines
  let prev = nodes[0];
  for (let i = 1; i < nodes.length - descendants.length; i++) {
    let curr = nodes[i];
    svg += `<line x1="${prev.x}" y1="${prev.y + nodeHeight / 2}" x2="${curr.x}" y2="${curr.y - nodeHeight / 2}" stroke="#4a90e2" stroke-width="2"/>`;
    prev = curr;
  }
  // Lines to descendants
  const lastInter = nodes[nodes.length - descendants.length - 1];
  descendants.forEach((desc, i) => {
    const descNode = nodes[nodes.length - descendants.length + i];
    svg += `<line x1="${lastInter.x}" y1="${lastInter.y + nodeHeight / 2}" x2="${descNode.x}" y2="${descNode.y - nodeHeight / 2}" stroke="#4a90e2" stroke-width="2"/>`;
  });

  // Draw nodes (rectangles and text)
  nodes.forEach(node => {
    svg += `<rect x="${node.x - nodeWidth / 2}" y="${node.y - nodeHeight / 2}" width="${nodeWidth}" height="${nodeHeight}" rx="10" fill="#f9f9f9" stroke="#4a90e2" stroke-width="1"/>`;
    svg += `<text x="${node.x}" y="${node.y + fontSize/3}" text-anchor="middle" font-size="${fontSize}" fill="#333" font-family="Noto Sans, sans-serif">${node.text}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function generateMermaidDiagram(proto, descendants, intermediates = []) {
  let lines = ['flowchart TD'];
  let prev = 'P0["' + proto + '"]';
  let nodeCount = 1;

  // Intermediates (optional)
  intermediates.forEach((inter, i) => {
    let node = `I${i}["${inter}"]`;
    lines.push(`${prev} --> ${node}`);
    prev = node;
    nodeCount++;
  });

  // Descendants
  descendants.forEach((desc, i) => {
    let node = `D${i}["${desc}"]`;
    lines.push(`${prev} --> ${node}`);
  });

  return lines.join('\n');
}

// ========== Integration ==========
function getSettingsFromUI() {
  return {
    considerSyllabification: document.getElementById("consider-syllabification").checked,
    considerStress: document.getElementById("consider-stress").checked,
    multiCharPhonemes: document.getElementById("multi-char-phonemes").checked,
    usePhoneticFeatures: document.getElementById("use-phonetic-features").checked
  };
}


function processInput(inputText) {
  const groups = splitGroups(inputText);
  return groups.map(group => {
    const recon = reconstructProto(group);
    const conservative = highlightConservative(group, recon);
    return {
      reconstructions: recon,
      conservative,
      group
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("input-text");
  const button = document.getElementById("reconstruct-btn");
  const outputDiv = document.getElementById("output");

  button.addEventListener("click", () => {
    const inputText = inputField.value;
    const results = processInput(inputText);
    outputDiv.innerHTML = "";

    results.forEach((res, index) => {
      const groupTitle = document.createElement("strong");
      groupTitle.textContent = `Group ${index + 1}`;
      outputDiv.appendChild(groupTitle);

      const ul = document.createElement("ul");
      res.reconstructions.forEach(form => {
        const li = document.createElement("li");
        li.textContent = form + (form === res.conservative ? " (most conservative)" : "");
        ul.appendChild(li);
      });
      outputDiv.appendChild(ul);

      // Mermaid diagram
      const mermaidCode = generateMermaidDiagram(
        res.conservative,
        res.group
        // Coming soon, add intermediates to be implemented 
      );
      const diagramDiv = document.createElement("div");
      diagramDiv.className = "mermaid";
      diagramDiv.textContent = mermaidCode;
      outputDiv.appendChild(diagramDiv);
    });

    // After all diagrams are added:
    if (window.mermaid) {
      window.mermaid.run();
    }
  });
});
