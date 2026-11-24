import { useState, useCallback, useEffect, useRef } from 'react';
import { ProviderStatus, TryOnJob, TryOnGenerationOptions } from '../types/aiTryOn';
import { aiTryOnService } from '../services/aiTryOnService';

export function useAITryOn() {
  const [activeJob, setActiveJob] = useState<TryOnJob | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const refreshStatus = useCallback(async (fetchCredits: boolean = true) => {
    try {
      const status = await aiTryOnService.getProviderStatus(fetchCredits);
      if (!cancelledRef.current) {
        setProviderStatus(status);
      }
      return status;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de vérifier Genlook.';
      if (!cancelledRef.current) {
        setProviderStatus({ configured: false, provider: 'genlook', error: msg });
      }
      return null;
    }
  }, []);

  const submitJob = useCallback(
    async (
      personImage: Blob | string,
      garmentImage: Blob | string,
      options?: TryOnGenerationOptions
    ) => {
      setIsLoading(true);
      setError(null);
      cancelledRef.current = false;

      try {
        let job = await aiTryOnService.submitTryOn(personImage, garmentImage, options);
        if (cancelledRef.current) return null;
        setActiveJob(job);

        // Poll until terminal status (max ~90s)
        const startTime = Date.now();
        while (
          !cancelledRef.current &&
          job.status !== 'completed' &&
          job.status !== 'failed' &&
          Date.now() - startTime < 90_000
        ) {
          await new Promise((r) => setTimeout(r, 1200));
          if (cancelledRef.current) break;
          job = await aiTryOnService.checkStatus(job.id);
          if (!cancelledRef.current) {
            setActiveJob(job);
          }
        }

        if (job.status === 'failed') {
          setError(job.error || 'La génération AI Try-On a échoué.');
        } else if (job.status === 'completed') {
          void refreshStatus(true);
        }

        return job;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la requête Genlook.';
        if (!cancelledRef.current) {
          setError(msg);
          setActiveJob((prev) => (prev ? { ...prev, status: 'failed', error: msg } : null));
        }
        return null;
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
        }
      }
    },
    [refreshStatus]
  );

  const resetJob = useCallback(() => {
    cancelledRef.current = true;
    setActiveJob(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return {
    activeJob,
    providerStatus,
    isLoading,
    error,
    refreshStatus,
    submitJob,
    resetJob,
  };
}
