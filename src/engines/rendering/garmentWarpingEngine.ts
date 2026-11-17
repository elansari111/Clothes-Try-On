import { GarmentTransform, Point2D } from '../../types/rendering';

/**
 * 2D Triangle-Mesh Affine Warping Engine for Canvas 2D
 * Deforms a garment image seamlessly to fit a dynamic 4-corner body quad
 * using bilinear grid subdivision + exact per-triangle affine transforms.
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
   * Draws a single textured triangle from source image coordinates (u0,v0..u2,v2)
   * onto destination canvas coordinates (x0,y0..x2,y2) using an exact affine transform.
   */
  private drawTexturedTriangle(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
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
    // Denominator of affine mapping matrix
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();

    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /**
   * Renders the garment warped onto the target 4-point quad using a subdivided triangle mesh.
   * Subdivision (e.g., 3x3 grid = 18 triangles) eliminates perspective artifacts while running < 1ms.
   */
  renderWarpedMesh(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    transform: GarmentTransform,
    gridSteps: number = 3
  ): boolean {
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    if (imgW === 0 || imgH === 0) return false;

    const { topLeft, topRight, bottomRight, bottomLeft } = transform.targetQuad;

    // Sanity check against degenerate quads
    const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
    const botWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
    const leftHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
    if (topWidth < 10 || botWidth < 10 || leftHeight < 10) {
      return false;
    }

    // Small overlap factor to prevent hairline seams between adjacent triangles
    const expand = 0.5;

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
          img,
          p00.x - expand,
          p00.y - expand,
          p10.x + expand,
          p10.y - expand,
          p11.x + expand,
          p11.y + expand,
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
          img,
          p00.x - expand,
          p00.y - expand,
          p11.x + expand,
          p11.y + expand,
          p01.x - expand,
          p01.y + expand,
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
   * Stable affine transformation fallback (center, rotate, scale)
   */
  renderAffineFallback(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    transform: GarmentTransform
  ): void {
    ctx.save();
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.rotationRad);
    ctx.drawImage(
      img,
      -transform.width / 2,
      -transform.height / 2,
      transform.width,
      transform.height
    );
    ctx.restore();
  }
}

export const garmentWarpingEngine = new GarmentWarpingEngine();
