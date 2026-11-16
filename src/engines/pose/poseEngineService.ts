import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { PoseEngineConfig, PoseFrameResult } from '../../types/pose';
import { extractBodyMeasurements } from './measurements';

export class PoseEngineService {
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;
  private lastVideoTime: number = -1;
  private config: PoseEngineConfig = {
    delegate: 'GPU',
    enableSegmentation: true,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  /**
   * Initializes FilesetResolver and PoseLandmarker with GPU delegate and CPU fallback
   */
  async initialize(customConfig?: Partial<PoseEngineConfig>): Promise<PoseLandmarker> {
    if (this.poseLandmarker) {
      return this.poseLandmarker;
    }

    if (this.isInitializing) {
      // Wait until ongoing initialization completes
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
      // 1. Resolve WASM assets locally from public/wasm with fallback to remote CDN
      let visionWasm;
      try {
        visionWasm = await FilesetResolver.forVisionTasks('./wasm');
      } catch (localWasmErr) {
        console.warn('Local WASM fileset failed, falling back to remote CDN:', localWasmErr);
        visionWasm = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // 2. Local model task path
      const modelAssetPath = './models/pose_landmarker_lite.task';

      // 3. Attempt GPU delegate first, fallback to CPU if WebGL fails
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(visionWasm, {
          baseOptions: {
            modelAssetPath,
            delegate: this.config.delegate,
          },
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
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
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
   * Processes a video frame synchronously in VIDEO running mode
   */
  processVideoFrame(videoElement: HTMLVideoElement, timestampMs: number): PoseFrameResult | null {
    if (!this.poseLandmarker) return null;
    if (videoElement.readyState < 2) return null; // HAVE_CURRENT_DATA
    if (videoElement.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = videoElement.currentTime;

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(videoElement, timestampMs);

      if (!result.landmarks || result.landmarks.length === 0 || !result.landmarks[0]) {
        return {
          landmarks: [],
          measurements: null,
          confidence: 0,
          timestamp: timestampMs,
        };
      }

      const rawLandmarks = result.landmarks[0];
      const measurements = extractBodyMeasurements(rawLandmarks);

      // Average visibility confidence across landmark points
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
        timestamp: timestampMs,
      };
    } catch (err) {
      console.error('Error during pose detection:', err);
      return null;
    }
  }

  /**
   * Returns current active delegate
   */
  getDelegate(): 'GPU' | 'CPU' {
    return this.config.delegate;
  }

  /**
   * Releases MediaPipe resources
   */
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
  }
}

export const poseEngineService = new PoseEngineService();
