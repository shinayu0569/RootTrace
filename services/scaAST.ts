/**
 * RootTrace SCA - Abstract Syntax Tree (AST) Definitions
 * 
 * Defines all node types for the SCA language with strict typing.
 * Each node has position information for error reporting.
 */

import { Token } from './scaParser';

// Base AST Node
export interface ASTNode {
  type: string;
  line: number;
  column: number;
  length: number;
}

// === DECLARATION NODES ===

export interface ClassDeclaration extends ASTNode {
  type: 'ClassDeclaration';
  name: string;
  members: string[];  // List of phonemes
  features?: string[];  // Feature-based definition [+syllabic -consonantal]
}

export interface ElementDeclaration extends ASTNode {
  type: 'ElementDeclaration';
  name: string;
  pattern: string;  // Pattern like "C V"
}

export interface SyllablesDeclaration extends ASTNode {
  type: 'SyllablesDeclaration';
  pattern: string;  // e.g., "onset :: nucleus :: coda"
}

export interface StressDeclaration extends ASTNode {
  type: 'StressDeclaration';
  pattern: StressPattern;
  options: StressOptions;
}

export type StressPattern = 
  | 'initial'
  | 'final'
  | 'penultimate'
  | 'antepenult'
  | 'trochaic'
  | 'iambic'
  | 'dactylic'
  | 'anapestic'
  | 'mobile'
  | 'random-mobile'
  | 'custom';

export interface StressOptions {
  autoFix: boolean;
  heavySyllablePattern?: string;
  customPosition?: string;
  fallbackDirection?: 'next' | 'previous';
  secondary?: SecondaryStressOptions;
  seed?: number;
}

export interface SecondaryStressOptions {
  enabled: boolean;
  pattern: 'alternating' | 'custom';
  direction: 'ltr' | 'rtl';
  interval?: number;
}

export interface StressAdjustDeclaration extends ASTNode {
  type: 'StressAdjustDeclaration';
  word: string;
  syllableIndex: number;
  stressType: 'primary' | 'secondary' | 'none';
}

export interface FeatDeclaration extends ASTNode {
  type: 'FeatDeclaration';
  symbol: string;
  features: string[];  // [+voice +stop]
}

// === RULE NODES ===

export interface RuleDeclaration extends ASTNode {
  type: 'RuleDeclaration';
  name: string;
  options: RuleOptions;
  body: RuleBodyItem[];
}

export interface RuleOptions {
  propagate?: boolean;
  direction?: 'ltr' | 'rtl';
  filter?: string;
}

export type RuleBodyItem = 
  | SoundChangeStatement
  | NextStatement
  | IfStatement
  | ApplyStatement
  | ChainStatement;

export interface SoundChangeStatement extends ASTNode {
  type: 'SoundChangeStatement';
  target: MatchPattern;
  replacement: string;
  environment: EnvironmentPattern;
  exceptions: ExceptionPattern[];
  exceptWords?: string[];
  firstOnly?: boolean;
  lastOnly?: boolean;
}

export interface MatchPattern {
  raw: string;
  elements: PatternElement[];
}

export type PatternElement = 
  | { type: 'literal'; value: string }
  | { type: 'class'; name: string }
  | { type: 'element'; name: string }
  | { type: 'wildcard'; symbol: string }
  | { type: 'capture'; content: PatternElement[] }
  | { type: 'features'; specs: string[] }
  | { type: 'subscript'; className: string; index: number }
  | { type: 'variable'; name: string }
  | { type: 'set'; members: string[] }
  | { type: 'optional'; content: PatternElement }
  | { type: 'quantified'; content: PatternElement; quantifier: '+' | '*' | '?' }
  | { type: 'boundary'; symbol: string };  // #, ##, σ

export interface EnvironmentPattern {
  type: 'EnvironmentPattern';
  raw: string;
  before: PatternElement[];
  after: PatternElement[];
}

export interface ExceptionPattern {
  type: 'ExceptionPattern';
  raw: string;
  before?: PatternElement[];
  after?: PatternElement[];
}

export interface NextStatement extends ASTNode {
  type: 'NextStatement';
  options: RuleOptions;
  body: RuleBodyItem[];
}

export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: string;
  thenBody: RuleBodyItem[];
  elseBody?: RuleBodyItem[];
}

export interface ApplyStatement extends ASTNode {
  type: 'ApplyStatement';
  ruleName: string;
}

export interface ChainStatement extends ASTNode {
  type: 'ChainStatement';
  chainType: 'drag' | 'push';
  name?: string;
  steps: ChainStep[];
}

export interface ChainStep {
  source: string;
  target: string;
  environments: string[];
  exceptions: string[];
}

// === SPECIAL RULE BLOCKS ===

export interface DeromanizerDeclaration extends ASTNode {
  type: 'DeromanizerDeclaration';
  literal: boolean;
  body: RuleBodyItem[];
}

export interface RomanizerDeclaration extends ASTNode {
  type: 'RomanizerDeclaration';
  name?: string;
  literal: boolean;
  body: RuleBodyItem[];
}

export interface CleanupDeclaration extends ASTNode {
  type: 'CleanupDeclaration';
  name: string;
  enabled: boolean;
  body: RuleBodyItem[];
}

export interface DeferredDeclaration extends ASTNode {
  type: 'DeferredDeclaration';
  rules: RuleDeclaration[];
}

// === PROGRAM NODE ===

export interface Program extends ASTNode {
  type: 'Program';
  declarations: Declaration[];
}

export type Declaration =
  | ClassDeclaration
  | ElementDeclaration
  | SyllablesDeclaration
  | StressDeclaration
  | StressAdjustDeclaration
  | FeatDeclaration
  | RuleDeclaration
  | DeromanizerDeclaration
  | RomanizerDeclaration
  | CleanupDeclaration
  | DeferredDeclaration;

// === PARSER RESULT ===

export interface ParseResult {
  program: Program | null;
  errors: import('./blendedSca').ScaError[];
}

// Helper functions for creating nodes
export function createNode<T extends ASTNode>(
  type: T['type'],
  token: Token,
  props: Omit<T, 'type' | 'line' | 'column' | 'length'>
): T {
  return {
    type,
    line: token.line,
    column: token.column,
    length: token.length,
    ...props
  } as T;
}

export function createNodeFromRange<T extends ASTNode>(
  type: T['type'],
  startToken: Token,
  endToken: Token,
  props: Omit<T, 'type' | 'line' | 'column' | 'length'>
): T {
  const endCol = endToken.column + endToken.length;
  const length = (endToken.line === startToken.line) 
    ? endCol - startToken.column
    : startToken.length;
  
  return {
    type,
    line: startToken.line,
    column: startToken.column,
    length,
    ...props
  } as T;
}
