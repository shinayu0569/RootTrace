/**
 * RootTrace SCA - Rule Parser
 * 
 * Parses sound change rules, environments, exceptions, and rule blocks.
 * Provides unambiguous grammar for all rule constructs.
 */

import { 
  Parser,
  Token,
  UnifiedParser 
} from './scaParser';
import {
  RuleDeclaration,
  RuleOptions,
  RuleBodyItem,
  SoundChangeStatement,
  MatchPattern,
  PatternElement,
  EnvironmentPattern,
  ExceptionPattern,
  NextStatement,
  IfStatement,
  ApplyStatement,
  ChainStatement,
  ChainStep,
  DeromanizerDeclaration,
  RomanizerDeclaration,
  CleanupDeclaration,
  DeferredDeclaration,
  createNode,
  createNodeFromRange
} from './scaAST';

/**
 * Parse pattern elements (IPA, classes, wildcards, etc.)
 */
function parsePatternElement(parser: UnifiedParser): PatternElement | null {
  const token = parser.peek();
  
  // IPA character
  if (parser.check('IPA')) {
    parser.advance();
    return { type: 'literal', value: token.value };
  }
  
  // Class reference
  if (parser.check('IDENTIFIER') && /^[A-Z]$/.test(token.value)) {
    parser.advance();
    return { type: 'class', name: token.value };
  }
  
  // Element reference (using @ or just identifier)
  if (parser.check('IDENTIFIER') || parser.check('KEYWORD')) {
    parser.advance();
    return { type: 'element', name: token.value };
  }
  
  // Wildcard X
  if (token.value === 'X' || token.value === 'x') {
    parser.advance();
    return { type: 'wildcard', symbol: 'X' };
  }
  
  // Set {a,b,c}
  if (parser.check('LBRACE')) {
    parser.advance();
    const members: string[] = [];
    
    while (!parser.check('RBRACE') && !parser.isAtEnd()) {
      parser.skipWhitespace();
      const memberToken = parser.peek();
      
      if (parser.check('RBRACE')) break;
      
      if (parser.check('IPA') || parser.check('IDENTIFIER')) {
        parser.advance();
        members.push(memberToken.value);
      } else if (parser.check('COMMA')) {
        parser.advance();
      } else {
        parser.error(memberToken.line, memberToken.column,
          'Invalid set member',
          memberToken.value,
          'Sets should contain IPA characters: {a, e, i}'
        );
        parser.advance();
      }
    }
    
    if (!parser.expect('RBRACE', 'Expected } to close set')) {
      return null;
    }
    
    return { type: 'set', members };
  }
  
  // Feature specification [+voice -nasal]
  if (parser.check('LBRACKET')) {
    parser.advance();
    const specs: string[] = [];
    
    while (!parser.check('RBRACKET') && !parser.isAtEnd()) {
      parser.skipWhitespace();
      
      if (parser.check('PLUS') || parser.check('MINUS')) {
        const sign = parser.advance()!.value;
        parser.skipWhitespace();
        
        const nameToken = parser.peek();
        if (parser.check('IDENTIFIER')) {
          parser.advance();
          specs.push(`${sign}${nameToken.value}`);
        } else {
          parser.error(nameToken.line, nameToken.column,
            'Feature name required after +/-',
            nameToken.value
          );
          parser.advance();
        }
      } else if (parser.check('RBRACKET')) {
        break;
      } else {
        parser.advance();
      }
    }
    
    if (!parser.expect('RBRACKET', 'Expected ] to close features')) {
      return null;
    }
    
    return { type: 'features', specs };
  }
  
  // Subscript C[1], V[2]
  if (parser.check('IDENTIFIER') && /^[A-Z]$/.test(token.value)) {
    const className = token.value;
    parser.advance();
    
    if (parser.check('LBRACKET')) {
      parser.advance();
      const indexResult = parser.parseNumber();
      if (indexResult) {
        if (parser.expect('RBRACKET', 'Expected ] after subscript')) {
          return { type: 'subscript', className, index: indexResult.value };
        }
      }
    }
    
    // If no subscript, it's just a class
    return { type: 'class', name: className };
  }
  
  // Capture group <...>
  if (parser.check('LESS_THAN')) {
    parser.advance();
    const content: PatternElement[] = [];
    
    while (!parser.check('GREATER_THAN') && !parser.isAtEnd()) {
      const elem = parsePatternElement(parser);
      if (elem) content.push(elem);
    }
    
    if (!parser.expect('GREATER_THAN', 'Expected > to close capture group')) {
      return null;
    }
    
    return { type: 'capture', content };
  }
  
  // Optional (element)
  if (parser.check('LPAREN')) {
    parser.advance();
    const elem = parsePatternElement(parser);
    if (!parser.expect('RPAREN', 'Expected ) to close optional')) {
      return null;
    }
    
    if (elem) {
      return { type: 'optional', content: elem };
    }
  }
  
  // Variable reference %name
  if (parser.check('PERCENT')) {
    parser.advance();
    const nameToken = parser.peek();
    if (parser.check('IDENTIFIER')) {
      parser.advance();
      return { type: 'variable', name: nameToken.value };
    }
  }
  
  // Boundary markers
  if (token.value === '#' || token.value === '##') {
    parser.advance();
    return { type: 'boundary', symbol: token.value };
  }
  
  return null;
}

