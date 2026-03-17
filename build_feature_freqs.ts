import fs from 'fs';
import { getEffectiveFeatures } from './services/phonetics.ts';
import diachronicaFreqs from './diachronica_freqs.json';

const featureShifts: Record<string, number> = {};

for (const key in diachronicaFreqs) {
  const [source, target] = key.split('>');
  if (!source || !target) continue;

  const count = (diachronicaFreqs as any)[key].count;
  
  const fS = getEffectiveFeatures(source);
  const fT = getEffectiveFeatures(target);
  
  if (!fS || !fT) continue;

  // Calculate delta
  const delta: string[] = [];
  for (const k in fS) {
    if (fS[k as keyof typeof fS] !== fT[k as keyof typeof fT]) {
      delta.push(`${k}:${fT[k as keyof typeof fT]}`);
    }
  }

  if (delta.length > 0) {
    const deltaKey = delta.sort().join(',');
    if (!featureShifts[deltaKey]) {
      featureShifts[deltaKey] = 0;
    }
    featureShifts[deltaKey] += count;
  }
}

fs.writeFileSync('feature_freqs.json', JSON.stringify(featureShifts, null, 2));
console.log(`Saved ${Object.keys(featureShifts).length} feature shifts.`);
