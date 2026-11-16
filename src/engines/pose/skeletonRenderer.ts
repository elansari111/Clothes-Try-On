import { NormalizedLandmark, POSE_CONNECTIONS, LANDMARK_INDEX } from '../../types/pose';

export interface SkeletonRenderOptions {
  isMirrored?: boolean;
  showLandmarks?: boolean;
  showConnections?: boolean;
  showMeasurementsOverlay?: boolean;
  minVisibility?: number;
}

/**
 * Draws the human skeleton and keypoints cleanly over a 2D canvas
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  options: SkeletonRenderOptions = {}
): void {
  const {
    isMirrored = true,
    showLandmarks = true,
    showConnections = true,
    minVisibility = 0.35,
  } = options;

  ctx.save();

  // Helper to map normalized point (0..1) to canvas coordinates
  const getCanvasCoords = (pt: NormalizedLandmark) => {
    let xNorm = pt.x;
    if (isMirrored) {
      xNorm = 1 - xNorm;
    }
    return {
      x: xNorm * canvasWidth,
      y: pt.y * canvasHeight,
    };
  };

  // 1. Draw connections
  if (showConnections) {
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      if (!p1 || !p2) return;
      if ((p1.visibility ?? 1) < minVisibility || (p2.visibility ?? 1) < minVisibility) {
        return;
      }

      const c1 = getCanvasCoords(p1);
      const c2 = getCanvasCoords(p2);

      // Gradient color based on body section
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);

      // Shoulders / Torso in vibrant indigo / cyan
      if (
        (startIdx === 11 && endIdx === 12) ||
        (startIdx === 11 && endIdx === 23) ||
        (startIdx === 12 && endIdx === 24) ||
        (startIdx === 23 && endIdx === 24)
      ) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)'; // Indigo
        ctx.lineWidth = 4;
      } else if (startIdx >= 13 && startIdx <= 22) {
        // Arms
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)'; // Cyan
        ctx.lineWidth = 3;
      } else {
        // Legs / Head
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)'; // Purple
        ctx.lineWidth = 2.5;
      }

      ctx.stroke();
    });
  }

  // 2. Draw landmarks keypoints
  if (showLandmarks) {
    landmarks.forEach((landmark, index) => {
      if ((landmark.visibility ?? 1) < minVisibility) return;

      const { x, y } = getCanvasCoords(landmark);

      // Distinct styling for key anatomical anchors (shoulders & hips)
      const isKeyJoint =
        index === LANDMARK_INDEX.LEFT_SHOULDER ||
        index === LANDMARK_INDEX.RIGHT_SHOULDER ||
        index === LANDMARK_INDEX.LEFT_HIP ||
        index === LANDMARK_INDEX.RIGHT_HIP;

      const radius = isKeyJoint ? 6 : 4;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (isKeyJoint) {
        ctx.fillStyle = '#6366F1'; // Solid primary indigo
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Pulsing outer halo for shoulders
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#06B6D4'; // Cyan
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  ctx.restore();
}
