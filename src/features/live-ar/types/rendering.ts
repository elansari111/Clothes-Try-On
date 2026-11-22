export interface Point2D {
  x: number;
  y: number;
}

export interface TryOnAdjustments {
  scale: number;              // Overall garment scale (default 1.0, range 0.5..1.6)
  garmentWidthScale?: number;  // Core torso/garment width ratio (default 1.0, range 0.7..1.4)
  shoulderWidthScale: number; // Shoulder width ratio (default 1.0, range 0.7..1.4)
  garmentHeightScale?: number; // Garment height ratio (default 1.0, range 0.7..1.4)
  necklineOffsetY: number;    // Neckline vertical adjustment in px (default 0, range -80..80)
  offsetX: number;            // Horizontal pixel offset (default 0)
  offsetY: number;            // Vertical pixel offset (default 0)
  rotationOffsetDeg?: number;  // Rotation offset in degrees (default 0, range -30..30)
  meshWarpStrength?: number;   // Mesh deformation strength (0 to 1, default 1.0)
  enableArmOcclusion?: boolean; // Restore foreground arms when in front of garment
  opacity: number;            // Default 0.96
  enableWarping: boolean;     // Warp mesh toggle
}

export interface DebugRenderOptions {
  enabled?: boolean;
  showLandmarks?: boolean;
  showSkeleton?: boolean;
  showReferenceLines?: boolean;     // Shoulder line, Hip line, Spine/Torso center, Neck base
  showGarmentAnchors?: boolean;     // Screen-projected garment anchors
  showGarmentBoundingBox?: boolean; // Target transformed quad
  showBoundingBox?: boolean;        // Alias for showGarmentBoundingBox
  showGarmentMesh?: boolean;        // 2D triangle wireframe
  showMeshWireframe?: boolean;      // Alias for showGarmentMesh
  showTransformCenter?: boolean;    // Transformation center & orientation
  showConfidence?: boolean;         // Visual landmark confidence numbers
  showArmOcclusion?: boolean;       // Visual arm occlusion zone bounds
}

export interface GarmentTransform {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationRad: number;
  scaleX: number;
  scaleY: number;
  // Target 4-point quad on canvas
  targetQuad: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  // Screen coordinates of garment anchor points
  anchorPoints?: {
    leftShoulder?: Point2D;
    rightShoulder?: Point2D;
    neckCenter?: Point2D;
    leftArmpit?: Point2D;
    rightArmpit?: Point2D;
    leftBottom?: Point2D;
    rightBottom?: Point2D;
    [key: string]: Point2D | undefined;
  };
  // Source normalized anchor bounds inside the garment image
  sourceQuad: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  // Anatomical body reference positions
  bodyReferences?: {
    midShoulder: Point2D;
    neckBase: Point2D;
    midHip: Point2D;
    bodyLeftShoulder?: Point2D;
    bodyRightShoulder?: Point2D;
    bodyLeftHip?: Point2D;
    bodyRightHip?: Point2D;
    spineTop?: Point2D;
    spineBottom?: Point2D;
  };
  isValid: boolean;
}

export interface TryOnPerformanceMetrics {
  renderLatencyMs: number;
  fps: number;
  warpingActive: boolean;
}
