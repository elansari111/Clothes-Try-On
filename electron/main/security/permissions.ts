import { session, systemPreferences } from 'electron';

/**
 * Configure secure permission handling for media devices (webcam, microphone)
 */
export function setupSecurity(): void {
  // macOS system media permission check if applicable
  if (process.platform === 'darwin') {
    try {
      void systemPreferences.askForMediaAccess('camera');
    } catch {
      // Ignore if not supported on the platform
    }
  }

  // Handle media device permissions securely in Electron
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    // Deny all other unrestricted permissions by default
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'media') {
      return true;
    }
    return false;
  });
}
