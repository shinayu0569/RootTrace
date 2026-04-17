/**
 * RootTrace SCA - Block Syntax / Round-trip Tests
 * 
 * Tests Block editor round-trip and syntax conversion.
 */

import { describe, it, expect } from 'vitest';

describe('Block Round-trip - Classic Chain Shifts', () => {
  it('should round-trip Classic chain shift syntax', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `chain(drag) iː >> əɪ >> aɪ:`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('chainShift');
    expect(blocks[0].data.type).toBe('drag');
    expect(blocks[0].data.chain).toBe('iː >> əɪ >> aɪ');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('chain(drag)');
  });

  it('should round-trip Script chain shift syntax', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `chain drag:\n  iː >> əɪ >> aɪ\nend`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('chainShift');
    const output = blocksToSyntax(blocks, true);
    expect(output).toContain('chain drag:');
  });
});

describe('Block Round-trip - Named Rules', () => {
  it('should round-trip Classic rule with children', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `rule-name:\n  a > o`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('rule');
    expect(blocks[0].children).toHaveLength(1);
    const output = blocksToSyntax(blocks);
    expect(output).toContain('rule-name:');
  });

  it('should round-trip Script rule with children', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `rule lenition:\n  p = b\nend`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('rule');
    const output = blocksToSyntax(blocks, true);
    expect(output).toContain('rule lenition:');
    expect(output).toContain('end');
  });
});

describe('Block Round-trip - Classes', () => {
  it('should round-trip Classic Class declaration', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Class stop {p, t, k}`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('class');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('Class');
  });

  it('should round-trip Script class declaration', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `class stop = ["p", "t", "k"]`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('class');
    const output = blocksToSyntax(blocks, true);
    expect(output).toContain('class');
  });
});

describe('Block Round-trip - Special Blocks', () => {
  it('should round-trip Deromanizer block', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Deromanizer:\n  sh > ʃ`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('deromanizer');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('Deromanizer');
  });

  it('should round-trip Romanizer block', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Romanizer:\n  ʃ > sh`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('romanizer');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('Romanizer');
  });

  it('should round-trip Cleanup block', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Cleanup:\n  a > o`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('cleanup');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('Cleanup');
  });

  it('should round-trip Deferred block', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Deferred:\n  n > m / _p`;
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('deferred');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('Deferred');
  });
});

describe('Block Round-trip - Case Sensitivity', () => {
  it('should handle case-insensitive keywords', () => {
    const { syntaxToBlocks } = require('../../src/components/BlockBasedScaEditor');
    // Script lowercase
    const scriptBlocks = syntaxToBlocks('class C = ["p", "t"]\nrule test:\n  p = b\nend');
    expect(scriptBlocks).toHaveLength(2);
    // Classic Title Case
    const classicBlocks = syntaxToBlocks('Class C {p, t}\nTest:\n  p > b');
    expect(classicBlocks).toHaveLength(2);
  });
});

describe('Block Round-trip - Sound Changes', () => {
  it('should round-trip simple sound change', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = 'a > o / _b';
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('soundChange');
    const output = blocksToSyntax(blocks);
    expect(output).toContain('a');
    expect(output).toContain('o');
  });

  it('should round-trip sound change with features', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = '[+stop] > [+voice] / V_V';
    const blocks = syntaxToBlocks(original);
    expect(blocks).toHaveLength(1);
    const output = blocksToSyntax(blocks);
    expect(output).toContain('[+stop]');
  });
});

describe('Block Round-trip - Complete Examples', () => {
  it('should round-trip Latin to Portuguese example', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = `Class stop {p, t, k, b, d, g}
Syllables: C* @vowel C*
Deferred nasal-assim: [C +nasal] > [%place] / _[%place]
Deromanizer: ae > aj
vowel-length-loss: ː > ∅
intervocalic-voicing: @stop > [+voice] / V_V
syncope: [V -stress] > ∅ / V_
Next: Apply: @nasal-assim
Romanizer: ɲ > nh | ʎ > lh`;
    const blocks = syntaxToBlocks(original);
    expect(blocks.length).toBeGreaterThan(5);
    const output = blocksToSyntax(blocks);
    expect(output.length).toBeGreaterThan(0);
  });
});

describe('Block Round-trip - Script Mode Output', () => {
  it('should output Script syntax when requested', () => {
    const { syntaxToBlocks, blocksToSyntax } = require('../../src/components/BlockBasedScaEditor');
    const original = 'Class C {p, t}\nrule test:\n  p > b';
    const blocks = syntaxToBlocks(original);
    const scriptOutput = blocksToSyntax(blocks, true);
    expect(scriptOutput).toContain('class');
    expect(scriptOutput).toContain('rule');
    expect(scriptOutput).toContain('end');
  });
});
