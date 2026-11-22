import { GarmentTransform, Point2D } from '../types/rendering';

/**
 * 2D Triangle-Mesh Warping Engine for Canvas 2D
 * Deforms a cropped garment asset (HTMLCanvasElement or HTMLImageElement)
 * seamlessly onto a dynamic body quad while preserving alpha transparency and aspect ratio.
 */
export class GarmentWarpingEngine {
  /**
   * Computes bilinearly interpolated point inside a quad given normalized (u, v) in [0, 1]
   */
  private bilerpQuad(
    tl: Point2D,
    tr: Point2D,
    br: Point2D,
    bl: Point2D,
    u: number,
    v: number
  ): Point2D {
    const topX = tl.x + (tr.x - tl.x) * u;
    const topY = tl.y + (tr.y - tl.y) * u;
    const botX = bl.x + (br.x - bl.x) * u;
    const botY = bl.y + (br.y - bl.y) * u;

    return {
      x: topX + (botX - topX) * v,
      y: topY + (botY - topY) * v,
    };
  }

  /**
   * Draws a single textured triangle from source coordinates (u0,v0..u2,v2)
   * onto destination canvas coordinates (x0,y0..x2,y2) using an exact affine transform.
   */
  private drawTexturedTriangle(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number
  ): void {
    const denom = u0 * (v2 - v1) - u1 * v2 + u2 * v1 + (u1 - u2) * v0;
    if (Math.abs(denom) < 1e-4) return;

    const m11 = -(v0 * (x2 - x1) - v1 * x2 + v2 * x1 + (v1 - v2) * x0) / denom;
    const m12 = (v1 * y2 + v0 * (y1 - y2) - v2 * y1 + (v2 - v1) * y0) / denom;
    const m21 = (u0 * (x2 - x1) - u1 * x2 + u2 * x1 + (u1 - u2) * x0) / denom;
    const m22 = -(u1 * y2 + u0 * (y1 - y2) - u2 * y1 + (u2 - u1) * y0) / denom;
    const dx =
      (u0 * (v2 * x1 - v1 * x2) + v0 * (u1 * x2 - u2 * x1) + (u2 * v1 - u1 * v2) * x0) / denom;
    const dy =
      (u0 * (v2 * y1 - v1 * y2) + v0 * (u1 * y2 - u2 * y1) + (u2 * v1 - u1 * v2) * y0) / denom;

    // Guard against non-finite values
    if (!Number.isFinite(m11) || !Number.isFinite(m22) || !Number.isFinite(dx) || !Number.isFinite(dy)) {
      return;
    }

    // Expand clipping polygon slightly outward from triangle centroid to eliminate sub-pixel seams
    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;
    const pad = 0.65;

    const expandPt = (px: number, py: number) => {
      const vx = px - cx;
      const vy = py - cy;
      const len = Math.hypot(vx, vy);
      if (len < 1e-3) return { x: px, y: py };
      return { x: px + (vx / len) * pad, y: py + (vy / len) * pad };
    };

    const e0 = expandPt(x0, y0);
    const e1 = expandPt(x1, y1);
    const e2 = expandPt(x2, y2);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(e0.x, e0.y);
    ctx.lineTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.closePath();
    ctx.clip();

    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }

  /**
   * Computes the blended destination quad between rigid affine bounds and perspective target quad
   * based on meshWarpStrength (0 = purely rigid, 1 = full contour warp).
   */
  private getBlendedQuad(
    transform: GarmentTransform,
    warpStrength: number = 0.8
  ): { topLeft: Point2D; topRight: Point2D; bottomRight: Point2D; bottomLeft: Point2D } {
    const { centerX, centerY, width, height, rotationRad, targetQuad } = transform;
    const cosA = Math.cos(rotationRad);
    const sinA = Math.sin(rotationRad);
    const halfW = width / 2;
    const halfH = height / 2;

    // Rigid unwarped bounding box corners
    const rigidTL: Point2D = {
      x: centerX - halfW * cosA + halfH * sinA,
      y: centerY - halfW * sinA - halfH * cosA,
    };
    const rigidTR: Point2D = {
      x: centerX + halfW * cosA + halfH * sinA,
      y: centerY + halfW * sinA - halfH * cosA,
    };
    const rigidBR: Point2D = {
      x: centerX + halfW * cosA - halfH * sinA,
      y: centerY + halfW * sinA + halfH * cosA,
    };
    const rigidBL: Point2D = {
      x: centerX - halfW * cosA - halfH * sinA,
      y: centerY - halfW * sinA + halfH * cosA,
    };

    const s = Math.max(0, Math.min(1, warpStrength));
    if (s <= 0.02) {
      return { topLeft: rigidTL, topRight: rigidTR, bottomRight: rigidBR, bottomLeft: rigidBL };
    }

    const lerpP = (pA: Point2D, pB: Point2D): Point2D => ({
      x: pA.x + (pB.x - pA.x) * s,
      y: pA.y + (pB.y - pA.y) * s,
    });

    return {
      topLeft: lerpP(rigidTL, targetQuad.topLeft),
      topRight: lerpP(rigidTR, targetQuad.topRight),
      bottomRight: lerpP(rigidBR, targetQuad.bottomRight),
      bottomLeft: lerpP(rigidBL, targetQuad.bottomLeft),
    };
  }

