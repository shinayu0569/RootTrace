// ========== IPA Feature Sets (Optimized) ==========

const featureMap = {
  // Stops (Pulmonic)
  'p': { place: 'bilabial', manner: 'stop', voice: 'voiceless' }, 'b': { place: 'bilabial', manner: 'stop', voice: 'voiced' },
  't̪': { place: 'dental', manner: 'stop', voice: 'voiceless' }, 'd̪': { place: 'dental', manner: 'stop', voice: 'voiced' },
  't': { place: 'alveolar', manner: 'stop', voice: 'voiceless' }, 'd': { place: 'alveolar', manner: 'stop', voice: 'voiced' },
  'ʈ': { place: 'retroflex', manner: 'stop', voice: 'voiceless' }, 'ɖ': { place: 'retroflex', manner: 'stop', voice: 'voiced' },
  'c': { place: 'palatal', manner: 'stop', voice: 'voiceless' }, 'ɟ': { place: 'palatal', manner: 'stop', voice: 'voiced' },
  'k': { place: 'velar', manner: 'stop', voice: 'voiceless' }, 'g': { place: 'velar', manner: 'stop', voice: 'voiced' },
  'q': { place: 'uvular', manner: 'stop', voice: 'voiceless' }, 'ɢ': { place: 'uvular', manner: 'stop', voice: 'voiced' },
  'ʡ': { place: 'epiglottal', manner: 'stop', voice: 'voiceless' }, 'ʔ': { place: 'glottal', manner: 'stop', voice: 'voiceless' },
  // Nasals (Pulmonic)
  'm': { place: 'bilabial', manner: 'nasal', voice: 'voiced' }, 'ɱ': { place: 'labiodental', manner: 'nasal', voice: 'voiced' },
  'n': { place: 'alveolar', manner: 'nasal', voice: 'voiced' }, 'ɳ': { place: 'retroflex', manner: 'nasal', voice: 'voiced' },
  'ɲ': { place: 'palatal', manner: 'nasal', voice: 'voiced' }, 'ŋ': { place: 'velar', manner: 'nasal', voice: 'voiced' },
  'ɴ': { place: 'uvular', manner: 'nasal', voice: 'voiced' },
  // Fricatives (Pulmonic)
  'ɸ': { place: 'bilabial', manner: 'fricative', voice: 'voiceless' }, 'β': { place: 'bilabial', manner: 'fricative', voice: 'voiced' },
  'f': { place: 'labiodental', manner: 'fricative', voice: 'voiceless' }, 'v': { place: 'labiodental', manner: 'fricative', voice: 'voiced' },
  'θ': { place: 'dental', manner: 'fricative', voice: 'voiceless' }, 'ð': { place: 'dental', manner: 'fricative', voice: 'voiced' },
  's': { place: 'alveolar', manner: 'fricative', voice: 'voiceless' }, 'z': { place: 'alveolar', manner: 'fricative', voice: 'voiced' },
  'ʃ': { place: 'postalveolar', manner: 'fricative', voice: 'voiceless' }, 'ʒ': { place: 'postalveolar', manner: 'fricative', voice: 'voiced' },
  'ɕ': { place: 'alveolo-palatal', manner: 'fricative', voice: 'voiceless' }, 'ʑ': { place: 'alveolo-palatal', manner: 'fricative', voice: 'voiced' },
  'ʂ': { place: 'retroflex', manner: 'fricative', voice: 'voiceless' }, 'ʐ': { place: 'retroflex', manner: 'fricative', voice: 'voiced' },
  'ç': { place: 'palatal', manner: 'fricative', voice: 'voiceless' }, 'ʝ': { place: 'palatal', manner: 'fricative', voice: 'voiced' },
  'x': { place: 'velar', manner: 'fricative', voice: 'voiceless' }, 'ɣ': { place: 'velar', manner: 'fricative', voice: 'voiced' },
  'χ': { place: 'uvular', manner: 'fricative', voice: 'voiceless' }, 'ʁ': { place: 'uvular', manner: 'fricative', voice: 'voiced' },
  'ħ': { place: 'pharyngeal', manner: 'fricative', voice: 'voiceless' }, 'ʕ': { place: 'pharyngeal', manner: 'fricative', voice: 'voiced' },
  'h': { place: 'glottal', manner: 'fricative', voice: 'voiceless' }, 'ɦ': { place: 'glottal', manner: 'fricative', voice: 'voiced' },
  // Lateral fricatives
  'ɬ': { place: 'alveolar', manner: 'lateral fricative', voice: 'voiceless' }, 'ɮ': { place: 'alveolar', manner: 'lateral fricative', voice: 'voiced' },
  // Approximants (Pulmonic)
  'ʋ': { place: 'labiodental', manner: 'approximant', voice: 'voiced' }, 'ɹ': { place: 'alveolar', manner: 'approximant', voice: 'voiced' },
  'ɻ': { place: 'retroflex', manner: 'approximant', voice: 'voiced' }, 'j': { place: 'palatal', manner: 'approximant', voice: 'voiced' },
  'ɰ': { place: 'velar', manner: 'approximant', voice: 'voiced' }, 'w': { place: 'labial-velar', manner: 'approximant', voice: 'voiced' },
  // Laterals (Pulmonic)
  'l': { place: 'alveolar', manner: 'lateral approximant', voice: 'voiced' }, 'ɭ': { place: 'retroflex', manner: 'lateral approximant', voice: 'voiced' },
  'ʎ': { place: 'palatal', manner: 'lateral approximant', voice: 'voiced' }, 'ʟ': { place: 'velar', manner: 'lateral approximant', voice: 'voiced' },
  // Trills (Pulmonic)
  'ʙ': { place: 'bilabial', manner: 'trill', voice: 'voiced' }, 'r': { place: 'alveolar', manner: 'trill', voice: 'voiced' },
  'ʀ': { place: 'uvular', manner: 'trill', voice: 'voiced' },
  // Flaps/Taps (Pulmonic)
  'ⱱ': { place: 'labiodental', manner: 'tap', voice: 'voiced' }, 'ɾ': { place: 'alveolar', manner: 'tap', voice: 'voiced' },
  'ɽ': { place: 'retroflex', manner: 'tap', voice: 'voiced' },
  // Affricates (all main IPA, no diacritics)
  'p͡ɸ': { place: 'bilabial', manner: 'affricate', voice: 'voiceless' }, 'b͡β': { place: 'bilabial', manner: 'affricate', voice: 'voiced' },
  'p͡f': { place: 'labiodental', manner: 'affricate', voice: 'voiceless' }, 'b͡v': { place: 'labiodental', manner: 'affricate', voice: 'voiced' },
  't͡θ': { place: 'dental', manner: 'affricate', voice: 'voiceless' }, 'd͡ð': { place: 'dental', manner: 'affricate', voice: 'voiced' },
  't͡s': { place: 'alveolar', manner: 'affricate', voice: 'voiceless' }, 'd͡z': { place: 'alveolar', manner: 'affricate', voice: 'voiced' },
  't͡ɕ': { place: 'alveolo-palatal', manner: 'affricate', voice: 'voiceless' }, 'd͡ʑ': { place: 'alveolo-palatal', manner: 'affricate', voice: 'voiced' },
  't͡ʃ': { place: 'postalveolar', manner: 'affricate', voice: 'voiceless' }, 'd͡ʒ': { place: 'postalveolar', manner: 'affricate', voice: 'voiced' },
  'ʈ͡ʂ': { place: 'retroflex', manner: 'affricate', voice: 'voiceless' }, 'ɖ͡ʐ': { place: 'retroflex', manner: 'affricate', voice: 'voiced' },
  'c͡ç': { place: 'palatal', manner: 'affricate', voice: 'voiceless' }, 'ɟ͡ʝ': { place: 'palatal', manner: 'affricate', voice: 'voiced' },
  'k͡x': { place: 'velar', manner: 'affricate', voice: 'voiceless' }, 'g͡ɣ': { place: 'velar', manner: 'affricate', voice: 'voiced' },
  'q͡χ': { place: 'uvular', manner: 'affricate', voice: 'voiceless' }, 'ɢ͡ʁ': { place: 'uvular', manner: 'affricate', voice: 'voiced' },
  // Clicks (with voiceless, voiced, nasalized)
  'ʘ': { place: 'bilabial', manner: 'click', voice: 'voiceless' }, 'ǀ': { place: 'dental', manner: 'click', voice: 'voiceless' },
  'ǃ': { place: 'postalveolar', manner: 'click', voice: 'voiceless' }, 'ǂ': { place: 'palatal', manner: 'click', voice: 'voiceless' },
  'ǁ': { place: 'lateral', manner: 'click', voice: 'voiceless' },
  'ɡʘ': { place: 'bilabial', manner: 'click', voice: 'voiced' }, 'ɡǀ': { place: 'dental', manner: 'click', voice: 'voiced' },
  'ɡǃ': { place: 'postalveolar', manner: 'click', voice: 'voiced' }, 'ɡǂ': { place: 'palatal', manner: 'click', voice: 'voiced' },
  'ɡǁ': { place: 'lateral', manner: 'click', voice: 'voiced' },
  'ŋʘ': { place: 'bilabial', manner: 'click', voice: 'nasal' }, 'ŋǀ': { place: 'dental', manner: 'click', voice: 'nasal' },
  'ŋǃ': { place: 'postalveolar', manner: 'click', voice: 'nasal' }, 'ŋǂ': { place: 'palatal', manner: 'click', voice: 'nasal' },
  'ŋǁ': { place: 'lateral', manner: 'click', voice: 'nasal' },
  // Implosives (voiced)
  'ɓ': { place: 'bilabial', manner: 'implosive', voice: 'voiced' }, 'ɗ': { place: 'alveolar', manner: 'implosive', voice: 'voiced' },
  'ʄ': { place: 'palatal', manner: 'implosive', voice: 'voiced' }, 'ɠ': { place: 'velar', manner: 'implosive', voice: 'voiced' },
  'ʛ': { place: 'uvular', manner: 'implosive', voice: 'voiced' },
  // Vowels (all main IPA vowels)
  'i': { height: 'close', frontness: 'front', rounded: false }, 'y': { height: 'close', frontness: 'front', rounded: true },
  'ɨ': { height: 'close', frontness: 'central', rounded: false }, 'ʉ': { height: 'close', frontness: 'central', rounded: true },
  'ɯ': { height: 'close', frontness: 'back', rounded: false }, 'u': { height: 'close', frontness: 'back', rounded: true },
  'ɪ': { height: 'near-close', frontness: 'front', rounded: false }, 'ʏ': { height: 'near-close', frontness: 'front', rounded: true },
  'ʊ': { height: 'near-close', frontness: 'back', rounded: true }, 'e': { height: 'close-mid', frontness: 'front', rounded: false },
  'ø': { height: 'close-mid', frontness: 'front', rounded: true }, 'ɘ': { height: 'close-mid', frontness: 'central', rounded: false },
  'ɵ': { height: 'close-mid', frontness: 'central', rounded: true }, 'ɤ': { height: 'close-mid', frontness: 'back', rounded: false },
  'o': { height: 'close-mid', frontness: 'back', rounded: true }, 'ə': { height: 'mid', frontness: 'central', rounded: false },
  'ɛ': { height: 'open-mid', frontness: 'front', rounded: false }, 'œ': { height: 'open-mid', frontness: 'front', rounded: true },
  'ɜ': { height: 'open-mid', frontness: 'central', rounded: false }, 'ɞ': { height: 'open-mid', frontness: 'central', rounded: true },
  'ʌ': { height: 'open-mid', frontness: 'back', rounded: false }, 'ɔ': { height: 'open-mid', frontness: 'back', rounded: true },
  'æ': { height: 'near-open', frontness: 'front', rounded: false }, 'ɐ': { height: 'near-open', frontness: 'central', rounded: false },
  'a': { height: 'open', frontness: 'front', rounded: false }, 'ɶ': { height: 'open', frontness: 'front', rounded: true },
  'ɑ': { height: 'open', frontness: 'back', rounded: false }, 'ɒ': { height: 'open', frontness: 'back', rounded: true }
};

