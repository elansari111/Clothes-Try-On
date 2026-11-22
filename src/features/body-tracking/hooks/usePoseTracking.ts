import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseTrackingStatus, PoseFrameResult, BodyMeasurements, PoseEngineConfig } from '../types/pose';
import { ClothingItem } from '../../clothing/types/clothing';
import { TryOnAdjustments, DebugRenderOptions } from '../../live-ar/types/rendering';
import { poseEngineService } from '../services/poseEngineService';
import { drawSkeleton } from '../processors/skeletonRenderer';
import { virtualTryOnEngine, GarmentAssetStatus } from '../../live-ar/engine/virtualTryOnEngine';

export interface UsePoseTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  isMirrored?: boolean;
  showSkeleton?: boolean;
  // Phase 06: Virtual Try-On integration (single unified rAF loop)
  selectedGarment?: ClothingItem | null;
  showGarment?: boolean;
  adjustments?: TryOnAdjustments;
  debugOptions?: DebugRenderOptions;
}

const DEFAULT_ADJUSTMENTS: TryOnAdjustments = {
  scale: 1.0,
  shoulderWidthScale: 1.0,
  garmentWidthScale: 1.0,
  garmentHeightScale: 1.0,
  necklineOffsetY: 0,
  offsetX: 0,
  offsetY: 0,
  rotationOffsetDeg: 0,
  meshWarpStrength: 0.8,
  enableArmOcclusion: false,
  opacity: 0.96,
  enableWarping: true,
};

export function usePoseTracking({
  videoRef,
  canvasRef,
  isCameraActive,
  isMirrored = true,
  showSkeleton = true,
  selectedGarment = null,
  showGarment = true,
  adjustments = DEFAULT_ADJUSTMENTS,
  debugOptions,
}: UsePoseTrackingOptions) {
  const [status, setStatus] = useState<PoseTrackingStatus>('no_person');
  const [delegate, setDelegate] = useState<'GPU' | 'CPU'>('GPU');
  const [fps, setFps] = useState<number>(0);
  const [renderLatencyMs, setRenderLatencyMs] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);
  const [assetStatus, setAssetStatus] = useState<GarmentAssetStatus | null>(null);

  // References for non-react render loop performance (avoids restarting rAF when UI controls change)
  const animFrameIdRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());
  const consecutiveMissesRef = useRef<number>(0);
  const latencyAccumRef = useRef<number>(0);
  const latencySamplesRef = useRef<number>(0);

  // Live mutable config refs read inside rAF without restarting camera/MediaPipe
  const isMirroredRef = useRef<boolean>(isMirrored);
  const showSkeletonRef = useRef<boolean>(showSkeleton);
  const selectedGarmentRef = useRef<ClothingItem | null>(selectedGarment);
  const showGarmentRef = useRef<boolean>(showGarment);
  const adjustmentsRef = useRef<TryOnAdjustments>(adjustments);
  const debugOptionsRef = useRef<DebugRenderOptions | undefined>(debugOptions);

  isMirroredRef.current = isMirrored;
  showSkeletonRef.current = showSkeleton;
  selectedGarmentRef.current = selectedGarment;
  showGarmentRef.current = showGarment;
  adjustmentsRef.current = adjustments;
  debugOptionsRef.current = debugOptions;

  // Expose current frame result via ref for zero-latency access by other engines
  const latestFrameResultRef = useRef<PoseFrameResult | null>(null);

  // Preload & preprocess active garment asset asynchronously whenever garment changes
  useEffect(() => {
    let cancelled = false;
    virtualTryOnEngine.setActiveGarment(selectedGarment).then((info) => {
      if (!cancelled) {
        setAssetStatus(info);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGarment]);

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
   * Unified real-time processing & rendering animation frame loop
   * Layer 0: Native <video> behind canvas
   * Layer 1: Virtual Try-On Garment Overlay
   * Layer 2: Optional MediaPipe Skeleton Overlay
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
          // Process frame with MediaPipe (returns null if same video frame)
          const frameResult = poseEngineService.processVideoFrame(video, timestamp);

          if (frameResult !== null) {
            if (frameResult.landmarks && frameResult.landmarks.length > 0) {
              consecutiveMissesRef.current = 0;
              latestFrameResultRef.current = frameResult;

              // Update measurements and confidence at throttled rate
              if (frameCountRef.current % 5 === 0) {
                setStatus('active');
                setConfidence(frameResult.confidence);
                setMeasurements(frameResult.measurements);
              }
            } else {
              consecutiveMissesRef.current++;
              if (consecutiveMissesRef.current > 15) {
                setStatus('no_person');
                setConfidence(0);
                latestFrameResultRef.current = null;
                virtualTryOnEngine.resetTransform();
              } else if (consecutiveMissesRef.current > 5) {
                setStatus('lost');
              }
            }
          }

          // Always clear and render using the latest valid landmarks (keeps UI adjustments smooth even between video frames)
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const activePose = latestFrameResultRef.current;
          if (activePose && activePose.landmarks && activePose.landmarks.length > 0) {
            // LAYER 1: Virtual Try-On Garment Overlay + Arm Occlusion + Debug Overlay
            const tryOnRes = virtualTryOnEngine.renderFrame({
              ctx,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              landmarks: activePose.landmarks,
              garment: selectedGarmentRef.current,
              isMirrored: isMirroredRef.current,
              showGarment: showGarmentRef.current,
              adjustments: adjustmentsRef.current,
              video,
              debugOptions: debugOptionsRef.current,
              confidence: activePose.confidence,
              fps: fpsRef.current,
            });

            if (tryOnRes.rendered) {
              latencyAccumRef.current += tryOnRes.latencyMs;
              latencySamplesRef.current += 1;
            }

            // LAYER 2: Standalone Skeleton Visualization (when not already drawn by debug overlay)
            if (showSkeletonRef.current && !debugOptionsRef.current?.showSkeleton) {
              drawSkeleton(ctx, activePose.landmarks, canvas.width, canvas.height, {
                isMirrored: isMirroredRef.current,
                showLandmarks: true,
                showConnections: true,
              });
            }
          }
        }

        // FPS & average latency calculation (once per second)
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsCalcTimeRef.current >= 1000) {
          const calculatedFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current));
          fpsRef.current = calculatedFps;
          setFps(calculatedFps);
          if (latencySamplesRef.current > 0) {
            setRenderLatencyMs(
              Math.round((latencyAccumRef.current / latencySamplesRef.current) * 10) / 10
            );
          } else {
            setRenderLatencyMs(0);
          }
          frameCountRef.current = 0;
          latencyAccumRef.current = 0;
          latencySamplesRef.current = 0;
          lastFpsCalcTimeRef.current = now;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [videoRef, canvasRef]);

  /**
   * Stop tracking loop
   */
  const stopTrackingLoop = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    latestFrameResultRef.current = null;
    virtualTryOnEngine.resetTransform();
    setFps(0);
    setRenderLatencyMs(0);
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
      virtualTryOnEngine.dispose();
      poseEngineService.close();
    };
  }, [stopTrackingLoop]);

  return {
    status,
    delegate,
    fps,
    renderLatencyMs,
    confidence,
    measurements,
    assetStatus,
    latestFrameResultRef,
  };
}
