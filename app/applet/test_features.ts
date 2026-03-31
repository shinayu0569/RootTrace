import { getPhonemesByFeatures, getEffectiveFeatures } from '../../services/phonetics';

const shFeatures = getEffectiveFeatures('ʃ');
console.log("Features of ʃ:", shFeatures);

const newFeatures = { ...shFeatures, voice: true };
const phonemes = getPhonemesByFeatures(newFeatures);
console.log("Phonemes matching ʃ + voice:", phonemes);
