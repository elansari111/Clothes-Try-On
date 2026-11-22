import { TryOnMode, VirtualTryOnState } from '../types/virtualTryOn';
import { ClothingItem } from '../../clothing/types/clothing';

/**
 * High-level coordinator coordinating Live AR and Cloud AI Try-On modes
 */
export class TryOnCoordinator {
  private state: VirtualTryOnState = {
    mode: 'live-ar',
    selectedGarment: null,
    isCameraActive: false,
    isProcessing: false,
    error: null,
  };

  getState(): VirtualTryOnState {
    return { ...this.state };
  }

  setMode(mode: TryOnMode): void {
    this.state.mode = mode;
  }

  setSelectedGarment(item: ClothingItem | null): void {
    this.state.selectedGarment = item;
  }

  setCameraActive(active: boolean): void {
    this.state.isCameraActive = active;
  }
}

export const tryOnCoordinator = new TryOnCoordinator();
