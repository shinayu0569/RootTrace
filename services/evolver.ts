import { findPairwiseSoundChanges } from './engine';
import { generalizeSoundChanges } from './generalizer';
import { applyShifts } from './soundShifter';
import { SoundChangeNote } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

export interface EvolverStep {
  stepName: string;
  soundLaws: string[];
  exceptions?: string[];
  sporadicShifts?: string[];
  words: {
    ancestor: string;
    result: string;
    changes: string[];
  }[];
}

export interface EvolverEdgeResult {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  steps: EvolverStep[];
}

export async function autoEvolveEdge(
  sourceName: string,
  targetName: string,
  sourceWords: string[],
  targetWords: string[],
  subStages: number,
  apiKey: string
): Promise<EvolverStep[]> {
  if (!apiKey) {
    throw new Error("API Key is required for Auto-Evolve.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are a computational historical linguist. 
    Analyze the evolution from ${sourceName} to ${targetName}.
    
    Source Words (${sourceName}):
    ${sourceWords.join(', ')}
    
    Target Words (${targetName}):
    ${targetWords.join(', ')}
    
    Task:
    1. Identify the regular sound laws that transformed the source words into the target words.
    2. If subStages is ${subStages} > 0, hypothesize ${subStages} intermediate stages with their own names and sound laws.
    3. For each word, list the specific changes it underwent.
    4. Format the output as a JSON array of EvolverStep objects.
    
    EvolverStep Schema:
    {
      "stepName": string,
      "soundLaws": string[],
      "exceptions": string[],
      "sporadicShifts": string[],
      "words": [
        {
          "ancestor": string,
          "result": string,
          "changes": string[]
        }
      ]
    }
    
    Return ONLY the JSON array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stepName: { type: Type.STRING },
            soundLaws: { type: Type.ARRAY, items: { type: Type.STRING } },
            exceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            sporadicShifts: { type: Type.ARRAY, items: { type: Type.STRING } },
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ancestor: { type: Type.STRING },
                  result: { type: Type.STRING },
                  changes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["ancestor", "result", "changes"]
              }
            }
          },
          required: ["stepName", "soundLaws", "words"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("The AI returned an invalid evolution model. Please try again.");
  }
}

export async function algorithmicEvolveEdge(
  sourceName: string,
  targetName: string,
  sourceWords: string[],
  targetWords: string[],
  subStages: number
): Promise<EvolverStep[]> {
  const allChanges: SoundChangeNote[] = [];
  const wordPairs = sourceWords.map((sw, i) => ({ source: sw, target: targetWords[i] || sw, index: i }));
  
  const params = { mcmcIterations: 1000, gapPenalty: 10, unknownCharPenalty: 8 };
  
  // 1. Find pairwise sound changes
  for (const pair of wordPairs) {
    const changes = findPairwiseSoundChanges(pair.source, pair.target, targetName, params);
    // Tag changes with word index so we know where they came from
    changes.forEach(c => allChanges.push({ ...c, language: `${pair.index}` }));
  }

  // 2. Generalize into laws
  const laws = generalizeSoundChanges(allChanges, []);

  // 3. Statistical Thresholding (Phase 4)
  const regularLaws: string[] = [];
  const exceptions: string[] = [];
  const sporadicShifts: string[] = [];

  for (const law of laws) {
    if (!law.ruleString) continue;
    
    // Find how many valid environments exist
    const shiftResults = applyShifts(sourceWords, law.ruleString);
    let validEnvironments = 0;
    let actualApplications = 0;
    
    for (let i = 0; i < sourceWords.length; i++) {
      const predicted = shiftResults[i];
      const changed = predicted.history.length > 0;
      
      if (changed) {
        validEnvironments++;
        // Did it actually apply? Check if this word's pairwise changes included this law's components
        const wordChanges = allChanges.filter(c => c.language === `${i}`);
        // A simple heuristic: if the predicted word is closer to the target word, or if the exact change is in wordChanges
        // Let's check if the exact change is in wordChanges
        const applied = wordChanges.some(c => 
          law.examples.includes(`*${c.from} > ${c.to} / ${c.environment}`)
        );
        
        if (applied) {
          actualApplications++;
        } else {
          exceptions.push(`Word '${sourceWords[i]}' should have undergone '${law.ruleString}' but didn't (Exception / Possible Borrowing).`);
        }
      }
    }

    if (validEnvironments > 0) {
      const rate = actualApplications / validEnvironments;
      law.applicationRate = rate;
      
      if (rate >= 0.95) {
        regularLaws.push(law.ruleString);
      } else if (rate < 0.15) {
        law.isSporadic = true;
        // Classify sporadic shift
        let classification = "Sporadic Shift";
        const parts = law.ruleString.split('/');
        if (parts.length === 2) {
          const [changePart, envPart] = parts;
          const [fromPart, toPart] = changePart.split('>');
          if (fromPart && toPart && envPart) {
            const fromChars = fromPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            const toChars = toPart.match(/[a-zæœɑɒɔɛɪʊʌəθðʃʒɣɲŋɾɹ]/gi) || [];
            
            const isDissimilation = fromChars.some(c => envPart.includes(c));
            const isAssimilation = toChars.some(c => envPart.includes(c));
            
            if (isDissimilation) classification = "Sporadic Dissimilation";
            else if (isAssimilation) classification = "Sporadic Assimilation";
            else classification = "Analogical Leveling";
          }
        }
        sporadicShifts.push(`${law.ruleString} (${classification})`);
      } else {
        // Between 15% and 95%, maybe a regular law with many exceptions, or a dialectal borrowing
        regularLaws.push(law.ruleString);
      }
    }
  }

  // 4. Build the steps
  // For algorithmic, we just output one step for now, or divide by stage if we have stages
  const stepName = `Evolution to ${targetName}`;
  const soundLawsToApply = [...regularLaws, ...sporadicShifts.map(s => s.split(' (')[0])];
  
  const finalShiftResults = applyShifts(sourceWords, soundLawsToApply.join('\n'));
  
  const words = sourceWords.map((sw, i) => {
    const res = finalShiftResults[i];
    return {
      ancestor: sw,
      result: res ? res.final : sw,
      changes: res ? res.history.map(h => h.rule) : []
    };
  });

  return [{
    stepName,
    soundLaws: soundLawsToApply,
    exceptions,
    sporadicShifts,
    words
  }];
}

