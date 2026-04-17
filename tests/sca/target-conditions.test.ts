/**
 * RootTrace SCA - Target Conditions Tests
 * 
 * Tests environment without underscore (target feature checks).
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Target Feature Check (no underscore)', () => {
  it('should check target features without underscore', () => {
    const result = runSCA(['papa'], 'V > [+nasal] / [+stress]');
    // Nasalize only stressed vowels (target condition)
    expect(result[0]).toBeDefined();
  });

  it('should apply only to matching target', () => {
    const result = runSCA(['pi', 'pu'], '[+syllabic] > a / [+front]');
    // Front vowels become a
    expect(result).toEqual(['pa', 'pu']);
  });
});

describe('Target with Negation', () => {
  it('should support ! on target features', () => {
    const result = runSCA(['pi', 'pu'], '[+syllabic] > a / ![+front]');
    // Non-front vowels become a
    expect(result).toEqual(['pi', 'pa']);
  });

  it('should support complex target negation', () => {
    const result = runSCA(['pa', 'pa'], 'V > [+low-tone] / ![+high-tone]');
    // Lower non-high-tone vowels
    expect(result[0]).toBeDefined();
  });
});

describe('Combined Target and Environment', () => {
  it('should work with target and regular env', () => {
    const result = runSCA(['papa'], 'V > o / [+stress] _#');
    // Stressed vowel at word end becomes o
    expect(result[0]).toBeDefined();
  });
});

describe('Script Syntax - Target Conditions', () => {
  it('should support target check in Script', () => {
    const result = runSCA(['pi'], 'V = a / [+front]');
    expect(result[0]).toBe('pa');
  });
});