/**
 * Parse a match pattern
 */
function parseMatchPattern(parser: UnifiedParser): MatchPattern | null {
  const elements: PatternElement[] = [];
  const startToken = parser.peek();
  let endToken = startToken;
  
  // Parse until we hit an arrow, slash, or end
  while (!parser.isAtEnd() && 
         !parser.check('ARROW') && 
         !parser.check('SLASH') &&
         !parser.check('NEWLINE') &&
         !parser.check('EOF')) {
    
    const elem = parsePatternElement(parser);
    if (elem) {
      elements.push(elem);
      endToken = parser.previous();
    } else {
      // Unknown token in pattern
      parser.advance();
    }
  }
  
  // Reconstruct raw pattern
  const rawParts: string[] = [];
  elements.forEach(e => {
    switch (e.type) {
      case 'literal': rawParts.push(e.value); break;
      case 'class': rawParts.push(e.name); break;
      case 'element': rawParts.push(e.name); break;
      case 'wildcard': rawParts.push(e.symbol); break;
      case 'set': rawParts.push(`{${e.members.join(', ')}}`); break;
      case 'features': rawParts.push(`[${e.specs.join(' ')}]`); break;
      case 'subscript': rawParts.push(`${e.className}[${e.index}]`); break;
      case 'capture': rawParts.push(`<...>`); break;
      case 'optional': rawParts.push(`(...)`); break;
      case 'variable': rawParts.push(`%${e.name}`); break;
      case 'boundary': rawParts.push(e.symbol); break;
    }
  });
  
  return {
    raw: rawParts.join(' '),
    elements
  };
}

/**
 * Parse environment pattern (before _ after)
 */
