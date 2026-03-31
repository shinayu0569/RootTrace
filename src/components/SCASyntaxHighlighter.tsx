import React from 'react';

// Token types for syntax highlighting
export type TokenType = 
  | 'keyword'      // Class, Element, Stress, etc.
  | 'comment'      // // or ;
  | 'className'    // C, V, stop, etc.
  | 'classRef'     // @ClassName
  | 'arrow'        // >, =>, ->, →, >>
  | 'string'       // "..."
  | 'number'       // digits
  | 'special'      // /, !, _, {}, [], ()
  | 'operator'     // |, &, =
  | 'feature'      // [+voice], [-nasal], etc.
  | 'ipa'          // IPA characters
  | 'plain';       // everything else

interface Token {
  type: TokenType;
  content: string;
}

// SCA Keywords
const KEYWORDS = new Set([
  'Class', 'class',
  'Element', 'element',
  'Stress', 'stress',
  'StressAdjust', 'stressadjust',
  'Syllables', 'syllables',
  'Deromanizer', 'deromanizer',
  'Romanizer', 'romanizer',
  'Deferred', 'deferred',
  'Cleanup', 'cleanup',
  'Apply', 'apply',
  'IF', 'if',
  'THEN', 'then',
  'ELSE', 'else',
  'Next', 'next',
  'chain', 'chain',
  'block', 'end',
  'def',
  'feat',
]);

// Color mapping for each token type
export const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: '#a78bfa',    // Purple (matches Class block)
  comment: '#6b7280',    // Gray
  className: '#fbbf24',  // Amber (matches sound change block)
  classRef: '#fbbf24',   // Amber
  arrow: '#f43f5e',      // Rose/Red
  string: '#34d399',     // Green
  number: '#f472b6',     // Pink
  special: '#94a3b8',    // Slate
  operator: '#22d3ee',   // Cyan
  feature: '#60a5fa',    // Blue
  ipa: '#e2e8f0',        // Light gray/white
  plain: '#e2e8f0',      // Light gray/white
};

// Tokenize a single line of SCA code
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const rest = line.slice(i);

    // Comments (// or ;)
    if (rest.startsWith('//') || rest.startsWith(';')) {
      tokens.push({ type: 'comment', content: rest });
      break;
    }

    // Strings "..."
    if (char === '"') {
      const endQuote = line.indexOf('"', i + 1);
      if (endQuote !== -1) {
        tokens.push({ type: 'string', content: line.slice(i, endQuote + 1) });
        i = endQuote + 1;
        continue;
      }
    }

    // Arrows: >>, =>, ->, →, >
    if (rest.startsWith('>>')) {
      tokens.push({ type: 'arrow', content: '>>' });
      i += 2;
      continue;
    }
    if (rest.startsWith('=>')) {
      tokens.push({ type: 'arrow', content: '=>' });
      i += 2;
      continue;
    }
    if (rest.startsWith('->') || rest.startsWith('→')) {
      tokens.push({ type: 'arrow', content: rest.startsWith('→') ? '→' : '->' });
      i += rest.startsWith('→') ? 1 : 2;
      continue;
    }
    if (char === '>') {
      tokens.push({ type: 'arrow', content: '>' });
      i++;
      continue;
    }

    // Class references: @ClassName
    if (char === '@' && /[a-zA-Z_]/.test(line[i + 1] || '')) {
      let j = i + 1;
      while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
      tokens.push({ type: 'classRef', content: line.slice(i, j) });
      i = j;
      continue;
    }

    // Feature specs: [+voice], [-nasal], [%place], etc.
    if (char === '[') {
      const closeBracket = line.indexOf(']', i);
      if (closeBracket !== -1) {
        tokens.push({ type: 'feature', content: line.slice(i, closeBracket + 1) });
        i = closeBracket + 1;
        continue;
      }
    }

    // Numbers
    if (/\d/.test(char)) {
      let j = i;
      while (j < line.length && /\d/.test(line[j])) j++;
      tokens.push({ type: 'number', content: line.slice(i, j) });
      i = j;
      continue;
    }

    // Special characters
    if ('/!_{}()|:&=., '.includes(char)) {
      const type: TokenType = char === '_' ? 'special' : 'special';
      tokens.push({ type, content: char });
      i++;
      continue;
    }

    // Words (keywords or class names or plain text)
    if (/[a-zA-Z_]/.test(char)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
      const word = line.slice(i, j);
      
      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', content: word });
      } else if (word === word.toUpperCase() && word.length <= 3) {
        // Likely a class name like C, V, CV
        tokens.push({ type: 'className', content: word });
      } else if (['initial', 'final', 'penultimate', 'antepenult', 'trochaic', 'iambic', 
                   'dactylic', 'anapestic', 'mobile', 'random-mobile', 'custom',
                   'alternating', 'ltr', 'rtl', 'next', 'previous', 'primary', 'secondary', 'none',
                   'auto-fix', 'heavy', 'pos', 'fallback', 'secondary', '2nd-dir', 'seed',
                   'propagate', 'drag', 'push', 'literal', 'off', 'on'].includes(word.toLowerCase())) {
        tokens.push({ type: 'keyword', content: word });
      } else {
        tokens.push({ type: 'plain', content: word });
      }
      i = j;
      continue;
    }

    // IPA characters and everything else
    tokens.push({ type: 'ipa', content: char });
    i++;
  }

  return tokens;
}

// Render tokens to React elements - returns just the content without extra wrappers
export function renderHighlightedLine(tokens: Token[]): React.ReactNode {
  return tokens.map((token, i) => (
    <span
      key={i}
      style={{ 
        color: TOKEN_COLORS[token.type],
        fontWeight: token.type === 'keyword' || token.type === 'arrow' ? '600' : '400',
      }}
    >
      {token.content}
    </span>
  ));
}

// Main function to highlight SCA code - returns array of lines (no newlines embedded)
export function highlightSCA(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line) => {
    const tokens = tokenizeLine(line);
    return renderHighlightedLine(tokens);
  });
}

// Export for use in the editor backdrop
export const SCASyntaxHighlighter = {
  tokenizeLine,
  renderHighlightedLine,
  highlightSCA,
  TOKEN_COLORS,
};

export default SCASyntaxHighlighter;
