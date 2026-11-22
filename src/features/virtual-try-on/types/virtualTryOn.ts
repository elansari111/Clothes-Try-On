import { ClothingItem } from '../../clothing/types/clothing';

export type TryOnMode = 'live-ar' | 'ai-cloud';

export interface VirtualTryOnState {
  mode: TryOnMode;
  selectedGarment: ClothingItem | null;
  isCameraActive: boolean;
  isProcessing: boolean;
  error: string | null;
}

export interface ModeSwitchOptions {
  autoStartCamera?: boolean;
  resetAdjustments?: boolean;
}
