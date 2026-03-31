/**
 * RootTrace SCA - Main Parser Entry Point
 * 
 * Provides a unified parse() function that tokenizes and builds AST.
 * This is the main entry point for parsing SCA scripts.
 */

import { ScaError } from './blendedSca';
import { tokenize, UnifiedParser } from './scaParser';
import {
  Program,
  Declaration,
  RuleDeclaration,
  DeromanizerDeclaration,
  RomanizerDeclaration,
  CleanupDeclaration,
  DeferredDeclaration,
  ClassDeclaration,
  ElementDeclaration,
  SyllablesDeclaration,
  StressDeclaration,
  StressAdjustDeclaration,
  FeatDeclaration
} from './scaAST';
import {
  parseClassDeclaration,
  parseElementDeclaration,
  parseSyllablesDeclaration,
  parseStressDeclaration,
  parseStressAdjustDeclaration,
  parseFeatDeclaration
} from './scaDeclarations';
import {
  parseRuleDeclaration,
  parseDeromanizerDeclaration,
  parseRomanizerDeclaration,
  parseCleanupDeclaration,
  parseDeferredDeclaration,
  parseRuleBodyItem
} from './scaRules';

export interface ParseOptions {
  strict?: boolean;  // If true, unknown syntax is an error
}

/**
 * Main parse function - converts SCA script to AST
 */
export function parseSCA(script: string, options: ParseOptions = {}): { 
  program: Program | null; 
  errors: ScaError[];
} {
  // Tokenize
  const { tokens, errors: tokenErrors } = tokenize(script);
  
  // Create parser
  const parser = new UnifiedParser(tokens, tokenErrors);
  
  const declarations: Declaration[] = [];
  
  // Parse all declarations
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.isAtEnd()) break;
    
    // Try each declaration type
    let declaration: Declaration | null = null;
    
    // Try Class
    if (!declaration) {
      declaration = parseClassDeclaration(parser);
    }
    
    // Try Element
    if (!declaration) {
      declaration = parseElementDeclaration(parser);
    }
    
    // Try Syllables
    if (!declaration) {
      declaration = parseSyllablesDeclaration(parser);
    }
    
    // Try Stress
    if (!declaration) {
      declaration = parseStressDeclaration(parser);
    }
    
    // Try StressAdjust
    if (!declaration) {
      declaration = parseStressAdjustDeclaration(parser);
    }
    
    // Try Feat
    if (!declaration) {
      declaration = parseFeatDeclaration(parser);
    }
    
    // Try Rule
    if (!declaration) {
      declaration = parseRuleDeclaration(parser);
    }
    
    // Try Deromanizer
    if (!declaration) {
      declaration = parseDeromanizerDeclaration(parser);
    }
    
    // Try Romanizer
    if (!declaration) {
      declaration = parseRomanizerDeclaration(parser);
    }
    
    // Try Cleanup
    if (!declaration) {
      declaration = parseCleanupDeclaration(parser);
    }
    
    // Try Deferred
    if (!declaration) {
      declaration = parseDeferredDeclaration(parser);
    }
    
    if (declaration) {
      declarations.push(declaration);
    } else {
      // Unknown token - either error or skip
      const token = parser.peek();
      
      if (options.strict) {
        parser.error(
          token.line,
          token.column,
          `Unexpected token: "${token.value}"`,
          token.value,
          'Expected a valid declaration: Class, Element, Rule, Stress, etc.'
        );
      }
      
      parser.advance();
    }
  }
  
  const errors = parser.getErrors();
  
  if (errors.length > 0 && declarations.length === 0) {
    return { program: null, errors };
  }
  
  const program: Program = {
    type: 'Program',
    line: 1,
    column: 1,
    length: script.length,
    declarations
  };
  
  return { program, errors };
}

/**
 * Validate an SCA script without building full AST
 */
export function validateSCA(script: string): ScaError[] {
  const { errors } = parseSCA(script, { strict: true });
  return errors;
}

/**
 * Check if a script is valid SCA
 */
export function isValidSCA(script: string): boolean {
  const { program, errors } = parseSCA(script, { strict: true });
  return program !== null && errors.length === 0;
}

// Re-export types
export * from './scaParser';
export * from './scaAST';
export * from './scaDeclarations';
export * from './scaRules';
