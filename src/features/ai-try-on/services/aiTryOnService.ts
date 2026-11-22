import { AITryOnProvider, TryOnJob, TryOnGenerationOptions } from '../types/aiTryOn';
import { genlookProvider } from '../providers/genlook/genlookProvider';
import { jobQueue } from '../jobs/jobQueue';

/**
 * Service managing Virtual Try-On AI Providers and job execution
 */
export class AITryOnService {
  private providers = new Map<string, AITryOnProvider>();
  private activeProviderId: string = 'genlook';

  constructor() {
    this.registerProvider(genlookProvider);
  }

  registerProvider(provider: AITryOnProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): AITryOnProvider | undefined {
    return this.providers.get(id);
  }

  getActiveProvider(): AITryOnProvider {
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      throw new Error(`AI Try-On provider "${this.activeProviderId}" is not registered.`);
    }
    return provider;
  }

  setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot set unknown AI Try-On provider: "${id}"`);
    }
    this.activeProviderId = id;
  }

  async submitTryOn(
    personImage: Blob | string,
    garmentImage: Blob | string,
    options?: TryOnGenerationOptions
  ): Promise<TryOnJob> {
    const provider = this.getActiveProvider();
    const job = await provider.submitJob(personImage, garmentImage, options);
    jobQueue.addJob(job);
    return job;
  }

  async checkStatus(jobId: string): Promise<TryOnJob> {
    const existing = jobQueue.getJob(jobId);
    const provider = existing ? this.getProvider(existing.provider) : this.getActiveProvider();
    if (!provider) {
      throw new Error('No provider available for job status check.');
    }
    const updated = await provider.pollJobStatus(jobId);
    jobQueue.updateJob(jobId, updated);
    return updated;
  }
}

export const aiTryOnService = new AITryOnService();
