/**
 * RootTrace SCA - Import/Export Module
 * 
 * Provides bidirectional conversion between text syntax and block representation.
 * Supports JSON export/import for project persistence.
 */

import { Declaration, Program } from './scaAST';

// Define Block type locally to avoid circular dependency
export type BlockType = 
  | 'class'
  | 'element'
  | 'rule'
  | 'soundChange'
  | 'chainShift'
  | 'next'
  | 'if'
  | 'deromanizer'
  | 'romanizer'
  | 'apply'
  | 'syllables'
  | 'block'
  | 'cleanup'
  | 'customSegment'
  | 'deferred'
  | 'stress';

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  collapsed?: boolean;
  data: Record<string, string | string[]>;
  children?: Block[];
  parentId?: string;
  isDragging?: boolean;
  snapToGrid?: boolean;
}

// === EXPORT FUNCTIONS ===

/**
 * Export declarations to text format (SCA syntax)
 */
export function exportToText(declarations: Declaration[]): string {
  const lines: string[] = [];
  
  for (const decl of declarations) {
    const line = declarationToSyntax(decl);
    if (line) lines.push(line);
  }
  
  return lines.join('\n');
}

/**
 * Export declarations to block format
 */
export function exportToBlocks(declarations: Declaration[]): Block[] {
  return declarations.map(decl => declarationToBlock(decl));
}

/**
 * Convert a single declaration to SCA syntax
 */
function declarationToSyntax(decl: Declaration): string | null {
  switch (decl.type) {
    case 'ClassDeclaration':
      const members = Array.isArray(decl.members) ? decl.members.join(', ') : decl.members;
      return `Class ${decl.name} { ${members} }`;
      
    case 'ElementDeclaration':
      return `Element ${decl.name} ${decl.pattern}`;
      
    case 'SyllablesDeclaration':
      return `Syllables: ${decl.pattern}`;
      
    case 'StressDeclaration': {
      const opts: string[] = [];
      if (decl.options.autoFix) opts.push('auto-fix');
      if (decl.options.heavySyllablePattern) opts.push(`heavy:${decl.options.heavySyllablePattern}`);
      if (decl.options.customPosition) opts.push(`pos:${decl.options.customPosition}`);
      if (decl.options.fallbackDirection) opts.push(`fallback:${decl.options.fallbackDirection}`);
      if (decl.options.secondary?.enabled) {
        opts.push(`secondary:${decl.options.secondary.pattern}`);
        opts.push(`2nd-dir:${decl.options.secondary.direction}`);
      }
      if (decl.options.seed) opts.push(`seed:${decl.options.seed}`);
      return `Stress: ${decl.pattern}${opts.length > 0 ? ' ' + opts.join(' ') : ''}`;
    }
      
    case 'StressAdjustDeclaration':
      return `StressAdjust: ${decl.word} ${decl.syllableIndex} ${decl.stressType}`;
      
    case 'FeatDeclaration':
      return `Feat: ${decl.symbol} = [${decl.features.join(' ')}]`;
      
    case 'RuleDeclaration': {
      const opts: string[] = [];
      if (decl.options.propagate) opts.push('propagate');
      if (decl.options.direction) opts.push(decl.options.direction);
      return `Rule ${decl.name}${opts.length > 0 ? ' [' + opts.join(' ') + ']' : ''}:\n  Begin\n    ${decl.body.map(item => ruleBodyItemToSyntax(item)).join('\n    ')}\n  End`;
    }
      
    case 'DeromanizerDeclaration':
      return `Deromanizer${decl.literal ? ' Literal' : ''}:\n  Begin\n    ${decl.body.map(item => ruleBodyItemToSyntax(item)).join('\n    ')}\n  End`;
      
    case 'RomanizerDeclaration':
      return `Romanizer${decl.name ? '-' + decl.name : ''}${decl.literal ? ' Literal' : ''}:\n  Begin\n    ${decl.body.map(item => ruleBodyItemToSyntax(item)).join('\n    ')}\n  End`;
      
    case 'CleanupDeclaration':
      if (!decl.enabled) {
        return `Cleanup${decl.name ? ' ' + decl.name : ''}: off`;
      }
      return `Cleanup${decl.name ? ' ' + decl.name : ''}:\n  Begin\n    ${decl.body.map(item => ruleBodyItemToSyntax(item)).join('\n    ')}\n  End`;
      
    case 'DeferredDeclaration':
      return `Deferred:\n  Begin\n    ${decl.rules.map(r => declarationToSyntax(r)).join('\n    ')}\n  End`;
      
    default:
      return null;
  }
}

