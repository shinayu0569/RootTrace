/**
 * RootTrace SCA - Distinctive Features Tests
 * 
 * Tests [+feature], [-feature], and [!feature] syntax.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Positive Features [+feature]', () => {
  it('should match segments by positive feature', () => {
    const result = runSCA(['sasa', 'tata'], '[+strident] > z');
    // s is strident, becomes z; t is not strident
    expect(result).toEqual(['zaza', 'tata']);
  });

  it('should match stops', () => {
    const result = runSCA(['pata', 'kaka'], '[+stop] > b');
    // p, t, k are stops
    expect(result[0]).toBe('baba');
  });

  it('should match nasals', () => {
    const result = runSCA(['mana', 'papa'], '[+nasal] > m');
    // n, m become m (already m), others unaffected
    expect(result[0]).toBe('mama');
  });

  it('should match voiceless', () => {
    const result = runSCA(['pata', 'bada'], '[-voice] > t');
    // p, t are voiceless
    expect(result[0]).toBe('tata');
  });
});

describe('Negative Features [-feature]', () => {
  it('should match segments lacking feature', () => {
    const result = runSCA(['pata', 'bada'], '[-voice] > s');
    // p, t lack voice
    expect(result[0]).toBe('sasa');
  });

  it('should apply to non-nasals', () => {
    const result = runSCA(['pata', 'mana'], '[-nasal] > s');
    // p, t, a lack nasality
    expect(result[0]).toBe('sasa');
  });
});

describe('Multiple Features', () => {
  it('should match with combined features', () => {
    const result = runSCA(['pata'], '[+stop -voice] > s');
    // Voiceless stops (p, t) become s
    expect(result[0]).toBe('sasa');
  });

  it('should match with + and - features', () => {
    const result = runSCA(['bada'], '[+stop +voice] > z');
    // Voiced stops (b, d) become z
    expect(result[0]).toBe('zaza');
  });
});

describe('Feature Negation [!feature]', () => {
  it('should match vowels not front', () => {
    const result = runSCA(['pi', 'pu', 'po'], '[+syllabic !front] > a');
    // i is front (unchanged), u, o are not front (become a)
    expect(result).toEqual(['pi', 'pa', 'pa']);
  });

  it('should match non-strident', () => {
    const result = runSCA(['sasa', 'tata'], '[+consonant !strident] > p');
    // t is non-strident, s is strident
    expect(result[0]).toBe('sasa');
    expect(result[1]).toBe('papa');
  });
});

describe('Features in Replacement', () => {
  it('should apply feature change to target', () => {
    const result = runSCA(['sasa'], '[+strident] > [+voice]');
    // Voiceless stridents become voiced
    expect(result[0]).toBe('zaza');
  });

  it('should add features', () => {
    const result = runSCA(['papa'], 'V > [+nasal]');
    // Vowels become nasalized
    expect(result[0]).toBe('pãpã');
  });

  it('should support multiple feature changes', () => {
    const result = runSCA(['pata'], '[+stop -voice] > [+voice +continuant]');
    // Voiceless stops become voiced fricatives
    expect(result[0]).toBe('βaða');
  });
});

describe('Features in Environment', () => {
  it('should match feature in environment', () => {
    const result = runSCA(['kansas'], 'V > [+nasal] / _[C +nasal]');
    // Vowel before nasal consonant becomes nasal
    expect(result[0]).toBe('kãnsas');
  });

  it('should match negative feature in environment', () => {
    const result = runSCA(['pata', 'papa'], 'a > o / _[-nasal]');
    // a before non-nasal
    expect(result[0]).toBe('pota');
  });
});

describe('Standard IPA Features', () => {
  it('should support place features', () => {
    const result = runSCA(['pata'], '[+labial] > m');
    // Labial consonants become m
    expect(result[0]).toBe('mata');
  });

  it('should support manner features', () => {
    const result = runSCA(['pata', 'fafa'], '[+stop] > s');
    // Stops become s
    expect(result[0]).toBe('sasa');
  });

  it('should support vowel features', () => {
    const result = runSCA(['pi', 'pu'], '[+high] > i');
    // High vowels become i
    expect(result).toEqual(['pi', 'pi']);
  });
});

describe('Script Syntax - Features', () => {
  it('should support features in Script mode', () => {
    const result = runSCA(['sasa'], '[+strident] = z');
    expect(result[0]).toBe('zaza');
  });
});
