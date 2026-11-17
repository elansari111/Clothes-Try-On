export interface Point2D {
  x: number;
  y: number;
}

export interface TryOnAdjustments {
  scale: number;      // Default 1.0 (e.g., 0.6 to 1.6)
  offsetX: number;    // Horizontal pixel offset
  offsetY: number;    // Vertical pixel offset
  opacity: number;    // Default 0.96
  enableWarping: boolean;
}

export interface GarmentTransform {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationRad: number;
  scaleX: number;
  scaleY: number;
  // Target 4-point quad on canvas (for 2D triangle mesh warping)
  targetQuad: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  // Source normalized anchor bounds inside the garment image
  sourceQuad: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  isValid: boolean;
}

export interface TryOnPerformanceMetrics {
  renderLatencyMs: number;
  fps: number;
  warpingActive: boolean;
}
