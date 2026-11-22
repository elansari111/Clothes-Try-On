import { AITryOnProvider, TryOnJob, TryOnGenerationOptions } from '../../types/aiTryOn';

/**
 * Genlook Cloud AI Virtual Try-On Provider
 * Prepared architecture skeleton ready for API credentials & integration in the next phase.
 */
export class GenlookProvider implements AITryOnProvider {
  readonly id = 'genlook';
  readonly name = 'Genlook AI';

  get isConfigured(): boolean {
    // Verified when environment API key is configured
    return false;
  }

  async submitJob(
    _personImage: Blob | string,
    _garmentImage: Blob | string,
    _options?: TryOnGenerationOptions
  ): Promise<TryOnJob> {
    const jobId = `genlook-${Date.now()}`;
    return {
      id: jobId,
      provider: this.id,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async pollJobStatus(jobId: string): Promise<TryOnJob> {
    return {
      id: jobId,
      provider: this.id,
      status: 'idle',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelJob(_jobId: string): Promise<boolean> {
    return true;
  }
}

export const genlookProvider = new GenlookProvider();
