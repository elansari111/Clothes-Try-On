import {
  AITryOnProvider,
  ProviderStatus,
  TryOnJob,
  TryOnJobStatus,
  TryOnGenerationOptions,
} from '../../types/aiTryOn';
import { IpcClient } from '../../../../services/communication/ipcClient';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Impossible de lire les données image.'));
    reader.readAsDataURL(blob);
  });
}

function mapGenlookStatus(
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
): { jobStatus: TryOnJobStatus; progress: number } {
  switch (status) {
    case 'PENDING':
      return { jobStatus: 'queued', progress: 25 };
    case 'PROCESSING':
      return { jobStatus: 'processing', progress: 65 };
    case 'COMPLETED':
      return { jobStatus: 'completed', progress: 100 };
    case 'FAILED':
      return { jobStatus: 'failed', progress: 0 };
  }
}

/**
 * Genlook Cloud AI Virtual Try-On Provider
 * Routes requests securely through Electron IPC to the Main Process so API keys stay out of React.
 */
export class GenlookProvider implements AITryOnProvider {
  readonly id = 'genlook';
  readonly name = 'Genlook AI';
  private cachedConfigured = false;

  get isConfigured(): boolean {
    return this.cachedConfigured || IpcClient.isElectron();
  }

  async getStatus(fetchCredits: boolean = true): Promise<ProviderStatus> {
    const status = await IpcClient.getAiTryOnStatus(fetchCredits);
    this.cachedConfigured = status.configured;
    return {
      configured: status.configured,
      provider: status.provider,
      creditBalance: status.creditBalance,
      error: status.error,
    };
  }

  async submitJob(
    personImage: Blob | string,
    garmentImage: Blob | string,
    options?: TryOnGenerationOptions
  ): Promise<TryOnJob> {
    const personImageDataUrl =
      typeof personImage === 'string' ? personImage : await blobToDataUrl(personImage);
    const garmentImagePath =
      typeof garmentImage === 'string' ? garmentImage : await blobToDataUrl(garmentImage);

    const res = await IpcClient.submitAiTryOn({
      personImageDataUrl,
      garment: {
        id: options?.garmentId || 'custom-garment',
        title: options?.garmentTitle || 'Garment',
        description: options?.garmentDescription,
        category: options?.category,
        imagePath: garmentImagePath,
      },
      resolution: options?.resolution || 'default',
    });

    const mapped = mapGenlookStatus(res.status);
    const now = new Date().toISOString();

    return {
      id: res.generationId,
      provider: this.id,
      status: mapped.jobStatus,
      progress: mapped.progress,
      garmentImageUrl: garmentImagePath,
      createdAt: res.createdAt || now,
      updatedAt: res.updatedAt || now,
    };
  }

  async pollJobStatus(jobId: string): Promise<TryOnJob> {
    const res = await IpcClient.pollAiTryOn(jobId);
    const mapped = mapGenlookStatus(res.status);
    const now = new Date().toISOString();

    return {
      id: res.generationId,
      provider: this.id,
      status: mapped.jobStatus,
      progress: mapped.progress,
      resultImageUrl: res.resultImageUrl,
      error: res.errorMessage || (res.errorCode ? `Erreur Genlook: ${res.errorCode}` : undefined),
      createdAt: res.createdAt || now,
      updatedAt: res.updatedAt || now,
    };
  }

  async cancelJob(_jobId: string): Promise<boolean> {
    return true;
  }
}

export const genlookProvider = new GenlookProvider();
