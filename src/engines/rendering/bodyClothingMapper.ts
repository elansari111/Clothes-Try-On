import { NormalizedLandmark, LANDMARK_INDEX } from '../../types/pose';
import { ClothingItem, UpperBodyAnchors, PantsAnchors } from '../../types/clothing';
import { GarmentTransform, Point2D, TryOnAdjustments } from '../../types/rendering';
import { ProcessedGarmentAsset } from './garmentLoader';
import { garmentAnchorService } from '../clothing/garmentAnchorService';

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
   * Key alignment guarantees:
   *  1. Garment neckline aligns directly with the user's neck base (slightly above shoulder midpoint).
   *  2. Garment left/right shoulder anchors align with body left/right shoulders without oversizing.
   *  3. Garment width is scaled proportionally to torso/shoulder width (sleeves never bloat width).
   *  4. Torso center, height, and shoulder rotation drive the transform continuously.
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
    const rotationRad = Math.atan2(shoulderDy, shoulderDx);
    const rightUnitX = shoulderDx / shoulderDist;
    const rightUnitY = shoulderDy / shoulderDist;
    const perpDownX = -rightUnitY;
    const perpDownY = rightUnitX;

    // Midpoint between left & right shoulders (anatomical clavicle/sternum line)
    const midShoulder: Point2D = {
      x: (bodyLeftShoulder.x + bodyRightShoulder.x) / 2,
      y: (bodyLeftShoulder.y + bodyRightShoulder.y) / 2,
    };

    // Estimate anatomical base of the neck (suprasternal notch / base of collar)
    // Typically sits ~10-16% of shoulderDist above midShoulder along the spine axis
    let neckAboveShoulderPx = shoulderDist * 0.13;
    if (lmNose && (lmNose.visibility ?? 0) >= minVis) {
      const pNose = this.toCanvasPoint(lmNose, canvasWidth, canvasHeight, isMirrored);
      const noseDist = Math.hypot(midShoulder.x - pNose.x, midShoulder.y - pNose.y);
      // Base of neck is roughly 20-25% of the way from shoulder midpoint toward the nose
      neckAboveShoulderPx = Math.max(
        shoulderDist * 0.08,
        Math.min(shoulderDist * 0.22, noseDist * 0.22)
      );
    }

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

      // Clamp to anatomically plausible human torso ratio (prevents foreshortening spikes)
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
    const anchors = asset.remappedAnchors as UpperBodyAnchors;
    const anchorLeftX = Math.min(anchors.leftShoulder?.x ?? 0.22, anchors.rightShoulder?.x ?? 0.78);
    const anchorRightX = Math.max(anchors.leftShoulder?.x ?? 0.22, anchors.rightShoulder?.x ?? 0.78);

    // Shoulder span inside the cropped image (clamped safely so sleeves never cause extreme oversizing)
    const rawShoulderSpan = Math.max(0.38, Math.min(0.86, anchorRightX - anchorLeftX));

    // Also inspect core torso width from silhouette analysis to prevent long-sleeve images from blowing up width
    const torsoSpan = Math.max(
      0.32,
      Math.min(0.88, asset.geometry.torsoRightX - asset.geometry.torsoLeftX)
    );
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

    // Calibrated category shoulder multipliers (restrained so garments do NOT look oversized!)
    // MediaPipe shoulder landmarks are at the glenohumeral joint (inside the outer deltoid by ~10-14% total)
    let shoulderWidthMultiplier = 1.12; // T-Shirts: tailored fit
    let torsoLengthMultiplier = 1.02;

    if (item.category === 'Shirts') {
      shoulderWidthMultiplier = 1.14; // Oxford / dress shirts sit cleanly on shoulder seams
      torsoLengthMultiplier = 1.06;
    } else if (item.category === 'Jackets') {
      shoulderWidthMultiplier = 1.22; // Jackets have slightly broader outer shoulder padding
      torsoLengthMultiplier = 1.08;
    }

    // 1. Target garment width driven by body shoulder distance & user shoulderWidthScale + overall scale
    const desiredBodyShoulderPx = shoulderDist * shoulderWidthMultiplier * adjustments.shoulderWidthScale;
    let targetWidth = (desiredBodyShoulderPx / effectiveShoulderSpan) * adjustments.scale;

    // Hard safety cap: garment total image width must stay realistic relative to shoulder distance
    // (Prevents wide flat-lay images with spread arms from becoming huge)
    const maxRealisticWidth = shoulderDist * 2.45 * adjustments.scale * adjustments.shoulderWidthScale;
    const minRealisticWidth = shoulderDist * 1.05 * adjustments.scale * adjustments.shoulderWidthScale;
    targetWidth = Math.max(minRealisticWidth, Math.min(maxRealisticWidth, targetWidth));

    // 2. Target garment height: balance torso proportions & natural garment aspect ratio
    const torsoDrivenHeight =
      ((torsoHeight * torsoLengthMultiplier) / anchorTorsoVerticalSpan) * adjustments.scale;
    const aspectDrivenHeight = targetWidth / Math.max(0.5, Math.min(1.5, asset.aspectRatio));

    // Blend torso length and image natural aspect ratio (60% torso, 40% aspect when hips visible)
    const blendedHeight = hipsVisible
      ? torsoDrivenHeight * 0.6 + aspectDrivenHeight * 0.4
      : aspectDrivenHeight * 0.95;

    // Clamp vertical stretch to +/- 20% of natural aspect ratio so shirt proportions stay crisp
    const targetHeight = Math.max(
      aspectDrivenHeight * 0.8,
      Math.min(aspectDrivenHeight * 1.22, blendedHeight)
    );

    // 3. Neckline & Shoulder Vertical Alignment:
    // Target point for garment's neckCenter (v = anchorNeckY) is the user's neck base:
    //   bodyNeckBase = midShoulder - downUnit * neckAboveShoulderPx
    // Target point for garment's shoulder line (v = anchorShoulderY) is midShoulder.
    // Blend both anchors so collar sits right at the neck base AND shoulders sit on user shoulders.
    const topFromNeckAnchor = neckAboveShoulderPx + anchorNeckY * targetHeight;
    const topFromShoulderAnchor = anchorShoulderY * targetHeight;
    const distTopAboveMidShoulder =
      topFromNeckAnchor * 0.6 + topFromShoulderAnchor * 0.4 - adjustments.necklineOffsetY;

    const distBottomBelowMidShoulder = targetHeight - distTopAboveMidShoulder;

    // Horizontal centering aligned to shoulder midpoint & garment anchor center
    const anchorCenterX = (anchorLeftX + anchorRightX) / 2;
    const horizAnchorShift = (0.5 - anchorCenterX) * targetWidth;

    const alignedMidShoulder: Point2D = {
      x: midShoulder.x + rightUnitX * horizAnchorShift + adjustments.offsetX,
      y: midShoulder.y + rightUnitY * horizAnchorShift + adjustments.offsetY,
    };

    const topCenter: Point2D = {
      x: alignedMidShoulder.x - downUnitX * distTopAboveMidShoulder,
      y: alignedMidShoulder.y - downUnitY * distTopAboveMidShoulder,
    };

    const bottomCenter: Point2D = {
      x: alignedMidShoulder.x + downUnitX * distBottomBelowMidShoulder,
      y: alignedMidShoulder.y + downUnitY * distBottomBelowMidShoulder,
    };

    const centerX = (topCenter.x + bottomCenter.x) / 2;
    const centerY = (topCenter.y + bottomCenter.y) / 2;

    // Subtle hip-width taper for torso warping (bounded tightly to avoid trapezoidal distortion)
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

    return {
      centerX,
      centerY,
      width: targetWidth,
      height: targetHeight,
      rotationRad,
      scaleX: adjustments.scale * adjustments.shoulderWidthScale,
      scaleY: adjustments.scale,
      targetQuad,
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

    const rotationRad = Math.atan2(hipDy, hipDx);
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

    const targetWidth =
      ((hipDist * 1.32) / anchorWaistSpan) * adjustments.scale * adjustments.shoulderWidthScale;
    const aspectHeight = targetWidth / Math.max(0.3, Math.min(1.4, asset.aspectRatio));

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
      const kneeDriven = upperLeg * 2.05 * adjustments.scale;
      legHeight = Math.max(aspectHeight * 0.82, Math.min(aspectHeight * 1.2, kneeDriven));
    }

    const unitX = hipDx / hipDist;
    const unitY = hipDy / hipDist;
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

    return {
      centerX: (topCenter.x + bottomCenter.x) / 2,
      centerY: (topCenter.y + bottomCenter.y) / 2,
      width: targetWidth,
      height: legHeight,
      rotationRad,
      scaleX: adjustments.scale * adjustments.shoulderWidthScale,
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

  mapBodyToGarment(
    landmarks: NormalizedLandmark[],
    item: ClothingItem,
    asset: ProcessedGarmentAsset,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean,
    adjustments: TryOnAdjustments
  ): GarmentTransform | null {
    if (!landmarks || landmarks.length < 33) return null;

    const isUpper =
      item.garmentType === 'upper' || garmentAnchorService.isUpperBodyAnchors(item.anchors);

    if (isUpper && item.category !== 'Pants') {
      return this.mapUpperBody(
        landmarks,
        item,
        asset,
        canvasWidth,
        canvasHeight,
        isMirrored,
        adjustments
      );
    }

    return this.mapLowerBody(landmarks, asset, canvasWidth, canvasHeight, isMirrored, adjustments);
  }
}

export const bodyClothingMapper = new BodyClothingMapper();
