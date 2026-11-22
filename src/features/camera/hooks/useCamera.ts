import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraStatus, VideoResolution, CameraDeviceInfo } from '../types/camera';
import { cameraService } from '../services/cameraService';

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('ready');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<VideoResolution>('1280x720');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Parse error messages into user-friendly explanations
  const parseError = (err: unknown): string => {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return "Accès caméra refusé. Veuillez autoriser l'accès à la webcam dans vos paramètres.";
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return 'Aucune caméra détectée sur cet appareil.';
        case 'NotReadableError':
        case 'TrackStartError':
          return 'La caméra est déjà utilisée par une autre application ou est inaccessible.';
        case 'OverconstrainedError':
          return 'La résolution demandée n’est pas supportée par votre caméra.';
        default:
          return `Erreur caméra (${err.name}): ${err.message}`;
      }
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Une erreur inconnue est survenue lors de l’accès à la caméra.';
  };

  // Refresh available devices list
  const refreshDevices = useCallback(async () => {
    try {
      const list = await cameraService.getAvailableCameras();
      setDevices(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  // Start webcam
  const startCamera = useCallback(
    async (targetDeviceId?: string | null, targetResolution?: VideoResolution) => {
      setStatus('initializing');
      setErrorMessage(null);

      const devId = targetDeviceId !== undefined ? targetDeviceId : activeDeviceId;
      const res = targetResolution || resolution;

      try {
        const newStream = await cameraService.startStream(devId, res);
        setStream(newStream);

        // Bind stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {
            // Autoplay might be handled or muted
          });
        }

        // Attach track ended listener to handle unexpected disconnects
        newStream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setStatus('error');
            setErrorMessage('La caméra a été déconnectée.');
            setStream(null);
          };
        });

        // Enumerate devices once permission has been granted to get real labels
        const updatedDevices = await refreshDevices();
        if (!devId && updatedDevices.length > 0) {
          const currentTrack = newStream.getVideoTracks()[0];
          const settings = currentTrack?.getSettings();
          if (settings?.deviceId) {
            setActiveDeviceId(settings.deviceId);
          } else {
            setActiveDeviceId(updatedDevices[0].deviceId);
          }
        }

        setStatus('active');
      } catch (err) {
        const msg = parseError(err);
        setErrorMessage(msg);
        setStatus('error');
        setStream(null);
      }
    },
    [activeDeviceId, resolution, refreshDevices]
  );

  // Stop webcam
  const stopCamera = useCallback(() => {
    cameraService.stopStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setStatus('ready');
    setErrorMessage(null);
  }, []);

  // Restart camera with current or updated params
  const restartCamera = useCallback(
    async (newDeviceId?: string | null, newResolution?: VideoResolution) => {
      stopCamera();
      await startCamera(newDeviceId, newResolution);
    },
    [stopCamera, startCamera]
  );

  // Switch camera device
  const switchDevice = useCallback(
    async (deviceId: string) => {
      setActiveDeviceId(deviceId);
      if (status === 'active' || status === 'initializing') {
        await startCamera(deviceId, resolution);
      }
    },
    [status, resolution, startCamera]
  );

  // Change video resolution
  const changeResolution = useCallback(
    async (newRes: VideoResolution) => {
      setResolution(newRes);
      if (status === 'active') {
        await startCamera(activeDeviceId, newRes);
      }
    },
    [status, activeDeviceId, startCamera]
  );

  // Toggle mirror view
  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    refreshDevices();

    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      cameraService.stopStream();
    };
  }, [refreshDevices]);

  // Ensure stream binding if videoRef changes or on rerender
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return {
    status,
    stream,
    devices,
    activeDeviceId,
    resolution,
    isMirrored,
    errorMessage,
    videoRef,
    startCamera,
    stopCamera,
    restartCamera,
    switchDevice,
    changeResolution,
    toggleMirror,
  };
}
