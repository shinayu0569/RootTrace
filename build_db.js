import fs from 'fs';

const rules = JSON.parse(fs.readFileSync('diachronica_rules.json', 'utf-8'));

const parsed = [];

for (const rule of rules) {
  // e.g. "p t k → b d ɡ / V_V"
  // or "p → f"
  
  let text = rule.replace(/<[^>]+>/g, ''); // remove any remaining HTML tags
  
  const parts = text.split(/→|>/);
  if (parts.length < 2) continue;
  
  const sourcePart = parts[0].trim();
  let targetEnvPart = parts[parts.length - 1].trim();
  
  let targetPart = targetEnvPart;
  let envPart = '';
  
  const slashIdx = targetEnvPart.indexOf('/');
  if (slashIdx !== -1) {
    targetPart = targetEnvPart.substring(0, slashIdx).trim();
    envPart = targetEnvPart.substring(slashIdx + 1).trim();
  }
  
  // Split sources and targets by space or comma
  const sources = sourcePart.split(/[\s,]+/).filter(Boolean);
  const targets = targetPart.split(/[\s,]+/).filter(Boolean);
  
  // If multiple sources and targets, pair them up. If one target, apply to all sources.
  const maxLen = Math.max(sources.length, targets.length);
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i].replace(/[()]/g, '');
    const target = (targets[i] || targets[0] || '').replace(/[()]/g, '');
    
    if (!source || !target) continue;
    
    let left = '';
    let right = '';
    
    if (envPart) {
      const envMatch = envPart.match(/(.*)_(.*)/);
      if (envMatch) {
        left = envMatch[1].trim();
        right = envMatch[2].trim();
      }
    }
    
    parsed.push({
      source,
      target,
      left,
      right,
      original: rule
    });
  }
}

fs.writeFileSync('parsed_rules.json', JSON.stringify(parsed, null, 2));
console.log(`Parsed ${parsed.length} individual changes.`);
