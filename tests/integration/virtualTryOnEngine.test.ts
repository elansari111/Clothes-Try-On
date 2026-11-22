/**
 * Integration test for Virtual Try-On Engine lifecycle
 */
import { describe, it, expect } from 'vitest';
import { virtualTryOnEngine } from '../../src/features/live-ar/engine/virtualTryOnEngine';

describe('VirtualTryOnEngine Integration', () => {
  it('initializes and manages garment switching state without errors', async () => {
    expect(virtualTryOnEngine).toBeDefined();
    await virtualTryOnEngine.setActiveGarment(null);
    expect(virtualTryOnEngine.getLastRenderLatency()).toBe(0);
  });
});
