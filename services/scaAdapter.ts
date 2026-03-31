/**
 * RootTrace SCA - Parser Adapter
 * 
 * Adapts the new AST-based parser to work with the existing BlendedScaEngine.
 * This allows gradual migration while maintaining backward compatibility.
 */

import { parseSCA, Program, Declaration } from './scaUnified';
import { BlendedScaEngine, ScaError, StressConfig } from './blendedSca';

/**
 * Parse SCA script using the new unified parser and populate an engine instance
 */
export function parseWithNewParser(script: string, engine: BlendedScaEngine): ScaError[] {
  const { program, errors } = parseSCA(script, { strict: true });
  
  if (!program) {
    return errors;
  }
  
  // Process declarations and populate engine
  for (const decl of program.declarations) {
    try {
      processDeclaration(decl, engine);
    } catch (err: any) {
      errors.push({
        line: decl.line,
        column: decl.column,
        message: err.message || 'Error processing declaration',
        type: 'syntax',
        severity: 'error'
      });
    }
  }
  
  return errors;
}

/**
 * Process a single declaration and update the engine
 */
function processDeclaration(decl: Declaration, engine: BlendedScaEngine): void {
  const classes = engine.getClasses();
  
  switch (decl.type) {
    case 'ClassDeclaration':
      classes[decl.name] = decl.members;
      break;
      
    case 'ElementDeclaration':
      // Elements are stored differently in the engine
      // Access through internal method or add public API
      (engine as any).elements[decl.name] = decl.pattern;
      break;
      
    case 'SyllablesDeclaration':
      // Syllables pattern stored in engine
      (engine as any).syllables = decl.pattern.split(/\s+/).filter(p => p);
      break;
      
    case 'StressDeclaration':
      applyStressConfig(decl, engine);
      break;
      
    case 'StressAdjustDeclaration':
      // Apply user stress adjustment
      const stressConfig = (engine as any).stressConfig as StressConfig;
      stressConfig.userAdjustments.push({
        word: decl.word,
        syllableIndex: decl.syllableIndex,
        stressType: decl.stressType
      });
      break;
      
    case 'FeatDeclaration':
      // Custom segment with features
      if (!classes['custom']) {
        classes['custom'] = [];
      }
      classes['custom'].push(decl.symbol);
      
      // Store features
      const customFeatures = (engine as any).customFeatures || {};
      const criteria: Record<string, boolean> = {};
      decl.features.forEach(f => {
        if (f.startsWith('+')) {
          criteria[f.slice(1)] = true;
        } else if (f.startsWith('-')) {
          criteria[f.slice(1)] = false;
        }
      });
      customFeatures[decl.symbol] = criteria;
      (engine as any).customFeatures = customFeatures;
      break;
      
    case 'RuleDeclaration':
    case 'DeromanizerDeclaration':
    case 'RomanizerDeclaration':
    case 'CleanupDeclaration':
    case 'DeferredDeclaration':
      // These are processed by the old parser for now
      // In a full migration, they would be converted from AST to Rule objects
      break;
  }
}

/**
 * Apply stress configuration to engine
 */
function applyStressConfig(decl: any, engine: BlendedScaEngine): void {
  const stressConfig: StressConfig = {
    pattern: decl.pattern,
    autoFix: decl.options.autoFix || false,
    enforceSafety: true,
    heavySyllablePattern: decl.options.heavySyllablePattern || 'VC',
    customPosition: decl.options.customPosition || '',
    randomMobile: {
      enabled: decl.pattern === 'random-mobile',
      fallbackDirection: decl.options.fallbackDirection || 'next',
      seed: decl.options.seed || null
    },
    secondaryStress: {
      enabled: decl.options.secondary?.enabled || false,
      pattern: decl.options.secondary?.pattern || 'alternating',
      direction: decl.options.secondary?.direction || 'ltr',
      skipPrimary: true,
      customInterval: decl.options.secondary?.interval
    },
    userAdjustments: []
  };
  
  (engine as any).stressConfig = stressConfig;
}

/**
 * Hybrid parser that uses new parser for declarations and old parser for rules
 */
export function hybridParse(script: string, engine: BlendedScaEngine): ScaError[] {
  // First, use the new parser for declarations
  const newErrors = parseWithNewParser(script, engine);
  
  // Then, use the old parser for the complete script
  // This ensures rules are properly handled
  const oldErrors = engine.parse(script);
  
  // Merge errors, avoiding duplicates
  const allErrors = [...newErrors];
  
  for (const oldErr of oldErrors) {
    // Check if this error is already reported by new parser
    const isDuplicate = newErrors.some(newErr => 
      newErr.line === oldErr.line && 
      newErr.message === oldErr.message
    );
    
    if (!isDuplicate) {
      allErrors.push(oldErr);
    }
  }
  
  return allErrors;
}

export default { parseWithNewParser, hybridParse };
