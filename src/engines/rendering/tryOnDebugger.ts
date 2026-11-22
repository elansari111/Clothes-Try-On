import { NormalizedLandmark, LANDMARK_INDEX, POSE_CONNECTIONS } from '../../types/pose';
import { GarmentTransform, DebugRenderOptions } from '../../types/rendering';
import { garmentWarpingEngine } from './garmentWarpingEngine';
import { ArmOcclusionSegment } from './armOcclusionRenderer';

/**
 * Developer Debug Overlay for Virtual Try-On Engine
 * Provides comprehensive visual diagnostics of body landmarks, reference lines,
 * garment anchors, bounding quad, mesh wireframe, transform center, and confidence HUD.
 */
export class TryOnDebugger {
  private toCanvasPoint(
    lm: NormalizedLandmark,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ) {
    const xNorm = isMirrored ? 1 - lm.x : lm.x;
    return {
      x: xNorm * canvasWidth,
      y: lm.y * canvasHeight,
    };
  }

  /**
   * Main debug render method called after garment pass
   */
  renderDebugOverlay(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    landmarks: NormalizedLandmark[],
    transform: GarmentTransform | null,
    options: DebugRenderOptions,
    isMirrored: boolean,
    confidence: number = 0,
    fps: number = 0,
    latencyMs: number = 0,
    occlusionSegments: ArmOcclusionSegment[] = []
  ): void {
    const showBounding = options.showBoundingBox || options.showGarmentBoundingBox;
    const showMesh = options.showMeshWireframe || options.showGarmentMesh;

    if (!options.showSkeleton &&
        !options.showLandmarks &&
        !options.showReferenceLines &&
        !options.showGarmentAnchors &&
        !showBounding &&
        !showMesh &&
        !options.showTransformCenter &&
        !options.showConfidence &&
        !options.showArmOcclusion) {
      return;
    }

    ctx.save();

    // 1. Skeleton lines
    if (options.showSkeleton && landmarks && landmarks.length >= 25) {
      this.drawSkeletonLines(ctx, landmarks, canvasWidth, canvasHeight, isMirrored);
    }

    // 2. Numbered Landmark dots
    if (options.showLandmarks && landmarks && landmarks.length > 0) {
      this.drawNumberedLandmarks(ctx, landmarks, canvasWidth, canvasHeight, isMirrored);
    }

    // 3. Anatomical Reference lines
    if (options.showReferenceLines && transform && transform.bodyReferences) {
      this.drawReferenceLines(ctx, transform);
    }

    // 4. Garment Target Quad / Bounding Box
    if (showBounding && transform && transform.targetQuad) {
      this.drawBoundingQuad(ctx, transform);
    }

    // 5. Mesh Wireframe
    if (showMesh && transform && transform.targetQuad) {
      garmentWarpingEngine.renderWireframe(ctx, transform, 3, 0.8);
    }

    // 6. Garment Anchors
    if (options.showGarmentAnchors && transform && transform.anchorPoints) {
      this.drawGarmentAnchors(ctx, transform.anchorPoints);
    }

    // 7. Transform Center & Axis
    if (options.showTransformCenter && transform) {
      this.drawTransformCenter(ctx, transform);
    }

    // 8. Arm Occlusion Zones
    if (options.showArmOcclusion && occlusionSegments.length > 0) {
      this.drawArmOcclusion(ctx, occlusionSegments);
    }

    // 9. Developer Confidence & Telemetry HUD
    if (options.showConfidence) {
      this.drawTelemetryHUD(ctx, canvasWidth, confidence, fps, latencyMs, transform);
    }

    ctx.restore();
  }

