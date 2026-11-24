import { contextBridge, ipcRenderer } from 'electron';
import type {
  MainGenlookStatus,
  MainGenlookSubmitPayload,
  MainGenlookGenerationState,
} from '../main/services/genlookService';

export interface ElectronAPI {
  platform: string;
  version: string;
  getSystemInfo: () => Promise<{
    platform: string;
    electronVersion: string;
    nodeVersion: string;
    appVersion: string;
  }>;
  aiTryOn: {
    getStatus: (fetchCredits?: boolean) => Promise<MainGenlookStatus>;
    submit: (payload: MainGenlookSubmitPayload) => Promise<MainGenlookGenerationState>;
    poll: (generationId: string) => Promise<MainGenlookGenerationState>;
  };
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
}

const electronAPI: ElectronAPI = {
  platform: process.platform,
  version: process.versions.electron,
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),
  aiTryOn: {
    getStatus: (fetchCredits = true) => ipcRenderer.invoke('ai-tryon:get-status', fetchCredits),
    submit: (payload) => ipcRenderer.invoke('ai-tryon:submit', payload),
    poll: (generationId) => ipcRenderer.invoke('ai-tryon:poll', generationId),
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
