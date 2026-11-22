import { ImageProcessingResult } from '../types/clothing';
import { GarmentAssetProcessor } from './garmentAssetProcessor';

export class ImageProcessor {
  /**
   * Reads a File, removes uniform opaque studio backgrounds if present,
   * crops empty margins to the tight garment bounding box while preserving transparency
   * and aspect ratio, and outputs a clean PNG Data URL.
   */
  static async processImage(
    file: File,
    maxDimension: number = 1024
  ): Promise<ImageProcessingResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier.'));

      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Impossible de charger l'image."));

        img.onload = () => {
          const processed = GarmentAssetProcessor.processGarmentImage(img, maxDimension);

          // Always export as PNG to preserve alpha transparency cleanly
          const dataUrl = processed.canvas.toDataURL('image/png');

          const format: 'png' | 'jpeg' | 'webp' =
            file.type === 'image/jpeg' ? 'jpeg' : file.type === 'image/webp' ? 'webp' : 'png';

          resolve({
            dataUrl,
            width: processed.width,
            height: processed.height,
            hasTransparency: processed.hasTransparency,
            format,
            fileSize: file.size,
          });
        };

        img.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
  }
}
