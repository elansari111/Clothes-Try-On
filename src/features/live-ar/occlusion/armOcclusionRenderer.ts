import { NormalizedLandmark, LANDMARK_INDEX } from '../../body-tracking/types/pose';
import { Point2D } from '../types/rendering';

export interface ArmOcclusionSegment {
  isLeft: boolean;
  start: Point2D;
  end: Point2D;
  hand?: Point2D;
  radius: number;
  depthOffset: number; // How much closer to camera than torso (negative is closer)
}

/**
 * Renders arms/hands on top of the garment overlay when they cross in front of the torso.
 * Uses 3D MediaPipe landmark depth (z) to determine foreground status and clips the live
 * video element cleanly onto the canvas over the garment layer.
 */
export class ArmOcclusionRenderer {
  private toCanvasPoint(
    lm: NormalizedLandmark,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): Point2D {
    const xNorm = isMirrored ? 1 - lm.x : lm.x;
    return {
      x: xNorm * canvasWidth,
      y: lm.y * canvasHeight,
    };
  }

  /**
   * Detects whether arms/forearms are positioned in front of the torso plane in 3D camera space.
   */
  detectOccludingArms(
    landmarks: NormalizedLandmark[],
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): ArmOcclusionSegment[] {
    const minVis = 0.45;
    const lmLS = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
    const lmRS = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
    const lmLH = landmarks[LANDMARK_INDEX.LEFT_HIP];
    const lmRH = landmarks[LANDMARK_INDEX.RIGHT_HIP];

    if (!lmLS || !lmRS || (lmLS.visibility ?? 1) < minVis || (lmRS.visibility ?? 1) < minVis) {
      return [];
    }

    // Average torso Z depth (MediaPipe z is normalized camera depth; lower = closer)
    const hipZ = (lmLH?.z ?? lmLS.z ?? 0) + (lmRH?.z ?? lmRS.z ?? 0);
    const shoulderZ = (lmLS.z ?? 0) + (lmRS.z ?? 0);
    const avgTorsoZ = (shoulderZ + hipZ) / 4;

    const pLS = this.toCanvasPoint(lmLS, canvasWidth, canvasHeight, isMirrored);
    const pRS = this.toCanvasPoint(lmRS, canvasWidth, canvasHeight, isMirrored);
    const shoulderDist = Math.hypot(pRS.x - pLS.x, pRS.y - pLS.y);
    const armRadius = Math.max(16, shoulderDist * 0.13);

    // Torso 2D horizontal & vertical bounds with generous margin
    const minTorsoX = Math.min(pLS.x, pRS.x) - armRadius * 1.5;
    const maxTorsoX = Math.max(pLS.x, pRS.x) + armRadius * 1.5;
    const topTorsoY = Math.min(pLS.y, pRS.y) - armRadius * 0.8;
    const botTorsoY = Math.max(pLS.y, pRS.y) + shoulderDist * 1.6;

    const segments: ArmOcclusionSegment[] = [];

    // Helper to evaluate an arm (Elbow -> Wrist -> Index)
    const checkArm = (
      lmElbow: NormalizedLandmark | undefined,
      lmWrist: NormalizedLandmark | undefined,
      lmHand: NormalizedLandmark | undefined,
      isLeft: boolean
    ) => {
      if (!lmElbow || !lmWrist) return;
      if ((lmElbow.visibility ?? 0) < minVis && (lmWrist.visibility ?? 0) < minVis) return;

      const pElbow = this.toCanvasPoint(lmElbow, canvasWidth, canvasHeight, isMirrored);
      const pWrist = this.toCanvasPoint(lmWrist, canvasWidth, canvasHeight, isMirrored);
      const pHand = lmHand && (lmHand.visibility ?? 0) >= minVis
        ? this.toCanvasPoint(lmHand, canvasWidth, canvasHeight, isMirrored)
        : undefined;

      // Check if wrist or elbow is within torso 2D bounds
      const wristInTorso =
        pWrist.x >= minTorsoX && pWrist.x <= maxTorsoX && pWrist.y >= topTorsoY && pWrist.y <= botTorsoY;
      const elbowInTorso =
        pElbow.x >= minTorsoX && pElbow.x <= maxTorsoX && pElbow.y >= topTorsoY && pElbow.y <= botTorsoY;

      if (!wristInTorso && !elbowInTorso) return;

      // Depth comparison: wrist or elbow must be noticeably closer to camera than torso plane
      // MediaPipe z-offset: threshold typically -0.04 to -0.08
      const wristDepthDiff = (lmWrist.z ?? 0) - avgTorsoZ;
      const elbowDepthDiff = (lmElbow.z ?? 0) - avgTorsoZ;
      const isForeground = wristDepthDiff < -0.04 || elbowDepthDiff < -0.06;

      if (isForeground) {
        segments.push({
          isLeft,
          start: pElbow,
          end: pWrist,
          hand: pHand,
          radius: armRadius,
          depthOffset: Math.min(wristDepthDiff, elbowDepthDiff),
        });
      }
    };

    // Check Left Arm (13: elbow, 15: wrist, 19: index)
    checkArm(
      landmarks[LANDMARK_INDEX.LEFT_ELBOW],
      landmarks[LANDMARK_INDEX.LEFT_WRIST],
      landmarks[LANDMARK_INDEX.LEFT_INDEX],
      true
    );

    // Check Right Arm (14: elbow, 16: wrist, 20: index)
    checkArm(
      landmarks[LANDMARK_INDEX.RIGHT_ELBOW],
      landmarks[LANDMARK_INDEX.RIGHT_WRIST],
      landmarks[LANDMARK_INDEX.RIGHT_INDEX],
      false
    );

    return segments;
  }

