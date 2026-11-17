import { ClothingItem } from '../../types/clothing';

export class GarmentLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Loads and caches an HTMLImageElement for a clothing item
   */
  async loadGarmentImage(item: ClothingItem): Promise<HTMLImageElement> {
    const key = `${item.id}_${item.imagePath.slice(0, 40)}`;

    const cached = this.cache.get(key);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return cached;
    }

    const pending = this.loadingPromises.get(key);
    if (pending) {
      return pending;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.cache.set(key, img);
        this.loadingPromises.delete(key);
        resolve(img);
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

  /**
   * Synchronously returns a cached image if ready, or null
   */
  getCachedImage(item: ClothingItem): HTMLImageElement | null {
    const key = `${item.id}_${item.imagePath.slice(0, 40)}`;
    const cached = this.cache.get(key);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return cached;
    }
    return null;
  }

  /**
   * Clears image cache to free memory if needed
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const garmentLoader = new GarmentLoader();