function parseEnvironment(parser: UnifiedParser): EnvironmentPattern | null {
  const startToken = parser.peek();
  
  if (!parser.expect('SLASH', 'Environment requires / separator')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse before context
  const before: PatternElement[] = [];
  while (!parser.check('UNDERSCORE') && 
         !parser.check('NEWLINE') && 
         !parser.check('EOF') &&
         !parser.check('BANG')) {
    const elem = parsePatternElement(parser);
    if (elem) before.push(elem);
    else parser.advance();
  }
  
  // Expect underscore
  if (!parser.expect('UNDERSCORE', 'Environment requires _ to mark target position')) {
    return null;
  }
  
  // Parse after context
  const after: PatternElement[] = [];
  while (!parser.check('NEWLINE') && 
         !parser.check('EOF') &&
         !parser.check('BANG')) {
    const elem = parsePatternElement(parser);
    if (elem) after.push(elem);
    else parser.advance();
  }
  
  const endToken = parser.previous();
  
  return {
    type: 'EnvironmentPattern',
    line: startToken.line,
    column: startToken.column,
    length: endToken.column + endToken.length - startToken.column,
    raw: `${before.map(e => e.type === 'literal' ? e.value : e.type).join(' ')} _ ${after.map(e => e.type === 'literal' ? e.value : e.type).join(' ')}`,
    before,
    after
  } as EnvironmentPattern;
}

/**
 * Parse exception patterns
 */
function parseExceptions(parser: UnifiedParser): ExceptionPattern[] {
  const exceptions: ExceptionPattern[] = [];
  
  while (parser.check('BANG')) {
    parser.advance(); // consume !
    parser.skipWhitespace();
    
    const excStart = parser.peek();
    const before: PatternElement[] = [];
    
    // Parse before context until underscore or end
    while (!parser.check('UNDERSCORE') && 
           !parser.check('NEWLINE') && 
           !parser.check('EOF') &&
           !parser.check('BANG')) {
      const elem = parsePatternElement(parser);
      if (elem) before.push(elem);
      else parser.advance();
    }
    
    let after: PatternElement[] = [];
    
    if (parser.check('UNDERSCORE')) {
      parser.advance();
      
      // Parse after context
      while (!parser.check('NEWLINE') && 
             !parser.check('EOF') &&
             !parser.check('BANG')) {
        const elem = parsePatternElement(parser);
        if (elem) after.push(elem);
        else parser.advance();
      }
    }
    
    const excEnd = parser.previous();
    
    exceptions.push({
      type: 'ExceptionPattern',
      line: excStart.line,
      column: excStart.column,
      length: excEnd.column + excEnd.length - excStart.column,
      raw: `${before.map(e => e.type === 'literal' ? e.value : e.type).join(' ')} _ ${after.map(e => e.type === 'literal' ? e.value : e.type).join(' ')}`,
      before,
      after
    } as ExceptionPattern);
  }
  
  return exceptions;
}

/**
 * Parse a sound change statement
 * Syntax: <target> > <replacement> [/ <environment>] [! <exception>]
 * Example: p > b / _ V ! _ #
 */
export function parseSoundChangeStatement(parser: UnifiedParser): SoundChangeStatement | null {
  const startToken = parser.peek();
  
  // Check for first() or last() wrappers
  let firstOnly = false;
  let lastOnly = false;
  
  if (parser.check('IDENTIFIER') || parser.check('KEYWORD')) {
    if (parser.peek().value.toLowerCase() === 'first') {
      parser.advance();
      if (!parser.expect('LPAREN', 'first() requires parentheses')) {
        return null;
      }
      firstOnly = true;
    } else if (parser.peek().value.toLowerCase() === 'last') {
      parser.advance();
      if (!parser.expect('LPAREN', 'last() requires parentheses')) {
        return null;
      }
      lastOnly = true;
    }
  }
  
  // Parse target pattern
  const target = parseMatchPattern(parser);
  if (!target || target.elements.length === 0) {
    // Not a sound change statement
    if (firstOnly || lastOnly) {
      parser.error(startToken.line, startToken.column,
        'first()/last() requires a pattern inside',
        undefined,
        'Example: first(V) > ə / _ #'
      );
    }
    return null;
  }
  
  // Close paren if we opened it
  if (firstOnly || lastOnly) {
    if (!parser.expect('RPAREN', 'Expected ) to close first()/last()')) {
      return null;
    }
  }
  
  // Expect arrow
  if (!parser.check('ARROW')) {
    return null;
  }
  parser.advance();
  
  // Parse replacement
  const replacementParts: string[] = [];
  let endToken = parser.previous();
  
  while (!parser.check('SLASH') && 
         !parser.check('NEWLINE') && 
         !parser.check('EOF') &&
         !parser.check('BANG')) {
    const token = parser.peek();
    if (token.type !== 'WHITESPACE') {
      replacementParts.push(token.value);
      endToken = token;
    }
    parser.advance();
  }
  
  const replacement = replacementParts.join(' ');
  
  // Parse optional environment
  let environment: EnvironmentPattern | null = null;
  if (parser.check('SLASH')) {
    environment = parseEnvironment(parser);
    if (!environment) return null;
    endToken = parser.previous();
  }
  
  // Parse optional exceptions
  const exceptions = parseExceptions(parser);
  if (exceptions.length > 0) {
    endToken = parser.previous();
  }
  
  return createNodeFromRange('SoundChangeStatement', startToken, endToken, {
    target,
    replacement,
    environment: environment || { type: 'EnvironmentPattern', raw: '_', before: [], after: [], line: startToken.line, column: startToken.column, length: 1 } as EnvironmentPattern,
    exceptions,
    firstOnly,
    lastOnly
  });
}

/**
 * Parse a Next statement
 * Syntax: Next [:]
 *         Begin ... End
 */
export function parseNextStatement(parser: UnifiedParser): NextStatement | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'next') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Optional colon
  parser.match('COLON');
  
  const options: RuleOptions = {};
  
  // Parse inline options
  while (!parser.check('NEWLINE') && !parser.check('EOF')) {
    parser.skipWhitespace();
    const token = parser.peek();
    
    if (token.type !== 'IDENTIFIER' && token.type !== 'KEYWORD') break;
    
    const optionName = token.value.toLowerCase();
    parser.advance();
    
    switch (optionName) {
      case 'propagate':
        options.propagate = true;
        break;
      case 'ltr':
      case 'rtl':
        options.direction = optionName as 'ltr' | 'rtl';
        break;
    }
  }
  
  parser.skipWhitespace();
  
  // Parse body until matching End or next declaration
  const body: RuleBodyItem[] = [];
  
  if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'begin') {
    parser.advance();
    
    while (!parser.isAtEnd()) {
      parser.skipWhitespace();
      
      if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
        parser.advance();
        break;
      }
      
      // Try to parse body items
      const item = parseRuleBodyItem(parser);
      if (item) {
        body.push(item);
      } else {
        parser.advance();
      }
    }
  }
  
  return createNode('NextStatement', startToken, {
    options,
    body
  });
}

