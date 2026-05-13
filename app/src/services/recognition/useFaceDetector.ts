import { useEffect, useRef, useState } from 'react';

import type { DetectionFrame, FaceLandmarks } from './types';

/**
 * Cross-platform face-detection hook backed by `react-native-vision-camera`
 * and `react-native-vision-camera-face-detector`.
 *
 * IMPORTANT: this hook is a **client interface** that the IdleScreen consumes.
 * Inside, the actual frame-processor runs in a worklet on the camera thread
 * via the vision-camera plugin. Because frame processors must be installed
 * at the camera site (not in a hook), this file exposes:
 *
 *   - `useFaceDetector()` — returns the current detection frame
 *   - `pushDetection(frame)` — called from the frame processor with the
 *     latest detection, in the JS thread (via runOnJS).
 *
 * Until the native modules are wired (Phase 3 on-device), `pushDetection`
 * can be called by an Animated value, a developer-tool button, or left
 * unwired — the rest of the pipeline degrades gracefully.
 */

let listeners: Array<(f: DetectionFrame) => void> = [];

export function pushDetection(frame: DetectionFrame) {
  for (const l of listeners) l(frame);
}

export function useFaceDetector() {
  const [frame, setFrame] = useState<DetectionFrame>({
    faceCount: 0,
    primary: null,
    frameWidth: 0,
    frameHeight: 0,
  });
  const ref = useRef(frame);

  useEffect(() => {
    const onFrame = (f: DetectionFrame) => {
      ref.current = f;
      setFrame(f);
    };
    listeners.push(onFrame);
    return () => {
      listeners = listeners.filter((l) => l !== onFrame);
    };
  }, []);

  return frame;
}

/**
 * Returns the largest face from a multi-face list. Used by the worklet
 * after ML Kit reports detected faces.
 */
export function pickPrimaryFace(faces: FaceLandmarks[]): FaceLandmarks | null {
  if (faces.length === 0) return null;
  let largest = faces[0];
  for (let i = 1; i < faces.length; i++) {
    if (faces[i].bounds.width > largest.bounds.width) largest = faces[i];
  }
  return largest;
}
