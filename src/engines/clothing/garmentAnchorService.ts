import { GarmentAnchors, UpperBodyAnchors, PantsAnchors, ClothingCategory } from '../../types/clothing';

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

    // Default Upper Body (T-Shirts, Shirts, Jackets, Other)
    const defaultUpper: UpperBodyAnchors = {
      leftShoulder: { x: 0.2, y: 0.15 },
      rightShoulder: { x: 0.8, y: 0.15 },
      neckCenter: { x: 0.5, y: 0.08 },
      leftBottom: { x: 0.22, y: 0.92 },
      rightBottom: { x: 0.78, y: 0.92 },
    };
    return defaultUpper;
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
