// ========== IPA Feature Sets ==========

const featureMap = {
  // Stops
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
  'ʔ': { place: 'glottal', manner: 'stop', voice: 'voiceless' },

  // Nasals
  'm': { place: 'bilabial', manner: 'nasal', voice: 'voiced' },
  'ɱ': { place: 'labiodental', manner: 'nasal', voice: 'voiced' },
  'n': { place: 'alveolar', manner: 'nasal', voice: 'voiced' },
  'ɳ': { place: 'retroflex', manner: 'nasal', voice: 'voiced' },
  'ɲ': { place: 'palatal', manner: 'nasal', voice: 'voiced' },
  'ŋ': { place: 'velar', manner: 'nasal', voice: 'voiced' },
  'ɴ': { place: 'uvular', manner: 'nasal', voice: 'voiced' },

  // Fricatives
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

  // Approximants
  'ʋ': { place: 'labiodental', manner: 'approximant', voice: 'voiced' },
  'ɹ': { place: 'alveolar', manner: 'approximant', voice: 'voiced' },
  'ɻ': { place: 'retroflex', manner: 'approximant', voice: 'voiced' },
  'j': { place: 'palatal', manner: 'approximant', voice: 'voiced' },
  'ɰ': { place: 'velar', manner: 'approximant', voice: 'voiced' },
  'w': { place: 'labial-velar', manner: 'approximant', voice: 'voiced' },

  // Laterals
  'l': { place: 'alveolar', manner: 'lateral approximant', voice: 'voiced' },
  'ɭ': { place: 'retroflex', manner: 'lateral approximant', voice: 'voiced' },
  'ʎ': { place: 'palatal', manner: 'lateral approximant', voice: 'voiced' },
  'ʟ': { place: 'velar', manner: 'lateral approximant', voice: 'voiced' },

  // Trills
  'ʙ': { place: 'bilabial', manner: 'trill', voice: 'voiced' },
  'r': { place: 'alveolar', manner: 'trill', voice: 'voiced' },
  'ʀ': { place: 'uvular', manner: 'trill', voice: 'voiced' },

  // Flaps/Taps
  'ⱱ': { place: 'labiodental', manner: 'tap', voice: 'voiced' },
  'ɾ': { place: 'alveolar', manner: 'tap', voice: 'voiced' },
  'ɽ': { place: 'retroflex', manner: 'tap', voice: 'voiced' },

  // Common Affricates
  't͡s': { place: 'alveolar', manner: 'affricate', voice: 'voiceless' },
  'd͡z': { place: 'alveolar', manner: 'affricate', voice: 'voiced' },
  't͡ʃ': { place: 'postalveolar', manner: 'affricate', voice: 'voiceless' },
  'd͡ʒ': { place: 'postalveolar', manner: 'affricate', voice: 'voiced' },
  'ʈ͡ʂ': { place: 'retroflex', manner: 'affricate', voice: 'voiceless' },
  'ɖ͡ʐ': { place: 'retroflex', manner: 'affricate', voice: 'voiced' },
  'c͡ç': { place: 'palatal', manner: 'affricate', voice: 'voiceless' },
  'ɟ͡ʝ': { place: 'palatal', manner: 'affricate', voice: 'voiced' },

  // Vowels
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
  'ə': { height: 'mid', frontness: 'central', rounded: false }, //schwa
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
  'ɒ': { height: 'open', frontness: 'back', rounded: true },
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
  "p", "b", "t", "d", "ʈ", "ɖ", "c", "ɟ", "k", "g", "q", "ɢ", "ʡ", "ʔ",
  "m", "ɱ", "n", "ɳ", "ɲ", "ŋ", "ɴ",
  "ʙ", "r", "ʀ",
  "ⱱ", "ɾ", "ɽ",
  "ɸ", "β", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "ʂ", "ʐ", "ç", "ʝ", "x", "ɣ", "χ", "ʁ", "ħ", "ʕ", "h", "ɦ",
  "ɬ", "ɮ",
  "ʋ", "ɹ", "ɻ", "j", "ɰ",
  "l", "ɭ", "ʎ", "ʟ"
];

const affricates = [
  "t͡s", "d͡z", "t͡ʃ", "d͡ʒ", "ʈ͡ʂ", "ɖ͡ʐ", "c͡ç", "ɟ͡ʝ", "k͡x", "g͡ɣ"
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
    // More lenition rules
  ],
  
  palatalization: [
    { from: "k", to: "tʃ", environment: "_i" }, // Palatalization before front vowels
    { from: "g", to: "dʒ", environment: "_i" },
    { from: "t", to: "tʃ", environment: "_i" },
    // More palatalization rules
  ],
  
  vowelHarmony: {
    frontBack: true,
    rounding: true,
    height: false
  }
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
  // Check common sound changes like:
  // - Lenition (p > b, t > d, etc.)
  // - Palatalization (k > tʃ before front vowels)
  // - Spirantization (p > f, t > θ, etc.)
  // - Vowel raising/lowering
  
  // Simplified example
  const commonChanges = {
    "p": ["b", "f", "v"],
    "t": ["d", "θ", "s"],
    "k": ["g", "x", "tʃ"],
    "s": ["z", "ʃ", "h"],
    "i": ["e", "ɪ", "j"],
    "u": ["o", "ʊ", "w"]
  };
  
  return commonChanges[source]?.includes(result) || false;
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
    });
  });
});