/**
 * Convert a rule body item to syntax
 */
function ruleBodyItemToSyntax(item: any): string {
  if (!item) return '';
  
  switch (item.type) {
    case 'SoundChangeStatement': {
      const target = item.target?.raw || '';
      const env = item.environment?.raw !== '_' ? ` / ${item.environment.raw}` : '';
      const exc = item.exceptions?.length > 0 
        ? ' !' + item.exceptions.map((e: any) => e.raw).join(' !')
        : '';
      const firstLast = item.firstOnly ? 'first(' : item.lastOnly ? 'last(' : '';
      const closeParen = (item.firstOnly || item.lastOnly) ? ')' : '';
      return `${firstLast}${target}${closeParen} > ${item.replacement}${env}${exc}`;
    }
      
    case 'NextStatement': {
      const opts: string[] = [];
      if (item.options?.propagate) opts.push('propagate');
      if (item.options?.direction) opts.push(item.options.direction);
      return `Next${opts.length > 0 ? ' [' + opts.join(' ') + ']' : ''}:`;
    }
      
    case 'IfStatement':
      return `If ${item.condition} Then ${item.thenBody?.map(ruleBodyItemToSyntax).join('; ')}${item.elseBody ? ' Else ' + item.elseBody.map(ruleBodyItemToSyntax).join('; ') : ''}`;
      
    case 'ApplyStatement':
      return `Apply: ${item.ruleName}`;
      
    case 'ChainStatement':
      return `Chain ${item.chainType}${item.name ? ' ' + item.name : ''}:\n    ${item.steps.map((s: any) => `${s.source} >> ${s.target} / ${s.environments.join(', ')}`).join('\n    ')}\n  End`;
      
    default:
      return '';
  }
}

/**
 * Convert a declaration to a Block object
 */
function declarationToBlock(decl: Declaration): Block {
  const baseBlock: Partial<Block> = {
    id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x: 50,
    y: 50,
    data: {}
  };
  
  switch (decl.type) {
    case 'ClassDeclaration':
      return {
        ...baseBlock,
        type: 'class',
        data: {
          name: decl.name,
          members: decl.members.join(', ')
        }
      } as Block;
      
    case 'ElementDeclaration':
      return {
        ...baseBlock,
        type: 'element',
        data: {
          name: decl.name,
          pattern: decl.pattern
        }
      } as Block;
      
    case 'SyllablesDeclaration':
      return {
        ...baseBlock,
        type: 'syllables',
        data: {
          structure: decl.pattern
        }
      } as Block;
      
    case 'StressDeclaration':
      return {
        ...baseBlock,
        type: 'stress',
        data: {
          pattern: decl.pattern,
          autoFix: decl.options.autoFix ? 'true' : 'false',
          heavyPattern: decl.options.heavySyllablePattern || '',
          customPosition: decl.options.customPosition || '',
          fallbackDirection: decl.options.fallbackDirection || '',
          secondaryEnabled: decl.options.secondary?.enabled ? 'true' : 'false',
          secondaryPattern: decl.options.secondary?.pattern || '',
          secondaryDirection: decl.options.secondary?.direction || ''
        }
      } as Block;
      
    case 'RuleDeclaration':
      return {
        ...baseBlock,
        type: 'rule',
        data: {
          name: decl.name,
          propagate: decl.options.propagate ? 'true' : 'false',
          direction: decl.options.direction || ''
        },
        children: decl.body.map(ruleBodyItemToBlock).filter(Boolean) as Block[]
      } as Block;
      
    default:
      return baseBlock as Block;
  }
}

/**
 * Convert a rule body item to a Block
 */
