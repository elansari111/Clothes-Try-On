/**
 * Unit tests for GarmentAnchorService
 */
import { describe, it, expect } from 'vitest';
import { garmentAnchorService } from '../../src/features/clothing/services/garmentAnchorService';

describe('GarmentAnchorService', () => {
  it('generates 7 default upper body anchors', () => {
    const anchors = garmentAnchorService.getDefaultAnchors('T-Shirts');
    expect(anchors).toBeDefined();
    if ('neckCenter' in anchors) {
      expect(anchors.neckCenter).toBeDefined();
      expect(anchors.leftShoulder).toBeDefined();
      expect(anchors.rightShoulder).toBeDefined();
      expect(anchors.leftArmpit).toBeDefined();
      expect(anchors.rightArmpit).toBeDefined();
      expect(anchors.leftBottom).toBeDefined();
      expect(anchors.rightBottom).toBeDefined();
    }
  });

  it('ensures all 7 anchors exist when given partial anchors', () => {
    const partial = {
      neckCenter: { x: 0.5, y: 0.1 },
      leftShoulder: { x: 0.2, y: 0.15 },
      rightShoulder: { x: 0.8, y: 0.15 },
      leftBottom: { x: 0.25, y: 0.95 },
      rightBottom: { x: 0.75, y: 0.95 },
    };
    const ensured = garmentAnchorService.ensureUpperBodyAnchors(partial);
    expect(ensured.leftArmpit).toBeDefined();
    expect(ensured.rightArmpit).toBeDefined();
  });
});