const vowels = ["i", "y", "ɨ", "ʉ", "ɯ", "u", "ɪ", "ʏ", "ʊ", "e", "ø", "ɘ", "ɵ", "ɤ", "o", "ə", "ɛ", "œ", "ɜ", "ɞ", "ʌ", "ɔ", "æ", "ɐ", "a", "ɶ", "ɑ", "ɒ"];
const consonants = [
  "p", "b", "t", "d", "ʈ", "ɖ", "c", "ɟ", "k", "g", "q", "ɢ", "ʡ", "ʔ",
  "m", "ɱ", "n", "ɳ", "ɲ", "ŋ", "ɴ", "ʙ", "r", "ʀ", "ⱱ", "ɾ", "ɽ",
  "ɸ", "β", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "ʂ", "ʐ", "ç", "ʝ", "x", "ɣ", "χ", "ʁ", "ħ", "ʕ", "h", "ɦ",
  "ɬ", "ɮ", "ʋ", "ɹ", "ɻ", "j", "ɰ", "l", "ɭ", "ʎ", "ʟ", "ɓ", "ɗ", "ʄ", "ɠ", "ʛ",
  "ʘ", "ǀ", "ǃ", "ǂ", "ǁ", "ɡʘ", "ɡǀ", "ɡǃ", "ɡǂ", "ɡǁ", "ŋʘ", "ŋǀ", "ŋǃ", "ŋǂ", "ŋǁ"
];
const affricates = ["t͡s", "d͡z", "t͡ɕ", "d͡ʑ", "t͡ʃ", "d͡ʒ", "ʈ͡ʂ", "ɖ͡ʐ", "c͡ç", "ɟ͡ʝ", "k͡x", "g͡ɣ", "q͡χ", "ɢ͡ʁ"];
const ipaFeatures = { vowels, consonants, affricates };

