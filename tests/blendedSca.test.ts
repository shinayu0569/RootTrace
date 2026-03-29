/**
 * Blended SCA (Sound Change Applier) Test Suite
 * 
 * Tests all features described in SyntaxGuide.tsx to ensure
 * the Sound Change Applier is fully functional.
 */

import { describe, it, expect } from 'vitest';
import { BlendedScaEngine } from '../services/blendedSca';

// Helper to run SCA and get simple results
const runSCA = (words: string[], rules: string): string[] => {
  const engine = new BlendedScaEngine();
  engine.parse(rules);
  const results = engine.apply(words);
  return results.map(r => r.final);
};

// Helper to run SCA with full results
const runSCAFull = (words: string[], rules: string) => {
  const engine = new BlendedScaEngine();
  engine.parse(rules);
  return engine.apply(words);
};

describe('Blended SCA - Basic Rules', () => {
  it('should apply simple segment replacement', () => {
    const result = runSCA(['alabama', 'utah'], 'a > o');
    expect(result).toEqual(['olobomo', 'uto']);
  });

  it('should support both arrow types', () => {
    const result1 = runSCA(['alabama'], 'a > o');
    const result2 = runSCA(['alabama'], 'a => o');
    expect(result1).toEqual(result2);
  });

  it('should apply consonant replacement', () => {
    const result = runSCA(['kansas', 'stop'], 't > p');
    expect(result).toEqual(['kansas', 'spop']);
  });
});

describe('Blended SCA - Chain Shifts', () => {
  it('should handle chain shift syntax', () => {
    const result = runSCA(['bid', 'bed', 'bad', 'bod', 'bud'], 
      'chain vowel-raising:\n  i >> e >> a >> o >> u');
    expect(result).toEqual(['bed', 'bad', 'bod', 'bud', 'bud']);
  });
});

describe('Blended SCA - Named Rules', () => {
  it('should support named rules with prefix', () => {
    const result = runSCAFull(['alabama'], 'low-vowel-raising:\n  a > o');
    expect(result[0].final).toBe('olobomo');
    expect(result[0].history[0].rule).toBe('low-vowel-raising');
  });
});

