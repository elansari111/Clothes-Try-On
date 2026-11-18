import { NormalizedLandmark } from '../../types/pose';
import { ClothingItem } from '../../types/clothing';
import { TryOnAdjustments } from '../../types/rendering';
import { garmentLoader, ProcessedGarmentAsset } from './garmentLoader';
import { bodyClothingMapper } from './bodyClothingMapper';
import { garmentTransformer } from './garmentTransformer';
import { clothingRenderer } from './clothingRenderer';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  landmarks: NormalizedLandmark[];
  garment: ClothingItem | null;
  isMirrored: boolean;
  showGarment: boolean;
  adjustments: TryOnAdjustments;
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
      garmentTransformer.reset();
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
    garmentTransformer.reset();

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
   *  - Layer 1: Garment overlay (rendered here using tightly cropped transparent canvas)
   *  - Layer 2: Optional skeleton / future foreground occlusion
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
    } = params;

    if (!showGarment || !garment || !landmarks || landmarks.length < 33) {
      this.lastRenderDurationMs = 0;
      return { rendered: false, latencyMs: 0 };
    }

    // Ensure garment asset is ready synchronously (no per-frame decoding or cropping)
    if (this.activeGarmentId !== garment.id) {
      void this.setActiveGarment(garment);
    }

    const asset = this.activeAsset || garmentLoader.getCachedAsset(garment);
    if (!asset || asset.width === 0 || asset.height === 0) {
      return { rendered: false, latencyMs: 0 };
    }

    // 1. Body-to-Clothing Mapping using cropped asset dimensions & remapped anchors
    const rawTransform = bodyClothingMapper.mapBodyToGarment(
      landmarks,
      garment,
      asset,
      canvasWidth,
      canvasHeight,
      isMirrored,
      adjustments
    );

    if (!rawTransform || !rawTransform.isValid) {
      return { rendered: false, latencyMs: 0 };
    }

    // 2. Smooth transform across frames
    const smoothedTransform = garmentTransformer.smooth(rawTransform);

    // 3. Render garment layer (warped mesh or affine fallback)
    const rendered = clothingRenderer.renderGarment(ctx, asset, smoothedTransform, adjustments);

    const latencyMs = performance.now() - start;
    this.lastRenderDurationMs = latencyMs;

    return { rendered, latencyMs };
  }

  /**
   * Resets temporal smoothing (called on tracking loss or manual reset)
   */
  resetTransform(): void {
    garmentTransformer.reset();
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
    garmentTransformer.reset();
  }
}

export const virtualTryOnEngine = new VirtualTryOnEngine();