// Add this near your IPA definitions

const IPA_MODIFIERS = [
  "\u02D0", // ː  long
  "\u02D1", // ˑ  half-long
  "\u0306", // ̆  extra-short
  "\u0303", // ̃  nasalization
  "\u02B0", // ʰ  aspiration
  "\u02B1", // ʱ  breathy aspiration
  "\u02B2", // ʲ  palatalization
  "\u02B7", // ʷ  labialization
  "\u0329", // ̩  syllabic
  "\u032F", // ̯  non-syllabic
  "\u030C", // ̌  caron (maybe for tone, not used so far)
  "\u0308", // ̈  centralization (not used so far)
];

// ========== Utility Functions (Optimized) ==========

const splitGroups = input => input.trim().split(/\n+/).map(g => g.trim().split(/\s+/));
const syllabify = word => word.includes(".") ? word.split(".") : null;
const extractStress = word => word.includes("ˈ") ? word.indexOf("ˈ") : null;

const allPhonemes = [...affricates, ...consonants, ...vowels].sort((a, b) => b.length - a.length);
function tokenizeIPA(word, options = {}) {
  // Respect multiCharPhonemes setting
  let phonemeList = options.multiCharPhonemes === false
    ? [...consonants, ...vowels]
    : allPhonemes;

  // Build a regex for modifiers
  const modifierRegex = new RegExp(
    `(?:${IPA_MODIFIERS.map(m => '\\u' + m.charCodeAt(0).toString(16).padStart(4, '0')).join('|')})+`
  );

  let result = [], i = 0;
  while (i < word.length) {
    let match = phonemeList.find(p => word.startsWith(p, i));
    if (match) {
      let j = i + match.length;
      // Collect all following modifiers
      let mods = '';
      while (j < word.length) {
        let found = IPA_MODIFIERS.find(m => word[j] === m);
        if (found) { mods += found; j++; }
        else break;
      }
      result.push(match + mods);
      i = j;
    } else {
      // Try to match a modifier alone (for edge cases)
      let found = IPA_MODIFIERS.find(m => word[i] === m);
      if (found) {
        result.push(found);
        i++;
      } else {
        i++; // skip unknown
      }
    }
  }
  return result;
}

