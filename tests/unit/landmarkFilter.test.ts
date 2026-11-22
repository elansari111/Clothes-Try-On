/**
 * Unit tests for OneEuroFilter landmark filter
 */
import { describe, it, expect } from 'vitest';
import { OneEuroFilter1D, PoseLandmarksFilter } from '../../src/features/body-tracking/processors/landmarkFilter';

describe('OneEuroFilter1D', () => {
  it('filters values smoothly without crashing', () => {
    const filter = new OneEuroFilter1D(1.2, 0.05);
    const v1 = filter.filter(10, 1000);
    const v2 = filter.filter(10.2, 1033);
    expect(v1).toBe(10);
    expect(v2).toBeGreaterThan(10.0);
    expect(v2).toBeLessThan(10.2);
  });
});

describe('PoseLandmarksFilter', () => {
  it('smooths 33 normalized landmarks', () => {
    const filter = new PoseLandmarksFilter();
    const mockLandmarks = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5 + i * 0.01,
      y: 0.5,
      z: 0.0,
      visibility: 0.9,
    }));
    const filtered = filter.filterLandmarks(mockLandmarks, 1000);
    expect(filtered).toHaveLength(33);
    expect(filtered[0].x).toBeCloseTo(0.5, 4);
  });
});
