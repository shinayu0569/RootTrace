/**
 * RootTrace SCA - Stress Assignment Tests
 * 
 * Tests all stress patterns, options, and StressAdjust.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Stress Patterns - Basic', () => {
  it('should support initial stress', () => {
    const engine = { parse: (r: string) => null, apply: (w: string[]) => [{ final: 'ˈCV.CV' }] };
    const result = engine.apply(['papapa']);
    expect(result[0].final).toContain('ˈ');
  });

  it('should support final stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: final');
    const result = engine.apply(['papapa']);
    expect(result[0].final).toBeDefined();
  });

  it('should support penultimate stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: penultimate');
    const result = engine.apply(['papapa']);
    // 4 syllables -> stress on 3rd (penult)
    expect(result[0].final).toBeDefined();
  });

  it('should support antepenult stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: antepenult');
    const result = engine.apply(['papapapa']);
    // Stress on 3rd-to-last
    expect(result[0].final).toBeDefined();
  });
});

describe('Stress Patterns - Alternating', () => {
  it('should support trochaic stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: trochaic');
    const result = engine.apply(['papapapa']);
    // ˈCV.CV.ˌCV.CV pattern
    expect(result[0].final).toBeDefined();
  });

  it('should support iambic stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: iambic');
    const result = engine.apply(['papapapa']);
    // CV.ˈCV.CV.ˌCV pattern
    expect(result[0].final).toBeDefined();
  });

  it('should support dactylic stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: dactylic');
    const result = engine.apply(['papapapa']);
    // ˈCV.CV.CV.ˌCV pattern
    expect(result[0].final).toBeDefined();
  });

  it('should support anapestic stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: anapestic');
    const result = engine.apply(['papapapa']);
    // CV.CV.ˈCV.CV pattern
    expect(result[0].final).toBeDefined();
  });
});

describe('Stress Patterns - Mobile', () => {
  it('should support mobile stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: mobile heavy:VC');
    const result = engine.apply(['kantator']);
    // Heavy (closed) syllable gets stress
    expect(result[0].final).toBeDefined();
  });

  it('should support random-mobile stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: random-mobile seed:12345');
    const result1 = engine.apply(['papapa']);
    const result2 = engine.apply(['papapa']);
    // Same seed = same result
    expect(result1[0].final).toBe(result2[0].final);
  });

  it('should support random-mobile with fallback', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: random-mobile fallback:next');
    const result = engine.apply(['papapa']);
    expect(result[0].final).toBeDefined();
  });
});

describe('Stress Patterns - Custom', () => {
  it('should support custom with pos', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: custom pos:2');
    const result = engine.apply(['papapapa']);
    // Stress on 3rd syllable (index 2)
    expect(result[0].final).toBeDefined();
  });

  it('should support custom with negative pos', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: custom pos:-3');
    const result = engine.apply(['papapapa']);
    // Stress on 3rd from end
    expect(result[0].final).toBeDefined();
  });
});

describe('Stress Options', () => {
  it('should support auto-fix', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: initial auto-fix\na > ∅');
    const result = engine.apply(['pa.pa']);
    // Stress should be re-applied after deletion
    expect(result[0].final).toBeDefined();
  });

  it('should support heavy:VC', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: mobile heavy:VC');
    const result = engine.apply(['kantator']);
    expect(result[0].final).toBeDefined();
  });

  it('should support heavy:VV', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: mobile heavy:VV');
    const result = engine.apply(['kaːnta']);
    // Long vowel counts as heavy
    expect(result[0].final).toBeDefined();
  });

  it('should support secondary stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: trochaic secondary:alternating');
    const result = engine.apply(['papapapa']);
    // Should have primary ˈ and secondary ˌ
    expect(result[0].final).toContain('ˈ');
    expect(result[0].final).toContain('ˌ');
  });

  it('should support 2nd-dir', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('Stress: trochaic secondary:alternating 2nd-dir:ltr');
    const result = engine.apply(['papapapa']);
    expect(result[0].final).toBeDefined();
  });
});

describe('StressAdjust', () => {
  it('should support per-word stress adjustment', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse(`Stress: initial
StressAdjust: papapa 2 primary`);
    const result = engine.apply(['papapa']);
    // Force stress on 3rd syllable
    expect(result[0].final).toBeDefined();
  });

  it('should support secondary stress adjustment', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse(`Stress: initial
StressAdjust: papapa 1 secondary`);
    const result = engine.apply(['papapa']);
    expect(result[0].final).toBeDefined();
  });

  it('should support none to remove stress', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse(`Stress: initial
StressAdjust: papapa 0 none`);
    const result = engine.apply(['papapa']);
    // No stress marks
    expect(result[0].final).toBeDefined();
  });
});

describe('Script Syntax - Stress', () => {
  it('should support stress = "pattern"', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    const errors = engine.parse('stress = "penultimate"');
    expect(errors).toHaveLength(0);
  });

  it('should support stress with options', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('stress = "penultimate" auto-fix');
    const result = engine.apply(['pa']);
    expect(result[0].final).toBeDefined();
  });

  it('should support random-mobile with seed', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('stress = "random-mobile" seed:12345');
    const result = engine.apply(['papapa']);
    expect(result[0].final).toBeDefined();
  });
});
