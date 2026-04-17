/**
 * RootTrace SCA - Conditionals Tests
 * 
 * Tests IF/THEN/ELSE conditional rules.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('IF/THEN Conditionals', () => {
  it('should support IF condition THEN rule', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p > b');
    // If a is present in word, p becomes b
    expect(result).toEqual(['aba', 'ata']);
  });

  it('should support IF with feature condition', () => {
    const result = runSCA(['apa', 'ipi'], 'IF [+vowel] THEN p > b');
    // If any vowel present, p becomes b
    expect(result).toEqual(['aba', 'ibi']);
  });

  it('should apply when condition is met', () => {
    const result = runSCA(['pata', 'kata'], 'IF p THEN a > o');
    // If p present, a becomes o
    expect(result).toEqual(['poto', 'kata']);
  });
});

describe('IF/THEN/ELSE Conditionals', () => {
  it('should support IF/THEN/ELSE', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p > b ELSE t > d');
    // If a present: p>b, else: t>d
    expect(result).toEqual(['aba', 'ada']);
  });

  it('should apply ELSE when condition not met', () => {
    const result = runSCA(['iti', 'ati'], 'IF a THEN i > o ELSE t > d');
    // If a not present, t becomes d
    expect(result).toEqual(['idi', 'odi']);
  });

  it('should work with complex conditions', () => {
    const result = runSCA(['papa', 'tata'], 'IF p THEN a > o ELSE a > e');
    // If p present: a>o, else: a>e
    expect(result).toEqual(['popo', 'tete']);
  });
});

describe('Nested/Complex Conditionals', () => {
  it('should handle multiple THEN rules', () => {
    const result = runSCA(['pata'], 'IF a THEN p > b THEN t > d');
    // Multiple rules in THEN clause
    expect(result[0]).toBe('bada');
  });

  it('should support condition with environment', () => {
    const result = runSCA(['pata', 'tapa'], 'IF a / p_ THEN p > b');
    // If a after p, then p becomes b
    expect(result).toEqual(['bata', 'tapa']);
  });
});

describe('Script Syntax - Conditionals', () => {
  it('should support IF/THEN in Script', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p = b');
    expect(result).toEqual(['aba', 'ata']);
  });

  it('should support IF/THEN/ELSE in Script', () => {
    const result = runSCA(['apa', 'ata'], 'IF a THEN p = b ELSE t = d');
    expect(result).toEqual(['aba', 'ada']);
  });
});
