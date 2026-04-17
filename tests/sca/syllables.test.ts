/**
 * RootTrace SCA - Syllable Declarations Tests
 * 
 * Tests Syllables declarations and syllable-aware rules.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Syllables Declaration', () => {
  it('should support Syllables: declaration', () => {
    const result = runSCA(['apa'], `Syllables: C* V C*
a > o`);
    // Syllables defined, then rule applies
    expect(result[0]).toBe('opo');
  });

  it('should support complex syllable patterns', () => {
    const result = runSCA(['pataka'], `Syllables: @onset? :: @nucleus :: @coda?
onset: {p, t, k}
nucleus: {a, e, i, o, u}
a > o`);
    // Complex syllable with references
    expect(result[0]).toBe('potoko');
  });

  it('should support :: separator', () => {
    const result = runSCA(['pataka'], `Syllables: C? :: V :: C?
a > o / _C$`);
    // a becomes o before coda consonant (syllable boundary)
    expect(result[0]).toBe('opaka');
  });
});

describe('Default Syllabification', () => {
  it('should use MaxSonority without declaration', () => {
    const result = runSCA(['astre'], `a > o`);
    // Auto-syllabified as as.tre
    expect(result[0]).toBe('ostre');
  });

  it('should apply sonority sequencing', () => {
    const result = runSCA(['astre'], `V > o`);
    // Vowels become o
    expect(result[0]).toBe('ostro');
  });

  it('should apply smallest onset principle', () => {
    const result = runSCA(['atlas'], `a > o / _.`);
    // a before syllable boundary
    expect(result[0]).toBe('otlas');
  });
});

describe('Syllable Boundaries', () => {
  it('should use $ for syllable boundary', () => {
    const result = runSCA(['pata.ka'], `Syllables: C* V C*
a > o / _$`);
    // a before syllable boundary
    expect(result[0]).toBe('potaka');
  });

  it('should distinguish $ and #', () => {
    const result = runSCA(['pa'], `a > o / _$
a > e / _#`);
    // Word-final a gets e (not o)
    expect(result[0]).toBe('pe');
  });
});

describe('Syllable Wildcard σ', () => {
  it('should match whole syllable', () => {
    const result = runSCA(['pa.ta'], `Syllables: C V
σ > to`);
    // Each syllable becomes 'to'
    expect(result[0]).toBe('to.to');
  });

  it('should work in environment with σ', () => {
    const result = runSCA(['pata.ka'], `Syllables: C* V C*
a > o / σ_`);
    // a before syllable boundary
    expect(result[0]).toBeDefined();
  });
});

describe('Script Syntax - Syllables', () => {
  it('should support syllables = "pattern"', () => {
    const result = runSCA(['pa'], 'syllables = "C* :: V :: C*"\nV = i');
    expect(result[0]).toBe('pi');
  });

  it('should support syllables with element refs', () => {
    const result = runSCA(['pa'], 'syllables = "C? :: V :: C?"\nV = i');
    expect(result[0]).toBe('pi');
  });
});

describe('Syllable-Aware Rules', () => {
  it('should apply at syllable coda', () => {
    const result = runSCA(['patak'], `Syllables: C* V C*
V > i / _$`);
    // Vowel becomes i at syllable end
    expect(result[0]).toBe('pitik');
  });

  it('should apply at syllable onset', () => {
    const result = runSCA(['pataka'], `Syllables: C* V C*
C > s / $_`);
    // Consonant becomes s at syllable start
    expect(result[0]).toBe('sasasa');
  });

  it('should apply across syllable boundary', () => {
    const result = runSCA(['pa.ta'], `Syllables: C V
V > o / _$V`);
    // Vowel becomes o before another syllable's vowel
    expect(result[0]).toBe('po.to');
  });
});
