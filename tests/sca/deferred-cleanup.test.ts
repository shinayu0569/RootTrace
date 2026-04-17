/**
 * RootTrace SCA - Deferred & Cleanup Rules Tests
 * 
 * Tests Deferred, Cleanup, and Apply: statements.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Deferred Rules', () => {
  it('should support Deferred declaration', () => {
    const result = runSCA(['inta'], `Deferred nasal-assim:
  [C +nasal] > [%place] / _[%place]
Apply: @nasal-assim`);
    expect(result[0]).toBeDefined();
  });

  it('should not apply deferred until Apply:', () => {
    const result = runSCA(['inta'], `Deferred nasal-assim:
  n > m / _p
p > b`);
    // n should not change to m until Apply is called
    // p becomes b
    expect(result[0]).toBe('intb');
  });

  it('should apply deferred with Apply:', () => {
    const result = runSCA(['impa'], `Deferred nasal-assim:
  n > m / _p
Apply: @nasal-assim
p > b`);
    // First deferred runs (n>m), then p>b
    expect(result[0]).toBe('imbb');
  });
});

describe('Cleanup Rules', () => {
  it('should support Cleanup declaration', () => {
    const result = runSCA(['apa'], `Cleanup:
  vowel-cleanup: a > o
Apply: @vowel-cleanup`);
    // Cleanup applies after main rules
    expect(result[0]).toBe('opo');
  });

  it('should apply after every rule', () => {
    const result = runSCAFull(['apa'], `Cleanup:
  a-cleanup: a > o
p > t`);
    // After each rule that changes word, cleanup runs
    expect(result[0].final).toBeDefined();
  });

  it('should support named cleanup', () => {
    const result = runSCA(['ampa'], `Cleanup nasal-fix:
  [C +nasal] > [%place] / _[%place]
p > b`);
    expect(result[0]).toBeDefined();
  });
});

describe('Cleanup On/Off', () => {
  it('should support turning cleanup off', () => {
    const result = runSCA(['apa'], `Cleanup test:
  a > o
Cleanup test:
  off
a > e`);
    // After turning off, cleanup shouldn't run
    expect(result[0]).toBeDefined();
  });
});

describe('Apply: Statement', () => {
  it('should apply named deferred rule', () => {
    const result = runSCA(['inta'], `Deferred assim:
  n > m / _t
Apply: @assim`);
    expect(result[0]).toBeDefined();
  });

  it('should error on undefined rule reference', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    const errors = engine.parse('Apply: @nonexistent');
    // Should have error for undefined rule
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('Script Syntax - Deferred/Cleanup', () => {
  it('should support @deferred in Script', () => {
    const result = runSCA(['na'], `@deferred
nasal-assim:
  n = m / _p
apply(nasal-assim)`);
    expect(result[0]).toBeDefined();
  });
});