  /**
   * Renders the detected foreground arms from the live video feed directly on top of the garment.
   */
  renderArmOcclusion(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    segments: ArmOcclusionSegment[],
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): void {
    if (!segments || segments.length === 0) return;

    ctx.save();

    for (const seg of segments) {
      // Build capsule path along Elbow -> Wrist (and optionally to Hand)
      ctx.save();
      ctx.beginPath();

      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const len = Math.hypot(dx, dy);
      if (len > 5) {
        const nx = (-dy / len) * seg.radius;
        const ny = (dx / len) * seg.radius;

        // Start cap (near elbow)
        ctx.arc(seg.start.x, seg.start.y, seg.radius, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
        // Path to wrist
        ctx.lineTo(seg.end.x - nx, seg.end.y - ny);

        // If hand landmark is available, extend capsule over the hand
        if (seg.hand) {
          ctx.lineTo(seg.hand.x - nx * 0.9, seg.hand.y - ny * 0.9);
          ctx.arc(seg.hand.x, seg.hand.y, seg.radius * 0.95, 0, Math.PI * 2);
          ctx.lineTo(seg.end.x + nx, seg.end.y + ny);
        } else {
          ctx.arc(seg.end.x, seg.end.y, seg.radius, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
        }

        ctx.closePath();
        ctx.clip();

        // Draw the exact video feed segment inside the clipped arm region
        if (isMirrored) {
          ctx.save();
          ctx.translate(canvasWidth, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws visual indicators of the detected occlusion capsules for debugging.
   */
  drawDebugOcclusion(ctx: CanvasRenderingContext2D, segments: ArmOcclusionSegment[]): void {
    if (!segments || segments.length === 0) return;

    ctx.save();
    ctx.lineWidth = 2;

    for (const seg of segments) {
      ctx.strokeStyle = '#f43f5e'; // Rose-500
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';

      ctx.beginPath();
      ctx.arc(seg.start.x, seg.start.y, seg.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(seg.end.x, seg.end.y, seg.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();

      if (seg.hand) {
        ctx.beginPath();
        ctx.arc(seg.hand.x, seg.hand.y, seg.radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
      }

      // Label with depth delta
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.fillText(
        `${seg.isLeft ? 'L' : 'R'} Arm [dz: ${(seg.depthOffset * 100).toFixed(0)}cm]`,
        seg.end.x + 8,
        seg.end.y - 8
      );
    }

    ctx.restore();
  }
}

export const armOcclusionRenderer = new ArmOcclusionRenderer();
