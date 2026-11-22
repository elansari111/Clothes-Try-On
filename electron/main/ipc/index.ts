import { ipcMain, app } from 'electron';
import { getMainWindow } from '../windows/mainWindow';

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
