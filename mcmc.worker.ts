/**
 * MCMC Web Worker — Runs Bayesian MCMC sampling off the main thread
 * 
 * This worker handles computationally intensive MCMC reconstruction,
 * preventing UI blocking during long reconstructions.
 */

import { ReconstructionParams, LanguageInput, ReconstructionResult, ReconstructionMethod } from './types';
import { reconstructProtoWord, reconstructBatch } from './services/engine';

interface WorkerMessage {
  id: string;
  type: 'reconstruct' | 'reconstructBatch';
  payload: {
    inputs: LanguageInput[];
    method?: ReconstructionMethod;
    params?: ReconstructionParams;
    cognateSets?: { gloss: string; forms: LanguageInput[] }[];
  };
}

interface WorkerResponse {
  id: string;
  type: 'success' | 'error';
  result?: ReconstructionResult | BatchReconstructionResult;
  error?: string;
}

// Handle incoming messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: ReconstructionResult | BatchReconstructionResult;
    
    const method = payload.method ?? ReconstructionMethod.BAYESIAN_AI;
    const params = payload.params ?? { 
      mcmcIterations: 3000, 
      gapPenalty: 10, 
      unknownCharPenalty: 8 
    };
    
    switch (type) {
      case 'reconstruct':
        result = await reconstructProtoWord(payload.inputs, method, params);
        break;
        
      case 'reconstructBatch':
        if (!payload.cognateSets) {
          throw new Error(' cognateSets required for batch reconstruction');
        }
        result = await reconstructBatch(payload.cognateSets, method, params);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      type: 'success',
      result
    };
    
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err)
    };
    
    self.postMessage(response);
  }
};

// Export for TypeScript module resolution
export {};
