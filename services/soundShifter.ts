import { getPhonemesByFeatures, tokenizeIPA } from './phonetics';
import { DistinctiveFeatures } from '../types';

export interface ShiftResult {
  original: string;
  final: string;
  history: { rule: string; before: string; after: string }[];
}

export function applyShifts(words: string[], rulesText: string): ShiftResult[] {
  const lines = rulesText.split('\n').map(l => {
    let clean = l;
    if (clean.includes('%')) clean = clean.split('%')[0];
    if (clean.includes('// ')) clean = clean.split('// ')[0];
    return clean.trim();
  }).filter(l => l);
  
  const classes: Record<string, string[]> = {
    'V': 'a e i o u y æ œ ɑ ɒ ɔ ɛ ɪ ʊ ʌ ə'.split(' '),
    'C': 'p b t d k g q ɢ f v θ ð s z ʃ ʒ x ɣ h m n ɲ ŋ l r ɾ ɹ j w'.split(' '),
  };

  // Pre-process feature-based classes
  for (const line of lines) {
    if (line.includes('[') && line.includes(']') && line.includes('=')) {
      const [name, featureStr] = line.split('=');
      const cleanName = name.trim();
      const features: Partial<DistinctiveFeatures> = {};
      
      const featureParts = featureStr.match(/([+-])(\w+)/g);
      if (featureParts) {
        featureParts.forEach(part => {
          const val = part.startsWith('+');
          const key = part.slice(1) as keyof DistinctiveFeatures;
          (features as any)[key] = val;
        });
        classes[cleanName] = getPhonemesByFeatures(features);
      }
      continue;
    }
  }

  const rules: { original: string, apply: (w: string) => string }[] = [];

  for (const line of lines) {
    if (line.includes('=') && !line.includes('>')) {
      const [name, vals] = line.split('=');
      const resolvedVals: string[] = [];
      for (const val of vals.trim().split(/[\s,]+/).filter(Boolean)) {
        if (val.startsWith('@') && classes[val.slice(1)]) {
          resolvedVals.push(...classes[val.slice(1)]);
        } else if (val.length === 1 && val === val.toUpperCase() && classes[val]) {
          resolvedVals.push(...classes[val]);
        } else {
          resolvedVals.push(val);
        }
      }
      classes[name.trim()] = resolvedVals;
      continue;
    }

    if (line.includes('>')) {
      const expandedRules = expandRule(line, classes);
      for (const r of expandedRules) {
        rules.push({ original: line, apply: r });
      }
    }
  }

  return words.map(word => {
    let current = word.trim();
    if (!current) return null;
    
    const history: { rule: string; before: string; after: string }[] = [];
    
    for (const rule of rules) {
      const next = rule.apply(current);
      if (next !== current) {
        const lastHistory = history[history.length - 1];
        if (lastHistory && lastHistory.rule === rule.original) {
          lastHistory.after = next;
        } else {
          history.push({ rule: rule.original, before: current, after: next });
        }
        current = next;
      }
    }
    return { original: word.trim(), final: current, history };
  }).filter(r => r !== null) as ShiftResult[];
}

function expandRule(ruleStr: string, classes: Record<string, string[]>): ((w: string) => string)[] {
  const gtIdx = ruleStr.indexOf('>');
  if (gtIdx === -1) return [];
  
  const targetPart = ruleStr.slice(0, gtIdx).trim();
  let rest = ruleStr.slice(gtIdx + 1);
  
  let replPart = rest;
  let envPart = '_';
  let excPart = '';
  
  const excIdx = rest.indexOf('//');
  if (excIdx !== -1) {
    excPart = rest.slice(excIdx + 2).trim();
    rest = rest.slice(0, excIdx);
  }
  
  const envIdx = rest.indexOf('/');
  if (envIdx !== -1) {
    envPart = rest.slice(envIdx + 1).trim();
    replPart = rest.slice(0, envIdx).trim();
  } else {
    replPart = rest.trim();
  }

  const resolveSet = (str: string): string[] => {
    if (str.startsWith('@') && classes[str.slice(1)]) return classes[str.slice(1)];
    if (str.length === 1 && str === str.toUpperCase() && classes[str]) return classes[str];
    if (str.startsWith('{') && str.endsWith('}')) return str.slice(1, -1).split(',').map(s => s.trim());
    return [str];
  };

  const targets = resolveSet(targetPart);
  const repls = resolveSet(replPart);

  const applyFns: ((w: string) => string)[] = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const r = repls.length === 1 ? repls[0] : (repls[i] || '');
    
    const replacement = (r === '∅' || r === '*') ? '' : r;
    const target = (t === '∅' || t === '*') ? '' : t;

    const envs = envPart.split(',').map(e => e.trim());
    
    for (const env of envs) {
      if (!env.includes('_')) continue;
      const [beforeEnv, afterEnv] = env.split('_');
      
      const buildRegexPart = (e: string | undefined, isBefore: boolean) => {
        if (!e) return '';
        let res = e;
        
        const sortedClasses = Object.keys(classes).sort((a, b) => b.length - a.length);
        for (const cName of sortedClasses) {
          const cVals = classes[cName];
          const cRegex = cVals.join('|');
          if (cName.length === 1 && cName === cName.toUpperCase()) {
            res = res.replace(new RegExp(cName, 'g'), `(?:${cRegex})`);
          } else {
            res = res.replace(new RegExp(`@${cName}\\b`, 'g'), `(?:${cRegex})`);
          }
        }
        
        res = res.replace(/\{([^}]+)\}/g, (_, inner) => {
          return `(?:${inner.split(',').map((s:string) => s.trim()).join('|')})`;
        });
        
        if (isBefore) {
          res = res.replace(/#/g, '^');
        } else {
          res = res.replace(/#/g, '$');
        }
        return res;
      };

      const beforeRegex = buildRegexPart(beforeEnv, true);
      const afterRegex = buildRegexPart(afterEnv, false);
      
      let excLookarounds = '';
      if (excPart) {
        const excs = excPart.split(',').map(e => e.trim());
        for (const exc of excs) {
          if (!exc.includes('_')) continue;
          const [eb, ea] = exc.split('_');
          const ebr = buildRegexPart(eb.trim(), true);
          const ear = buildRegexPart(ea.trim(), false);
          if (ebr) excLookarounds += `(?<!${ebr})`;
          if (ear) excLookarounds += `(?!${ear})`;
        }
      }

      const lb = beforeRegex ? `(?<=${beforeRegex})` : '';
      const la = afterRegex ? `(?=${afterRegex})` : '';
      const escapeRegExp = (string: string) => string.replace(/[+?^${}()|[\]\\]/g, '\\$&');
      const safeTarget = target ? escapeRegExp(target) : '';

      try {
        if (safeTarget === '') {
          const regex = new RegExp(`${lb}${excLookarounds}${la}`, 'g');
          applyFns.push((w: string) => w.replace(regex, replacement));
        } else {
          const regex = new RegExp(`${lb}${excLookarounds}(${safeTarget})${la}`, 'g');
          applyFns.push((w: string) => w.replace(regex, replacement));
        }
      } catch (err) {
        console.warn("Invalid regex generated for rule:", ruleStr, err);
      }
    }
  }

  return applyFns;
}
