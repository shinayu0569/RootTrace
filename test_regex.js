// Test the regex
const word = 'nap';

console.log('Word:', word);

// Test with u flag
const regex1 = /n(?=p)/gu;
console.log('Regex with u flag:', regex1);
const m1 = regex1.exec(word);
console.log('Match with u flag:', m1);

// Test without u flag
const regex2 = /n(?=p)/g;
console.log('Regex without u flag:', regex2);
const m2 = regex2.exec(word);
console.log('Match without u flag:', m2);

// Test simple pattern
const regex3 = /n/g;
console.log('Simple regex /n/g:', regex3);
const m3 = regex3.exec(word);
console.log('Match simple:', m3);

// Test lookahead manually
const regex4 = new RegExp('n(?=p)', 'gu');
console.log('Constructed regex:', regex4);
const m4 = regex4.exec(word);
console.log('Match constructed:', m4);

// Try replace
const result = word.replace(regex2, 'm');
console.log('Replace result:', result);
