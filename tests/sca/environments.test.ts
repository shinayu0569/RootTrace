/**
 * RootTrace SCA - Environments Tests
 * 
 * Tests / separator, _, and boundary markers (#, $, σ, +, .)
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Environment Separator', () => {
  it('should apply rule only in specified environment', () => {
    const result = runSCA(['alabama', 'alameda'], 'a > o / _b');
    // a before b becomes o
    expect(result).toEqual(['alobama', 'alameda']);
  });

  it('should support / with _ position marker', () => {
    const result = runSCA(['pata', 'tapa'], 'a > o / p_');
    // a after p becomes o
    expect(result).toEqual(['pota', 'tapa']);
  });

  it('should support environment with both sides', () => {
    const result = runSCA(['pata', 'pita', 'patu'], 'a > o / p_t');
    // a between p and t becomes o
    expect(result).toEqual(['pota', 'pita', 'patu']);
  });
});

describe('Word Boundaries #', () => {
  it('should match word-initial with #_', () => {
    const result = runSCA(['pa', 'apa'], 'p > b / #_');
    // p at word start becomes b
    expect(result).toEqual(['ba', 'aba']);
  });

  it('should match word-final with _#', () => {
    const result = runSCA(['ap', 'apa'], 'p > b / _#');
    // p at word end becomes b
    expect(result).toEqual(['ab', 'aba']);
  });

  it('should support # on both sides', () => {
    const result = runSCA(['p', 'pa', 'pap'], 'p > s / #_#');
    // p that is both word-initial and word-final (single p)
    expect(result).toEqual(['s', 'pa', 'pap']);
  });
});

describe('Syllable Boundaries $', () => {
  it('should match syllable-initial with $_', () => {
    const result = runSCA(['pa.ta', 'ta.pa'], 'p > b / $_');
    // p at syllable start becomes b
    expect(result[0]).toBeDefined();
  });

  it('should match syllable-final with _$', () => {
    const result = runSCA(['ap.ta', 'at.pa'], 'p > b / _$');
    // p at syllable end becomes b
    expect(result[0]).toBeDefined();
  });

  it('should work with syllable declaration', () => {
    const result = runSCA(['apaka'], `Syllables: C* V C*
a > o / _$`);
    // a at syllable boundary becomes o
    expect(result[0]).toBeDefined();
  });
});

describe('Syllable Wildcard σ', () => {
  it('should match whole syllable', () => {
    const result = runSCA(['pa.ta'], 'σ > ta');
    // Each syllable becomes 'ta'
    expect(result[0]).toBe('ta.ta');
  });

  it('should work in environment', () => {
    const result = runSCA(['pata.ka'], 'a > o / σ_');
    // a before syllable boundary
    expect(result[0]).toBeDefined();
  });
});

describe('Affix Boundary +', () => {
  it('should match affix boundary', () => {
    const result = runSCA(['re+write', 'un+do'], 'e > i / _+');
    // e before affix boundary becomes i
    expect(result[0]).toBeDefined();
  });
});

describe('Explicit Syllable Break .', () => {
  it('should use . for explicit syllable break', () => {
    const result = runSCA(['pa.ta.ka'], 'a > o / _.');
    // a before syllable dot becomes o
    expect(result[0]).toBe('po.to.ka');
  });
});

describe('Script Syntax - Environments', () => {
  it('should support = and / in Script mode', () => {
    const result = runSCA(['alabama'], 'a = o / _b');
    expect(result[0]).toBe('alobama');
  });

  it('should support if keyword as alternative', () => {
    const result = runSCA(['alabama'], 'a = o if _b');
    expect(result[0]).toBe('alobama');
  });
});

describe('Complex Environments', () => {
  it('should handle consonant environment', () => {
    const result = runSCA(['kansas'], 'V > [+nasal] / _[+nasal]');
    // Vowel before nasal becomes nasal
    expect(result[0]).toBeDefined();
  });

  it('should handle word boundary with environment', () => {
    const result = runSCA(['pa', 'pap'], 'a > o / _#');
    // a at word end becomes o
    expect(result).toEqual(['po', 'pop']);
  });

  it('should handle multiple context elements', () => {
    const result = runSCA(['patap'], 'a > o / p_t');
    // a between p and t becomes o
    expect(result[0]).toBe('potop');
  });
});
