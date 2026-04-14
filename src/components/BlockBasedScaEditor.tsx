import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GripVertical, Trash2, Copy, Plus, Settings, X, ChevronRight, Layers, Type, Music, ArrowRight } from 'lucide-react';

// Block Types matching blendedSca.ts capabilities
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

// Stress pattern types
export type StressPattern = 
  | 'initial'      // Stress on first syllable
  | 'final'        // Stress on last syllable
  | 'penultimate'  // Stress on second-to-last syllable
  | 'antepenult'   // Stress on third-to-last syllable
  | 'trochaic'     // Strong-weak alternating from left
  | 'iambic'       // Weak-strong alternating from left
  | 'dactylic'     // Strong-weak-weak from left
  | 'anapestic'    // Weak-weak-strong from left
  | 'mobile'       // Stress moves based on weight/heavy syllables
  | 'random-mobile'; // Random stress placement with fallback

export interface BlockStressConfig {
  pattern: StressPattern;
  customPosition?: number;
  heavySyllablePattern?: string;
  autoFix: boolean;
  enforceSafety: boolean;
  // Random mobile options
  fallbackDirection?: 'next' | 'previous';
  seed?: number | null;
  // Secondary stress options
  secondaryEnabled?: boolean;
  secondaryPattern?: 'alternating' | 'custom';
  secondaryDirection?: 'ltr' | 'rtl';
}

// Block shape types for visual distinction
export type BlockShape = 'hat' | 'stack' | 'c-shape' | 'reporter' | 'cap';

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  collapsed?: boolean;
  data: Record<string, string | string[]>;
  children?: Block[];
  parentId?: string;  // Reference to parent block for proper nesting
  isDragging?: boolean;  // Track drag state
  snapToGrid?: boolean;  // Whether block should snap to grid
}

interface BlockPaletteItem {
  type: BlockType;
  label: string;
  description: string;
  color: string;
  shape: BlockShape;
  defaultData: Record<string, string | string[]>;
}

const PALETTE_ITEMS: BlockPaletteItem[] = [
  {
    type: 'class',
    label: 'Class',
    description: 'Define a phoneme class',
    color: '#a78bfa', // Purple
    shape: 'hat',
    defaultData: { name: 'C', members: 'p, t, k, b, d, g' }
  },
  {
    type: 'element',
    label: 'Element',
    description: 'Define a reusable pattern',
    color: '#a78bfa', // Purple
    shape: 'hat',
    defaultData: { name: 'onset', pattern: 'C V' }
  },
  {
    type: 'customSegment',
    label: 'Custom Segment',
    description: 'Define custom phoneme with features',
    color: '#c084fc', // Light purple
    shape: 'hat',
    defaultData: { symbol: 'š', features: 'ʃ' }
  },
  {
    type: 'rule',
    label: 'Rule',
    description: 'Named rule container',
    color: '#60a5fa', // Blue
    shape: 'hat',
    defaultData: { name: 'my-rule', propagate: 'false', direction: 'ltr' }
  },
  {
    type: 'soundChange',
    label: 'Sound Change',
    description: 'Change one sound to another',
    color: '#fbbf24', // Amber
    shape: 'stack',
    defaultData: { target: 'p', replacement: 'b', environment: '_ V', exception: '', capture1: '', capture2: '', exceptWords: '' }
  },
  {
    type: 'chainShift',
    label: 'Chain Shift',
    description: 'Sequential sound shift chain',
    color: '#f59e0b', // Dark amber
    shape: 'stack',
    defaultData: { type: 'drag', chain: 'iː >> əɪ >> aɪ' }
  },
  {
    type: 'next',
    label: 'Next',
    description: 'Sequential stage (zero-ambiguity)',
    color: '#34d399', // Green
    shape: 'c-shape',
    defaultData: { direction: '' }
  },
  {
    type: 'block',
    label: 'Iterative Block',
    description: 'Apply rules until stable [block]...[end]',
    color: '#10b981', // Emerald
    shape: 'c-shape',
    defaultData: {}
  },
  {
    type: 'if',
    label: 'If',
    description: 'Conditional rule',
    color: '#f472b6', // Pink
    shape: 'c-shape',
    defaultData: { condition: 'V_V', thenRule: '', elseRule: '' }
  },
  {
    type: 'deromanizer',
    label: 'Deromanizer',
    description: 'Convert spelling to phonetic',
    color: '#94a3b8', // Slate
    shape: 'hat',
    defaultData: { literal: 'false' }
  },
  {
    type: 'romanizer',
    label: 'Romanizer',
    description: 'Convert phonetic to spelling',
    color: '#94a3b8', // Slate
    shape: 'hat',
    defaultData: { name: '', literal: 'false' }
  },
  {
    type: 'deferred',
    label: 'Deferred',
    description: 'Deferred rule block',
    color: '#64748b', // Dark slate
    shape: 'hat',
    defaultData: {}
  },
  {
    type: 'cleanup',
    label: 'Cleanup',
    description: 'Cleanup rule with on/off toggle',
    color: '#475569', // Slate 600
    shape: 'hat',
    defaultData: { name: 'cleanup-rule', enabled: 'true' }
  },
  {
    type: 'apply',
    label: 'Apply',
    description: 'Apply another rule',
    color: '#64748b', // Dark slate
    shape: 'stack',
    defaultData: { ruleName: '' }
  },
  {
    type: 'syllables',
    label: 'Syllables',
    description: 'Define syllable structure',
    color: '#22d3ee', // Cyan
    shape: 'hat',
    defaultData: { structure: 'onset :: nucleus :: coda' }
  },
  {
    type: 'stress',
    label: 'Stress',
    description: 'Define stress assignment pattern',
    color: '#f43f5e', // Rose
    shape: 'hat',
    defaultData: { pattern: 'initial', autoFix: 'true', heavyPattern: 'VC' }
  },
];