/**
 * Parse an If statement
 * Syntax: If <condition> Then <action> [Else <action>]
 */
export function parseIfStatement(parser: UnifiedParser): IfStatement | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'if') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse condition
  const conditionParts: string[] = [];
  while (!parser.check('KEYWORD') || parser.peek().value.toLowerCase() !== 'then') {
    if (parser.check('NEWLINE') || parser.check('EOF')) {
      parser.error(startToken.line, startToken.column,
        'If statement requires Then clause',
        undefined,
        'Example: If V_V Then delete-vowel'
      );
      return null;
    }
    
    const token = parser.peek();
    if (token.type !== 'WHITESPACE') {
      conditionParts.push(token.value);
    }
    parser.advance();
  }
  
  const condition = conditionParts.join(' ');
  
  // Expect Then
  parser.advance(); // consume 'then'
  parser.skipWhitespace();
  
  // Parse then action (can be inline rule name or Begin...End block)
  const thenBody: RuleBodyItem[] = [];
  
  if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'begin') {
    parser.advance();
    while (!parser.isAtEnd() && 
           !(parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end')) {
      const item = parseRuleBodyItem(parser);
      if (item) thenBody.push(item);
      else parser.advance();
    }
    parser.expect('KEYWORD', 'Expected End to close Then block');
  } else {
    // Inline action
    const actionToken = parser.peek();
    if (parser.check('IDENTIFIER') || parser.check('KEYWORD')) {
      parser.advance();
      // Could be a rule name or apply statement
      if (actionToken.value.toLowerCase() === 'apply') {
        // Parse Apply: rule
        parser.skipWhitespace();
        if (parser.expect('COLON', 'Apply requires a colon')) {
          parser.skipWhitespace();
          const ruleName = parser.parseIdentifier();
          if (ruleName) {
            thenBody.push(createNode('ApplyStatement', actionToken, {
              ruleName: ruleName.name
            }));
          }
        }
      } else {
        // Assume it's a sound change
        const soundChange = parseSoundChangeStatement(parser);
        if (soundChange) thenBody.push(soundChange);
      }
    }
  }
  
  // Optional Else
  let elseBody: RuleBodyItem[] | undefined;
  
  parser.skipWhitespace();
  
  if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'else') {
    parser.advance();
    parser.skipWhitespace();
    
    elseBody = [];
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'begin') {
      parser.advance();
      while (!parser.isAtEnd() && 
             !(parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end')) {
        const item = parseRuleBodyItem(parser);
        if (item) elseBody.push(item);
        else parser.advance();
      }
      parser.expect('KEYWORD', 'Expected End to close Else block');
    } else {
      // Inline else action
      const elseAction = parseRuleBodyItem(parser);
      if (elseAction) elseBody.push(elseAction);
    }
  }
  
  const endToken = parser.previous();
  
  return createNodeFromRange('IfStatement', startToken, endToken, {
    condition,
    thenBody,
    elseBody
  });
}

