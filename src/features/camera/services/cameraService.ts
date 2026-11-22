import { VideoResolution, RESOLUTION_PRESETS, CameraDeviceInfo } from '../types/camera';

export class CameraService {
  private currentStream: MediaStream | null = null;

  /**
   * Retrieves all available video input devices.
   * If labels are missing (prior to permission grant), attempts a brief probe to obtain labels.
   */
  async getAvailableCameras(): Promise<CameraDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('MediaDevices API non disponible sur cette plateforme.');
    }

    let devices = await navigator.mediaDevices.enumerateDevices();
    let videoDevices = devices.filter((device) => device.kind === 'videoinput');

    // If device labels are blank because permissions haven't been granted yet
    const hasEmptyLabels = videoDevices.some((d) => !d.label);
    if (hasEmptyLabels && !this.currentStream) {
      try {
        const probeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((device) => device.kind === 'videoinput');
        probeStream.getTracks().forEach((track) => track.stop());
      } catch {
        // Permission was denied or probe failed; proceed with deviceId list
      }
    }

    return videoDevices.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Caméra ${index + 1}`,
    }));
  }

  /**
   * Starts video stream with specified constraints
   */
  async startStream(
    deviceId?: string | null,
    resolution: VideoResolution = '1280x720'
  ): Promise<MediaStream> {
    this.stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('La capture vidéo n’est pas supportée dans cet environnement.');
    }

    const resConfig = RESOLUTION_PRESETS[resolution] || RESOLUTION_PRESETS['1280x720'];

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: resConfig.width },
      height: { ideal: resConfig.height },
      frameRate: { ideal: 30, max: 60 },
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    } else {
      videoConstraints.facingMode = 'user';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      this.currentStream = stream;
      return stream;
    } catch (err: unknown) {
      // Graceful fallback if exact constraints or resolution failed
      if (err instanceof OverconstrainedError || (err instanceof DOMException && err.name === 'OverconstrainedError')) {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        });
        this.currentStream = fallbackStream;
        return fallbackStream;
      }
      throw err;
    }
  }

  /**
   * Stops all active tracks on the current stream
   */
  stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.currentStream = null;
    }
  }

  /**
   * Returns active stream
   */
  getStream(): MediaStream | null {
    return this.currentStream;
  }
}

export const cameraService = new CameraService();
