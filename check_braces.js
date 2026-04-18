const fs = require('fs');
const code = fs.readFileSync('services/blendedSca.ts', 'utf8');
const lines = code.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const c of line) {
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  if (i >= 1460 && i <= 1490) {
    console.log(`${i+1} d=${depth} ${line.substring(0, 60)}`);
  }
}
