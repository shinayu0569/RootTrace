
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

    let regexStr = '';
    if (beforePart) regexStr += `(?<=${beforePart})`;
    regexStr += matchPart;
    if (afterPart) regexStr += `(?=${afterPart})`;

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
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;

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
        const classMatches = line.match(/@(\w+)/g);
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

  public parse(script: string) {
    const lines = script.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'));
    
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

      if (line.startsWith('Deferred:')) {
        mode = 'deferred';
        currentRule = null;
        continue;
      }

      if (line.startsWith('Cleanup:')) {
        mode = 'cleanup';
        currentRule = null;
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
    current = words.map(w => this.syllabify(w)).join(' ');

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
