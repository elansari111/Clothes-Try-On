import { useState, useCallback } from 'react';
import { TryOnMode } from '../types/virtualTryOn';
import { ClothingItem } from '../../clothing/types/clothing';

export function useVirtualTryOn(initialGarment: ClothingItem | null = null) {
  const [mode, setMode] = useState<TryOnMode>('live-ar');
  const [selectedGarment, setSelectedGarment] = useState<ClothingItem | null>(initialGarment);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const switchMode = useCallback((newMode: TryOnMode) => {
    setMode(newMode);
  }, []);

  return {
    mode,
    switchMode,
    selectedGarment,
    setSelectedGarment,
    isCapturing,
    setIsCapturing,
  };
}
