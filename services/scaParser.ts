/**
 * RootTrace SCA - Unified Parser System
 * 
 * This module provides a formal grammar-based parser for the SCA language
 * with unambiguous syntax, strict validation, and comprehensive error reporting.
 * 
 * Syntax Philosophy:
 * - Every declaration has ONE unambiguous format
 * - No optional elements that create ambiguity
 * - Clear keyword prefixes for all declarations
 * - Explicit block delimiters (no indentation-only blocks)
 * - Line-numbered error messages with column positions
 */

import { ScaError } from './blendedSca';

// Token Types
export type TokenType = 
  | 'KEYWORD'      // Reserved words (Class, Element, Stress, etc.)
  | 'IDENTIFIER'   // Names/labels
  | 'STRING'       // Quoted strings
  | 'NUMBER'       // Numeric values
  | 'ARROW'        // > or =>
  | 'COLON'        // :
  | 'SEMICOLON'    // ;
  | 'LPAREN'       // (
  | 'RPAREN'       // )
  | 'LBRACE'       // {
  | 'RBRACE'       // }
  | 'LBRACKET'     // [
  | 'RBRACKET'     // ]
  | 'LESS_THAN'    // <
  | 'GREATER_THAN' // >
  | 'COMMA'        // ,
  | 'UNDERSCORE'   // _
  | 'SLASH'        // /
  | 'BANG'         // !
  | 'AMPERSAND'    // &
  | 'PIPE'         // |
  | 'EQUALS'       // =
  | 'HASH'         // #
  | 'DOT'          // .
  | 'PLUS'         // +
  | 'MINUS'        // -
  | 'STAR'         // *
  | 'PERCENT'      // %
  | 'IPA'          // IPA characters
  | 'WHITESPACE'   // Spaces, tabs
  | 'COMMENT'      // // or ; comments
  | 'NEWLINE'      // Line breaks
  | 'EOF';         // End of file

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  length: number;
}

// Reserved Keywords
export const KEYWORDS = new Set([
  // Declaration keywords
  'Class',
  'Element', 
  'Rule',
  'SoundChange',
  'Syllables',
  'Stress',
  'StressAdjust',
  'Deromanizer',
  'Romanizer',
  'Cleanup',
  'Deferred',
  'Apply',
  'Chain',
  
  // Block keywords
  'Begin',
  'End',
  
  // Conditional keywords
  'If',
  'Then',
  'Else',
  
  // Pattern keywords
  'Propagate',
  'LTR',
  'RTL',
  'First',
  'Last',
  
  // Stress pattern keywords
  'Initial',
  'Final', 
  'Penultimate',
  'Antepenult',
  'Trochaic',
  'Iambic',
  'Dactylic',
  'Anapestic',
  'Mobile',
  'RandomMobile',
  'Custom',
  'Fallback',
  'Secondary',
  'Heavy',
  'AutoFix',
  'Primary',
  'None',
  'On',
  'Off',
  'Seed',
  
  // Direction keywords
  'Direction',
  'Next',
  'Previous',
  
  // Feature keywords
  'Feat',
  
  // Literal mode
  'Literal',
  'Table',
]);

