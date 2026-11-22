export type CameraStatus = 'ready' | 'initializing' | 'active' | 'error';

export type VideoResolution = '640x480' | '1280x720' | '1920x1080';

export interface ResolutionConfig {
  label: string;
  width: number;
  height: number;
}

export const RESOLUTION_PRESETS: Record<VideoResolution, ResolutionConfig> = {
  '640x480': { label: '640 x 480 (SD)', width: 640, height: 480 },
  '1280x720': { label: '1280 x 720 (HD)', width: 1280, height: 720 },
  '1920x1080': { label: '1920 x 1080 (FHD)', width: 1920, height: 1080 },
};

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  devices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  resolution: VideoResolution;
  isMirrored: boolean;
  errorMessage: string | null;
}
