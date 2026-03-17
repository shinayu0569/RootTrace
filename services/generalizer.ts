import { SoundChangeNote, InferredShift, GeneralizedSoundLaw, DistinctiveFeatures } from '../types';
import { getEffectiveFeatures } from './phonetics';
import { analyzeFeatureDelta } from './soundChangeDb';
import { scoreFeatureTransition } from './typologyMatrix';

export const generalizeSoundChanges = (
  changes: SoundChangeNote[],
  inferredShifts: InferredShift[]
): GeneralizedSoundLaw[] => {
  const laws: GeneralizedSoundLaw[] = [];
  
  // Group by language and then by feature delta + environment
  const langGroups: Record<string, SoundChangeNote[]> = {};
  changes.forEach(c => {
    if (!langGroups[c.language]) langGroups[c.language] = [];
    langGroups[c.language].push(c);
  });

  for (const [language, langChanges] of Object.entries(langGroups)) {
    const featureGroups: Record<string, {
      changes: SoundChangeNote[],
      delta: Partial<DistinctiveFeatures>,
      env: string,
      typologyName?: string,
      typologyScore?: number
    }> = {};
    
    langChanges.forEach(c => {
      if (c.from === '∅' || c.to === '∅' || c.name === 'Metathesis') return;

      const fP = getEffectiveFeatures(c.from);
      const fR = getEffectiveFeatures(c.to);
      if (!fP || !fR) return;

      const delta: Partial<DistinctiveFeatures> = {};
      const keys = Object.keys(fP) as (keyof DistinctiveFeatures)[];
      let changed = false;
      for (const key of keys) {
        if (fP[key] !== fR[key]) {
          (delta as any)[key] = fR[key];
          changed = true;
        }
      }
      if (!changed) return;

      const parts = c.environment.split(' _ ');
      let genEnv = c.environment;
      let leftF: DistinctiveFeatures | null = null;
      let rightF: DistinctiveFeatures | null = null;

      if (parts.length === 2) {
        const left = parts[0].trim();
        const right = parts[1].trim();
        
        leftF = left === '#' ? null : getEffectiveFeatures(left);
        rightF = right === '#' ? null : getEffectiveFeatures(right);

        const genLeft = left === '#' ? '#' : (leftF?.syllabic ? 'V' : 'C');
        const genRight = right === '#' ? '#' : (rightF?.syllabic ? 'V' : 'C');
        genEnv = `${genLeft} _ ${genRight}`;
      }

      const typology = scoreFeatureTransition(fP, fR, leftF, rightF);
      const key = `${genEnv}|${JSON.stringify(delta)}`;

      if (!featureGroups[key]) {
        featureGroups[key] = {
          changes: [],
          delta,
          env: genEnv,
          typologyName: typology?.name,
          typologyScore: typology?.probability
        };
      }
      featureGroups[key].changes.push(c);
    });

    for (const [key, group] of Object.entries(featureGroups)) {
      // Find examples
      const examples = Array.from(new Set(group.changes.map(c => `*${c.from} > ${c.to} / ${c.environment}`)));
      
      if (examples.length < 2) continue;
      
      // Calculate a rough naturalness score based on inferred shifts if available
      let naturalnessScore = group.typologyScore || 0.5;
      
      // If it's a known rule from the DB, it's generally natural
      if (!group.typologyScore) {
        const knownRuleCount = group.changes.filter(c => c.name !== 'Phonetic Shift' && c.name !== 'Unknown Shift').length;
        if (knownRuleCount > 0) {
          naturalnessScore = 0.8;
        }
      }

      const fP = getEffectiveFeatures(group.changes[0].from);
      const fR = getEffectiveFeatures(group.changes[0].to);
      let name = group.typologyName || 'Phonetic Shift';
      if (!group.typologyName && fP && fR) {
        const changeNames = analyzeFeatureDelta(fP, fR);
        if (changeNames.length > 0) {
          name = changeNames[0].charAt(0).toUpperCase() + changeNames[0].slice(1);
        }
      }

      // Generate rule string
      const uniqueFroms = Array.from(new Set(group.changes.map(c => c.from)));
      const uniqueTos = Array.from(new Set(group.changes.map(c => c.to)));
      
      let ruleString = '';
      if (uniqueFroms.length === 1 && uniqueTos.length === 1) {
        ruleString = `${uniqueFroms[0]} > ${uniqueTos[0]} / ${group.env}`;
      } else {
        // Ensure mapping aligns correctly
        const pairs = Array.from(new Set(group.changes.map(c => `${c.from}|${c.to}`))).map(s => s.split('|'));
        const froms = pairs.map(p => p[0]);
        const tos = pairs.map(p => p[1]);
        ruleString = `{${froms.join(',')}} > {${tos.join(',')}} / ${group.env}`;
      }

      laws.push({
        language,
        name: `${name} in ${group.env}`,
        description: `Generalized rule: ${name} of segments in environment ${group.env}`,
        examples,
        naturalnessScore,
        typologicalCategory: group.typologyName || 'Phonetic Shift',
        ruleString
      });
    }
  }

  // Sort laws by language, then by naturalness score (descending)
  laws.sort((a, b) => {
    if (a.language !== b.language) return a.language.localeCompare(b.language);
    return b.naturalnessScore - a.naturalnessScore;
  });

  // Phase 3: Dependency Graphing (Handling Chain Shifts)
  // For each language, sort laws chronologically using feeding/bleeding orders
  const chronologicallySortedLaws: GeneralizedSoundLaw[] = [];
  const lawsByLang = laws.reduce((acc, law) => {
    if (!acc[law.language]) acc[law.language] = [];
    acc[law.language].push(law);
    return acc;
  }, {} as Record<string, GeneralizedSoundLaw[]>);

  for (const [lang, langLaws] of Object.entries(lawsByLang)) {
    // Extract from/to sets and environment segments for each law
    const lawData = langLaws.map(law => {
      const froms = new Set<string>();
      const tos = new Set<string>();
      const envSegments = new Set<string>();
      
      law.examples.forEach(ex => {
        // Example format: *p > b / V _ V
        const match = ex.match(/^\*([^\s]+)\s*>\s*([^\s]+)\s*\/\s*(.*)$/);
        if (match) {
          froms.add(match[1]);
          tos.add(match[2]);
          
          const env = match[3];
          const envParts = env.split('_').map(p => p.trim());
          envParts.forEach(p => {
            if (p && p !== '#' && p !== 'V' && p !== 'C') {
              // Extract individual segments from environment string
              // This is a bit crude but works for simple environments
              const segments = p.split(/[\s,]+/);
              segments.forEach(s => {
                if (s && s !== '∅') envSegments.add(s);
              });
            }
          });
        }
      });
      return { law, froms, tos, envSegments };
    });

    // Build dependency graph
    // 1. Counter-feeding (Chain Shifts): If Law A's targets intersect with Law B's sources, 
    //    Law B MUST precede Law A to avoid merger if they are distinct.
    // 2. Bleeding: If Law A's targets intersect with Law B's environment,
    //    Law B MUST precede Law A if Law B actually applied.
    const adjList = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    
    for (let i = 0; i < lawData.length; i++) {
      adjList.set(i, []);
      inDegree.set(i, 0);
    }

    for (let i = 0; i < lawData.length; i++) {
      for (let j = 0; j < lawData.length; j++) {
        if (i === j) continue;
        
        const a = lawData[i];
        const b = lawData[j];
        
        let dependencyFound = false;
        
        // Check Counter-feeding (Chain Shift)
        for (const target of a.tos) {
          if (b.froms.has(target)) {
            dependencyFound = true;
            break;
          }
        }
        
        // Check Bleeding (Environment destruction)
        if (!dependencyFound) {
          for (const target of a.tos) {
            if (b.envSegments.has(target)) {
              dependencyFound = true;
              break;
            }
          }
        }
        
        if (dependencyFound) {
          // b must precede a. So edge from b to a (b -> a)
          if (!adjList.get(j)!.includes(i)) {
            adjList.get(j)!.push(i);
            inDegree.set(i, inDegree.get(i)! + 1);
          }
        }
      }
    }

    // Topological sort with stage calculation
    const queue: number[] = [];
    const stages = new Map<number, number>();
    
    for (let i = 0; i < lawData.length; i++) {
      if (inDegree.get(i) === 0) {
        queue.push(i);
        stages.set(i, 1);
      }
    }

    const sortedIndices: number[] = [];
    while (queue.length > 0) {
      // To keep it deterministic and prefer naturalness, sort queue by naturalnessScore (which is original index since it was sorted)
      queue.sort((x, y) => x - y);
      const u = queue.shift()!;
      sortedIndices.push(u);
      
      const currentStage = stages.get(u)!;

      for (const v of adjList.get(u)!) {
        inDegree.set(v, inDegree.get(v)! - 1);
        
        // Update stage of v
        const vStage = stages.get(v) || 1;
        stages.set(v, Math.max(vStage, currentStage + 1));

        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    // If there's a cycle, some nodes won't be in sortedIndices. Just append them.
    for (let i = 0; i < lawData.length; i++) {
      if (!sortedIndices.includes(i)) {
        sortedIndices.push(i);
        stages.set(i, 1); // Default stage for cycles
      }
    }

    sortedIndices.forEach(idx => {
      const law = lawData[idx].law;
      law.stage = stages.get(idx);
      chronologicallySortedLaws.push(law);
    });
  }

  return chronologicallySortedLaws;
};
