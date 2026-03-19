
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

interface RuleOptions {
  name?: string;
  propagate?: boolean;
  direction?: 'ltr' | 'rtl';
  filter?: string;
  firstOnly?: boolean;
  lastOnly?: boolean;
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
      if (stage.options.direction === 'ltr') {
        current = this.applyLtr(current, subRules, stage.options);
      } else if (stage.options.direction === 'rtl') {
        current = this.applyRtl(current, subRules, stage.options);
      } else {
        current = this.applySimultaneous(current, subRules, stage.options);
      }

      if (current === before) break;
      iterations++;
    } while (stage.options.propagate && iterations < maxIterations);

    return current;
  }

  private applySimultaneous(word: string, subRules: any[], stageOptions: RuleOptions): string {
    let current = word;
    for (const subRule of subRules) {
      const options = { ...stageOptions, ...subRule.options };
      current = this.applySubRule(current, subRule, options);
    }
    return current;
  }

  private applyLtr(word: string, subRules: any[], stageOptions: RuleOptions): string {
    let current = word;
    let pos = 0;
    
    while (pos < current.length) {
      let matched = false;
      for (const subRule of subRules) {
        const options = { ...stageOptions, ...subRule.options };
        const { match, replacement, environments, exceptions } = subRule;
        
        for (const env of environments) {
          const [beforeEnv, afterEnv] = env.split('_');
          const { regexStr, subscriptMap, featureVars } = this.buildRegex(match, beforeEnv, afterEnv, exceptions);
          const regex = new RegExp(`^${regexStr}`, 'u');
          const remaining = current.slice(pos);
          const m = regex.exec(remaining);
          
          if (m) {
            const fullMatch = m[0];
            const groups = m.groups;
            const repl = this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
            current = current.slice(0, pos) + repl + current.slice(pos + fullMatch.length);
            
            if (options.firstOnly) return current;

            pos += repl.length;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) pos++;
    }
    return current;
  }

  private applyRtl(word: string, subRules: any[], stageOptions: RuleOptions): string {
    let current = word;
    let pos = current.length;
    
    while (pos >= 0) {
      let matched = false;
      for (const subRule of subRules) {
        const options = { ...stageOptions, ...subRule.options };
        const { match, replacement, environments, exceptions } = subRule;
        
        for (const env of environments) {
          const [beforeEnv, afterEnv] = env.split('_');
          const { regexStr, subscriptMap, featureVars } = this.buildRegex(match, beforeEnv, afterEnv, exceptions);
          const regex = new RegExp(`${regexStr}$`, 'u');
          const prefix = current.slice(0, pos);
          const m = regex.exec(prefix);
          
          if (m) {
            const fullMatch = m[0];
            const groups = m.groups;
            const repl = this.buildReplacement(replacement, fullMatch, groups, subscriptMap, featureVars);
            current = current.slice(0, m.index) + repl + current.slice(pos);
            
            if (options.lastOnly) return current;

            pos = m.index;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) pos--;
    }
    return current;
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

      // Handle sets {a,b,c}
      res = res.replace(/\{([^}]+)\}/g, (_, setStr) => {
        const items = setStr.split(',').map((s: string) => s.trim());
        return `(?:${items.map(escapeRegExp).join('|')})`;
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

      // Handle feature variables [@place]
      res = res.replace(/\[([^\]]*@\w+[^\]]*)\]/g, (_, featureStr) => {
        const varMatch = featureStr.match(/@(\w+)/);
        if (varMatch) {
          const varName = varMatch[1];
          captureCount++;
          const groupName = `fvar${captureCount}`;
          featureVars[varName] = groupName;
          // Match any IPA phoneme (base + diacritics)
          return `(?<${groupName}>${phonemePattern})`;
        }
        return _;
      });

      // Handle features [+feature] attached to something (e.g. S[+fortis], S1[+fortis])
      // or standalone [+feature]
      res = res.replace(/(@?\w+|{[^}]+}|\[[^\]]+\])?\[([+-]\w+(?:\s+[+-]\w+)*)\]/g, (full, base, featureStr) => {
        const criteria: any = {};
        featureStr.split(/\s+/).forEach((f: string) => {
          const val = f.startsWith('+');
          const key = f.slice(1);
          criteria[key] = val;
        });

        if (!base) {
          // Standalone [+feature]
          const phonemes = getPhonemesByFeatures(criteria);
          return `(?:${phonemes.map(escapeRegExp).join('|')})`;
        }

        // Attached to something
        // If base is a subscript reference like S1, we need to handle it differently
        // But translatePart is called before subscripts are handled? No, after.
        // Wait, the regex above matches S1[+fortis] as base=S1, featureStr=+fortis.
        
        const getFilteredPattern = (members: string[]) => {
          const filtered = members.filter(m => matchFeatures(m, criteria));
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
          
          // Check if it's a subscript reference already handled?
          // No, this regex runs before or after?
          // The order in translatePart matters.
          
          // If it's a single phoneme
          return matchFeatures(base, criteria) ? escapeRegExp(base) : '(?!)';
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

      // Handle spaces as optional separators between segments
      if (isMatch || isBefore || !isMatch) {
        // If the rule has spaces, treat them as optional \s*
        res = res.replace(/\s+/g, '\\s*');
      }

      // Handle boundaries
      if (isBefore) {
        res = res.replace(/##/g, '(?:^|\\s+)');
        res = res.replace(/#/g, '^');
        res = res.replace(/\$/g, '(?:^|\\.|\\s)');
        res = res.replace(/\+/g, '(?:\\+)');
        res = res.replace(/σ/g, '(?:[^.]+)');
      } else {
        res = res.replace(/##/g, '(?:$|\\s+)');
        res = res.replace(/#/g, '$');
        res = res.replace(/\$/g, '(?:$|\\.|\\s)');
        res = res.replace(/\+/g, '(?:\\+)');
        res = res.replace(/σ/g, '(?:[^.]+)');
      }

      return res;
    };

    const matchRegex = translatePart(match, false, true);
    const beforeRegex = translatePart(before, true, false);
    const afterRegex = translatePart(after, false, false);

    let finalRegex = '';
    
    // Handle exceptions
    if (exceptions.length > 0) {
      for (const exc of exceptions) {
        const [excBefore, excAfter] = exc.split('_');
        const eb = translatePart(excBefore, true, false);
        const ea = translatePart(excAfter, false, false);
        
        if (eb && ea) {
          // Exception is full environment
          finalRegex += `(?!(?<=${eb})${matchRegex}(?=${ea}))`;
        } else if (eb) {
          finalRegex += `(?!(?<=${eb})${matchRegex})`;
        } else if (ea) {
          finalRegex += `(?!(?:)${matchRegex}(?=${ea}))`;
        }
      }
    }

    if (beforeRegex) finalRegex += `(?<=${beforeRegex})`;
    finalRegex += `(${matchRegex})`;
    if (afterRegex) finalRegex += `(?=${afterRegex})`;

    return { regexStr: finalRegex, subscriptMap, featureVars };
  }

  private buildReplacement(replacement: string, fullMatch: string, groups: any, subscriptMap: Record<string, string>, featureVars: Record<string, string>): string {
    if (replacement === '∅' || replacement === '') return '';
    if (replacement === '__') return fullMatch + fullMatch;
    
    let res = replacement;

    // Handle standalone feature modification: [+voiced]
    const standaloneFeatureMatch = res.match(/^\[([+-]\w+(?:\s+[+-]\w+)*)\]$/);
    if (standaloneFeatureMatch) {
      const featureStr = standaloneFeatureMatch[1];
      const criteria: any = {};
      featureStr.split(/\s+/).forEach((f: string) => {
        const val = f.startsWith('+');
        const key = f.slice(1);
        criteria[key] = val;
      });
      return this.applyFeaturesToPhoneme(fullMatch, criteria);
    }

    // Handle random alternation b > m*3 | n
    if (res.includes('|')) {
      const options = res.split('|').map(opt => {
        const parts = opt.trim().split('*');
        const value = parts[0].trim();
        const weight = parts[1] ? parseInt(parts[1].trim(), 10) : 1;
        return { value, weight };
      });
      const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const opt of options) {
        if (rand < opt.weight) {
          res = opt.value;
          break;
        }
        rand -= opt.weight;
      }
    }

    // Handle subscript back-references in replacement
    // Support S1[+fortis] or just S1
    res = res.replace(/([A-Z@ᴰ]\w*)([1-9₁-₉])(\[([+-]\w+(?:\s+[+-]\w+)*)\])?/g, (_, name, sub, hasFeatures, featureStr) => {
      const n = sub.replace(/[₁-₉]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 0x30));
      const key = `${name}${n}`;
      const groupName = subscriptMap[key];
      const sourcePhoneme = (groups && groups[groupName]) || '';
      
      if (hasFeatures && sourcePhoneme) {
        const criteria: any = {};
        featureStr.slice(1, -1).split(/\s+/).forEach((f: string) => {
          const val = f.startsWith('+');
          const key = f.slice(1);
          criteria[key] = val;
        });
        return this.applyFeaturesToPhoneme(sourcePhoneme, criteria);
      }
      
      return sourcePhoneme || fullMatch;
    });

    // Handle copy match in place _ with optional features _[+fortis]
    res = res.replace(/(?<!_)_(\[([+-]\w+(?:\s+[+-]\w+)*)\])?(?!_)/g, (_, hasFeatures, featureStr) => {
      if (hasFeatures) {
        const criteria: any = {};
        featureStr.slice(1, -1).split(/\s+/).forEach((f: string) => {
          const val = f.startsWith('+');
          const key = f.slice(1);
          criteria[key] = val;
        });
        const phonemes = tokenizeIPA(fullMatch);
        if (phonemes.length > 0) {
          return this.applyFeaturesToPhoneme(phonemes[0], criteria) + phonemes.slice(1).join('');
        }
      }
      return fullMatch;
    });

    // Handle feature variables in replacement [@place]
    res = res.replace(/\[@(\w+)\]/g, (_, varName) => {
      const groupName = featureVars[varName];
      const sourcePhoneme = groups && groups[groupName];
      if (sourcePhoneme) {
        const features = getEffectiveFeatures(sourcePhoneme);
        if (features) {
          // Map varName to actual features
          const featureKeys = this.getFeatureKeysForVar(varName);
          const changes: any = {};
          featureKeys.forEach(k => {
            changes[k] = (features as any)[k];
          });
          // Apply to the first phoneme of the match
          const phonemes = tokenizeIPA(fullMatch);
          if (phonemes.length > 0) {
            return this.applyFeaturesToPhoneme(phonemes[0], changes) + phonemes.slice(1).join('');
          }
        }
      }
      return fullMatch;
    });

    // Handle feature changes [+feature] in replacement
    if (res.startsWith('[') && res.endsWith(']')) {
      const featureStr = res.slice(1, -1);
      const criteria: any = {};
      featureStr.split(/\s+/).forEach((f: string) => {
        const val = f.startsWith('+');
        const key = f.slice(1);
        criteria[key] = val;
      });
      const phonemes = tokenizeIPA(fullMatch);
      if (phonemes.length > 0) {
        return this.applyFeaturesToPhoneme(phonemes[0], criteria) + phonemes.slice(1).join('');
      }
    }
    
    return res;
  }

  private getFeatureKeysForVar(varName: string): string[] {
    switch (varName) {
      case 'place': return ['labial', 'coronal', 'dorsal', 'high', 'low', 'back'];
      case 'manner': return ['continuant', 'nasal', 'strident', 'lateral', 'delayedRelease', 'syllabic', 'consonantal', 'sonorant'];
      case 'voice': return ['voice'];
      case 'height': return ['high', 'low'];
      case 'backness':
      case 'frontness': return ['back'];
      case 'roundness': return ['round'];
      case 'stress': return ['stress'];
      default: return [];
    }
  }

  private applyFeaturesToPhoneme(phoneme: string, featureChanges: Partial<DistinctiveFeatures>): string {
    const baseFeatures = getEffectiveFeatures(phoneme);
    if (!baseFeatures) return phoneme;

    const newFeatures = { ...baseFeatures, ...featureChanges };
    
    const allSymbols = { ...FEATURE_MAP };
    let bestMatch = phoneme;
    let minDiff = Infinity;

    for (const [symbol, features] of Object.entries(allSymbols)) {
      let diff = 0;
      for (const key in newFeatures) {
        if ((newFeatures as any)[key] !== (features as any)[key]) {
          diff++;
        }
      }
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = symbol;
      }
      if (diff === 0) break;
    }

    return bestMatch;
  }
}

export class BlendedScaEngine {
  public getClasses() { return this.classes; }
  public getElements() { return this.elements; }
  public getDeferredRules() { return this.deferredRules; }
  private classes: Record<string, string[]> = {};
  private elements: Record<string, string> = {};
  private syllables: string[] = [];
  private rules: Rule[] = [];
  private deferredRules: Record<string, Rule> = {};
  private cleanupRules: Rule[] = [];
  private activeCleanupRules: Set<string> = new Set();
  private deromanizer: Rule | null = null;
  private romanizer: Rule | null = null;
  private intermediateRomanizers: Record<string, Rule> = {};

  constructor() {
    this.classes['C'] = getPhonemesByFeatures({ consonantal: true });
    this.classes['V'] = getPhonemesByFeatures({ syllabic: true });
    this.classes['X'] = Object.keys(FEATURE_MAP);
    
    // D: Any IPA base letter (no diacritics)
    this.classes['D'] = Object.keys(FEATURE_MAP).filter(p => !/[\u0300-\u036f\u02b0-\u02ff\u1d2c-\u1d6a\u2070-\u209f\u02d0\u02d1]/.test(p));
    // ᴰ: Any diacritic symbol alone
    this.classes['ᴰ'] = ['\u0325', '\u030A', '\u032C', '\u02B0', '\u02B1', '\u0324', '\u0330', '\u02BC', '\u02C0', '\u02B7', '\u02B2', '\u02E0', '\u02E4', '\u0303', '\u207F', '\u02E1', '\u032A', '\u033A', '\u033B', '\u033C', '\u031F', '\u0320', '\u031D', '\u031E', '\u0318', '\u0319', '\u0334', '\u0339', '\u031C', '\u0308', '\u033D', '\u0329', '\u030D', '\u032F', '\u02DE', '\u02D0', '\u02D1', '\u0306', '\u02C8', '\u02CC'];

    // Add common manner/place classes
    this.classes['stop'] = getPhonemesByFeatures({ consonantal: true, continuant: false, nasal: false });
    this.classes['fricative'] = getPhonemesByFeatures({ consonantal: true, continuant: true });
    this.classes['nasal'] = getPhonemesByFeatures({ nasal: true });
    this.classes['liquid'] = getPhonemesByFeatures({ lateral: true }).concat(getPhonemesByFeatures({ sonorant: true, continuant: true, coronal: true, voice: true }).filter(p => !p.includes('l')));
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

  public parse(script: string) {
    const lines = script.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'));
    
    let currentRule: Rule | null = null;
    let mode: 'rules' | 'deromanizer' | 'romanizer' | 'deferred' | 'cleanup' = 'rules';

    for (const line of lines) {
      // Handle IF/THEN/ELSE
      if (line.startsWith('IF ')) {
        const match = line.match(/IF\s+(.+)\s+THEN\s+(.+)(?:\s+ELSE\s+(.+))?/);
        if (match) {
          const condition = match[1].trim();
          const thenPart = match[2].trim();
          const elsePart = match[3] ? match[3].trim() : null;

          const r = new Rule('conditional', {}, this);
          r.setCondition(condition);
          
          this.parseSubRuleLine(r, thenPart, false);
          if (elsePart) {
            this.parseSubRuleLine(r, elsePart, true);
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

      if (line.startsWith('Deromanizer:')) {
        this.deromanizer = new Rule('Deromanizer', {}, this);
        currentRule = this.deromanizer;
        mode = 'deromanizer';
        continue;
      }

      if (line.startsWith('Romanizer:')) {
        this.romanizer = new Rule('Romanizer', {}, this);
        currentRule = this.romanizer;
        mode = 'romanizer';
        continue;
      }

      if (line.startsWith('Romanizer-')) {
        const match = line.match(/Romanizer-([\w-]+):/);
        if (match) {
          const name = match[1];
          const r = new Rule(`Romanizer-${name}`, {}, this);
          this.intermediateRomanizers[name] = r;
          currentRule = r;
          mode = 'romanizer';
        }
        continue;
      }

      if (line.startsWith('Deferred ')) {
        const match = line.match(/Deferred\s+([\w-]+):/);
        if (match) {
          const name = match[1];
          const r = new Rule(name, {}, this);
          this.deferredRules[name] = r;
          currentRule = r;
          mode = 'deferred';
        }
        continue;
      }

      if (line.startsWith('Cleanup ')) {
        const match = line.match(/Cleanup\s+([\w-]+):/);
        if (match) {
          const name = match[1];
          const r = new Rule(name, {}, this);
          this.cleanupRules.push(r);
          this.activeCleanupRules.add(name);
          currentRule = r;
          mode = 'cleanup';
        }
        continue;
      }

      if (line.startsWith('Cleanup off:')) {
        const match = line.match(/Cleanup off:\s+([\w-]+)/);
        if (match) {
          this.activeCleanupRules.delete(match[1]);
        }
        continue;
      }

      if (line.startsWith('Then')) {
        const match = line.match(/Then(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:/);
        if (currentRule && match) {
          const filter = match[1];
          const modifier = match[2];
          currentRule.addStage({
            filter,
            propagate: modifier === 'propagate',
            direction: (modifier === 'ltr' || modifier === 'rtl') ? modifier : undefined
          });
        }
        continue;
      }

      if (line.match(/^[\w-]+(?:\s+\[[^\]]+\])?(?:\s+(propagate|ltr|rtl))?:$/)) {
        const match = line.match(/^([\w-]+)(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);
        if (match) {
          const name = match[1];
          const filter = match[2];
          const modifier = match[3];
          currentRule = new Rule(name, {
            name,
            filter,
            propagate: modifier === 'propagate',
            direction: (modifier === 'ltr' || modifier === 'rtl') ? modifier : undefined
          }, this);
          this.rules.push(currentRule);
          mode = 'rules';
        }
        continue;
      }

      if (line.startsWith('Apply:')) {
        const ruleName = line.split(':')[1].trim();
        if (mode === 'cleanup') {
          this.activeCleanupRules.add(ruleName);
        } else if (currentRule) {
          currentRule.addSubRule(`Apply:${ruleName}`, '', ['_'], []);
        }
        continue;
      }

      if (line.includes('>') || line.includes('=>') || line.includes('→') || line.includes('->')) {
        if (!currentRule) {
          currentRule = new Rule('unnamed', {}, this);
          this.rules.push(currentRule);
        }
        this.parseSubRuleLine(currentRule, line, false);
      }
    }
  }

  private parseSubRuleLine(rule: Rule, line: string, isElse: boolean) {
    // Support multiple arrow types: >, =>, →, ->
    const arrowRegex = /(?:=>|->|→|>)/;
    const parts = line.split(arrowRegex);
    if (parts.length < 2) return;

    let target = parts[0].trim();
    if (target === '0' || target === '∅') target = '';
    let rest = parts[1].trim();
    
    let firstOnly = false;
    let lastOnly = false;

    if (target.includes('<<')) {
      firstOnly = true;
      target = target.replace('<<', '').trim();
    } else if (target.includes('>>')) {
      lastOnly = true;
      target = target.replace('>>', '').trim();
    }

    // Support ∅ or 0 for deletion
    let replacement = rest.replace(/∅/g, '').trim();
    if (replacement === '0' && rest.length === 1) replacement = '';

    let envs: string[] = ['_'];
    let excs: string[] = [];

    if (replacement.includes('/')) {
      const envParts = replacement.split('/');
      replacement = envParts[0].trim();
      const envStr = envParts[1].trim();
      
      if (envStr.includes('!')) {
        const splitEnvs = envStr.split('!');
        const envPart = splitEnvs[0].trim();
        if (envPart) {
          envs = envPart.split('|').map(e => e.trim()).filter(e => e);
        } else {
          // If env is empty but exc exists, e.g. ! E_, default to _
          envs = ['_'];
        }
        excs = splitEnvs.slice(1).map(e => e.trim());
      } else {
        envs = envStr.split('|').map(e => e.trim()).filter(e => e);
      }
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
    if (this.syllables.length === 0) return word;
    
    const phonemes = tokenizeIPA(word);
    if (phonemes.length === 0) return word;

    // Identify nucleus, onset, coda classes from the Syllables declaration
    const nucleusClasses: string[] = [];
    const onsetClasses: string[] = [];
    const codaClasses: string[] = [];

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
    // This is a bit heuristic. Let's assume if no ::, anything with V or nucleus in name is nucleus.
    if (nucleusClasses.length === 0) {
      for (const part of this.syllables) {
        const name = part.replace(/[@?*+]/g, '');
        if (name === 'V' || name.toLowerCase().includes('nucleus')) {
          nucleusClasses.push(name);
        }
      }
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

  private applyToWord(word: string): BlendedScaResult {
    // Handle phrases by processing each word separately for syllabification
    // but applying rules to the whole phrase to support ##
    const words = word.split(/\s+/);
    let current = words.map(w => this.syllabify(w)).join(' ');
    
    const history: { rule: string; before: string; after: string }[] = [];
    const intermediateRomanizations: Record<string, string> = {};

    if (this.deromanizer) {
      const next = this.deromanizer.apply(current);
      if (next !== current) {
        history.push({ rule: 'Deromanizer', before: current, after: next });
        current = next;
      }
    }

    for (const rule of this.rules) {
      const before = current;
      current = rule.apply(current);
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