/**
 * Parse an Apply statement
 * Syntax: Apply: <rule-name>
 */
export function parseApplyStatement(parser: UnifiedParser): ApplyStatement | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'apply') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'Apply requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  const ruleName = parser.parseIdentifier();
  if (!ruleName) return null;
  
  return createNode('ApplyStatement', startToken, {
    ruleName: ruleName.name
  });
}

/**
 * Parse a Chain statement
 * Syntax: Chain [<type>] <name>:
 *         <source> >> <target> / <env>
 *         End
 */
export function parseChainStatement(parser: UnifiedParser): ChainStatement | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'chain') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Optional type (drag/push)
  let chainType: 'drag' | 'push' = 'drag';
  
  if (parser.check('IDENTIFIER') || parser.check('KEYWORD')) {
    const typeToken = parser.peek();
    const typeValue = typeToken.value.toLowerCase();
    if (typeValue === 'drag' || typeValue === 'push') {
      parser.advance();
      chainType = typeValue;
    }
  }
  
  parser.skipWhitespace();
  
  // Optional name
  let name: string | undefined;
  const possibleName = parser.peek();
  if (parser.check('IDENTIFIER')) {
    parser.advance();
    name = possibleName.value;
  }
  
  if (!parser.expect('COLON', 'Chain statement requires a colon')) {
    return null;
  }
  
  // Parse chain steps until End
  const steps: ChainStep[] = [];
  let endToken = parser.previous();
  
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
      parser.advance();
      endToken = parser.previous();
      break;
    }
    
    // Parse chain step: source >> target [/ env]
    const sourceParts: string[] = [];
    
    while (!parser.check('ARROW') && 
           !parser.check('NEWLINE') && 
           !parser.check('EOF')) {
      const token = parser.peek();
      if (token.type !== 'WHITESPACE') {
        sourceParts.push(token.value);
      }
      parser.advance();
    }
    
    if (sourceParts.length === 0) {
      parser.advance();
      continue;
    }
    
    if (!parser.check('ARROW')) {
      parser.error(parser.peek().line, parser.peek().column,
        'Chain step requires >> arrow',
        undefined,
        'Example: iː >> əɪ / _ #'
      );
      continue;
    }
    parser.advance(); // consume >>
    
    const targetParts: string[] = [];
    while (!parser.check('SLASH') && 
           !parser.check('NEWLINE') && 
           !parser.check('EOF')) {
      const token = parser.peek();
      if (token.type !== 'WHITESPACE') {
        targetParts.push(token.value);
      }
      parser.advance();
    }
    
    // Parse optional environment
    let environments: string[] = ['_'];
    let exceptions: string[] = [];
    
    if (parser.check('SLASH')) {
      parser.advance();
      const envParts: string[] = [];
      
      while (!parser.check('BANG') && 
             !parser.check('NEWLINE') && 
             !parser.check('EOF')) {
        const token = parser.peek();
        if (token.type !== 'WHITESPACE') {
          envParts.push(token.value);
        }
        parser.advance();
      }
      
      environments = [envParts.join(' ')];
      
      // Parse exceptions
      while (parser.check('BANG')) {
        parser.advance();
        const excParts: string[] = [];
        
        while (!parser.check('NEWLINE') && !parser.check('EOF')) {
          const token = parser.peek();
          if (token.type !== 'WHITESPACE') {
            excParts.push(token.value);
          }
          parser.advance();
        }
        
        exceptions.push(excParts.join(' '));
      }
    }
    
    steps.push({
      source: sourceParts.join(' '),
      target: targetParts.join(' '),
      environments,
      exceptions
    });
    
    endToken = parser.previous();
  }
  
  return createNodeFromRange('ChainStatement', startToken, endToken, {
    chainType,
    name,
    steps
  });
}

/**
 * Parse any rule body item
 */
