import crypto from 'node:crypto';
import { Genlook, GenlookError, type OutputResolution, type UploadableFile } from '@genlook/api';
import { loadMainEnvConfig } from '../../config/env';

export interface MainGenlookStatus {
  configured: boolean;
  provider: 'genlook';
  baseUrl: string;
  creditBalance?: number;
  error?: string;
}

export interface MainGenlookSubmitPayload {
  personImageDataUrl: string;
  garment: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    imagePath: string;
  };
  resolution?: OutputResolution;
}

export interface MainGenlookGenerationState {
  generationId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  resultImageUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/;

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } {
  const match = DATA_URL_REGEX.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Format image invalide. Utilisez PNG, JPEG ou WEBP en base64.');
  }
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const ext = mimeType.split('/')[1] || 'png';
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Taille image invalide (max 15 Mo).');
  }

  return { buffer, mimeType, ext };
}

function formatGenlookError(err: unknown): string {
  if (err instanceof GenlookError) {
    const reqInfo = err.requestId ? ` [${err.requestId}]` : '';
    return `${err.code}: ${err.message}${reqInfo}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Erreur inconnue avec l’API Genlook.';
}

class MainGenlookService {
  private client: Genlook | null = null;
  private lastConfigSignature = '';

  private getClient(): { client: Genlook; baseUrl: string } {
    const env = loadMainEnvConfig();
    if (!env.genlookApiKey || env.genlookApiKey === 'your_genlook_api_key_here') {
      throw new Error('Clé API Genlook manquante dans le fichier .env (GENLOOK_API_KEY).');
    }

    const signature = `${env.genlookBaseUrl}::${env.genlookApiKey.length}`;
    if (!this.client || this.lastConfigSignature !== signature) {
      this.client = new Genlook({
        apiKey: env.genlookApiKey,
        baseUrl: env.genlookBaseUrl,
        timeoutMs: 60_000,
        userAgent: 'virtual-try-on-desktop/0.1.0',
      });
      this.lastConfigSignature = signature;
    }

    return { client: this.client, baseUrl: env.genlookBaseUrl };
  }

  async getStatus(fetchCredits: boolean = true): Promise<MainGenlookStatus> {
    const env = loadMainEnvConfig();
    const configured = Boolean(
      env.genlookApiKey && env.genlookApiKey !== 'your_genlook_api_key_here'
    );

    if (!configured) {
      return {
        configured: false,
        provider: 'genlook',
        baseUrl: env.genlookBaseUrl,
        error: 'GENLOOK_API_KEY non configurée dans .env',
      };
    }

    if (!fetchCredits) {
      return {
        configured: true,
        provider: 'genlook',
        baseUrl: env.genlookBaseUrl,
      };
    }

    try {
      const { client, baseUrl } = this.getClient();
      const { creditBalance } = await client.account.credits();
      return {
        configured: true,
        provider: 'genlook',
        baseUrl,
        creditBalance,
      };
    } catch (err) {
      return {
        configured: true,
        provider: 'genlook',
        baseUrl: env.genlookBaseUrl,
        error: formatGenlookError(err),
      };
    }
  }

  async submitTryOn(payload: MainGenlookSubmitPayload): Promise<MainGenlookGenerationState> {
    if (!payload || typeof payload.personImageDataUrl !== 'string' || !payload.garment) {
      throw new Error('Paramètres invalides pour la génération Genlook.');
    }

    const { client } = this.getClient();

    // 1. Upload shopper photo to obtain reusable imageId
    const personImg = parseImageDataUrl(payload.personImageDataUrl);
    const { imageId } = await client.images.upload(personImg.buffer, {
      mimeType: personImg.mimeType,
      filename: `person.${personImg.ext}`,
      crop: true,
    });

    // 2. Prepare garment image (either remote HTTPS URL or local multipart upload)
    const files: Record<string, UploadableFile> = {};
    const imagePath = payload.garment.imagePath.trim();
    let productImageSource: { url: string } | { fileKey: string };

    if (/^https?:\/\//i.test(imagePath)) {
      productImageSource = { url: imagePath };
    } else if (imagePath.startsWith('data:image/')) {
      const garmentImg = parseImageDataUrl(imagePath);
      files.garment = {
        data: garmentImg.buffer,
        mimeType: garmentImg.mimeType,
        filename: `garment.${garmentImg.ext}`,
      };
      productImageSource = { fileKey: 'garment' };
    } else {
      throw new Error("Source d'image vêtement non prise en charge par Genlook.");
    }

    // Content-based externalId so edited/cleaned garments refresh cleanly
    const imgHash = crypto.createHash('sha1').update(imagePath).digest('hex').slice(0, 8);
    const safeTitle = (payload.garment.title || 'Garment').trim().slice(0, 120);
    const safeDesc =
      (payload.garment.description || '').trim() ||
      `${payload.garment.category || 'Apparel'} - ${safeTitle}`;

    try {
      const created = await client.tryOn.create({
        products: [
          {
            externalId: `vto-${payload.garment.id}-${imgHash}`,
            title: safeTitle,
            description: safeDesc,
            images: [{ source: productImageSource }],
          },
        ],
        person: {
          image: {
            source: { id: imageId },
          },
        },
        output: {
          resolution: payload.resolution === '2k' ? '2k' : 'default',
        },
        ...(Object.keys(files).length > 0 ? { files } : {}),
      });

      return {
        generationId: created.generationId,
        status: created.status,
      };
    } catch (err) {
      throw new Error(formatGenlookError(err));
    }
  }

  async pollGeneration(generationId: string): Promise<MainGenlookGenerationState> {
    if (!generationId || typeof generationId !== 'string') {
      throw new Error('generationId invalide.');
    }

    const { client } = this.getClient();
    try {
      const res = await client.generations.retrieve(generationId.trim());
      return {
        generationId: res.generationId,
        status: res.status,
        resultImageUrl: res.resultImageUrl,
        errorMessage: res.errorMessage,
        errorCode: res.errorCode,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
      };
    } catch (err) {
      throw new Error(formatGenlookError(err));
    }
  }
}

export const mainGenlookService = new MainGenlookService();
