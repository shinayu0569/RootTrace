/**
 * RootTrace SCA - Declaration Parser
 * 
 * Parses all SCA declarations (Class, Element, Stress, etc.) into AST nodes.
 * Provides unambiguous grammar and clear error messages.
 */

import { 
  Parser, 
  Token, 
  KEYWORDS,
  UnifiedParser 
} from './scaParser';
import {
  ASTNode,
  ClassDeclaration,
  ElementDeclaration,
  SyllablesDeclaration,
  StressDeclaration,
  StressOptions,
  SecondaryStressOptions,
  StressAdjustDeclaration,
  FeatDeclaration,
  RuleDeclaration,
  DeromanizerDeclaration,
  RomanizerDeclaration,
  CleanupDeclaration,
  DeferredDeclaration,
  Declaration,
  createNode,
  createNodeFromRange
} from './scaAST';

/**
 * Parse a Class declaration
 * Syntax: Class <name> { <members> }
 * Example: Class C { p, t, k }
 */
export function parseClassDeclaration(parser: UnifiedParser): ClassDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'class') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse class name
  const nameToken = parser.peek();
  if (!parser.match('IDENTIFIER')) {
    parser.error(nameToken.line, nameToken.column, 
      'Class declaration requires a name',
      nameToken.value,
      'Example: Class C { p, t, k }'
    );
    return null;
  }
  
  parser.skipWhitespace();
  
  // Expect opening brace
  if (!parser.expect('LBRACE', 'Class declaration requires { } around members')) {
    return null;
  }
  
  // Parse members until closing brace
  const members: string[] = [];
  let closingBrace: Token | null = null;
  
  while (!parser.check('RBRACE') && !parser.isAtEnd()) {
    parser.skipWhitespace();
    
    const memberToken = parser.peek();
    if (parser.check('RBRACE')) break;
    if (parser.isAtEnd()) {
      parser.error(startToken.line, startToken.column,
        'Unclosed Class declaration - missing closing }',
        undefined,
        'Add } at the end of the class members'
      );
      return null;
    }
    
    // Accept IPA characters, identifiers, or strings as members
    if (parser.check('IPA') || parser.check('IDENTIFIER') || parser.check('STRING')) {
      parser.advance();
      const member = memberToken.type === 'STRING' 
        ? memberToken.value.slice(1, -1)
        : memberToken.value;
      members.push(member);
    } else {
      parser.error(memberToken.line, memberToken.column,
        `Invalid class member: "${memberToken.value}"`,
        memberToken.value,
        'Class members should be IPA characters separated by commas'
      );
      parser.advance();
    }
    
    parser.skipWhitespace();
    
    // Optional comma between members
    if (parser.check('COMMA')) {
      parser.advance();
    }
  }
  
  closingBrace = parser.expect('RBRACE', 'Expected } to close Class declaration');
  if (!closingBrace) return null;
  
  if (members.length === 0) {
    parser.error(startToken.line, startToken.column,
      'Class must have at least one member',
      undefined,
      'Example: Class C { p, t, k }'
    );
  }
  
  return createNodeFromRange('ClassDeclaration', startToken, closingBrace, {
    name: nameToken.value,
    members
  });
}

/**
 * Parse an Element declaration
 * Syntax: Element <name> <pattern>
 * Example: Element onset C V
 */
export function parseElementDeclaration(parser: UnifiedParser): ElementDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'element') {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse element name
  const nameToken = parser.peek();
  if (!parser.match('IDENTIFIER')) {
    parser.error(nameToken.line, nameToken.column,
      'Element declaration requires a name',
      nameToken.value,
      'Example: Element onset C V'
    );
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse pattern (everything until end of line)
  const patternParts: string[] = [];
  let endToken = nameToken;
  
  while (!parser.check('NEWLINE') && !parser.check('EOF') && !parser.check('COMMENT')) {
    const token = parser.peek();
    if (token.type !== 'WHITESPACE') {
      patternParts.push(token.value);
      endToken = token;
    }
    parser.advance();
  }
  
  if (patternParts.length === 0) {
    parser.error(startToken.line, startToken.column,
      'Element declaration requires a pattern',
      undefined,
      'Example: Element onset C V'
    );
    return null;
  }
  
  return createNodeFromRange('ElementDeclaration', startToken, endToken, {
    name: nameToken.value,
    pattern: patternParts.join(' ')
  });
}

/**
 * Parse a Syllables declaration
 * Syntax: Syllables: <pattern>
 * Example: Syllables: onset :: nucleus :: coda
 */
export function parseSyllablesDeclaration(parser: UnifiedParser): SyllablesDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'syllables') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'Syllables declaration requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse pattern (everything until end of line)
  const patternParts: string[] = [];
  let endToken = startToken;
  
  while (!parser.check('NEWLINE') && !parser.check('EOF') && !parser.check('COMMENT')) {
    const token = parser.peek();
    if (token.type !== 'WHITESPACE') {
      patternParts.push(token.value);
      endToken = token;
    }
    parser.advance();
  }
  
  if (patternParts.length === 0) {
    parser.error(startToken.line, startToken.column,
      'Syllables declaration requires a pattern',
      undefined,
      'Example: Syllables: onset :: nucleus :: coda'
    );
    return null;
  }
  
  return createNodeFromRange('SyllablesDeclaration', startToken, endToken, {
    pattern: patternParts.join(' ')
  });
}

