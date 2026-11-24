import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { PoseEngineConfig, PoseFrameResult } from '../types/pose';
import { extractBodyMeasurements } from '../processors/measurements';
import { IpcClient } from '../../../services/communication/ipcClient';

export class PoseEngineService {
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;
  private lastVideoTime: number = -1;
  private lastTimestampMs: number = 0;
  private config: PoseEngineConfig = {
    delegate: 'GPU',
    enableSegmentation: false,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  /**
   * Initializes FilesetResolver and PoseLandmarker with GPU delegate and CPU fallback.
   * Supports both HTTP dev server (./wasm & ./models) and Electron file:// builds via IPC buffer.
   */
  async initialize(customConfig?: Partial<PoseEngineConfig>): Promise<PoseLandmarker> {
    if (this.poseLandmarker) {
      return this.poseLandmarker;
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.poseLandmarker) return this.poseLandmarker;
    }

    this.isInitializing = true;
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    try {
      // 1. Resolve WASM assets locally when on HTTP(S), or via CDN fallback when file:// blocks fetch
      let visionWasm;
      const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
      try {
        if (isFileProtocol) {
          throw new Error('Skip ./wasm fetch on file:// protocol');
        }
        visionWasm = await FilesetResolver.forVisionTasks('./wasm');
      } catch (localWasmErr) {
        console.warn('Local WASM fileset unavailable, using CDN fallback:', localWasmErr);
        visionWasm = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
        );
      }

      // 2. Load local model via HTTP or Electron IPC buffer (avoids file:// fetch block)
      let modelBuffer: Uint8Array | null = null;
      if (isFileProtocol) {
        modelBuffer = await IpcClient.loadMediaPipeModel();
      }
      const modelAssetPath = './models/pose_landmarker_lite.task';
      const buildBaseOptions = (delegate: 'GPU' | 'CPU') =>
        modelBuffer
          ? { modelAssetBuffer: modelBuffer, delegate }
          : { modelAssetPath, delegate };

      // 3. Attempt configured delegate (GPU first), fallback to CPU if WebGL fails
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(visionWasm, {
          baseOptions: buildBaseOptions(this.config.delegate),
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: this.config.enableSegmentation,
          minPoseDetectionConfidence: this.config.minPoseDetectionConfidence,
          minPosePresenceConfidence: this.config.minPosePresenceConfidence,
          minTrackingConfidence: this.config.minTrackingConfidence,
        });
      } catch (gpuError) {
        console.warn('GPU initialization failed, falling back to CPU delegate:', gpuError);
        this.config.delegate = 'CPU';
        this.poseLandmarker = await PoseLandmarker.createFromOptions(visionWasm, {
          baseOptions: buildBaseOptions('CPU'),
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: this.config.enableSegmentation,
          minPoseDetectionConfidence: this.config.minPoseDetectionConfidence,
          minPosePresenceConfidence: this.config.minPosePresenceConfidence,
          minTrackingConfidence: this.config.minTrackingConfidence,
        });
      }

      this.isInitializing = false;
      return this.poseLandmarker;
    } catch (error) {
      this.isInitializing = false;
      console.error('Failed to initialize PoseLandmarker:', error);
      throw error;
    }
  }

  /**
   * Resets per-stream frame timing (called when video stream restarts or switches modes)
   */
  resetFrameState(): void {
    this.lastVideoTime = -1;
  }

  /**
   * Processes a video frame synchronously in VIDEO running mode
   */
  processVideoFrame(videoElement: HTMLVideoElement, timestampMs: number): PoseFrameResult | null {
    if (!this.poseLandmarker) return null;
    if (videoElement.readyState < 2) return null;
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return null;
    if (videoElement.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = videoElement.currentTime;

    // MediaPipe VIDEO mode requires strictly monotonically increasing integer timestamps
    const safeTimestamp = Math.max(this.lastTimestampMs + 1, Math.round(timestampMs));
    this.lastTimestampMs = safeTimestamp;

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
        videoElement,
        safeTimestamp
      );

      if (!result.landmarks || result.landmarks.length === 0 || !result.landmarks[0]) {
        return {
          landmarks: [],
          measurements: null,
          confidence: 0,
          timestamp: safeTimestamp,
        };
      }

      const rawLandmarks = result.landmarks[0];
      const measurements = extractBodyMeasurements(rawLandmarks);

      let totalVis = 0;
      let count = 0;
      rawLandmarks.forEach((lm) => {
        if (lm.visibility !== undefined) {
          totalVis += lm.visibility;
          count++;
        }
      });
      const confidence = count > 0 ? Math.round((totalVis / count) * 100) : 85;

      return {
        landmarks: rawLandmarks,
        worldLandmarks: result.worldLandmarks?.[0],
        measurements,
        confidence,
        timestamp: safeTimestamp,
      };
    } catch (err) {
      console.error('Error during pose detection:', err);
      return null;
    }
  }

  getDelegate(): 'GPU' | 'CPU' {
    return this.config.delegate;
  }

  close(): void {
    if (this.poseLandmarker) {
      try {
        this.poseLandmarker.close();
      } catch (e) {
        console.warn('Error closing poseLandmarker:', e);
      }
      this.poseLandmarker = null;
    }
    this.lastVideoTime = -1;
    this.lastTimestampMs = 0;
  }
}

export const poseEngineService = new PoseEngineService();
