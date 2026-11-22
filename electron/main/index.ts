import { app, BrowserWindow } from 'electron';
import { setupSecurity } from './security/permissions';
import { registerIpcHandlers } from './ipc/index';
import { createMainWindow } from './windows/mainWindow';

app.whenReady().then(() => {
  setupSecurity();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
