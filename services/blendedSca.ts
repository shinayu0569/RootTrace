
import { 
  tokenizeIPA, 
  getEffectiveFeatures, 
  FEATURE_MAP, 
  getPhonemesByFeatures, 
  matchFeatures, 
  getSonority,
  baseRange,
  combiningRange,
  spacingModifierRange,
  toneLetters,
  stressMarks,
  tieBars
} from './phonetics';
import { DistinctiveFeatures } from '../types';

export interface BlendedScaResult {
  original: string;
  final: string;
  history: { rule: string; before: string; after: string }[];
  romanized?: string;
  intermediateRomanizations: Record<string, string>;
}

export interface ScaError {
  line: number;
  message: string;
  type: 'syntax' | 'reference' | 'phonetic';
}

interface RuleOptions {
  name?: string;
  propagate?: boolean;
  direction?: 'ltr' | 'rtl';
  filter?: string;
  firstOnly?: boolean;
  lastOnly?: boolean;
  exclusive?: boolean;
}

class Rule {
  public name: string;
  private stages: { 
    subRules: { match: string; replacement: string; environments: string[]; exceptions: string[]; options: RuleOptions }[]; 
    elseSubRules: { match: string; replacement: string; environments: string[]; exceptions: string[]; options: RuleOptions }[];
    options: RuleOptions;
    condition?: string;
  }[] = [];
  private engine: BlendedScaEngine;

  constructor(name: string, options: RuleOptions, engine: BlendedScaEngine) {
    this.name = name;
    this.engine = engine;
    this.stages.push({ subRules: [], elseSubRules: [], options });
  }

  public addSubRule(match: string, replacement: string, environments: string[] = ['_'], exceptions: string[] = [], isElse: boolean = false, options: RuleOptions = {}) {
    const stage = this.stages[this.stages.length - 1];
    const subRule = { match, replacement, environments, exceptions, options };
    if (isElse) {
      stage.elseSubRules.push(subRule);
    } else {
      stage.subRules.push(subRule);
    }
  }

  public setCondition(condition: string) {
    this.stages[this.stages.length - 1].condition = condition;
  }

  public setExclusive() {
    if (this.stages.length > 0) {
      this.stages[this.stages.length - 1].options.exclusive = true;
    }
  }

  public addStage(options: RuleOptions) {
    this.stages.push({ subRules: [], elseSubRules: [], options });
  }

  public apply(word: string): string {
    let current = word;
    for (const stage of this.stages) {
      if (stage.condition) {
        const { regexStr } = this.buildRegex(stage.condition, '', '', []);
        const regex = new RegExp(regexStr, 'u');
        if (regex.test(current)) {
          current = this.applyStage(current, stage, false);
        } else if (stage.elseSubRules.length > 0) {
          current = this.applyStage(current, stage, true);
        }
      } else {
        current = this.applyStage(current, stage, false);
      }
    }
    return current;
  }

  private applyStage(word: string, stage: { subRules: any[]; elseSubRules: any[]; options: RuleOptions }, useElse: boolean): string {
    let current = word;
    let iterations = 0;
    const maxIterations = 100;
    const subRules = useElse ? stage.elseSubRules : stage.subRules;

    do {
      const before = current;
      
      for (const subRule of subRules) {
        current = this.applySubRule(current, subRule, stage.options);
      }
      
      iterations++;
      if (iterations >= maxIterations) {
        console.warn(`Rule "${this.name}" exceeded maximum iterations (${maxIterations}). Possible infinite loop.`);
        break;
      }
      
      if (!stage.options.propagate) break;
      
      if (current === before) break;
    } while (true);
    
    return current;
  }

  private matchRomanizationTable(target: string, tableStr: string): string | null {
    const rows = tableStr.split(';').map(r => r.trim()).filter(r => r);
    for (const row of rows) {
      const cols = row.split(/\s+/);
      if (cols.length === 2) {
        if (cols[0] === target) return cols[1];
      }
    }
    return null;
  }