function safeTokenizeIPA(word) {
  try {
    return tokenizeIPA(word);
  } catch (e) {
    return []; // Or show error to user
  }
}

function weightedReconstruction(group, options = {}) {
  const phonemeLists = group.map(word => tokenizeIPA(word, options));
  const maxLen = Math.max(...phonemeLists.map(x => x.length));
  let candidates = [];
  for (let i = 0; i < maxLen; i++) {
    const column = phonemeLists.map(p => p[i]).filter(Boolean);
    if (!column.length) continue;
    let scores = {};
    for (let p of column) {
      scores[p] = 0;
      for (let otherP of column) {
        if (p === otherP) continue;
        if (isKnownSoundChange(p, otherP)) scores[p] += 2;
        scores[p] += getTypologicalFrequency(p) + getPhonemeStability(p);
      }
      // --- Add random factor if enabled ---
      if (options.enableRandomness) {
        scores[p] += (Math.random() - 0.5) * 2 * (options.randomnessStrength || 0.2);
      }
      // --- End random factor ---
    }
    // --- Use stochastic choice if randomness is enabled ---
    if (options.enableRandomness) {
      // Pick one candidate stochastically
      const chosen = stochasticColumnChoice(scores, options.randomnessStrength || 0.2);
      candidates.push([chosen]);
    } else {
      // Pick top 3 by score (as before)
      candidates.push(Object.entries(scores).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3));
    }
  }
  return combineCandidates(candidates);
}