export function parseRuleBodyItem(parser: UnifiedParser): RuleBodyItem | null {
  parser.skipWhitespace();
  
  const token = parser.peek();
  
  // Check for keywords that start specific statements
  if (token.type === 'KEYWORD') {
    const keyword = token.value.toLowerCase();
    
    switch (keyword) {
      case 'next':
        return parseNextStatement(parser);
      case 'if':
        return parseIfStatement(parser);
      case 'apply':
        return parseApplyStatement(parser);
      case 'chain':
        return parseChainStatement(parser);
    }
  }
  
  // Try to parse as sound change
  const soundChange = parseSoundChangeStatement(parser);
  if (soundChange) return soundChange;
  
  return null;
}

/**
 * Parse a Rule declaration
 * Syntax: Rule <name> [options]:
 *         Begin
 *           <body>
 *         End
 */
export function parseRuleDeclaration(parser: UnifiedParser): RuleDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'rule') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse rule name
  const nameResult = parser.parseIdentifier();
  if (!nameResult) return null;
  
  // Parse options
  const options: RuleOptions = {};
  
  while (!parser.check('COLON') && !parser.check('NEWLINE') && !parser.check('EOF')) {
    parser.skipWhitespace();
    const token = parser.peek();
    
    if (token.type !== 'IDENTIFIER' && token.type !== 'KEYWORD') break;
    
    const optionName = token.value.toLowerCase();
    parser.advance();
    
    switch (optionName) {
      case 'propagate':
        options.propagate = true;
        break;
      case 'ltr':
      case 'rtl':
        options.direction = optionName as 'ltr' | 'rtl';
        break;
    }
  }
  
  if (!parser.expect('COLON', 'Rule declaration requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Expect Begin
  if (!parser.expect('KEYWORD', 'Rule body must start with Begin')) {
    return null;
  }
  
  if (parser.previous().value.toLowerCase() !== 'begin') {
    parser.error(parser.previous().line, parser.previous().column,
      'Rule body must start with Begin keyword',
      parser.previous().value,
      'Example: Rule my-rule: Begin ... End'
    );
  }
  
  // Parse body until End
  const body: RuleBodyItem[] = [];
  let endToken = parser.previous();
  
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
      parser.advance();
      endToken = parser.previous();
      break;
    }
    
    // Check for new declarations (which would indicate missing End)
    if (parser.check('KEYWORD')) {
      const keyword = parser.peek().value.toLowerCase();
      if (['class', 'element', 'rule', 'syllables', 'stress', 
           'deromanizer', 'romanizer', 'cleanup', 'deferred'].includes(keyword)) {
        parser.error(parser.peek().line, parser.peek().column,
          `Missing End for Rule "${nameResult.name}"`,
          undefined,
          'Add End after the rule body'
        );
        break;
      }
    }
    
    const item = parseRuleBodyItem(parser);
    if (item) {
      body.push(item);
    } else {
      parser.advance();
    }
  }
  
  return createNodeFromRange('RuleDeclaration', startToken, endToken, {
    name: nameResult.name,
    options,
    body
  });
}

// Export rule parsers
export const RULE_PARSERS = [
  parseRuleDeclaration,
  parseDeromanizerDeclaration,
  parseRomanizerDeclaration,
  parseCleanupDeclaration,
  parseDeferredDeclaration
];

// Forward declarations for special rule blocks
function parseDeromanizerDeclaration(parser: UnifiedParser): DeromanizerDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'deromanizer') {
    return null;
  }
  
  parser.skipWhitespace();
  
  let literal = false;
  
  // Check for Literal option
  if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'literal') {
    parser.advance();
    literal = true;
  }
  
  if (!parser.expect('COLON', 'Deromanizer requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Expect Begin
  if (!parser.expect('KEYWORD', 'Deromanizer body must start with Begin')) {
    return null;
  }
  
  if (parser.previous().value.toLowerCase() !== 'begin') {
    parser.error(parser.previous().line, parser.previous().column,
      'Deromanizer body must start with Begin',
      parser.previous().value
    );
  }
  
  // Parse body
  const body: RuleBodyItem[] = [];
  let endToken = parser.previous();
  
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
      parser.advance();
      endToken = parser.previous();
      break;
    }
    
    const item = parseRuleBodyItem(parser);
    if (item) body.push(item);
    else parser.advance();
  }
  
  return createNodeFromRange('DeromanizerDeclaration', startToken, endToken, {
    literal,
    body
  });
}

