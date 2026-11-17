import { ImageProcessingResult } from '../../types/clothing';

export class ImageProcessor {
  /**
   * Reads a File, inspects dimensions, checks transparency and resizes if larger than maxWidth/maxHeight
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
          let { width, height } = img;

          // Scale down if image exceeds maxDimension while preserving aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Impossible de créer le contexte 2D.'));
            return;
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Detect transparency (sample alpha channel across pixels)
          let hasTransparency = false;
          const isPngOrWebp = file.type === 'image/png' || file.type === 'image/webp';

          if (isPngOrWebp) {
            try {
              const imgData = ctx.getImageData(0, 0, width, height);
              const data = imgData.data;
              const step = 4 * 16; // Sample every 16th pixel for high speed
              for (let i = 3; i < data.length; i += step) {
                if (data[i] < 250) {
                  hasTransparency = true;
                  break;
                }
              }
            } catch {
              // Ignore canvas read error if tainted
            }
          }

          const targetMime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
          const dataUrl = canvas.toDataURL(targetMime, 0.92);

          const format: 'png' | 'jpeg' | 'webp' =
            file.type === 'image/jpeg' ? 'jpeg' : file.type === 'image/webp' ? 'webp' : 'png';

          resolve({
            dataUrl,
            width,
            height,
            hasTransparency,
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