function isKnownSoundChange(source, result) {
  const c = {
    "p": ["b", "β", "f", "v", "ɸ"], "b": ["β", "v", "p"], "t": ["d", "ð", "θ", "s", "ɾ", "ʃ", "ts", "tʃ"],
    "d": ["ð", "z", "t", "ɾ", "ʒ", "dz", "dʒ"], "k": ["g", "ɣ", "x", "c", "tʃ", "q", "ʔ"],
    "g": ["ɣ", "x", "k", "ɰ", "ʁ"], "f": ["v", "β", "ɸ"], "v": ["β", "f"], "s": ["z", "ʃ", "h", "θ"],
    "z": ["ʒ", "s"], "ʃ": ["ʒ", "s", "ç"], "ʒ": ["ʃ", "z", "j"], "θ": ["ð", "s"], "ð": ["θ", "d", "z"],
    "x": ["ɣ", "k", "h"], "ɣ": ["x", "g", "ʁ"], "h": ["ɦ", "x", "ʔ"], "ɦ": ["h"], "m": ["ɱ", "n"],
    "n": ["ŋ", "ɲ", "m", "ɳ"], "ŋ": ["n", "ɲ"], "ɲ": ["n", "ŋ"], "l": ["ɫ", "ʎ", "r"], "r": ["ɾ", "l"],
    "ɾ": ["r", "d", "t"], "j": ["ʝ", "i"], "w": ["v", "u"], "k": ["c", "tʃ", "t͡ɕ", "ɕ"],
    "g": ["ɟ", "dʒ", "d͡ʑ", "ʑ"], "t": ["tʃ", "t͡ɕ", "ʃ", "ɕ"], "d": ["dʒ", "d͡ʑ", "ʒ", "ʑ"],
    "n": ["ɲ"], "l": ["ʎ"], "tʃ": ["t", "ts", "ʃ", "s"], "dʒ": ["d", "dz", "ʒ", "z"], "ʃ": ["s", "tʃ"],
    "ʒ": ["z", "dʒ"], "ɲ": ["n"], "ʎ": ["l"], "t": ["ts", "tʃ"], "d": ["dz", "dʒ"], "s": ["ts"], "z": ["dz"],
    "ts": ["s", "t"], "dz": ["z", "d"], "tʃ": ["ʃ", "t"], "dʒ": ["ʒ", "d"], "i": ["ɪ", "e", "j"], "ɪ": ["i", "e"],
    "e": ["ɛ", "i", "ə"], "ɛ": ["e", "æ", "a"], "a": ["æ", "ɑ", "ə"], "æ": ["a", "ɛ"], "ɑ": ["a", "ɒ"],
    "ɒ": ["ɑ", "ɔ"], "u": ["ʊ", "o", "w"], "ʊ": ["u", "o"], "o": ["ɔ", "u", "ə"], "ɔ": ["o", "ɒ"], "ə": ["a", "e", "o"],
    "e": ["ei", "ie"], "o": ["ou", "uo"], "ai": ["e", "a"], "au": ["o", "a"], "a": ["ã"], "e": ["ẽ"], "i": ["ĩ"],
    "o": ["õ"], "u": ["ũ"], "t": ["ʔ"], "k": ["ʔ"], "ʔ": [""], "h": [""], "ə": [""], "n": [""], "t": [""]
  };
  return (c[source]?.includes(result) || c[result]?.includes(source));
}

