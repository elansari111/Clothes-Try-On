import { GarmentTransform, Point2D } from '../types/rendering';

/**
 * Smooths garment transformations across frames using exponential moving average (EMA)
 * to eliminate MediaPipe landmark jitter without introducing sluggish lag.
 */
export class GarmentTransformer {
  private prevTransform: GarmentTransform | null = null;
  private smoothingFactor: number = 0.35; // 0 = frozen, 1 = no smoothing

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
    };
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
  }

  /**
   * Returns a smoothed transform based on current and previous frame
   */
  smooth(target: GarmentTransform): GarmentTransform {
    if (!this.prevTransform) {
      this.prevTransform = target;
      return target;
    }

    // Adaptive smoothing: if the user moves quickly, increase responsiveness
    const distMoved = Math.hypot(
      target.centerX - this.prevTransform.centerX,
      target.centerY - this.prevTransform.centerY
    );
    const t = distMoved > 40 ? 0.65 : this.smoothingFactor;

    const smoothed: GarmentTransform = {
      centerX: this.lerp(this.prevTransform.centerX, target.centerX, t),
      centerY: this.lerp(this.prevTransform.centerY, target.centerY, t),
      width: this.lerp(this.prevTransform.width, target.width, t),
      height: this.lerp(this.prevTransform.height, target.height, t),
      rotationRad: this.lerpAngle(this.prevTransform.rotationRad, target.rotationRad, t),
      scaleX: this.lerp(this.prevTransform.scaleX, target.scaleX, t),
      scaleY: this.lerp(this.prevTransform.scaleY, target.scaleY, t),
      targetQuad: {
        topLeft: this.lerpPoint(this.prevTransform.targetQuad.topLeft, target.targetQuad.topLeft, t),
        topRight: this.lerpPoint(this.prevTransform.targetQuad.topRight, target.targetQuad.topRight, t),
        bottomRight: this.lerpPoint(
          this.prevTransform.targetQuad.bottomRight,
          target.targetQuad.bottomRight,
          t
        ),
        bottomLeft: this.lerpPoint(
          this.prevTransform.targetQuad.bottomLeft,
          target.targetQuad.bottomLeft,
          t
        ),
      },
      sourceQuad: target.sourceQuad,
      anchorPoints: target.anchorPoints,
      bodyReferences: target.bodyReferences,
      isValid: target.isValid,
    };

    this.prevTransform = smoothed;
    return smoothed;
  }

  /**
   * Resets smoothing history (e.g. when tracking is lost or garment switches)
   */
  reset(): void {
    this.prevTransform = null;
  }
}

export const garmentTransformer = new GarmentTransformer();
