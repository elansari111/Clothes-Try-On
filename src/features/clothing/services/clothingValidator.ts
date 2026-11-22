export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export class ClothingValidator {
  private static readonly ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  private static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  /**
   * Validates selected image file type and size
   */
  static validateFile(file: File): FileValidationResult {
    if (!file) {
      return { isValid: false, error: 'Aucun fichier sélectionné.' };
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Format non supporté (${file.type || 'inconnu'}). Formats autorisés : PNG, JPG, JPEG, WEBP.`,
      };
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `Fichier trop lourd (${sizeMB} Mo). La taille maximale autorisée est de 10 Mo.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validates clothing name and category
   */
  static validateMetadata(name: string, category: string): FileValidationResult {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Le nom du vêtement est obligatoire.' };
    }
    if (!category) {
      return { isValid: false, error: 'La catégorie est obligatoire.' };
    }
    return { isValid: true };
  }
}