  private applyDirectionalSubRule(word: string, subRule: any, options: RuleOptions): string {
    const { match, replacement, environments, exceptions } = subRule;
    const direction = options.direction || 'ltr';
    
    let result = word;
    const chars = Array.from(result);
    const indices = direction === 'ltr' 
      ? chars.map((_, i) => i)
      : chars.map((_, i) => chars.length - 1 - i);

    for (const i of indices) {
      const testStr = result;
      let changed = false;
      
      for (const env of environments) {
        const [beforeEnv, afterEnv] = env.split('_');
        const { regexStr, subscriptMap, featureVars } = this.buildRegex(match, beforeEnv, afterEnv, exceptions);
        const regex = new RegExp(regexStr, 'gu');
        
        let m;
        while ((m = regex.exec(testStr)) !== null) {
          if (m.index === i || (m.index <= i && i < m.index + m[0].length)) {
            const fullMatch = m[0];
            const groups = m.groups;
            const repl = this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
            result = result.slice(0, m.index) + repl + result.slice(m.index + fullMatch.length);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
      if (changed && !options.propagate) break;
    }
    
    return result;
  }

  private applySubRule(word: string, subRule: any, options: RuleOptions): string {
    const { match, replacement, environments, exceptions } = subRule;
    
    if (match.startsWith('Apply:')) {
      const ruleName = match.split(':')[1];
      const deferredRule = this.engine.getDeferredRules()[ruleName];
      return deferredRule ? deferredRule.apply(word) : word;
    }

    let result = word;

    for (const env of environments) {
      const [beforeEnv, afterEnv] = env.split('_');
      
      const { regexStr, subscriptMap, featureVars } = this.buildRegex(match, beforeEnv, afterEnv, exceptions);
      const regex = new RegExp(regexStr, 'gu');
      
      if (options.firstOnly) {
        const m = regex.exec(result);
        if (m) {
          const fullMatch = m[0];
          const groups = m.groups;
          const repl = this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
          result = result.slice(0, m.index) + repl + result.slice(m.index + fullMatch.length);
        }
      } else if (options.lastOnly) {
        let lastMatch: any = null;
        let m;
        while ((m = regex.exec(result)) !== null) {
          lastMatch = m;
        }
        if (lastMatch) {
          const fullMatch = lastMatch[0];
          const groups = lastMatch.groups;
          const repl = this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
          result = result.slice(0, lastMatch.index) + repl + result.slice(lastMatch.index + fullMatch.length);
        }
      } else {
        result = result.replace(regex, (...args) => {
          const fullMatch = args[0];
          const groups = args[args.length - 1];
          return this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
        });
      }
    }
    
    return result;
  }

  private buildRegex(match: string, before: string, after: string, exceptions: string[]): { regexStr: string, subscriptMap: Record<string, string>, featureVars: Record<string, string> } {
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subscriptMap: Record<string, string> = {};
    const featureVars: Record<string, string> = {};
    let captureCount = 0;

    const translatePart = (part: string, isBefore: boolean, isMatch: boolean) => {
      if (!part) return '';
      let res = part;

      const modifiers = `[${combiningRange}${spacingModifierRange}${toneLetters}]`;
      const stress = `[${stressMarks}]`;
      const phonemePattern = `(?:${stress}?[${baseRange}](?:${tieBars}[${baseRange}])*${modifiers}*)`;

      // Handle optionality (a) and quantifiers P(*) BEFORE expanding classes
      // to avoid issues with nested parentheses from engine expansions.
      res = res.replace(/\((?!\*)([^)]+)\)/g, '(?:$1)?');
      res = res.replace(/(\S+)\(\*\)/g, '$1+');

      // Handle dollar-sign capture variables in replacement (not in match)
      // These will be processed in buildReplacement, here we just validate
      if (!isMatch) {
        // $1, $2, etc. are backreferences - keep them as-is for buildReplacement
        // They refer to capture groups created by <...> in the match pattern
      }

      // Handle sets {a,b,c}
      res = res.replace(/\{([^}]+)\}/g, (_, setStr) => {
        const items = setStr.split(',').map((s: string) => s.trim());
        return `(?:${items.map(escapeRegExp).join('|')})`;
      });

      // Handle explicit capture groups <...> for Lexurgy-style $1 $2 backreferences
      res = res.replace(/<([^>]+)>/g, (_, captureContent) => {
        captureCount++;
        const groupName = `cap${captureCount}`;
        // Recursively translate the content inside the capture
        const innerPattern = translatePart(captureContent, isBefore, isMatch);
        return `(?<${groupName}>${innerPattern})`;
      });

      // Expand Elements
      res = res.replace(/@([\w-]+)/g, (full, name) => {
        const el = this.engine.getElements()[name];
        if (el) return `(?:${translatePart(el, isBefore, isMatch)})`;
        return full;
      });

      // Handle subscripts C1, C₁
      res = res.replace(/([A-Z@ᴰ]\w*)([1-9₁-₉])/g, (_, name, sub) => {
        const n = sub.replace(/[₁-₉]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 0x30));
        const key = `${name}${n}`;
        if (subscriptMap[key]) {
          return `\\k<${subscriptMap[key]}>`;
        } else {
          captureCount++;
          const groupName = `sub${captureCount}`;
          subscriptMap[key] = groupName;
          const clsName = name.startsWith('@') ? name.slice(1) : name;
          const cls = this.engine.getClasses()[clsName];
          const pattern = cls ? `(?:${cls.map(escapeRegExp).join('|')})` : escapeRegExp(name);
          return `(?<${groupName}>${pattern})`;
        }
      });

      // Handle feature variables [@place] and [@place +constraint]
      // This captures the phoneme AND applies feature constraints
      res = res.replace(/\[(@\w+)(?:\s+([+-]\w+(?:\s+[!+-]\w+)*))?\]/g, (_, varNameWithAt, featureStr) => {
        const varName = varNameWithAt.slice(1); // Remove @
        captureCount++;
        const groupName = `fvar${captureCount}`;
        featureVars[varName] = groupName;
        
        // If there are feature constraints, apply them
        if (featureStr) {
          const criteria: any = {};
          const negCriteria: any = {};
          featureStr.split(/\s+/).forEach((f: string) => {
            if (f.startsWith('!')) {
              negCriteria[f.slice(1)] = true;
            } else {
              criteria[f.slice(1)] = f.startsWith('+');
            }
          });
          
          // Get phonemes matching criteria
          let matchingPhonemes = getPhonemesByFeatures(criteria);
          
          // Apply negation filters
          if (Object.keys(negCriteria).length > 0) {
            matchingPhonemes = matchingPhonemes.filter(p => {
              for (const [negKey, _] of Object.entries(negCriteria)) {
                if (matchFeatures(p, { [negKey]: true })) return false;
              }
              return true;
            });
          }
          
          if (matchingPhonemes.length > 0) {
            return `(?<${groupName}>(?:${matchingPhonemes.map(escapeRegExp).join('|')}))`;
          }
        }
        
        // No constraints - match any IPA phoneme
        return `(?<${groupName}>${phonemePattern})`;
      });

      // Handle features [+feature] attached to something (e.g. S[+fortis], S1[+fortis])
      // or standalone [+feature]
      // Support negation: [+vowel !front] means +vowel AND NOT +front
      res = res.replace(/(@?\w+|{[^}]+}|\[[^\]]+\])?\[([!+-]\w+(?:\s+[!+-]\w+)*)\]/g, (full, base, featureStr) => {
        const criteria: any = {};
        const negCriteria: any = {};
        featureStr.split(/\s+/).forEach((f: string) => {
          if (f.startsWith('!')) {
            // Negation: !feature means the segment must NOT have this feature
            const key = f.slice(1);
            negCriteria[key] = true;
          } else {
            const val = f.startsWith('+');
            const key = f.slice(1);
            criteria[key] = val;
          }
        });

        if (!base) {
          // Standalone [+feature !other]
          const phonemes = getPhonemesByFeatures(criteria);
          // Filter out those matching negCriteria
          const filtered = phonemes.filter(p => {
            for (const [negKey, _] of Object.entries(negCriteria)) {
              if (matchFeatures(p, { [negKey]: true })) return false;
            }
            return true;
          });
          return `(?:${filtered.map(escapeRegExp).join('|')})`;
        }

        // Attached to something
        const getFilteredPattern = (members: string[]) => {
          let filtered = members.filter(m => matchFeatures(m, criteria));
          // Apply negation filters
          filtered = filtered.filter(m => {
            for (const [negKey, _] of Object.entries(negCriteria)) {
              if (matchFeatures(m, { [negKey]: true })) return false;
            }
            return true;
          });
          return `(?:${filtered.map(escapeRegExp).join('|')})`;
        };

        if (base.startsWith('{')) {
          const items = base.slice(1, -1).split(',').map(s => s.trim());
          return getFilteredPattern(items);
        } else if (base.startsWith('@')) {
          const clsName = base.slice(1);
          const cls = this.engine.getClasses()[clsName];
          return cls ? getFilteredPattern(cls) : full;
        } else {
          // Check if it's a class name
          const cls = this.engine.getClasses()[base];
          if (cls) return getFilteredPattern(cls);
          
          // If it's a single phoneme
          const hasPosFeatures = Object.keys(criteria).length > 0;
          const hasNegFeatures = Object.keys(negCriteria).length > 0;
          const matchesPos = !hasPosFeatures || matchFeatures(base, criteria);
          const matchesNeg = hasNegFeatures && Object.keys(negCriteria).every(k => !matchFeatures(base, { [k]: true }));
          
          if (matchesPos && (!hasNegFeatures || matchesNeg)) {
            return escapeRegExp(base);
          }
          return '(?!)'; // Impossible match
        }
      });

      // Handle wildcards
      res = res.replace(/\bC\b/g, `(?:${this.engine.getClasses()['C'].map(escapeRegExp).join('|')})`);
      res = res.replace(/\bV\b/g, `(?:${this.engine.getClasses()['V'].map(escapeRegExp).join('|')})`);
      res = res.replace(/\bD\b/g, `(?:${this.engine.getClasses()['D'].map(escapeRegExp).join('|')})`);
      res = res.replace(/\bᴰ\b/g, `(?:${this.engine.getClasses()['ᴰ'].map(escapeRegExp).join('|')})`);
      res = res.replace(/\bX\b/g, `(?:${phonemePattern})`);
      
      // Handle user classes @Class
      res = res.replace(/@(\w+)/g, (_, name) => {
        const cls = this.engine.getClasses()[name];
        return cls ? `(?:${cls.map(escapeRegExp).join('|')})` : escapeRegExp(`@${name}`);
      });

