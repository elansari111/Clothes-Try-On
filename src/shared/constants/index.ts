export * from './mockData';

export const APP_NAME = 'Virtual Try-On';
export const APP_VERSION = '0.1.0';

export const DEFAULT_CAMERA_RESOLUTIONS = [
  '640x480',
  '1280x720',
  '1920x1080',
] as const;

export const CLOTHING_CATEGORIES = [
  'All',
  'T-Shirts',
  'Shirts',
  'Jackets',
  'Pants',
  'Other',
] as const;
