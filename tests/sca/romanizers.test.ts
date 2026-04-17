/**
 * RootTrace SCA - Romanizers Tests
 * 
 * Tests Deromanizer, Romanizer, intermediate romanizers, and literal mode.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Deromanizer', () => {
  it('should support Deromanizer block', () => {
    const result = runSCA(['ae'], `Deromanizer:
  ae > aj
a > o`);
    // Input 'ae' first goes through Deromanizer, becomes 'aj'
    // Then a > o applies
    expect(result[0]).toBe('oj');
  });

  it('should apply before sound changes', () => {
    const result = runSCA(['sh'], `Deromanizer:
  sh > ʃ
ʃ > s`);
    // sh -> ʃ -> s
    expect(result[0]).toBe('s');
  });

  it('should support multiple deromanizations', () => {
    const result = runSCA(['sh th'], `Deromanizer:
  sh > ʃ
  th > θ
ʃ > s
θ > t`);
    // sh -> ʃ -> s, th -> θ -> t
    expect(result[0]).toBe('s t');
  });
});

describe('Romanizer', () => {
  it('should support Romanizer block', () => {
    const result = runSCAFull(['ʃ'], `a > o
Romanizer:
  ʃ > sh`);
    // Romanizer applies at end
    expect(result[0].romanized).toBe('sh');
  });

  it('should convert IPA to orthography', () => {
    const result = runSCAFull(['θaj'], `Romanizer:
  θ > th
  j > y`);
    expect(result[0].romanized).toBe('thay');
  });

  it('should support multiple romanizations', () => {
    const result = runSCAFull(['ʃ ʒ'], `Romanizer:
  ʃ > sh
  ʒ > zh`);
    expect(result[0].romanized).toBe('sh zh');
  });
});

describe('Intermediate Romanizers', () => {
  it('should support named Romanizer', () => {
    const result = runSCAFull(['aj'], `Romanizer-early:
  aj > ai
a > o
Romanizer:
  o > u`);
    // Should capture intermediate romanization
    expect(result[0].intermediateRomanizations['early']).toBeDefined();
  });

  it('should preserve intermediate state', () => {
    const result = runSCAFull(['pata'], `Romanizer-mid:
  p > b
a > o
Romanizer:
  o > u`);
    expect(result[0].intermediateRomanizations['mid']).toBeDefined();
    expect(result[0].final).toBe('butu');
  });
});

describe('Deromanizer Literal Mode', () => {
  it('should support literal keyword', () => {
    const result = runSCA(["ʼ"], `Deromanizer literal:
  ʼ > ʔ
ʔ > ?`);
    // Literal mode ignores IPA declarations
    expect(result[0]).toBe('?');
  });

  it('should treat symbols literally in literal mode', () => {
    const result = runSCA(['pʼ'], `Deromanizer literal:
  ʼ > ʔ
Then:
  {p, t, k} > [+ejective]`);
    // ʼ is treated as glottal stop in literal mode
    expect(result[0]).toBeDefined();
  });
});

describe('Romanizer Literal Mode', () => {
  it('should support literal in Romanizer', () => {
    const result = runSCAFull(['ʔ'], `Romanizer literal:
  ʔ > 'a`);
    expect(result[0].romanized).toBe("'a");
  });
});

describe('Script Syntax - Romanizers', () => {
  it('should support deromanizer in Script', () => {
    const result = runSCA(['sh'], `deromanizer:
  sh = ʃ
end
ʃ = s`);
    expect(result[0]).toBe('s');
  });

  it('should support romanizer in Script', () => {
    const result = runSCAFull(['ʃ'], `romanizer:
  ʃ = sh
end`);
    expect(result[0].romanized).toBe('sh');
  });

  it('should support def deromanizer()', () => {
    const result = runSCA(['sh', 'th'], `def deromanizer():
  sh = ʃ
  th = θ
end
ʃ = s
θ = t`);
    expect(result).toEqual(['s', 't']);
  });

  it('should support def romanizer()', () => {
    const result = runSCA(['ʃ', 'θ'], `def romanizer():
  ʃ = sh
  θ = th
end`);
    expect(result).toEqual(['sh', 'th']);
  });
});
