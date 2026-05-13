export type FaceLandmarks = {
  /** Bounding box in image coordinates. */
  bounds: { x: number; y: number; width: number; height: number };
  /** Probability that the left eye is open (0–1). */
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  /** Head pose Euler angles in degrees. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Whether ML Kit detected likely occlusion (mask, etc.). Optional. */
  occluded?: boolean;
};

export type DetectionFrame = {
  /** Number of faces in the current camera frame. */
  faceCount: number;
  /** The single face we're tracking (largest if multiple). */
  primary: FaceLandmarks | null;
  /** Frame dimensions for sizing checks. */
  frameWidth: number;
  frameHeight: number;
};

export type DetectionHint =
  | 'no_face'
  | 'multi_face'
  | 'too_small'
  | 'too_far'
  | 'not_frontal'
  | 'occluded'
  | 'low_light'
  | 'ok';

export type LivenessState =
  | { kind: 'waiting' }
  | { kind: 'frontal_held'; sinceMs: number }
  | { kind: 'blink_detected'; atMs: number }
  | { kind: 'passed' }
  | { kind: 'expired' };
