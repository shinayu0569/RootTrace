/**
 * RootTrace SCA - Custom Segment Definitions Tests
 * 
 * Tests feat: declarations for symbols not in built-in IPA database.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('feat: Custom Segment Definition', () => {
  it('should support feat: with features', () => {
    const result = runSCA(['ꝗa'], `feat: ꝗ = +cons +dor -voi
ꝗ > k`);
    // Custom ꝗ defined as voiceless dorsal consonant
    expect(result[0]).toBe('ka');
  });

  it('should support feat: alias', () => {
    const result = runSCA(['ša'], `feat: š = ʃ
ša > sa`);
    // š defined as ʃ
    expect(result[0]).toBe('sa');
  });

  it('should support feat: for digraphs', () => {
    const result = runSCA(['tʃa'], `feat: č = tʃ
ča > sa`);
    // č defined as tʃ
    expect(result[0]).toBe('sa');
  });
});

describe('feat: Multiple Symbols', () => {
  it('should support multiple symbols in one feat:', () => {
    const result = runSCA(['kp', 'gb', 'ŋm'], `feat: kp gb ŋm
gb > b`);
    // Digraphs detected, gb becomes b
    expect(result).toEqual(['kp', 'b', 'ŋm']);
  });

  it('should handle multiple custom segments', () => {
    const result = runSCA(['ꝗša'], `feat: ꝗ = +cons +dor -voi
feat: š = ʃ
ꝗ > k
š > s`);
    expect(result[0]).toBe('ksa');
  });
});

describe('feat: with Feature Matrix', () => {
  it('should support + and - features', () => {
    const result = runSCA(['ꝗa'], `feat: ꝗ = +cons +dor -voi +stop
ꝗ > g`);
    expect(result[0]).toBe('ga');
  });

  it('should work in environments', () => {
    const result = runSCA(['ꝗa'], `feat: ꝗ = +cons +dor -voi
ꝗ > k / _a`);
    expect(result[0]).toBe('ka');
  });

  it('should match by features', () => {
    const result = runSCA(['ꝗa'], `feat: ꝗ = +cons +dor -voi
[+cons +dor -voi] > k`);
    // Match by defined features
    expect(result[0]).toBe('ka');
  });
});

describe('feat: Digraph Auto-detection', () => {
  it('should auto-detect digraphs from components', () => {
    const result = runSCA(['kp'], `feat: kp
gb ŋm
kp > p`);
    expect(result[0]).toBe('p');
  });

  it('should handle digraphs in class', () => {
    const result = runSCA(['kp'], `feat: kp gb
Class labiovelar {kp, gb}
@labiovelar > p`);
    expect(result[0]).toBe('p');
  });
});

describe('Script Syntax - feat:', () => {
  it('should support feat in Script', () => {
    const result = runSCA(['ša'], 'feat š = ʃ\nša = sa');
    expect(result[0]).toBe('sa');
  });

  it('should support multiple feat in Script', () => {
    const result = runSCA(['čatʃa'], 'feat č = tʃ\nfeat š = ʃ\nča = ta\nʃa = sa');
    expect(result[0]).toBe('tasa');
  });
});
