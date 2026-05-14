/**
 * Module-level holder for the latest face crop produced by a camera frame
 * processor. Worklets can't easily share typed arrays across screens via
 * React props, so we stash the latest 112x112x3 RGB crop here and read it
 * from screens that need to run an embedding (PunchProcessing, EnrollFace
 * auto-capture).
 *
 * The crop is overwritten on every frame. Callers should pair the read with
 * a freshness check (latest.at within the last N ms) before using it.
 */

let latestCrop: Uint8Array | null = null;
let latestCropAt = 0;

export function setLatestCrop(crop: Uint8Array): void {
  latestCrop = crop;
  latestCropAt = Date.now();
}

export function getLatestCrop(): { crop: Uint8Array; at: number } | null {
  if (!latestCrop) return null;
  return { crop: latestCrop, at: latestCropAt };
}

export function clearLatestCrop(): void {
  latestCrop = null;
  latestCropAt = 0;
}