/**
 * Parse a Stress declaration
 * Syntax: Stress: <pattern> [options]
 * Example: Stress: iambic secondary:alternating 2nd-dir:ltr
 */
export function parseStressDeclaration(parser: UnifiedParser): StressDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'stress') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'Stress declaration requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse stress pattern
  const patternToken = parser.peek();
  const validPatterns = [
    'initial', 'final', 'penultimate', 'antepenult',
    'trochaic', 'iambic', 'dactylic', 'anapestic',
    'mobile', 'random-mobile', 'custom'
  ];
  
  if (!parser.match('IDENTIFIER') && !parser.match('KEYWORD')) {
    parser.error(patternToken.line, patternToken.column,
      'Stress declaration requires a pattern',
      patternToken.value,
      `Valid patterns: ${validPatterns.join(', ')}`
    );
    return null;
  }
  
  const pattern = patternToken.value.toLowerCase() as any;
  
  if (!validPatterns.includes(pattern)) {
    parser.error(patternToken.line, patternToken.column,
      `Invalid stress pattern: "${pattern}"`,
      patternToken.value,
      `Valid patterns: ${validPatterns.join(', ')}`
    );
  }
  
  // Parse options
  const options: StressOptions = {
    autoFix: false,
    secondary: {
      enabled: false,
      pattern: 'alternating',
      direction: 'ltr'
    }
  };
  
  let endToken = patternToken;
  
  while (!parser.check('NEWLINE') && !parser.check('EOF') && !parser.check('COMMENT')) {
    parser.skipWhitespace();
    const token = parser.peek();
    
    if (token.type !== 'IDENTIFIER' && token.type !== 'KEYWORD') break;
    
    const optionName = token.value.toLowerCase();
    parser.advance();
    
    endToken = token;
    
    // Parse option value (optional colon)
    let optionValue = '';
    if (parser.check('COLON')) {
      parser.advance();
      const valueToken = parser.peek();
      if (valueToken.type !== 'NEWLINE' && valueToken.type !== 'EOF') {
        optionValue = valueToken.value;
        endToken = valueToken;
        parser.advance();
      }
    }
    
    switch (optionName) {
      case 'autofix':
      case 'auto-fix':
        options.autoFix = optionValue !== 'off';
        break;
        
      case 'heavy':
        options.heavySyllablePattern = optionValue || 'VC';
        break;
        
      case 'pos':
      case 'position':
        options.customPosition = optionValue;
        break;
        
      case 'fallback':
        if (optionValue === 'next' || optionValue === 'previous') {
          options.fallbackDirection = optionValue;
        } else {
          parser.error(token.line, token.column,
            'Fallback must be "next" or "previous"',
            optionValue,
            'Example: fallback:next or fallback:previous'
          );
        }
        break;
        
      case 'secondary':
        if (!options.secondary) {
          options.secondary = {
            enabled: true,
            pattern: 'alternating',
            direction: 'ltr'
          };
        }
        options.secondary.enabled = true;
        if (optionValue === 'alternating' || optionValue === 'custom') {
          options.secondary.pattern = optionValue;
        }
        break;
        
      case '2nd-dir':
      case 'secondary-direction':
        if (!options.secondary) {
          options.secondary = {
            enabled: true,
            pattern: 'alternating',
            direction: 'ltr'
          };
        }
        if (optionValue === 'ltr' || optionValue === 'rtl') {
          options.secondary.direction = optionValue;
        } else {
          parser.error(token.line, token.column,
            'Secondary direction must be "ltr" or "rtl"',
            optionValue
          );
        }
        break;
        
      case 'seed':
        const seedNum = parseInt(optionValue, 10);
        if (!isNaN(seedNum)) {
          options.seed = seedNum;
        } else {
          parser.error(token.line, token.column,
            'Seed must be a number',
            optionValue
          );
        }
        break;
        
      default:
        parser.error(token.line, token.column,
          `Unknown stress option: "${optionName}"`,
          token.value,
          'Valid options: auto-fix, heavy, pos, fallback, secondary, 2nd-dir, seed'
        );
    }
  }
  
  return createNodeFromRange('StressDeclaration', startToken, endToken, {
    pattern,
    options
  });
}

