import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  platform: string;
  version: string;
  getSystemInfo: () => Promise<{
    platform: string;
    electronVersion: string;
    nodeVersion: string;
    appVersion: string;
  }>;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
}

const electronAPI: ElectronAPI = {
  platform: process.platform,
  version: process.versions.electron,
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