const freq = { "m": .94, "k": .89, "j": .84, "i": .92, "a": .88, "u": .88, "p": .83, "w": .76, "n": .73, "s": .83, "h": .73, "t": .98 };
const stab = { "m": .9, "n": .85, "k": .8, "p": .8, "t": .8, "i": .85, "a": .9, "u": .85 };
const getTypologicalFrequency = p => freq[p] || .5;
const getPhonemeStability = p => stab[p] || .5;

function reconstructProto(group) {
  const phonemeLists = group.map(tokenizeIPA);
  const maxLen = Math.max(...phonemeLists.map(x => x.length));
  let candidates = [];
  for (let i = 0; i < maxLen; i++) {
    const column = phonemeLists.map(p => p[i]).filter(Boolean);
    let counts = {};
    for (let p of column) counts[p] = (counts[p] || 0) + 1;
    const maxFreq = Math.max(...Object.values(counts));
    candidates.push(Object.entries(counts).filter(([k, v]) => v === maxFreq).map(x => x[0]));
  }
  const stresses = group.map(extractStress).filter(v => v !== null);
  const stressPos = stresses.length ? mode(stresses) : null;
  return combineCandidates(candidates).map(form => applyStress(form, stressPos));
}

const combineCandidates = candidates =>
  candidates.some(c => c.length > 1)
    ? cartesian(candidates).map(arr => arr.join(""))
    : [candidates.map(c => c[0]).join("")];

const cartesian = arr => arr.reduce((acc, val) => acc.flatMap(d => val.map(e => [...d, e])), [[]]);
const applyStress = (form, pos) => (pos == null || pos >= form.length) ? form : form.slice(0, pos) + "ˈ" + form.slice(pos);
const mode = arr => Object.entries(arr.reduce((a, v) => (a[v] = (a[v] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1])[0][0];

function highlightConservative(group, protoCandidates) {
  let distances = protoCandidates.map(proto =>
    group.reduce((a, w) => a + editDistance(tokenizeIPA(proto), tokenizeIPA(w)), 0)
  );
  return protoCandidates[distances.indexOf(Math.min(...distances))];
}

function phonemeDistance(a, b) {
  if (a === b) return 0;
  const f1 = featureMap[a], f2 = featureMap[b];
  if (!f1 || !f2) return 2;
  let score = 0;
  if (f1.place !== f2.place) score++;
  if (f1.manner !== f2.manner) score++;
  if (f1.voice !== f2.voice) score++;
  return score;
}

function editDistance(a, b) {
  const dp = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i * 2;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j * 2;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = phonemeDistance(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost,
        dp[i][j - 1] + 2,
        dp[i - 1][j] + 2
      );
    }
  return dp[a.length][b.length];
}

function clusterDescendants(descendants) {
  const distances = [];
  for (let i = 0; i < descendants.length; i++)
    for (let j = i + 1; j < descendants.length; j++)
      distances.push({
        pair: [i, j],
        dist: editDistance(tokenizeIPA(descendants[i]), tokenizeIPA(descendants[j]))
      });
  let clusters = descendants.map((_, i) => [i]);
  while (clusters.length > 2) {
    let minDist = Infinity, minPair = null;
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        let d = Math.min(...clusters[i].map(a => clusters[j].map(b =>
          distances.find(e =>
            (e.pair[0] === a && e.pair[1] === b) || (e.pair[1] === a && e.pair[0] === b)
          )?.dist ?? Infinity
        )).flat());
        if (d < minDist) { minDist = d; minPair = [i, j]; }
      }
    if (minPair) {
      clusters[minPair[0]] = clusters[minPair[0]].concat(clusters[minPair[1]]);
      clusters.splice(minPair[1], 1);
    } else break;
  }
  return clusters.map(cluster => cluster.map(idx => descendants[idx]));
}

function guessIntermediates(proto, descendants) {
  const clusters = clusterDescendants(descendants);
  const intermediates = clusters.map(group => highlightConservative(group, reconstructProto(group)));
  return { clusters, intermediates };
}