      // Handle class exclusion syntax: C-k (C minus k), C-{k,p} (C minus k and p), C-[+voice]
      // This must come AFTER basic class expansion but BEFORE intersection handling
      res = res.replace(/\b([A-Z])-([^\s&|(){}\[\]]+)/g, (full, className, exclusions) => {
        const cls = this.engine.getClasses()[className];
        if (!cls) return full;
        
        // Parse exclusions - can be: single phoneme, {list}, or [features]
        const excludeSet = new Set<string>();
        
        if (exclusions.startsWith('{') && exclusions.endsWith('}')) {
          // Multiple explicit exclusions: C-{k,p}
          const items = exclusions.slice(1, -1).split(/[,\s]+/).filter((s: string) => s);
          items.forEach((item: string) => excludeSet.add(item.trim()));
        } else if (exclusions.startsWith('[') && exclusions.endsWith(']')) {
          // Feature-based exclusion: C-[+voice]
          const featureStr = exclusions.slice(1, -1);
          const criteria: any = {};
          const negCriteria: any = {};
          featureStr.split(/\s+/).forEach((f: string) => {
            if (f.startsWith('!')) {
              negCriteria[f.slice(1)] = true;
            } else if (f.startsWith('+') || f.startsWith('-')) {
              criteria[f.slice(1)] = f.startsWith('+');
            }
          });
          
          // Find all phonemes in the class that match the criteria
          for (const phoneme of cls) {
            let matches = true;
            for (const [key, val] of Object.entries(criteria)) {
              if (!matchFeatures(phoneme, { [key]: val })) {
                matches = false;
                break;
              }
            }
            if (matches) excludeSet.add(phoneme);
          }
        } else {
          // Single explicit exclusion: C-k
          excludeSet.add(exclusions);
        }
        
        // Filter out excluded items
        const filtered = cls.filter((m: string) => !excludeSet.has(m));
        return filtered.length > 0 
          ? `(?:${filtered.map(escapeRegExp).join('|')})` 
          : '(?!)';
      });

      // Handle intersection (&) and negation (!) operators
      // Examples: @C&@V (intersection), C&!V (C minus V), @stop&[+voice]
      res = res.replace(/(\S+)&(!?\S+)/g, (full, left, right) => {
        // Parse left operand
        const getMembers = (operand: string): string[] => {
          // Remove wrapping parens if present
          operand = operand.replace(/^\((.*)\)$/, '$1');
          
          if (operand.startsWith('@')) {
            const clsName = operand.slice(1);
            return this.engine.getClasses()[clsName] || [];
          } else if (operand.startsWith('[') && operand.endsWith(']')) {
            // Feature specification
            const featureStr = operand.slice(1, -1);
            const criteria: any = {};
            const negCriteria: any = {};
            featureStr.split(/\s+/).forEach((f: string) => {
              if (f.startsWith('!')) {
                negCriteria[f.slice(1)] = true;
              } else if (f.startsWith('+') || f.startsWith('-')) {
                criteria[f.slice(1)] = f.startsWith('+');
              }
            });
            let phonemes = getPhonemesByFeatures(criteria);
            if (Object.keys(negCriteria).length > 0) {
              phonemes = phonemes.filter(p => {
                for (const [negKey, _] of Object.entries(negCriteria)) {
                  if (matchFeatures(p, { [negKey]: true })) return false;
                }
                return true;
              });
            }
            return phonemes;
          } else if (/^[A-Z]$/.test(operand)) {
            // Single letter class like C, V
            return this.engine.getClasses()[operand] || [];
          } else {
            // Single phoneme
            return [operand];
          }
        };

        const leftMembers = getMembers(left);
        
        // Right operand - check for negation prefix
        const isNegation = right.startsWith('!');
        const rightOperand = isNegation ? right.slice(1) : right;
        const rightMembers = getMembers(rightOperand);
        
        let result: string[];
        if (isNegation) {
          // Subtraction: left minus right
          const rightSet = new Set(rightMembers);
          result = leftMembers.filter(m => !rightSet.has(m));
        } else {
          // Intersection: left AND right
          const rightSet = new Set(rightMembers);
          result = leftMembers.filter(m => rightSet.has(m));
        }
        
        return result.length > 0 
          ? `(?:${result.map(escapeRegExp).join('|')})` 
          : '(?!)'; // Impossible match if empty
      });

      // Handle spaces as optional separators between segments
      if (isMatch || isBefore || !isMatch) {
        // If the rule has spaces, treat them as optional \s*
        res = res.replace(/\s+/g, '\\s*');
      }

      // Escape literal dots so they match syllable boundaries
      res = res.replace(/\./g, '\\.');

