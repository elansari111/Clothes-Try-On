import { GarmentTransform, TryOnAdjustments } from '../types/rendering';
import { ProcessedGarmentAsset } from './garmentLoader';
import { garmentWarpingEngine } from '../transformations/garmentWarpingEngine';

export class ClothingRenderer {
  /**
   * Renders a processed garment layer onto the canvas with alpha transparency preservation,
   * using 2D triangle mesh warping or stable affine fallback.
   */
  renderGarment(
    ctx: CanvasRenderingContext2D,
    asset: ProcessedGarmentAsset,
    transform: GarmentTransform,
    adjustments: TryOnAdjustments
  ): boolean {
    if (!transform.isValid || asset.width === 0 || asset.height === 0) {
      return false;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0.1, Math.min(1, adjustments.opacity));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let warped = false;
    if (adjustments.enableWarping) {
      const warpStrength = adjustments.meshWarpStrength ?? 0.8;
      warped = garmentWarpingEngine.renderWarpedMesh(ctx, asset.source, transform, 3, warpStrength);
    }

    if (!warped) {
      garmentWarpingEngine.renderAffineFallback(ctx, asset.source, transform);
    }

    ctx.restore();
    return true;
  }
}

export const clothingRenderer = new ClothingRenderer();
