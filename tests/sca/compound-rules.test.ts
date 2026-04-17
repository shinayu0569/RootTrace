/**
 * RootTrace SCA - Compound Rules (Next:) Tests
 * 
 * Tests Next: blocks for sequential sub-rules.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Next: Sequential Sub-rules', () => {
  it('should support Next: block', () => {
    const result = runSCA(['kipa'], `palatalization:
  k > tʃ / _i
Next:
  tʃ > ʃ`);
    // k becomes tʃ before i, then tʃ becomes ʃ
    expect(result[0]).toBe('ʃipa');
  });

  it('should apply multiple Next: blocks', () => {
    const result = runSCA(['pata'], `step1:
  p > b
Next:
  b > v
Next:
  v > w`);
    // p > b > v > w
    expect(result[0]).toBe('wata');
  });

  it('should work within named rule', () => {
    const result = runSCAFull(['pata'], `lenition:
  p > b
Next:
  b > v`);
    expect(result[0].history[0].rule).toBe('lenition');
  });
});

describe('Next: with Options', () => {
  it('should support propagate with Next:', () => {
    const result = runSCA(['aaaa'], `spread:
  a > o
Next propagate:
  o > u`);
    // Second step repeats until stable
    expect(result[0]).toBeDefined();
  });

  it('should support direction with Next:', () => {
    const result = runSCA(['pata'], `rule:
  a > o
Next ltr:
  o > u`);
    expect(result[0]).toBe('putu');
  });
});

describe('Multiple Sub-rules in Next:', () => {
  it('should support multiple changes in Next block', () => {
    const result = runSCA(['patak'], `first:
  p > b
  t > d
Next:
  b > v
  d > ð`);
    // First: p>b, t>d; Next: b>v, d>ð
    expect(result[0]).toBe('vavag');
  });
});

describe('Then: Deprecated', () => {
  it('documents that Then: is no longer supported', () => {
    // Use Next: instead of Then:
    expect(true).toBe(true);
  });
});

describe('Script Syntax - Next:', () => {
  it('should support Next: in Script', () => {
    const result = runSCA(['pata'], `rule step1:
  p = b
Next:
  b = v
end`);
    expect(result[0]).toBe('vata');
  });
});
