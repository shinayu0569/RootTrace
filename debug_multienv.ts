import { BlendedScaEngine } from './services/blendedSca';

const engine = new BlendedScaEngine();
const rules = 'n > m / _p, _t';
console.log('Testing rule:', rules);

const errors = engine.parse(rules);
console.log('Parse errors:', errors);

const result = engine.apply(['nap', 'nat']);
console.log('Input: nap, nat');
console.log('Output:', result.map(r => r.final));
console.log('Expected: map, mat');

// Check internal state
const internal = (engine as any);
if (internal.rules.length > 0) {
  const rule = internal.rules[0];
  console.log('\nRule name:', rule.name);
  console.log('Stages:', rule.stages.length);
  if (rule.stages[0]) {
    const stage = rule.stages[0];
    console.log('SubRules:', stage.subRules.length);
    stage.subRules.forEach((sr: any, i: number) => {
      console.log(`\nSubRule ${i}:`);
      console.log('  match:', sr.match);
      console.log('  replacement:', sr.replacement);
      console.log('  environments:', sr.environments);
      console.log('  exceptions:', sr.exceptions);
    });
  }
}
