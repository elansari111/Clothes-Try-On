import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ELECTRON_CONFIG } from '../../config/index';

const currentDir =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: ELECTRON_CONFIG.defaultWidth,
    height: ELECTRON_CONFIG.defaultHeight,
    minWidth: ELECTRON_CONFIG.minWidth,
    minHeight: ELECTRON_CONFIG.minHeight,
    backgroundColor: ELECTRON_CONFIG.backgroundColor,
    title: ELECTRON_CONFIG.appName,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(currentDir, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(currentDir, '../../dist/index.html'));
  }

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[Electron preload-error]', preloadPath, error);
  });

  mainWindow.webContents.on('console-message', (details) => {
    if (details.level === 'error') {
      console.error(`[Renderer Error] ${details.message} (${details.sourceId}:${details.lineNumber})`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
