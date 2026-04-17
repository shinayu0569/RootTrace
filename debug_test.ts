import { BlendedScaEngine } from './services/blendedSca';

// Test 1: ltr directive
const engine1 = new BlendedScaEngine();
const errors1 = engine1.parse('a > o ltr:');
console.log('Test 1 - ltr:');
console.log('Parse errors:', errors1);
const result1 = engine1.apply(['aaaa']);
console.log('Input: aaaa');
console.log('Output:', result1[0].final);
console.log('Expected: oaaa');
console.log('Pass:', result1[0].final === 'oaaa');

console.log('\n---\n');

// Test 2: propagate directive
const engine2 = new BlendedScaEngine();
const errors2 = engine2.parse('a > o propagate:');
console.log('Test 2 - propagate:');
console.log('Parse errors:', errors2);
const result2 = engine2.apply(['aaaa']);
console.log('Input: aaaa');
console.log('Output:', result2[0].final);
console.log('Expected: oooo');
console.log('Pass:', result2[0].final === 'oooo');

console.log('\n---\n');

// Test 3: rtl directive  
const engine3 = new BlendedScaEngine();
const errors3 = engine3.parse('a > o rtl:');
console.log('Test 3 - rtl:');
console.log('Parse errors:', errors3);
const result3 = engine3.apply(['aaaa']);
console.log('Input: aaaa');
console.log('Output:', result3[0].final);
console.log('Expected: aaao');
console.log('Pass:', result3[0].final === 'aaao');

console.log('\n---\n');

// Test 4: combined ltr propagate
const engine4 = new BlendedScaEngine();
const errors4 = engine4.parse('a > o ltr propagate:');
console.log('Test 4 - ltr propagate:');
console.log('Parse errors:', errors4);
const result4 = engine4.apply(['aaaa']);
console.log('Input: aaaa');
console.log('Output:', result4[0].final);
console.log('Expected: oooo');
console.log('Pass:', result4[0].final === 'oooo');

console.log('\n---\n');

// Test 5: Script syntax [propagate]
const engine5 = new BlendedScaEngine();
const errors5 = engine5.parse('a = o [propagate]');
console.log('Test 5 - Script a = o [propagate]:');
console.log('Parse errors:', errors5);
const result5 = engine5.apply(['aaaa']);
console.log('Input: aaaa');
console.log('Output:', result5[0].final);
console.log('Expected: oooo');
console.log('Pass:', result5[0].final === 'oooo');

console.log('\n---\n');

// Test 6: ltr with environment
const engine6 = new BlendedScaEngine();
const rules6 = 'a > o / _t ltr:';
console.log('Test 6 - ltr with environment:');
console.log('Rule:', rules6);
const errors6 = engine6.parse(rules6);
console.log('Parse errors:', errors6);

// Debug: Check internal state
const internal6 = (engine6 as any);
console.log('Rules:', internal6.rules.map((r: any) => ({ 
  name: r.name, 
  stages: r.stages.map((s: any) => ({
    subRules: s.subRules.map((sr: any) => ({
      match: sr.match,
      replacement: sr.replacement,
      environments: sr.environments,
      options: sr.options
    })),
    options: s.options
  }))
})));

const result6 = engine6.apply(['pataka']);
console.log('Input: pataka');
console.log('Output:', result6[0].final);
console.log('Expected: potaka');
console.log('Pass:', result6[0].final === 'potaka');
