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

const soundChangeProbabilities = {
  // Probability of certain sound changes based on typological patterns
  lenition: {
    'p': { 'b': 0.3, 'f': 0.4, 'v': 0.2, 'w': 0.1 },
    't': { 'd': 0.3, 's': 0.3, 'θ': 0.2, 'r': 0.1, 'ɾ': 0.1 },
    'k': { 'g': 0.3, 'x': 0.4, 'ɣ': 0.2, 'h': 0.1 },
    // more to be added
  },
  
  // How vowels tend to change
  vowelShifts: {
    'a': { 'æ': 0.2, 'ɑ': 0.3, 'ə': 0.2, 'ɛ': 0.1 },
    'i': { 'e': 0.3, 'ɪ': 0.4, 'j': 0.1 },
    'u': { 'o': 0.3, 'ʊ': 0.4, 'w': 0.1 },
    // more to be added
  },
  
  // Common assimilation patterns
  assimilation: {
    nasal: { before: 'stop', becomes: 'homorganic' },
    // more to be added
  }
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

function reconstructProto(group) {
  const phonemeLists = group.map(tokenizeIPA);
  const maxLen = Math.max(...phonemeLists.map(x => x.length));
  let candidates = [];

  for (let i = 0; i < maxLen; i++) {
    const column = phonemeLists.map(p => p[i]).filter(Boolean);
    if (column.length === 0) continue;
    
    // Determine position context
    const position = i === 0 ? "initial" : (i === maxLen - 1 ? "final" : "medial");
    
    // Basic frequency analysis
    let counts = {};
    for (let p of column) counts[p] = (counts[p] || 0) + 1;
    
    // Get all candidates, sorted by frequency
    let possibleProtos = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // If there's a clear majority, just use that
    const maxFreq = Math.max(...Object.values(counts));
    const threshold = column.length * 0.7; // 70% agreement is strong evidence
    
    if (maxFreq >= threshold) {
      candidates.push([possibleProtos[0]]);
      continue;
    }
    
    // Otherwise, score candidates by likelihood of being ancestral
    possibleProtos = possibleProtos.map(phoneme => {
      const frequency = counts[phoneme];
      const protoScore = protoLikelihood(phoneme, position);
      return { 
        phoneme, 
        score: frequency * 0.6 + protoScore * 0.4 // Weight frequency more than likelihood
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.phoneme);
    
    // Take top 2 candidates at most to prevent combinatorial explosion
    candidates.push(possibleProtos.slice(0, 2));
  }

  // Get the stress positions
  const stresses = group.map(extractStress).filter(v => v !== null);
  const stressPos = stresses.length ? mode(stresses) : null;
  
  // Generate all possible reconstructions
  let reconstructedForms = combineCandidates(candidates);
  
  // Filter out phonotactically implausible forms
  reconstructedForms = reconstructedForms.filter(checkPhonotoactic).sort((a, b) => naturalnessPenalty(a) - naturalnessPenalty(b));
  
  // Limit number of reconstructions to prevent excessive outputs
  reconstructedForms = reconstructedForms.slice(0, 5);
  
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
  if (!f1 || !f2) return 3; // Higher penalty for unknown phonemes
  
  let score = 0;
  
  // Handle vowels and consonants separately
  if (vowels.includes(a) && vowels.includes(b)) {
    // Vowel comparison
    if (f1.height !== f2.height) {
      const heightOrder = ['close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open'];
      const heightDiff = Math.abs(heightOrder.indexOf(f1.height) - heightOrder.indexOf(f2.height));
      score += heightDiff * 0.3;
    }
    
    if (f1.frontness !== f2.frontness) {
      const frontOrder = ['front', 'central', 'back'];
      const frontDiff = Math.abs(frontOrder.indexOf(f1.frontness) - frontOrder.indexOf(f2.frontness));
      score += frontDiff * 0.3;
    }
    
    if (f1.rounded !== f2.rounded) score += 0.5;
    
  } else if (consonants.includes(a) && consonants.includes(b) || 
             affricates.includes(a) && affricates.includes(b)) {
    // Consonant comparison            
    if (f1.place !== f2.place) {
      const placeDistance = Math.abs(placeOrder.indexOf(f1.place) - placeOrder.indexOf(f2.place));
      score += Math.min(placeDistance * 0.3, 1); // Cap at 1
    }
    
    if (f1.manner !== f2.manner) {
      const mannerOrder = ['stop', 'affricate', 'fricative', 'nasal', 'trill', 'tap', 'lateral approximant', 'approximant'];
      const mannerDistance = Math.abs(mannerOrder.indexOf(f1.manner) - mannerOrder.indexOf(f2.manner));
      score += Math.min(mannerDistance * 0.3, 1); // Cap at 1
    }
    
    if (f1.voice !== f2.voice) score += 0.5;
  } else {
    // Comparing across consonant/vowel boundary
    return 3; // Maximum difference
  }
  
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

// Check if phoneme is a consonant
function isConsonant(phoneme) {
  return consonants.includes(phoneme) || affricates.includes(phoneme);
}

// Get sonority value of a phoneme
function getSonority(phoneme) {
  if (vowels.includes(phoneme)) return sonorityScale.vowel;
  const manner = featureMap[phoneme]?.manner;
  return manner ? sonorityScale[manner] || 0 : 0;
}

// Check if a sequence of phonemes follows phonotactic constraints
function checkPhonotoactic(form) {
  const phonemes = tokenizeIPA(form);
  
  // Track consonant clusters
  let consonantCluster = [];
  let previousWasConsonant = false;
  
  for (let i = 0; i < phonemes.length; i++) {
    const current = phonemes[i];
    const isCurrentConsonant = isConsonant(current);
    
    // Build consonant clusters
    if (isCurrentConsonant) {
      consonantCluster.push(current);
      if (i === phonemes.length - 1 && consonantCluster.length > 3) {
        // Excessively complex coda
        return false;
      }
    } else if (previousWasConsonant) {
      // End of consonant cluster, check for constraints
      if (consonantCluster.length > 3) {
        // Most languages don't have clusters longer than 3 consonants
        return false;
      }
      
      // Check sonority sequencing for onset clusters
      if (consonantCluster.length > 1 && i - consonantCluster.length === 0) {
        // This was a word-initial cluster
        for (let j = 1; j < consonantCluster.length; j++) {
          if (getSonority(consonantCluster[j]) <= getSonority(consonantCluster[j-1])) {
            // Sonority should rise in onsets
            return false;
          }
        }
      }
      
      consonantCluster = [];
    }
    
    // No vowel found check
    if (i === phonemes.length - 1 && !phonemes.some(p => vowels.includes(p))) {
      // Words should have at least one vowel or syllabic consonant
      return false;
    }
    
    previousWasConsonant = isCurrentConsonant;
  }
  
  return true;
}

// Estimate naturalness score for a reconstructed form
function naturalnessPenalty(form) {
  const phonemes = tokenizeIPA(form);
  let score = 0;
  
  // Excessive length penalty
  if (phonemes.length > 10) score += (phonemes.length - 10) * 0.5;
  
  // Check for vowel harmony patterns
  const formVowels = phonemes.filter(p => vowels.includes(p));
  if (formVowels.length >= 3) {
    const frontCount = formVowels.filter(v => featureMap[v]?.frontness === 'front').length;
    const backCount = formVowels.filter(v => featureMap[v]?.frontness === 'back').length;
    
    // Mixed front/back vowels are common but total dominance of one is suspicious
    if (frontCount === formVowels.length || backCount === formVowels.length) {
      score -= 0.5; // Bonus for consistent vowel harmony
    }
  }
  
  // Check for common phoneme inventory characteristics
  const inventory = new Set(phonemes);
  const consonantCount = [...inventory].filter(p => isConsonant(p)).length;
  const vowelCount = [...inventory].filter(p => vowels.includes(p)).length;
  
  // Most languages have a consonant/vowel ratio between 2:1 and 4:1
  const ratio = consonantCount / (vowelCount || 1);
  if (ratio < 1 || ratio > 6) score += 1;
  
  return score;
}

// Assess likelihood of being the proto-form
function protoLikelihood(phoneme, position) {
  if (!featureMap[phoneme]) return 0;
  
  let score = 1;
  const features = featureMap[phoneme];
  
  // Consonant stability factors
  if (consonants.includes(phoneme)) {
    if (features.manner === 'stop') {
      if (position === 'initial') score += 0.5; // Stops are stable word-initially
      
      // Velar and alveolar places are common in proto-languages
      if (features.place === 'velar' || features.place === 'alveolar') score += 0.3;
      
      // Voiced stops often derive from voiceless ones
      if (features.voice === 'voiceless') score += 0.2;
    }
    
    // Fricatives are often derived from stops
    if (features.manner === 'fricative') score -= 0.1;
    
    // Affricates are often derived from stops
    if (features.manner === 'affricate') score -= 0.2;
  }
  
  // Vowel factors
  if (vowels.includes(phoneme)) {
    // Basic 5-vowel system is most stable cross-linguistically
    if (['a', 'e', 'i', 'o', 'u'].includes(phoneme)) score += 0.3;
    
    // Mid vowels often derive from high/low through neutralization
    if (features.height === 'close-mid' || features.height === 'open-mid') score -= 0.1;
    
    // Central and rounded vowels are often derived
    if (features.frontness === 'central') score -= 0.2;
  }
  
  return score;
}

// ========== Integration ==========
function processInput(inputText, settings = {}) {
  const groups = splitGroups(inputText);
  return groups.map(group => {
    // Skip empty groups
    if (group.length === 0 || (group.length === 1 && group[0] === '')) {
      return { reconstructions: [], conservative: '', group: [] };
    }
    
    const recon = reconstructProto(group);
    
    // Handle case where no valid reconstructions were found
    if (recon.length === 0) {
      return { 
        reconstructions: ["[No valid reconstruction found]"], 
        mostPlausible: "[No valid reconstruction found]",
        conservative: "[No valid reconstruction found]",
        group 
      };
    }
    
    // The first is now the most plausible based on naturalness
    const mostPlausible = recon[0];
    
    // Most conservative is closest to daughter languages
    const conservative = highlightConservative(group, recon);
    
    return {
      reconstructions: recon,
      mostPlausible,
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
    
    // Get settings from checkboxes
    const settings = {
      considerSyllabification: document.getElementById("consider-syllabification")?.checked ?? true,
      considerStress: document.getElementById("consider-stress")?.checked ?? true,
      multiCharPhonemes: document.getElementById("multi-char-phonemes")?.checked ?? true,
      usePhoneticFeatures: document.getElementById("use-phonetic-features")?.checked ?? true
    };
    
    const results = processInput(inputText, settings);
    outputDiv.innerHTML = "";

    if (results.length === 0) {
      outputDiv.innerHTML = "<p>No valid input found. Please enter words in IPA.</p>";
      return;
    }

    results.forEach((res, index) => {
      if (res.group.length === 0) return;
      
      const groupDiv = document.createElement("div");
      groupDiv.className = "result-group";
      
      // Group title and input words
      const groupTitle = document.createElement("h3");
      groupTitle.textContent = `Group ${index + 1}: ${res.group.join(", ")}`;
      groupDiv.appendChild(groupTitle);
      
      // Most plausible reconstruction
      const bestRecon = document.createElement("p");
      bestRecon.innerHTML = `<strong>Most plausible proto-form:</strong> <code>${res.mostPlausible}</code>`;
      groupDiv.appendChild(bestRecon);
      
      // Conservative form if different from most plausible
      if (res.conservative !== res.mostPlausible) {
        const conservativeEl = document.createElement("p");
        conservativeEl.innerHTML = `<strong>Most conservative form:</strong> <code>${res.conservative}</code>`;
        groupDiv.appendChild(conservativeEl);
      }
      
      // Show alternative reconstructions if any
      if (res.reconstructions.length > 1) {
        const alternatives = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Alternative reconstructions";
        alternatives.appendChild(summary);
        
        const ul = document.createElement("ul");
        res.reconstructions.slice(1).forEach(form => {
          const li = document.createElement("li");
          li.innerHTML = `<code>${form}</code>`;
          ul.appendChild(li);
        });
        
        alternatives.appendChild(ul);
        groupDiv.appendChild(alternatives);
      }
      
      outputDiv.appendChild(groupDiv);
    });
  });
});
