import fs from 'fs';

const parsed = JSON.parse(fs.readFileSync('parsed_rules.json', 'utf-8'));

const freqMap = {};

for (const rule of parsed) {
  const s = rule.source;
  const t = rule.target;
  if (!s || !t) continue;
  
  const key = `${s}>${t}`;
  if (!freqMap[key]) {
    freqMap[key] = { count: 0, envs: [] };
  }
  freqMap[key].count++;
  if (rule.left || rule.right) {
    freqMap[key].envs.push({ l: rule.left, r: rule.right });
  }
}

// Keep only the most common ones or just store the counts to save space
const optimized = {};
for (const key in freqMap) {
  optimized[key] = {
    count: freqMap[key].count,
    envs: freqMap[key].envs
  };
}

fs.writeFileSync('diachronica_freqs.json', JSON.stringify(optimized));
console.log(`Saved ${Object.keys(optimized).length} unique shifts.`);