  /**
   * Renders the garment warped onto the target quad using a subdivided triangle mesh.
   */
  renderWarpedMesh(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    transform: GarmentTransform,
    gridSteps: number = 3,
    warpStrength: number = 0.8
  ): boolean {
    const imgW = source.width;
    const imgH = source.height;
    if (imgW === 0 || imgH === 0) return false;

    const { topLeft, topRight, bottomRight, bottomLeft } = this.getBlendedQuad(transform, warpStrength);

    // Validate geometry against extreme collapse
    const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
    const botWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
    const leftHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
    const rightHeight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);

    if (topWidth < 12 || botWidth < 12 || leftHeight < 12 || rightHeight < 12) {
      return false;
    }

    for (let row = 0; row < gridSteps; row++) {
      const v0 = row / gridSteps;
      const v1 = (row + 1) / gridSteps;

      for (let col = 0; col < gridSteps; col++) {
        const u0 = col / gridSteps;
        const u1 = (col + 1) / gridSteps;

        const p00 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u0, v0);
        const p10 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u1, v0);
        const p11 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u1, v1);
        const p01 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u0, v1);

        const su0 = u0 * imgW;
        const sv0 = v0 * imgH;
        const su1 = u1 * imgW;
        const sv1 = v1 * imgH;

        // Triangle 1: p00 -> p10 -> p11
        this.drawTexturedTriangle(
          ctx,
          source,
          p00.x,
          p00.y,
          p10.x,
          p10.y,
          p11.x,
          p11.y,
          su0,
          sv0,
          su1,
          sv0,
          su1,
          sv1
        );

        // Triangle 2: p00 -> p11 -> p01
        this.drawTexturedTriangle(
          ctx,
          source,
          p00.x,
          p00.y,
          p11.x,
          p11.y,
          p01.x,
          p01.y,
          su0,
          sv0,
          su1,
          sv1,
          su0,
          sv1
        );
      }
    }

    return true;
  }

  /**
   * Fallback: rigid center-aligned affine rendering
   */
  renderAffineFallback(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    transform: GarmentTransform
  ): void {
    const imgW = source.width;
    const imgH = source.height;
    if (imgW === 0 || imgH === 0) return;

    ctx.save();
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.rotationRad);
    ctx.drawImage(
      source,
      -transform.width / 2,
      -transform.height / 2,
      transform.width,
      transform.height
    );
    ctx.restore();
  }

  /**
   * Draws the mesh wireframe in developer debug mode.
   */
  renderWireframe(
    ctx: CanvasRenderingContext2D,
    transform: GarmentTransform,
    gridSteps: number = 3,
    warpStrength: number = 0.8
  ): void {
    const { topLeft, topRight, bottomRight, bottomLeft } = this.getBlendedQuad(transform, warpStrength);

    ctx.save();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)'; // Orange-500
    ctx.lineWidth = 1.2;

    for (let row = 0; row < gridSteps; row++) {
      const v0 = row / gridSteps;
      const v1 = (row + 1) / gridSteps;

      for (let col = 0; col < gridSteps; col++) {
        const u0 = col / gridSteps;
        const u1 = (col + 1) / gridSteps;

        const p00 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u0, v0);
        const p10 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u1, v0);
        const p11 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u1, v1);
        const p01 = this.bilerpQuad(topLeft, topRight, bottomRight, bottomLeft, u0, v1);

        // Quad borders
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.stroke();

        // Diagonal split
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export const garmentWarpingEngine = new GarmentWarpingEngine();