      // Handle boundaries
      if (isBefore) {
        res = res.replace(/##/g, '(?:^|\\s+)');
        res = res.replace(/#/g, '^');
        // $ now matches syllable boundary (the literal . in syllabified words) OR word boundary
        res = res.replace(/\$/g, '(?:\\.|^|\\s)');
        res = res.replace(/\+/g, '(?:\\+)');
        res = res.replace(/σ/g, '(?:[^.]+)');
      } else {
        res = res.replace(/##/g, '(?:$|\\s+)');
        res = res.replace(/#/g, '$');
        // $ now matches syllable boundary (the literal . in syllabified words) OR word boundary
        res = res.replace(/\$/g, '(?:\\.|$|\\s)');
        res = res.replace(/\+/g, '(?:\\+)');
        res = res.replace(/σ/g, '(?:[^.]+)');
      }

      return res;
    };

    const matchPart = translatePart(match, false, true);
    const beforePart = translatePart(before, true, false);
    const afterPart = translatePart(after, false, false);

    // Handle TARGET: prefix - target conditions without underscore
    // Convert TARGET:[+feature] to lookaround that checks the match itself
    let effectiveBeforePart = beforePart;
    let effectiveAfterPart = afterPart;
    
    if (before.startsWith('TARGET:')) {
      const targetCondition = before.slice(7); // Remove TARGET: prefix
      const conditionPattern = translatePart(targetCondition, false, false);
      // Use lookahead to check the matched segment satisfies the condition
      effectiveBeforePart = `(?=${conditionPattern})`;
      effectiveAfterPart = afterPart;
    }

    let regexStr = '';
    if (effectiveBeforePart) regexStr += `(?<=${effectiveBeforePart})`;
    regexStr += matchPart;
    if (effectiveAfterPart) regexStr += `(?=${effectiveAfterPart})`;

    // Handle exceptions
    if (exceptions.length > 0) {
      for (const exc of exceptions) {
        const [excBefore, excAfter] = exc.split('_');
        const excBeforePart = translatePart(excBefore || '', true, false);
        const excAfterPart = translatePart(excAfter || '', false, false);
        
        let negLookbehind = '';
        let negLookahead = '';
        
        if (excBeforePart) negLookbehind = `(?<!${excBeforePart})`;
        if (excAfterPart) negLookahead = `(?!${excAfterPart})`;
        
        regexStr = negLookbehind + regexStr + negLookahead;
      }
    }

    return { regexStr, subscriptMap, featureVars };
  }

  private buildReplacement(replacement: string, fullMatch: string, groups: any, subscriptMap: Record<string, string>, featureVars: Record<string, string>): string {
    let result = replacement;

    // Handle ∅ deletion
    if (result === '∅' || result === '0') return '';

    // Handle dollar-sign backreferences $1, $2, etc. (Lexurgy-style)
    // These reference capture groups created by <...> in the match pattern
    result = result.replace(/\$(\d+)/g, (_, num) => {
      const groupName = `cap${num}`;
      const capturedValue = groups && groups[groupName];
      return capturedValue !== undefined ? capturedValue : `$${num}`;
    });

    // Handle random alternation: a*3 | b*2 | c
    // Format: option1*weight | option2*weight | option3
    if (result.includes('|')) {
      const options: { value: string; weight: number }[] = [];
      const parts = result.split('|').map(p => p.trim());
      
      let totalWeight = 0;
      for (const part of parts) {
        const weightMatch = part.match(/^(.*?)(?:\*(\d+(?:\.\d+)?))?$/);
        if (weightMatch) {
          const value = weightMatch[1].trim();
          const weight = weightMatch[2] ? parseFloat(weightMatch[2]) : 1;
          options.push({ value, weight });
          totalWeight += weight;
        }
      }
      
      if (options.length > 0 && totalWeight > 0) {
        let random = Math.random() * totalWeight;
        for (const opt of options) {
          random -= opt.weight;
          if (random <= 0) {
            result = opt.value;
            break;
          }
        }
      }
    }

    // Handle reduplication
    if (result === '__') return fullMatch + fullMatch;
    if (result.startsWith('__')) {
      const rest = result.slice(2);
      return fullMatch + rest;
    }
    if (result.endsWith('__')) {
      const rest = result.slice(0, -2);
      return rest + fullMatch;
    }

    // Handle subscripts in replacement
    for (const [key, groupName] of Object.entries(subscriptMap)) {
      const val = groups && groups[groupName];
      if (val !== undefined) {
        const re = new RegExp(key.replace(/(\d+)/, (_, n) => `[${n}${String.fromCharCode(0x2080 + parseInt(n) - 1)}]`), 'g');
        result = result.replace(re, val);
      }
    }

    // Handle feature variables in replacement
    for (const [varName, groupName] of Object.entries(featureVars)) {
      const capturedPhoneme = groups && groups[groupName];
      if (capturedPhoneme !== undefined) {
        const featureKeys = this.engine.getFeatureKeysForVar(varName);
        const capturedFeatures = getEffectiveFeatures(capturedPhoneme);
        if (capturedFeatures) {
          // Build replacement pattern
          const pattern = new RegExp(`\\[@${varName}\\]`, 'gi');
          result = result.replace(pattern, (match) => {
            // Apply the captured feature values to the match context
            // This is a simplification; in reality you'd need to parse the surrounding context
            return capturedPhoneme;
          });
        }
      }
    }

    // Handle feature application [+feature] in replacement
    result = result.replace(/\[([+-]\w+(?:\s+[+-]\w+)*)\]/g, (_, featureStr) => {
      const criteria: any = {};
      featureStr.split(/\s+/).forEach((f: string) => {
        const val = f.startsWith('+');
        const key = f.slice(1);
        criteria[key] = val;
      });
      
      const currentFeatures = getEffectiveFeatures(fullMatch);
      if (!currentFeatures) return fullMatch;
      
      const newFeatures = { ...currentFeatures };
      for (const [key, val] of Object.entries(criteria)) {
        (newFeatures as any)[key] = val;
      }
      
      const phonemes = getPhonemesByFeatures(newFeatures);
      return phonemes.length > 0 ? phonemes[0] : fullMatch;
    });

    return result;
  }
}

export class BlendedScaEngine {
  private classes: Record<string, string[]> = {
    C: [], V: [], D: [], ᴰ: []
  };
  private elements: Record<string, string> = {};
  private syllables: string[] = [];
  private rules: Rule[] = [];
  private deromanizer: Rule | null = null;
  private romanizer: Rule | null = null;
  private intermediateRomanizers: Record<string, Rule> = {};
  private deferredRules: Record<string, Rule> = {};
  private cleanupRules: Rule[] = [];
  private activeCleanupRules: string[] = [];
  
  // Stress configuration
  private stressPattern: 'initial' | 'final' | 'penultimate' | 'antepenult' | 'trochaic' | 'iambic' | 'dactylic' | 'anapestic' | 'mobile' | 'custom' | null = null;
  private stressAutoFix: boolean = false;
  private heavySyllablePattern: string = 'VC';
  private stressEnforceSafety: boolean = true;
  private customStressPosition: string = '';

  constructor() {
    this.initializeDefaultClasses();
  }

  public getClasses() { return this.classes; }
  public getElements() { return this.elements; }
  public getDeferredRules() { return this.deferredRules; }

  private initializeDefaultClasses() {
    const allConsonants: string[] = [];
    const allVowels: string[] = [];
    const allDiacritics: string[] = [];

    for (const [symbol, features] of Object.entries(FEATURE_MAP)) {
      if (features.syllabic) {
        allVowels.push(symbol);
      } else {
        allConsonants.push(symbol);
      }
    }

    for (let i = 0x0300; i <= 0x036F; i++) {
      allDiacritics.push(String.fromCharCode(i));
    }

    const allBaseLetters = [...allConsonants, ...allVowels];

    this.classes['C'] = allConsonants;
    this.classes['V'] = allVowels;
    this.classes['D'] = allBaseLetters;
    this.classes['ᴰ'] = allDiacritics;
  }

  public validate(script: string): ScaError[] {
    const errors: ScaError[] = [];
    const lines = script.split('\n').map(l => l.trim());
    
    const definedClasses = new Set<string>();
    const definedElements = new Set<string>();
    const definedRules = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('//') || line.startsWith(';')) continue;

      let matched = false;

      // Class definition
      if (line.startsWith('Class ')) {
        const match = line.match(/Class\s+(\w+)/);
        if (match) {
          definedClasses.add(match[1]);
        } else {
          errors.push({ line: i + 1, message: `Invalid Class declaration. Expected: Class Name {members} or Class Name [+features].`, type: 'syntax' });
        }
        matched = true;
        continue;
      }

      // Element definition
      if (line.startsWith('Element ')) {
        const match = line.match(/Element\s+([\w-]+)/);
        if (match) {
          definedElements.add(match[1]);
        } else {
          errors.push({ line: i + 1, message: `Invalid Element declaration. Expected: Element name pattern.`, type: 'syntax' });
        }
        matched = true;
        continue;
      }

      // Deromanizer / Romanizer
      if (line.match(/^(Deromanizer|Romanizer|Romanizer-[\w-]+):/)) {
        matched = true;
        continue;
      }

      // Deferred / Cleanup
      if (line.match(/^(Deferred|Cleanup):/)) {
        matched = true;
        continue;
      }

      // Rule name declaration
      const nameMatch = line.match(/^([\w-]+)(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);
      if (nameMatch && !line.includes('>')) {
        definedRules.add(nameMatch[1]);
        matched = true;
        continue;
      }

      // IF / THEN
      if (line.startsWith('IF ')) {
        if (!line.match(/IF\s+(.+)\s+THEN\s+(.+)(?:\s+ELSE\s+(.+))?/)) {
          errors.push({ line: i + 1, message: `Invalid IF/THEN statement. Expected: IF condition THEN rule [ELSE rule].`, type: 'syntax' });
        }
        matched = true;
        continue;
      }

      // Then block
      if (line.startsWith('Then')) {
        if (!line.match(/^Then(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/)) {
          errors.push({ line: i + 1, message: `Invalid Then block. Expected: Then [filter] [propagate|ltr|rtl]:`, type: 'syntax' });
        }
        matched = true;
        continue;
      }

      // Apply
      if (line.startsWith('Apply:')) {
        const ruleName = line.split(':')[1]?.trim();
        if (!ruleName) {
          errors.push({ line: i + 1, message: `Invalid Apply statement. Expected: Apply: rule-name`, type: 'syntax' });
        } else if (!definedRules.has(ruleName)) {
          errors.push({ line: i + 1, message: `Reference error: Rule '${ruleName}' is applied but never defined.`, type: 'reference' });
        }
        matched = true;
        continue;
      }

      // Syllables
      if (line.toLowerCase().startsWith('syllables:')) {
        matched = true;
        continue;
      }

      // Sound change rule (contains arrow)
      const arrowRegex = /(?:=>|->|→|>)/;
      if (arrowRegex.test(line)) {
        matched = true;
        const parts = line.split(arrowRegex);
        if (parts.length < 2 || !parts[1].trim()) {
          errors.push({ line: i + 1, message: `Invalid rule format. Missing replacement after arrow.`, type: 'syntax' });
          continue;
        }
        
        const target = parts[0].trim();
        if (!target) {
          errors.push({ line: i + 1, message: `Invalid rule format. Missing target before arrow.`, type: 'syntax' });
        }

        // Check for undefined classes/elements in target and replacement
        // Exclude feature variables like [@place] - only match @ClassName not inside []
        const classMatches = line.match(/(?<!\[)@(\w+)/g);
        if (classMatches) {
          classMatches.forEach(m => {
            const name = m.slice(1);
            if (!definedClasses.has(name) && !definedElements.has(name)) {
              errors.push({ line: i + 1, message: `Reference error: Class or Element '${name}' is used but never defined.`, type: 'reference' });
            }
          });
        }
        
        // Check for phonetic impossibilities in rules
        const featureMatches = line.match(/\[([+-]\w+(?:\s+[+-]\w+)*)\]/g);
        if (featureMatches) {
          featureMatches.forEach(fm => {
            if (fm.includes('+high') && fm.includes('+low')) {
              errors.push({ line: i + 1, message: `Phonetic impossibility: [+high] and [+low] cannot co-occur.`, type: 'phonetic' });
            }
            if (fm.includes('+front') && fm.includes('+back')) {
              errors.push({ line: i + 1, message: `Phonetic impossibility: [+front] and [+back] cannot co-occur.`, type: 'phonetic' });
            }
          });
        }
        
        continue;
      }

      if (!matched) {
        errors.push({ line: i + 1, message: `Unrecognized syntax or invalid statement.`, type: 'syntax' });
      }
    }
    
    return errors;
  }

  public getFeatureKeysForVar(varName: string): string[] {
    switch (varName.toLowerCase()) {
      case 'place': return ['labial', 'coronal', 'dorsal', 'pharyngeal', 'laryngeal', 'alveolar', 'palatal', 'velar', 'uvular', 'glottal', 'retroflex'];
      case 'height': return ['high', 'mid', 'low'];
      case 'backness': return ['front', 'central', 'back'];
      case 'voicing': return ['voice'];
      case 'nasality': return ['nasal'];
      case 'manner': return ['continuant', 'nasal', 'strident', 'lateral', 'delayedRelease'];
      case 'secondary': return ['labialized', 'palatalized', 'velarized', 'pharyngealized'];
      default: return [varName];
    }
  }

  /**
   * Feature 5.5: Chain Shift Shorthand
   * Parses chain shift syntax (>>) and expands into ordered Then: stages
   * 
   * Example:
   *   chain(drag) great-vowel-shift:
   *     iː >> əɪ >> aɪ
   *     eː >> iː
   *     aː >> eɪ
   * 
   * For drag-chain (default): Changes apply from pushed end first
   *   Stage 1: aː > eɪ, eː > iː, iː > əɪ
   *   Stage 2: əɪ > aɪ (only applies to newly created əɪ)
   * 
   * For push-chain: Changes apply from initiator first
   *   Stage 1: iː > əɪ
   *   Stage 2: əɪ > aɪ, eː > iː
   */
  private parseChainShift(
    name: string, 
    chainLines: string[], 
    chainType: 'drag' | 'push',
    mode: string
  ) {
    // Parse each chain line into a sequence of sound changes
    type ChainStep = { source: string; target: string; envs: string[]; excs: string[] };
    const chains: ChainStep[][] = [];

    for (const line of chainLines) {
      // Split by >> to get the chain sequence
      const parts = line.split(/\s*>>\s*/).map(p => p.trim()).filter(p => p);
      if (parts.length < 2) continue;

      // Check for environments/exceptions
      let envs: string[] = ['_'];
      let excs: string[] = [];
      
      // Check if last part has environment
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('/')) {
        const envIdx = lastPart.indexOf('/');
        const envStr = lastPart.slice(envIdx + 1).trim();
        parts[parts.length - 1] = lastPart.slice(0, envIdx).trim();
        
        if (envStr.includes('!')) {
          const split = envStr.split('!');
          envs = split[0].trim() ? split[0].trim().split('|').map(e => e.trim()).filter(e => e) : ['_'];
          excs = split.slice(1).map(e => e.trim()).filter(e => e);
        } else {
          envs = envStr.split('|').map(e => e.trim()).filter(e => e);
        }
      }

      // Create chain steps
      const chain: ChainStep[] = [];
      for (let i = 0; i < parts.length - 1; i++) {
        chain.push({
          source: parts[i],
          target: parts[i + 1],
          envs: [...envs],
          excs: [...excs]
        });
      }
      chains.push(chain);
    }

    if (chains.length === 0) return;

    // Determine the number of stages needed
    const maxStages = Math.max(...chains.map(c => c.length));

    // Create the main rule
    const ruleOpts: RuleOptions = { name };

    const mainRule = new Rule(name, ruleOpts, this);

    // For drag-chain: reverse the order (start from the end of each chain)
    // For push-chain: keep normal order
    const orderedChains = chainType === 'drag' 
      ? chains.map(c => [...c].reverse()) 
      : chains;

    // Add stages - each stage handles one step in the chain
    // For drag-chain: apply changes in reverse order (from destination backward)
    // For push-chain: apply changes in forward order (from initiator forward)
    for (let stage = 0; stage < maxStages; stage++) {
      // Collect all changes for this stage across all chains
      const stageChanges: ChainStep[] = [];
      
      for (const chain of orderedChains) {
        if (stage < chain.length) {
          stageChanges.push(chain[stage]);
        }
      }

      if (stageChanges.length > 0) {
        // For drag-chain, ensure this stage only applies to forms that were created in previous stages
        // This is handled by the natural progression of Then: stages - each stage sees the output of previous stages
        const stageOpts = chainType === 'drag' && stage > 0 
          ? { propagate: true } // Ensure changes propagate through newly created forms
          : {};
        
        // Add a stage for this step
        mainRule.addStage(stageOpts);
        
        // Add sub-rules for this stage
        for (const change of stageChanges) {
          mainRule.addSubRule(change.source, change.target, change.envs, change.excs, false, {});
        }
      }
    }

    // Add the rule to the appropriate list
    if (mode === 'deferred') {
      this.deferredRules[name] = mainRule;
    } else if (mode === 'cleanup') {
      this.cleanupRules.push(mainRule);
    } else {
      this.rules.push(mainRule);
    }
  }

  public parse(script: string) {
    const lines = script.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith(';'));
    
    let currentRule: Rule | null = null;
    let mode: 'rules' | 'deromanizer' | 'romanizer' | 'deferred' | 'cleanup' = 'rules';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Handle IF/THEN/ELSE
      if (line.startsWith('IF ')) {
        const match = line.match(/IF\s+(.+?)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+))?$/);
        if (match) {
          const condition = match[1].trim();
          const thenPart = match[2].trim();
          const elsePart = match[3] ? match[3].trim() : null;

          const r = new Rule('conditional', {}, this);
          r.setCondition(condition);
          
          this.parseSubRuleLine(r, thenPart, false);
          if (elsePart) {
            if (elsePart.startsWith('IF ')) {
              this.rules.push(r);
              lines.splice(i + 1, 0, elsePart);
              continue;
            } else {
              this.parseSubRuleLine(r, elsePart, true);
            }
          }
          this.rules.push(r);
        }
        continue;
      }

