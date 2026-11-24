export interface SystemInfo {
  platform: string;
  electronVersion: string;
  nodeVersion: string;
  appVersion: string;
}

export interface GenlookStatusPayload {
  configured: boolean;
  provider: 'genlook';
  baseUrl: string;
  creditBalance?: number;
  error?: string;
}

export interface GenlookSubmitPayload {
  personImageDataUrl: string;
  garment: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    imagePath: string;
  };
  resolution?: 'default' | '2k';
}

export interface GenlookGenerationPayload {
  generationId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  resultImageUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WindowWithElectronAPI {
  electronAPI?: {
    getSystemInfo: () => Promise<SystemInfo>;
    aiTryOn?: {
      getStatus: (fetchCredits?: boolean) => Promise<GenlookStatusPayload>;
      submit: (payload: GenlookSubmitPayload) => Promise<GenlookGenerationPayload>;
      poll: (generationId: string) => Promise<GenlookGenerationPayload>;
    };
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
  };
}

/**
 * Renderer-side client for Electron IPC communication.
 * Gracefully degrades when running in a standard web browser context.
 */
export class IpcClient {
  private static get api() {
    return typeof window !== 'undefined'
      ? (window as unknown as WindowWithElectronAPI).electronAPI
      : undefined;
  }

  static isElectron(): boolean {
    return Boolean(this.api);
  }

  static async getSystemInfo(): Promise<SystemInfo | null> {
    if (this.api) {
      try {
        return await this.api.getSystemInfo();
      } catch (err) {
        console.warn('IpcClient.getSystemInfo failed:', err);
      }
    }
    return null;
  }

  static async getAiTryOnStatus(fetchCredits: boolean = true): Promise<GenlookStatusPayload> {
    if (!this.api?.aiTryOn) {
      return {
        configured: false,
        provider: 'genlook',
        baseUrl: 'https://api.genlook.app/tryon/v1',
        error: "L'API Genlook nécessite l'application Desktop Electron.",
      };
    }
    return this.api.aiTryOn.getStatus(fetchCredits);
  }

  static async submitAiTryOn(payload: GenlookSubmitPayload): Promise<GenlookGenerationPayload> {
    if (!this.api?.aiTryOn) {
      throw new Error("L'envoi sécurisé vers Genlook nécessite l'application Desktop Electron.");
    }
    return this.api.aiTryOn.submit(payload);
  }

  static async pollAiTryOn(generationId: string): Promise<GenlookGenerationPayload> {
    if (!this.api?.aiTryOn) {
      throw new Error("Le suivi Genlook nécessite l'application Desktop Electron.");
    }
    return this.api.aiTryOn.poll(generationId);
  }

  static minimizeWindow(): void {
    this.api?.minimize();
  }

  static toggleMaximizeWindow(): void {
    this.api?.toggleMaximize();
  }

  static closeWindow(): void {
    this.api?.close();
  }
}
