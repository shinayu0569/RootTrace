// Test class operations Script syntax conversion
let normalizedScript = 'C-k = s\npataka';

console.log('Input:', normalizedScript);

// Apply the class ops conversion
normalizedScript = normalizedScript.replace(/^([A-Z](?:-[a-zA-Z]+|&!?[A-Z]|&!?\[[^\]]+\]))\s*=\s*(\S+)(\s+(?:propagate|ltr|rtl):)?$/gm, '$1 > $2$3');

console.log('Output:', normalizedScript);

// Test other cases
const tests = [
  'C-k = s',
  'A&B = x',
  'C&!V = y',
  '@stop&[+voice] = z',
];

console.log('\nTest cases:');
for (const test of tests) {
  let result = test;
  result = result.replace(/^([A-Z](?:-[a-zA-Z]+|&!?[A-Z]|&!?\[[^\]]+\]))\s*=\s*(\S+)(\s+(?:propagate|ltr|rtl):)?$/gm, '$1 > $2$3');
  console.log(`  "${test}" => "${result}"`);
}