      if (line.startsWith('Class ')) {
        const match = line.match(/Class\s+(\w+)\s+(?:\{([^}]+)\}|\[([^\]]+)\])/);
        if (match) {
          const name = match[1];
          if (match[2]) {
            const vals = match[2].split(',').map(s => s.trim());
            this.classes[name] = vals;
          } else if (match[3]) {
            const featureStr = match[3];
            const criteria: any = {};
            featureStr.split(/\s+/).forEach((f: string) => {
              const val = f.startsWith('+');
              const key = f.slice(1);
              criteria[key] = val;
            });
            this.classes[name] = getPhonemesByFeatures(criteria);
          }
        }
        continue;
      }

      if (line.startsWith('Element ')) {
        const match = line.match(/Element\s+([\w-]+)\s+(.+)/);
        if (match) {
          const name = match[1];
          const pattern = match[2].trim();
          this.elements[name] = pattern;
        }
        continue;
      }

      if (line.toLowerCase().startsWith('syllables:')) {
        const pattern = line.split(':')[1].trim();
        this.syllables = pattern.split(/\s+/).filter(p => p);
        continue;
      }

      if (line.toLowerCase().startsWith('stress:')) {
        const stressMatch = line.match(/^Stress:\s*(\w+)(?:\s+auto-fix)?(?:\s+heavy:(\S+))?(?:\s+pos:(\S+))?/i);
        if (stressMatch) {
          this.stressPattern = stressMatch[1].toLowerCase() as any;
          this.stressAutoFix = line.toLowerCase().includes('auto-fix');
          this.heavySyllablePattern = stressMatch[2] || 'VC';
          this.customStressPosition = stressMatch[3] || '';
        }
        continue;
      }

      if (line.startsWith('Deromanizer')) {
        // Check for 'literal' modifier
        const isLiteral = line.includes('literal');
        this.deromanizer = new Rule('Deromanizer', {}, this);
        (this.deromanizer as any).literal = isLiteral;
        currentRule = this.deromanizer;
        mode = 'deromanizer';
        continue;
      }

      if (line.startsWith('Romanizer')) {
        // Check for 'literal' modifier
        const isLiteral = line.includes('literal');
        if (line.startsWith('Romanizer-')) {
          const match = line.match(/Romanizer-([\w-]+):/);
          if (match) {
            const name = match[1];
            const r = new Rule(`Romanizer-${name}`, {}, this);
            (r as any).literal = isLiteral;
            this.intermediateRomanizers[name] = r;
            currentRule = r;
            mode = 'romanizer';
          }
        } else {
          this.romanizer = new Rule('Romanizer', {}, this);
          (this.romanizer as any).literal = isLiteral;
          currentRule = this.romanizer;
          mode = 'romanizer';
        }
        continue;
      }

      if (line.startsWith('Deferred:')) {
        mode = 'deferred';
        currentRule = null;
        continue;
      }

      if (line.startsWith('Cleanup:')) {
        // Check for off toggle: "Cleanup name: off" or "Cleanup: off"
        const offMatch = line.match(/Cleanup(?:\s+(\w+))?:\s*off/i);
        if (offMatch) {
          const ruleName = offMatch[1];
          if (ruleName) {
            // Deactivate specific cleanup rule
            this.activeCleanupRules = this.activeCleanupRules.filter(n => n !== ruleName);
          } else {
            // Deactivate all cleanup rules
            this.activeCleanupRules = [];
          }
          mode = 'rules'; // Reset mode
          currentRule = null;
        } else {
          mode = 'cleanup';
        }
        continue;
      }

      if (line.match(/^[\w-]+(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/)) {
        const match = line.match(/^([\w-]+)(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);
        if (match) {
          const name = match[1];
          const filter = match[2] || undefined;
          const directive = match[3] as 'propagate' | 'ltr' | 'rtl' | undefined;
          
          const opts: RuleOptions = { name };
          if (directive === 'propagate') opts.propagate = true;
          if (directive === 'ltr' || directive === 'rtl') opts.direction = directive;
          if (filter) opts.filter = filter;

          const r = new Rule(name, opts, this);
          
          if (mode === 'deferred') {
            this.deferredRules[name] = r;
          } else if (mode === 'cleanup') {
            this.cleanupRules.push(r);
          } else {
            this.rules.push(r);
          }
          currentRule = r;
        }
        continue;
      }

      if (line.startsWith('Then')) {
        if (currentRule) {
          const match = line.match(/^Then(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);
          if (match) {
            const filter = match[1] || undefined;
            const directive = match[2] as 'propagate' | 'ltr' | 'rtl' | undefined;
            
            const opts: RuleOptions = {};
            if (directive === 'propagate') opts.propagate = true;
            if (directive === 'ltr' || directive === 'rtl') opts.direction = directive;
            if (filter) opts.filter = filter;

            currentRule.addStage(opts);
          }
        }
        continue;
      }

      if (line.startsWith('Apply:')) {
        const ruleName = line.split(':')[1].trim();
        if (currentRule && mode !== 'deferred') {
          this.activeCleanupRules.push(ruleName);
        }
        continue;
      }

      /**
       * Feature 5.5: Chain Shift Shorthand
       * Parse chain blocks: chain [name]: ... end
       * Supports >> chaining syntax: iː >> əɪ >> aɪ
       */
      const chainMatch = line.match(/^chain(?:\s*\((\w+)\))?\s*([\w-]+)?:/);
      if (chainMatch) {
        const chainType = (chainMatch[1] || 'drag') as 'drag' | 'push';
        const chainName = chainMatch[2] || 'chain-shift';
        
        // Collect all lines until we hit a terminator (blank line, end, or new section)
        const chainLines: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const chainLine = lines[j].trim();
          if (chainLine === '' || chainLine === 'end' || chainLine.startsWith('chain') || 
              chainLine.startsWith('rule ') || chainLine.startsWith('Class:') ||
              chainLine.startsWith('Syllables:') || chainLine.startsWith('Deromanizer:') ||
              chainLine.startsWith('Romanizer:')) {
            break;
          }
          if (chainLine.includes('>>')) {
            chainLines.push(chainLine);
          }
          j++;
        }
        
        // Parse chain shifts and expand into Then: stages
        if (chainLines.length > 0) {
          this.parseChainShift(chainName, chainLines, chainType, mode);
        }
        
        i = j - 1; // Skip processed lines
        continue;
      }

      // Handle block syntax: [block] ... [end]
      if (line === '[block]') {
        // Collect all lines until [end]
        const blockLines: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const blockLine = lines[j].trim();
          if (blockLine === '[end]') break;
          if (blockLine && !blockLine.startsWith('//') && !blockLine.startsWith(';')) {
            blockLines.push(blockLine);
          }
          j++;
        }
        
        // Create a rule with propagate mode for the block
        if (blockLines.length > 0) {
          const blockRule = new Rule('block', { propagate: true }, this);
          for (const blockLine of blockLines) {
            this.parseSubRuleLine(blockRule, blockLine, false);
          }
          this.rules.push(blockRule);
        }
        
        i = j; // Skip to [end] line
        continue;
      }

      // Handle "except" for exception lists: rule except word1 word2
      const exceptMatch = line.match(/(.+)\s+except\s+(.+)/i);
      if (exceptMatch && line.includes('>')) {
        const rulePart = exceptMatch[1].trim();
        const exceptionWords = exceptMatch[2].trim().split(/\s+/);
        
        // Parse the rule part normally but add exception words
        // We'll store exceptions in a way the rule can access
        const r = currentRule || new Rule('unnamed', {}, this);
        (r as any).exceptionWords = exceptionWords;
        
        if (!currentRule) {
          this.parseSubRuleLine(r, rulePart, false);
          this.rules.push(r);
        } else {
          this.parseSubRuleLine(r, rulePart, false);
        }
        continue;
      }

      // Handle custom segment definitions: feat: x = +f1 -f2
      const featMatch = line.match(/^feat:\s*(\S+)\s*=\s*(.+)/i);
      if (featMatch) {
        const symbol = featMatch[1];
        const featureSpec = featMatch[2].trim();
        
        // Parse feature specification
        const criteria: any = {};
        featureSpec.split(/\s+/).forEach((f: string) => {
          if (f.startsWith('+') || f.startsWith('-')) {
            criteria[f.slice(1)] = f.startsWith('+');
          }
        });
        
        // If it's a digraph (multi-character), we need to add it to FEATURE_MAP
        // For now, add it as a custom class entry
        if (symbol.length > 1) {
          // It's a digraph - add to a special digraphs class
          if (!this.classes['digraphs']) {
            this.classes['digraphs'] = [];
          }
          this.classes['digraphs'].push(symbol);
          
          // Store features for the digraph
          (this as any).customFeatures = (this as any).customFeatures || {};
          (this as any).customFeatures[symbol] = criteria;
        } else {
          // Single character - add as alias to existing or custom
          // For now, add to custom class
          if (!this.classes['custom']) {
            this.classes['custom'] = [];
          }
          this.classes['custom'].push(symbol);
          (this as any).customFeatures = (this as any).customFeatures || {};
          (this as any).customFeatures[symbol] = criteria;
        }
        continue;
      }

      if (line.includes('>') || line.includes('=>') || line.includes('->') || line.includes('→')) {
        if (currentRule) {
          this.parseSubRuleLine(currentRule, line, false);
        } else if (mode === 'rules') {
          const r = new Rule('unnamed', {}, this);
          this.parseSubRuleLine(r, line, false);
          this.rules.push(r);
        }
      }
    }
  }

  private parseSubRuleLine(rule: Rule, line: string, isElse: boolean) {
    const arrows = ['=>', '->', '→', '>'];
    let arrow = '';
    for (const a of arrows) {
      if (line.includes(a)) {
        arrow = a;
        break;
      }
    }
    if (!arrow) return;

    const parts = line.split(arrow);
    if (parts.length < 2) return;

    let target = parts[0].trim();
    let replacement = parts[1].trim();
    
    // Handle <<first>> and >>last<<
    let firstOnly = false;
    let lastOnly = false;
    if (target.startsWith('<<') && target.endsWith('>>')) {
      target = target.slice(2, -2).trim();
      firstOnly = true;
    } else if (target.startsWith('>>') && target.endsWith('<<')) {
      target = target.slice(2, -2).trim();
      lastOnly = true;
    }

    let envs: string[] = ['_'];
    let excs: string[] = [];

    if (replacement.includes('/')) {
      const envParts = replacement.split('/');
      replacement = envParts[0].trim();
      const envStr = envParts[1].trim();
      
      // Handle target conditions: env without _ means target feature check
      // e.g., V > [+nasal] / [+stress]  (nasalize stressed vowels)
      // vs  V > [+nasal] / _[+nasal] (nasalize vowel before nasal)
      
      if (envStr.includes('!')) {
        // Handle negation: split on ! for exceptions
        const splitEnvs = envStr.split('!');
        const envPart = splitEnvs[0].trim();
        if (envPart) {
          // Split on comma for multiple environments
          envs = envPart.split(/,|\|/).map(e => e.trim()).filter(e => e);
        } else {
          envs = ['_'];
        }
        excs = splitEnvs.slice(1).map(e => e.trim()).filter(e => e);
      } else {
        // Split on comma or | for multiple environments
        envs = envStr.split(/,|\|/).map(e => e.trim()).filter(e => e);
      }
      
      // Convert target conditions (no _) to proper format
      // A target condition like [+stress] becomes _ with a lookahead/lookbehind
      envs = envs.map(env => {
        if (!env.includes('_')) {
          // Target condition - wrap in special marker for buildRegex to handle
          return `TARGET:${env}`;
        }
        return env;
      });
    }

    // Strip comments in parentheses from environments and exceptions
    // e.g. "C_# (only sometimes?)" -> "C_#"
    envs = envs.map(e => e.replace(/\s*\([^)]*\)/g, '').trim());
    excs = excs.map(e => e.replace(/\s*\([^)]*\)/g, '').trim());

    // Handle Parallel Mapping: C {p t k} > {b d g}
    const targetSetMatch = target.match(/\{([^}]+)\}/);
    const replacementSetMatch = replacement.match(/\{([^}]+)\}/);

    if (targetSetMatch && replacementSetMatch) {
      const targetVals = targetSetMatch[1].split(/\s+/).filter(v => v);
      const replacementVals = replacementSetMatch[1].split(/\s+/).filter(v => v);
      
      if (targetVals.length === replacementVals.length) {
        for (let i = 0; i < targetVals.length; i++) {
          const subTarget = target.replace(targetSetMatch[0], targetVals[i]);
          const subReplacement = replacement.replace(replacementSetMatch[0], replacementVals[i]);
          rule.addSubRule(subTarget, subReplacement, envs, excs, isElse, { firstOnly, lastOnly });
        }
        return;
      }
    }

    rule.addSubRule(target, replacement, envs, excs, isElse, { firstOnly, lastOnly });
  }

  public apply(words: string[]): BlendedScaResult[] {
    return words.map(word => this.applyToWord(word));
  }

  private syllabify(word: string): string {
    const phonemes = tokenizeIPA(word);
    if (phonemes.length === 0) return word;

    // Identify nucleus, onset, coda classes from the Syllables declaration
    let nucleusClasses: string[] = [];
    let onsetClasses: string[] = [];
    let codaClasses: string[] = [];

    if (this.syllables.length > 0) {
      let currentSection: 'onset' | 'nucleus' | 'coda' = 'onset';
      for (const part of this.syllables) {
        if (part === '::') {
          if (currentSection === 'onset') currentSection = 'nucleus';
          else if (currentSection === 'nucleus') currentSection = 'coda';
          continue;
        }
        const className = part.replace(/[@?*+]/g, '');
        if (className) {
          if (currentSection === 'onset') onsetClasses.push(className);
          else if (currentSection === 'nucleus') nucleusClasses.push(className);
          else codaClasses.push(className);
        }
      }

      // If no :: was used, assume the middle part is nucleus if it's the only one or if it's marked
      if (nucleusClasses.length === 0) {
        for (const part of this.syllables) {
          const name = part.replace(/[@?*+]/g, '');
          if (name === 'V' || name.toLowerCase().includes('nucleus')) {
            nucleusClasses.push(name);
          }
        }
      }
    } else {
      // Default: V is nucleus
      nucleusClasses = ['V'];
    }

    const isNucleus = (p: string) => {
      for (const cls of nucleusClasses) {
        const members = this.classes[cls];
        if (members && members.includes(p)) return true;
      }
      const f = getEffectiveFeatures(p);
      return f ? f.syllabic : false;
    };

    const getSonorityValue = (p: string) => {
      // Check if it belongs to a specific class that might override sonority
      // (Simplified: just use the default IPA sonority)
      return getSonority(p);
    };

    const vowelIndices = phonemes.map((p, i) => isNucleus(p) ? i : -1).filter(i => i !== -1);
    if (vowelIndices.length <= 1) return word;

    const syllableBreaks: number[] = [];

    for (let v = 0; v < vowelIndices.length - 1; v++) {
      const start = vowelIndices[v];
      const end = vowelIndices[v + 1];
      const consonants = phonemes.slice(start + 1, end);
      
      if (consonants.length === 0) continue;
      
      let onsetStart = 0; 
      for (let i = consonants.length - 1; i > 0; i--) {
        const currentSon = getSonorityValue(consonants[i]);
        const prevSon = getSonorityValue(consonants[i - 1]);
        
        if (prevSon >= currentSon) {
          onsetStart = i;
          break;
        }
      }
      syllableBreaks.push(start + 1 + onsetStart);
    }

    let result = '';
    let lastBreak = 0;
    syllableBreaks.sort((a, b) => a - b);
    for (const b of syllableBreaks) {
      result += phonemes.slice(lastBreak, b).join('') + '.';
      lastBreak = b;
    }
    result += phonemes.slice(lastBreak).join('');

    return result;
  }

  /**
   * Check if a syllable is "heavy" based on the user-defined pattern
   * Default: VC (long vowel or closed syllable)
   */
  private isHeavySyllable(syllable: string): boolean {
    const phonemes = tokenizeIPA(syllable);
    const pattern = this.heavySyllablePattern;
    
    // V = vowel/diphthong, C = consonant
    let syllablePattern = '';
    for (const p of phonemes) {
      const f = getEffectiveFeatures(p);
      if (f?.syllabic) {
        syllablePattern += 'V';
      } else {
        syllablePattern += 'C';
      }
    }
    
    // Check if syllable matches heavy pattern
    // Simple pattern matching: VC means any syllable with V followed by C (closed)
    // VV means long vowel/diphthong
    if (pattern === 'VC') {
      return syllablePattern.includes('VC');
    } else if (pattern === 'VV') {
      return /VV/.test(syllablePattern);
    } else if (pattern === 'VVC' || pattern === 'VVCC') {
      return /VV/.test(syllablePattern);
    }
    
    return false;
  }

  /**
   * Assign stress to syllables based on the configured pattern
   */
  private assignStress(syllabifiedWord: string): string {
    if (!this.stressPattern) return syllabifiedWord;
    
    const syllables = syllabifiedWord.split('.');
    if (syllables.length === 0) return syllabifiedWord;
    
    let stressIndex: number = -1;
    
    switch (this.stressPattern) {
      case 'initial':
        stressIndex = 0;
        break;
      case 'final':
        stressIndex = syllables.length - 1;
        break;
      case 'penultimate':
        stressIndex = Math.max(0, syllables.length - 2);
        break;
      case 'antepenult':
        stressIndex = Math.max(0, syllables.length - 3);
        break;
      case 'trochaic': // Strong-weak from left
        return syllables.map((s, i) => i % 2 === 0 ? `ˈ${s}` : s).join('.');
      case 'iambic': // Weak-strong from left
        return syllables.map((s, i) => i % 2 === 1 ? `ˈ${s}` : s).join('.');
      case 'dactylic': // Strong-weak-weak from left
        return syllables.map((s, i) => i % 3 === 0 ? `ˈ${s}` : s).join('.');
      case 'anapestic': // Weak-weak-strong from left
        return syllables.map((s, i) => i % 3 === 2 ? `ˈ${s}` : s).join('.');
      case 'mobile':
        // Stress moves to the rightmost heavy syllable, defaulting to initial
        stressIndex = 0;
        for (let i = syllables.length - 1; i >= 0; i--) {
          if (this.isHeavySyllable(syllables[i])) {
            stressIndex = i;
            break;
          }
        }
        break;
      case 'custom':
        // Parse custom position: can be absolute (0,1,2) or negative (-1,-2)
        const pos = parseInt(this.customStressPosition, 10);
        if (!isNaN(pos)) {
          if (pos >= 0) {
            stressIndex = Math.min(pos, syllables.length - 1);
          } else {
            stressIndex = Math.max(0, syllables.length + pos);
          }
        }
        break;
    }
    
    if (stressIndex >= 0 && stressIndex < syllables.length) {
      syllables[stressIndex] = `ˈ${syllables[stressIndex]}`;
    }
    
    return syllables.join('.');
  }

  /**
   * Fix stress placement after sound changes if auto-fix is enabled
   */
  private fixStress(word: string): string {
    if (!this.stressAutoFix && !this.stressEnforceSafety) return word;
    
    // Remove existing stress marks
    const unstressed = word.replace(/[ˈˌ]/g, '');
    
    // Re-syllabify and re-assign stress
    const syllabified = this.syllabify(unstressed);
    return this.assignStress(syllabified);
  }

  private applyToWord(word: string): BlendedScaResult {
    const history: { rule: string; before: string; after: string }[] = [];
    const intermediateRomanizations: Record<string, string> = {};

    let current = word;

    if (this.deromanizer) {
      const next = this.deromanizer.apply(current);
      if (next !== current) {
        history.push({ rule: 'Deromanizer', before: current, after: next });
        current = next;
      }
    }

    // Handle phrases by processing each word separately for syllabification
    // but applying rules to the whole phrase to support ##
    const words = current.split(/\s+/);
    current = words.map(w => {
      const syllabified = this.syllabify(w);
      // Assign stress if pattern is configured
      return this.stressPattern ? this.assignStress(syllabified) : syllabified;
    }).join(' ');

    for (const rule of this.rules) {
      // Check if rule has exception words and skip if current word matches
      const exceptionWords = (rule as any).exceptionWords;
      if (exceptionWords && exceptionWords.length > 0) {
        // Normalize current word for comparison (remove syllable markers and stress)
        const normalizedWord = current.replace(/[.ˈˌ]/g, '');
        const isException = exceptionWords.some((ew: string) => 
          normalizedWord === ew || current.includes(ew)
        );
        if (isException) {
          continue; // Skip this rule for exception words
        }
      }
      
      const before = current;
      current = rule.apply(current);
      
      // Fix stress if auto-fix is enabled and word changed
      if (current !== before && this.stressAutoFix && this.stressPattern) {
        current = this.fixStress(current);
      }
      
      if (current !== before) {
        history.push({ rule: rule.name || 'unnamed', before, after: current });
      }

      for (const cleanupName of this.activeCleanupRules) {
        const cleanupRule = this.cleanupRules.find(r => r.name === cleanupName);
        if (cleanupRule) {
          const cBefore = current;
          current = cleanupRule.apply(current);
          if (current !== cBefore) {
            history.push({ rule: `Cleanup: ${cleanupName}`, before: cBefore, after: current });
          }
        }
      }

      for (const [name, romanizer] of Object.entries(this.intermediateRomanizers)) {
        intermediateRomanizations[name] = romanizer.apply(current);
      }
    }

    let romanized = current;
    if (this.romanizer) {
      romanized = this.romanizer.apply(current);
    }

    return {
      original: word,
      final: current.replace(/\./g, ''), // Remove syllable markers
      history,
      romanized,
      intermediateRomanizations
    };
  }
}
