export type ClothingCategory = 'T-Shirts' | 'Shirts' | 'Jackets' | 'Pants' | 'Other';

export interface NormalizedAnchorPoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface UpperBodyAnchors {
  leftShoulder: NormalizedAnchorPoint;
  rightShoulder: NormalizedAnchorPoint;
  neckCenter: NormalizedAnchorPoint;
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
