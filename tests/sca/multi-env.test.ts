/**
 * RootTrace SCA - Multiple Environments Tests
 * 
 * Tests comma and pipe separated environments.
 */

import { describe, it, expect } from 'vitest';
import { runSCA } from './helpers';

describe('Comma Separated Environments', () => {
  it('should support comma separator', () => {
    const result = runSCA(['amap', 'abap'], 'n > m / _p, _b');
    // n becomes m before p or b
    expect(result).toEqual(['amap', 'abap']);
  });

  it('should support multiple comma envs', () => {
    const result = runSCA(['nap', 'nat', 'nak'], 'n > m / _p, _t, _k');
    // n becomes m before p, t, or k
    expect(result).toEqual(['map', 'mat', 'mak']);
  });

  it('should support comma with word boundary', () => {
    const result = runSCA(['na', 'nap'], 'a > o / _#, _p');
    // a becomes o at word end or before p
    expect(result).toEqual(['no', 'nop']);
  });
});

describe('Pipe Separated Environments', () => {
  it('should support pipe separator', () => {
    const result = runSCA(['amap', 'abap'], 'n > m / _p | _b');
    // n becomes m before p | b
    expect(result).toEqual(['amap', 'abap']);
  });

  it('should support multiple pipe envs', () => {
    const result = runSCA(['nap', 'nat', 'nak'], 'n > m / _p | _t | _k');
    expect(result).toEqual(['map', 'mat', 'mak']);
  });

  it('should support pipe with complex envs', () => {
    const result = runSCA(['apa', 'apa'], 'a > o / #_ | _#');
    // a becomes o word-initial OR word-final
    expect(result).toEqual(['opa', 'apo']);
  });
});

describe('Multiple Environments with Features', () => {
  it('should support features in multi-env', () => {
    const result = runSCA(['papa', 'pata'], 'a > o / _[C +stop], _[C +nasal]');
    // a before stop or nasal
    expect(result).toEqual(['popo', 'pota']); // if t is stop
  });
});

describe('Mixed Environments', () => {
  it('should support comma and pipe together', () => {
    const result = runSCA(['papa', 'pata'], 'a > o / #_ | _p, _t');
    // Word-initial OR before p OR before t
    expect(result).toEqual(['popa', 'poto']);
  });
});

describe('Script Syntax - Multiple Environments', () => {
  it('should support comma in Script', () => {
    const result = runSCA(['nap', 'nat'], 'n = m / _p, _t');
    expect(result).toEqual(['map', 'mat']);
  });

  it('should support pipe in Script', () => {
    const result = runSCA(['nap', 'nat'], 'n = m / _p | _t');
    expect(result).toEqual(['map', 'mat']);
  });
});
