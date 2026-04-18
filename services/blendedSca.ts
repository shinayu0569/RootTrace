

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

  column?: number;

  message: string;

  type: 'syntax' | 'reference' | 'phonetic' | 'warning';

  severity: 'error' | 'warning' | 'info';

  snippet?: string;

  suggestion?: string;

}



// New Stress Configuration Interface

export interface StressConfig {

  pattern: 'initial' | 'final' | 'penultimate' | 'antepenult' | 'trochaic' | 'iambic' | 'dactylic' | 'anapestic' | 'mobile' | 'random-mobile' | 'custom' | null;

  autoFix: boolean;

  enforceSafety: boolean;

  heavySyllablePattern: string;

  customPosition: string;

  randomMobile: {

    enabled: boolean;

    fallbackDirection: 'next' | 'previous';

    seed: number | null;

  };

  secondaryStress: {

    enabled: boolean;

    pattern: 'alternating' | 'custom';

    direction: 'ltr' | 'rtl';

    skipPrimary: boolean;

    customInterval?: number; // for custom alternating patterns (e.g., every 3rd syllable)

  };

  userAdjustments: Array<{

    word: string;

    syllableIndex: number;

    stressType: 'primary' | 'secondary' | 'none';

  }>;

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

        // Merge subRule options with stage options (subRule takes precedence)
        const mergedOptions: RuleOptions = {
          ...stage.options,
          ...subRule.options,
          // Explicitly override if subRule has these set
          propagate: subRule.options?.propagate ?? stage.options.propagate,
          direction: subRule.options?.direction ?? stage.options.direction,
          firstOnly: subRule.options?.firstOnly ?? stage.options.firstOnly,
          lastOnly: subRule.options?.lastOnly ?? stage.options.lastOnly,
        };

