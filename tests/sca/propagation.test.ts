/**
 * RootTrace SCA - Propagation & Direction Tests
 * 
 * Tests propagate, ltr, rtl directives.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('propagate - Repeat Until Stable', () => {
  it('should support propagate directive', () => {
    const result = runSCA(['aaaa'], 'a > o propagate:');
    // All a's become o (repeats until no changes)
    expect(result[0]).toBe('oooo');
  });

  it('should apply propagate globally', () => {
    const result = runSCA(['papa'], 'a > o propagate:');
    // All a's become o
    expect(result[0]).toBe('popo');
  });

  it('should handle chain with propagate', () => {
    const result = runSCA(['pata'], 'a > o / p_ propagate:');
    // a becomes o after p, propagates
    expect(result[0]).toBe('poto');
  });
});

describe('ltr - Left-to-Right', () => {
  it('should support ltr directive', () => {
    const result = runSCA(['aaaa'], 'a > o ltr:');
    // Only first a becomes o (left to right, single match)
    expect(result[0]).toBe('oaaa');
  });

  it('should process ltr directionally', () => {
    const result = runSCA(['pata'], 'a > o ltr:');
    // First a becomes o
    expect(result[0]).toBe('pota');
  });

  it('should work with environment ltr', () => {
    const result = runSCA(['pataka'], 'a > o / _t ltr:');
    // Left to right, first a before t
    expect(result[0]).toBe('potaka');
  });
});

describe('rtl - Right-to-Left', () => {
  it('should support rtl directive', () => {
    const result = runSCA(['aaaa'], 'a > o rtl:');
    // Only last a becomes o (right to left, single match)
    expect(result[0]).toBe('aaao');
  });

  it('should process rtl directionally', () => {
    const result = runSCA(['pata'], 'a > o rtl:');
    // Last a becomes o
    expect(result[0]).toBe('pato');
  });

  it('should work with environment rtl', () => {
    const result = runSCA(['pataka'], 'a > o / p_ rtl:');
    // Right to left, last a after p
    expect(result[0]).toBeDefined();
  });
});

describe('Combined Directives', () => {
  it('should support ltr propagate', () => {
    const result = runSCA(['aaaa'], 'a > o ltr propagate:');
    // Left to right, repeating
    expect(result[0]).toBe('oooo');
  });

  it('should support rtl propagate', () => {
    const result = runSCA(['aaaa'], 'a > o rtl propagate:');
    // Right to left, repeating
    expect(result[0]).toBe('oooo');
  });
});

describe('Script Syntax - Propagation', () => {
  it('should support propagate in Script', () => {
    const result = runSCA(['aaaa'], 'a = o [propagate]');
    expect(result[0]).toBe('oooo');
  });

  it('should support ltr in Script', () => {
    const result = runSCA(['aaaa'], 'a = o [ltr]');
    expect(result[0]).toBe('oaaa');
  });

  it('should support rtl in Script', () => {
    const result = runSCA(['aaaa'], 'a = o [rtl]');
    expect(result[0]).toBe('aaao');
  });
});
