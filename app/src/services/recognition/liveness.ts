import type { DetectionFrame, FaceLandmarks, LivenessState } from './types';

const EYE_OPEN_THRESHOLD = 0.7;
const EYE_CLOSED_THRESHOLD = 0.3;
const FRONTAL_DEGREE_LIMIT = 15;
const FRONTAL_HOLD_MS = 500;
const BLINK_WINDOW_MS = 2_000;
const STATE_EXPIRY_MS = 5_000;

/**
 * Liveness state machine — passive (blink + frontal pose).
 * Step A4 from PLAN. Pure function over time + frames.
 */
export class LivenessTracker {
  private state: LivenessState = { kind: 'waiting' };
  private frontalSince: number | null = null;
  private lastEyesOpen = true;
  private lastBlinkAt: number | null = null;

  reset() {
    this.state = { kind: 'waiting' };
    this.frontalSince = null;
    this.lastEyesOpen = true;
    this.lastBlinkAt = null;
  }

  isFrontal(face: FaceLandmarks): boolean {
    return Math.abs(face.yaw) < FRONTAL_DEGREE_LIMIT && Math.abs(face.pitch) < FRONTAL_DEGREE_LIMIT;
  }

  update(frame: DetectionFrame, nowMs: number): LivenessState {
    const face = frame.primary;
    if (!face || frame.faceCount !== 1) {
      this.frontalSince = null;
      this.state = { kind: 'waiting' };
      return this.state;
    }

    // Blink detection — track open/closed transitions
    const eyesOpen =
      face.leftEyeOpenProbability > EYE_OPEN_THRESHOLD &&
      face.rightEyeOpenProbability > EYE_OPEN_THRESHOLD;
    const eyesClosed =
      face.leftEyeOpenProbability < EYE_CLOSED_THRESHOLD &&
      face.rightEyeOpenProbability < EYE_CLOSED_THRESHOLD;

    if (eyesClosed) {
      this.lastEyesOpen = false;
    } else if (eyesOpen && !this.lastEyesOpen) {
      // closed → open transition = blink
      this.lastBlinkAt = nowMs;
      this.lastEyesOpen = true;
    } else if (eyesOpen) {
      this.lastEyesOpen = true;
    }

    // Frontal pose tracking
    if (this.isFrontal(face)) {
      if (this.frontalSince === null) this.frontalSince = nowMs;
    } else {
      this.frontalSince = null;
    }

    const frontalHeldFor = this.frontalSince === null ? 0 : nowMs - this.frontalSince;
    const blinkRecent =
      this.lastBlinkAt !== null && nowMs - this.lastBlinkAt < BLINK_WINDOW_MS;

    if (blinkRecent && frontalHeldFor > FRONTAL_HOLD_MS) {
      this.state = { kind: 'passed' };
    } else if (frontalHeldFor > FRONTAL_HOLD_MS) {
      this.state = { kind: 'frontal_held', sinceMs: this.frontalSince! };
    } else if (blinkRecent) {
      this.state = { kind: 'blink_detected', atMs: this.lastBlinkAt! };
    } else {
      this.state = { kind: 'waiting' };
    }

    return this.state;
  }

  getState(): LivenessState {
    return this.state;
  }
}

/**
 * Maps detection state to a single hint shown to the employee on the idle screen.
 */
export function hintFor(frame: DetectionFrame): {
  hint: 'no_face' | 'multi_face' | 'too_small' | 'not_frontal' | 'occluded' | 'ok';
  message: string | null;
} {
  if (frame.faceCount === 0) return { hint: 'no_face', message: null };
  if (frame.faceCount > 1) return { hint: 'multi_face', message: 'Please scan one at a time' };
  const f = frame.primary!;
  if (f.occluded) return { hint: 'occluded', message: 'Please remove mask to mark attendance' };
  if (f.bounds.width < 120) return { hint: 'too_small', message: 'Step closer' };
  if (Math.abs(f.yaw) > FRONTAL_DEGREE_LIMIT || Math.abs(f.pitch) > FRONTAL_DEGREE_LIMIT) {
    return { hint: 'not_frontal', message: 'Look at camera' };
  }
  return { hint: 'ok', message: null };
}