function processInput(inputText, options) {
  const groups = splitGroups(inputText);
  return groups.map(group => {
    let recon;
    if (options.method === "weighted") {
      recon = weightedReconstruction(group, options);
    } else {
      recon = reconstructProto(group, options);
    }
    const conservative = highlightConservative(group, recon);
    return { reconstructions: recon, conservative, group };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("input-text");
  const button = document.getElementById("reconstruct-btn");
  const outputDiv = document.getElementById("output");
  // --- Add slider display logic ---
  const randomnessSlider = document.getElementById("randomness-strength");
  const randomnessValue = document.getElementById("randomness-strength-value");
  if (randomnessSlider && randomnessValue) {
    randomnessSlider.addEventListener("input", () => {
      randomnessValue.textContent = Number(randomnessSlider.value).toFixed(2);
    });
  }
  // --- End slider display logic ---
  button.addEventListener("click", () => {
    // Read settings
    const considerSyllabification = document.getElementById("consider-syllabification").checked;
    const considerStress = document.getElementById("consider-stress").checked;
    const multiCharPhonemes = document.getElementById("multi-char-phonemes").checked;
    const usePhoneticFeatures = document.getElementById("use-phonetic-features").checked;
    const method = document.getElementById("method-weighted").checked ? "weighted" : "majority";
    const enableRandomness = document.getElementById("enable-randomness").checked;
    const randomnessStrength = parseFloat(document.getElementById("randomness-strength").value);
    const inputText = inputField.value;

    // Pass settings as an options object
    const options = {
      considerSyllabification,
      considerStress,
      multiCharPhonemes,
      usePhoneticFeatures,
      method,
      enableRandomness,
      randomnessStrength
    };

    const results = processInput(inputText, options);
    outputDiv.innerHTML = "";
    results.forEach((res, index) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "result-group";
      const groupTitle = document.createElement("strong");
      groupTitle.textContent = `Group ${index + 1}`;
      groupDiv.appendChild(groupTitle);
      const ul = document.createElement("ul");
      res.reconstructions.forEach(form => {
        const li = document.createElement("li");
        li.textContent = form + (form === res.conservative ? " (most conservative)" : "");
        ul.appendChild(li);
      });
      groupDiv.appendChild(ul);
      const { clusters, intermediates } = guessIntermediates(res.conservative, res.group);
      let diagramCode = 'flowchart TD\n';
      let protoNode = `P0["${res.conservative}"]`;
      intermediates.forEach((inter, i) => {
        // Interpolate between proto and intermediate
        const interpolated = interpolateForms(res.conservative, inter);
        let interNode = `I${i}["${interpolated}"]`;
        diagramCode += `${protoNode} --> ${interNode}\n`;
        clusters[i].forEach((desc, j) => {
          let descNode = `D${i}_${j}["${desc}"]`;
          diagramCode += `${interNode} --> ${descNode}\n`;
        });
      });
      const diagramDiv = document.createElement("div");
      diagramDiv.className = "mermaid evo-diagram";
      diagramDiv.textContent = diagramCode;
      groupDiv.appendChild(diagramDiv);
      outputDiv.appendChild(groupDiv);
    });
    if (window.mermaid) window.mermaid.run();
  });
});

class SoundChangeEngine {
  constructor(rules = []) {
    this.rules = rules; // [{from, to, env, prob}]
  }
  apply(word) {
    for (const rule of this.rules) {
      if (Math.random() < (rule.prob || 1)) {
        word = word.replace(rule.from, (m, ...args) => {
          // Optionally check environment here
          if (!rule.env || rule.env(m, ...args)) return rule.to;
          return m;
        });
      }
    }
    return word;
  }
}

