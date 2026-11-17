import { ClothingItem } from '../../types/clothing';
import { CLOTHES } from '../../types';
import { garmentAnchorService } from '../../engines/clothing/garmentAnchorService';

const STORAGE_KEY = 'vto_clothing_items_v1';

export class ClothingStorage {
  /**
   * Retrieves all clothing items (custom + initial default catalog)
   */
  static getAll(): ClothingItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ClothingItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored clothing items, falling back to defaults:', e);
    }

    // Initialize with default catalog items
    const initialItems: ClothingItem[] = CLOTHES.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category as ClothingItem['category'],
      imagePath: c.image,
      price: c.price,
      garmentType: c.category === 'Pants' ? 'lower' : 'upper',
      imageWidth: 500,
      imageHeight: 650,
      hasTransparency: false,
      createdAt: new Date().toISOString(),
      anchors: garmentAnchorService.getDefaultAnchors(c.category as ClothingItem['category']),
      isCustom: false,
    }));

    this.saveAll(initialItems);
    return initialItems;
  }

  /**
   * Saves clothing items list to localStorage
   */
  static saveAll(items: ClothingItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save clothing items to storage:', e);
    }
  }

  /**
   * Adds a newly imported clothing item
   */
  static add(item: ClothingItem): ClothingItem[] {
    const current = this.getAll();
    const updated = [item, ...current];
    this.saveAll(updated);
    return updated;
  }

  /**
   * Updates an existing clothing item (metadata or anchor points)
   */
  static update(id: string, updates: Partial<ClothingItem>): ClothingItem[] {
    const current = this.getAll();
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
    this.saveAll(updated);
    return updated;
  }

  /**
   * Deletes a clothing item by ID
   */
  static delete(id: string): ClothingItem[] {
    const current = this.getAll();
    const updated = current.filter((item) => item.id !== id);
    this.saveAll(updated);
    return updated;
  }
}
