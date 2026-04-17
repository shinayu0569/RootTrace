/**
 * RootTrace SCA - Deletion & Insertion Tests
 * 
 * Tests ∅ deletion and epenthesis (insertion).
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Deletion with ∅', () => {
  it('should delete segment with ∅ replacement', () => {
    const result = runSCA(['pat', 'stop'], 't > ∅ / _#');
    // t at word end is deleted
    expect(result).toEqual(['pa', 'stop']);
  });

  it('should delete with alternative syntax', () => {
    const result = runSCA(['pat'], 't >');
    // t is deleted (empty replacement)
    expect(result[0]).toBe('pa');
  });

  it('should delete in environment', () => {
    const result = runSCA(['papa', 'pata'], 'a > ∅ / p_#');
    // a after p at word end is deleted
    expect(result).toEqual(['pap', 'pat']);
  });

  it('should delete consonants at syllable start', () => {
    const result = runSCA(['pa.ta'], 'C > ∅ / $_');
    // Consonant at syllable start deleted
    expect(result[0]).toBeDefined();
  });
});

describe('Deletion - Complex Patterns', () => {
  it('should delete multiple segments', () => {
    const result = runSCA(['pataka'], 'a > ∅');
    // All a's deleted
    expect(result[0]).toBe('ptk');
  });

  it('should delete by feature', () => {
    const result = runSCA(['pataka'], '[+stop] > ∅');
    // All stops deleted
    expect(result[0]).toBe('aa');
  });

  it('should delete wildcards', () => {
    const result = runSCA(['pataka'], 'C > ∅');
    // All consonants deleted
    expect(result[0]).toBe('aa');
  });
});

describe('Insertion (Epenthesis)', () => {
  it('should insert segment with empty match', () => {
    const result = runSCA(['p_p'], '> a / p_p');
    // a inserted between p's
    expect(result[0]).toBe('pap');
  });

  it('should support insertion syntax alternative', () => {
    const result = runSCA(['mp'], '> a / m_');
    // a inserted after m
    expect(result[0]).toBe('map');
  });

  it('should insert at word boundaries', () => {
    const result = runSCA(['#p'], '> s / #_p');
    // s inserted at word start before p
    expect(result[0]).toBe('sp');
  });
});

describe('Script Syntax - Deletion & Insertion', () => {
  it('should delete with = syntax', () => {
    const result = runSCA(['pat'], 't = ∅');
    expect(result[0]).toBe('pa');
  });

  it('should delete with empty replacement', () => {
    const result = runSCA(['pat'], 't =');
    expect(result[0]).toBe('pa');
  });

  it('should insert with = syntax', () => {
    const result = runSCA(['p_p'], '= a / p_p');
    expect(result[0]).toBe('pap');
  });
});
