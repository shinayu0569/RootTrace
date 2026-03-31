/**
 * RootTrace SCA - Parser Test Suite
 * 
 * Comprehensive tests for the new unified SCA parser.
 * Tests all syntax modes, declarations, and error handling.
 */

import { parseSCA, Program, ParseOptions } from '../services/scaUnified';
import { tokenize, UnifiedParser } from '../services/scaParser';
import {
  assignStress,
  calculateSecondaryStress,
  findPrimaryStressPosition,
  isHeavySyllable,
  classifySyllableWeight,
  createSeededRandom,
  validateStressConfig,
  PRIMARY_STRESS,
  SECONDARY_STRESS,
  DEFAULT_STRESS_CONFIG
} from '../services/scaStress';

// === TOKENIZER TESTS ===

export function testTokenizer(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, input: string, expectedTypes: string[]) {
    try {
      const { tokens } = tokenize(input);
      const types = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'NEWLINE').map(t => t.type);
      
      if (JSON.stringify(types) === JSON.stringify(expectedTypes)) {
        passed++;
      } else {
        failed++;
        errors.push(`Tokenizer: ${name} - Expected [${expectedTypes.join(', ')}], got [${types.join(', ')}]`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`Tokenizer: ${name} - Error: ${err.message}`);
    }
  }

  // Basic tokens
  test('Identifier', 'Class', ['KEYWORD']);
  test('Arrow', '>', ['ARROW']);
  test('String', '"hello"', ['STRING']);
  test('Number', '123', ['NUMBER']);
  test('Class declaration', 'Class C { a b }', ['KEYWORD', 'IDENTIFIER', 'LBRACE', 'IDENTIFIER', 'IDENTIFIER', 'RBRACE']);
  test('Sound change', 'a > b / _ c', ['IDENTIFIER', 'ARROW', 'IDENTIFIER', 'SLASH', 'UNDERSCORE', 'IDENTIFIER']);
  test('Features', '[+voice]', ['LBRACKET', 'PLUS', 'IDENTIFIER', 'RBRACKET']);
  test('Comment', 'a > b // comment', ['IDENTIFIER', 'ARROW', 'IDENTIFIER']);

  return { passed, failed, errors };
}

// === PARSER TESTS ===

export function testParser(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, input: string, expectValid: boolean, expectDeclarationCount?: number) {
    try {
      const result = parseSCA(input);
      
      if (expectValid && result.program) {
        passed++;
        if (expectDeclarationCount !== undefined && result.program.declarations.length !== expectDeclarationCount) {
          failed++;
          errors.push(`Parser: ${name} - Expected ${expectDeclarationCount} declarations, got ${result.program.declarations.length}`);
          passed--;
        }
      } else if (!expectValid && result.errors.length > 0) {
        passed++;
      } else if (expectValid && !result.program) {
        failed++;
        errors.push(`Parser: ${name} - Expected valid program but got errors: ${result.errors.map(e => e.message).join(', ')}`);
      } else if (!expectValid && result.program && result.errors.length === 0) {
        failed++;
        errors.push(`Parser: ${name} - Expected errors but got valid program`);
      }
    } catch (err: any) {
      if (!expectValid) {
        passed++; // Error on invalid input is expected
      } else {
        failed++;
        errors.push(`Parser: ${name} - Unexpected error: ${err.message}`);
      }
    }
  }

  // Valid declarations
  test('Class declaration', 'Class C { p t k }', true, 1);
  test('Element declaration', 'Element onset C? V', true, 1);
  test('Syllables declaration', 'Syllables: C* :: V :: C?', true, 1);
  test('Stress declaration', 'Stress: penultimate', true, 1);
  test('Stress with options', 'Stress: trochaic auto-fix secondary:alternating', true, 1);
  test('StressAdjust declaration', 'StressAdjust: papapa 2 primary', true, 1);
  test('Rule declaration', 'Rule my-rule:\n  Begin\n    a > b\n  End', true, 1);
  test('Rule with options', 'Rule harmony propagate ltr:\n  Begin\n    a > e / _i\n  End', true, 1);
  test('Multiple declarations', 'Class C { p t k }\nClass V { a e i }\nSyllables: C V', true, 3);

  // Invalid declarations
  test('Invalid class syntax', 'Class C [ p t k ]', false);
  test('Missing colon in rule', 'Rule my-rule\n  Begin\n    a > b\n  End', false);

  return { passed, failed, errors };
}

// === STRESS ASSIGNMENT TESTS ===

