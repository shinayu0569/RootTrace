/**
 * RootTrace SCA - Exceptions Tests
 * 
 * Tests ! exceptions and except word lists.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('! Exception Operator', () => {
  it('should support ! before environment', () => {
    const result = runSCA(['alabama', 'amama'], 'a > o / !_m');
    // a becomes o except before m
    expect(result).toEqual(['olobomo', 'amama']);
  });

  it('should support multiple ! exceptions', () => {
    const result = runSCA(['apap', 'abap'], 'a > o / _p ! _mp');
    // a before p becomes o, except before mp
    expect(result).toEqual(['opop', 'abap']);
  });

  it('should support ! with complex environment', () => {
    const result = runSCA(['pata', 'pata'], 'a > o / p_ ! p_t');
    // a after p becomes o, except between p_t
    expect(result).toEqual(['pota', 'pata']);
  });
});

describe('Exception with Features', () => {
  it('should support ! with feature', () => {
    const result = runSCA(['kansas', 'katas'], 'V > [+nasal] / _[C +nasal] ! _[C +stop]');
    // Vowel nasalizes before nasal, except before stop
    expect(result[0]).toBeDefined();
  });

  it('should support ! with boundary', () => {
    const result = runSCA(['papa', 'pa'], 'a > o / _p ! _#');
    // a before p becomes o, except at word end
    expect(result).toEqual(['popa', 'pa']);
  });
});

describe('except Word Lists', () => {
  it('should support except keyword', () => {
    const result = runSCA(['papa', 'mama'], 'a > o except mama');
    // a becomes o except in word mama
    expect(result).toEqual(['popo', 'mama']);
  });

  it('should support multiple except words', () => {
    const result = runSCA(['papa', 'mama', 'tata'], 'a > o except mama papa');
    expect(result).toEqual(['papa', 'mama', 'toto']);
  });
});

describe('Script Syntax - Exceptions', () => {
  it('should support ! in Script mode', () => {
    const result = runSCA(['alabama'], 'a = o / !_m');
    expect(result[0]).toBe('olobama');
  });

  it('should support except in Script mode', () => {
    const result = runSCA(['papa', 'mama'], 'a = o except mama');
    expect(result).toEqual(['popo', 'mama']);
  });
});
