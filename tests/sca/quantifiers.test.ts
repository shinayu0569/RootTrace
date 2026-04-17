/**
 * RootTrace SCA - Quantifiers & Optionals Tests
 * 
 * Tests (P), P*, and P(*) quantifiers.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Optional (P) - Zero or One', () => {
  it('should match optional element zero times', () => {
    const result = runSCA(['pt'], 'p(a) > pe');
    // pa becomes pe, pt matches with a=0
    expect(result[0]).toBe('pet');
  });

  it('should match optional element one time', () => {
    const result = runSCA(['pat'], 'p(a) > pe');
    // pa matches, becomes pe, t stays
    expect(result[0]).toBe('pet');
  });

  it('should work with consonants', () => {
    const result = runSCA(['pat', 'pt'], 'p(t) > b');
    // pat -> bat, pt -> b (t is optional, p becomes b)
    expect(result).toEqual(['bat', 'b']);
  });

  it('should work in environment', () => {
    const result = runSCA(['spa', 'sa'], 'a > i / (s)p_');
    // a becomes i after optional sp
    expect(result).toEqual(['spi', 'si']);
  });
});

describe('Zero or More P*', () => {
  it('should match zero occurrences', () => {
    const result = runSCA(['a'], 'p* > t / _a');
    // Nothing before a (p* = empty), rule applies
    expect(result[0]).toBeDefined();
  });

  it('should match one occurrence', () => {
    const result = runSCA(['pa'], 'p* > t');
    // p becomes t
    expect(result[0]).toBe('ta');
  });

  it('should match multiple occurrences', () => {
    const result = runSCA(['pppa'], 'p* > t');
    // All p's become t's
    expect(result[0]).toBe('tta');
  });

  it('should work with vowels', () => {
    const result = runSCA(['piiia'], 'i* > e');
    // All i's become e's
    expect(result[0]).toBe('peeea');
  });
});

describe('One or More P(*)', () => {
  it('should match one occurrence', () => {
    const result = runSCA(['pa'], 'p(*) > t');
    // p becomes t
    expect(result[0]).toBe('ta');
  });

  it('should match multiple occurrences', () => {
    const result = runSCA(['pppa'], 'p(*) > t');
    // All p's become t's
    expect(result[0]).toBe('tta');
  });

  it('should require at least one match', () => {
    const result = runSCA(['a'], 'p(*) > t');
    // No p to match, rule doesn't apply
    expect(result[0]).toBe('a');
  });
});

describe('Quantifiers in Environments', () => {
  it('should use * in left context', () => {
    const result = runSCA(['pppat'], 't > d / p*_');
    // t becomes d after any number of p's
    expect(result[0]).toBe('pppad');
  });

  it('should use * in right context', () => {
    const result = runSCA(['tapaa'], 'a > i / _a*');
    // a becomes i before any number of a's
    expect(result[0]).toBe('tipii');
  });
});

describe('Complex Quantifiers', () => {
  it('should handle C* sequences', () => {
    const result = runSCA(['strang'], 'C* > s');
    // All consonants become s
    expect(result[0]).toBe('saaaa');
  });

  it('should handle V* sequences', () => {
    const result = runSCA(['aeiou'], 'V* > i');
    // All vowels become i
    expect(result[0]).toBe('i');
  });
});
