import { NormalizedLandmark, LANDMARK_INDEX } from '../../types/pose';
import { ClothingItem, UpperBodyAnchors, PantsAnchors } from '../../types/clothing';
import { GarmentTransform, Point2D, TryOnAdjustments } from '../../types/rendering';
import { garmentAnchorService } from '../clothing/garmentAnchorService';

/**
 * Maps MediaPipe 33 body landmarks to target 2D canvas coordinates and garment transforms
 */
export class BodyClothingMapper {
  /**
   * Computes normalized -> canvas pixel coordinate, respecting mirrored camera mode
   */
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
   * Maps upper body landmarks (Shoulders, Hips) to an Upper Body garment (T-Shirts, Shirts, Jackets)
   */
  private mapUpperBody(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    const lmLeftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
    const lmRightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
    const lmLeftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
    const lmRightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];

    // Validate minimum visibility
    const minVis = 0.35;
    if (
      !lmLeftShoulder ||
      !lmRightShoulder ||
      (lmLeftShoulder.visibility ?? 1) < minVis ||
      (lmRightShoulder.visibility ?? 1) < minVis
    ) {
      return null;
    }

    // Canvas pixel coordinates for body points
    // Note: When mirrored, anatomical left shoulder is on the right side of the canvas,
    // and anatomical right shoulder is on the left side of the canvas.
    const pAnatLeftShoulder = this.toCanvasPoint(lmLeftShoulder, canvasWidth, canvasHeight, isMirrored);
    const pAnatRightShoulder = this.toCanvasPoint(lmRightShoulder, canvasWidth, canvasHeight, isMirrored);

    // Order screen-left vs screen-right points consistently
    const topLeftBody = pAnatLeftShoulder.x < pAnatRightShoulder.x ? pAnatLeftShoulder : pAnatRightShoulder;
    const topRightBody = pAnatLeftShoulder.x < pAnatRightShoulder.x ? pAnatRightShoulder : pAnatLeftShoulder;

    // Shoulder vector & distance
    const shoulderDx = topRightBody.x - topLeftBody.x;
    const shoulderDy = topRightBody.y - topLeftBody.y;
    const shoulderDist = Math.hypot(shoulderDx, shoulderDy);

    if (shoulderDist < 15) return null; // Too small / noise

    const rotationRad = Math.atan2(shoulderDy, shoulderDx);

    // Hips visibility check — if hips are out of frame, estimate them from shoulder distance
    const hipsVisible =
      lmLeftHip &&
      lmRightHip &&
      (lmLeftHip.visibility ?? 1) >= minVis &&
      (lmRightHip.visibility ?? 1) >= minVis;

    let bottomLeftBody: Point2D;
    let bottomRightBody: Point2D;

    if (hipsVisible) {
      const pAnatLeftHip = this.toCanvasPoint(lmLeftHip, canvasWidth, canvasHeight, isMirrored);
      const pAnatRightHip = this.toCanvasPoint(lmRightHip, canvasWidth, canvasHeight, isMirrored);

      bottomLeftBody = pAnatLeftHip.x < pAnatRightHip.x ? pAnatLeftHip : pAnatRightHip;
      bottomRightBody = pAnatLeftHip.x < pAnatRightHip.x ? pAnatRightHip : pAnatLeftHip;
    } else {
      // Fallback: project downward perpendicular to shoulder line
      const perpX = -Math.sin(rotationRad);
      const perpY = Math.cos(rotationRad);
      const estTorsoH = shoulderDist * 1.45;
      bottomLeftBody = {
        x: topLeftBody.x + perpX * estTorsoH,
        y: topLeftBody.y + perpY * estTorsoH,
      };
      bottomRightBody = {
        x: topRightBody.x + perpX * estTorsoH,
        y: topRightBody.y + perpY * estTorsoH,
      };
    }

    // Category-specific proportion multipliers for realistic clothing drape
    let widthExpansion = 1.48; // Shirts/T-shirts extend past skeletal shoulder joints
    let heightExpansionTop = 0.24; // Collar extends slightly above shoulder line
    let heightExpansionBottom = 0.16; // Hem extends slightly below hip joints

    if (item.category === 'Jackets') {
      widthExpansion = 1.62;
      heightExpansionTop = 0.28;
      heightExpansionBottom = 0.22;
    } else if (item.category === 'Shirts') {
      widthExpansion = 1.52;
      heightExpansionTop = 0.26;
      heightExpansionBottom = 0.2;
    }