        current = this.applySubRule(current, subRule, mergedOptions);

      }

      

      iterations++;

      if (iterations >= maxIterations) {

        console.warn(`Rule "${this.name}" exceeded maximum iterations (${maxIterations}). Possible infinite loop.`);

        break;

      }

      

      // Check propagate at both stage and sub-rule level
      const anyPropagate = subRules.some(sr => sr.options?.propagate) || stage.options.propagate;
      if (!anyPropagate) break;

      

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



    // Use directional application if direction is specified
    if (options.direction) {
      result = this.applyDirectionalSubRule(result, subRule, options);
    } else {
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



      // Ranges must be in ascending numerical order: spacingModifierRange (\u02B0-) comes before combiningRange (\u1DC0-)
      const modifiers = `[${spacingModifierRange}${toneLetters}${combiningRange}]`;

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

      // Handle class exclusion syntax FIRST: C-k (C minus k), C-{k,p} (C minus k and p), C-[+voice])
      // This must come BEFORE set handling so C-{k} is processed correctly
      res = res.replace(/\b([A-Z])-(\{[^}]+\}|\[[^\]]+\]|[^\s&|(){}\[\]]+)/g, (full, className, exclusions) => {
        const cls = this.engine.getClasses()[className];
        if (!cls) return full;
        
        const excludeSet = new Set<string>();
        if (exclusions.startsWith('{') && exclusions.endsWith('}')) {
          // Set exclusion: C-{k,p}
          const items = exclusions.slice(1, -1).split(/[,\s]+/).filter((s: string) => s);
          items.forEach((item: string) => excludeSet.add(item.trim()));
        } else if (exclusions.startsWith('[') && exclusions.endsWith(']')) {
          // Feature exclusion: C-[+voice] - skip for now, handle later
          return full;
        } else {
          // Single phoneme exclusion: C-k
          excludeSet.add(exclusions);
        }
        
        const filtered = cls.filter((m: string) => !excludeSet.has(m));
        const sorted = filtered.sort((a, b) => b.length - a.length);
        return filtered.length > 0
          ? `(?:${sorted.map(escapeRegExp).join('|')})`
          : '(?!)';
      });

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

        if (el) {

          const translated = translatePart(el, isBefore, isMatch);

          return `(?:${translated})`;

        }

        return full;

      });



      // Handle subscripts C[1], C[2], etc. (zero-ambiguity syntax)

      res = res.replace(/([A-Z@ᴰ]\w*)\[(\d+)\]/g, (_, name, sub) => {

        const key = `${name}[${sub}]`;

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



      // Handle feature variables [%place] and [%place +constraint]

      // This captures the phoneme AND applies feature constraints

      res = res.replace(/\[(%\w+)(?:\s+([!+-]\w+(?:\s+[!+-]\w+)*))?\]/g, (_, varNameWithPercent, featureStr) => {

        const varName = varNameWithPercent.slice(1); // Remove %

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



      // First, process standalone [+feature] patterns (not attached to a base)
      // This must be done before base+feature patterns to avoid incorrect matching like [+stop][+liquid]
      // being parsed as base=[+stop] feature=+liquid
      res = res.replace(/(?<![\w\}])\[([!+-]\w+(?:\s+[!+-]\w+)*)\](?!\w)/g, (full, featureStr) => {
        // Check for stress-related features first
        const hasPrimStress = featureStr.includes('+primstrss');
        const hasScndStress = featureStr.includes('+scndstrss');

        const hasStress = featureStr.includes('+stress');

        const noPrimStress = featureStr.includes('-primstrss');

        const noScndStress = featureStr.includes('-scndstrss');

        const noStress = featureStr.includes('-stress');

        

        // If we have stress features, handle them specially

        if (hasPrimStress || hasScndStress || hasStress || noPrimStress || noScndStress || noStress) {

          // Remove stress features from featureStr to process remaining features normally

          const remainingFeatures = featureStr

            .split(/\s+/)

            .filter((f: string) => !f.match(/^[+-]?(primstrss|scndstrss|stress)$/))

            .join(' ');

          

          // Build stress pattern - matches a complete syllable with/without stress

          // Use [^.]+ to ensure at least one character in the syllable

          let stressPattern = '';

          if (hasPrimStress) {

            stressPattern = '(?:[^.]*ˈ[^.]*\.)';

          } else if (hasScndStress) {

            stressPattern = '(?:[^.]*ˌ[^.]*\.)';

          } else if (hasStress) {

            stressPattern = '(?:[^.]*[ˈˌ][^.]*\.)';

          } else if (noPrimStress) {

            stressPattern = '(?:[^.]*(?<!ˈ)[^.]*\.)';

          } else if (noScndStress) {

            stressPattern = '(?:[^.]*(?<!ˌ)[^.]*\.)';

          } else if (noStress) {

            stressPattern = '(?:[^.]*(?<![ˈˌ])[^.]*\.)';

          }

          

          if (!remainingFeatures.trim()) {

            // Only stress features, return the stress pattern directly

            return stressPattern;

          }

          // Otherwise continue processing remaining features

          featureStr = remainingFeatures;

        }

        

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



        // Standalone [+feature !other] - return phonemes matching the criteria

        const phonemes = getPhonemesByFeatures(criteria);

        // Filter out those matching negCriteria

        const filtered = phonemes.filter(p => {

          for (const [negKey, _] of Object.entries(negCriteria)) {

            if (matchFeatures(p, { [negKey]: true })) return false;

          }

          return true;

        });

        return `(?:${filtered.map(escapeRegExp).join('|')})`;

      });



      // Handle wildcards

      const classes = this.engine.getClasses();

      res = res.replace(/\bC\b(?!-)/g, `(?:${classes['C']?.map(escapeRegExp).join('|') || 'C'})`);

      res = res.replace(/\bV\b(?!-)/g, `(?:${classes['V']?.map(escapeRegExp).join('|') || 'V'})`);

      res = res.replace(/\bD\b(?!-)/g, `(?:${classes['D']?.map(escapeRegExp).join('|') || 'D'})`);

      res = res.replace(/\bᴰ\b(?!-)/g, `(?:${classes['ᴰ']?.map(escapeRegExp).join('|') || 'ᴰ'})`);

      res = res.replace(/\bX\b/g, `(?:${phonemePattern})`);

      

      // Stress metasymbol - matches primary or secondary stress

      res = res.replace(/\bstress\b/g, `(?:[${stressMarks}])`);

      res = res.replace(/\bprimary-stress\b/g, '(?:ˈ)');

      res = res.replace(/\bsecondary-stress\b/g, '(?:ˌ)');

      

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

        // Sort by length (longest first) to prevent partial matches (e.g., 'kx' before 'k')

        const sorted = filtered.sort((a, b) => b.length - a.length);

        return filtered.length > 0

          ? `(?:${sorted.map(escapeRegExp).join('|')})` 

          : '(?!)';

      });



      // Handle intersection (&) and negation (!) operators

      // Examples: @C&@V (intersection), C&!V (C minus V), @stop&[+voice]

      res = res.replace(/(\S+)&(!?\S+)/g, (full, left, right) => {

        // Parse left operand

        const getMembers = (operand: string): string[] => {

          // Remove wrapping parens if present

          operand = operand.replace(/^\((.*)\)$/, '$1');

          // Handle already-expanded regex patterns like (?:kʷʲ|gʷʲ|...)

          if (operand.startsWith('?:')) {

            const inner = operand.slice(2).replace(/^\((.*)\)$/, '$1');

            return inner.split('|').filter(p => p);

          }

          

          if (operand.startsWith('@')) {

            const name = operand.slice(1);

            // Try class first, then element

            const cls = this.engine.getClasses()[name];

            if (cls) return cls;

            // Check if it's an element

            const el = this.engine.getElements()[name];

            if (el) {

              // Element value might contain wildcards, expand them

              return this.engine.getElements()[name] || [];

            }

            return [];

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

        // Syllable-aware predicates in environments

        res = res.replace(/\bheavy_/g, '(?:(?:[^.]*[ˈˌ][^.,]*VC[^.,]*|[^.]*[ˈˌ][^.,]*VV[^.,]*|[^.]*VC[ˈˌ][^.,]*|[^.]*VV[ˈˌ][^.,]*)\.)?');

        res = res.replace(/\blight_/g, '(?:[^.]*[ˈˌ]?[^.,]*V[^.,]*\.)?');

        res = res.replace(/\bstressed_/g, '(?:[^.]*[ˈˌ][^.,]*\.)?');

        res = res.replace(/\bunstressed_/g, '(?:[^.]*(?<![ˈˌ])[^.,]*\.)?');

      } else {

        res = res.replace(/##/g, '(?:$|\\s+)');

        res = res.replace(/#/g, '$');

        // $ matches syllable boundary (the literal . in syllabified words)

        res = res.replace(/\$/g, '(?:\\.)');

        res = res.replace(/\+/g, '(?:\\+)');

        res = res.replace(/σ/g, '(?:[^.]+)');

        // Syllable-aware predicates in environments

        res = res.replace(/_heavy\b/g, '(?:\.(?:[^.]*[ˈˌ][^.,]*VC[^.,]*|[^.]*[ˈˌ][^.,]*VV[^.,]*|[^.]*VC[ˈˌ][^.,]*|[^.]*VV[ˈˌ][^.,]*))?');

        res = res.replace(/_light\b/g, '(?:\.[^.]*[ˈˌ]?[^.,]*V[^.,]*)?');

        res = res.replace(/_stressed\b/g, '(?:\.[^.]*[ˈˌ][^.,]*)?');

        res = res.replace(/_unstressed\b/g, '(?:\.[^.]*(?<![ˈˌ])[^.,]*)?');

      }



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
        // Sort by length (longest first) to prevent partial matches (e.g., 'kx' before 'k')
        const sorted = filtered.sort((a, b) => b.length - a.length);
        return filtered.length > 0
          ? `(?:${sorted.map(escapeRegExp).join('|')})` 
          : '(?!)';
      });

      // Handle intersection (&) and negation (!) operators
      // Examples: @C&@V (intersection), C&!V (C minus V), @stop&[+voice], C-p&[+stop]
      while (res.includes('&')) {
        // Match: class exclusion (C-p), expanded regex ((?:...)), class reference (@class), feature ([+voice]), or single class (C)
        res = res.replace(/(\([?:]\)?[^)]+\)|[A-Z]-[a-zA-Z{}[\]]+|@\w+|\[[^\]]+\]|[A-Z])&(!?\S+)/, (full, left, right) => {
        const getMembers = (operand: string): string[] => {
          operand = operand.replace(/^\((.*)\)$/, '$1');
          
          // Handle already-expanded regex patterns like (?:kʷʲ|gʷʲ|...)
          if (operand.startsWith('?:')) {
            const inner = operand.slice(2).replace(/^\((.*)\)$/, '$1');
            return inner.split('|').filter(p => p);
          }
          
          // Handle class exclusion: C-k, C-{k,p}, C-[+voice]
          if (/^[A-Z]-/.test(operand)) {
            const className = operand[0];
            const exclusions = operand.slice(2);
            const cls = this.engine.getClasses()[className];
            if (!cls) return [];
            
            const excludeSet = new Set<string>();
            if (exclusions.startsWith('{') && exclusions.endsWith('}')) {
              const items = exclusions.slice(1, -1).split(/[,\s]+/).filter((s: string) => s);
              items.forEach((item: string) => excludeSet.add(item.trim()));
            } else if (exclusions.startsWith('[') && exclusions.endsWith(']')) {
              const featureStr = exclusions.slice(1, -1);
              const criteria: any = {};
              featureStr.split(/\s+/).forEach((f: string) => {
                if (f.startsWith('+') || f.startsWith('-')) {
                  criteria[f.slice(1)] = f.startsWith('+');
                }
              });
              for (const phoneme of cls) {
                if (matchFeatures(phoneme, criteria)) {
                  excludeSet.add(phoneme);
                }
              }
            } else {
              excludeSet.add(exclusions);
            }
            return cls.filter((m: string) => !excludeSet.has(m));
          }
          
          if (operand.startsWith('@')) {
            return this.engine.getClasses()[operand.slice(1)] || [];
          } else if (operand.startsWith('[') && operand.endsWith(']')) {
            const featureStr = operand.slice(1, -1);
            const criteria: any = {};
            featureStr.split(/\s+/).forEach((f: string) => {
              if (f.startsWith('+') || f.startsWith('-')) {
                criteria[f.slice(1)] = f.startsWith('+');
              }
            });
            return getPhonemesByFeatures(criteria);
          } else if (/^[A-Z]$/.test(operand)) {
            return this.engine.getClasses()[operand] || [];
          } else {
            return [operand];
          }
        };

        const leftMembers = getMembers(left);
        const isNegation = right.startsWith('!');
        const rightOperand = isNegation ? right.slice(1) : right;
        const rightMembers = getMembers(rightOperand);

        let result: string[];
        if (isNegation) {
          const rightSet = new Set(rightMembers);
          result = leftMembers.filter(m => !rightSet.has(m));
        } else {
          const rightSet = new Set(rightMembers);
          result = leftMembers.filter(m => rightSet.has(m));
        }

        return result.length > 0
          ? `(?:${result.map(escapeRegExp).join('|')})`
          : '(?!)';
      });
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

    if (effectiveAfterPart) regexStr += `(?=(?:\\.)?${effectiveAfterPart})`;


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



    // Handle subscripts in replacement (new C[1] syntax)

    for (const [key, groupName] of Object.entries(subscriptMap)) {

      const val = groups && groups[groupName];

      if (val !== undefined) {

        // key is like "C[1]", replace it in the replacement string

        const escapedKey = key.replace(/\[/g, '\\[').replace(/\]/g, '\\]');

        const re = new RegExp(escapedKey, 'g');

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



// ResyllabifyRule: Special rule that re-syllabifies words

class ResyllabifyRule {

  constructor(

    public name: string,

    private engine: BlendedScaEngine

  ) {}



  apply(word: string): string {

    // Remove existing syllable boundaries and stress marks

    const cleanWord = word.replace(/[.ˈˌ]/g, '');

    // Re-syllabify using the engine's syllabification

    const syllabified = this.engine.syllabify(cleanWord);

    // Re-assign stress if pattern is configured

    return this.engine.stressConfig.pattern 

      ? this.engine.assignStress(syllabified, cleanWord) 

      : syllabified;

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

  

  // Stress configuration - New Architecture

  private stressConfig: StressConfig = {

    pattern: null,

    autoFix: false,

    enforceSafety: true,

    heavySyllablePattern: 'VC',

    customPosition: '',

    // Random mobile settings

    randomMobile: {

      enabled: false,

      fallbackDirection: 'next', // 'next' or 'previous'

      seed: null // for reproducible randomness

    },

    // Secondary stress settings

    secondaryStress: {

      enabled: false,

      pattern: 'alternating', // 'alternating' or 'custom'

      direction: 'ltr', // 'ltr' or 'rtl'

      skipPrimary: true // skip the syllable with primary stress

    },

    // User stress adjustments

    userAdjustments: [] as Array<{word: string; syllableIndex: number; stressType: 'primary' | 'secondary' | 'none'}>

  };



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

    

    // Parse lines while preserving original line numbers and handling line numbering

    const rawLines = script.split('\n');

    const lines: { originalLineNum: number; content: string; raw: string }[] = [];

    

    for (let i = 0; i < rawLines.length; i++) {

      const raw = rawLines[i];

      

      // Skip empty lines but track them

      if (!raw || raw.match(/^\s*$/)) {

        continue;

      }

      

      // Skip comment lines

      if (raw.match(/^\s*(\/\/|;|#)/)) {

        continue;

      }

      

      // Handle line numbering: "1. " or "1: " at start

      let content = raw;

      const lineNumMatch = raw.match(/^(\s*)(?:\d+[.:\)]\s+)?(.*)$/);

      if (lineNumMatch) {

        content = lineNumMatch[1] + lineNumMatch[2];

      }

      

      lines.push({

        originalLineNum: i + 1,

        content: content.trim(),

        raw: raw.trim()

      });

    }

    

    const definedClasses = new Set<string>();

    const definedElements = new Set<string>();

    const definedRules = new Set<string>();



    for (let i = 0; i < lines.length; i++) {

      const { originalLineNum, content: line, raw } = lines[i];

      

      let matched = false;



      // Class definition

      if (line.startsWith('Class ')) {

        const match = line.match(/Class\s+(\w+)/);

        if (match) {

          definedClasses.add(match[1]);

        } else {

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid Class declaration. Expected: Class Name {members} or Class Name [+features].`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: Class C {p, t, k} or Class V [+syllabic]'

          });

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

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid Element declaration. Expected: Element name pattern.`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: Element scluster s @stop'

          });

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

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid IF/THEN statement. Expected: IF condition THEN rule [ELSE rule].`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: IF #a THEN a > o ELSE a > e'

          });

        }

        matched = true;

        continue;

      }



      // Next block

      if (line.startsWith('Next')) {

        if (!line.match(/^Next(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/)) {

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid Next block. Expected: Next [filter] [propagate|ltr|rtl]:`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: Next propagate:'

          });

        }

        matched = true;

        continue;

      }



      // Apply

      if (line.startsWith('Apply:')) {

        const ruleName = line.split(':')[1]?.trim();

        if (!ruleName) {

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid Apply statement. Expected: Apply: rule-name`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: Apply: nasal-assim'

          });

        } else if (!definedRules.has(ruleName)) {

          errors.push({ 

            line: originalLineNum, 

            message: `Reference error: Rule '${ruleName}' is applied but never defined.`, 

            type: 'reference',

            severity: 'error',

            snippet: raw,

            suggestion: `Define the rule first: ${ruleName}:`

          });

        }

        matched = true;

        continue;

      }



      // Syllables

      if (line.toLowerCase().startsWith('syllables:')) {

        matched = true;

        continue;

      }



      // Stress declarations

      if (line.toLowerCase().startsWith('stress:')) {

        const stressMatch = line.match(/^Stress:\s*(\w+)(?:\s+auto-fix)?(?:\s+heavy:(\S+))?(?:\s+pos:(\S+))?(?:\s+fallback:(next|previous))?(?:\s+secondary:(\w+))?(?:\s+2nd-dir:(ltr|rtl))?(?:\s+seed:(\d+))?/i);

        if (!stressMatch) {

          errors.push({

            line: originalLineNum,

            message: `Invalid Stress declaration`,

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Expected: Stress: pattern [auto-fix] [heavy:VC|VV] [pos:N] [fallback:next|previous] [secondary:alternating] [2nd-dir:ltr|rtl] [seed:N]'

          });

        }

        matched = true;

        continue;

      }



      // Python-style stress declarations

      const newStressMatch = line.match(/^stress\s*=\s*["']([^"']+)["']/i);

      if (newStressMatch) {

        matched = true;

        continue;

      }



      // SecondaryStress declarations (validation)

      if (line.toLowerCase().startsWith('secondarystress:')) {

        const secondaryMatch = line.match(/^SecondaryStress:\s*(on|off|alternating|custom)(?:\s+interval:(\d+))?(?:\s+dir:(ltr|rtl))?(?:\s+skip-primary)?/i);

        if (!secondaryMatch) {

          errors.push({

            line: originalLineNum,

            message: `Invalid SecondaryStress declaration`,

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Expected: SecondaryStress: on|off|alternating|custom [interval:N] [dir:ltr|rtl] [skip-primary]'

          });

        }

        matched = true;

        continue;

      }

      if (line.toLowerCase().startsWith('stressadjust:')) {

        const adjustMatch = line.match(/^StressAdjust:\s*(\S+)\s+(\d+)\s+(primary|secondary|none)/i);

        if (!adjustMatch) {

          errors.push({

            line: originalLineNum,

            message: `Invalid StressAdjust declaration`,

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Expected: StressAdjust: word syllableIndex primary|secondary|none'

          });

        }

        matched = true;

        continue;

      }



      // Resyllabify declarations (validation)

      if (line.toLowerCase().startsWith('resyllabify')) {

        const resyllMatch = line.match(/^Resyllabify(?:\s*:\s*(\w+))?/i);

        if (!resyllMatch) {

          errors.push({

            line: originalLineNum,

            message: `Invalid Resyllabify declaration`,

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Expected: Resyllabify or Resyllabify: name'

          });

        }

        matched = true;

        continue;

      }



      // Sound change rule (contains arrow) - standardized: only > and =>

      const arrowRegex = /(?:=>|>)/;

      if (arrowRegex.test(line)) {

        matched = true;

        const parts = line.split(arrowRegex);

        if (parts.length < 2 || !parts[1].trim()) {

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid rule format. Missing replacement after arrow.`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Example: a > o or k > g / V_V'

          });

          continue;

        }

        

        const target = parts[0].trim();

        if (!target) {

          errors.push({ 

            line: originalLineNum, 

            message: `Invalid rule format. Missing target before arrow.`, 

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Add a target sound before the >'

          });

        }



        // Check for undefined classes/elements in target and replacement

        const classMatches = line.match(/(?<!\[)@(\w+)/g);

        if (classMatches) {

          classMatches.forEach(m => {

            const name = m.slice(1);

            if (!definedClasses.has(name) && !definedElements.has(name)) {

              errors.push({ 

                line: originalLineNum, 

                message: `Reference error: Class or Element '${name}' is used but never defined.`, 

                type: 'reference',

                severity: 'error',

                snippet: raw,

                suggestion: `Define it first: Class ${name} {...} or Element ${name} ...`

              });

            }

          });

        }

        

        // Check for phonetic impossibilities in rules

        const featureMatches = line.match(/\[([!+-]\w+(?:\s+[!+-]\w+)*)\]/g);

        if (featureMatches) {

          featureMatches.forEach(fm => {

            if (fm.includes('+high') && fm.includes('+low')) {

              errors.push({ 

                line: originalLineNum, 

                message: `Phonetic impossibility: [+high] and [+low] cannot co-occur.`, 

                type: 'phonetic',

                severity: 'warning',

                snippet: raw,

                suggestion: 'Use either [+high] or [+low], not both'

              });

            }

            if (fm.includes('+front') && fm.includes('+back')) {

              errors.push({ 

                line: originalLineNum, 

                message: `Phonetic impossibility: [+front] and [+back] cannot co-occur.`, 

                type: 'phonetic',

                severity: 'warning',

                snippet: raw,

                suggestion: 'Use either [+front] or [+back], not both'

              });

            }

          });

        }

        

        continue;

      }



      if (!matched) {

        errors.push({ 

          line: originalLineNum, 

          message: `Unrecognized syntax or invalid statement.`, 

          type: 'syntax',

          severity: 'error',

          snippet: raw,

          suggestion: 'Check the Syntax Guide for valid statement types'

        });

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



  public parse(script: string): ScaError[] {

    const errors: ScaError[] = [];

    

    // ─── RESET state so re-parses start clean ───────────────────────────────────

    this.rules = [];

    this.syllables = [];

    this.stressConfig = {

      pattern: null,

      autoFix: false,

      enforceSafety: true,

      heavySyllablePattern: 'VC',

      customPosition: '',

      randomMobile: { enabled: false, fallbackDirection: 'next', seed: null },

      secondaryStress: {

        enabled: false,

        pattern: 'alternating',

        direction: 'ltr',

        skipPrimary: true,

      },

      userAdjustments: [],

    };

    // ─────────────────────────────────────────────────────────────────────────────



    // Initialize default classes BEFORE parsing (so C, V, D, ᴰ wildcards work)

    this.initializeDefaultClasses();



    // Preprocessing: Handle both old and new syntax

    // New syntax: class C = ["p", "t", "k"]

    // New syntax: def rule_name(): with indentation

    // New syntax: a = o if _V (assignment with if)

    

    // Support Lua-style -- comments only

    let normalizedScript = script

      .replace(/^\s*--\s*/gm, '; ');  // Convert -- comments to ;

    

    // Convert new assignment syntax to old arrow syntax for processing

    // a = o if _V  =>  a > o / _V

    // a = o        =>  a > o

    // Handle assignment-style rules: X = Y if ENV  =>  X > Y / ENV
    normalizedScript = normalizedScript.replace(/(\S+)\s*=\s*(\S+)\s+if\s+(.+)/g, '$1 > $2 / $3');

    // Handle Script-style rules with environments: X = Y / ENV  =>  X > Y / ENV
    normalizedScript = normalizedScript.replace(/^(\S+)\s*=\s*(\S+)\s+\/\s*(.+)$/gm, '$1 > $2 / $3');

    // Handle Script-style class operations: C-k = Y, A&B = Y, C&!V = Y  =>  C-k > Y, A&B > Y, C&!V > Y
    normalizedScript = normalizedScript.replace(/^([A-Z](?:-[a-zA-Z]+|&!?[A-Z]))\s*=\s*(\S+)$/gm, '$1 > $2');

    // Handle Script-style directives: [propagate], [ltr], [rtl]  =>  propagate:, ltr:, rtl:
    // Do this BEFORE the assignment conversion so a = o [propagate] becomes a = o propagate:
    normalizedScript = normalizedScript.replace(/\[propagate\]/g, 'propagate:');
    normalizedScript = normalizedScript.replace(/\[ltr\]/g, 'ltr:');
    normalizedScript = normalizedScript.replace(/\[rtl\]/g, 'rtl:');

    // Handle simple assignment-style rules: X = Y  =>  X > Y
    // Also handle with directives: X = Y directive: => X > Y directive:
    normalizedScript = normalizedScript.replace(/^(\S+)\s*=\s*(\S+)(\s+(?:propagate|ltr|rtl):)?$/gm, '$1 > $2$3');

    normalizedScript = this.convertNewSyntaxToOld(normalizedScript);

    

    // Normalize arrows for zero-ambiguity (only > and => are valid)

    normalizedScript = normalizedScript

      .replace(/\s*=>\s*/g, ' > ');

    

    // Parse lines with indentation tracking

    const rawLines = normalizedScript.split('\n');

    const lines: { originalLineNum: number; content: string; indent: number; raw: string }[] = [];

    

    for (let i = 0; i < rawLines.length; i++) {

      const raw = rawLines[i];

      

      if (!raw || raw.match(/^\s*$/)) continue;

      if (raw.match(/^\s*;/)) continue; // Standardized: ; comments only

      

      // Handle line numbering: "1. " or "1: " at start

      let content = raw;

      const lineNumMatch = raw.match(/^(\s*)(?:\d+[.:\)]\s+)?(.*)$/);

      if (lineNumMatch) {

        content = lineNumMatch[1] + lineNumMatch[2];

      }

      

      // Calculate indentation (tabs = 2 spaces)

      const leadingWhitespace = content.match(/^(\s*)/)?.[1] || '';

      const indent = leadingWhitespace.replace(/\t/g, '  ').length;

      

      lines.push({

        originalLineNum: i + 1,

        content: content.trim(),

        indent,

        raw: raw.trim()

      });

    }

    

    let currentRule: Rule | null = null;

    let mode: 'rules' | 'deromanizer' | 'romanizer' | 'deferred' | 'cleanup' = 'rules';

    let lastRuleIndent = 0;

    let blockStack: { rule: Rule; indent: number }[] = [];



    for (let i = 0; i < lines.length; i++) {

      const { originalLineNum, content: line, indent, raw } = lines[i];

      

      // Handle exiting blocks based on indentation (Python-style)

      while (blockStack.length > 0 && indent <= blockStack[blockStack.length - 1].indent) {

        blockStack.pop();

        currentRule = blockStack.length > 0 ? blockStack[blockStack.length - 1].rule : null;

        // Reset mode to 'rules' when we exit all blocks

        if (blockStack.length === 0) {

          mode = 'rules';

        }

      }

      

      // New Python-style: class Name = [...] or class Name = [+features]

      const newClassMatch = line.match(/^class\s+(\w+)\s*=\s*(.+)$/);

      if (newClassMatch) {

        const name = newClassMatch[1];

        const value = newClassMatch[2].trim();

        

        if (value.startsWith('[') && value.endsWith(']')) {

          const inner = value.slice(1, -1).trim();

          

          // Feature-based class: [+syllabic -consonantal]

          if (inner.match(/^[\+\-]/)) {

            const criteria: any = {};

            inner.split(/\s+/).forEach((f: string) => {

              if (f.startsWith('+') || f.startsWith('-')) {

                criteria[f.slice(1)] = f.startsWith('+');

              }

            });

            this.classes[name] = getPhonemesByFeatures(criteria);

          } else {

            // Member list: ["p", "t", "k"] or [p, t, k]

            const vals = inner.split(/,\s*/).map(s => s.trim().replace(/["']/g, ''));

            this.classes[name] = vals;

          }

        }

        continue;

      }

      

      // Old style: Class Name {...} or Class Name [...]

      if (line.startsWith('Class ')) {

        const match = line.match(/Class\s+(\w+)\s+(?:\{([^}]+)\}|\[([^\]]+)\])/);

        if (match) {

          const name = match[1];

          if (match[2]) {

            const vals = match[2].split(',').map(s => s.trim().replace(/["']/g, ''));

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

        } else {

          errors.push({

            line: originalLineNum,

            message: `Invalid Class declaration`,

            type: 'syntax',

            severity: 'error',

            snippet: raw,

            suggestion: 'Expected: Class Name {members} or class Name = [members]'

          });

        }

        continue;

      }



      // New Python-style: def element(name, pattern)

      const newElementMatch = line.match(/^def\s+element\s*\(\s*(\w+)\s*,\s*["'](.+?)["']\s*\)$/);

      if (newElementMatch) {

        const name = newElementMatch[1];

        const pattern = newElementMatch[2];

        this.elements[name] = pattern;

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



      // New Python-style: syllables = "..."

      const newSyllablesMatch = line.match(/^syllables\s*=\s*["'](.+?)["']$/);

      if (newSyllablesMatch) {

        const pattern = newSyllablesMatch[1];

        this.syllables = pattern.split(/\s+/).filter(p => p);

        continue;

      }



      if (line.toLowerCase().startsWith('syllables:')) {

        const pattern = line.split(':')[1]?.trim();

        if (pattern) {

          this.syllables = pattern.split(/\s+/).filter(p => p);

        }

        continue;

      }



      // New Python-style: stress = "pattern" with extended options

      // stress = "random-mobile" fallback:next secondary:alternating

      const newStressMatch = line.match(/^stress\s*=\s*["']([^"']+)["'](?:\s+fallback:(next|previous))?(?:\s+secondary:(\w+))?(?:\s+seed:(\d+))?/i);

      if (newStressMatch) {

        this.stressConfig.pattern = newStressMatch[1].toLowerCase() as any;

        if (newStressMatch[2]) {

          this.stressConfig.randomMobile.fallbackDirection = newStressMatch[2] as 'next' | 'previous';

        }

        if (newStressMatch[3]) {

          this.stressConfig.secondaryStress.enabled = true;

          this.stressConfig.secondaryStress.pattern = newStressMatch[3] as 'alternating' | 'custom';

        }

        if (newStressMatch[4]) {

          this.stressConfig.randomMobile.seed = parseInt(newStressMatch[4], 10);

        }

        continue;

      }



      // Classic syntax: Stress: pattern [options]

      if (line.toLowerCase().startsWith('stress:')) {

        const stressMatch = line.match(/^Stress:\s*(\w+)(?:\s+auto-fix)?(?:\s+heavy:(\S+))?(?:\s+pos:(\S+))?(?:\s+fallback:(next|previous))?(?:\s+secondary:(\w+))?(?:\s+2nd-dir:(ltr|rtl))?(?:\s+seed:(\d+))?/i);

        if (stressMatch) {

          this.stressConfig.pattern = stressMatch[1].toLowerCase() as any;

          this.stressConfig.autoFix = line.toLowerCase().includes('auto-fix');

          this.stressConfig.heavySyllablePattern = stressMatch[2] || 'VC';

          this.stressConfig.customPosition = stressMatch[3] || '';

          if (stressMatch[4]) {

            this.stressConfig.randomMobile.fallbackDirection = stressMatch[4] as 'next' | 'previous';

          }

          if (stressMatch[5]) {

            this.stressConfig.secondaryStress.enabled = true;

            this.stressConfig.secondaryStress.pattern = stressMatch[5] as 'alternating' | 'custom';

          }

          if (stressMatch[6]) {

            this.stressConfig.secondaryStress.direction = stressMatch[6] as 'ltr' | 'rtl';

          }

          if (stressMatch[7]) {

            this.stressConfig.randomMobile.seed = parseInt(stressMatch[7], 10);

          }

        }

        continue;

      }



      // SecondaryStress declarations - standalone secondary stress configuration

      if (line.toLowerCase().startsWith('secondarystress:')) {

        const secondaryMatch = line.match(/^SecondaryStress:\s*(on|off|alternating|custom)(?:\s+interval:(\d+))?(?:\s+dir:(ltr|rtl))?(?:\s+skip-primary)?/i);

        if (secondaryMatch) {

          this.stressConfig.secondaryStress.enabled = secondaryMatch[1].toLowerCase() !== 'off';

          if (secondaryMatch[1].toLowerCase() === 'alternating') {

            this.stressConfig.secondaryStress.pattern = 'alternating';

            this.stressConfig.secondaryStress.interval = 2; // Default binary alternating

          } else if (secondaryMatch[1].toLowerCase() === 'custom') {

            this.stressConfig.secondaryStress.pattern = 'custom';

          }

          if (secondaryMatch[2]) {

            this.stressConfig.secondaryStress.interval = parseInt(secondaryMatch[2], 10);

          }

          if (secondaryMatch[3]) {

            this.stressConfig.secondaryStress.direction = secondaryMatch[3] as 'ltr' | 'rtl';

          }

          this.stressConfig.secondaryStress.skipPrimary = line.toLowerCase().includes('skip-primary');

        }

        continue;

      }

      if (line.toLowerCase().startsWith('stressadjust:')) {

        const adjustMatch = line.match(/^StressAdjust:\s*(\S+)\s+(\d+)\s+(primary|secondary|none)/i);

        if (adjustMatch) {

          this.stressConfig.userAdjustments.push({

            word: adjustMatch[1],

            syllableIndex: parseInt(adjustMatch[2], 10),

            stressType: adjustMatch[3] as 'primary' | 'secondary' | 'none'

          });

        }

        continue;

      }



      // New Python-style: def romanizer(): or def deromanizer():

      const newRomanizerMatch = line.match(/^def\s+(romanizer|deromanizer)\s*\(\s*(\w+)?\s*\)\s*:/);

      if (newRomanizerMatch) {

        const type = newRomanizerMatch[1];

        const name = newRomanizerMatch[2];

        

        if (type === 'deromanizer') {

          this.deromanizer = new Rule('Deromanizer', {}, this);

          currentRule = this.deromanizer;

          mode = 'deromanizer';

        } else {

          if (name) {

            const r = new Rule(`Romanizer-${name}`, {}, this);

            this.intermediateRomanizers[name] = r;

            currentRule = r;

          } else {

            this.romanizer = new Rule('Romanizer', {}, this);

            currentRule = this.romanizer;

          }

          mode = 'romanizer';

        }

        blockStack.push({ rule: currentRule!, indent });

        continue;

      }



      if (line.startsWith('Deromanizer')) {

        this.deromanizer = new Rule('Deromanizer', {}, this);

        currentRule = this.deromanizer;

        mode = 'deromanizer';

        continue;

      }



      if (line.startsWith('Romanizer')) {

        if (line.startsWith('Romanizer-')) {

          const match = line.match(/Romanizer-([\w-]+):/);

          if (match) {

            const name = match[1];

            const r = new Rule(`Romanizer-${name}`, {}, this);

            this.intermediateRomanizers[name] = r;

            currentRule = r;

            mode = 'romanizer';

            // Add to blockStack for proper indented subrule handling

            blockStack.push({ indent, rule: r });

          }

        } else {

          this.romanizer = new Rule('Romanizer', {}, this);

          currentRule = this.romanizer;

          mode = 'romanizer';

          // Add to blockStack for proper indented subrule handling

          blockStack.push({ indent, rule: this.romanizer });

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

        continue;

      }



      // New Python-style: def rule_name([filter], [propagate|ltr|rtl]):

      const newRuleMatch = line.match(/^def\s+([\w_]+)\s*\(\s*(\[[^\]]+\])?\s*(propagate|ltr|rtl)?\s*\)\s*:/);

      if (newRuleMatch) {

        const name = newRuleMatch[1];

        const filter = newRuleMatch[2] ? newRuleMatch[2].slice(1, -1) : undefined;

        const directive = newRuleMatch[3] as 'propagate' | 'ltr' | 'rtl' | undefined;

        

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

        lastRuleIndent = indent;

        blockStack.push({ rule: r, indent });

        continue;

      }



      // Old style rule name declaration

      const nameMatch = line.match(/^([\w-]+)(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);

      if (nameMatch && !line.includes('>')) {

        const name = nameMatch[1];

        const filter = nameMatch[2] || undefined;

        const directive = nameMatch[3] as 'propagate' | 'ltr' | 'rtl' | undefined;

        

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

        lastRuleIndent = indent;

        continue;

      }



      // Handle Next: blocks (old style)

      if (line.startsWith('Next')) {

        if (currentRule) {

          const match = line.match(/^Next(?:\s+\[([^\]]+)\])?(?:\s+(propagate|ltr|rtl))?:$/);

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

        const ruleName = line.split(':')[1]?.trim();

        // Allow Apply: in any mode (rules, cleanup, etc.) - strip @ prefix if present

        if (ruleName) {

          const cleanName = ruleName.startsWith('@') ? ruleName.slice(1) : ruleName;

          this.activeCleanupRules.push(cleanName);

        }

        continue;

      }



      // Resyllabify: explicit re-syllabification rule

      if (line.toLowerCase().startsWith('resyllabify')) {

        const resyllMatch = line.match(/^Resyllabify(?:\s*:\s*(\w+))?/i);

        if (resyllMatch) {

          const name = resyllMatch[1] || 'Resyllabify';

          const resyllRule = new ResyllabifyRule(name, this);

          this.rules.push(resyllRule);

        }

        continue;

      }



      // Chain shift blocks (old style)

      const chainMatch = line.match(/^chain(?:\s*\((\w+)\))?\s*([\w-]+)?:/);

      if (chainMatch) {

        const chainType = (chainMatch[1] || 'drag') as 'drag' | 'push';

        const chainName = chainMatch[2] || 'chain-shift';

        

        const chainLines: string[] = [];

        let j = i + 1;

        while (j < lines.length) {

          const nextLine = lines[j];

          if (nextLine.content === '' || nextLine.content === 'end' || 

              nextLine.content.startsWith('chain') || 

              nextLine.content.startsWith('rule ') || 

              nextLine.content.startsWith('Class:') ||

              nextLine.content.startsWith('Syllables:') || 

              nextLine.content.startsWith('Deromanizer:') ||

              nextLine.content.startsWith('Romanizer:')) {

            break;

          }

          if (nextLine.content.includes('>>')) {

            chainLines.push(nextLine.content);

          }

          j++;

        }

        

        if (chainLines.length > 0) {

          this.parseChainShift(chainName, chainLines, chainType, mode);

        }

        

        i = j - 1;

        continue;

      }



      // Block syntax: [block] ... [end]

      if (line === '[block]') {

        const blockLines: string[] = [];

        let j = i + 1;

        while (j < lines.length) {

          const nextLine = lines[j];

          if (nextLine.content === '[end]') break;

          if (nextLine.content && !nextLine.content.startsWith('//') && !nextLine.content.startsWith(';')) {

            blockLines.push(nextLine.content);

          }

          j++;

        }

        

        if (blockLines.length > 0) {

          const blockRule = new Rule('block', { propagate: true }, this);

          for (const blockLine of blockLines) {

            this.parseSubRuleLineWithErrors(blockRule, blockLine, false, originalLineNum, errors);

          }

          this.rules.push(blockRule);

        }

        

        i = j;

        continue;

      }



      // Exception lists

      const exceptMatch = line.match(/(.+)\s+except\s+(.+)/i);

      if (exceptMatch && line.includes('>')) {

        const rulePart = exceptMatch[1].trim();

        const exceptionWords = exceptMatch[2].trim().split(/\s+/);

        

        const r = currentRule || new Rule('unnamed', {}, this);

        (r as any).exceptionWords = exceptionWords;

        

        if (!currentRule) {

          this.parseSubRuleLineWithErrors(r, rulePart, false, originalLineNum, errors);

          this.rules.push(r);

        } else {

          this.parseSubRuleLineWithErrors(r, rulePart, false, originalLineNum, errors);

        }

        continue;

      }



      // Custom segment definitions

      const featMatch = line.match(/^feat:\s*(\S+)\s*=\s*(.+)/i);

      if (featMatch) {

        const symbol = featMatch[1];

        const featureSpec = featMatch[2].trim();

        

        const criteria: any = {};

        featureSpec.split(/\s+/).forEach((f: string) => {

          if (f.startsWith('+') || f.startsWith('-')) {

            criteria[f.slice(1)] = f.startsWith('+');

          }

        });

        

        if (symbol.length > 1) {

          if (!this.classes['digraphs']) {

            this.classes['digraphs'] = [];

          }

          this.classes['digraphs'].push(symbol);

          (this as any).customFeatures = (this as any).customFeatures || {};

          (this as any).customFeatures[symbol] = criteria;

        } else {

          if (!this.classes['custom']) {

            this.classes['custom'] = [];

          }

          this.classes['custom'].push(symbol);

          (this as any).customFeatures = (this as any).customFeatures || {};

          (this as any).customFeatures[symbol] = criteria;

        }

        continue;

      }



      // Sound change rules with arrows (already converted from new syntax)

      if (line.includes('>')) {

        if (currentRule) {

          this.parseSubRuleLineWithErrors(currentRule, line, false, originalLineNum, errors);

        } else if (mode === 'rules') {

          const r = new Rule('unnamed', {}, this);

          this.parseSubRuleLineWithErrors(r, line, false, originalLineNum, errors);

          this.rules.push(r);

        } else if (mode === 'cleanup') {

          // In cleanup mode without a current rule, check if line has "name: rule" syntax

          const namedRuleMatch = line.match(/^[\s]*([\w-]+):\s*(.+)$/);

          const ruleName = namedRuleMatch ? namedRuleMatch[1] : 'unnamed-cleanup';

          const ruleContent = namedRuleMatch ? namedRuleMatch[2] : line;

          const r = new Rule(ruleName, {}, this);

          this.parseSubRuleLineWithErrors(r, ruleContent, false, originalLineNum, errors);

          this.cleanupRules.push(r);

        }

        continue;

      }

      

      // If we get here, line wasn't recognized

      errors.push({

        line: originalLineNum,

        message: `Unrecognized syntax`,

        type: 'syntax',

        severity: 'error',

        snippet: raw,

        suggestion: 'Check the syntax guide for valid statement types'

      });

    }

    

    return errors;

  }

  

  /**

   * Convert Python/Lua-inspired new syntax to old classic syntax

   * 

   * Converts:

   * - stress = "pattern" => Stress: pattern

   * - syllables = "structure" => Syllables: structure

   * - class C = ["p", "t"] => Class C {p, t}

   * - def element(name, "pattern") => Element name pattern

   * - def rule(): => rule:

   * - def deromanizer(): => Deromanizer:

   * - def romanizer(): => Romanizer:

   * - def romanizer(name): => Romanizer-name:

   * - a = o if _V  =>  a > o / _V

   * - a = o        =>  a > o

   */

  private convertNewSyntaxToOld(script: string): string {

    return script

      // Convert stress declarations with extended options

      .replace(

        /stress\s*=\s*"([^"]+)"(?:\s+fallback:(next|previous))?(?:\s+secondary:(\w+))?(?:\s+2nd-dir:(ltr|rtl))?(?:\s+seed:(\d+))?/gm,

        (_match, pattern, fallback, secondary, dir, seed) => {

          let result = `Stress: ${pattern}`;

          if (fallback)  result += ` fallback:${fallback}`;

          if (secondary) result += ` secondary:${secondary}`;

          if (dir)       result += ` 2nd-dir:${dir}`;

          if (seed)      result += ` seed:${seed}`;

          return result;

        }

      )

      // Convert syllables declarations  

      .replace(/syllables\s*=\s*"([^"]+)"/gm, 'Syllables: $1')

      // Convert class declarations

      .replace(/class\s+(\w+)\s*=\s*\[([^\]]+)\]/gm, 'Class $1 {$2}')

      // Convert element declarations

      .replace(/def\s+element\s*\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/gm, 'Element $1 $2')

      // Convert def rule declarations

      .replace(/def\s+(\w[\w-]*)\s*\(\s*([^\)]*)\s*\)\s*:/gm, '$1$2:')

      // Convert def deromanizer

      .replace(/def\s+deromanizer\s*\(\s*\)\s*:/gm, 'Deromanizer:')

      // Convert def romanizer

      .replace(/def\s+romanizer\s*\(\s*(\w*)\s*\)\s*:/gm, (match, name) => 

        name ? `Romanizer-${name}:` : 'Romanizer:'

      )

      // Convert Python-style user stress adjustments

      .replace(/stress\s+adjust\s+(\w+)\s+(\d+)\s+(primary|secondary|none)/gm, 'StressAdjust: $1 $2 $3')

      // Convert assignment-style rules with if

      .replace(/(\S+)\s*=\s*(\S+)\s+if\s+(.+)$/gm, '$1 > $2 / $3')

      // Convert assignment-style rules without if

      .replace(/(\S+)\s*=\s*(\S+)$/gm, '$1 > $2')

      // Convert Script-style rule declarations: rule name: => name:

      .replace(/rule\s+(\w[\w-]*)\s*:/gm, '$1:')

      // Remove Script 'end' block delimiters

      .replace(/^\s*end\s*$/gm, '');

  }

  

  private parseSubRuleLineWithErrors(rule: Rule, line: string, isElse: boolean, lineNum: number, errors: ScaError[]) {

    const arrows = ['=>', '>']; // standardized arrows only

    let arrow = '';

    for (const a of arrows) {

      if (line.includes(a)) {

        arrow = a;

        break;

      }

    }

    if (!arrow) {

      errors.push({

        line: lineNum,

        message: `No arrow found in rule`,

        type: 'syntax',

        severity: 'error',

        snippet: line,

        suggestion: 'Rules must contain > or =>'

      });

      return;

    }



    const parts = line.split(arrow);

    if (parts.length < 2) {

      errors.push({

        line: lineNum,

        message: `Invalid rule format`,

        type: 'syntax',

        severity: 'error',

        snippet: line,

        suggestion: 'Expected: target > replacement [/ environment]'

      });

      return;

    }

    if (parts.length > 2) {

      errors.push({

        line: lineNum,

        message: `Multiple arrows found`,

        type: 'syntax',

        severity: 'warning',

        snippet: line,

        suggestion: 'Rule contains multiple > characters. Only one arrow is allowed per rule.'

      });

    }



    let target = parts[0].trim();

    let replacement = parts[1].trim();

    

    // Handle first() and last() match syntax

    let firstOnly = false;

    let lastOnly = false;

    let propagate = false;

    let direction: 'ltr' | 'rtl' | undefined = undefined;

    const firstMatch = target.match(/^first\((.+?)\)$/);

    const lastMatch = target.match(/^last\((.+?)\)$/);

    

    if (firstMatch) {

      target = firstMatch[1].trim();

      firstOnly = true;

    } else if (lastMatch) {

      target = lastMatch[1].trim();

      lastOnly = true;

    }



    let envs: string[] = ['_'];

    let excs: string[] = [];



    if (replacement.includes('/')) {

      const envParts = replacement.split('/');

      if (envParts.length > 2) {

        errors.push({

          line: lineNum,

          message: `Multiple / characters in environment`,

          type: 'syntax',

          severity: 'warning',

          snippet: line,

          suggestion: 'Use only one / to separate replacement from environment'

        });

      }

      replacement = envParts[0].trim();

      let envStr = envParts[1].trim();

      

      // Parse directives from the END of envStr BEFORE splitting environments
      // e.g., "_t ltr:" => extract "ltr" directive, leaving "_t" as env
      const envDirectivePattern = /(\s*)(?:(ltr|rtl):?\s+)?(propagate):\s*$/i;
      const envDirectionOnlyPattern = /(\s*)(ltr|rtl):\s*$/i;
      
      const envMultiMatch = envStr.match(envDirectivePattern);
      const envSingleMatch = envStr.match(envDirectionOnlyPattern);
      
      if (envMultiMatch) {
        if (envMultiMatch[2]) direction = envMultiMatch[2] as 'ltr' | 'rtl';
        propagate = true;
        envStr = envStr.slice(0, envMultiMatch.index + (envMultiMatch[1]?.length || 0)).trim();
      } else if (envSingleMatch) {
        direction = envSingleMatch[2] as 'ltr' | 'rtl';
        envStr = envStr.slice(0, envSingleMatch.index + (envSingleMatch[1]?.length || 0)).trim();
      }

      

      if (envStr.includes('!')) {

        const splitEnvs = envStr.split('!');

        const envPart = splitEnvs[0].trim();

        if (envPart) {

          envs = envPart.split(/,|\|/).map(e => e.trim()).filter(e => e);

        } else {

          envs = ['_'];

        }

        excs = splitEnvs.slice(1).map(e => e.trim()).filter(e => e);

      } else {

        envs = envStr.split(/,|\|/).map(e => e.trim()).filter(e => e);

      }

      

      envs = envs.map(env => {

        if (!env.includes('_')) {

          return `TARGET:${env}`;

        }

        return env;

      });

    }



    envs = envs.map(e => e.replace(/\s*\([^)]*\)/g, '').trim());

    excs = excs.map(e => e.replace(/\s*\([^)]*\)/g, '').trim());



    // Handle Parallel Mapping

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

      } else {

        errors.push({

          line: lineNum,

          message: `Mismatched set sizes`,

          type: 'syntax',

          severity: 'error',

          snippet: line,

          suggestion: `Target set has ${targetVals.length} items, replacement set has ${replacementVals.length}. They must match.`

        });

      }

    }



    // Parse inline directives at the end of the replacement (variables already declared above)
    // Check for multiple directives at the end: e.g., "ltr propagate:", "rtl propagate:", "propagate:"
    // Match any combination of (ltr|rtl) and propagate in any order, with colons
    const directivePattern = /(\s*)(?:(ltr|rtl):?\s+)?(propagate):\s*$/i;
    const directionOnlyPattern = /(\s*)(ltr|rtl):\s*$/i;
    
    const multiMatch = replacement.match(directivePattern);
    const singleMatch = replacement.match(directionOnlyPattern);
    
    if (multiMatch) {
      // Has propagate, maybe with direction
      if (multiMatch[2]) direction = multiMatch[2] as 'ltr' | 'rtl';
      propagate = true;
      replacement = replacement.slice(0, multiMatch.index + (multiMatch[1]?.length || 0)).trim();
    } else if (singleMatch) {
      // Only direction directive
      direction = singleMatch[2] as 'ltr' | 'rtl';
      replacement = replacement.slice(0, singleMatch.index + (singleMatch[1]?.length || 0)).trim();
    }
    
    rule.addSubRule(target, replacement, envs, excs, isElse, { firstOnly, lastOnly, propagate, direction });

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

    const pattern = this.stressConfig.heavySyllablePattern;

    

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

   * Get a seeded random number generator for reproducible randomness

   */

  private seededRandom(seed: number): () => number {

    let s = seed;

    return () => {

      s = Math.sin(s * 12.9898 + 78.233) * 43758.5453123;

      return s - Math.floor(s);

    };

  }



  /**

   * Assign stress to syllables based on the configured pattern

   * New architecture supports:

   * - All classic patterns (initial, final, penultimate, etc.)

   * - Random mobile with fallback options

   * - Secondary stress assignment

   * - User adjustments

   */

  private assignStress(syllabifiedWord: string, word: string = ''): string {

    if (!this.stressConfig.pattern) return syllabifiedWord;

    

    const syllables = syllabifiedWord.split('.');

    if (syllables.length === 0) return syllabifiedWord;

    

    // Remove existing stress marks for clean assignment

    const cleanSyllables = syllables.map(s => s.replace(/[ˈˌ]/g, ''));

    

    let primaryIndex: number = -1;

    let secondaryIndices: number[] = [];

    

    // Check for user adjustment first

    const userAdj = this.stressConfig.userAdjustments.find(a => a.word === word);

    if (userAdj) {

      if (userAdj.stressType === 'primary') {

        primaryIndex = userAdj.syllableIndex;

      } else if (userAdj.stressType === 'secondary') {

        secondaryIndices.push(userAdj.syllableIndex);

      }

      // If 'none', don't assign stress to this word

      if (userAdj.stressType === 'none') {

        return cleanSyllables.join('.');

      }

    }

    

    // If no user adjustment for primary stress, calculate it

    if (primaryIndex === -1) {

      switch (this.stressConfig.pattern) {

        case 'initial':

          primaryIndex = 0;

          break;

        case 'final':

          primaryIndex = cleanSyllables.length - 1;

          break;

        case 'penultimate':

          primaryIndex = Math.max(0, cleanSyllables.length - 2);

          break;

        case 'antepenult':

          primaryIndex = Math.max(0, cleanSyllables.length - 3);

          break;

        case 'trochaic':

          primaryIndex = 0;

          secondaryIndices = this.calculateSecondaryStress(cleanSyllables.length, 2);

          break;

        case 'iambic':

          // Weak-Strong: primary on the 2nd syllable (index 1), or last if shorter

          primaryIndex = Math.min(1, cleanSyllables.length - 1);

          secondaryIndices = this.calculateSecondaryStress(cleanSyllables.length, 2, primaryIndex);

          break;

        case 'dactylic':

          primaryIndex = 0;

          secondaryIndices = this.calculateSecondaryStress(cleanSyllables.length, 3);

          break;

        case 'anapestic':

          // Weak-Weak-Strong: primary on the 3rd syllable (index 2), or last if shorter

          primaryIndex = Math.min(2, cleanSyllables.length - 1);

          secondaryIndices = this.calculateSecondaryStress(cleanSyllables.length, 3, primaryIndex);

          break;

        case 'mobile':

          // Stress moves to the rightmost heavy syllable, defaulting to initial

          primaryIndex = 0;

          for (let i = cleanSyllables.length - 1; i >= 0; i--) {

            if (this.isHeavySyllable(cleanSyllables[i])) {

              primaryIndex = i;

              break;

            }

          }

          break;

        case 'random-mobile':

          // Random stress assignment with optional seed for reproducibility

          const rng = this.stressConfig.randomMobile.seed !== null 

            ? this.seededRandom(this.stressConfig.randomMobile.seed)

            : Math.random;

          primaryIndex = Math.floor(rng() * cleanSyllables.length);

          break;

        case 'custom':

          // Parse custom position: can be absolute (0,1,2) or negative (-1,-2)

          const pos = parseInt(this.stressConfig.customPosition, 10);

          if (!isNaN(pos)) {

            if (pos >= 0) {

              primaryIndex = Math.min(pos, cleanSyllables.length - 1);

            } else {

              primaryIndex = Math.max(0, cleanSyllables.length + pos);

            }

          }

          break;

      }

    }

    

    // Calculate secondary stress if enabled and not already set by user

    if (this.stressConfig.secondaryStress.enabled && secondaryIndices.length === 0) {

      secondaryIndices = this.calculateSecondaryStress(

        cleanSyllables.length, 

        this.stressConfig.secondaryStress.customInterval || 2,

        primaryIndex

      );

    }

    

    // Apply stress marks

    const result = cleanSyllables.map((s, i) => {

      if (i === primaryIndex) {

        return `ˈ${s}`;

      } else if (secondaryIndices.includes(i)) {

        return `ˌ${s}`;

      }

      return s;

    });

    

    return result.join('.');

  }



  /**

   * Calculate secondary stress indices.

   *

   * Strong (foot-head) positions are those where

   *   (i - primaryIndex) is a non-zero multiple of `interval`.

   *

   * The `direction` flag controls which end any leftover syllables

   * are left at.  For LTR we iterate left-to-right; for RTL we

   * iterate right-to-left and reverse at the end so the returned

   * array is always in ascending order.

   *

   * @param syllableCount  total number of syllables in the word

   * @param interval       foot size (2 = binary, 3 = ternary)

   * @param primaryIndex   index that already has primary stress

   */

  private calculateSecondaryStress(

    syllableCount: number,

    interval: number,

    primaryIndex: number = 0

  ): number[] {

    const { direction } = this.stressConfig.secondaryStress;

    const indices: number[] = [];



    if (direction === 'rtl') {

      // Build feet from the right edge.  A position i is a foot-head when

      // (syllableCount - 1 - i) is a non-negative multiple of `interval` 

      // and it is not the primary stress.

      for (let i = syllableCount - 1; i >= 0; i--) {

        const distFromRight = syllableCount - 1 - i;

        if (i !== primaryIndex && distFromRight % interval === 0) {

          indices.push(i);

        }

      }

      // Return in ascending order

      return indices.reverse();

    } else {

      // LTR: a position i is a foot-head when (i - primaryIndex) is a

      // positive multiple of `interval`.

      for (let i = 0; i < syllableCount; i++) {

        const dist = i - primaryIndex;

        // Use positive modular distance so negative i values work too

        const mod = ((dist % interval) + interval) % interval;

        if (i !== primaryIndex && mod === 0) {

          indices.push(i);

        }

      }

      return indices;

    }

  }



  /**

   * Fix stress placement after sound changes if auto-fix is enabled

   * For random-mobile: only reassign if the original syllable's nucleus disappeared

   */

  private fixStress(word: string, originalWord: string = ''): string {

    if (!this.stressConfig.autoFix && !this.stressConfig.enforceSafety) return word;

    

    // Remove existing stress marks

    const unstressed = word.replace(/[ˈˌ]/g, '');

    

    // Re-syllabify

    const syllabified = this.syllabify(unstressed);

    const syllables = syllabified.split('.');

    

    // For random-mobile pattern, check if we need to relocate stress

    if (this.stressConfig.pattern === 'random-mobile') {

      // Find where stress currently is

      const stressedMatch = word.match(/[ˈˌ]([^.]+)/);

      if (stressedMatch) {

        const stressedSyllable = stressedMatch[1].replace(/[ˈˌ]/g, '');

        const currentIndex = syllables.findIndex(s => s.replace(/[ˈˌ]/g, '') === stressedSyllable);

        

        // If syllable still exists, keep stress there

        if (currentIndex !== -1) {

          const cleanSyllables = syllables.map(s => s.replace(/[ˈˌ]/g, ''));

          return cleanSyllables.map((s, i) => i === currentIndex ? `ˈ${s}` : s).join('.');

        }

        

        // If original syllable disappeared, relocate based on fallback direction

        const { fallbackDirection } = this.stressConfig.randomMobile;

        let newIndex = -1;

        

        // Try to find the nearest syllable with a similar nucleus

        const originalIndex = parseInt(originalWord.match(/\d+/)?.[0] || '0', 10);

        

        if (fallbackDirection === 'next') {

          // Look for next available syllable

          newIndex = Math.min(originalIndex, syllables.length - 1);

        } else {

          // Look for previous available syllable

          newIndex = Math.max(0, originalIndex - 1);

        }

        

        if (newIndex >= 0 && newIndex < syllables.length) {

          const cleanSyllables = syllables.map(s => s.replace(/[ˈˌ]/g, ''));

          return cleanSyllables.map((s, i) => i === newIndex ? `ˈ${s}` : s).join('.');

        }

      }

    }

    

    // For other patterns, re-run normal stress assignment

    return this.assignStress(syllabified, word);

  }



  /**

   * Public method to syllabify a list of words (used for displaying syllable boundaries)

   */

  public syllabifyWords(words: string[]): string {

    return words.map(w => this.syllabify(w)).join(' ');

  }



  private applyToWord(word: string): BlendedScaResult {

    const history: { 

      rule: string; 

      before: string; 

      after: string;

      syllableStructure?: string;

      stressPattern?: string;

    }[] = [];

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

      // Skip syllabification if word already has syllable markers

      const syllabified = w.includes('.') ? w : this.syllabify(w);

      // Assign stress if pattern is configured

      return this.stressConfig.pattern ? this.assignStress(syllabified, w) : syllabified;

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

      if (current !== before && this.stressConfig.autoFix && this.stressConfig.pattern) {

        current = this.fixStress(current);

      }

      

      if (current !== before) {

        // Extract syllable and stress state for tracking

        const beforeSyllables = before.split(/\s+/);

        const afterSyllables = current.split(/\s+/);

        const syllableStructure = afterSyllables.map(s => {

          const count = s.split('.').length;

          return `${count}σ`;

        }).join(' ');

        const stressPattern = afterSyllables.map(s => {

          if (s.includes('ˈ')) return 'P';

          if (s.includes('ˌ')) return 'S';

          return 'U';

        }).join('-');

        

        history.push({ 

          rule: rule.name || 'unnamed', 

          before, 

          after: current,

          syllableStructure,

          stressPattern

        });

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



    // Apply cleanup rules again after all main rules (for cases with no main rules or final cleanup)

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



    let romanized = current;

    if (this.romanizer) {

      romanized = this.romanizer.apply(current);

    }



    // Preserve syllable markers in output if original word had them

    const final = word.includes('.') ? current : current.replace(/\./g, '');

    return {

      original: word,

      final,

      history,

      romanized,

      intermediateRomanizations

    };

  }

}