export function testStressAssignment(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function testPosition(name: string, pattern: any, syllables: string[], expectedIndex: number) {
    const config = { ...DEFAULT_STRESS_CONFIG, pattern };
    const result = findPrimaryStressPosition(syllables, pattern, config);
    if (result === expectedIndex) {
      passed++;
    } else {
      failed++;
      errors.push(`Stress: ${name} - Expected position ${expectedIndex}, got ${result}`);
    }
  }

  function testStress(name: string, pattern: any, syllables: string, expected: string) {
    const config = { ...DEFAULT_STRESS_CONFIG, pattern };
    const result = assignStress(syllables, config);
    if (result === expected) {
      passed++;
    } else {
      failed++;
      errors.push(`Stress: ${name} - Expected "${expected}", got "${result}"`);
    }
  }

  // Fixed position patterns
  testPosition('Initial 4 syllables', 'initial', ['pa', 'pa', 'pa', 'pa'], 0);
  testPosition('Final 4 syllables', 'final', ['pa', 'pa', 'pa', 'pa'], 3);
  testPosition('Penultimate 4 syllables', 'penultimate', ['pa', 'pa', 'pa', 'pa'], 2);
  testPosition('Antepenult 4 syllables', 'antepenult', ['pa', 'pa', 'pa', 'pa'], 1);

  // Rhythmic patterns
  testStress('Trochaic 4 syllables', 'trochaic', 'pa.pa.pa.pa', `${PRIMARY_STRESS}pa.pa.${SECONDARY_STRESS}pa.pa`);
  testStress('Iambic 4 syllables', 'iambic', 'pa.pa.pa.pa', `pa.${PRIMARY_STRESS}pa.pa.${SECONDARY_STRESS}pa`);

  // Secondary stress calculation
  function testSecondary(name: string, count: number, primary: number, interval: number, dir: 'ltr' | 'rtl', expected: number[]) {
    const result = calculateSecondaryStress(count, primary, interval, dir);
    if (JSON.stringify(result) === JSON.stringify(expected)) {
      passed++;
    } else {
      failed++;
      errors.push(`SecondaryStress: ${name} - Expected [${expected.join(', ')}], got [${result.join(', ')}]`);
    }
  }

  testSecondary('LTR binary', 4, 0, 2, 'ltr', [2]);
  testSecondary('RTL binary', 4, 3, 2, 'rtl', [1]);
  testSecondary('Ternary', 6, 0, 3, 'ltr', [3]);

  // Heavy syllable detection
  function testHeavy(name: string, syllable: string, pattern: string, expected: boolean) {
    const result = isHeavySyllable(syllable, pattern);
    if (result === expected) {
      passed++;
    } else {
      failed++;
      errors.push(`Heavy: ${name} - Expected ${expected}, got ${result}`);
    }
  }

  testHeavy('CV light', 'ka', 'VC', false);
  testHeavy('CVC heavy', 'kan', 'VC', true);
  testHeavy('VV heavy', 'kai', 'VV', true);

  // Config validation
  function testConfig(name: string, config: any, expectValid: boolean) {
    const errors = validateStressConfig(config);
    if ((errors.length === 0) === expectValid) {
      passed++;
    } else {
      failed++;
      errors.push(`Config: ${name} - Expected ${expectValid ? 'valid' : 'invalid'}, got ${errors.length} errors`);
    }
  }

  testConfig('Valid initial', { ...DEFAULT_STRESS_CONFIG, pattern: 'initial' }, true);
  testConfig('Valid custom', { ...DEFAULT_STRESS_CONFIG, pattern: 'custom', customPosition: '2' }, true);
  testConfig('Invalid pattern', { ...DEFAULT_STRESS_CONFIG, pattern: 'invalid-pattern' }, false);

  return { passed, failed, errors };
}

// === IMPORT/EXPORT TESTS ===

export function testImportExport(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  // Mock Block type for testing
  const mockBlock = {
    id: 'test-1',
    type: 'class',
    x: 50,
    y: 50,
    data: { name: 'C', members: 'p, t, k' }
  };

  // Test JSON export/import
  try {
    const { exportToJSON, importFromJSON } = require('../services/scaImportExport');
    
    const exported = exportToJSON([mockBlock], { test: true });
    const parsed = JSON.parse(exported);
    
    if (parsed.version && parsed.blocks && parsed.blocks.length === 1) {
      passed++;
    } else {
      failed++;
      errors.push('Import/Export: JSON export failed');
    }

    const imported = importFromJSON(exported);
    if (imported.blocks.length === 1 && imported.errors.length === 0) {
      passed++;
    } else {
      failed++;
      errors.push('Import/Export: JSON import failed');
    }
  } catch (err: any) {
    failed++;
    errors.push(`Import/Export: ${err.message}`);
  }

  return { passed, failed, errors };
}

// === MAIN TEST RUNNER ===

export function runAllTests(): { total: number; passed: number; failed: number; results: Record<string, { passed: number; failed: number; errors: string[] }> } {
  const results = {
    tokenizer: testTokenizer(),
    parser: testParser(),
    stress: testStressAssignment(),
    importExport: testImportExport()
  };

  const total = Object.values(results).reduce((sum, r) => sum + r.passed + r.failed, 0);
  const passed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const failed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

  return { total, passed, failed, results };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const results = runAllTests();
  console.log('\n=== SCA Parser Test Results ===\n');
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nBreakdown:`);
  Object.entries(results.results).forEach(([name, result]) => {
    console.log(`  ${name}: ${result.passed}/${result.passed + result.failed}`);
    if (result.errors.length > 0) {
      result.errors.forEach(e => console.log(`    - ${e}`));
    }
  });
  console.log('');
}

export default { runAllTests, testTokenizer, testParser, testStressAssignment, testImportExport };
