import { NormalizedLandmark } from '../../body-tracking/types/pose';
import { ClothingItem } from '../../clothing/types/clothing';
import { TryOnAdjustments, DebugRenderOptions } from '../types/rendering';
import { garmentLoader, ProcessedGarmentAsset } from '../rendering/garmentLoader';
import { bodyClothingMapper } from '../transformations/bodyClothingMapper';
import { garmentTransformer } from '../transformations/garmentTransformer';
import { clothingRenderer } from '../rendering/clothingRenderer';
import { poseLandmarksFilter } from '../../body-tracking/processors/landmarkFilter';
import { armOcclusionRenderer, ArmOcclusionSegment } from '../occlusion/armOcclusionRenderer';
import { tryOnDebugger } from '../rendering/tryOnDebugger';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  landmarks: NormalizedLandmark[];
  garment: ClothingItem | null;
  isMirrored: boolean;
  showGarment: boolean;
  adjustments: TryOnAdjustments;
  video?: HTMLVideoElement | null;
  debugOptions?: DebugRenderOptions;
  confidence?: number;
  fps?: number;
}

export interface GarmentAssetStatus {
  ready: boolean;
  hasTransparency: boolean;
  backgroundRemoved: boolean;
  hangerRemoved: boolean;
  hadOpaqueBackground: boolean;
  croppedWidth: number;
  croppedHeight: number;
}

export class VirtualTryOnEngine {
  private activeGarmentId: string | null = null;
  private activeAsset: ProcessedGarmentAsset | null = null;
  private lastRenderDurationMs: number = 0;

  /**
   * Preloads, removes opaque studio backgrounds if needed, crops tight bounding box,
   * and caches the active garment asset without restarting camera or MediaPipe.
   */
  async setActiveGarment(item: ClothingItem | null, forceReload: boolean = false): Promise<GarmentAssetStatus | null> {
    if (!item) {
      this.activeGarmentId = null;
      this.activeAsset = null;
      this.resetTransform();
      return null;
    }

    if (forceReload) {
      garmentLoader.invalidateItem(item.id);
      this.activeAsset = null;
    }

    if (!forceReload && this.activeGarmentId === item.id && this.activeAsset) {
      return this.toAssetStatus(this.activeAsset);
    }

    this.activeGarmentId = item.id;
    this.resetTransform();

    // Use cached processed asset immediately if available
    const cached = garmentLoader.getCachedAsset(item);
    if (cached && !forceReload) {
      this.activeAsset = cached;
      return this.toAssetStatus(cached);
    }

    try {
      const processedAsset = await garmentLoader.loadGarmentAsset(item);
      // Guard against stale async load if user switched garments rapidly
      if (this.activeGarmentId === item.id) {
        this.activeAsset = processedAsset;
        return this.toAssetStatus(processedAsset);
      }
      return null;
    } catch (err) {
      console.warn('VirtualTryOnEngine failed to load garment asset:', err);
      if (this.activeGarmentId === item.id) {
        this.activeAsset = null;
      }
      return null;
    }
  }

  private toAssetStatus(asset: ProcessedGarmentAsset): GarmentAssetStatus {
    return {
      ready: true,
      hasTransparency: asset.hasTransparency,
      backgroundRemoved: asset.backgroundRemoved,
      hangerRemoved: asset.hangerRemoved,
      hadOpaqueBackground: asset.hadOpaqueBackground,
      croppedWidth: asset.width,
      croppedHeight: asset.height,
    };
  }

