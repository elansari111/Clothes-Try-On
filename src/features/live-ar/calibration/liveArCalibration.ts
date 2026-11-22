import { TryOnAdjustments } from '../types/rendering';

export const DEFAULT_LIVE_AR_ADJUSTMENTS: TryOnAdjustments = {
  scale: 1.0,
  shoulderWidthScale: 1.0,
  garmentWidthScale: 1.0,
  garmentHeightScale: 1.0,
  necklineOffsetY: 0,
  offsetX: 0,
  offsetY: 0,
  rotationOffsetDeg: 0,
  meshWarpStrength: 0.8,
  opacity: 0.96,
  enableWarping: true,
  enableArmOcclusion: false,
};
