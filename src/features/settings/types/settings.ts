export interface AppSettings {
  videoResolution: string;
  isMirrored: boolean;
  showSkeleton: boolean;
  showGarment: boolean;
  fpsTarget: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  videoResolution: '1280x720',
  isMirrored: true,
  showSkeleton: false,
  showGarment: true,
  fpsTarget: 60,
};