function parseRomanizerDeclaration(parser: UnifiedParser): RomanizerDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'romanizer') {
    return null;
  }
  
  parser.skipWhitespace();
  
  let name: string | undefined;
  let literal = false;
  
  // Optional name
  if (parser.check('IDENTIFIER')) {
    name = parser.peek().value;
    parser.advance();
  }
  
  parser.skipWhitespace();
  
  // Check for Literal option
  if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'literal') {
    parser.advance();
    literal = true;
  }
  
  if (!parser.expect('COLON', 'Romanizer requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Expect Begin
  if (!parser.expect('KEYWORD', 'Romanizer body must start with Begin')) {
    return null;
  }
  
  if (parser.previous().value.toLowerCase() !== 'begin') {
    parser.error(parser.previous().line, parser.previous().column,
      'Romanizer body must start with Begin',
      parser.previous().value
    );
  }
  
  // Parse body
  const body: RuleBodyItem[] = [];
  let endToken = parser.previous();
  
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
      parser.advance();
      endToken = parser.previous();
      break;
    }
    
    const item = parseRuleBodyItem(parser);
    if (item) body.push(item);
    else parser.advance();
  }
  
  return createNodeFromRange('RomanizerDeclaration', startToken, endToken, {
    name,
    literal,
    body
  });
}

function parseCleanupDeclaration(parser: UnifiedParser): CleanupDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'cleanup') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Optional name
  let name = '';
  if (parser.check('IDENTIFIER')) {
    name = parser.peek().value;
    parser.advance();
  }
  
  if (!parser.expect('COLON', 'Cleanup requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Check for on/off
  let enabled = true;
  if (parser.check('KEYWORD')) {
    const value = parser.peek().value.toLowerCase();
    if (value === 'on') {
      parser.advance();
      enabled = true;
    } else if (value === 'off') {
      parser.advance();
      enabled = false;
    }
  }
  
  parser.skipWhitespace();
  let body: RuleBodyItem[] = [];
  let endToken = parser.previous();
  
  // If enabled, parse body
  if (enabled) {
    // Expect Begin
    if (!parser.expect('KEYWORD', 'Enabled Cleanup body must start with Begin')) {
      return null;
    }
    
    if (parser.previous().value.toLowerCase() !== 'begin') {
      parser.error(parser.previous().line, parser.previous().column,
        'Cleanup body must start with Begin',
        parser.previous().value
      );
    }
    
    // Parse body
    while (!parser.isAtEnd()) {
      parser.skipWhitespace();
      
      if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
        parser.advance();
        endToken = parser.previous();
        break;
      }
      
      const item = parseRuleBodyItem(parser);
      if (item) body.push(item);
      else parser.advance();
    }
  }
  
  return createNodeFromRange('CleanupDeclaration', startToken, endToken, {
    name,
    enabled,
    body
  });
}

function parseDeferredDeclaration(parser: UnifiedParser): DeferredDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'deferred') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'Deferred requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Expect Begin
  if (!parser.expect('KEYWORD', 'Deferred body must start with Begin')) {
    return null;
  }
  
  if (parser.previous().value.toLowerCase() !== 'begin') {
    parser.error(parser.previous().line, parser.previous().column,
      'Deferred body must start with Begin',
      parser.previous().value
    );
  }
  
  // Parse only Rule declarations inside
  const rules: RuleDeclaration[] = [];
  let endToken = parser.previous();
  
  while (!parser.isAtEnd()) {
    parser.skipWhitespace();
    
    if (parser.check('KEYWORD') && parser.peek().value.toLowerCase() === 'end') {
      parser.advance();
      endToken = parser.previous();
      break;
    }
    
    const rule = parseRuleDeclaration(parser);
    if (rule) {
      rules.push(rule);
    } else {
      parser.advance();
    }
  }
  
  return createNodeFromRange('DeferredDeclaration', startToken, endToken, {
    rules
  });
}