// Token patterns
const TOKEN_PATTERNS: [TokenType, RegExp][] = [
  ['COMMENT', /^\/\/[^\n]*|^;[^\n]*/],
  ['NEWLINE', /^\n/],
  ['WHITESPACE', /^[ \t]+/],
  ['STRING', /^"([^"\\]|\\.)*"/],
  ['ARROW', /^=>|^>|^→/],
  ['NUMBER', /^\d+/],
  ['COLON', /^:/],
  ['SEMICOLON', /^;/],
  ['LPAREN', /^\(/],
  ['RPAREN', /^\)/],
  ['LBRACE', /^\{/],
  ['RBRACE', /^\}/],
  ['LBRACKET', /^\[/],
  ['RBRACKET', /^\]/],
  ['COMMA', /^,/],
  ['UNDERSCORE', /^_/],
  ['SLASH', /^\//],
  ['BANG', /^!/],
  ['AMPERSAND', /^&/],
  ['PIPE', /^\|/],
  ['EQUALS', /^=/],
  ['HASH', /^#/],
  ['DOT', /^\./],
  ['PLUS', /^\+/],
  ['MINUS', /^-/],
  ['STAR', /^\*/],
  ['IDENTIFIER', /^[A-Za-z_][A-Za-z0-9_-]*/],
  ['IPA', /^[^ \t\n\r\f\v{}\[\]()<>_=!&|/.,+:*"]+/], // Any other non-whitespace
];

/**
 * Tokenize SCA script into tokens with position information
 */
export function tokenize(script: string): { tokens: Token[]; errors: ScaError[] } {
  const tokens: Token[] = [];
  const errors: ScaError[] = [];
  let line = 1;
  let column = 1;
  let position = 0;
  
  while (position < script.length) {
    let matched = false;
    const remaining = script.slice(position);
    
    for (const [tokenType, pattern] of TOKEN_PATTERNS) {
      const match = remaining.match(pattern);
      if (match) {
        const value = match[0];
        
        // Skip whitespace but track position
        if (tokenType === 'WHITESPACE') {
          position += value.length;
          column += value.length;
          matched = true;
          break;
        }
        
        // Handle newlines
        if (tokenType === 'NEWLINE') {
          tokens.push({
            type: 'NEWLINE',
            value: '\n',
            line,
            column,
            length: 1
          });
          position += 1;
          line += 1;
          column = 1;
          matched = true;
          break;
        }
        
        // Handle comments
        if (tokenType === 'COMMENT') {
          tokens.push({
            type: 'COMMENT',
            value: value.slice(2), // Remove // or ;
            line,
            column,
            length: value.length
          });
          position += value.length;
          column += value.length;
          matched = true;
          break;
        }
        
        // Check if identifier is actually a keyword
        let finalType = tokenType;
        if (tokenType === 'IDENTIFIER') {
          const upperValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          if (KEYWORDS.has(upperValue) || KEYWORDS.has(value)) {
            finalType = 'KEYWORD';
          }
        }
        
        tokens.push({
          type: finalType as TokenType,
          value,
          line,
          column,
          length: value.length
        });
        
        position += value.length;
        column += value.length;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Unknown character
      errors.push({
        line,
        column,
        message: `Unexpected character: "${remaining[0]}"`,
        type: 'syntax',
        severity: 'error',
        snippet: remaining.slice(0, 20),
        suggestion: 'Check for typos or invalid characters'
      });
      position += 1;
      column += 1;
    }
  }
  
  tokens.push({ type: 'EOF', value: '', line, column, length: 0 });
  
  return { tokens, errors };
}

/**
 * Parser state for building AST
 */
export class Parser {
  private tokens: Token[];
  private position: number = 0;
  private errors: ScaError[] = [];
  
  constructor(tokens: Token[], errors: ScaError[] = []) {
    this.tokens = tokens;
    this.errors = errors;
  }
  
  /**
   * Get current token
   */
  peek(): Token {
    return this.tokens[Math.min(this.position, this.tokens.length - 1)];
  }
  
  /**
   * Get previous token
   */
  previous(): Token {
    return this.tokens[Math.max(0, this.position - 1)];
  }
  
  /**
   * Advance to next token
   */
  advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }
  
  /**
   * Check if at end of tokens
   */
  isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }
  
  /**
   * Check if current token matches type
   */
  check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  
  /**
   * Check if current token is any of the types
   */
  checkAny(types: TokenType[]): boolean {
    return types.some(t => this.check(t));
  }
  
  /**
   * Match and consume token if it matches
   */
  match(type: TokenType): Token | null {
    if (this.check(type)) {
      return this.advance();
    }
    return null;
  }
  
  /**
   * Expect a specific token type, error if not found
   */
  expect(type: TokenType, message: string): Token | null {
    if (this.check(type)) {
      return this.advance();
    }
    
    const current = this.peek();
    this.error(current.line, current.column, message, current.value);
    return null;
  }
  
  /**
   * Skip whitespace and newlines
   */
  skipWhitespace() {
    while (this.check('WHITESPACE') || this.check('NEWLINE') || this.check('COMMENT')) {
      this.advance();
    }
  }
  
  /**
   * Add error with specific position
   */
  error(line: number, column: number, message: string, snippet?: string, suggestion?: string) {
    this.errors.push({
      line,
      column,
      message,
      type: 'syntax',
      severity: 'error',
      snippet,
      suggestion
    });
  }
  
  /**
   * Get all errors
   */
  getErrors(): ScaError[] {
    return this.errors;
  }
  
  /**
   * Parse identifier name
   */
  parseIdentifier(allowKeywords: boolean = false): { name: string; token: Token } | null {
    this.skipWhitespace();
    const token = this.peek();
    
    if (token.type !== 'IDENTIFIER' && (allowKeywords || token.type !== 'KEYWORD')) {
      this.error(token.line, token.column, 'Expected identifier', token.value);
      return null;
    }
    
    this.advance();
    return { name: token.value, token };
  }
  
  /**
   * Parse string literal
   */
  parseString(): { value: string; token: Token } | null {
    this.skipWhitespace();
    const token = this.peek();
    
    if (token.type !== 'STRING') {
      this.error(token.line, token.column, 'Expected string literal', token.value, 'Use double quotes: "value"');
      return null;
    }
    
    this.advance();
    // Remove quotes
    const value = token.value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return { value, token };
  }
  
  /**
   * Parse number
   */
  parseNumber(): { value: number; token: Token } | null {
    this.skipWhitespace();
    const token = this.peek();
    
    if (token.type !== 'NUMBER') {
      this.error(token.line, token.column, 'Expected number', token.value);
      return null;
    }
    
    this.advance();
    return { value: parseInt(token.value, 10), token };
  }
  
  /**
   * Synchronize after error - find next statement boundary
   */
  synchronize() {
    this.advance();
    
    while (!this.isAtEnd()) {
      if (this.previous().type === 'NEWLINE') {
        // Check if this line starts a new declaration
        const token = this.peek();
        if (token.type === 'KEYWORD' || token.type === 'EOF') {
          return;
        }
      }
      this.advance();
    }
  }
}

export { Parser as UnifiedParser };
export default { tokenize, Parser };