  /**
   * Executes one full AR rendering pass for the garment overlay layer.
   * Layered architecture:
   *  - Layer 0: Camera background (<video> behind canvas, pixel-locked to same object-cover projection)
   *  - Layer 1: Garment overlay (warped mesh or affine fallback)
   *  - Layer 2: Foreground arm/hand occlusion (if enabled and arms cross torso)
   *  - Layer 3: Developer debug overlay diagnostics
   */
  renderFrame(params: RenderFrameParams): { rendered: boolean; latencyMs: number } {
    const start = performance.now();

    const {
      ctx,
      canvasWidth,
      canvasHeight,
      landmarks,
      garment,
      isMirrored,
      showGarment,
      adjustments,
      video,
      debugOptions,
      confidence = 0,
      fps = 0,
    } = params;

    if (!landmarks || landmarks.length < 25) {
      this.lastRenderDurationMs = 0;
      return { rendered: false, latencyMs: 0 };
    }

    // 1. Smooth landmarks using adaptive 1€ filter to eradicate tracking jitter
    const filteredLandmarks = poseLandmarksFilter.filterLandmarks(landmarks, start);

    if (!showGarment || !garment) {
      this.lastRenderDurationMs = 0;
      // If debug overlay is enabled, still render diagnostics even if garment is hidden
      if (debugOptions) {
        tryOnDebugger.renderDebugOverlay(
          ctx,
          canvasWidth,
          canvasHeight,
          filteredLandmarks,
          null,
          debugOptions,
          isMirrored,
          confidence,
          fps,
          0
        );
      }
      return { rendered: false, latencyMs: 0 };
    }

    // Ensure garment asset is ready synchronously (no per-frame decoding or cropping)
    if (this.activeGarmentId !== garment.id) {
      void this.setActiveGarment(garment);
    }

    const asset = this.activeAsset || garmentLoader.getCachedAsset(garment);
    if (!asset || asset.width === 0 || asset.height === 0) {
      if (debugOptions) {
        tryOnDebugger.renderDebugOverlay(
          ctx,
          canvasWidth,
          canvasHeight,
          filteredLandmarks,
          null,
          debugOptions,
          isMirrored,
          confidence,
          fps,
          0
        );
      }
      return { rendered: false, latencyMs: 0 };
    }

    // 2. Body-to-Clothing Mapping using cropped asset dimensions & remapped anchors
    const rawTransform = bodyClothingMapper.mapBodyToGarment(
      filteredLandmarks,
      garment,
      asset,
      canvasWidth,
      canvasHeight,
      isMirrored,
      adjustments
    );

    if (!rawTransform || !rawTransform.isValid) {
      if (debugOptions) {
        tryOnDebugger.renderDebugOverlay(
          ctx,
          canvasWidth,
          canvasHeight,
          filteredLandmarks,
          null,
          debugOptions,
          isMirrored,
          confidence,
          fps,
          0
        );
      }
      return { rendered: false, latencyMs: 0 };
    }

    // 3. Smooth transform across frames
    const smoothedTransform = garmentTransformer.smooth(rawTransform);

    // 4. Render garment layer (warped mesh or affine fallback)
    const rendered = clothingRenderer.renderGarment(ctx, asset, smoothedTransform, adjustments);

    // 5. Foregound Arm Occlusion (if enabled and arms cross torso in 3D)
    let occlusionSegments: ArmOcclusionSegment[] = [];
    if (adjustments.enableArmOcclusion && video) {
      occlusionSegments = armOcclusionRenderer.detectOccludingArms(
        filteredLandmarks,
        canvasWidth,
        canvasHeight,
        isMirrored
      );
      if (occlusionSegments.length > 0) {
        armOcclusionRenderer.renderArmOcclusion(
          ctx,
          video,
          occlusionSegments,
          canvasWidth,
          canvasHeight,
          isMirrored
        );
      }
    }

    const latencyMs = performance.now() - start;
    this.lastRenderDurationMs = latencyMs;

    // 6. Developer Debug Diagnostics Overlay
    if (debugOptions) {
      tryOnDebugger.renderDebugOverlay(
        ctx,
        canvasWidth,
        canvasHeight,
        filteredLandmarks,
        smoothedTransform,
        debugOptions,
        isMirrored,
        confidence,
        fps,
        Math.round(latencyMs * 10) / 10,
        occlusionSegments
      );
    }

    return { rendered, latencyMs };
  }

  /**
   * Resets temporal smoothing and filters (called on tracking loss or manual reset)
   */
  resetTransform(): void {
    garmentTransformer.reset();
    poseLandmarksFilter.reset();
  }

  /**
   * Returns last measured garment rendering latency in milliseconds
   */
  getLastRenderLatency(): number {
    return this.lastRenderDurationMs;
  }

  /**
   * Releases references on shutdown
   */
  dispose(): void {
    this.activeGarmentId = null;
    this.activeAsset = null;
    this.resetTransform();
  }
}

export const virtualTryOnEngine = new VirtualTryOnEngine();
