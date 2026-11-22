import { ClothingItem, ClothingCategory, GarmentAnchors, GarmentCalibration } from '../types/clothing';
import { ClothingStorage } from '../storage/clothingStorage';
import { ImageProcessor } from './imageProcessor';
import { ClothingValidator } from './clothingValidator';
import { garmentAnchorService } from './garmentAnchorService';

export class ClothingService {
  /**
   * Retrieves all available clothes
   */
  static getClothes(): ClothingItem[] {
    return ClothingStorage.getAll();
  }

  /**
   * Filters clothes by category
   */
  static filterByCategory(items: ClothingItem[], category: string): ClothingItem[] {
    if (!category || category === 'All') return items;
    return items.filter((item) => item.category === category);
  }

  /**
   * Imports and persists a new clothing file
   */
  static async importClothing(
    file: File,
    name: string,
    category: ClothingCategory,
    price: string = '50 €',
    color?: string,
    description?: string,
    customAnchors?: GarmentAnchors
  ): Promise<ClothingItem> {
    // 1. Validate file
    const fileValidation = ClothingValidator.validateFile(file);
    if (!fileValidation.isValid) {
      throw new Error(fileValidation.error);
    }

    // 2. Validate metadata
    const metaValidation = ClothingValidator.validateMetadata(name, category);
    if (!metaValidation.isValid) {
      throw new Error(metaValidation.error);
    }

    // 3. Process image (detect dimensions & transparency)
    const procResult = await ImageProcessor.processImage(file, 1024);

    // 4. Construct item
    const newItem: ClothingItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      category,
      price: price.trim() || '50 €',
      color: color?.trim() || undefined,
      description: description?.trim() || undefined,
      imagePath: procResult.dataUrl,
      garmentType: category === 'Pants' ? 'lower' : 'upper',
      imageWidth: procResult.width,
      imageHeight: procResult.height,
      hasTransparency: procResult.hasTransparency,
      createdAt: new Date().toISOString(),
      anchors: customAnchors || garmentAnchorService.getDefaultAnchors(category),
      isCustom: true,
    };

    // 5. Persist
    ClothingStorage.add(newItem);

    return newItem;
  }

  /**
   * Updates an item's anchor points or metadata
   */
  static updateItem(id: string, updates: Partial<ClothingItem>): ClothingItem[] {
    return ClothingStorage.update(id, updates);
  }

  /**
   * Saves per-garment calibration parameters
   */
  static saveCalibration(id: string, calibration: GarmentCalibration): ClothingItem[] {
    return ClothingStorage.saveCalibration(id, calibration);
  }

  /**
   * Deletes a clothing item
   */
  static deleteItem(id: string): ClothingItem[] {
    return ClothingStorage.delete(id);
  }
}
