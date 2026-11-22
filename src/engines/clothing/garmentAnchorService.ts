import {
  GarmentAnchors,
  UpperBodyAnchors,
  PantsAnchors,
  ClothingCategory,
  GarmentCalibration,
} from '../../types/clothing';

export const DEFAULT_CALIBRATION: GarmentCalibration = {
  scale: 1.0,
  garmentWidthScale: 1.0,
  shoulderWidthScale: 1.0,
  garmentHeightScale: 1.0,
  necklineOffsetY: 0,
  offsetX: 0,
  offsetY: 0,
  rotationOffsetDeg: 0,
  meshWarpStrength: 1.0,
  enableArmOcclusion: true,
  opacity: 0.96,
  enableWarping: true,
};

export class GarmentAnchorService {
  /**
   * Generates default normalized anchor points according to category/type
   */
  getDefaultAnchors(category: ClothingCategory): GarmentAnchors {
    if (category === 'Pants') {
      const defaultPants: PantsAnchors = {
        leftWaist: { x: 0.25, y: 0.05 },
        rightWaist: { x: 0.75, y: 0.05 },
        leftLegBottom: { x: 0.3, y: 0.95 },
        rightLegBottom: { x: 0.7, y: 0.95 },
      };
      return defaultPants;
    }

    // Default Upper Body (T-Shirts, Shirts, Jackets, Other) with all 7 anchors:
    const defaultUpper: UpperBodyAnchors = {
      leftShoulder: { x: 0.22, y: 0.14 },
      rightShoulder: { x: 0.78, y: 0.14 },
      neckCenter: { x: 0.5, y: 0.06 },
      leftArmpit: { x: 0.24, y: 0.42 },
      rightArmpit: { x: 0.76, y: 0.42 },
      leftBottom: { x: 0.24, y: 0.95 },
      rightBottom: { x: 0.76, y: 0.95 },
    };
    return defaultUpper;
  }

  /**
   * Ensures upper-body anchors contain all 7 anchor points, adding armpits if missing
   */
  ensureUpperBodyAnchors(anchors: GarmentAnchors): UpperBodyAnchors {
    if (!this.isUpperBodyAnchors(anchors)) {
      return this.getDefaultAnchors('T-Shirts') as UpperBodyAnchors;
    }

    const u = anchors as UpperBodyAnchors;
    return {
      leftShoulder: u.leftShoulder || { x: 0.22, y: 0.14 },
      rightShoulder: u.rightShoulder || { x: 0.78, y: 0.14 },
      neckCenter: u.neckCenter || { x: 0.5, y: 0.06 },
      leftArmpit: u.leftArmpit || { x: u.leftShoulder?.x ?? 0.24, y: 0.42 },
      rightArmpit: u.rightArmpit || { x: u.rightShoulder?.x ?? 0.76, y: 0.42 },
      leftBottom: u.leftBottom || { x: 0.24, y: 0.95 },
      rightBottom: u.rightBottom || { x: 0.76, y: 0.95 },
    };
  }

  /**
   * Checks if an anchor object belongs to an upper body garment
   */
  isUpperBodyAnchors(anchors: GarmentAnchors): anchors is UpperBodyAnchors {
    return 'neckCenter' in anchors;
  }

  /**
   * Clamps normalized coordinates between 0 and 1
   */
  clampCoordinate(value: number): number {
    return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
  }
}

export const garmentAnchorService = new GarmentAnchorService();