    // Retrieve garment anchor ratios
    const anchors = item.anchors as UpperBodyAnchors;
    const anchorShoulderSpan = Math.max(
      0.25,
      Math.abs((anchors?.rightShoulder?.x ?? 0.8) - (anchors?.leftShoulder?.x ?? 0.2))
    );

    // Adjust expansion relative to how wide the garment's anchors sit inside the image
    const anchorCorrection = 0.6 / anchorShoulderSpan;

    // Apply user scale adjustment
    const finalScale = adjustments.scale * anchorCorrection;

    // Midpoints of shoulders & hips
    const midShoulder: Point2D = {
      x: (topLeftBody.x + topRightBody.x) / 2,
      y: (topLeftBody.y + topRightBody.y) / 2,
    };
    const midHip: Point2D = {
      x: (bottomLeftBody.x + bottomRightBody.x) / 2,
      y: (bottomLeftBody.y + bottomRightBody.y) / 2,
    };

    const torsoHeight = Math.max(
      shoulderDist * 1.15,
      Math.hypot(midHip.x - midShoulder.x, midHip.y - midShoulder.y)
    );

    // Center position of the torso + user manual offset
    const centerX = (midShoulder.x + midHip.x) / 2 + adjustments.offsetX;
    const centerY =
      midShoulder.y +
      torsoHeight * (0.5 - (heightExpansionTop - heightExpansionBottom) * 0.5) +
      adjustments.offsetY;

    const targetWidth = shoulderDist * widthExpansion * finalScale;
    const targetHeight = torsoHeight * (1 + heightExpansionTop + heightExpansionBottom) * adjustments.scale;

    // Compute warped 4-corner target quad aligned to shoulder & hip vectors
    const hipDx = bottomRightBody.x - bottomLeftBody.x;
    const hipDy = bottomRightBody.y - bottomLeftBody.y;
    const hipDist = Math.max(shoulderDist * 0.72, Math.hypot(hipDx, hipDy));

    const shoulderUnitX = shoulderDx / shoulderDist;
    const shoulderUnitY = shoulderDy / shoulderDist;

    // Downward torso direction
    const downDx = midHip.x - midShoulder.x;
    const downDy = midHip.y - midShoulder.y;
    const downLen = Math.max(1, Math.hypot(downDx, downDy));
    const downUnitX = downDx / downLen;
    const downUnitY = downDy / downLen;

    const topHalfW = (targetWidth / 2);
    const bottomHalfW = Math.max(topHalfW * 0.85, (hipDist * widthExpansion * finalScale) / 2);

    const topOffset = torsoHeight * heightExpansionTop * adjustments.scale;
    const bottomOffset = torsoHeight * (1 + heightExpansionBottom) * adjustments.scale;

    const topCenter = {
      x: midShoulder.x - downUnitX * topOffset + adjustments.offsetX,
      y: midShoulder.y - downUnitY * topOffset + adjustments.offsetY,
    };
    const bottomCenter = {
      x: midShoulder.x + downUnitX * bottomOffset + adjustments.offsetX,
      y: midShoulder.y + downUnitY * bottomOffset + adjustments.offsetY,
    };

    const targetQuad = {
      topLeft: {
        x: topCenter.x - shoulderUnitX * topHalfW,
        y: topCenter.y - shoulderUnitY * topHalfW,
      },
      topRight: {
        x: topCenter.x + shoulderUnitX * topHalfW,
        y: topCenter.y + shoulderUnitY * topHalfW,
      },
      bottomRight: {
        x: bottomCenter.x + shoulderUnitX * bottomHalfW,
        y: bottomCenter.y + shoulderUnitY * bottomHalfW,
      },
      bottomLeft: {
        x: bottomCenter.x - shoulderUnitX * bottomHalfW,
        y: bottomCenter.y - shoulderUnitY * bottomHalfW,
      },
    };

