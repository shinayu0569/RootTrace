import { BlendedScaEngine } from './blendedSca';

export interface ShiftResult {
  original: string;
  final: string;
  history: { rule: string; before: string; after: string }[];
}

export function applyShifts(words: string[], rulesText: string): ShiftResult[] {
  const engine = new BlendedScaEngine();
  try {
    engine.parse(rulesText);
  } catch (e) {
    console.error("SCA Parse Error:", e);
    return words.map(w => ({ original: w, final: w, history: [] }));
  }

  const results = engine.apply(words);
  return results.map(res => ({
    original: res.original,
    final: res.final,
    history: res.history
  }));
}
