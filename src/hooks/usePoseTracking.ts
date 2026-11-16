import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseTrackingStatus, PoseFrameResult, BodyMeasurements, PoseEngineConfig } from '../types/pose';
import { poseEngineService } from '../engines/pose/poseEngineService';
import { drawSkeleton } from '../engines/pose/skeletonRenderer';

export interface UsePoseTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  isMirrored?: boolean;
  showSkeleton?: boolean;
}

export function usePoseTracking({
  videoRef,
  canvasRef,
  isCameraActive,
  isMirrored = true,
  showSkeleton = true,
}: UsePoseTrackingOptions) {
  const [status, setStatus] = useState<PoseTrackingStatus>('no_person');
  const [delegate, setDelegate] = useState<'GPU' | 'CPU'>('GPU');
  const [fps, setFps] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);

  // References for non-react render loop performance
  const animFrameIdRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());
  const consecutiveMissesRef = useRef<number>(0);

  // Expose current frame result via ref for zero-latency access by other engines
  const latestFrameResultRef = useRef<PoseFrameResult | null>(null);

  /**
   * Initializes the pose landmarker model
   */
  const initEngine = useCallback(async (customConfig?: Partial<PoseEngineConfig>) => {
    setStatus('initializing');
    try {
      await poseEngineService.initialize(customConfig);
      setDelegate(poseEngineService.getDelegate());
      setStatus('no_person');
    } catch (err) {
      console.error('Failed to initialize pose engine:', err);
      setStatus('error');
    }
  }, []);

  /**
   * Main animation frame loop
   */
  const startTrackingLoop = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const loop = (timestamp: number) => {
      if (!isRunningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && canvas) {
        // Sync canvas internal resolution with video native resolution
        if (video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Process frame with MediaPipe
          const result = poseEngineService.processVideoFrame(video, timestamp);

          // Clear canvas before each frame
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result && result.landmarks && result.landmarks.length > 0) {
            consecutiveMissesRef.current = 0;
            latestFrameResultRef.current = result;

            // Render skeleton directly over the canvas
            if (showSkeleton) {
              drawSkeleton(ctx, result.landmarks, canvas.width, canvas.height, {
                isMirrored,
                showLandmarks: true,
                showConnections: true,
              });
            }

            // Update measurements and confidence at throttled rate (every 5 frames to avoid React overhead)
            if (frameCountRef.current % 5 === 0) {
              setStatus('active');
              setConfidence(result.confidence);
              setMeasurements(result.measurements);
            }
          } else {
            consecutiveMissesRef.current++;
            if (consecutiveMissesRef.current > 15) {
              // No body in frame for ~0.5s
              setStatus('no_person');
              setConfidence(0);
              latestFrameResultRef.current = null;
            } else if (consecutiveMissesRef.current > 5) {
              setStatus('lost');
            }
          }
        }

        // FPS calculation
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsCalcTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current)));
          frameCountRef.current = 0;
          lastFpsCalcTimeRef.current = now;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [videoRef, canvasRef, showSkeleton, isMirrored]);

  /**
   * Stop tracking loop
   */
  const stopTrackingLoop = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setFps(0);
    setConfidence(0);
    setStatus('no_person');
  }, [canvasRef]);

  // Handle camera active state transitions
  useEffect(() => {
    let isCancelled = false;

    if (isCameraActive) {
      initEngine().then(() => {
        if (!isCancelled) {
          startTrackingLoop();
        }
      });
    } else {
      stopTrackingLoop();
    }

    return () => {
      isCancelled = true;
      stopTrackingLoop();
    };
  }, [isCameraActive, initEngine, startTrackingLoop, stopTrackingLoop]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopTrackingLoop();
      poseEngineService.close();
    };
  }, [stopTrackingLoop]);

  return {
    status,
    delegate,
    fps,
    confidence,
    measurements,
    latestFrameResultRef,
  };
}
