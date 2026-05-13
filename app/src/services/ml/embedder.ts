/**
 * MobileFaceNet TFLite embedder.
 *
 * The model file must be placed at `app/assets/models/mobilefacenet.tflite`
 * (~5MB, downloadable from common MobileFaceNet repos and converted to TFLite).
 *
 * Cross-platform via `react-native-fast-tflite`. The model runs on the GPU
 * where supported, CPU otherwise.
 *
 * IMPORTANT: This file expects `react-native-fast-tflite` to be installed
 * and a real .tflite model on disk. Until both are present, embed() returns
 * a deterministic random embedding (useful for non-device development).
 */

import type { TensorflowModel } from 'react-native-fast-tflite';

let model: TensorflowModel | null = null;
let loading: Promise<TensorflowModel | null> | null = null;

const EMBEDDING_DIM = 128;

/**
 * Loads the bundled MobileFaceNet model. Idempotent — safe to call from
 * multiple places.
 */
export async function loadEmbedderModel(): Promise<TensorflowModel | null> {
  if (model) return model;
  if (loading) return loading;
  loading = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      // Asset path — Metro will resolve via require/asset registry.
      // We catch failures and fall back to the mock embedder.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = require('../../../assets/models/mobilefacenet.tflite');
      model = await loadTensorflowModel(asset);
      return model;
    } catch (e) {
      console.warn('[embedder] Failed to load MobileFaceNet:', e);
      model = null;
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/**
 * Embed a 112x112 face crop. Returns a 128-D embedding (normalised).
 * If the real model isn't loaded, returns a deterministic mock embedding
 * keyed by a hash of the input — sufficient for non-device dev flows.
 */
export async function embed(faceCropRgb: Uint8Array): Promise<Float32Array> {
  const m = await loadEmbedderModel();
  if (m) {
    // MobileFaceNet expects RGB float32 input in [0, 1] of shape [1,112,112,3].
    // The pre-processing here is intentionally simple — a production
    // build should normalise to [-1, 1] and quantise per the model's spec.
    const input = new Float32Array(112 * 112 * 3);
    for (let i = 0; i < faceCropRgb.length; i++) input[i] = faceCropRgb[i] / 255;
    const result = await m.run([input]);
    const raw = result[0] as Float32Array;
    return l2Normalise(raw);
  }
  return mockEmbedding(faceCropRgb);
}

function l2Normalise(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const inv = s > 0 ? 1 / Math.sqrt(s) : 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}

function mockEmbedding(input: Uint8Array): Float32Array {
  // Deterministic hash-based embedding so the same input gives the same
  // vector. Used until the real model is loaded.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input[i];
    h = Math.imul(h, 16777619);
  }
  const out = new Float32Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    h = Math.imul(h ^ i, 0x9e3779b1);
    out[i] = ((h & 0xffff) / 0xffff) * 2 - 1;
  }
  return l2Normalise(out);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) s += a[i] * b[i];
  return s; // both are L2-normalised so dot product = cosine
}
