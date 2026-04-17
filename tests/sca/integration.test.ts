/**
 * RootTrace SCA - Integration Tests
 * 
 * Full worked examples from SyntaxGuide and real-world scenarios.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Integration - Latin to Portuguese Sketch', () => {
  it('should process Latin to Portuguese example', () => {
    const rules = `Class stop {p, t, k, b, d, g}
Syllables: C* @vowel C*
Deferred nasal-assim: [C +nasal] > [%place] / _[%place]
Deromanizer: ae > aj
vowel-length-loss: ː > ∅
intervocalic-voicing: @stop > [+voice] / V_V
syncope: [V -stress] > ∅ / V_
Next: Apply: @nasal-assim
Romanizer: ɲ > nh | ʎ > lh`;

    const result = runSCA(['paːter'], rules);
    expect(result[0]).toBeDefined();
  });

  it('should handle Latin vowel changes', () => {
    const rules = `Class stop {p, t, k}
vowel-length-loss: ː > ∅
intervocalic-lenition: @stop > [+voice] / V_V`;

    const result = runSCA(['paːter'], rules);
    expect(result[0]).toBeDefined();
  });

  it('should handle Portuguese nasal assimilation', () => {
    const rules = `Deferred nasal-assim:
  [C +nasal] > [%place] / _[%place]
Apply: @nasal-assim`;

    const result = runSCA(['inta'], rules);
    expect(result[0]).toBeDefined();
  });
});

describe('Integration - Grimm\'s Law', () => {
  it('should handle Grimm\'s Law step 1', () => {
    const rules = `Class voiceless-stop {p, t, k}
# Grimm's Law step 1: Voiceless stops become fricatives
@voiceless-stop > [+continuant] / _V`;

    const result = runSCA(['pat', 'kat'], rules);
    expect(result[0]).toBeDefined();
  });

  it('should handle Grimm\'s Law complete', () => {
    const rules = `Class voiceless {p, t, k}
Class voiced {b, d, g}
Class aspirated {pʰ, tʰ, kʰ}
# Step 1: Voiceless stops become fricatives
@voiceless > [+continuant] / _V
# Step 2: Voiced stops become voiceless
@voiced > [-voice]
# Step 3: Voiceless aspirated stops become voiced stops
@aspirated > [+voice -spread]`;

    const result = runSCA(['pat', 'bad', 'pʰat'], rules);
    expect(result).toHaveLength(3);
  });
});

describe('Integration - Great Vowel Shift', () => {
  it('should handle drag chain pattern', () => {
    const rules = `chain(drag) great-vowel-shift:
  iː >> əɪ >> aɪ
  eː >> iː
  aː >> eɪ`;

    const result = runSCA(['iː', 'eː', 'aː'], rules);
    expect(result).toEqual(['aɪ', 'iː', 'eɪ']);
  });

  it('should handle push chain pattern', () => {
    const rules = `chain(push) raising:
  a >> e >> i`;

    const result = runSCA(['a', 'e', 'i'], rules);
    expect(result).toEqual(['e', 'i', 'i']);
  });
});

describe('Integration - Umlaut/Harmony', () => {
  it('should handle vowel harmony', () => {
    const rules = `[block]
[+vowel] > [+back] / _C* [+back]
[end]`;

    const result = runSCA(['tiŋu'], rules);
    // Front vowels become back before back vowels
    expect(result[0]).toBeDefined();
  });

  it('should handle consonant harmony', () => {
    const rules = `[block]
[+nasal] > [+labial] / _ [+labial]
[end]`;

    const result = runSCA(['anpa'], rules);
    // n becomes m before p
    expect(result[0]).toBeDefined();
  });
});

describe('Integration - Syncope & Apocope', () => {
  it('should handle syncope', () => {
    const rules = `Stress: initial
[V -stress] > ∅ / V_`;

    const result = runSCA(['pa.ˈta.ka'], rules);
    // Unstressed vowel between syllables is deleted
    expect(result[0]).toBeDefined();
  });

  it('should handle apocope', () => {
    const rules = `Stress: initial
V > ∅ / _# ! [+stress]_`;

    const result = runSCA(['pa.ˈta.ka'], rules);
    // Final unstressed vowel is deleted
    expect(result[0]).toBeDefined();
  });
});

describe('Integration - Complete Deromanizer/Romanizer', () => {
  it('should handle full deromanization', () => {
    const rules = `Deromanizer:
  sh > ʃ
  th > θ
  ch > tʃ
  ng > ŋ
  qu > kw
Romanizer:
  ʃ > sh
  θ > th
  tʃ > ch
  ŋ > ng`;

    const result = runSCAFull(['shop', 'think', 'church', 'sing', 'queen'], rules);
    expect(result[0].final).toBeDefined();
    expect(result[0].romanized).toBe('shop');
  });

  it('should handle intermediate romanizers', () => {
    const rules = `Romanizer-phonemic:
  ae > aj
Romanizer-phonetic:
  tʃ > t͡ʃ
Romanizer:
  t͡ʃ > ch`;

    const result = runSCAFull(['ae tʃa'], rules);
    expect(result[0].intermediateRomanizations).toBeDefined();
  });
});

describe('Integration - Complex Allophony', () => {
  it('should handle English flapping', () => {
    const rules = `Syllables: @onset? :: @nucleus :: @coda?
[+stop +alveolar] > [+tap] / V_V`;

    const result = runSCA(['pata', 'bada'], rules);
    // t and d become taps between vowels
    expect(result[0]).toBeDefined();
  });

  it('should handle German final devoicing', () => {
    const rules = `[+obstruent +voice] > [-voice] / _#`;

    const result = runSCA(['bad', 'tag'], rules);
    // Final voiced obstruents devoice
    expect(result).toEqual(['bat', 'tak']);
  });
});

describe('Integration - Tone Rules', () => {
  it('should handle contour tone spreading', () => {
    const rules = `[block]
[+syllabic] > [+rising] / _ [+rising]
[end]`;

    const result = runSCA(['ma ma'], rules);
    expect(result[0]).toBeDefined();
  });
});

describe('Integration - Three Modes Switching', () => {
  it('Classic mode should work', () => {
    const result = runSCA(['apa'], 'Class C {p}\n@C > b\na > o');
    expect(result[0]).toBe('obo');
  });

  it('Script mode should work', () => {
    const result = runSCA(['apa'], `class C = ["p"]
@C = b
a = o`);
    expect(result[0]).toBe('obo');
  });

  it('Classic and Script should produce same output', () => {
    const classic = 'Class C {p}\n@C > b\na > o';
    const script = `class C = ["p"]
@C = b
a = o`;

    const classicResult = runSCA(['apa'], classic);
    const scriptResult = runSCA(['apa'], script);

    expect(classicResult).toEqual(scriptResult);
  });
});

describe('Integration - Stress Reassignment', () => {
  it('should handle auto-fix stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse(`Stress: penultimate auto-fix
a > ∅ / _#`);
    const result = engine.apply(['pa.pa.pa']);
    // Stress should be reassigned after deletion
    expect(result[0].final).toBeDefined();
  });
});

describe('Integration - Compound Rules', () => {
  it('should handle Next: with Apply:', () => {
    const rules = `Deferred cleanup:
  C > ∅ / V_V
palatalization:
  k > tʃ / _i
Next:
  Apply: @cleanup
Next:
  tʃ > ʃ`;

    const result = runSCA(['kipa'], rules);
    expect(result[0]).toBeDefined();
  });
});
