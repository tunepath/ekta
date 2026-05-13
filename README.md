# ektaHR Attendance Kiosk

A face-recognition attendance kiosk app for the ektaHR HRMS portal. Cross-platform (Android + iOS), React Native + Expo Dev Client. See [PLAN.md](./PLAN.md) for the full implementation plan (sections 1–13 + Appendix A: Logic decisions).

## Structure

```
.
├── PLAN.md          Architecture + logic decisions (authoritative)
├── app/             The kiosk app (Expo + React Native + TypeScript)
└── mock-server/     Local mock HRMS backend (Hono + Node)
```

## What's in here

**All 9 phases of code from PLAN.md section 12 are written:**

- Phase 1 — Real auth, GPS kiosk identity, persisted session, auth interceptor (silent 401 refresh + 403 force-logout)
- Phase 2 — Per-admin 6-digit PIN: setup, entry, 5-attempt lockout + 60s cool-down, Forgot PIN (HRMS password re-verify)
- Phase 3 — Vision Camera + ML Kit face detector integration scaffold + IDLE screen with IN/OUT action buttons + dim-after-60s wake lock
- Phase 4 — Passive liveness state machine (blink + frontal pose) + occlusion hints
- Phase 5 — MobileFaceNet TFLite embedder + op-sqlite roster cache + cosine matcher (3 embeddings/employee)
- Phase 6 — Punch flow: location capture, POST with idempotency UUID, rich success screen with profile photo + shift, 30-second dedupe
- Phase 7 — Enroll Face wizard: employee code lookup, 3-pose capture (left/forward/right), duplicate-face check (sim > 0.7)
- Phase 8 — Settings: Change PIN, Change Password (opens portal), Camera FPS, Sound & Haptics, Re-tag location, Advanced threshold, About/Diagnostics
- Phase 9 — Error boundary, permission block screen, biometric consent flow, network status monitor

## First-time setup

```sh
cd app && npm install
cd ../mock-server && npm install
```

**Expect Expo to recommend version alignment:**

```sh
cd app && npx expo install --check
```

This may bump a few packages — accept them.

## Required external assets before face recognition will work

Two assets are referenced by the code but not bundled in this repo:

1. **MobileFaceNet TFLite model** at `app/assets/models/mobilefacenet.tflite` (~5 MB).
   - Source from a MobileFaceNet repo (e.g. `sirius-ai/MobileFaceNet_TF`) and convert to `.tflite`.
   - Without this file, the embedder falls back to a deterministic mock vector and recognition won't work, but the rest of the flow exercises end-to-end.

2. **Beep sound** at `app/assets/sounds/beep.mp3` (any short chime).
   - Optional. Without it, the success-feedback sound is silently skipped (haptic still fires).

Create the directories:

```sh
mkdir -p app/assets/models app/assets/sounds
# drop your mobilefacenet.tflite into app/assets/models/
# drop your beep.mp3 into app/assets/sounds/
```

## Running locally

### Terminal 1 — mock backend

```sh
cd mock-server
npm run dev
# Listens at http://localhost:3000
```

### Terminal 2 — Expo Dev Client

The Vision Camera + TFLite + op-sqlite + ML Kit modules require a **dev build** (not Expo Go). Run on an Android device or emulator:

```sh
cd app
npx expo prebuild         # generates android/ + ios/ from app.json
npx expo run:android      # builds + installs the dev client to a connected device
```

Subsequent runs:

```sh
npm start                 # starts Metro; dev client connects automatically
```

For real-device LAN testing, set `EXPO_PUBLIC_API_BASE_URL` in `app/.env` to your machine's LAN IP (e.g. `http://192.168.1.42:3000`).

## Switching to the real ektaHR backend

When the real API spec is available:

1. Update `app/.env`: `EXPO_PUBLIC_API_BASE_URL=https://api.ektahr.com`
2. Update zod schemas in `app/src/services/api/schemas.ts` to match real response shapes
3. Update `mock-server/` to mirror those shapes (or stop running it)

## What works without running on a real device

- Sign in (against the mock server) — validates Kiosk Admin role
- GPS-based kiosk identity flow (with office-picker fallback)
- PIN setup, entry, lockout, Forgot PIN
- Navigation between all 18 screens
- Mock punch flow: select IN/OUT → mock embedding → match against (empty) roster → fail or succeed via mock backend
- Settings sub-screens (change PIN, toggles, threshold)

## What needs a real device to validate

- Live camera preview
- Real ML Kit face detection
- Real liveness (blink) detection
- Real TFLite embedding (requires the .tflite model file)
- iOS biometric permission prompts
- Background process / wake lock under real OS pressure
- Low-end Android performance

## Known limitations + TODOs

These are flagged in the code with comments and are expected:

- **Frame processor isn't wired to ML Kit.** `app/src/services/recognition/useFaceDetector.ts` exposes `pushDetection()` as the hand-off point. The actual `<Camera>` component with a `useFrameProcessor` worklet needs to live inside the IdleScreen — wire it once the native modules install successfully on a device.
- **Face crop pre-processing is mocked.** Both IdleScreen punch and EnrollFace use a deterministic random 112×112 buffer. Replace with: crop the largest face from the latest frame using its bounds, resize to 112×112, convert to RGB Uint8Array, then call `embed()`.
- **Threshold tuning.** The default 0.55 is a starting value — collect 50 employees × 5 selfies and tune before launch.
- **iOS reference photo storage.** Phase 7 currently uploads only embeddings. To send a reference photo for HRMS display, capture a JPEG from the forward pose and pass as `photo_data_url` to `uploadFaceEmbeddings`.

## File count

```
app/        51 files written across config / navigation / 18 screens / 6 stores / 9 services / 4 shared / 1 hook
mock-server/ 7 files
```

## Phase status (PLAN.md section 12)

All phases marked complete. The above caveats are explicitly part of the plan, not regressions.
