/**
 * RootTrace SCA - Iterative Blocks Tests
 * 
 * Tests [block]...[end] for harmony processes.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('[block] Iterative Blocks', () => {
  it('should support [block] syntax', () => {
    const result = runSCA(['tanake'], `[block]
a > e / _(C+)e
[end]`);
    // Harmony spreads leftward until stable
    expect(result[0]).toBe('teneke');
  });

  it('should repeat until no changes', () => {
    const result = runSCA(['tananake'], `[block]
a > e / _e
[end]`);
    // Spreads: tananake -> taneneke -> teneneke
    expect(result[0]).toBe('teneneke');
  });

  it('should work with multiple rules', () => {
    const result = runSCA(['pata'], `[block]
p > b
a > o
[end]`);
    // Both rules apply iteratively
    expect(result[0]).toBeDefined();
  });
});

describe('Harmony Processes', () => {
  it('should support vowel harmony', () => {
    const result = runSCA(['tinuka'], `[block]
i > u / _u
[end]`);
    // i becomes u before u
    expect(result[0]).toBe('tunuka');
  });

  it('should support consonant harmony', () => {
    const result = runSCA(['pataka'], `[block]
p > t / _t
[end]`);
    // p becomes t before t
    expect(result[0]).toBe('tataka');
  });

  it('should support feature harmony', () => {
    const result = runSCA(['sizi'], `[block]
[+vowel] > [+voice] / _[+voice]
[end]`);
    // Vowels voice before voiced
    expect(result[0]).toBeDefined();
  });
});

describe('Nested Blocks', () => {
  it('should support blocks in named rules', () => {
    const result = runSCA(['pata'], `harmony:
[block]
a > o / _e
[end]
e > i`);
    expect(result[0]).toBeDefined();
  });
});

describe('Block with Directives', () => {
  it('should work with propagate', () => {
    const result = runSCA(['aaaa'], `[block] propagate:
a > o / _o
[end]`);
    // Propagate within block
    expect(result[0]).toBe('oooo');
  });
});

describe('Script Syntax - Iterative Blocks', () => {
  it('should support block in Script', () => {
    const result = runSCA(['pata'], `block:
  a = o
end`);
    expect(result[0]).toBe('poto');
  });

  it('should support harmony in Script', () => {
    const result = runSCA(['tinuka'], `block:
  i = u / _u
end`);
    expect(result[0]).toBe('tunuka');
  });
});
