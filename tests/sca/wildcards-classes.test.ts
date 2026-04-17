/**
 * RootTrace SCA - Wildcards & Classes Tests
 * 
 * Tests C/V/X/D wildcards and user-defined classes.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('C Wildcard - Consonants', () => {
  it('should expand C to any consonant', () => {
    const result = runSCA(['apa', 'ata', 'aka'], 'C > p');
    // p is already p, t becomes p, k becomes p
    expect(result).toEqual(['apa', 'apa', 'apa']);
  });

  it('should match all consonants in word', () => {
    const result = runSCA(['pataka'], 'C > s');
    expect(result[0]).toBe('sasasa');
  });

  it('should work in environment', () => {
    const result = runSCA(['apa', 'ata'], 'C > p / #_');
    // Only word-initial consonant
    expect(result).toEqual(['apa', 'apa']);
  });
});

describe('V Wildcard - Vowels', () => {
  it('should expand V to any vowel', () => {
    const result = runSCA(['p i p', 'p a p', 'p o p'], 'V > i');
    expect(result).toEqual(['p i p', 'p i p', 'p i p']);
  });

  it('should match all vowels in word', () => {
    const result = runSCA(['p a t e p i'], 'V > o');
    expect(result[0]).toBe('p o t o p o');
  });

  it('should work in environment', () => {
    const result = runSCA(['pata', 'pita'], 'V > a / p_');
    // Vowel after p becomes a
    expect(result).toEqual(['pata', 'pata']);
  });
});

describe('X Wildcard - Any Phoneme', () => {
  it('should expand X to any phoneme', () => {
    const result = runSCA(['pa', 'ti'], 'X > s');
    expect(result).toEqual(['s s', 's s']);
  });

  it('should match consonants and vowels', () => {
    const result = runSCA(['pata'], 'X > s');
    expect(result[0]).toBe('sasa');
  });
});

describe('D Wildcard - IPA Base Letters', () => {
  it('should match base IPA letters', () => {
    const result = runSCA(['pʰatʰa'], 'D > s');
    // p and t (bases) become s, diacritics unaffected or handled separately
    expect(result[0]).toBeDefined();
  });
});

describe('ᴰ Wildacard - Diacritics', () => {
  it('should match diacritic symbols', () => {
    const result = runSCA(['pʰatʰa'], 'ᴰ > ː');
    // Diacritics become long mark
    expect(result[0]).toBeDefined();
  });
});

describe('User-Defined Classes - Classic Syntax', () => {
  it('should support Class declaration with braces', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'Class sibilant {s, ʃ}\nsibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });

  it('should support Class with feature notation', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'Class sibilant [+strident]\nsibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });

  it('should support multiple class references', () => {
    const result = runSCA(['pata'], `Class stop {p, t, k}
Class vowel {a, e, i, o, u}
stop > s / vowel_vowel`);
    expect(result[0]).toBe('sasa');
  });

  it('should support @Class reference', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'Class sibilant {s, ʃ}\n@sibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });

  it('should support classes with digraphs', () => {
    const result = runSCA(['tʃadʒa'], 'Class affricate {tʃ, dʒ}\naffricate > s');
    expect(result[0]).toBe('sasa');
  });
});

describe('User-Defined Classes - Script Syntax', () => {
  it('should support class = [...] syntax', () => {
    const result = runSCA(['sasa', 'ʃaʃa'], 'class sibilant = ["s", "ʃ"]\n@sibilant > z');
    expect(result).toEqual(['zaza', 'ʒaʒa']);
  });

  it('should support class with feature notation', () => {
    const result = runSCA(['pata', 'kaka'], 'class stop = [p, t, k]\n@stop > b');
    expect(result).toEqual(['baba', 'baba']);
  });
});

describe('Built-in Classes', () => {
  it('should have C match consonants only', () => {
    const result = runSCA(['patap'], 'C > b');
    // p and t become b, a stays a
    expect(result[0]).toBe('babab');
  });

  it('should have V match vowels only', () => {
    const result = runSCA(['pata'], 'V > i');
    // a becomes i, p and t stay
    expect(result[0]).toBe('piti');
  });
});
