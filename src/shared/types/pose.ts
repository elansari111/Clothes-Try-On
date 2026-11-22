export type PoseTrackingStatus =
  | 'initializing'
  | 'no_person'
  | 'detecting'
  | 'active'
  | 'lost'
  | 'error';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}

export interface BodyMeasurements {
  shoulderWidth: number;      // Distance between shoulders (normalized)
  torsoWidth: number;         // Average width between chest/hips (normalized)
  torsoHeight: number;        // Distance from mid-shoulder to mid-hip
  hipWidth: number;           // Distance between hips
  bodyCenter: { x: number; y: number; z: number }; // Midpoint of torso
  bodyOrientationAngle: number; // In-plane shoulder rotation angle (degrees)
  leftArmAngle: number;       // Shoulder-to-elbow angle (degrees)
  rightArmAngle: number;      // Shoulder-to-elbow angle (degrees)
  estimatedDistanceFactor: number; // Scale proxy based on torso length
}

export interface PoseFrameResult {
  landmarks: NormalizedLandmark[];
  worldLandmarks?: NormalizedLandmark[];
  measurements: BodyMeasurements | null;
  confidence: number;
  timestamp: number;
}

export interface PoseEngineConfig {
  delegate: 'GPU' | 'CPU';
  enableSegmentation: boolean;
  minPoseDetectionConfidence: number;
  minPosePresenceConfidence: number;
  minTrackingConfidence: number;
}

// MediaPipe 33 Landmark indices for clarity and direct referencing
export const LANDMARK_INDEX = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// Anatomical connections for skeleton visualization
export const POSE_CONNECTIONS: [number, number][] = [
  // Face / Head
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],

  // Torso box
  [11, 12], // Shoulders
  [11, 23], // Left side
  [12, 24], // Right side
  [23, 24], // Hips

  // Left Arm
  [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],

  // Right Arm
  [12, 14], [14, 16],
  [16, 18], [16, 20], [16, 22], [18, 20],

  // Left Leg
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],

  // Right Leg
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];