/**
 * Parse a StressAdjust declaration
 * Syntax: StressAdjust: <word> <syllable-index> <stress-type>
 * Example: StressAdjust: "hello" 2 primary
 */
export function parseStressAdjustDeclaration(parser: UnifiedParser): StressAdjustDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'stressadjust') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'StressAdjust declaration requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse word (string or identifier)
  let word = '';
  const wordToken = parser.peek();
  if (parser.check('STRING')) {
    parser.advance();
    word = wordToken.value.slice(1, -1);
  } else if (parser.check('IDENTIFIER') || parser.check('IPA')) {
    parser.advance();
    word = wordToken.value;
  } else {
    parser.error(wordToken.line, wordToken.column,
      'StressAdjust requires a word',
      wordToken.value,
      'Example: StressAdjust: word 2 primary'
    );
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse syllable index
  const indexResult = parser.parseNumber();
  if (!indexResult) return null;
  
  parser.skipWhitespace();
  
  // Parse stress type
  const typeToken = parser.peek();
  const validTypes = ['primary', 'secondary', 'none'];
  
  if (!parser.match('IDENTIFIER') && !parser.match('KEYWORD')) {
    parser.error(typeToken.line, typeToken.column,
      'StressAdjust requires a stress type',
      typeToken.value,
      'Valid types: primary, secondary, none'
    );
    return null;
  }
  
  const stressType = typeToken.value.toLowerCase() as 'primary' | 'secondary' | 'none';
  
  if (!validTypes.includes(stressType)) {
    parser.error(typeToken.line, typeToken.column,
      `Invalid stress type: "${stressType}"`,
      typeToken.value,
      'Valid types: primary, secondary, none'
    );
  }
  
  return createNodeFromRange('StressAdjustDeclaration', startToken, typeToken, {
    word,
    syllableIndex: indexResult.value,
    stressType
  });
}

/**
 * Parse a Feat declaration
 * Syntax: Feat: <symbol> = <features>
 * Example: Feat: š = [+fricative +palatal]
 */
export function parseFeatDeclaration(parser: UnifiedParser): FeatDeclaration | null {
  const startToken = parser.peek();
  
  if (!parser.match('KEYWORD') || startToken.value.toLowerCase() !== 'feat') {
    return null;
  }
  
  parser.skipWhitespace();
  
  if (!parser.expect('COLON', 'Feat declaration requires a colon')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse symbol
  const symbolToken = parser.peek();
  if (!parser.check('IPA') && !parser.check('IDENTIFIER')) {
    parser.error(symbolToken.line, symbolToken.column,
      'Feat requires a symbol',
      symbolToken.value,
      'Example: Feat: š = [+fricative]'
    );
    return null;
  }
  parser.advance();
  
  parser.skipWhitespace();
  
  if (!parser.expect('EQUALS', 'Feat declaration requires = between symbol and features')) {
    return null;
  }
  
  parser.skipWhitespace();
  
  // Parse feature list in brackets
  if (!parser.expect('LBRACKET', 'Features must be in [ ] brackets')) {
    return null;
  }
  
  const features: string[] = [];
  let endToken: Token | null = null;
  
  while (!parser.check('RBRACKET') && !parser.isAtEnd()) {
    parser.skipWhitespace();
    const featureToken = parser.peek();
    
    if (parser.check('RBRACKET')) break;
    
    if (parser.check('PLUS') || parser.check('MINUS')) {
      const sign = parser.advance()!.value;
      parser.skipWhitespace();
      
      const nameToken = parser.peek();
      if (parser.check('IDENTIFIER')) {
        parser.advance();
        features.push(`${sign}${nameToken.value}`);
      } else {
        parser.error(nameToken.line, nameToken.column,
          'Feature name required after +/-',
          nameToken.value,
          'Example: [+voice -nasal]'
        );
        parser.advance();
      }
    } else {
      parser.error(featureToken.line, featureToken.column,
        'Features must start with + or -',
        featureToken.value,
        'Example: [+voice -nasal]'
      );
      parser.advance();
    }
    
    parser.skipWhitespace();
    endToken = featureToken;
  }
  
  const rbracket = parser.expect('RBRACKET', 'Expected ] to close feature list');
  if (!rbracket) return null;
  endToken = rbracket;
  
  return createNodeFromRange('FeatDeclaration', startToken, endToken, {
    symbol: symbolToken.value,
    features
  });
}

// Export all declaration parsers
export const DECLARATION_PARSERS = [
  parseClassDeclaration,
  parseElementDeclaration,
  parseSyllablesDeclaration,
  parseStressDeclaration,
  parseStressAdjustDeclaration,
  parseFeatDeclaration
];
