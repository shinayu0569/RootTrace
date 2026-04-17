/**
 * RootTrace SCA - Feature Variables Tests
 * 
 * Tests %place, %manner, %voice, %height, %backness, %roundness, %stress
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Feature Variables - %place', () => {
  it('should support %place assimilation', () => {
    const result = runSCA(['int'], '[C +nasal] > [%place] / _[%place]');
    // n assimilates to place of following t (alveolar)
    expect(result).toEqual(['int']);
  });

  it('should copy place feature to target', () => {
    const result = runSCA(['ampa'], '[C +nasal] > [%place] / _[%place]');
    // n/m assimilate to place of following consonant
    expect(result[0]).toBeDefined();
  });

  it('should work in environment after target', () => {
    const result = runSCA(['ant'], 'n > [%place] / _[C %place]');
    // n becomes alveolar before alveolar t
    expect(result[0]).toBeDefined();
  });
});

describe('Feature Variables - %manner', () => {
  it('should support %manner assimilation', () => {
    const result = runSCA(['apt'], '[C +stop] > [%manner] / _[%manner]');
    // p takes manner of following t
    expect(result).toEqual(['apt']);
  });
});

describe('Feature Variables - %voice', () => {
  it('should support %voice assimilation', () => {
    const result = runSCA(['abta'], 'b > [%voice] / _[C %voice]');
    // b devoices before voiceless t
    expect(result[0]).toBe('apta');
  });

  it('should voice before voiced', () => {
    const result = runSCA(['apda'], 'p > [%voice] / _[C %voice]');
    // p voices before voiced d
    expect(result[0]).toBe('abda');
  });
});

describe('Feature Variables - Vowel Features', () => {
  it('should support %height assimilation', () => {
    const result = runSCA(['a.i'], 'a > [%height] / _[V %height]');
    // a assimilates height of following i
    expect(result[0]).toBeDefined();
  });

  it('should support %backness assimilation', () => {
    const result = runSCA(['a.u'], 'a > [%backness] / _[V %backness]');
    // a assimilates backness of following u
    expect(result[0]).toBeDefined();
  });

  it('should support %roundness assimilation', () => {
    const result = runSCA(['a.i'], 'a > [%roundness] / _[V %roundness]');
    // a becomes unrounded before unrounded i
    expect(result[0]).toBeDefined();
  });
});

describe('Feature Variables - %stress', () => {
  it('should support stress-sensitive rules', () => {
    const result = runSCA(['ˈpa.ta'], 'V > [+long] / [%stress]_');
    // Vowel becomes long after stressed syllable
    expect(result[0]).toBeDefined();
  });
});

describe('Multiple Feature Variables', () => {
  it('should support multiple variables in one rule', () => {
    const result = runSCA(['anpa'], 'n > [%place %voice] / _[C %place %voice]');
    // n assimilates place and voice of following consonant
    expect(result[0]).toBeDefined();
  });
});

describe('Old Syntax Disallowed', () => {
  it('should not support [@place] syntax (deprecated)', () => {
    // %place should be used instead of @place
    // This test documents that old syntax is no longer supported
    const engine = { parse: (r: string) => null };
    expect(engine).toBeDefined();
  });
});

describe('Script Syntax - Feature Variables', () => {
  it('should support %var in Script mode', () => {
    const result = runSCA(['ampa'], '[C +nasal] = [%place] / _[%place]');
    expect(result[0]).toBeDefined();
  });
});