    // Full image bounds (normalized 0..1)
    const sourceQuad = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1, y: 0 },
      bottomRight: { x: 1, y: 1 },
      bottomLeft: { x: 0, y: 1 },
    };

    return {
      centerX,
      centerY,
      width: targetWidth,
      height: targetHeight,
      rotationRad,
      scaleX: finalScale,
      scaleY: adjustments.scale,
      targetQuad,
      sourceQuad,
      isValid: true,
    };
  }

  /**
   * Maps lower body landmarks (Hips, Knees/Ankles) for Pants (architecture prepared & functional)
   */
  private mapLowerBody(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    const lmLeftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
    const lmRightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
    const lmLeftKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
    const lmRightKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];

    const minVis = 0.35;
    if (
      !lmLeftHip ||
      !lmRightHip ||
      (lmLeftHip.visibility ?? 1) < minVis ||
      (lmRightHip.visibility ?? 1) < minVis
    ) {
      return null;
    }

    const pAnatLeftHip = this.toCanvasPoint(lmLeftHip, canvasWidth, canvasHeight, isMirrored);
    const pAnatRightHip = this.toCanvasPoint(lmRightHip, canvasWidth, canvasHeight, isMirrored);

    const topLeft = pAnatLeftHip.x < pAnatRightHip.x ? pAnatLeftHip : pAnatRightHip;
    const topRight = pAnatLeftHip.x < pAnatRightHip.x ? pAnatRightHip : pAnatLeftHip;

    const hipDx = topRight.x - topLeft.x;
    const hipDy = topRight.y - topLeft.y;
    const hipDist = Math.hypot(hipDx, hipDy);

    if (hipDist < 15) return null;

    const rotationRad = Math.atan2(hipDy, hipDx);
    const midHip = { x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 };

    let legHeight = hipDist * 2.4;
    if (
      lmLeftKnee &&
      lmRightKnee &&
      (lmLeftKnee.visibility ?? 1) >= minVis &&
      (lmRightKnee.visibility ?? 1) >= minVis
    ) {
      const pLK = this.toCanvasPoint(lmLeftKnee, canvasWidth, canvasHeight, isMirrored);
      const pRK = this.toCanvasPoint(lmRightKnee, canvasWidth, canvasHeight, isMirrored);
      const midKnee = { x: (pLK.x + pRK.x) / 2, y: (pLK.y + pRK.y) / 2 };
      const upperLeg = Math.hypot(midKnee.x - midHip.x, midKnee.y - midHip.y);
      legHeight = upperLeg * 2.1;
    }

    const anchors = item.anchors as PantsAnchors;
    const anchorWaistSpan = Math.max(
      0.25,
      Math.abs((anchors?.rightWaist?.x ?? 0.75) - (anchors?.leftWaist?.x ?? 0.25))
    );
    const widthScale = (0.5 / anchorWaistSpan) * adjustments.scale;

    const targetWidth = hipDist * 1.55 * widthScale;
    const targetHeight = legHeight * adjustments.scale;

    const centerX = midHip.x + adjustments.offsetX;
    const centerY = midHip.y + targetHeight * 0.45 + adjustments.offsetY;

    const unitX = hipDx / hipDist;
    const unitY = hipDy / hipDist;
    const downX = -Math.sin(rotationRad);
    const downY = Math.cos(rotationRad);

    const halfW = targetWidth / 2;
    const topYOffset = targetHeight * 0.08;

    const topCenter = {
      x: midHip.x - downX * topYOffset + adjustments.offsetX,
      y: midHip.y - downY * topYOffset + adjustments.offsetY,
    };
    const bottomCenter = {
      x: topCenter.x + downX * targetHeight,
      y: topCenter.y + downY * targetHeight,
    };

    return {
      centerX,
      centerY,
      width: targetWidth,
      height: targetHeight,
      rotationRad,
      scaleX: widthScale,
      scaleY: adjustments.scale,
      targetQuad: {
        topLeft: { x: topCenter.x - unitX * halfW, y: topCenter.y - unitY * halfW },
        topRight: { x: topCenter.x + unitX * halfW, y: topCenter.y + unitY * halfW },
        bottomRight: { x: bottomCenter.x + unitX * halfW, y: bottomCenter.y + unitY * halfW },
        bottomLeft: { x: bottomCenter.x - unitX * halfW, y: bottomCenter.y - unitY * halfW },
      },
      sourceQuad: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 1, y: 0 },
        bottomRight: { x: 1, y: 1 },
        bottomLeft: { x: 0, y: 1 },
      },
      isValid: true,
    };
  }

  /**
   * Computes the garment transformation based on garment category & anchors
   */
  mapBodyToGarment(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    if (!landmarks || landmarks.length < 33) return null;

    const isUpper =
      item.garmentType === 'upper' || garmentAnchorService.isUpperBodyAnchors(item.anchors);

    if (isUpper && item.category !== 'Pants') {
      return this.mapUpperBody(landmarks, item, canvasWidth, canvasHeight, isMirrored, adjustments);
    }

    return this.mapLowerBody(landmarks, item, canvasWidth, canvasHeight, isMirrored, adjustments);
  }
}

export const bodyClothingMapper = new BodyClothingMapper();
