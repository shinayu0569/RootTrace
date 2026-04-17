import { BlendedScaEngine } from './services/blendedSca';

// Patch the applyDirectionalSubRule to add logging
const original = (BlendedScaEngine.prototype as any).applyDirectionalSubRule;
(BlendedScaEngine.prototype as any).applyDirectionalSubRule = function(word: string, subRule: any, options: any) {
  console.log('=== applyDirectionalSubRule ===');
  console.log('Input word:', word);
  console.log('Match:', subRule.match);
  console.log('Replacement:', subRule.replacement);
  console.log('Environments:', subRule.environments);
  console.log('Options:', options);
  
  const result = original.call(this, word, subRule, options);
  console.log('Output word:', result);
  console.log('================================\n');
  return result;
};

const engine = new BlendedScaEngine();
const rules = 'a > o / _t ltr:';
console.log('Rule:', rules);

const errors = engine.parse(rules);
console.log('Errors:', errors.length === 0 ? 'None' : errors);

const result = engine.apply(['pataka']);
console.log('Final Input: pataka');
console.log('Final Output:', result[0].final);
console.log('Expected: potaka');
