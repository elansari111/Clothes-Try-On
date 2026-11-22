/**
 * Electron Application Configuration
 */
export const ELECTRON_CONFIG = {
  appId: 'com.virtualtryon.desktop',
  appName: 'Virtual Try-On',
  defaultWidth: 1280,
  defaultHeight: 820,
  minWidth: 980,
  minHeight: 650,
  backgroundColor: '#0c0e14',
  permissions: {
    allowedMediaTypes: ['camera', 'microphone'],
    allowedProtocols: ['file', 'http', 'https'],
  },
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    mediaSrc: ["'self'", 'blob:', 'mediastream:'],
    connectSrc: ["'self'", 'https:', 'blob:'],
  },
};
