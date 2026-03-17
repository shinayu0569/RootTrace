import fs from 'fs';

const html = fs.readFileSync('diachronica.html', 'utf-8');
const regex = /<p class="schg"[^>]*>(.*)$/gm;
let match;
const rules = [];

while ((match = regex.exec(html)) !== null) {
  let text = match[1].replace(/<[^>]+>/g, '').trim();
  // text looks like: "p → f / V_V" or "p t k → b d ɡ / V_V"
  // Let's just store the raw text for now, or try to parse it
  rules.push(text);
}

fs.writeFileSync('diachronica_rules.json', JSON.stringify(rules, null, 2));
console.log(`Extracted ${rules.length} rules.`);
