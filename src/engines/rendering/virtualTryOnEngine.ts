import { NormalizedLandmark } from '../../types/pose';
import { ClothingItem } from '../../types/clothing';
import { TryOnAdjustments } from '../../types/rendering';
import { garmentLoader } from './garmentLoader';
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

export class VirtualTryOnEngine {
  private activeGarmentId: string | null = null;
  private activeImage: HTMLImageElement | null = null;
  private lastRenderDurationMs: number = 0;

  /**
   * Preloads and prepares the active garment image asset without restarting tracking/camera
   */
  async setActiveGarment(item: ClothingItem | null): Promise<void> {
    if (!item) {
      this.activeGarmentId = null;
      this.activeImage = null;
      garmentTransformer.reset();
      return;
    }

    if (this.activeGarmentId === item.id && this.activeImage) {
      return;
    }

    this.activeGarmentId = item.id;
    garmentTransformer.reset();

    // Use cached image immediately if available
    const cached = garmentLoader.getCachedImage(item);
    if (cached) {
      this.activeImage = cached;
      return;
    }

    try {
      const loadedImg = await garmentLoader.loadGarmentImage(item);
      // Guard against stale async load if user switched garments rapidly
      if (this.activeGarmentId === item.id) {
        this.activeImage = loadedImg;
      }
    } catch (err) {
      console.warn('VirtualTryOnEngine failed to load garment image:', err);
      if (this.activeGarmentId === item.id) {
        this.activeImage = null;
      }
    }
  }

  /**
   * Executes one full AR rendering pass for the garment overlay layer.
   * Layered architecture:
   *  - Layer 0: Webcam video (rendered natively via <video> behind canvas)
   *  - Layer 1: Garment overlay (rendered here)
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

    // Ensure garment image is ready synchronously (no per-frame decoding)
    if (this.activeGarmentId !== garment.id) {
      void this.setActiveGarment(garment);
    }

    const img = this.activeImage || garmentLoader.getCachedImage(garment);
    if (!img || !img.complete || img.naturalWidth === 0) {
      return { rendered: false, latencyMs: 0 };
    }

    // 1. Body-to-Clothing Mapping
    const rawTransform = bodyClothingMapper.mapBodyToGarment(
      landmarks,
      garment,
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
    const rendered = clothingRenderer.renderGarment(ctx, img, smoothedTransform, adjustments);

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
    this.activeImage = null;
    garmentTransformer.reset();
  }
}

export const virtualTryOnEngine = new VirtualTryOnEngine();
