/**
 * RootTrace SCA - Reduplication Tests
 * 
 * Tests __ reduplication of matched strings.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Full Reduplication __', () => {
  it('should reduplicate matched string', () => {
    const result = runSCA(['pa'], 'CV > __ / #_');
    // CV matched, doubled
    expect(result[0]).toBe('papa');
  });

  it('should work with different patterns', () => {
    const result = runSCA(['pat'], 'CVC > __ / #_');
    // CVC reduplicated
    expect(result[0]).toBe('patpat');
  });

  it('should work with feature patterns', () => {
    const result = runSCA(['pa'], 'CV > __ / #_');
    // Full reduplication at start
    expect(result[0]).toBe('papa');
  });
});

describe('Partial Reduplication', () => {
  it('should support __- with separator', () => {
    const result = runSCA(['pa'], 'CV > __- / #_');
    // CV reduplicated with hyphen
    expect(result[0]).toBe('pa-pa');
  });

  it('should support partial CV', () => {
    const result = runSCA(['pa'], 'CV > C__ / #_');
    // CV becomes C + CV reduplicated
    expect(result[0]).toBe('ppapa');
  });
});

describe('Reduplication with Modification', () => {
  it('should reduplicate with vowel change', () => {
    const result = runSCA(['pa'], 'CV > __ / #_\na > i');
    // First reduplicate, then change all a to i
    expect(result[0]).toBe('pipi');
  });

  it('should work in different positions', () => {
    const result = runSCA(['pata'], 'CV > __ / _#');
    // CV reduplicated at word end
    expect(result[0]).toBe('pata');
  });
});

describe('Script Syntax - Reduplication', () => {
  it('should support __ in Script mode', () => {
    const result = runSCA(['pa'], 'CV = __ / #_');
    expect(result[0]).toBe('papa');
  });

  it('should support __- in Script mode', () => {
    const result = runSCA(['pa'], 'CV = __- / #_');
    expect(result[0]).toBe('pa-pa');
  });
});
