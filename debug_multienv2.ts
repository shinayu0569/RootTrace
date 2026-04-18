import { BlendedScaEngine } from './services/blendedSca';

const engine = new BlendedScaEngine();

// Access the internal method
const internalEngine = engine as any;

// Test buildRegex directly
const match = 'n';
const before = '';
const after = 'p';
const exceptions: string[] = [];

console.log('Testing buildRegex:');
console.log('  match:', match);
console.log('  before:', JSON.stringify(before));
console.log('  after:', JSON.stringify(after));

const result = internalEngine.buildRegex(match, before, after, exceptions);
console.log('  regexStr:', result.regexStr);

// Test with a full word
const word = 'nap';
const regex = new RegExp(result.regexStr, 'gu');
console.log('\nTesting on word "nap":');
console.log('  regex:', regex);
const m = regex.exec(word);
if (m) {
  console.log('  Match found:', m);
} else {
  console.log('  No match');
}

// Now test the actual rule
console.log('\n--- Testing full rule ---');
const errors = engine.parse('n > m / _p');
console.log('Parse errors:', errors);

const result2 = engine.apply(['nap']);
console.log('Input: nap');
console.log('Output:', result2.map(r => r.final));
console.log('Expected: map');
