/**
 * Script to populate phoible_segments.json from FEATURE_MAP
 * Run with: node scripts/build_phoible.js
 */

const fs = require('fs');
const path = require('path');

// Read the phonetics.ts file to extract FEATURE_MAP
const phoneticsPath = path.join(__dirname, '../services/phonetics.ts');
const phoneticsContent = fs.readFileSync(phoneticsPath, 'utf-8');

// Extract FEATURE_MAP content using regex
const featureMapMatch = phoneticsContent.match(/export const FEATURE_MAP[\s\S]*?^};/m);
if (!featureMapMatch) {
  console.error('Could not find FEATURE_MAP in phonetics.ts');
  process.exit(1);
}

const featureMapCode = featureMapMatch[0];

// Parse the FEATURE_MAP entries
// Pattern: 'symbol': f({ feature: value, ... }),
const entryRegex = /'([^']+)':\s*f\(\{([^}]+)\}\)/g;
const entries = {};

let match;
while ((match = entryRegex.exec(featureMapCode)) !== null) {
  const symbol = match[1];
  const featuresStr = match[2];
  
  // Parse features
  const features = {};
  
  // Default all features to false
  const allFeatures = [
    'syllabic', 'consonantal', 'sonorant', 'voice', 'spreadGlottis', 
    'constrictedGlottis', 'continuant', 'nasal', 'strident', 'lateral',
    'delayedRelease', 'labial', 'coronal', 'dorsal', 'pharyngeal', 'laryngeal',
    'alveolar', 'palatal', 'velar', 'uvular', 'glottal', 'retroflex',
    'high', 'mid', 'low', 'front', 'central', 'back', 'round', 'tense',
    'labialized', 'palatalized', 'velarized', 'pharyngealized', 'long', 'stress'
  ];
  
  allFeatures.forEach(f => features[f] = false);
  features.tone = 0;
  
  // Parse the feature assignments from the f({...}) call
  const featureRegex = /(\w+):\s*(true|false)/g;
  let featureMatch;
  while ((featureMatch = featureRegex.exec(featuresStr)) !== null) {
    const featureName = featureMatch[1];
    const featureValue = featureMatch[2] === 'true';
    if (allFeatures.includes(featureName)) {
      features[featureName] = featureValue;
    }
  }
  
  entries[symbol] = features;
}

console.log(`Extracted ${Object.keys(entries).length} segments from FEATURE_MAP`);

// Write to phoible_segments.json
const outputPath = path.join(__dirname, '../public/phoible_segments.json');
fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));

console.log(`Written to ${outputPath}`);