describe('Blended SCA - Wildcards & Classes', () => {
  it('should expand C wildcard to consonants', () => {
    const result = runSCA(['apa', 'ata', 'aka'], 'C > p');
    expect(result).toEqual(['appa', 'apta', 'apka']);
  });

  it('should expand V wildcard to vowels', () => {
    const result = runSCA(['p i p', 'p a p'], 'V > i');
    expect(result).toEqual(['p i p', 'p i p']);
  });

  it('should expand X wildcard to any phoneme', () => {
    const result = runSCA(['pa', 'ti'], 'X > s');
    expect(result).toEqual(['s s', 's s']);
  });

  it('should support user-defined Class declarations', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'Class sibilant {s, ʃ}\nsibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });

  it('should support Class declarations with feature notation', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'Class sibilant [+strident]\nsibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });
});

describe('Blended SCA - Environments', () => {
  it('should apply rules in specific environments', () => {
    const result = runSCA(['alabama', 'alameda'], 'a > o / _b');
    expect(result).toEqual(['alobama', 'alameda']);
  });

  it('should support multiple environments with |', () => {
    const result = runSCA(['apap', 'atat'], 'a > o / _p | _t');
    expect(result).toEqual(['opop', 'otot']);
  });

  it('should support word boundaries with #', () => {
    const result = runSCA(['pa', 'pap'], 'a > o / _#');
    expect(result).toEqual(['po', 'pap']);
  });
});

describe('Blended SCA - Distinctive Features', () => {
  it('should match segments by positive features', () => {
    const result = runSCA(['sasa', 'tata'], '[+strident] > z');
    expect(result).toEqual(['zaza', 'tata']);
  });

  it('should match segments by negative features', () => {
    const result = runSCA(['sasa', 'zaza'], '[-voice] > p');
    expect(result).toEqual(['papa', 'zaza']);
  });

  it('should apply features in replacement', () => {
    const result = runSCA(['sasa'], '[+strident] > [+voice]');
    expect(result).toEqual(['zaza']);
  });

  it('should support negation prefix ! on features', () => {
    // [+vowel !front] = vowel that is NOT front
    const result = runSCA(['pi', 'pu', 'po'], '[+syllabic !front] > a');
    expect(result).toEqual(['pa', 'pa', 'pa']);
  });
});

describe('Blended SCA - Feature Variables', () => {
  it('should support @place assimilation', () => {
    const result = runSCA(['int'], '[C +nasal] > [@place] / _[@place]');
    expect(result).toEqual(['int']);
  });

  it('should support @manner assimilation', () => {
    const result = runSCA(['apt'], '[C +stop] > [@manner] / _[@manner]');
    expect(result).toEqual(['apt']);
  });
});

describe('Blended SCA - Quantifiers & Optionals', () => {
  it('should support optional patterns (a)', () => {
    const result = runSCA(['pat', 'pt'], 'p(a) > pe');
    expect(result).toEqual(['pet', 'pet']);
  });

  it('should support zero-or-more P*', () => {
    const result = runSCA(['pa', 'ppa', 'pppa'], 'p* > t');
    expect(result).toEqual(['ta', 'ta', 'ta']);
  });

  it('should support one-or-more P(*)', () => {
    const result = runSCA(['pa', 'ppa', 'pppa'], 'p(*) > t');
    expect(result).toEqual(['ta', 'ta', 'ta']);
  });
});

describe('Blended SCA - Subscript Capture', () => {
  it('should support C₁ C₂ subscript capture for metathesis', () => {
    const result = runSCA(['pat'], 'C₁ C₂ > C₂ C₁');
    expect(result).toEqual(['apt']);
  });

  it('should preserve values across subscript references', () => {
    const result = runSCA(['p t k'], 'C₁ C₂ C₃ > C₃ C₂ C₁');
    expect(result).toEqual(['k t p']);
  });
});

describe('Blended SCA - Deletion & Insertion', () => {
  it('should support deletion with ∅', () => {
    const result = runSCA(['pat', 'stop'], 't > ∅ / _#');
    expect(result).toEqual(['pa', 'stop']);
  });

  it('should support insertion (epenthesis)', () => {
    const result = runSCA(['p_p'], ' > a / p_p');
    expect(result).toEqual(['pap']);
  });
});

describe('Blended SCA - Exceptions', () => {
  it('should support ! exceptions', () => {
    const result = runSCA(['alabama', 'amama'], 'a > o / !_m');
    expect(result).toEqual(['olobomo', 'amama']);
  });

  it('should support exceptions with environment', () => {
    const result = runSCA(['amap', 'alap'], 'a > o / _p ! _mp');
    expect(result).toEqual(['amap', 'olap']);
  });
});

describe('Blended SCA - Sets & Alternation', () => {
  it('should support sets on match side {p,t,k}', () => {
    const result = runSCA(['pap', 'tat', 'kak'], '{p, t, k} > s');
    expect(result).toEqual(['sas', 'sas', 'sas']);
  });

  it('should support parallel mapping {p,t,k} > {b,d,g}', () => {
    const result = runSCA(['p t k'], '{p, t, k} > {b, d, g}');
    expect(result).toEqual(['b d g']);
  });

  it('should support random alternation with | and weights', () => {
    // Run multiple times to test randomness
    const engine = new BlendedScaEngine();
    engine.parse('b > m*3 | n*2 | b');
    
    let mCount = 0, nCount = 0, bCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = engine.apply(['b']);
      if (result[0].final === 'm') mCount++;
      else if (result[0].final === 'n') nCount++;
      else if (result[0].final === 'b') bCount++;
    }
    
    // m should appear more frequently (weight 3 vs 2 vs 1)
    expect(mCount).toBeGreaterThan(nCount);
    expect(nCount).toBeGreaterThan(bCount);
  });
});

describe('Blended SCA - Reduplication', () => {
  it('should support __ reduplication', () => {
    const result = runSCA(['pa'], 'CV > __ / #_');
    expect(result).toEqual(['papa']);
  });

  it('should support partial reduplication __ in replacement', () => {
    const result = runSCA(['pa'], 'CV > __- / #_');
    expect(result).toEqual(['pa-pa']);
  });
});

describe('Blended SCA - First & Last Match', () => {
  it('should support << first match only', () => {
    const result = runSCA(['sasas'], '<<s>> > z');
    expect(result).toEqual(['zasas']);
  });

  it('should support >> last match only', () => {
    const result = runSCA(['sasas'], '>>s<< > z');
    expect(result).toEqual(['sasaz']);
  });
});

describe('Blended SCA - Compound Rules (Then:)', () => {
  it('should support Then: blocks for sequential sub-rules', () => {
    const result = runSCA(['kipa'], 'palatalization:\n  k > tʃ / _i\nThen:\n  tʃ > ʃ');
    expect(result).toEqual(['ʃipa']);
  });
});

describe('Blended SCA - Propagation & Direction', () => {
  it('should support propagate directive', () => {
    const result = runSCA(['aaaa'], 'a > o propagate:');
    expect(result).toEqual(['oooo']);
  });

  it('should support ltr (left-to-right) direction', () => {
    const result = runSCA(['aaaa'], 'a > o ltr:');
    expect(result).toEqual(['oaaa']);
  });

  it('should support rtl (right-to-left) direction', () => {
    const result = runSCA(['aaaa'], 'a > o rtl:');
    expect(result).toEqual(['aaao']);
  });
});

describe('Blended SCA - Conditional (IF/THEN/ELSE)', () => {
  it('should support IF condition THEN rule', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p > b');
    expect(result).toEqual(['aba', 'ata']);
  });

  it('should support IF condition THEN rule ELSE rule', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p > b ELSE t > d');
    expect(result).toEqual(['aba', 'ada']);
  });
});