function stochasticColumnChoice(scores, randomnessStrength = 0.2) {
  // Softmax with randomness
  const keys = Object.keys(scores);
  const vals = keys.map(k => scores[k] + (Math.random() - 0.5) * randomnessStrength);
  const max = Math.max(...vals);
  const exp = vals.map(v => Math.exp(v - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map(e => e / sum);
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return keys[i];
  }
  return keys[0];
}

function interpolatePhoneme(a, b) {
  if (a === b) return a;
  const fa = parsePhonemeFeatures(a), fb = parsePhonemeFeatures(b);
  if (!fa || !fb) return a; // fallback: keep proto

  // Vowel interpolation
  if (fa.height && fb.height) {
    // Height: close < near-close < close-mid < mid < open-mid < near-open < open
    const heights = ["close", "near-close", "close-mid", "mid", "open-mid", "near-open", "open"];
    const fronts = ["front", "central", "back"];
    function avgIndex(valA, valB, arr) {
      return arr[Math.round((arr.indexOf(valA) + arr.indexOf(valB)) / 2)];
    }
    const height = avgIndex(fa.height, fb.height, heights);
    const frontness = avgIndex(fa.frontness, fb.frontness, fronts);
    const rounded = (fa.rounded || fb.rounded); // if either is rounded, keep rounded
    // Find closest vowel in featureMap
    let best = null, bestScore = 99;
    for (const [sym, f] of Object.entries(featureMap)) {
      if (!f.height) continue;
      let score = 0;
      if (f.height !== height) score++;
      if (f.frontness !== frontness) score++;
      if (!!f.rounded !== !!rounded) score++;
      if (score < bestScore) { best = sym; bestScore = score; }
    }
    return best || a;
  }

  // Consonant interpolation
  if (fa.place && fb.place) {
    const places = ["bilabial", "labiodental", "dental", "alveolar", "postalveolar", "retroflex", "palatal", "velar", "uvular", "pharyngeal", "epiglottal", "glottal", "alveolo-palatal", "lateral", "labial-velar"];
    // Group manners
    const obstruents = ["stop", "fricative", "affricate", "lateral fricative"];
    const sonorants = ["nasal", "approximant", "lateral approximant", "trill", "tap"];
    let manner = fa.manner;

    // Only interpolate manner if both are in the same class
    if (obstruents.includes(fa.manner) && obstruents.includes(fb.manner)) {
      const manners = ["stop", "affricate", "fricative", "lateral fricative"];
      manner = manners[Math.round((manners.indexOf(fa.manner) + manners.indexOf(fb.manner)) / 2)];
    } else if (sonorants.includes(fa.manner) && sonorants.includes(fb.manner)) {
      const manners = ["nasal", "tap", "trill", "approximant", "lateral approximant"];
      manner = manners[Math.round((manners.indexOf(fa.manner) + manners.indexOf(fb.manner)) / 2)];
    } else {
      // If not in the same class, prefer proto's manner (fa)
      manner = fa.manner;
    }

    // Place and voice interpolation as before
    function avgIndex(valA, valB, arr) {
      return arr[Math.round((arr.indexOf(valA) + arr.indexOf(valB)) / 2)];
    }
    const place = avgIndex(fa.place, fb.place, places);
    const voice = (fa.voice === fb.voice) ? fa.voice : "voiced";

    // Find closest consonant in featureMap
    let best = null, bestScore = 99;
    for (const [sym, f] of Object.entries(featureMap)) {
      if (!f.place) continue;
      let score = 0;
      if (f.place !== place) score++;
      if (f.manner !== manner) score++;
      if (f.voice !== voice) score++;
      if (score < bestScore) { best = sym; bestScore = score; }
    }
    return best || a;
  }
  return a;
}

function interpolateForms(proto, target) {
  const protoPhon = tokenizeIPA(proto);
  const targetPhon = tokenizeIPA(target);
  const len = Math.max(protoPhon.length, targetPhon.length);
  let result = [];
  for (let i = 0; i < len; i++) {
    const a = protoPhon[i] || "";
    const b = targetPhon[i] || "";
    if (!a) result.push(b);
    else if (!b) result.push(a);
    else result.push(interpolatePhoneme(a, b));
  }
  return result.join("");
}

function parsePhonemeFeatures(token) {
  // Separate base and modifiers
  let base = token[0], mods = token.slice(1);
  let features = { ...(featureMap[base] || {}) };

  for (const m of mods) {
    switch (m) {
      case "\u02D0": features.length = "long"; break;
      case "\u02D1": features.length = "half-long"; break;
      case "\u0306": features.length = "extra-short"; break;
      case "\u0303": features.nasalized = true; break;
      case "\u02B0": features.aspiration = true; break;
      case "\u02B1": features.aspiration = true; break;
      case "\u02B2": features.palatalized = true; break;
      case "\u02B7": features.labialized = true; break;
      case "\u0329": features.syllabic = true; break;
      case "\u032F": features.nonsyllabic = true; break;
    }
  }
  return features;
}
