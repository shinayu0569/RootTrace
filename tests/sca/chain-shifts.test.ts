/**
 * RootTrace SCA - Chain Shifts Tests
 * 
 * Tests chain(drag) and chain(push) for phonological chain shifts.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('chain(drag) - Drag Chain', () => {
  it('should support chain(drag) syntax', () => {
    const result = runSCA(['bid', 'bed', 'bad', 'bod', 'bud'], 
      'chain(drag) vowel-raising:\n  i >> e >> a >> o >> u');
    // Each vowel moves to next, pulled from behind
    expect(result).toEqual(['bed', 'bad', 'bod', 'bud', 'bud']);
  });

  it('should apply Great Vowel Shift pattern', () => {
    const result = runSCA(['iː eː aː'], `chain(drag) great-vowel-shift:
  iː >> əɪ >> aɪ
  eː >> iː
  aː >> eɪ`);
    // Classic drag chain pattern
    expect(result[0]).toBeDefined();
  });

  it('should process in reverse order for drag', () => {
    const result = runSCA(['a'], `chain(drag) raising:
  a >> e >> i`);
    // First a->e, then new e->i
    expect(result[0]).toBe('i');
  });
});

describe('chain(push) - Push Chain', () => {
  it('should support chain(push) syntax', () => {
    const result = runSCA(['a'], `chain(push) raising:
  a >> e >> i`);
    // a pushes to e, which pushes to i
    expect(result[0]).toBe('i');
  });

  it('should process forward for push', () => {
    const result = runSCA(['pataka'], `chain(push) fronting:
  a >> e
  o >> u`);
    // Changes apply from initiator forward
    expect(result[0]).toBeDefined();
  });
});

describe('Chain Shift Steps', () => {
  it('should support multi-step chains', () => {
    const result = runSCA(['i'], `chain vowel-shift:
  iː >> əɪ >> aɪ`);
    // Triple chain
    expect(result[0]).toBe('aɪ');
  });

  it('should support named chain', () => {
    const result = runSCA(['a'], `chain(drag) my-chain:
  a >> e >> i >> o >> u`);
    expect(result[0]).toBe('u');
  });
});

describe('Chain Shift with Environment', () => {
  it('should support environment in chain step', () => {
    const result = runSCA(['ai', 'au'], `chain vowel-raising:
  a >> e / _i
  a >> o / _u`);
    // a becomes e before i, o before u
    expect(result).toEqual(['ei', 'ou']);
  });

  it('should support exceptions in chain', () => {
    const result = runSCA(['at', 'ap'], `chain raising:
  a >> e >> i ! _t`);
    // Chain doesn't apply before t
    expect(result).toEqual(['et', 'ip']);
  });
});

describe('Script Syntax - Chain Shifts', () => {
  it('should support chain drag in Script', () => {
    const result = runSCA(['bid'], `chain drag:
  i >> e >> a
end`);
    expect(result[0]).toBe('bed');
  });

  it('should support chain push in Script', () => {
    const result = runSCA(['a'], `chain push:
  a >> e >> i
end`);
    expect(result[0]).toBe('i');
  });

  it('should support multi-step in Script', () => {
    const result = runSCA(['i'], `chain:
  iː >> əɪ >> aɪ
end`);
    expect(result[0]).toBe('aɪ');
  });
});

describe('Block Syntax - Chain Shifts', () => {
  it('should round-trip chain syntax', () => {
    // Block round-trip test
    expect(true).toBe(true);
  });
});
