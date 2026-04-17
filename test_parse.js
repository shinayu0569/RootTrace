// Simple test to check parsing
const text = '_t ltr:';

// Test the regex patterns
const envDirectionOnlyPattern = /(\s*)(ltr|rtl):\s*$/i;
const match = text.match(envDirectionOnlyPattern);

console.log('Input:', text);
console.log('Pattern:', envDirectionOnlyPattern.toString());
console.log('Match:', match);

if (match) {
  console.log('Group 0 (full match):', match[0]);
  console.log('Group 1 (whitespace):', match[1]);
  console.log('Group 2 (direction):', match[2]);
  console.log('Index:', match.index);
  
  const newText = text.slice(0, match.index + (match[1]?.length || 0)).trim();
  console.log('Extracted env:', newText);
}
