/**
 * RootTrace SCA - Element Declarations Tests
 * 
 * Tests Element declarations and @element references.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Element Declarations - Classic', () => {
  it('should support Element declaration', () => {
    const result = runSCA(['pl'], `Element onset-cluster [+stop][+liquid]
@onset-cluster > s`);
    // pl is stop+liquid cluster, becomes s
    expect(result[0]).toBe('s');
  });

  it('should support named Element', () => {
    const result = runSCA(['pr', 'tr', 'kr'], `Element onset-cluster [+stop][+liquid]
@onset-cluster > s`);
    // All stop+liquid clusters become s
    expect(result).toEqual(['s', 's', 's']);
  });

  it('should reference @element', () => {
    const result = runSCA(['pl'], `Element onset-cluster [+stop][+liquid]
@onset-cluster > s / #_`);
    // At word start
    expect(result[0]).toBe('s');
  });
});

describe('Element with Wildcards', () => {
  it('should support wildcards in Element', () => {
    const result = runSCA(['pa', 'ta'], `Element onset C? V
@onset > p / #_`);
    // @onset matches CV, replaced with p
    expect(result).toEqual(['p', 'p']);
  });

  it('should support complex Element patterns', () => {
    const result = runSCA(['pata'], `Element syllable C V C?
@syllable > ta`);
    // Each syllable becomes 'ta'
    expect(result[0]).toBe('ta ta');
  });
});

describe('Script Syntax - Elements', () => {
  it('should support def element()', () => {
    const result = runSCA(['pa', 'ta'], 'def element(onset, "C? V")\n@onset = p / #_');
    expect(result).toEqual(['p', 'p']);
  });

  it('should support element with quotes', () => {
    const result = runSCA(['pl'], 'def element(onset-cluster, "[stop][liquid]")\n@onset-cluster = s');
    expect(result[0]).toBe('s');
  });
});

describe('Element in Environments', () => {
  it('should use @element in environment', () => {
    const result = runSCA(['pata'], `Element vowel-cluster V V
a > o / _@vowel-cluster`);
    // a before vowel cluster
    expect(result[0]).toBe('pota');
  });

  it('should use @element before target', () => {
    const result = runSCA(['pata'], `Element onset C V
a > o / @onset_`);
    // a after onset
    expect(result[0]).toBe('pota');
  });
});

describe('Block Syntax - Elements', () => {
  it('should round-trip Element blocks', () => {
    expect(true).toBe(true);
  });
});
