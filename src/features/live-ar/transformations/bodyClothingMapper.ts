import { NormalizedLandmark, LANDMARK_INDEX } from '../../body-tracking/types/pose';
import { ClothingItem, UpperBodyAnchors, PantsAnchors } from '../../clothing/types/clothing';
import { GarmentTransform, Point2D, TryOnAdjustments } from '../types/rendering';
import { ProcessedGarmentAsset } from '../rendering/garmentLoader';
import { garmentAnchorService } from '../../clothing/services/garmentAnchorService';

/**
 * Maps MediaPipe 33 body landmarks to target 2D canvas coordinates and garment transforms
 * using the cropped & hanger-cleaned garment asset's exact neckline, shoulder, and torso geometry.
 */
export class BodyClothingMapper {
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
   * Maps upper body landmarks (Shoulders, Hips, Neck base) to an Upper Body garment.
   * Key precision guarantees:
   *  1. Garment neckline aligns directly with the user's neck base (suprasternal notch) without covering chin/face.
   *  2. Garment left/right shoulder anchors align with body left/right shoulders without oversizing.
   *  3. Torso center, height, and shoulder rotation drive the transform continuously.
   *  4. Per-garment calibration parameters (garmentWidthScale, garmentHeightScale, rotationOffsetDeg, necklineOffsetY)
   *     are accurately applied.
   *  5. Computes absolute canvas coordinates for all 7 anchor points and anatomical reference lines for debug visualization.
   */
  private mapUpperBody(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    asset: ProcessedGarmentAsset,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    const lmLeftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
    const lmRightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
    const lmLeftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
    const lmRightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
    const lmNose = landmarks[LANDMARK_INDEX.NOSE];

    const minVis = 0.35;
    if (
      !lmLeftShoulder ||
      !lmRightShoulder ||
      (lmLeftShoulder.visibility ?? 1) < minVis ||
      (lmRightShoulder.visibility ?? 1) < minVis
    ) {
      return null;
    }

    const pAnatLeftShoulder = this.toCanvasPoint(lmLeftShoulder, canvasWidth, canvasHeight, isMirrored);
    const pAnatRightShoulder = this.toCanvasPoint(lmRightShoulder, canvasWidth, canvasHeight, isMirrored);

    // Order screen-left vs screen-right shoulders
    const bodyLeftShoulder =
      pAnatLeftShoulder.x <= pAnatRightShoulder.x ? pAnatLeftShoulder : pAnatRightShoulder;
    const bodyRightShoulder =
      pAnatLeftShoulder.x <= pAnatRightShoulder.x ? pAnatRightShoulder : pAnatLeftShoulder;

    const shoulderDx = bodyRightShoulder.x - bodyLeftShoulder.x;
    const shoulderDy = bodyRightShoulder.y - bodyLeftShoulder.y;
    const shoulderDist = Math.hypot(shoulderDx, shoulderDy);

    if (shoulderDist < 18) return null;

    // Upper torso orthogonal basis vectors
    const baseRotationRad = Math.atan2(shoulderDy, shoulderDx);
    const rotationOffsetRad = ((adjustments.rotationOffsetDeg ?? 0) * Math.PI) / 180;
    const rotationRad = baseRotationRad + rotationOffsetRad;

    const rightUnitX = Math.cos(rotationRad);
    const rightUnitY = Math.sin(rotationRad);
    const perpDownX = -rightUnitY;
    const perpDownY = rightUnitX;

    // Midpoint between left & right shoulders (anatomical clavicle/sternum line)
    const midShoulder: Point2D = {
      x: (bodyLeftShoulder.x + bodyRightShoulder.x) / 2,
      y: (bodyLeftShoulder.y + bodyRightShoulder.y) / 2,
    };

    // Estimate anatomical base of the neck (suprasternal notch / base of collar)
    // Sits roughly 12-16% of shoulderDist above midShoulder along the spine axis
    let neckAboveShoulderPx = shoulderDist * 0.13;
    let pNosePt: Point2D | null = null;

    if (lmNose && (lmNose.visibility ?? 0) >= minVis) {
      pNosePt = this.toCanvasPoint(lmNose, canvasWidth, canvasHeight, isMirrored);
      const noseDist = Math.hypot(midShoulder.x - pNosePt.x, midShoulder.y - pNosePt.y);
      neckAboveShoulderPx = Math.max(
        shoulderDist * 0.08,
        Math.min(shoulderDist * 0.22, noseDist * 0.22)
      );
    }

    const neckBase: Point2D = {
      x: midShoulder.x - perpDownX * neckAboveShoulderPx,
      y: midShoulder.y - perpDownY * neckAboveShoulderPx,
    };

    // Hips visibility & torso proportions
    const hipsVisible =
      lmLeftHip &&
      lmRightHip &&
      (lmLeftHip.visibility ?? 1) >= minVis &&
      (lmRightHip.visibility ?? 1) >= minVis;

    let bodyLeftHip: Point2D;
    let bodyRightHip: Point2D;
    let midHip: Point2D;
    let torsoHeight: number;
    let downUnitX = perpDownX;
    let downUnitY = perpDownY;

    if (hipsVisible) {
      const pAnatLeftHip = this.toCanvasPoint(lmLeftHip, canvasWidth, canvasHeight, isMirrored);
      const pAnatRightHip = this.toCanvasPoint(lmRightHip, canvasWidth, canvasHeight, isMirrored);

      bodyLeftHip = pAnatLeftHip.x <= pAnatRightHip.x ? pAnatLeftHip : pAnatRightHip;
      bodyRightHip = pAnatLeftHip.x <= pAnatRightHip.x ? pAnatRightHip : pAnatLeftHip;

      midHip = {
        x: (bodyLeftHip.x + bodyRightHip.x) / 2,
        y: (bodyLeftHip.y + bodyRightHip.y) / 2,
      };

      const dX = midHip.x - midShoulder.x;
      const dY = midHip.y - midShoulder.y;
      const measuredTorsoH = Math.hypot(dX, dY);

      torsoHeight = Math.max(shoulderDist * 1.15, Math.min(shoulderDist * 1.95, measuredTorsoH));
      if (measuredTorsoH > 20) {
        downUnitX = dX / measuredTorsoH;
        downUnitY = dY / measuredTorsoH;
      }
    } else {
      torsoHeight = shoulderDist * 1.45;
      midHip = {
        x: midShoulder.x + perpDownX * torsoHeight,
        y: midShoulder.y + perpDownY * torsoHeight,
      };
      const estHipHalf = shoulderDist * 0.42;
      bodyLeftHip = {
        x: midHip.x - rightUnitX * estHipHalf,
        y: midHip.y - rightUnitY * estHipHalf,
      };
      bodyRightHip = {
        x: midHip.x + rightUnitX * estHipHalf,
        y: midHip.y + rightUnitY * estHipHalf,
      };
    }

    // Retrieve garment anchor points in the cropped & hanger-free asset space [0..1]
    const rawAnchors = asset.remappedAnchors as UpperBodyAnchors;
    const anchors = garmentAnchorService.ensureUpperBodyAnchors(rawAnchors);

    const anchorLeftX = Math.min(anchors.leftShoulder?.x ?? 0.22, anchors.rightShoulder?.x ?? 0.78);
    const anchorRightX = Math.max(anchors.leftShoulder?.x ?? 0.22, anchors.rightShoulder?.x ?? 0.78);

    // Shoulder span inside the cropped image
    const rawShoulderSpan = Math.max(0.38, Math.min(0.86, anchorRightX - anchorLeftX));

    // Core torso width from armpit anchors if available, or silhouette geometry
    let torsoSpan = Math.max(
      0.32,
      Math.min(0.88, asset.geometry.torsoRightX - asset.geometry.torsoLeftX)
    );
    if (anchors.leftArmpit && anchors.rightArmpit) {
      const armpitSpan = Math.abs(anchors.rightArmpit.x - anchors.leftArmpit.x);
      if (armpitSpan > 0.2) {
        torsoSpan = armpitSpan;
      }
    }
    const effectiveShoulderSpan = Math.max(rawShoulderSpan, torsoSpan * 1.04);

    const anchorNeckY = Math.max(0.01, Math.min(0.24, anchors.neckCenter?.y ?? asset.geometry.neckCenterY));
    const anchorShoulderY = Math.max(
      anchorNeckY + 0.03,
      Math.min(0.32, ((anchors.leftShoulder?.y ?? 0.12) + (anchors.rightShoulder?.y ?? 0.12)) / 2)
    );
    const anchorBottomY = Math.max(
      0.75,
      Math.min(0.99, ((anchors.leftBottom?.y ?? 0.96) + (anchors.rightBottom?.y ?? 0.96)) / 2)
    );
    const anchorTorsoVerticalSpan = Math.max(0.5, anchorBottomY - anchorShoulderY);

    // Category multipliers
    let shoulderWidthMultiplier = 1.12; // T-Shirts
    let torsoLengthMultiplier = 1.02;

    if (item.category === 'Shirts') {
      shoulderWidthMultiplier = 1.14;
      torsoLengthMultiplier = 1.06;
    } else if (item.category === 'Jackets') {
      shoulderWidthMultiplier = 1.22;
      torsoLengthMultiplier = 1.08;
    }

    // Individual scale components
    const userGarmentWidthScale = adjustments.garmentWidthScale ?? 1.0;
    const userGarmentHeightScale = adjustments.garmentHeightScale ?? 1.0;

    // 1. Target garment width
    const desiredBodyShoulderPx =
      shoulderDist * shoulderWidthMultiplier * adjustments.shoulderWidthScale * userGarmentWidthScale;
    let targetWidth = (desiredBodyShoulderPx / effectiveShoulderSpan) * adjustments.scale;

    // Safety cap
    const maxRealisticWidth =
      shoulderDist * 2.45 * adjustments.scale * adjustments.shoulderWidthScale * userGarmentWidthScale;
    const minRealisticWidth =
      shoulderDist * 1.05 * adjustments.scale * adjustments.shoulderWidthScale * userGarmentWidthScale;
    targetWidth = Math.max(minRealisticWidth, Math.min(maxRealisticWidth, targetWidth));

    // 2. Target garment height
    const torsoDrivenHeight =
      ((torsoHeight * torsoLengthMultiplier) / anchorTorsoVerticalSpan) *
      adjustments.scale *
      userGarmentHeightScale;
    const aspectDrivenHeight = (targetWidth / Math.max(0.5, Math.min(1.5, asset.aspectRatio))) * userGarmentHeightScale;

    const blendedHeight = hipsVisible
      ? torsoDrivenHeight * 0.6 + aspectDrivenHeight * 0.4
      : aspectDrivenHeight * 0.95;

    const targetHeight = Math.max(
      aspectDrivenHeight * 0.8,
      Math.min(aspectDrivenHeight * 1.22, blendedHeight)
    );

    // 3. Neckline & Shoulder Vertical Alignment:
    // Garment neckCenter sits at neckBase; garment shoulder line sits at midShoulder.
    const topFromNeckAnchor = neckAboveShoulderPx + anchorNeckY * targetHeight;
    const topFromShoulderAnchor = anchorShoulderY * targetHeight;
    const distTopAboveMidShoulder =
      topFromNeckAnchor * 0.6 + topFromShoulderAnchor * 0.4 - adjustments.necklineOffsetY;

    // Chin / face protection: garment collar should not rise above chin
    let finalDistTopAboveMidShoulder = distTopAboveMidShoulder;
    if (pNosePt) {
      const maxCollarHeightAboveMid = Math.hypot(midShoulder.x - pNosePt.x, midShoulder.y - pNosePt.y) * 0.75;
      finalDistTopAboveMidShoulder = Math.min(distTopAboveMidShoulder, maxCollarHeightAboveMid + anchorNeckY * targetHeight);
    }

    const distBottomBelowMidShoulder = targetHeight - finalDistTopAboveMidShoulder;

    // Horizontal centering
    const anchorCenterX = (anchorLeftX + anchorRightX) / 2;
    const horizAnchorShift = (0.5 - anchorCenterX) * targetWidth;

    const alignedMidShoulder: Point2D = {
      x: midShoulder.x + rightUnitX * horizAnchorShift + adjustments.offsetX,
      y: midShoulder.y + rightUnitY * horizAnchorShift + adjustments.offsetY,
    };

    const topCenter: Point2D = {
      x: alignedMidShoulder.x - downUnitX * finalDistTopAboveMidShoulder,
      y: alignedMidShoulder.y - downUnitY * finalDistTopAboveMidShoulder,
    };

    const bottomCenter: Point2D = {
      x: alignedMidShoulder.x + downUnitX * distBottomBelowMidShoulder,
      y: alignedMidShoulder.y + downUnitY * distBottomBelowMidShoulder,
    };

    const centerX = (topCenter.x + bottomCenter.x) / 2;
    const centerY = (topCenter.y + bottomCenter.y) / 2;

    // Hip taper for natural drape
    const hipDist = Math.hypot(bodyRightHip.x - bodyLeftHip.x, bodyRightHip.y - bodyLeftHip.y);
    const hipTaper = hipsVisible
      ? Math.max(0.9, Math.min(1.08, (hipDist / shoulderDist) * 1.18))
      : 1.0;

    const topHalfW = targetWidth / 2;
    const bottomHalfW = topHalfW * hipTaper;

    const targetQuad = {
      topLeft: {
        x: topCenter.x - rightUnitX * topHalfW,
        y: topCenter.y - rightUnitY * topHalfW,
      },
      topRight: {
        x: topCenter.x + rightUnitX * topHalfW,
        y: topCenter.y + rightUnitY * topHalfW,
      },
      bottomRight: {
        x: bottomCenter.x + rightUnitX * bottomHalfW,
        y: bottomCenter.y + rightUnitY * bottomHalfW,
      },
      bottomLeft: {
        x: bottomCenter.x - rightUnitX * bottomHalfW,
        y: bottomCenter.y - rightUnitY * bottomHalfW,
      },
    };

    // Calculate absolute canvas coordinates of all 7 anchors for debug visualization
    const anchorPoints: Record<string, Point2D> = {};
    const mapAnchorToCanvas = (u: number, v: number): Point2D => {
      const topX = targetQuad.topLeft.x + (targetQuad.topRight.x - targetQuad.topLeft.x) * u;
      const topY = targetQuad.topLeft.y + (targetQuad.topRight.y - targetQuad.topLeft.y) * u;
      const botX = targetQuad.bottomLeft.x + (targetQuad.bottomRight.x - targetQuad.bottomLeft.x) * u;
      const botY = targetQuad.bottomLeft.y + (targetQuad.bottomRight.y - targetQuad.bottomLeft.y) * u;
      return {
        x: topX + (botX - topX) * v,
        y: topY + (botY - topY) * v,
      };
    };

    if (anchors.neckCenter) anchorPoints.neckCenter = mapAnchorToCanvas(anchors.neckCenter.x, anchors.neckCenter.y);
    if (anchors.leftShoulder) anchorPoints.leftShoulder = mapAnchorToCanvas(anchors.leftShoulder.x, anchors.leftShoulder.y);
    if (anchors.rightShoulder) anchorPoints.rightShoulder = mapAnchorToCanvas(anchors.rightShoulder.x, anchors.rightShoulder.y);
    if (anchors.leftArmpit) anchorPoints.leftArmpit = mapAnchorToCanvas(anchors.leftArmpit.x, anchors.leftArmpit.y);
    if (anchors.rightArmpit) anchorPoints.rightArmpit = mapAnchorToCanvas(anchors.rightArmpit.x, anchors.rightArmpit.y);
    if (anchors.leftBottom) anchorPoints.leftBottom = mapAnchorToCanvas(anchors.leftBottom.x, anchors.leftBottom.y);
    if (anchors.rightBottom) anchorPoints.rightBottom = mapAnchorToCanvas(anchors.rightBottom.x, anchors.rightBottom.y);

    return {
      centerX,
      centerY,
      width: targetWidth,
      height: targetHeight,
      rotationRad,
      scaleX: adjustments.scale * adjustments.shoulderWidthScale * userGarmentWidthScale,
      scaleY: adjustments.scale * userGarmentHeightScale,
      targetQuad,
      sourceQuad: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 1, y: 0 },
        bottomRight: { x: 1, y: 1 },
        bottomLeft: { x: 0, y: 1 },
      },
      anchorPoints,
      bodyReferences: {
        midShoulder,
        neckBase,
        midHip,
        bodyLeftShoulder,
        bodyRightShoulder,
        bodyLeftHip,
        bodyRightHip,
        spineTop: topCenter,
        spineBottom: bottomCenter,
      },
      isValid: true,
    };
  }

  /**
   * Maps lower body landmarks (Hips, Knees) for Pants
   */
  private mapLowerBody(
    landmarks: NormalizedLandmark[],
    asset: ProcessedGarmentAsset,
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

    const topLeft = pAnatLeftHip.x <= pAnatRightHip.x ? pAnatLeftHip : pAnatRightHip;
    const topRight = pAnatLeftHip.x <= pAnatRightHip.x ? pAnatRightHip : pAnatLeftHip;

    const hipDx = topRight.x - topLeft.x;
    const hipDy = topRight.y - topLeft.y;
    const hipDist = Math.hypot(hipDx, hipDy);

    if (hipDist < 15) return null;

    const baseRotationRad = Math.atan2(hipDy, hipDx);
    const rotationOffsetRad = ((adjustments.rotationOffsetDeg ?? 0) * Math.PI) / 180;
    const rotationRad = baseRotationRad + rotationOffsetRad;
    const midHip = { x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 };

    const anchors = asset.remappedAnchors as PantsAnchors;
    const anchorWaistSpan = Math.max(
      0.35,
      Math.abs((anchors?.rightWaist?.x ?? 0.75) - (anchors?.leftWaist?.x ?? 0.25))
    );
    const anchorWaistY = Math.max(
      0.02,
      Math.min(0.25, ((anchors?.leftWaist?.y ?? 0.05) + (anchors?.rightWaist?.y ?? 0.05)) / 2)
    );

    const userWidthScale = adjustments.garmentWidthScale ?? 1.0;
    const userHeightScale = adjustments.garmentHeightScale ?? 1.0;

    const targetWidth =
      ((hipDist * 1.32) / anchorWaistSpan) * adjustments.scale * adjustments.shoulderWidthScale * userWidthScale;
    const aspectHeight = (targetWidth / Math.max(0.3, Math.min(1.4, asset.aspectRatio))) * userHeightScale;

    let legHeight = aspectHeight;
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
      const kneeDriven = upperLeg * 2.05 * adjustments.scale * userHeightScale;
      legHeight = Math.max(aspectHeight * 0.82, Math.min(aspectHeight * 1.2, kneeDriven));
    }

    const unitX = Math.cos(rotationRad);
    const unitY = Math.sin(rotationRad);
    const downX = -unitY;
    const downY = unitX;

    const halfW = targetWidth / 2;
    const distAboveHip = anchorWaistY * legHeight - adjustments.necklineOffsetY;
    const distBelowHip = legHeight - distAboveHip;

    const topCenter = {
      x: midHip.x - downX * distAboveHip + adjustments.offsetX,
      y: midHip.y - downY * distAboveHip + adjustments.offsetY,
    };
    const bottomCenter = {
      x: midHip.x + downX * distBelowHip + adjustments.offsetX,
      y: midHip.y + downY * distBelowHip + adjustments.offsetY,
    };

    const targetQuad = {
      topLeft: { x: topCenter.x - unitX * halfW, y: topCenter.y - unitY * halfW },
      topRight: { x: topCenter.x + unitX * halfW, y: topCenter.y + unitY * halfW },
      bottomRight: { x: bottomCenter.x + unitX * halfW, y: bottomCenter.y + unitY * halfW },
      bottomLeft: { x: bottomCenter.x - unitX * halfW, y: bottomCenter.y - unitY * halfW },
    };

    return {
      centerX: (topCenter.x + bottomCenter.x) / 2,
      centerY: (topCenter.y + bottomCenter.y) / 2,
      width: targetWidth,
      height: legHeight,
      rotationRad,
      scaleX: adjustments.scale * adjustments.shoulderWidthScale * userWidthScale,
      scaleY: adjustments.scale * userHeightScale,
      targetQuad,
      sourceQuad: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 1, y: 0 },
        bottomRight: { x: 1, y: 1 },
        bottomLeft: { x: 0, y: 1 },
      },
      anchorPoints: {},
      bodyReferences: {
        midShoulder: midHip,
        neckBase: topCenter,
        midHip,
        bodyLeftShoulder: topLeft,
        bodyRightShoulder: topRight,
        bodyLeftHip: topLeft,
        bodyRightHip: topRight,
        spineTop: topCenter,
        spineBottom: bottomCenter,
      },
      isValid: true,
    };
  }

  /**
   * Main mapping entrypoint: dynamically selects Upper or Lower body mapping.
   */
  mapBodyToGarment(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    asset: ProcessedGarmentAsset,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    if (!landmarks || landmarks.length < 25) return null;

    if (item.garmentType === 'lower' || item.category === 'Pants') {
      return this.mapLowerBody(landmarks, asset, canvasWidth, canvasHeight, isMirrored, adjustments);
    }

    return this.mapUpperBody(landmarks, item, asset, canvasWidth, canvasHeight, isMirrored, adjustments);
  }
}

export const bodyClothingMapper = new BodyClothingMapper();
