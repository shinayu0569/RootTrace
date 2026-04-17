import { BlendedScaEngine } from './services/blendedSca';

const engine = new BlendedScaEngine();
const rules = 'a > o / _t ltr:';
console.log('Rule:', rules);

const errors = engine.parse(rules);
console.log('Errors:', errors.length === 0 ? 'None' : errors);

// Check internal state
const internal = (engine as any);
const rule = internal.rules[0];
if (rule) {
  console.log('Rule name:', rule.name);
  console.log('Stages:', rule.stages.length);
  const stage = rule.stages[0];
  if (stage && stage.subRules[0]) {
    const sr = stage.subRules[0];
    console.log('SubRule:');
    console.log('  match:', sr.match);
    console.log('  replacement:', sr.replacement);
    console.log('  environments:', sr.environments);
    console.log('  options:', sr.options);
  }
}

const result = engine.apply(['pataka']);
console.log('Input: pataka');
console.log('Output:', result[0].final);
console.log('Expected: potaka');
console.log('Match:', result[0].final === 'potaka' ? 'YES' : 'NO');
