export type ClothingCategory = 'T-Shirts' | 'Shirts' | 'Jackets' | 'Pants' | 'Other';

export interface NormalizedAnchorPoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface UpperBodyAnchors {
  leftShoulder: NormalizedAnchorPoint;
  rightShoulder: NormalizedAnchorPoint;
  neckCenter: NormalizedAnchorPoint;
  leftArmpit?: NormalizedAnchorPoint;
  rightArmpit?: NormalizedAnchorPoint;
  leftBottom: NormalizedAnchorPoint;
  rightBottom: NormalizedAnchorPoint;
}

export interface PantsAnchors {
  leftWaist: NormalizedAnchorPoint;
  rightWaist: NormalizedAnchorPoint;
  leftLegBottom: NormalizedAnchorPoint;
  rightLegBottom: NormalizedAnchorPoint;
}

export type GarmentAnchors = UpperBodyAnchors | PantsAnchors;

export interface GarmentCalibration {
  scale: number;              // Overall scale modifier (default 1.0)
  garmentWidthScale: number;  // Garment width modifier (default 1.0)
  shoulderWidthScale: number; // Shoulder width modifier (default 1.0)
  garmentHeightScale: number; // Garment height modifier (default 1.0)
  necklineOffsetY: number;    // Neckline vertical adjustment in px (default 0)
  offsetX: number;            // Horizontal pixel offset (default 0)
  offsetY: number;            // Vertical pixel offset (default 0)
  rotationOffsetDeg: number;  // Rotation offset in degrees (default 0)
  meshWarpStrength: number;   // Mesh deformation strength (0 = rigid, 1 = full warp, default 1.0)
  enableArmOcclusion: boolean; // Render user's arms in front of the garment when applicable
  opacity: number;            // Opacity (default 0.96)
  enableWarping: boolean;     // Warp toggle (default true)
}

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  imagePath: string; // Base64 data URL or local asset path
  color?: string;
  description?: string;
  price?: string;
  garmentType: 'upper' | 'lower' | 'full';
  imageWidth: number;
  imageHeight: number;
  hasTransparency: boolean;
  createdAt: string; // ISO 8601
  anchors: GarmentAnchors;
  calibration?: GarmentCalibration; // Stored per-garment calibration!
  isCustom?: boolean; // True if imported by the user
}

export interface ImageProcessingResult {
  dataUrl: string;
  width: number;
  height: number;
  hasTransparency: boolean;
  format: 'png' | 'jpeg' | 'webp';
  fileSize: number;
}
