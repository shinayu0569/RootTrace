/**
 * RootTrace SCA - Class Operations Tests
 * 
 * Tests C-k, C-{k,p}, C&V, C&!V, @stop&[+voice].
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Class Exclusion C-k', () => {
  it('should exclude single phoneme', () => {
    const result = runSCA(['pataka'], 'C-k > s');
    // All consonants except k become s (p,t→s, k stays)
    expect(result[0]).toBe('sasaka');
  });

  it('should work with vowels', () => {
    const result = runSCA(['piiiu'], 'V-i > a');
    // All vowels except i become a
    expect(result[0]).toBe('paaaa');
  });
});

describe('Class Exclusion with Set C-{k,p}', () => {
  it('should exclude multiple phonemes', () => {
    const result = runSCA(['pataka'], 'C-{k,p} > s');
    // All consonants except k and p become s (t→s, p and k stay)
    expect(result[0]).toBe('pasaka');
  });

  it('should work with braces', () => {
    const result = runSCA(['pataka'], 'C-{p, t} > s');
    // Exclude p and t
    expect(result[0]).toBe('pasasa');
  });
});

describe('Class Exclusion with Feature C-[+voice]', () => {
  it('should exclude by feature', () => {
    const result = runSCA(['pataka'], 'C-[+voice] > s');
    // All consonants except voiced ones (p, t, k are voiceless)
    expect(result[0]).toBe('sasasa');
  });

  it('should work with negative feature', () => {
    const result = runSCA(['bada'], 'C-[-voice] > s');
    // All consonants except voiceless ones (b, d are voiced)
    expect(result[0]).toBe('bada');
  });
});

describe('Intersection A&B', () => {
  it('should intersect two classes', () => {
    const result = runSCA(['pataka'], 'C&V > s');
    // Consonants AND vowels (none) - no matches
    expect(result[0]).toBe('pataka');
  });

  it('should intersect class with feature', () => {
    const result = runSCA(['pataka'], '@stop&[+voice] > s');
    // Voiced stops become s
    expect(result[0]).toBe('sataka');
  });

  it('should intersect @Class with feature', () => {
    const result = runSCA(['sasa'], `Class sibilant {s, z, ʃ, ʒ}
@sibilant&[+voice] > h`);
    // Voiced sibilants become h
    expect(result[0]).toBe('saha');
  });
});

describe('Subtraction C&!V', () => {
  it('should subtract classes', () => {
    const result = runSCA(['pataka'], 'C&!V > s');
    // Consonants that are NOT vowels (all C)
    expect(result[0]).toBe('sasasa');
  });

  it('should work with features', () => {
    const result = runSCA(['pataka'], 'C&![+stop] > s');
    // Consonants that are not stops (none if only stops present)
    expect(result[0]).toBe('pataka');
  });
});

describe('Complex Class Operations', () => {
  it('should chain operations', () => {
    const result = runSCA(['pataka'], 'C-p&[+stop] > s');
    // Stops except p become s
    expect(result[0]).toBe('pasasa');
  });

  it('should work in environment', () => {
    const result = runSCA(['pataka'], 'a > o / _C-{k}');
    // a before consonant except k becomes o
    expect(result[0]).toBe('potaka');
  });
});

describe('Script Syntax - Class Operations', () => {
  it('should support C-k in Script', () => {
    const result = runSCA(['pataka'], 'C-k = s');
    expect(result[0]).toBe('sasaka');
  });

  it('should support C&V in Script', () => {
    const result = runSCA(['pataka'], 'C&V = s');
    expect(result[0]).toBe('pataka');
  });
});
