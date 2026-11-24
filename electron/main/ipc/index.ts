import { ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getMainWindow } from '../windows/mainWindow';
import {
  mainGenlookService,
  type MainGenlookSubmitPayload,
} from '../services/genlookService';

export interface SystemInfoPayload {
  platform: string;
  electronVersion: string;
  nodeVersion: string;
  appVersion: string;
}

/**
 * Register secure IPC handlers with strict argument validation
 */
export function registerIpcHandlers(): void {
  // Query system information
  ipcMain.handle('app:get-system-info', (): SystemInfoPayload => {
    return {
      platform: process.platform,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      appVersion: app.getVersion(),
    };
  });

  // Cloud AI Try-On (Genlook API kept strictly in main process)
  ipcMain.handle('ai-tryon:get-status', async (_event, fetchCredits: boolean = true) => {
    return mainGenlookService.getStatus(Boolean(fetchCredits));
  });

  ipcMain.handle('ai-tryon:submit', async (_event, payload: MainGenlookSubmitPayload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid AI Try-On submission payload.');
    }
    return mainGenlookService.submitTryOn(payload);
  });

  ipcMain.handle('ai-tryon:poll', async (_event, generationId: string) => {
    if (typeof generationId !== 'string' || !generationId.trim()) {
      throw new Error('Invalid generationId.');
    }
    return mainGenlookService.pollGeneration(generationId);
  });

  // Load local MediaPipe pose model bytes safely (supports file:// production builds)
  ipcMain.handle('mediapipe:load-model', async (): Promise<Uint8Array | null> => {
    const candidates = [
      path.join(process.cwd(), 'public', 'models', 'pose_landmarker_lite.task'),
      path.join(app.getAppPath(), 'dist', 'models', 'pose_landmarker_lite.task'),
      path.join(app.getAppPath(), 'public', 'models', 'pose_landmarker_lite.task'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const buf = await fs.promises.readFile(candidate);
        return new Uint8Array(buf);
      }
    }
    return null;
  });

  // Window control actions
  ipcMain.on('window:minimize', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  ipcMain.on('window:toggle-maximize', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });
}
