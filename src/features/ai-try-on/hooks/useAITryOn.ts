import { useState, useCallback } from 'react';
import { TryOnJob, TryOnGenerationOptions } from '../types/aiTryOn';
import { aiTryOnService } from '../services/aiTryOnService';

export function useAITryOn() {
  const [activeJob, setActiveJob] = useState<TryOnJob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const submitJob = useCallback(
    async (
      personImage: Blob | string,
      garmentImage: Blob | string,
      options?: TryOnGenerationOptions
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const job = await aiTryOnService.submitTryOn(personImage, garmentImage, options);
        setActiveJob(job);
        return job;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to submit AI Try-On job';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    activeJob,
    isLoading,
    error,
    submitJob,
  };
}
