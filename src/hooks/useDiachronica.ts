import { useState, useCallback, useEffect } from 'react';
import { queryDiachronica, getAttestedShiftInfo, DiachronicaSearchResult, AttestedShiftInfo } from '../../services/diachronicaApi';

interface UseDiachronicaQueryOptions {
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * React hook for querying Index Diachronica sound changes
 */
export function useDiachronicaQuery(
  protoPhoneme: string,
  reflexPhoneme: string,
  options: UseDiachronicaQueryOptions = {}
) {
  const { enabled = true, debounceMs = 300 } = options;
  const [result, setResult] = useState<DiachronicaSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !protoPhoneme || !reflexPhoneme) {
      setResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await queryDiachronica(protoPhoneme, reflexPhoneme);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [protoPhoneme, reflexPhoneme, enabled, debounceMs]);

  return { result, loading, error };
}

interface UseDiachronicaAttestationOptions {
  enabled?: boolean;
  leftContext?: string | null;
  rightContext?: string | null;
}

/**
 * React hook for checking if a sound change is attested with context
 */
export function useDiachronicaAttestation(
  protoPhoneme: string,
  reflexPhoneme: string,
  options: UseDiachronicaAttestationOptions = {}
) {
  const { enabled = true, leftContext = null, rightContext = null } = options;
  const [info, setInfo] = useState<AttestedShiftInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkAttestation = useCallback(async () => {
    if (!protoPhoneme || !reflexPhoneme) {
      setInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getAttestedShiftInfo(protoPhoneme, reflexPhoneme, leftContext, rightContext);
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [protoPhoneme, reflexPhoneme, leftContext, rightContext]);

  useEffect(() => {
    if (enabled) {
      checkAttestation();
    }
  }, [enabled, checkAttestation]);

  return { info, loading, error, refetch: checkAttestation };
}

/**
 * Hook for batch prefetching attestation data
 */
export function useDiachronicaPrefetch() {
  const [prefetching, setPrefetching] = useState(false);

  const prefetch = useCallback(async (pairs: Array<{ proto: string; reflex: string }>) => {
    setPrefetching(true);
    
    try {
      const { prefetchAttestedShifts } = await import('../../services/engine');
      await prefetchAttestedShifts(
        pairs.map(({ proto, reflex }) => ({
          proto,
          reflexes: [{ phoneme: reflex, left: null, right: null }]
        }))
      );
    } finally {
      setPrefetching(false);
    }
  }, []);

  return { prefetch, prefetching };
}
