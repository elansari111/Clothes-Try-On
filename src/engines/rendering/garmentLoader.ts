import { ClothingItem, GarmentAnchors, UpperBodyAnchors, PantsAnchors } from '../../types/clothing';
import {
  GarmentAssetProcessor,
  BoundingBox,
  DetectedGarmentGeometry,
} from '../../services/image-processing/garmentAssetProcessor';
import { garmentAnchorService } from '../clothing/garmentAnchorService';

export interface ProcessedGarmentAsset {
  /** Tightly cropped, hanger-cleaned, transparent offscreen canvas for direct Canvas 2D drawing */
  source: HTMLCanvasElement;
  width: number;
  height: number;
  aspectRatio: number;
  /** Original anchors remapped or refined via silhouette analysis in cropped space [0..1] */
  remappedAnchors: GarmentAnchors;
  /** Automatically detected silhouette geometry (neck, shoulders, core torso) */
  geometry: DetectedGarmentGeometry;
  cropBox: BoundingBox;
  hadOpaqueBackground: boolean;
  backgroundRemoved: boolean;
  hangerRemoved: boolean;
  hasTransparency: boolean;
  isSuitableForOverlay: boolean;
}

export class GarmentLoader {
  private cache: Map<string, ProcessedGarmentAsset> = new Map();
  private loadingPromises: Map<string, Promise<ProcessedGarmentAsset>> = new Map();

  private getCacheKey(item: ClothingItem): string {
    const anchorKey = JSON.stringify(item.anchors);
    // Include length + tail of imagePath so edited/masked base64 images invalidate cache immediately
    const imgSig = `${item.imagePath.length}_${item.imagePath.slice(-32)}`;
    return `${item.id}_${imgSig}_${anchorKey}`;
  }

  private remapPoint(
    pt: { x: number; y: number },
    origW: number,
    origH: number,
    crop: BoundingBox
  ): { x: number; y: number } {
    if (origW <= 0 || origH <= 0 || crop.width <= 0 || crop.height <= 0) {
      return pt;
    }
    const px = pt.x * origW;
    const py = pt.y * origH;
    const rx = (px - crop.x) / crop.width;
    const ry = (py - crop.y) / crop.height;
    return {
      x: Math.max(0.02, Math.min(0.98, rx)),
      y: Math.max(0.02, Math.min(0.98, ry)),
    };
  }

  /**
   * Computes accurate garment anchors in the cropped coordinate space:
   * - If the user kept default generic anchors, uses silhouette-detected neckline, shoulders, and torso edges.
   * - If the user manually edited anchor points, remaps their exact coordinates into the cropped box.
   */
  private remapAnchors(
    item: ClothingItem,
    origW: number,
    origH: number,
    crop: BoundingBox,
    geometry: DetectedGarmentGeometry
  ): GarmentAnchors {
    if (garmentAnchorService.isUpperBodyAnchors(item.anchors)) {
      const a = item.anchors as UpperBodyAnchors;
      const isDefault =
        Math.abs(a.leftShoulder.x - 0.2) < 0.005 &&
        Math.abs(a.rightShoulder.x - 0.8) < 0.005 &&
        Math.abs(a.leftShoulder.y - 0.15) < 0.005;

      const armpitLineY = geometry.shoulderLineY + (geometry.bottomY - geometry.shoulderLineY) * 0.28;

      if (isDefault) {
        return {
          leftShoulder: { x: geometry.shoulderLeftX, y: geometry.shoulderLineY },
          rightShoulder: { x: geometry.shoulderRightX, y: geometry.shoulderLineY },
          neckCenter: {
            x: (geometry.shoulderLeftX + geometry.shoulderRightX) / 2,
            y: geometry.neckCenterY,
          },
          leftArmpit: { x: geometry.torsoLeftX, y: armpitLineY },
          rightArmpit: { x: geometry.torsoRightX, y: armpitLineY },
          leftBottom: { x: geometry.torsoLeftX, y: geometry.bottomY },
          rightBottom: { x: geometry.torsoRightX, y: geometry.bottomY },
        };
      }

      return {
        leftShoulder: this.remapPoint(a.leftShoulder, origW, origH, crop),
        rightShoulder: this.remapPoint(a.rightShoulder, origW, origH, crop),
        neckCenter: this.remapPoint(a.neckCenter, origW, origH, crop),
        leftArmpit: a.leftArmpit
          ? this.remapPoint(a.leftArmpit, origW, origH, crop)
          : { x: geometry.torsoLeftX, y: armpitLineY },
        rightArmpit: a.rightArmpit
          ? this.remapPoint(a.rightArmpit, origW, origH, crop)
          : { x: geometry.torsoRightX, y: armpitLineY },
        leftBottom: this.remapPoint(a.leftBottom, origW, origH, crop),
        rightBottom: this.remapPoint(a.rightBottom, origW, origH, crop),
      };
    }

    const p = item.anchors as PantsAnchors;
    return {
      leftWaist: this.remapPoint(p.leftWaist, origW, origH, crop),
      rightWaist: this.remapPoint(p.rightWaist, origW, origH, crop),
      leftLegBottom: this.remapPoint(p.leftLegBottom, origW, origH, crop),
      rightLegBottom: this.remapPoint(p.rightLegBottom, origW, origH, crop),
    };
  }

  /**
   * Loads, cleans studio backgrounds & hangers, crops tight bounding box,
   * analyzes garment silhouette, and caches the processed garment asset.
   */
  async loadGarmentAsset(item: ClothingItem): Promise<ProcessedGarmentAsset> {
    const key = this.getCacheKey(item);

    const cached = this.cache.get(key);
    if (cached && cached.width > 0 && cached.height > 0) {
      return cached;
    }

    const pending = this.loadingPromises.get(key);
    if (pending) {
      return pending;
    }

    const promise = new Promise<ProcessedGarmentAsset>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const processed = GarmentAssetProcessor.processGarmentImage(img, 768);
        const remappedAnchors = this.remapAnchors(
          item,
          processed.originalWidth,
          processed.originalHeight,
          processed.cropBox,
          processed.geometry
        );

        const asset: ProcessedGarmentAsset = {
          source: processed.canvas,
          width: processed.width,
          height: processed.height,
          aspectRatio: processed.width / Math.max(1, processed.height),
          remappedAnchors,
          geometry: processed.geometry,
          cropBox: processed.cropBox,
          hadOpaqueBackground: processed.hadOpaqueBackground,
          backgroundRemoved: processed.backgroundRemoved,
          hangerRemoved: processed.hangerRemoved,
          hasTransparency: processed.hasTransparency,
          isSuitableForOverlay: processed.hasTransparency,
        };

        this.cache.set(key, asset);
        this.loadingPromises.delete(key);
        resolve(asset);
      };

      img.onerror = (err) => {
        this.loadingPromises.delete(key);
        reject(new Error(`Failed to load garment image: ${item.name} (${String(err)})`));
      };

      img.src = item.imagePath;
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  getCachedAsset(item: ClothingItem): ProcessedGarmentAsset | null {
    const key = this.getCacheKey(item);
    return this.cache.get(key) || null;
  }

  /**
   * Invalidates cached entries for a specific garment ID (used after manual eraser/mask editing)
   */
  invalidateItem(itemId: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${itemId}_`)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const garmentLoader = new GarmentLoader();
