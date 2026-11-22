/**
 * Status of an asynchronous Cloud AI Try-On generation job
 */
export type TryOnJobStatus =
  | 'idle'
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

export interface TryOnGenerationOptions {
  category?: string;
  resolution?: 'standard' | 'hd';
  preserveBackground?: boolean;
}

export interface TryOnJob {
  id: string;
  provider: string;
  status: TryOnJobStatus;
  progress: number; // 0 to 100
  personImageUrl?: string;
  garmentImageUrl?: string;
  resultImageUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard interface that all Cloud AI Virtual Try-On providers must implement.
 * Allows seamless switching between Genlook and future AI providers.
 */
export interface AITryOnProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;

  submitJob(
    personImage: Blob | string,
    garmentImage: Blob | string,
    options?: TryOnGenerationOptions
  ): Promise<TryOnJob>;

  pollJobStatus(jobId: string): Promise<TryOnJob>;

  cancelJob?(jobId: string): Promise<boolean>;
}

export interface GenlookConfig {
  endpoint: string;
  apiKey?: string;
}
