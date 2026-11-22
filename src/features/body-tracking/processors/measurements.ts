import { NormalizedLandmark, BodyMeasurements, LANDMARK_INDEX } from '../types/pose';

/**
 * Calculates Euclidean distance between two 2D/3D points
 */
export function distance2D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates angle in degrees of vector from a to b relative to horizontal
 */
export function angleBetween(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Extracts essential normalized body measurements from 33 Pose landmarks
 */
export function extractBodyMeasurements(landmarks: NormalizedLandmark[]): BodyMeasurements | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const rightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const leftElbow = landmarks[LANDMARK_INDEX.LEFT_ELBOW];
  const rightElbow = landmarks[LANDMARK_INDEX.RIGHT_ELBOW];

  // Check minimal visibility threshold
  const minVisibility = 0.35;
  const shouldersVisible =
    (leftShoulder.visibility ?? 1) > minVisibility &&
    (rightShoulder.visibility ?? 1) > minVisibility;
  const hipsVisible =
    (leftHip.visibility ?? 1) > minVisibility &&
    (rightHip.visibility ?? 1) > minVisibility;

  if (!shouldersVisible || !hipsVisible) {
    return null;
  }

  // 1. Shoulder width
  const shoulderWidth = distance2D(leftShoulder, rightShoulder);

  // 2. Hip width
  const hipWidth = distance2D(leftHip, rightHip);

  // 3. Mid-points
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: ((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2,
  };

  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: ((leftHip.z ?? 0) + (rightHip.z ?? 0)) / 2,
  };

  // 4. Torso height and center
  const torsoHeight = distance2D(midShoulder as NormalizedLandmark, midHip as NormalizedLandmark);
  const torsoWidth = (shoulderWidth + hipWidth) / 2;

  const bodyCenter = {
    x: (midShoulder.x + midHip.x) / 2,
    y: (midShoulder.y + midHip.y) / 2,
    z: (midShoulder.z + midHip.z) / 2,
  };

  // 5. Orientation (tilt angle between shoulders)
  const bodyOrientationAngle = angleBetween(leftShoulder, rightShoulder);

  // 6. Arm angles
  const leftArmAngle = angleBetween(leftShoulder, leftElbow);
  const rightArmAngle = angleBetween(rightShoulder, rightElbow);

  // Estimated scale factor (torsoHeight typically spans 0.25 - 0.5 of camera viewport)
  const estimatedDistanceFactor = Math.max(0.1, Math.min(2.5, torsoHeight / 0.35));

  return {
    shoulderWidth,
    torsoWidth,
    torsoHeight,
    hipWidth,
    bodyCenter,
    bodyOrientationAngle,
    leftArmAngle,
    rightArmAngle,
    estimatedDistanceFactor,
  };
}
