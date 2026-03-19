
import { DistinctiveFeatures } from '../types';

/**
 * Singleton for managing the PHOIBLE feature data.
 * In a real app, this would be pre-processed from the PHOIBLE CSV.
 */
class FeatureMatrix {
  private static instance: FeatureMatrix;
  private matrix: Record<string, DistinctiveFeatures> = {};

  private constructor() {}

  public static getInstance(): FeatureMatrix {
    if (!FeatureMatrix.instance) {
      FeatureMatrix.instance = new FeatureMatrix();
    }
    return FeatureMatrix.instance;
  }

  public async init() {
    try {
      const response = await fetch('/phoible_segments.json');
      if (response.ok) {
        this.matrix = await response.json();
      }
    } catch (e) {
      console.error('Failed to load PHOIBLE segments:', e);
    }
  }

  public getFeatures(symbol: string): DistinctiveFeatures | undefined {
    return this.matrix[symbol];
  }

  public getAllSymbols(): string[] {
    return Object.keys(this.matrix);
  }

  public getMatrix(): Record<string, DistinctiveFeatures> {
    return this.matrix;
  }
}

export const featureMatrix = FeatureMatrix.getInstance();