  private drawSkeletonLines(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): void {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; // Sky-400

    for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
      const p1 = landmarks[startIndex];
      const p2 = landmarks[endIndex];
      if (!p1 || !p2) continue;
      if ((p1.visibility ?? 1) < 0.3 || (p2.visibility ?? 1) < 0.3) continue;

      const pt1 = this.toCanvasPoint(p1, canvasWidth, canvasHeight, isMirrored);
      const pt2 = this.toCanvasPoint(p2, canvasWidth, canvasHeight, isMirrored);

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.stroke();
    }
  }

  private drawNumberedLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean
  ): void {
    const keyIndices = new Set<number>([
      LANDMARK_INDEX.NOSE,
      LANDMARK_INDEX.LEFT_EYE,
      LANDMARK_INDEX.RIGHT_EYE,
      LANDMARK_INDEX.LEFT_EAR,
      LANDMARK_INDEX.RIGHT_EAR,
      LANDMARK_INDEX.LEFT_SHOULDER,
      LANDMARK_INDEX.RIGHT_SHOULDER,
      LANDMARK_INDEX.LEFT_ELBOW,
      LANDMARK_INDEX.RIGHT_ELBOW,
      LANDMARK_INDEX.LEFT_WRIST,
      LANDMARK_INDEX.RIGHT_WRIST,
      LANDMARK_INDEX.LEFT_HIP,
      LANDMARK_INDEX.RIGHT_HIP,
      LANDMARK_INDEX.LEFT_KNEE,
      LANDMARK_INDEX.RIGHT_KNEE,
      LANDMARK_INDEX.LEFT_ANKLE,
      LANDMARK_INDEX.RIGHT_ANKLE,
    ]);

    landmarks.forEach((lm, index) => {
      if ((lm.visibility ?? 1) < 0.25) return;
      const pt = this.toCanvasPoint(lm, canvasWidth, canvasHeight, isMirrored);
      const isKey = keyIndices.has(index);

      // Dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isKey ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isKey ? '#f43f5e' : 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Number badge for key points
      if (isKey) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${index}`, pt.x + 6, pt.y - 4);
      }
    });
  }

  private drawReferenceLines(ctx: CanvasRenderingContext2D, transform: GarmentTransform): void {
    const refs = transform.bodyReferences;
    if (!refs) return;

    // 1. Neck Reference (Magenta diamond & cross)
    ctx.save();
    ctx.strokeStyle = '#d946ef'; // Fuchsia-500
    ctx.fillStyle = 'rgba(217, 70, 239, 0.35)';
    ctx.lineWidth = 2;
    const nx = refs.neckBase.x;
    const ny = refs.neckBase.y;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 6);
    ctx.lineTo(nx + 6, ny);
    ctx.lineTo(nx, ny + 6);
    ctx.lineTo(nx - 6, ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.fillStyle = '#d946ef';
    ctx.fillText('NeckBase', nx + 8, ny + 3);

    // 2. Mid-Shoulder Point
    ctx.beginPath();
    ctx.arc(refs.midShoulder.x, refs.midShoulder.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; // Green-500
    ctx.fill();

    // 3. Spine / Torso Center line (Cyan dashed)
    ctx.strokeStyle = '#06b6d4'; // Cyan-500
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(refs.neckBase.x, refs.neckBase.y);
    ctx.lineTo(refs.midHip.x, refs.midHip.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawBoundingQuad(ctx: CanvasRenderingContext2D, transform: GarmentTransform): void {
    const { topLeft, topRight, bottomRight, bottomLeft } = transform.targetQuad;
    ctx.save();
    ctx.strokeStyle = '#eab308'; // Yellow-500
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);

    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#eab308';
    ctx.fillText('Garment Quad Bounds', topLeft.x + 4, topLeft.y - 6);
    ctx.restore();
  }

  private drawGarmentAnchors(
    ctx: CanvasRenderingContext2D,
    anchors: Record<string, { x: number; y: number } | undefined>
  ): void {
    ctx.save();
    for (const [name, pt] of Object.entries(anchors)) {
      if (!pt) continue;

      ctx.fillStyle = '#ec4899'; // Pink-500
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;

      // Draw diamond pin
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - 5);
      ctx.lineTo(pt.x + 5, pt.y);
      ctx.lineTo(pt.x, pt.y + 5);
      ctx.lineTo(pt.x - 5, pt.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, pt.x + 6, pt.y + 3);
    }
    ctx.restore();
  }

  private drawTransformCenter(ctx: CanvasRenderingContext2D, transform: GarmentTransform): void {
    ctx.save();
    const cx = transform.centerX;
    const cy = transform.centerY;
    const len = 14;

    ctx.strokeStyle = '#10b981'; // Emerald-500
    ctx.lineWidth = 2;

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(cx - len, cy);
    ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len);
    ctx.lineTo(cx, cy + len);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();

    // Rotation indicator
    const rotDeg = Math.round((transform.rotationRad * 180) / Math.PI);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Center (${rotDeg}°)`, cx + 8, cy - 8);

    ctx.restore();
  }

  private drawArmOcclusion(ctx: CanvasRenderingContext2D, segments: ArmOcclusionSegment[]): void {
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';

    for (const seg of segments) {
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

      ctx.font = '10px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`Arm (z: ${(seg.depthOffset * 100).toFixed(0)}cm)`, seg.end.x + 8, seg.end.y + 4);
    }
    ctx.restore();
  }

  private drawTelemetryHUD(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    confidence: number,
    fps: number,
    latencyMs: number,
    transform: GarmentTransform | null
  ): void {
    ctx.save();
    const boxW = 210;
    const boxH = 110;
    const boxX = canvasWidth - boxW - 12;
    const boxY = 12;

    // Background panel
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Text metrics
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('DIAGNOSTICS & TELEMETRY', boxX + 10, boxY + 18);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#cbd5e1';

    ctx.fillText(`FPS: ${fps} | Render: ${latencyMs}ms`, boxX + 10, boxY + 36);
    ctx.fillText(`Pose Confidence: ${confidence}%`, boxX + 10, boxY + 52);

    if (transform) {
      const rotDeg = Math.round((transform.rotationRad * 180) / Math.PI);
      ctx.fillText(`Garment: ${Math.round(transform.width)}x${Math.round(transform.height)}px`, boxX + 10, boxY + 68);
      ctx.fillText(`Rotation: ${rotDeg}° | Scale: ${transform.scaleX.toFixed(2)}x`, boxX + 10, boxY + 84);
      ctx.fillText(`Status: OK (Valid transform)`, boxX + 10, boxY + 100);
    } else {
      ctx.fillText('Status: No active body/garment', boxX + 10, boxY + 68);
    }

    ctx.restore();
  }
}

export const tryOnDebugger = new TryOnDebugger();
