import { useRef, useCallback, useState, useEffect } from 'react';
import { LanguageInput, ReconstructionResult, ReconstructionMethod, ReconstructionParams } from './types';

interface BatchReconstructionResult {
  protoLanguage: string;
  individualResults: Map<string, ReconstructionResult>;
  accumulatedCorrespondences: { [columnKey: string]: { [phoneme: string]: number } };
  regularityScores: Map<string, number>;
}

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

type WorkerStatus = 'idle' | 'loading' | 'error';

interface UseMCMCWorkerReturn {
  result: ReconstructionResult | BatchReconstructionResult | null;
  status: WorkerStatus;
  error: string | null;
  isProcessing: boolean;
  progress: number;
  reconstruct: (inputs: LanguageInput[], method?: ReconstructionMethod, params?: ReconstructionParams) => void;
  reconstructBatch: (cognateSets: { gloss: string; forms: LanguageInput[] }[], method?: ReconstructionMethod, params?: ReconstructionParams) => void;
  cancel: () => void;
}

/**
 * React hook for running MCMC reconstruction in a Web Worker.
 * Keeps the UI responsive during long computations.
 */
export function useMCMCWorker(): UseMCMCWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }>>(new Map());
  
  const [result, setResult] = useState<ReconstructionResult | BatchReconstructionResult | null>(null);
  const [status, setStatus] = useState<WorkerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker from the module
    const worker = new Worker(new URL('./mcmc.worker.ts', import.meta.url), {
      type: 'module'
    });
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, type, result: workerResult, error: workerError } = event.data;
      
      // Update progress simulation
      setProgress(100);
      
      if (type === 'success') {
        setResult(workerResult || null);
        setStatus('idle');
        setError(null);
      } else {
        setError(workerError || 'Unknown worker error');
        setStatus('error');
      }
      
      // Clean up pending promise
      const pending = pendingRef.current.get(id);
      if (pending) {
        if (type === 'success') {
          pending.resolve(workerResult);
        } else {
          pending.reject(new Error(workerError));
        }
        pendingRef.current.delete(id);
      }
      
      setCurrentId(null);
    };
    
    worker.onerror = (err) => {
      setError(err.message);
      setStatus('error');
      setProgress(0);
    };
    
    workerRef.current = worker;
    
    return () => {
      worker.terminate();
    };
  }, []);

  // Simulate progress while processing
  useEffect(() => {
    if (status !== 'loading') {
      setProgress(0);
      return;
    }
    
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += Math.random() * 15;
      if (progressValue > 90) progressValue = 90; // Cap at 90 until complete
      setProgress(Math.floor(progressValue));
    }, 300);
    
    return () => clearInterval(interval);
  }, [status]);

  const reconstruct = useCallback((
    inputs: LanguageInput[],
    method?: ReconstructionMethod,
    params?: ReconstructionParams
  ) => {
    if (!workerRef.current) {
      setError('Worker not initialized');
      return;
    }
    
    const id = `reconstruct-${Date.now()}-${Math.random()}`;
    setCurrentId(id);
    setStatus('loading');
    setError(null);
    setProgress(0);
    
    const message: WorkerMessage = {
      id,
      type: 'reconstruct',
      payload: { inputs, method, params }
    };
    
    workerRef.current.postMessage(message);
  }, []);

  const reconstructBatch = useCallback((
    cognateSets: { gloss: string; forms: LanguageInput[] }[],
    method?: ReconstructionMethod,
    params?: ReconstructionParams
  ) => {
    if (!workerRef.current) {
      setError('Worker not initialized');
      return;
    }
    
    const id = `batch-${Date.now()}-${Math.random()}`;
    setCurrentId(id);
    setStatus('loading');
    setError(null);
    setProgress(0);
    
    const message: WorkerMessage = {
      id,
      type: 'reconstructBatch',
      payload: { inputs: [], cognateSets, method, params }
    };
    
    workerRef.current.postMessage(message);
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current && currentId) {
      // Terminate and recreate worker to cancel ongoing computation
      workerRef.current.terminate();
      
      const newWorker = new Worker(new URL('./mcmc.worker.ts', import.meta.url), {
        type: 'module'
      });
      
      newWorker.onmessage = workerRef.current.onmessage;
      newWorker.onerror = workerRef.current.onerror;
      
      workerRef.current = newWorker;
      
      setStatus('idle');
      setProgress(0);
      setCurrentId(null);
      setError('Computation cancelled');
    }
  }, [currentId]);

  return {
    result,
    status,
    error,
    isProcessing: status === 'loading',
    progress,
    reconstruct,
    reconstructBatch,
    cancel
  };
}
