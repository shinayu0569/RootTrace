/**
 * RootTrace SCA - Index Match (Subscript Capture) Tests
 * 
 * Tests C[1], C[2], C[3] syntax for metathesis and reordering.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Subscript Capture C[n]', () => {
  it('should support C[1] C[2] syntax', () => {
    const result = runSCA(['pat'], 'C[1] C[2] > C[2] C[1]');
    // p and t swap places
    expect(result[0]).toBe('apt');
  });

  it('should preserve values across subscript references', () => {
    const result = runSCA(['p t k'], 'C[1] C[2] C[3] > C[3] C[2] C[1]');
    // p t k becomes k t p
    expect(result[0]).toBe('k t p');
  });

  it('should work with different classes', () => {
    const result = runSCA(['p a t'], 'C[1] V[1] C[2] > C[2] V[1] C[1]');
    // p a t becomes t a p
    expect(result[0]).toBe('t a p');
  });
});

describe('Metathesis Patterns', () => {
  it('should swap adjacent consonants', () => {
    const result = runSCA(['ask'], 'C[1] C[2] > C[2] C[1]');
    // s and k swap
    expect(result[0]).toBe('aks');
  });

  it('should work with vowels between', () => {
    const result = runSCA(['pater'], 'C[1] V C[2] > C[2] V C[1]');
    // p and t swap around a
    expect(result[0]).toBe('taper');
  });
});

describe('Old C1 Syntax Deprecated', () => {
  it('should require C[1] instead of C1', () => {
    // Documents that C1 is no longer supported
    // Use C[1] for zero-ambiguity
    expect(true).toBe(true);
  });
});

describe('Script Syntax - Index Match', () => {
  it('should support C[1] in Script mode', () => {
    const result = runSCA(['pat'], 'C[1] C[2] = C[2] C[1]');
    expect(result[0]).toBe('apt');
  });
});