// Generate unique ID
const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function blocksToSyntax(blocks: Block[], usePythonStyle: boolean = false): string {
  const lines: string[] = [];
  
  const processBlock = (block: Block, indent: string = ''): void => {
    const { type, data } = block;
    
    switch (type) {
      case 'class': {
        if (usePythonStyle) {
          const members = Array.isArray(data.members) ? data.members : (data.members as string).split(',').map(m => m.trim());
          const formatted = members.map(m => `"${m}"`).join(', ');
          lines.push(`${indent}class ${data.name} = [${formatted}]`);
        } else {
          const members = Array.isArray(data.members) ? data.members.join(', ') : data.members;
          lines.push(`${indent}Class ${data.name} {${members}}`);
        }
        break;
      }
      case 'element': {
        if (usePythonStyle) {
          lines.push(`${indent}def element(${data.name}, "${data.pattern}")`);
        } else {
          lines.push(`${indent}Element ${data.name} ${data.pattern}`);
        }
        break;
      }
      case 'soundChange': {
        if (usePythonStyle) {
          const env = data.environment && data.environment !== '_' ? ` if ${data.environment}` : '';
          lines.push(`${indent}${data.target} = ${data.replacement}${env}`);
        } else {
          const exc = data.exception ? ` !${data.exception}` : '';
          const exceptWords = data.exceptWords ? ` except ${data.exceptWords}` : '';
          lines.push(`${indent}${data.target} > ${data.replacement} / ${data.environment}${exc}${exceptWords}`);
        }
        break;
      }
      case 'rule': {
        if (usePythonStyle) {
          // Script syntax: rule name: ... end
          const opts: string[] = [];
          if (data.propagate === 'true') opts.push('propagate');
          if (data.direction) opts.push(data.direction as string);
          const optStr = opts.length > 0 ? ` [${opts.join(' ')}]` : '';
          lines.push(`${indent}rule ${data.name}${optStr}:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}end`);
        } else {
          const opts: string[] = [];
          if (data.propagate === 'true') opts.push('propagate');
          if (data.direction) opts.push(data.direction as string);
          const optStr = opts.length > 0 ? ` [${opts.join(' ')}]` : '';
          lines.push(`${indent}${data.name}${optStr}:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
        }
        break;
      }
      case 'chainShift': {
        if (usePythonStyle) {
          lines.push(`${indent}chain ${data.type}:`);
          lines.push(`${indent}  ${data.chain}`);
          lines.push(`${indent}end`);
        } else {
          lines.push(`${indent}chain(${data.type}) ${data.chain}:`);
        }
        break;
      }
      case 'block': {
        if (usePythonStyle) {
          lines.push(`${indent}block:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}end`);
        } else {
          lines.push(`${indent}[block]`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}[end]`);
        }
        break;
      }
      case 'next': {
        if (usePythonStyle) {
          const opts: string[] = [];
          if (data.propagate === 'true') opts.push('propagate');
          if (data.direction) opts.push(data.direction as string);
          const optStr = opts.length > 0 ? ` [${opts.join(' ')}]` : '';
          lines.push(`${indent}next${optStr}:`);
        } else {
          const opts: string[] = [];
          if (data.propagate === 'true') opts.push('propagate');
          if (data.direction) opts.push(data.direction as string);
          const optStr = opts.length > 0 ? ` [${opts.join(' ')}]` : '';
          lines.push(`${indent}Next${optStr}:`);
        }
        if (block.children) {
          block.children.forEach(child => processBlock(child, indent + '  '));
        }
        break;
      }
      case 'if': {
        if (usePythonStyle) {
          const elseClause = data.elseRule ? ` else ${data.elseRule}` : '';
          lines.push(`${indent}if ${data.condition} then ${data.thenRule}${elseClause}`);
        } else {
          const elseClause = data.elseRule ? ` ELSE ${data.elseRule}` : '';
          lines.push(`${indent}IF ${data.condition} THEN ${data.thenRule}${elseClause}`);
        }
        break;
      }
      case 'deromanizer': {
        if (usePythonStyle) {
          lines.push(`${indent}deromanizer:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}end`);
        } else {
          const literal = data.literal === 'true' ? ' literal' : '';
          lines.push(`${indent}Deromanizer${literal}:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
        }
        break;
      }
      case 'romanizer': {
        if (usePythonStyle) {
          lines.push(`${indent}romanizer:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}end`);
        } else {
          const name = data.name ? `-${data.name}` : '';
          const romanizerLiteral = data.literal === 'true' ? ' literal' : '';
          lines.push(`${indent}Romanizer${name}${romanizerLiteral}:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
        }
        break;
      }
      case 'deferred': {
        if (usePythonStyle) {
          lines.push(`${indent}deferred:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          lines.push(`${indent}end`);
        } else {
          lines.push(`${indent}Deferred:`);
          if (block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
        }
        break;
      }
      case 'cleanup': {
        if (usePythonStyle) {
          if (data.enabled === 'false') {
            lines.push(`${indent}; cleanup ${data.name} off`);
          } else {
            lines.push(`${indent}cleanup${data.name ? ` ${data.name}` : ''}:`);
          }
          if (data.enabled !== 'false' && block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
          if (data.enabled !== 'false') {
            lines.push(`${indent}end`);
          }
        } else {
          if (data.enabled === 'false') {
            lines.push(`${indent}Cleanup${data.name ? ` ${data.name}` : ''}: off`);
          } else {
            lines.push(`${indent}Cleanup${data.name ? ` ${data.name}` : ''}:`);
          }
          if (data.enabled !== 'false' && block.children) {
            block.children.forEach(child => processBlock(child, indent + '  '));
          }
        }
        break;
      }
      case 'customSegment': {
        lines.push(`${indent}feat: ${data.symbol} = ${data.features}`);
        break;
      }
      case 'apply': {
        if (usePythonStyle) {
          lines.push(`${indent}apply: ${data.ruleName}`);
        } else {
          lines.push(`${indent}Apply: ${data.ruleName}`);
        }
        break;
      }
      case 'syllables': {
        if (usePythonStyle) {
          lines.push(`${indent}syllables = "${data.structure}"`);
        } else {
          lines.push(`${indent}Syllables: ${data.structure}`);
        }
        break;
      }
      case 'stress': {
        if (usePythonStyle) {
          const pattern = data.pattern as string;
          const fallback = data.fallbackDirection ? ` fallback:${data.fallbackDirection}` : '';
          const secondary = data.secondaryEnabled === 'true' ? ` secondary:${data.secondaryPattern || 'alternating'}` : '';
          const seed = data.seed ? ` seed:${data.seed}` : '';
          lines.push(`${indent}stress = "${pattern}"${fallback}${secondary}${seed}`);
        } else {
          const pattern = data.pattern as string;
          const autoFix = data.autoFix === 'true' ? ' auto-fix' : '';
          const heavyPattern = data.heavyPattern ? ` heavy:${data.heavyPattern}` : '';
          const customPos = data.customPosition ? ` pos:${data.customPosition}` : '';
          const fallback = data.fallbackDirection ? ` fallback:${data.fallbackDirection}` : '';
          const secondary = data.secondaryEnabled === 'true' ? ` secondary:${data.secondaryPattern || 'alternating'}` : '';
          const secDir = data.secondaryEnabled === 'true' && data.secondaryDirection ? ` 2nd-dir:${data.secondaryDirection}` : '';
          lines.push(`${indent}Stress: ${pattern}${autoFix}${heavyPattern}${customPos}${fallback}${secondary}${secDir}`);
        }
        break;
      }
    }
  };
  
  blocks.forEach(block => processBlock(block));
  return lines.join('\n');
}

export function syntaxToBlocks(syntax: string): Block[] {
  const lines = syntax.split('\n');
  const blocks: Block[] = [];
  const stack: { block: Block; indent: number }[] = [];
  
  let currentIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue; // Standardized: ; comments only
    
    // Normalize arrows before matching (standardized: > and => only)
    trimmed = trimmed
      .replace(/\s*=>\s*/g, ' > ');
    
    // Calculate indent level
    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    currentIndent = indent;
    
    // Pop from stack if we've dedented
    while (stack.length > 0 && stack[stack.length - 1].indent >= currentIndent) {
      stack.pop();
    }
    
    let block: Block | null = null;
    
    // Parse different syntax patterns (case-insensitive for Classic/Script compatibility)
    const classMatch = trimmed.match(/^class\s+(\w+)\s*\{([^}]+)\}/i);
    if (classMatch) {
      block = {
        id: generateId(),
        type: 'class',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { name: classMatch[1], members: classMatch[2] }
      };
    }
    
    const elementMatch = trimmed.match(/^element\s+(\w+)\s+(.+)/i);
    if (elementMatch) {
      block = {
        id: generateId(),
        type: 'element',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { name: elementMatch[1], pattern: elementMatch[2] }
      };
    }
    
    // Handle both Classic 'name:' and Script 'rule name:' patterns
    const ruleMatch = trimmed.match(/^(?:(rule)\s+)?(\w[\w-]*)(?:\s*\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/i);
    if (ruleMatch && !trimmed.match(/^if/i) && !trimmed.match(/^then/i) && !trimmed.match(/^next/i)) {
      const opts = ruleMatch[3]?.split(/\s+/) || [];
      block = {
        id: generateId(),
        type: 'rule',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: {
          name: ruleMatch[2],
          propagate: opts.includes('propagate').toString(),
          direction: ruleMatch[4] || (opts.find(o => o === 'ltr' || o === 'rtl') || '')
        },
        children: []
      };
    }
    
    // Handle both Classic > and Script = for sound changes
    const soundChangeMatch = trimmed.match(/^(.+?)\s*(?:>|=)\s*(.+?)(?:\s*\/\s*(.+?))?(?:\s*!(.+?))?(?:\s+except\s+(.+))?$/);
    if (soundChangeMatch && !trimmed.startsWith('Class') && !trimmed.startsWith('Element') && !trimmed.startsWith('feat:')) {
      // Parse capture groups from target
      let target = soundChangeMatch[1].trim();
      const replacement = soundChangeMatch[2].trim();
      let capture1 = '';
      let capture2 = '';
      
      // Extract capture markers <...> from target pattern
      const captureMatches = target.match(/<([^>]+)>/g);
      if (captureMatches) {
        captureMatches.forEach((match, idx) => {
          const content = match.slice(1, -1); // Remove < and >
          if (idx === 0) capture1 = content;
          if (idx === 1) capture2 = content;
        });
        // Remove capture markers from target for storage
        target = target.replace(/<([^>]+)>/g, '$1');
      }
      
      block = {
        id: generateId(),
        type: 'soundChange',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          target: target, 
          replacement: replacement,
          environment: soundChangeMatch[3] || '_',
          exception: soundChangeMatch[4] || '',
          exceptWords: soundChangeMatch[5] || '',
          capture1,
          capture2
        }
      };
    }
    
    // Handle both Classic 'Next' and Script 'next' (case-insensitive)
    const nextMatch = trimmed.match(/^next(?:\s*\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/i);
    if (nextMatch) {
      const opts = nextMatch[1]?.split(/\s+/) || [];
      block = {
        id: generateId(),
        type: 'next',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          propagate: opts.includes('propagate').toString(),
          direction: nextMatch[2] || (opts.find(o => o === 'ltr' || o === 'rtl') || '')
        },
        children: []
      };
    }
    
    // Chain shift parser - Classic: chain(type) chain:  Script: chain type: chain
    const chainMatch = trimmed.match(/^chain\((\w+)\)\s+(.+):$/i);
    const scriptChainMatch = trimmed.match(/^chain\s+(\w+):$/i);
    if (chainMatch) {
      block = {
        id: generateId(),
        type: 'chainShift',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: {
          type: chainMatch[1],
          chain: chainMatch[2]
        }
      };
    } else if (scriptChainMatch) {
      // Script-style chain - look ahead for the chain content on next line
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.match(/^end$/)) {
        block = {
          id: generateId(),
          type: 'chainShift',
          x: 50 + (indent * 20),
          y: 50 + (blocks.length * 80),
          data: {
            type: scriptChainMatch[1],
            chain: nextLine
          }
        };
        i++; // Skip the chain content line
      }
    }

    const blockMatch = trimmed.match(/^\[block\]$/);
    if (blockMatch) {
      block = {
        id: generateId(),
        type: 'block',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: {},
        children: []
      };
    }

    // Handle both Classic [end] and Script 'end' keyword
    const endMatch = trimmed.match(/^\[end\]$/);
    const scriptEndMatch = trimmed.match(/^end$/);
    if (endMatch || scriptEndMatch) {
      // Pop the block from stack
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }
    
    const cleanupMatch = trimmed.match(/^Cleanup(?:\s+(\w+))?:\s*(off)?$/i);
    if (cleanupMatch) {
      block = {
        id: generateId(),
        type: 'cleanup',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          name: cleanupMatch[1] || '',
          enabled: cleanupMatch[2] ? 'false' : 'true'
        },
        children: cleanupMatch[2] ? undefined : []
      };
    }
    
    // Handle both Classic 'Deferred' and Script 'deferred' (case-insensitive)
    const deferredMatch = trimmed.match(/^deferred:$/i);
    if (deferredMatch) {
      block = {
        id: generateId(),
        type: 'deferred',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: {},
        children: []
      };
    }
    
    const customSegmentMatch = trimmed.match(/^feat:\s*(\S+)\s*=\s*(.+)$/i);
    if (customSegmentMatch) {
      block = {
        id: generateId(),
        type: 'customSegment',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          symbol: customSegmentMatch[1], 
          features: customSegmentMatch[2].trim()
        }
      };
    }
    
    // Handle both Classic 'IF/THEN' and Script 'if/then' (case-insensitive)
    const ifMatch = trimmed.match(/^if\s+(.+?)\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i);
    if (ifMatch) {
      block = {
        id: generateId(),
        type: 'if',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          condition: ifMatch[1], 
          thenRule: ifMatch[2],
          elseRule: ifMatch[3] || ''
        },
        children: []
      };
    }
    
    // Handle both Classic 'Deromanizer' and Script 'deromanizer' (case-insensitive)
    const deromanizerMatch = trimmed.match(/^deromanizer:$/i);
    if (deromanizerMatch) {
      block = {
        id: generateId(),
        type: 'deromanizer',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: {},
        children: []
      };
    }
    
    // Handle both Classic 'Romanizer' and Script 'romanizer' (case-insensitive)
    const romanizerMatch = trimmed.match(/^romanizer(-\w+)?:$/i);
    if (romanizerMatch) {
      block = {
        id: generateId(),
        type: 'romanizer',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { name: romanizerMatch[1]?.slice(1) || '' },
        children: []
      };
    }
    
    // Handle both Classic 'Apply' and Script 'apply' (case-insensitive)
    const applyMatch = trimmed.match(/^apply:\s*(\w+)$/i);
    if (applyMatch) {
      block = {
        id: generateId(),
        type: 'apply',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { ruleName: applyMatch[1] }
      };
    }
    
    // Handle both Classic 'Syllables' and Script 'syllables' (case-insensitive)
    const syllablesMatch = trimmed.match(/^syllables:\s*(.+)$/i);
    if (syllablesMatch) {
      block = {
        id: generateId(),
        type: 'syllables',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { structure: syllablesMatch[1] }
      };
    }
    
    const stressMatch = trimmed.match(/^Stress:\s*(\w+)(?:\s+auto-fix)?(?:\s+heavy:(\S+))?(?:\s+pos:(\S+))?(?:\s+fallback:(next|previous))?(?:\s+secondary:(\w+))?(?:\s+2nd-dir:(ltr|rtl))?/i);
    if (stressMatch) {
      const autoFix = trimmed.includes('auto-fix') ? 'true' : 'false';
      block = {
        id: generateId(),
        type: 'stress',
        x: 50 + (indent * 20),
        y: 50 + (blocks.length * 80),
        data: { 
          pattern: stressMatch[1].toLowerCase(),
          autoFix,
          heavyPattern: stressMatch[2] || '',
          customPosition: stressMatch[3] || '',
          fallbackDirection: stressMatch[4] || '',
          secondaryEnabled: stressMatch[5] ? 'true' : 'false',
          secondaryPattern: stressMatch[5] || '',
          secondaryDirection: stressMatch[6] || ''
        }
      };
    }
    
    if (block) {
      // If there's a parent block on the stack, add this as a child
      if (stack.length > 0 && indent > stack[stack.length - 1].indent) {
        const parent = stack[stack.length - 1].block;
        if (!parent.children) parent.children = [];
        parent.children.push(block);
      } else {
        blocks.push(block);
      }
      
      // If this is a container block, push to stack
      if (block.type === 'rule' || block.type === 'next' || block.type === 'if' || 
          block.type === 'deromanizer' || block.type === 'romanizer' ||
          block.type === 'block' || block.type === 'cleanup' || block.type === 'deferred') {
        stack.push({ block, indent });
      }
    }
  }
  
  return blocks;
}

interface BlockComponentProps {
  block: Block;
  paletteItem: BlockPaletteItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (data: Block['data']) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  children?: React.ReactNode;
}

const BlockComponent: React.FC<BlockComponentProps> = ({ 
  block, 
  paletteItem, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  children 
}) => {
  const renderBlockContent = () => {
    const data = block.data;
    
    switch (block.type) {
      case 'class':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-bold text-white text-xs sm:text-sm">Class</span>
            <input
              type="text"
              value={data.name as string}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="Name"
            />
            <span className="text-white/70 shrink-0">{'{'}</span>
            <input
              type="text"
              value={Array.isArray(data.members) ? data.members.join(', ') : data.members}
              onChange={(e) => onUpdate({ ...data, members: e.target.value })}
              className="flex-1 min-w-[80px] sm:min-w-[120px] px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="p, t, k"
            />
            <span className="text-white/70 shrink-0">{'}'}</span>
          </div>
        );
      
      case 'element':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-bold text-white text-xs sm:text-sm">Element</span>
            <input
              type="text"
              value={data.name as string}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="Name"
            />
            <input
              type="text"
              value={data.pattern as string}
              onChange={(e) => onUpdate({ ...data, pattern: e.target.value })}
              className="flex-1 min-w-[80px] sm:min-w-[120px] px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="Pattern"
            />
          </div>
        );
      
      case 'rule':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <input
                type="text"
                value={data.name as string}
                onChange={(e) => onUpdate({ ...data, name: e.target.value })}
                className="flex-1 min-w-[80px] sm:min-w-[100px] px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                placeholder="rule-name"
              />
              <span className="text-white/70 shrink-0">:</span>
              <select
                value={(data.direction as string) || ''}
                onChange={(e) => onUpdate({ ...data, direction: e.target.value })}
                className="px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs outline-none"
              >
                <option value="">Default</option>
                <option value="ltr">LTR</option>
                <option value="rtl">RTL</option>
                <option value="propagate">Propagate</option>
              </select>
            </div>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      case 'soundChange':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <input
              type="text"
              value={data.target as string}
              onChange={(e) => onUpdate({ ...data, target: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="p"
            />
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-white/70 shrink-0" />
            <input
              type="text"
              value={data.replacement as string}
              onChange={(e) => onUpdate({ ...data, replacement: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="b"
            />
            <span className="text-white/70 shrink-0">/</span>
            <input
              type="text"
              value={data.environment as string}
              onChange={(e) => onUpdate({ ...data, environment: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="_ V"
            />
            {data.exception && (
              <>
                <span className="text-white/70 shrink-0">!</span>
                <input
                  type="text"
                  value={data.exception as string}
                  onChange={(e) => onUpdate({ ...data, exception: e.target.value })}
                  className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                  placeholder="Exc"
                />
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...data, exception: data.exception ? '' : ' ' }); }}
              className="p-1 rounded hover:bg-white/20 text-white/70 shrink-0"
              title="Toggle exception"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        );
      
      case 'chainShift':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-white/70 text-[10px] sm:text-xs shrink-0">chain(</span>
            <select
              value={(data.type as string) || 'drag'}
              onChange={(e) => onUpdate({ ...data, type: e.target.value })}
              className="px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-[10px] sm:text-xs outline-none"
            >
              <option value="drag">drag</option>
              <option value="push">push</option>
            </select>
            <span className="text-white/70 text-[10px] sm:text-xs shrink-0">)</span>
            <input
              type="text"
              value={data.chain as string}
              onChange={(e) => onUpdate({ ...data, chain: e.target.value })}
              className="flex-1 min-w-[100px] sm:min-w-[150px] px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="iː >> əɪ >> aɪ"
            />
            <span className="text-white/70 shrink-0">:</span>
          </div>
        );
      
      case 'next':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">Next</span>
              <select
                value={(data.direction as string) || ''}
                onChange={(e) => onUpdate({ ...data, direction: e.target.value })}
                className="px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-[10px] sm:text-xs outline-none"
              >
                <option value="">Default</option>
                <option value="ltr">LTR</option>
                <option value="rtl">RTL</option>
                <option value="propagate">Propagate</option>
              </select>
              <span className="text-white/70 shrink-0">:</span>
            </div>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      case 'if':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm">IF</span>
              <input
                type="text"
                value={data.condition as string}
                onChange={(e) => onUpdate({ ...data, condition: e.target.value })}
                className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                placeholder="V_V"
              />
              <span className="text-white text-xs sm:text-sm">THEN</span>
              <input
                type="text"
                value={data.thenRule as string}
                onChange={(e) => onUpdate({ ...data, thenRule: e.target.value })}
                className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                placeholder="rule"
              />
              {data.elseRule !== undefined && (
                <>
                  <span className="text-white text-xs sm:text-sm">ELSE</span>
                  <input
                    type="text"
                    value={data.elseRule as string}
                    onChange={(e) => onUpdate({ ...data, elseRule: e.target.value })}
                    className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                    placeholder="rule"
                  />
                </>
              )}
            </div>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      case 'deromanizer':
        return (
          <div className="space-y-2">
            <span className="font-bold text-white text-xs sm:text-sm">Deromanizer:</span>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      case 'romanizer':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">Romanizer</span>
              <input
                type="text"
                value={data.name as string}
                onChange={(e) => onUpdate({ ...data, name: e.target.value })}
                className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                placeholder="name (opt)"
              />
              <span className="text-white/70 shrink-0">:</span>
            </div>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      case 'apply':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-white/70 text-xs sm:text-sm">Apply:</span>
            <input
              type="text"
              value={data.ruleName as string}
              onChange={(e) => onUpdate({ ...data, ruleName: e.target.value })}
              className="flex-1 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="rule-name"
            />
          </div>
        );
      
      case 'syllables':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-white text-xs sm:text-sm">Syllables:</span>
            <input
              type="text"
              value={data.structure as string}
              onChange={(e) => onUpdate({ ...data, structure: e.target.value })}
              className="flex-1 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="onset :: nucleus :: coda"
            />
          </div>
        );

      case 'stress':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm">Stress:</span>
              <select
                value={(data.pattern as string) || 'initial'}
                onChange={(e) => onUpdate({ ...data, pattern: e.target.value })}
                className="px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-[10px] sm:text-xs outline-none"
              >
                <option value="initial">Initial</option>
                <option value="final">Final</option>
                <option value="penultimate">Penultimate</option>
                <option value="antepenult">Antepenult</option>
                <option value="trochaic">Trochaic</option>
                <option value="iambic">Iambic</option>
                <option value="dactylic">Dactylic</option>
                <option value="anapestic">Anapestic</option>
                <option value="mobile">Mobile (weight-based)</option>
                <option value="random-mobile">Random Mobile</option>
                <option value="custom">Custom...</option>
              </select>
              {data.pattern === 'custom' && (
                <input
                  type="text"
                  value={(data.customPosition as string) || ''}
                  onChange={(e) => onUpdate({ ...data, customPosition: e.target.value })}
                  className="w-12 sm:w-16 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-[10px] sm:text-xs font-mono outline-none"
                  placeholder="Pos"
                  title="0=first, 1=second, -1=last, -2=penult"
                />
              )}
              <label className="flex items-center gap-1 text-white/80 text-[10px] sm:text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={data.autoFix === 'true'}
                  onChange={(e) => onUpdate({ ...data, autoFix: e.target.checked ? 'true' : 'false' })}
                  className="rounded w-3 h-3 sm:w-4 sm:h-4"
                />
                Auto-fix
              </label>
            </div>
            
            {/* Heavy syllable pattern for mobile/custom */}
            {(data.pattern === 'mobile' || data.pattern === 'custom') && (
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-[10px]">Heavy:</span>
                <input
                  type="text"
                  value={(data.heavyPattern as string) || ''}
                  onChange={(e) => onUpdate({ ...data, heavyPattern: e.target.value })}
                  className="w-20 px-1.5 py-1 rounded bg-white/20 text-white text-[10px] font-mono outline-none"
                  placeholder="VC"
                />
              </div>
            )}
            
            {/* Random mobile options */}
            {data.pattern === 'random-mobile' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/70 text-[10px]">Fallback:</span>
                <select
                  value={(data.fallbackDirection as string) || 'next'}
                  onChange={(e) => onUpdate({ ...data, fallbackDirection: e.target.value })}
                  className="px-1.5 py-1 rounded bg-white/20 text-white text-[10px] outline-none"
                >
                  <option value="next">Next</option>
                  <option value="previous">Previous</option>
                </select>
                <span className="text-white/70 text-[10px]">Seed:</span>
                <input
                  type="text"
                  value={(data.seed as string) || ''}
                  onChange={(e) => onUpdate({ ...data, seed: e.target.value })}
                  className="w-16 px-1.5 py-1 rounded bg-white/20 text-white text-[10px] font-mono outline-none"
                  placeholder="random"
                  title="Optional seed for reproducible randomness"
                />
              </div>
            )}
            
            {/* Secondary stress options */}
            <div className="flex items-center gap-2 flex-wrap border-t border-white/20 pt-2 mt-1">
              <label className="flex items-center gap-1 text-white/80 text-[10px] shrink-0">
                <input
                  type="checkbox"
                  checked={data.secondaryEnabled === 'true'}
                  onChange={(e) => onUpdate({ ...data, secondaryEnabled: e.target.checked ? 'true' : 'false' })}
                  className="rounded w-3 h-3"
                />
                2° Stress
              </label>
              {data.secondaryEnabled === 'true' && (
                <>
                  <select
                    value={(data.secondaryPattern as string) || 'alternating'}
                    onChange={(e) => onUpdate({ ...data, secondaryPattern: e.target.value })}
                    className="px-1.5 py-1 rounded bg-white/20 text-white text-[10px] outline-none"
                  >
                    <option value="alternating">Alternating</option>
                    <option value="custom">Custom</option>
                  </select>
                  <select
                    value={(data.secondaryDirection as string) || 'ltr'}
                    onChange={(e) => onUpdate({ ...data, secondaryDirection: e.target.value })}
                    className="px-1.5 py-1 rounded bg-white/20 text-white text-[10px] outline-none"
                  >
                    <option value="ltr">L→R</option>
                    <option value="rtl">R→L</option>
                  </select>
                </>
              )}
            </div>
          </div>
        );

      case 'block':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">[block]</span>
            </div>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
            <div className="text-white/50 text-[10px] sm:text-xs">[end]</div>
          </div>
        );

      case 'cleanup':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">Cleanup</span>
              <input
                type="text"
                value={data.name as string}
                onChange={(e) => onUpdate({ ...data, name: e.target.value })}
                className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
                placeholder="name"
              />
              <span className="text-white/70 shrink-0">:</span>
              <select
                value={(data.enabled as string) || 'true'}
                onChange={(e) => onUpdate({ ...data, enabled: e.target.value })}
                className="px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-[10px] sm:text-xs outline-none"
              >
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </div>
            {data.enabled !== 'false' && children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );

      case 'customSegment':
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-bold text-white text-xs sm:text-sm">feat:</span>
            <input
              type="text"
              value={data.symbol as string}
              onChange={(e) => onUpdate({ ...data, symbol: e.target.value })}
              className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="š"
            />
            <span className="text-white/70 shrink-0">=</span>
            <input
              type="text"
              value={data.features as string}
              onChange={(e) => onUpdate({ ...data, features: e.target.value })}
              className="flex-1 min-w-[80px] sm:min-w-[100px] px-1.5 sm:px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm font-mono outline-none focus:bg-white/30"
              placeholder="ʃ or +cons -voi"
            />
          </div>
        );

      case 'deferred':
        return (
          <div className="space-y-2">
            <span className="font-bold text-white text-xs sm:text-sm">Deferred:</span>
            {children && (
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-white/30 space-y-2">
                {children}
              </div>
            )}
          </div>
        );
      
      default:
        return <span className="text-white text-xs sm:text-sm">{paletteItem.label}</span>;
    }
  };
  
  // Get notch style for block shape
  const getNotchStyle = () => {
    if (paletteItem.shape === 'hat') {
      return 'rounded-t-lg pt-2';
    }
    if (paletteItem.shape === 'cap') {
      return 'rounded-b-lg pb-2';
    }
    return '';
  };
  
  return (
    <div
      className={`relative group ${isSelected ? 'ring-2 ring-white' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onTouchStart={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div
        className={`p-3 rounded-lg shadow-lg transition-all hover:shadow-xl active:scale-[0.98] ${getNotchStyle()}`}
        style={{ backgroundColor: paletteItem.color }}
      >
        {/* Block header with controls - always visible on touch devices */}
        <div className="flex items-start gap-2">
          <div className="mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              onTouchStart={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 sm:p-1 rounded hover:bg-white/30 text-white active:bg-white/40 touch-manipulation"
              title="Duplicate"
            >
              <Copy className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onTouchStart={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 sm:p-1 rounded hover:bg-white/30 text-white active:bg-white/40 touch-manipulation"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            {renderBlockContent()}
          </div>
        </div>
      </div>
      {/* Connection notch for stack blocks */}
      {paletteItem.shape === 'stack' && (
        <div className="absolute -bottom-2 left-4 w-8 h-2 bg-current rounded-b" style={{ color: paletteItem.color }} />
      )}
    </div>
  );
};

interface BlockBasedScaEditorProps {
  initialBlocks?: Block[];
  onChange?: (syntax: string) => void;
  syntaxStyle?: 'classic' | 'python';
  onSyntaxStyleChange?: (style: 'classic' | 'python') => void;
}

export default function BlockBasedScaEditor({ 
  initialBlocks = [], 
  onChange,
  syntaxStyle = 'classic',
  onSyntaxStyleChange
}: BlockBasedScaEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<BlockType | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  // Notify parent of syntax changes
  useEffect(() => {
    if (onChange) {
      onChange(blocksToSyntax(blocks, syntaxStyle === 'python'));
    }
  }, [blocks, syntaxStyle, blocksToSyntax, onChange]);
  
  // Find block by ID (including nested)
  const findBlock = useCallback((id: string, blockList: Block[] = blocks): { block: Block | null; parent: Block | null; index: number } => {
    for (let i = 0; i <blockList.length; i++) {
      if (blockList[i].id === id) {
        return { block: blockList[i], parent: null, index: i };
      }
      if (blockList[i].children) {
        const result = findBlock(id, blockList[i].children);
        if (result.block) {
          return { ...result, parent: blockList[i] };
        }
      }
    }
    return { block: null, parent: null, index: -1 };
  }, [blocks]);
  
  // Add new block
  const addBlock = useCallback((type: BlockType, parentId?: string) => {
    const paletteItem = PALETTE_ITEMS.find(i => i.type === type)!;
    const newBlock: Block = {
      id: generateId(),
      type,
      x: 50,
      y: blocks.length * 100 + 50,
      data: { ...paletteItem.defaultData }
    };
    
    if (paletteItem.shape === 'c-shape' || type === 'rule' || type === 'deromanizer' || 
        type === 'romanizer' || type === 'block' || type === 'cleanup' || type === 'deferred') {
      newBlock.children = [];
    }
    
    if (parentId) {
      setBlocks(prev => {
        const updateChildren = (list: Block[]): Block[] => {
          return list.map(b => {
            if (b.id === parentId) {
              return { ...b, children: [...(b.children || []), newBlock] };
            }
            if (b.children) {
              return { ...b, children: updateChildren(b.children) };
            }
            return b;
          });
        };
        return updateChildren(prev);
      });
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
    setSelectedBlockId(newBlock.id);
  }, [blocks.length]);
  
  // Update block data
  const updateBlock = useCallback((id: string, data: Block['data']) => {
    setBlocks(prev => {
      const updateRecursive = (list: Block[]): Block[] => {
        return list.map(b => {
          if (b.id === id) {
            return { ...b, data };
          }
          if (b.children) {
            return { ...b, children: updateRecursive(b.children) };
          }
          return b;
        });
      };
      return updateRecursive(prev);
    });
  }, []);
  
  // Delete block
  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const deleteRecursive = (list: Block[]): Block[] => {
        return list.filter(b => b.id !== id).map(b => {
          if (b.children) {
            return { ...b, children: deleteRecursive(b.children) };
          }
          return b;
        });
      };
      return deleteRecursive(prev);
    });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);
  
  // Duplicate block
  const duplicateBlock = useCallback((id: string) => {
    const { block } = findBlock(id);
    if (!block) return;
    
    const newBlock: Block = {
      ...block,
      id: generateId(),
      x: block.x + 20,
      y: block.y + 20,
      children: block.children ? JSON.parse(JSON.stringify(block.children)) : undefined
    };
    
    setBlocks(prev => {
      const addAfter = (list: Block[]): Block[] => {
        const result: Block[] = [];
        for (const b of list) {
          result.push(b);
          if (b.id === id) {
            result.push(newBlock);
          }
          if (b.children) {
            b.children = addAfter(b.children);
          }
        }
        return result;
      };
      return addAfter(prev);
    });
  }, [findBlock]);
  
  // Render blocks recursively
  const renderBlocks = (blockList: Block[], parentId?: string) => {
    return blockList.map(block => {
      const paletteItem = PALETTE_ITEMS.find(i => i.type === block.type)!;
      const isSelected = selectedBlockId === block.id;
      
      return (
        <BlockComponent
          key={block.id}
          block={block}
          paletteItem={paletteItem}
          isSelected={isSelected}
          onSelect={() => setSelectedBlockId(block.id)}
          onUpdate={(data) => updateBlock(block.id, data)}
          onDelete={() => deleteBlock(block.id)}
          onDuplicate={() => duplicateBlock(block.id)}
        >
          {block.children && renderBlocks(block.children, block.id)}
        </BlockComponent>
      );
    });
  };
  
  // Handle palette drag start
  const handlePaletteDragStart = (type: BlockType) => {
    setDraggedType(type);
  };
  
  // Handle workspace drop
  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedType) {
      addBlock(draggedType);
      setDraggedType(null);
    }
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Clear all blocks
  const clearAll = () => {
    if (confirm('Clear all blocks?')) {
      setBlocks([]);
      setSelectedBlockId(null);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row h-full gap-2 sm:gap-4 p-2 sm:p-4">
      {/* Palette Sidebar - collapses to horizontal on mobile */}
      <div className="w-full md:w-64 lg:w-72 bg-rt-card border border-rt-border rounded-2xl p-2 sm:p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto custom-scrollbar shrink-0">
        <h3 className="hidden md:flex text-sm font-bold text-rt-text uppercase tracking-widest mb-2 items-center gap-2">
          <Layers className="w-4 h-4" />
          Blocks
        </h3>
        
        <div className="flex flex-row md:flex-col gap-2 min-w-0">
          {PALETTE_ITEMS.map(item => (
            <button
              key={item.type}
              onClick={() => addBlock(item.type)}
              onTouchStart={() => addBlock(item.type)}
              className="group flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border border-rt-border hover:border-rt-accent transition-all text-left shrink-0 active:scale-[0.97] touch-manipulation"
              draggable
              onDragStart={() => handlePaletteDragStart(item.type)}
            >
              <div 
                className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: item.color }}
              >
                {item.type === 'soundChange' && <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {item.type === 'class' && <Type className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {item.type === 'syllables' && <Music className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {item.type === 'chainShift' && <Layers className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {(item.type === 'rule' || item.type === 'next' || item.type === 'if') && <Settings className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {(item.type === 'deromanizer' || item.type === 'romanizer') && <Type className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {(item.type === 'block' || item.type === 'cleanup' || item.type === 'deferred') && <Layers className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {item.type === 'stress' && <Music className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                {(item.type === 'customSegment' || item.type === 'apply') && <Type className="w-3 h-3 md:w-4 md:h-4 text-white" />}
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <p className="text-[10px] md:text-xs font-bold text-rt-text whitespace-nowrap md:truncate">{item.label}</p>
                <p className="text-[10px] text-rt-muted truncate hidden lg:block">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Workspace */}
      <div className="flex-1 flex flex-col gap-2 sm:gap-4 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-rt-card border border-rt-border rounded-2xl p-2 md:p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rt-muted uppercase tracking-widest">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="px-2 md:px-3 py-1.5 text-xs font-bold text-rt-error hover:bg-rt-error/10 rounded-lg transition-colors"
            >
              <span className="hidden md:inline">Clear All</span>
              <span className="md:hidden">Clear</span>
            </button>
          </div>
        </div>
        
        {/* Block Canvas */}
        <div
          ref={workspaceRef}
          className="flex-1 bg-rt-card border border-rt-border rounded-2xl p-3 md:p-6 overflow-auto custom-scrollbar relative min-h-[200px]"
          onClick={() => setSelectedBlockId(null)}
          onDrop={handleWorkspaceDrop}
          onDragOver={handleDragOver}
        >
          {blocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-rt-muted opacity-50">
              <Layers className="w-8 h-8 md:w-12 md:h-12 mb-2 md:mb-4" />
              <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-center">Tap blocks above to add</p>
              <p className="hidden md:block text-xs mt-2">Click blocks from the sidebar to add them</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {renderBlocks(blocks)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

