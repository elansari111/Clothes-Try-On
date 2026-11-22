import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ELECTRON_CONFIG } from '../../config/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      preload: path.join(__dirname, '../../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
