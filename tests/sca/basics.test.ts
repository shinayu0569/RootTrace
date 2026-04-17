/**
 * RootTrace SCA - Basic Rules Tests
 * 
 * Tests simple segment replacement, arrows, and named rules.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull, expectSCA } from './helpers';

describe('Basic Rules', () => {
  it('should apply simple segment replacement', () => {
    expectSCA('alabama', 'a > o', 'olobomo');
    expectSCA('utah', 't > p', 'upah');
  });

  it('should support > arrow', () => {
    const result = runSCA(['apa'], 'a > o');
    expect(result[0]).toBe('opo');
  });

  it('should support => arrow', () => {
    const result = runSCA(['apa'], 'a => o');
    expect(result[0]).toBe('opo');
  });

  it('should support → arrow', () => {
    const result = runSCA(['apa'], 'a → o');
    expect(result[0]).toBe('opo');
  });

  it('should apply multiple character changes', () => {
    expectSCA('papapipu', 'p > b', 'bababibu');
  });

  it('should apply vowel replacement', () => {
    expectSCA('titotu', 'i > e', 'tetotu');
    expectSCA('titotu', 'o > u', 'titutu');
  });

  it('should apply consonant replacement', () => {
    expectSCA('kakikoku', 'k > g', 'gagigogu');
    expectSCA('tatitotu', 't > d', 'dadidodu');
  });

  it('should handle multi-character phonemes', () => {
    expectSCA('tʃaʃi', 'tʃ > ts', 'tsaʃi');
    expectSCA('aʊbaʊ', 'aʊ > ow', 'owbow');
  });

  it('should handle diacritics', () => {
    expectSCA('pʰatʰa', 'pʰ > f', 'fatʰa');
    expectSCA('paːta', 'aː > oː', 'poːta');
  });
});

describe('Named Rules', () => {
  it('should support named rules with colon suffix', () => {
    const result = runSCAFull(['alabama'], 'low-vowel-raising:\n  a > o');
    expect(result[0].final).toBe('olobomo');
    expect(result[0].history[0].rule).toBe('low-vowel-raising');
  });

  it('should track named rules in history', () => {
    const result = runSCAFull(['pata'], `vowel-raising:
  a > e
consonant-lenition:
  t > d`);
    expect(result[0].history).toHaveLength(2);
    expect(result[0].history[0].rule).toBe('vowel-raising');
    expect(result[0].history[1].rule).toBe('consonant-lenition');
  });

  it('should support hyphenated names', () => {
    const result = runSCAFull(['apa'], 'my-special-rule:\n  a > o');
    expect(result[0].history[0].rule).toBe('my-special-rule');
  });

  it('should support multiple sub-rules in named block', () => {
    const result = runSCA(['patak'], `lenition:
  p > b
  t > d
  k > g`);
    expect(result[0]).toBe('badag');
  });
});

describe('Rule Ordering', () => {
  it('should apply rules in declaration order', () => {
    const result = runSCA(['pata'], `a > o
p > b`);
    // a > o first: poto, then p > b: boto
    expect(result[0]).toBe('boto');
  });

  it('should feed output of one rule to next', () => {
    const result = runSCA(['pata'], `a > o
o > u`);
    // a > o: poto, then o > u: putu
    expect(result[0]).toBe('putu');
  });

  it('should process multiple words', () => {
    const result = runSCA(['pata', 'kaka', 'titi'], 'a > o');
    expect(result).toEqual(['poto', 'koko', 'titi']);
  });
});

describe('Script Syntax - Basic Rules', () => {
  it('should support = for replacement in Script mode', () => {
    const result = runSCA(['apa'], 'a = o');
    expect(result[0]).toBe('opo');
  });

  it('should support rule keyword with end', () => {
    const result = runSCA(['apa'], `rule vowel-shift:
  a = o
end`);
    expect(result[0]).toBe('opo');
  });

  it('should support multiple rules in Script block', () => {
    const result = runSCA(['patak'], `rule lenition:
  p = b
  t = d
  k = g
end`);
    expect(result[0]).toBe('badag');
  });
});

describe('Script Syntax - Comments', () => {
  it('should support -- comments', () => {
    const result = runSCA(['apa'], '-- this is a comment\na = o');
    expect(result[0]).toBe('opo');
  });

  it('should support inline -- comments', () => {
    const result = runSCA(['apa'], 'a = o  -- inline comment');
    expect(result[0]).toBe('opo');
  });
});

describe('Classic Syntax - Comments', () => {
  it('should support ; comments', () => {
    const result = runSCA(['apa'], '; this is a comment\na > o');
    expect(result[0]).toBe('opo');
  });

  it('should support # comments', () => {
    const result = runSCA(['apa'], '# this is a comment\na > o');
    expect(result[0]).toBe('opo');
  });

  it('should support inline ; comments', () => {
    const result = runSCA(['apa'], 'a > o  ; inline comment');
    expect(result[0]).toBe('opo');
  });
});
