/**
 * RootTrace SCA - First & Last Match Tests
 * 
 * Tests first() and last() wrappers for single-match rules.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('first() - First Match Only', () => {
  it('should apply only to first match', () => {
    const result = runSCA(['sasas'], 'first(s) > z');
    // Only first s becomes z
    expect(result[0]).toBe('zasas');
  });

  it('should work with vowels', () => {
    const result = runSCA(['papapa'], 'first(a) > o');
    // Only first a becomes o
    expect(result[0]).toBe('popapa');
  });

  it('should work in environment', () => {
    const result = runSCA(['papa'], 'first(a) > o / p_');
    // First a after p becomes o
    expect(result[0]).toBe('popa');
  });

  it('should work with features', () => {
    const result = runSCA(['pataka'], 'first(C) > s');
    // First consonant becomes s
    expect(result[0]).toBe('sataka');
  });
});

describe('last() - Last Match Only', () => {
  it('should apply only to last match', () => {
    const result = runSCA(['sasas'], 'last(s) > z');
    // Only last s becomes z
    expect(result[0]).toBe('sasaz');
  });

  it('should work with vowels', () => {
    const result = runSCA(['papapa'], 'last(a) > o');
    // Only last a becomes o
    expect(result[0]).toBe('papapo');
  });

  it('should work in environment', () => {
    const result = runSCA(['papa'], 'last(a) > o / _p');
    // Last a before p becomes o
    expect(result[0]).toBe('papa');
  });

  it('should work with features', () => {
    const result = runSCA(['pataka'], 'last(C) > s');
    // Last consonant becomes s
    expect(result[0]).toBe('patas');
  });
});

describe('Script Syntax - first()/last()', () => {
  it('should support first() in Script', () => {
    const result = runSCA(['sasas'], 'first(s) = z');
    expect(result[0]).toBe('zasas');
  });

  it('should support last() in Script', () => {
    const result = runSCA(['sasas'], 'last(s) = z');
    expect(result[0]).toBe('sasaz');
  });
});