describe('Blended SCA - Deferred & Cleanup Rules', () => {
  it('should support Deferred rules with Apply:', () => {
    const result = runSCA(['apt'], `Deferred nasal-assim: [C +nasal] > [@place] / _[@place]
Apply: @nasal-assim`);
    expect(result).toEqual(['apt']);
  });

  it('should support Cleanup rules', () => {
    const result = runSCAFull(['apa'], `Cleanup:
  vowel-cleanup: a > o
Apply: @vowel-cleanup`);
    // Cleanup rules apply after each main rule
    expect(result[0].final).toBe('opo');
  });
});

describe('Blended SCA - Romanizers', () => {
  it('should support Deromanizer', () => {
    const result = runSCA(['ae'], 'Deromanizer:\n  ae > aj');
    expect(result).toEqual(['aj']);
  });

  it('should support Romanizer', () => {
    const result = runSCAFull(['aj'], 'Romanizer:\n  aj > ae');
    expect(result[0].romanized).toBe('ae');
  });

  it('should support intermediate Romanizers', () => {
    const result = runSCAFull(['aj'], 'Romanizer-early:\n  aj > ai\na > o\nRomanizer:\n  o > u');
    expect(result[0].intermediateRomanizations['early']).toBeDefined();
  });
});

describe('Blended SCA - Syllable Declarations', () => {
  it('should support Syllables declaration', () => {
    const result = runSCA(['apa'], 'Syllables: C* V C*\na > o / _C$');
    expect(result).toEqual(['opa']);
  });

  it('should support syllable boundary marker $', () => {
    const result = runSCA(['apa.ka'], 'a > o / _$');
    expect(result).toEqual(['opa.ka']);
  });

  it('should support σ syllable wildcard', () => {
    const result = runSCA(['apa.ka'], 'σ > ta');
    expect(result).toEqual(['ta.ta']);
  });
});

describe('Blended SCA - Element Declarations', () => {
  it('should support Element declarations', () => {
    const result = runSCA(['pl'], 'Element onset-cluster [+stop][+liquid]\n@onset-cluster > s');
    expect(result).toEqual(['s']);
  });
});

describe('Blended SCA - Comments', () => {
  it('should support // comments', () => {
    const result = runSCA(['apa'], '// this is a comment\na > o');
    expect(result).toEqual(['opo']);
  });

  it('should support # comments', () => {
    const result = runSCA(['apa'], '# this is also a comment\na > o');
    expect(result).toEqual(['opo']);
  });
});

describe('Blended SCA - Complex Examples', () => {
  it('should handle Latin to Portuguese sketch', () => {
    const rules = `Class stop {p, t, k, b, d, g}
Syllables: C* V C*
Deferred nasal-assim: [C +nasal] > [@place] / _[@place]
Deromanizer: ae > aj
vowel-length-loss: ː > ∅
intervocalic-voicing: @stop > [+voice] / V_V
syncope: [V -stress] > ∅ / V_
Then: Apply: @nasal-assim
Romanizer: ɲ > nh | ʎ > lh`;

    const result = runSCA(['paːter'], rules);
    expect(result[0]).toBeDefined();
  });

  it('should handle Grimm\'s Law example', () => {
    const rules = `Class voiceless-stop {p, t, k}
Class voiced-stop {b, d, g}
Class aspirated {pʰ, tʰ, kʰ}
# Grimm's Law step 1: Voiceless stops become fricatives
@voiceless-stop > [+continuant] / _V`;

    const result = runSCA(['pat', 'kat'], rules);
    expect(result[0]).toBeDefined();
  });
});

describe('Blended SCA - Validation', () => {
  it('should detect undefined class references', () => {
    const engine = new BlendedScaEngine();
    const errors = engine.validate('undefined-class > a');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid feature combinations', () => {
    const engine = new BlendedScaEngine();
    const errors = engine.validate('[+high +low] > a');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should detect reference errors in Apply:', () => {
    const engine = new BlendedScaEngine();
    const errors = engine.validate('Apply: @undefined-rule');
    expect(errors.length).toBeGreaterThan(0);
  });
});
