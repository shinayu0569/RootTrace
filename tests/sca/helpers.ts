/**
 * RootTrace SCA Test Utilities
 * 
 * Shared helper functions for testing the Sound Change Applier.
 */

import { describe, it, expect } from 'vitest';
import { BlendedScaEngine } from '../../services/blendedSca';

// Run SCA and return final results only
export const runSCA = (words: string[], rules: string): string[] => {
  const engine = new BlendedScaEngine();
  engine.parse(rules);
  const results = engine.apply(words);
  return results.map(r => r.final);
};

// Run SCA and return full results with history
export const runSCAFull = (words: string[], rules: string) => {
  const engine = new BlendedScaEngine();
  engine.parse(rules);
  return engine.apply(words);
};

// Run SCA with Script syntax
export const runScriptSCA = (words: string[], rules: string): string[] => {
  const engine = new BlendedScaEngine();
  engine.parse(rules);
  const results = engine.apply(words);
  return results.map(r => r.final);
};

// Helper to test all three syntaxes with same expected output
export const testAllSyntaxes = (
  testName: string,
  classicRules: string,
  scriptRules: string,
  words: string[],
  expected: string[]
) => {
  describe(`${testName} - All Syntaxes`, () => {
    it('should work with Classic syntax', () => {
      const result = runSCA(words, classicRules);
      expect(result).toEqual(expected);
    });

    it('should work with Script syntax', () => {
      const result = runScriptSCA(words, scriptRules);
      expect(result).toEqual(expected);
    });
  });
};

// Helper for single rule test
export const expectSCA = (input: string, rules: string, expected: string) => {
  const result = runSCA([input], rules);
  expect(result[0]).toBe(expected);
};

// Helper to run multiple times for randomness testing
export const runSCAMultiple = (
  words: string[],
  rules: string,
  iterations: number
): string[][] => {
  const results: string[][] = [];
  for (let i = 0; i < iterations; i++) {
    const engine = new BlendedScaEngine();
    engine.parse(rules);
    const result = engine.apply(words);
    results.push(result.map(r => r.final));
  }
  return results;
};

// Export engine class for advanced tests
export { BlendedScaEngine };
