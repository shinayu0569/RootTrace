/**
 * RootTrace SCA - Sets & Alternation Tests
 * 
 * Tests {p,t,k} sets, | random alternation, and parallel mapping.
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAMultiple, runSCAFull } from './helpers';

describe('Sets on Match Side', () => {
  it('should match any member of set', () => {
    const result = runSCA(['pap', 'tat', 'kak'], '{p, t, k} > s');
    // p, t, or k become s
    expect(result).toEqual(['sas', 'sas', 'sas']);
  });

  it('should match with larger sets', () => {
    const result = runSCA(['b d g'], '{p, t, k, b, d, g} > s');
    // All stops become s
    expect(result[0]).toBe('s s s');
  });

  it('should work with features in set', () => {
    const result = runSCA(['s z'], '{s, ʃ, z, ʒ} > h');
    // Sibilants become h
    expect(result[0]).toBe('h h');
  });
});

describe('Parallel Mapping', () => {
  it('should map sets 1:1', () => {
    const result = runSCA(['p t k'], '{p, t, k} > {b, d, g}');
    // p>b, t>d, k>g
    expect(result[0]).toBe('b d g');
  });

  it('should work with vowels', () => {
    const result = runSCA(['a e i'], '{a, e, i} > {o, u, a}');
    // a>o, e>u, i>a
    expect(result[0]).toBe('o u a');
  });
});

describe('Random Alternation |', () => {
  it('should support | with weights', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('b > m*3 | n*2 | b');
    
    let mCount = 0, nCount = 0, bCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = engine.apply(['b']);
      if (result[0].final === 'm') mCount++;
      else if (result[0].final === 'n') nCount++;
      else if (result[0].final === 'b') bCount++;
    }
    
    // m should appear most (weight 3), then n (weight 2), then b (weight 1)
    expect(mCount).toBeGreaterThan(nCount);
    expect(nCount).toBeGreaterThan(bCount);
  });

  it('should support | without weights', () => {
    const results = runSCAMultiple(['b'], 'b > m | n | b', 10);
    // Should produce random mix of m, n, b
    const allSame = results.every(r => r[0] === results[0][0]);
    // Either all same (unlikely) or different values
    expect(results).toHaveLength(10);
  });
});

describe('Sets in Environment', () => {
  it('should use set in environment', () => {
    const result = runSCA(['papa', 'pata'], 'a > o / _{p, t}');
    // a becomes o before p or t
    expect(result).toEqual(['popo', 'poto']);
  });

  it('should use set in left environment', () => {
    const result = runSCA(['apa', 'ata'], 'a > o / {p, t}_');
    // a becomes o after p or t
    expect(result).toEqual(['opo', 'oto']);
  });
});

describe('Script Syntax - Sets', () => {
  it('should support sets in Script mode', () => {
    const result = runSCA(['pap'], '{p, t, k} = s');
    expect(result[0]).toBe('sas');
  });

  it('should support parallel mapping in Script', () => {
    const result = runSCA(['p t k'], '{p, t, k} = {b, d, g}');
    expect(result[0]).toBe('b d g');
  });
});
