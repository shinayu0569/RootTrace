// Test different lookahead scenarios
const tests = [
  ['nap', 'n(?=p)'],
  ['nap', 'n(?=a)'],
  ['n p', 'n(?=p)'],
  ['np', 'n(?=p)'],
  ['hello', 'h(?=e)'],
  ['hello', 'e(?=l)'],
];

for (const [word, pattern] of tests) {
  const regex = new RegExp(pattern, 'g');
  const m = regex.exec(word);
  console.log(`Pattern "${pattern}" on "${word}": ${m ? `Match at ${m.index}` : 'No match'}`);
}

// Test unicode issues
console.log('\nTesting unicode:');
const word1 = 'nap';
const word2 = 'n' + 'a' + 'p';
console.log('Direct:', [...word1].map(c => c.charCodeAt(0)));
console.log('Constructed:', [...word2].map(c => c.charCodeAt(0)));

// Check if there's some hidden character
const word = 'nap';
console.log('\nCharacter analysis:');
for (let i = 0; i < word.length; i++) {
  console.log(`  [${i}] "${word[i]}" code=${word.charCodeAt(i)}`);
}
