/**
 * RootTrace SCA - Capture Variables & Backreferences Tests
 * 
 * Tests <...> capture groups and $1, $2 references.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Capture Groups <...>', () => {
  it('should capture with angle brackets', () => {
    const result = runSCA(['atkaŋni'], '<C><C> > $2ː');
    // Capture two consonants, output second + long mark
    expect(result[0]).toBe('akːaŋni');
  });

  it('should support multiple captures', () => {
    const result = runSCA(['helsinki'], '<C><V><C> > $1$3');
    // Capture CVC, output C + C (drop V)
    expect(result[0]).toBe('hlsnki');
  });

  it('should capture vowels', () => {
    const result = runSCA(['pata'], '<V> > $1ː');
    // Capture vowel, output with length
    expect(result[0]).toBe('paːtaː');
  });
});

describe('Backreferences $1, $2, etc.', () => {
  it('should reference $1', () => {
    const result = runSCA(['pata'], '<C> > $1$1');
    // Double the captured consonant
    expect(result[0]).toBe('ppatta');
  });

  it('should reference $2', () => {
    const result = runSCA(['pata'], '<C><V> > $2$1');
    // Swap captured C and V
    expect(result[0]).toBe('apta');
  });

  it('should reference $3', () => {
    const result = runSCA(['pataka'], '<C><V><C> > $3$2$1');
    // Reverse order
    expect(result[0]).toBe('atapaka');
  });
});

describe('Capture with Features', () => {
  it('should capture feature-matched segment', () => {
    const result = runSCA(['helsinki'], 'n > [@place] / _<[@place]>');
    // n assimilates to place of captured following consonant
    expect(result[0]).toBe('helsiŋki');
  });

  it('should capture with feature sets', () => {
    const result = runSCA(['pata'], '<[+stop]> > s$1');
    // Capture stop, output s + captured stop
    expect(result[0]).toBe('spsatta');
  });
});

describe('Capture in Replacement', () => {
  it('should use capture in complex replacement', () => {
    const result = runSCA(['CV'], '<C><V> > $1-$2');
    // Insert hyphen between captured C and V
    expect(result[0]).toBe('C-V');
  });

  it('should support multiple uses of same capture', () => {
    const result = runSCA(['pa'], '<C> > $1$1$1');
    // Triple the captured consonant
    expect(result[0]).toBe('pppa');
  });
});

describe('Script Syntax - Capture', () => {
  it('should support <...> in Script', () => {
    const result = runSCA(['pata'], '<C><C> = $2$1');
    expect(result[0]).toBe('apta');
  });

  it('should support $n in Script', () => {
    const result = runSCA(['pa'], '<C><V> = $2$1');
    expect(result[0]).toBe('ap');
  });
});
