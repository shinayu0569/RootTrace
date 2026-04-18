// Debug the preprocessing
let script = 'n = m / _p, _t';
console.log('Input:', script);

// Apply the same transformations as blendedSca.ts
let normalizedScript = script;

// Handle assignment-style rules: X = Y if ENV  =>  X > Y / ENV
normalizedScript = normalizedScript.replace(/(\S+)\s*=\s*(\S+)\s+if\s+(.+)/g, '$1 > $2 / $3');
console.log('After if conversion:', normalizedScript);

// Handle Script-style rules with environments: X = Y / ENV  =>  X > Y / ENV
normalizedScript = normalizedScript.replace(/^(\S+)\s*=\s*(\S+)\s+\/\s*(.+)$/gm, '$1 > $2 / $3');
console.log('After / conversion:', normalizedScript);

// Handle simple assignment-style rules: X = Y  =>  X > Y
normalizedScript = normalizedScript.replace(/^(\S+)\s*=\s*(\S+)(\s+(?:propagate|ltr|rtl):)?$/gm, '$1 > $2$3');
console.log('After simple conversion:', normalizedScript);

// Normalize arrows
normalizedScript = normalizedScript
  .replace(/\s*=>\s*/g, ' > ');
console.log('Final:', normalizedScript);
