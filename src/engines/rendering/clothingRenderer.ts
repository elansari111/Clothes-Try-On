import { GarmentTransform, TryOnAdjustments } from '../../types/rendering';
import { garmentWarpingEngine } from './garmentWarpingEngine';

export class ClothingRenderer {
  /**
   * Renders a garment layer onto the canvas with transparency preservation,
   * using 2D triangle mesh warping or affine fallback.
   */
  renderGarment(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    transform: GarmentTransform,
    adjustments: TryOnAdjustments
  ): boolean {
    if (!transform.isValid || !img.complete || img.naturalWidth === 0) {
      return false;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1, adjustments.opacity));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let warped = false;
    if (adjustments.enableWarping) {
      warped = garmentWarpingEngine.renderWarpedMesh(ctx, img, transform, 3);
    }

    if (!warped) {
      garmentWarpingEngine.renderAffineFallback(ctx, img, transform);
    }

    ctx.restore();
    return true;
  }
}

export const clothingRenderer = new ClothingRenderer();