function ruleBodyItemToBlock(item: any): Block | null {
  if (!item) return null;
  
  const baseBlock: Partial<Block> = {
    id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x: 50,
    y: 50,
    data: {}
  };
  
  switch (item.type) {
    case 'SoundChangeStatement':
      return {
        ...baseBlock,
        type: 'soundChange',
        data: {
          target: item.target?.raw || '',
          replacement: item.replacement || '',
          environment: item.environment?.raw || '_',
          exception: item.exceptions?.[0]?.raw || '',
          capture1: '',
          capture2: ''
        }
      } as Block;
      
    case 'NextStatement':
      return {
        ...baseBlock,
        type: 'next',
        data: {
          propagate: item.options?.propagate ? 'true' : 'false',
          direction: item.options?.direction || ''
        },
        children: item.body?.map(ruleBodyItemToBlock).filter(Boolean) as Block[]
      } as Block;
      
    case 'ApplyStatement':
      return {
        ...baseBlock,
        type: 'apply',
        data: {
          ruleName: item.ruleName
        }
      } as Block;
      
    default:
      return null;
  }
}

// === IMPORT FUNCTIONS ===

/**
 * Import from JSON format
 */
export function importFromJSON(json: string): { blocks: Block[]; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const data = JSON.parse(json);
    
    if (!data.blocks || !Array.isArray(data.blocks)) {
      errors.push('Invalid JSON format: missing blocks array');
      return { blocks: [], errors };
    }
    
    // Validate each block
    const blocks: Block[] = data.blocks.map((b: any, index: number) => {
      if (!b.type) {
        errors.push(`Block ${index} missing type`);
      }
      if (!b.id) {
        b.id = `block_${Date.now()}_${index}`;
      }
      return b as Block;
    });
    
    return { blocks, errors };
  } catch (err: any) {
    errors.push(`JSON parse error: ${err.message}`);
    return { blocks: [], errors };
  }
}

/**
 * Export to JSON format
 */
export function exportToJSON(blocks: Block[], metadata?: Record<string, any>): string {
  const data = {
    version: '2.0',
    format: 'roottrace-sca',
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    blocks
  };
  
  return JSON.stringify(data, null, 2);
}

// === BIDIRECTIONAL CONVERSION ===

/**
 * Convert text syntax to blocks
 */
export function textToBlocks(text: string): { blocks: Block[]; errors: string[] } {
  // Use the new parser to get AST, then convert to blocks
  const { program, errors: parseErrors } = require('./scaUnified').parseSCA(text);
  
  const errors = parseErrors.map((e: any) => 
    `Line ${e.line}${e.column ? `:${e.column}` : ''}: ${e.message}`
  );
  
  if (!program) {
    return { blocks: [], errors };
  }
  
  const blocks = exportToBlocks(program.declarations);
  return { blocks, errors };
}

/**
 * Convert blocks to text syntax
 */
export function blocksToText(blocks: Block[]): { text: string; errors: string[] } {
  try {
    // Convert blocks to declarations (simplified conversion)
    const text = exportToText(blocks.map(blockToDeclaration));
    return { text, errors: [] };
  } catch (err: any) {
    return { text: '', errors: [err.message] };
  }
}

/**
 * Simple block to declaration conversion
 */
function blockToDeclaration(block: Block): any {
  // This is a simplified conversion
  // Full implementation would map all block types properly
  switch (block.type) {
    case 'class': {
      const membersData = block.data.members || '';
      const membersStr = Array.isArray(membersData) ? membersData.join(',') : membersData;
      return {
        type: 'ClassDeclaration',
        name: block.data.name || 'C',
        members: membersStr.split(',').map((s: string) => s.trim())
      };
    }
      
    case 'rule':
      return {
        type: 'RuleDeclaration',
        name: block.data.name || 'unnamed',
        options: {
          propagate: block.data.propagate === 'true',
          direction: block.data.direction as any
        },
        body: []
      };
      
    default:
      return null;
  }
}

export default {
  exportToText,
  exportToBlocks,
  exportToJSON,
  importFromJSON,
  textToBlocks,
  blocksToText
};
