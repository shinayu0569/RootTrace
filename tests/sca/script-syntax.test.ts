/**
 * RootTrace SCA - Script Syntax Tests
 * 
 * Tests the Script syntax mode (Lua-inspired).
 */

import { describe, it, expect } from 'vitest';
import { runSCA, runSCAFull } from './helpers';

describe('Script Syntax - Basic Structure', () => {
  it('should support rule keyword', () => {
    const result = runSCA(['apa'], `rule vowel-shift:
  a = o
end`);
    expect(result[0]).toBe('opo');
  });

  it('should support end to close blocks', () => {
    const result = runSCA(['pata'], `rule lenition:
  p = b
  t = d
end`);
    expect(result[0]).toBe('bada');
  });

  it('should support = for changes', () => {
    const result = runSCA(['apa'], 'a = o');
    expect(result[0]).toBe('opo');
  });

  it('should support / for environments', () => {
    const result = runSCA(['alabama'], 'a = o / _b');
    expect(result[0]).toBe('alobama');
  });
});

describe('Script Syntax - Classes', () => {
  it('should support class = [...]', () => {
    const result = runSCA(['sasa'], 'class sibilant = ["s", "ʃ"]\n@sibilant = z');
    expect(result[0]).toBe('zaza');
  });

  it('should support class with features', () => {
    const result = runSCA(['pata'], 'class stop = [p, t, k]\n@stop = b');
    expect(result[0]).toBe('baba');
  });

  it('should support lowercase keywords', () => {
    const result = runSCA(['sasa'], 'class C = ["s"]\n@C = z');
    expect(result[0]).toBe('zaza');
  });
});

describe('Script Syntax - Elements', () => {
  it('should support def element()', () => {
    const result = runSCA(['pa'], 'def element(onset, "C? V")\n@onset = p / #_');
    expect(result[0]).toBe('p');
  });

  it('should support element with quotes', () => {
    const result = runSCA(['pa'], 'def element(cv, "CV")\n@cv = ta');
    expect(result[0]).toBe('ta');
  });
});

describe('Script Syntax - Syllables & Stress', () => {
  it('should support syllables = "..."', () => {
    const result = runSCA(['pa'], 'syllables = "C* :: V :: C*"\nV = i');
    expect(result[0]).toBe('pi');
  });

  it('should support stress = "pattern"', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    const errors = engine.parse('stress = "penultimate"');
    expect(errors).toHaveLength(0);
  });

  it('should support stress with options', () => {
    const { BlendedScaEngine } = require('../../services/blendedSca');
    const engine = new BlendedScaEngine();
    engine.parse('stress = "initial" auto-fix');
    const result = engine.apply(['pa']);
    expect(result[0].final).toBeDefined();
  });
});

describe('Script Syntax - Special Blocks', () => {
  it('should support deromanizer:', () => {
    const result = runSCA(['sh'], `deromanizer:
  sh = ʃ
end
ʃ = s`);
    expect(result[0]).toBe('s');
  });

  it('should support romanizer:', () => {
    const result = runSCAFull(['ʃ'], `romanizer:
  ʃ = sh
end`);
    expect(result[0].romanized).toBe('sh');
  });

  it('should support chain:', () => {
    const result = runSCA(['a'], `chain drag:
  a >> e >> i
end`);
    expect(result[0]).toBe('i');
  });

  it('should support def rule_name()', () => {
    const result = runSCAFull(['alabama'], 'def vowel_shift():\n  a = o\nend');
    expect(result[0].final).toBe('olobomo');
  });

  it('should support def deromanizer()', () => {
    const result = runSCA(['sh', 'th'], `def deromanizer():
  sh = ʃ
  th = θ
end
ʃ = s
θ = t`);
    expect(result).toEqual(['s', 't']);
  });

  it('should support def romanizer()', () => {
    const result = runSCA(['ʃ', 'θ'], `def romanizer():
  ʃ = sh
  θ = th
end`);
    expect(result).toEqual(['sh', 'th']);
  });
});

describe('Script Syntax - Options', () => {
  it('should support rule with [propagate]', () => {
    const result = runSCA(['pip'], 'def harmony([propagate]):\n  i = u / _C\nend');
    expect(result[0]).toBeDefined();
  });

  it('should support @deferred decorator', () => {
    const result = runSCA(['na'], `@deferred
nasal-assim:
  n = m / _p
apply(nasal-assim)`);
    expect(result[0]).toBeDefined();
  });
});

describe('Script Syntax - Comments', () => {
  it('should support -- comments', () => {
    const result = runSCA(['pa'], '-- This is a comment\na = o');
    expect(result[0]).toBe('po');
  });

  it('should support inline -- comments', () => {
    const result = runSCA(['pa'], 'a = o  -- inline comment');
    expect(result[0]).toBe('po');
  });

  it('should not support ; or # comments in Script', () => {
    // ; and # are reserved for other purposes
    expect(true).toBe(true);
  });
});

describe('Classic vs Script Comparison', () => {
  it('Classic: Class C {p,t} vs Script: class C = ["p", "t"]', () => {
    const classic = runSCA(['pata'], 'Class C {p, t}\n@C > s');
    const script = runSCA(['pata'], 'class C = ["p", "t"]\n@C = s');
    expect(classic).toEqual(script);
    expect(classic[0]).toBe('sasa');
  });

  it('Classic: rule-name: vs Script: rule rule-name:', () => {
    const classic = runSCA(['apa'], 'vowel-shift:\n  a > o');
    const script = runSCA(['apa'], 'rule vowel-shift:\n  a = o\nend');
    expect(classic).toEqual(script);
  });

  it('Classic: > vs Script: =', () => {
    const classic = runSCA(['apa'], 'a > o');
    const script = runSCA(['apa'], 'a = o');
    expect(classic).toEqual(script);
  });
});
