export interface SystemInfo {
  platform: string;
  electronVersion: string;
  nodeVersion: string;
  appVersion: string;
}

/**
 * Renderer-side client for Electron IPC communication.
 * Gracefully degrades when running in a standard web browser context.
 */
export class IpcClient {
  static isElectron(): boolean {
    return typeof window !== 'undefined' && 'electronAPI' in window;
  }

  static async getSystemInfo(): Promise<SystemInfo | null> {
    if (this.isElectron()) {
      try {
        return await (window as unknown as { electronAPI: { getSystemInfo: () => Promise<SystemInfo> } }).electronAPI.getSystemInfo();
      } catch (err) {
        console.warn('IpcClient.getSystemInfo failed:', err);
      }
    }
    return null;
  }

  static minimizeWindow(): void {
    if (this.isElectron()) {
      (window as unknown as { electronAPI: { minimize: () => void } }).electronAPI.minimize();
    }
  }

  static toggleMaximizeWindow(): void {
    if (this.isElectron()) {
      (window as unknown as { electronAPI: { toggleMaximize: () => void } }).electronAPI.toggleMaximize();
    }
  }

  static closeWindow(): void {
    if (this.isElectron()) {
      (window as unknown as { electronAPI: { close: () => void } }).electronAPI.close();
    }
  }
}
