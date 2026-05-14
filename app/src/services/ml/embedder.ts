/**
 * MobileFaceNet TFLite embedder.
 *
 * Model file: `app/assets/models/mobilefacenet.tflite`.
 * Input:  1 x 112 x 112 x 3 float32 (normalised to [-1, 1])
 * Output: 1 x N float32 (typically 128 or 192). We L2-normalise so cosine
 *         similarity = dot product.
 *
 * If the native module or the model file is missing, embed() falls back to
 * a deterministic mock so the rest of the app still runs.
 */

type TensorflowModel = {
  run: (inputs: unknown[]) => Promise<unknown[]>;
};

let model: TensorflowModel | null = null;
let loading: Promise<TensorflowModel | null> | null = null;
let realModelAvailable = false;

const FALLBACK_DIM = 128;

export async function loadEmbedderModel(): Promise<TensorflowModel | null> {
  if (model) return model;
  if (loading) return loading;
  loading = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Asset } = require('expo-asset');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const moduleRef = require('../../../assets/models/mobilefacenet.tflite');
      // In dev mode Metro serves assets over HTTP with query params, which
      // fast-tflite's native loader can't parse. Force a local file URI via
      // expo-asset so we always hand the loader a clean filesystem path.
      const asset = Asset.fromModule(moduleRef);
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      const localUri = asset.localUri || asset.uri;
      model = await loadTensorflowModel({ url: localUri });
      realModelAvailable = !!model;
      return model;
    } catch (e) {
      console.warn('[embedder] Failed to load MobileFaceNet, falling back to mock:', e);
      model = null;
      realModelAvailable = false;
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function isRealModelAvailable(): boolean {
  return realModelAvailable;
}

/**
 * Embed a 112x112 face crop (RGB bytes, row-major). Returns a normalised vector.
 */
export async function embed(faceCropRgb: Uint8Array): Promise<Float32Array> {
  const m = await loadEmbedderModel();
  if (m) {
    const input = new Float32Array(112 * 112 * 3);
    for (let i = 0; i < faceCropRgb.length; i++) {
      input[i] = (faceCropRgb[i] - 127.5) / 127.5;
    }
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
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input[i];
    h = Math.imul(h, 16777619);
  }
  const out = new Float32Array(FALLBACK_DIM);
  for (let i = 0; i < FALLBACK_DIM; i++) {
    h = Math.imul(h ^ i, 0x9e3779b1);
    out[i] = ((h & 0xffff) / 0xffff) * 2 - 1;
  }
  return l2Normalise(out);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) s += a[i] * b[i];
  return s;
}
