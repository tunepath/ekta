# ektaHR Attendance Kiosk — Implementation Plan

> A new module of the ektaHR HRMS Portal. Front-office face-recognition attendance terminal. Cross-platform mobile (Android + iOS, low-end and high-end phones).

---

## 1. Product summary

A **kiosk-mode** mobile app installed on a phone that sits at the front office of a customer's premises. The admin signs in once during setup; thereafter, the camera screen is the persistent home. Employees walk up, the camera detects + recognizes their face (with blink-based anti-spoofing), and attendance is recorded against the ektaHR HRMS backend.

A separate per-employee attendance app exists and is out of scope here.

---

## 2. Confirmed decisions

| Topic | Decision |
|---|---|
| **Usage model** | Kiosk — one device, many employees punching per day |
| **Tech stack** | React Native + Expo Dev Client (cross-platform) |
| **Target devices** | Android + iOS phones, low-end and high-end |
| **Connectivity** | Online-only. No offline buffering. |
| **Roster size** | ~1k employees per kiosk |
| **Recognition** | On-device (MobileFaceNet via TFLite). Local roster cache. |
| **Anti-spoofing v1** | Blink detection + head-pose gate. (Active head-turn liveness deferred to v1.1.) |
| **Admin PIN** | Set by admin during kiosk setup, stored in device secure storage |
| **PIN purpose** | Admin gate — unlocks the admin menu (incl. logout). NOT required for employee punches. |
| **Backend** | Existing ektaHR HRMS APIs. Docs to be supplied by user. App integrates; does not define contracts. |
| **Out of scope** | Payroll, fieldwork, login/logout-time editing, individual-employee usage |
| **Design source** | Figma file `6trgmRo4JOkms9HtW582OZ` — visual language only. Flows in that file target the **individual app**; kiosk re-uses tokens/components but adapts flows per section 3. |
| **Mock backend** | Local Hono/Express server at `mock-server/` for dev. Swapped out for real ektaHR APIs via `API_BASE_URL` env var. |

---

## 3. Screen flow

```
[ first launch on this device ]
       │
       ▼
┌──────────────────┐
│  Admin Sign In   │  email + password → ektaHR login API
│  (Kiosk Admin    │  (Optional OTP step if HRMS requires 2FA)
│   role only)     │
└────────┬─────────┘
         │ success
         ▼
┌────────────────────────────┐
│  Kiosk identity (first     │  GPS auto-tag → match against /offices
│  ever login on device)     │  Fallback: dropdown of HRMS offices
│                            │  Stored on device + server
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Set PIN (first time this  │  Choose 6-digit PIN
│  admin signs in on this    │  Stored hashed in secure-store, keyed by admin email
│  device)                   │  Existing admins skip this step
└────────┬───────────────────┘
         │
         ▼
╔══════════════════════════════════════════════════════════════════╗
║                  IDLE — "READY TO SCAN" (HOME)                   ║
║                                                                  ║
║   Live camera feed + face guide outline + status badge.          ║
║   Two prominent action buttons:    [ PUNCH IN ]  [ PUNCH OUT ]   ║
║   Small lock icon in top-right corner (admin entry).             ║
║   Screen dims to 30% after 60s with no face detected.            ║
║                                                                  ║
║   ┌──────────── employee path ─────────────────────────────┐    ║
║   │ 1. Employee taps PUNCH IN or PUNCH OUT                  │    ║
║   │ 2. Camera arms recognition (face detection at ~10 fps)  │    ║
║   │ 3. Face conditions checked:                             │    ║
║   │      • Exactly 1 face — else "Please scan one at time"  │    ║
║   │      • No mask/occlusion — else "Please remove mask"    │    ║
║   │      • Frontal pose — else "Look at camera" hint        │    ║
║   │      • Adequate size — else "Step closer" hint          │    ║
║   │ 4. Liveness gate: blink + frontal pose held 500ms       │    ║
║   │ 5. Embed + match (3 embeddings/employee, max similarity) │    ║
║   │      Threshold 0.55, margin 0.05                        │    ║
║   │ 6. 30s same-employee+same-direction debounce            │    ║
║   │ 7. POST /attendance with type=IN|OUT                    │    ║
║   │ 8. Show "Rich" success screen (3s auto-dismiss):        │    ║
║   │      PUNCHED IN/OUT badge (green/orange)                │    ║
║   │      Name + Code · Time · Location                      │    ║
║   │      Profile photo (from roster cache, NOT live frame)  │    ║
║   │      Shift status · (OUT only) Total today              │    ║
║   │ 9. Soft beep + brief haptic on success                  │    ║
║   │ 10. Auto-dismiss → IDLE with IN/OUT RESET (no selection)│    ║
║   │                                                          │    ║
║   │ FAILURE PATHS (preserve IN/OUT selection for retry):    │    ║
║   │   no match           → "Not recognized" toast → IDLE    │    ║
║   │   POST failed (5xx)  → red banner, tap to retry         │    ║
║   │   no network         → red OFFLINE badge, scan disabled │    ║
║   └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║   ┌──────────── admin path ─────────────────────────────────┐    ║
║   │ Tap lock icon (top-right) → PIN screen                  │    ║
║   │   • 6-digit, 5 wrong attempts → 60s cool-down           │    ║
║   │   • "Forgot PIN" → re-verify HRMS password → reset PIN  │    ║
║   │   → correct PIN → Admin Menu (3 items):                 │    ║
║   │       ├── Enroll Face                                   │    ║
║   │       │     1. Enter employee code → fetch from HRMS    │    ║
║   │       │     2. Confirm employee details                 │    ║
║   │       │     3. 3-pose capture (left / forward / right)  │    ║
║   │       │     4. Duplicate-face check (warn if sim > 0.7) │    ║
║   │       │     5. Upload 3 embeddings + forward as photo   │    ║
║   │       ├── Settings                                      │    ║
║   │       │     ├── Change PIN                              │    ║
║   │       │     ├── Change Password (opens HRMS portal)     │    ║
║   │       │     ├── Camera (device, fps)                    │    ║
║   │       │     ├── Sound & Haptics (toggles)               │    ║
║   │       │     ├── Re-tag kiosk location                   │    ║
║   │       │     ├── Advanced → Match threshold              │    ║
║   │       │     └── About / Diagnostics                     │    ║
║   │       └── Logout → "Are you sure?" → Sign In            │    ║
║   │                  (clears token only, keeps PIN+roster)  │    ║
║   │                                                          │    ║
║   │   NOTE: No Attendance Log on kiosk. Use HRMS portal.    │    ║
║   └─────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 4. Tech stack

```
Runtime:
  React Native 0.76+  (Expo Dev Client, NOT Managed)

Camera + ML:
  react-native-vision-camera         v4    (frame processors over JSI)
  react-native-vision-camera-face-detector (Google ML Kit on both platforms)
  react-native-fast-tflite                 (MobileFaceNet, 128-D embeddings)

Storage:
  op-sqlite                                (local roster cache, fast)
  expo-secure-store                        (admin token, kiosk PIN hash)

Platform:
  expo-location                            (location stamp)
  expo-network                             (online detection)
  expo-device                              (device id for kiosk registration)

App layer:
  @react-navigation/native (stack)
  zustand                                  (state)
  @tanstack/react-query + axios            (server)
  react-hook-form + zod                    (admin forms)

Dev:
  TypeScript, ESLint, Prettier
  EAS Build (for iOS + Android binaries without owning a Mac per dev)
```

---

## 5. Module layout

```
src/
├── app/                      navigation, root layout, providers
├── features/
│   ├── auth/                 admin sign-in, session persistence, logout-with-PIN
│   ├── kiosk/                idle screen, capture loop, success splash, no-network banner
│   ├── pin/                  PIN setup, PIN entry, PIN change
│   ├── recognition/          detector + embedder + matcher pipeline
│   ├── liveness/             blink state machine, head-pose gate
│   ├── enrollment/           180° face capture wizard (Add Employee)
│   ├── attendance/           log view, duplicate-check, server POST
│   ├── employees/            roster fetch + local cache
│   └── settings/             change PIN, change password, camera, notifications
├── services/
│   ├── api/                  axios client, ektaHR endpoint wrappers, auth interceptor
│   ├── db/                   SQLite schema + queries (roster cache)
│   ├── ml/                   tflite model loader, embedding utils, cosine sim
│   └── secure/               secure-store wrappers for token + PIN hash
├── shared/
│   ├── ui/                   buttons, cards, theme tokens (matches Figma)
│   ├── hooks/                useFaceCapture, useLiveness, useNetwork
│   └── utils/
└── config/                   env, feature flags, ML thresholds
```

---

## 6. Local data (SQLite — read-mostly cache)

```sql
employees (
  id              TEXT PRIMARY KEY,         -- ektaHR employee id
  name            TEXT NOT NULL,
  employee_code   TEXT NOT NULL,
  embedding       BLOB NOT NULL,            -- 128 floats × 4 bytes = 512B per row
  photo_url       TEXT,                     -- reference photo (display only)
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_employees_updated_at ON employees(updated_at);

settings (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL
);

-- Settings keys: selected_camera_id, target_fps, threshold, notifications_enabled, etc.
```

Total local DB footprint for 1k employees ≈ ~600KB (embeddings) + photos cached separately. Trivial.

**No `attendance_log` table** — we are online-only, so punches go straight to the server. If the network is down at punch time, we tell the employee to try again rather than queue.

---

## 7. ektaHR API integration (to be confirmed against real docs)

These are the endpoints we'll need. The names below are placeholders — they'll be reconciled with the actual ektaHR API spec when you share it.

| Need | Likely existing endpoint | Notes |
|---|---|---|
| Admin login | `POST /auth/login` | email + password → token. Confirm refresh-token flow. |
| Kiosk device pairing | Probably new | Need a way to bind this device to a location + admin. Ask HRMS team. |
| Employee roster + embeddings | `GET /employees` | Must return face embedding (or we generate it server-side from stored photos). Pagination + `since` param for deltas. |
| Add employee | `POST /employees` | Standard fields + photo upload. |
| Upload face data | `POST /employees/{id}/face` | Embedding + reference photo. Triggered after 180° enrollment. |
| Record attendance | `POST /attendance` | employee_id, ts, lat/lng, confidence, liveness_score, device_id. Idempotency key recommended. |
| Today's punches | `GET /attendance?date=today&kiosk=...` | For Attendance Log screen + duplicate display. |

**Action item:** when you share the Postman/Swagger, I'll map each of these to the real call and flag any gaps.

---

## 8. Face recognition pipeline

Each camera frame in IDLE state:

```
1. ML Kit face detector
   ├── 0 faces      → skip
   ├── 2+ faces     → skip + "one person at a time" hint
   ├── face too small (< 120px wide) → "step closer" hint
   └── 1 face, good size:
        ├── eye-open probabilities recorded → blink state machine
        ├── head Euler angles |yaw|, |pitch| < 15° → frontal
        └── if NOT frontal → "look at camera" hint, skip

2. Liveness gate
   ├── Blink within last 2s? (eye-open dipped < 0.3 then back > 0.7)
   └── Frontal pose held for 500ms?
   if both true → liveness PASS

3. Crop + align to 112×112 → MobileFaceNet TFLite → 128-D embedding
   (only run once liveness passes, NOT every frame — saves battery / CPU)

4. Cosine similarity vs all 1k roster embeddings
   ├── < 5ms even on low-end Android (1024 × 128 floats matmul)
   └── top-1 sim > THRESHOLD (start 0.55, tune empirically)
       AND margin over top-2 > 0.05 → match

5. Duplicate guard
   └── Check server's today's-punches cache. If same employee in last
       N minutes (default 5), show "already marked" and skip POST.

6. Show "Face Matched" confirmation with Name + ID + Time + Location
   POST /attendance
   Success splash (3s) → back to IDLE
```

### Performance budget (low-end Android target)

| Step | Target | Notes |
|---|---|---|
| Face detection | 8–10 fps | Worklet on JSI thread, doesn't block UI |
| Embedding | 100–150ms | Runs once after liveness pass, not per frame |
| Matching | < 5ms | In-memory matmul |
| Server POST | 200–500ms | Network-bound; show optimistic confirm UI |

---

## 9. Anti-spoofing — honest scope

**v1 ships with blink-only + head-pose gate.** This stops:
- Printed photos
- Photos shown on a screen with no motion

**v1 does NOT stop:**
- A video of the person blinking played back on a high-resolution screen
- 3D-printed masks
- Replay attacks

**Path forward** (not v1):
- v1.1 — active head-turn ("turn left" → "turn right" → "look forward") for sensitive operations
- v2 — passive ML liveness model (Silent-Face-Anti-Spoofing or similar), runs alongside recognition

Document this threat model honestly in customer-facing material.

---

## 10. Security & privacy

- **DPDP Act 2023** classifies biometric data as sensitive personal data.
- **Consent screen** at employee enrollment time — explicit, recorded server-side, with purpose + retention disclosed.
- **Store embeddings only**, not raw photos, on the kiosk's local DB. The HRMS server may also store a reference photo, but the kiosk never holds raw photos.
- **PIN storage:** never store the PIN itself — only a `scrypt` or `argon2id` hash + salt in expo-secure-store.
- **Admin token** in secure storage; cleared on logout.
- **Refresh token rotation** if ektaHR supports it.
- **Audit logging server-side**: every admin action (PIN change, employee added, threshold changed) recorded.
- **App permissions** disclosed at install + first-run: camera, location, network.

---

## 11. Design system (extracted from Figma)

The shared Figma file is the visual baseline. These tokens drive the theme — flows are kiosk-specific per section 3.

### Color tokens

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#ffb422` | Primary buttons, accents, links, active states |
| `brand.primaryShadow` | `rgba(255,180,34,0.2)` | Soft glow under primary buttons |
| `surface.light.bg` | `#ffffff` | Light section background (success screen, etc.) |
| `surface.dark.bg` | `#121212` | Dark section background (camera, PIN overlay panels) |
| `surface.dark.card` | `#1c1c1c` | Card on dark theme (login card, PIN container) |
| `surface.input` | `#333333` | Form input fill (dark theme) |
| `text.primary.onLight` | `#1c1c1c` | Display/body on light bg |
| `text.primary.onDark` | `#ffffff` | Body on dark bg |
| `text.muted` | `#a1a1a1` | Secondary text, footer |
| `text.placeholder` | `rgba(161,161,161,0.6)` | Input placeholders |
| `text.onPrimary` | `#000000` | Text on orange — **black, not white** |
| `border.subtle.onDark` | `rgba(255,255,255,0.05)` | Cards/inputs on dark |

### Typography

Font family: **Inter** (Regular 400 / Medium 500 / SemiBold 600 / Bold 700).

| Style | Size / Line / Weight |
|---|---|
| Display | 28 / 24 / SemiBold, tracking -1px (e.g. "Welcome Back!") |
| Heading 2 | 20 / 24 / SemiBold |
| Body | 16 / 24 / Regular |
| Button | 18 / 24 / SemiBold |
| Caption / Label | 14 / 20 / Medium |

### Geometry

- Page padding: **16px** horizontal
- Card padding: **33px**
- Form gap (between fields): **24px**
- Radius — cards: **16px**, inputs/buttons: **4px**, large CTAs: **28px** (pill on success screen)
- Card shadow: `0 25 50 -12 rgba(0,0,0,0.25)`
- Primary button shadow: `0 10 15 -3 rgba(255,180,34,0.2), 0 4 6 -4 rgba(255,180,34,0.2)`

### Kiosk-vs-Figma flow adaptations

The Figma file targets the individual-employee app. The kiosk reuses tokens + components but diverges on the following:

| Figma screen | Figma behavior (individual app) | Kiosk adaptation |
|---|---|---|
| Login | Has *"Don't have an account? Create an account"* link; any user | **Remove** create-account link. Restrict to "Kiosk Admin" role. Add OTP step (conditional). |
| Mark Attendance / Camera | Single shutter button; manual capture; one user | **No shutter** — auto-detect once IN/OUT selected. Add **two action buttons IN/OUT** on the idle screen. Add **lock icon top-right** for admin entry. Multi-face = reject both. |
| Selfie Review (Retake / Submit Punch) | Lets user approve before submission | **Skip entirely** — auto-submit on match, no review |
| Marked Successful | "Back to Home" CTA, persistent screen | **3s auto-dismiss** transient splash → scan-ready idle. Reset IN/OUT selection. |
| Logout | "Are you sure?" → direct logout | **PIN-gated admin menu** (3 items: Enroll Face, Settings, Logout). Logout clears token only, keeps PIN + roster + location. |
| PIN screen | "Mark Attendance" header, 4-digit named / 6 slots | Repurposed as **admin gate**. **6-digit** PIN. Per-admin (keyed by email). Header reads "Admin". Forgot PIN → re-verify HRMS password. |

---

## 12. Phased delivery

| Phase | Scope | Effort |
|---|---|---|
| **0** | Expo Dev Client setup, navigation, theme tokens (from section 11), API client (axios + zod), env config, **mock-server scaffold** | 2 days |
| **1** | Admin sign-in (Kiosk Admin role check), conditional OTP step, GPS-based kiosk identity tagging with office-picker fallback, persisted session, force-logout on 403 | 3 days |
| **2** | Per-admin PIN setup, PIN entry, lockout + Forgot PIN (HRMS password re-verify), admin menu shell, logout flow (clear token only) | 2 days |
| **3** | Vision Camera + ML Kit face detection, IDLE screen with **IN/OUT action buttons** + face guide + lock icon, multi-face reject, dim-after-60s wake lock | 3–4 days |
| **4** | Liveness v1 (blink + frontal-pose gate), occlusion detection ("remove mask" hint), distance/centering hints | 2 days |
| **5** | TFLite MobileFaceNet, local roster cache (3 embeddings/employee + photo cache), matcher with max-of-3 similarity, threshold setting | 4 days |
| **6** | Punch flow — IN/OUT selection state machine, location capture, POST /attendance, **rich success screen** (3s auto-dismiss with profile photo + shift), 30s dedupe, failure paths | 3 days |
| **7** | Enroll Face — employee code lookup, fetch from HRMS, 3-pose capture wizard, duplicate-face check (sim > 0.7 warn), upload embeddings | 3 days |
| **8** | Settings — Change PIN, open-portal Change Password, Camera (device/fps), Sound & Haptics, Re-tag location, Advanced threshold, About/Diagnostics | 2 days |
| **9** | Hardening — error states (camera revoked, location revoked, persistent unreachable, deactivated account), low-end iOS + Android testing, biometric consent flow, EAS Build pipeline, internal track release | 3 days |

**Total: ~4–5 weeks for one engineer.** Net effort dropped slightly vs prior version because Attendance Log was removed and Add Employee simplified to face-only enrollment.

**Parallel backend work on the ektaHR HRMS team's side:**
- New endpoints: `GET /offices` (for kiosk identity matching), `GET /employees/{code}` (single lookup), `POST /employees/{id}/face-embeddings`, `POST /attendance` (with `type` + idempotency), refresh-token endpoint if not already present
- Add "Kiosk Admin" role + ensure login API surfaces it
- Confirm whether 2FA is required (drives the conditional OTP step in phase 1)

---

## 13. Open items before coding starts

1. **ektaHR API docs** — Postman or Swagger. (User will share. Mock server stands in until then.)
2. **ektaHr logo SVG** — Figma has the PNG; need the source SVG for crisp rendering.
3. **App identifiers** — bundle IDs for Android + iOS, app name in stores, App Store / Play Console accounts.
4. **Test devices** — specific low-end Android model to target? Affects phase-3 profiling.
5. **2FA confirmation** — HRMS team confirms whether login requires an OTP step. App is built with the step as a conditional path; flip the flag once confirmed.
6. **"Kiosk Admin" role** — HRMS team confirms this role exists (or adds it). Login response must include role for client-side check.
7. **HRMS password-reset URL** — exact URL for the "Forgot password" external link.
8. **Inter font licensing** — Inter is SIL OFL (free for commercial use). Confirm no override.

Phase 0 can start once items 2 + 4 land. Items 1, 5, 6, 7 unblock the swap from mock → real API.

---

## Appendix A — Logic decisions (login → logout)

Settled during the deep-discussion phase. Each subsection records what was decided, why it matters, and the implications.

### A1. Login

- **Eligibility:** Only users with a **dedicated "Kiosk Admin" role** in ektaHR HRMS. Wrong-role login returns 403 with a clear message.
- **Multi-admin:** Different kiosk admins can sign in to the same device over time (one at a time). Per-admin state persists locally.
- **2FA / OTP:** App reserves an optional OTP step in the auth flow. Triggered conditionally based on server response.
- **Forgot password:** Tapping the link opens the ektaHR portal's reset page (in-app browser via `expo-web-browser`).
- **Kiosk identity tagging:** On first ever login on this device, app reads GPS and matches against `GET /offices`. Hybrid fallback to a dropdown picker if GPS denied / unavailable / no match.
- **Remember email:** Pre-fill the last-used admin email on the login screen (small UX win).
- **Session persistence:** Login survives app restarts indefinitely; auto-refresh on 401 (see A8).

### A2. Kiosk setup + PIN

- **PIN length:** 6 digits (matches Figma slot count).
- **PIN scope:** **Per-admin** — each admin email has its own PIN, stored hashed (argon2id) in `expo-secure-store` keyed by email.
- **Setup timing:** First time a specific admin signs in on this device. Skipped for returning admins.
- **PIN recovery:** 5 wrong attempts → 60s cool-down. "Forgot PIN" link re-verifies HRMS password via existing login API; on success, admin sets a new PIN.
- **Persist on logout:** Yes. PIN hash stays — re-login is friction-free.

### A3. Idle / camera home

- **Layout:** Live camera feed + face-guide outline + "READY TO SCAN" badge top-center + **two action buttons (PUNCH IN / PUNCH OUT)** + lock icon top-right for admin entry.
- **Multi-face policy:** Reject both faces while >1 detected. Show "Please scan one at a time" hint.
- **Detection hints:** "Step closer", "Look at camera", "Improve lighting" — shown only after 1.5s of persistent bad state. Calm, not chatty.
- **Sound:** Soft beep on **successful match only**. No other audio.
- **Haptic:** Brief vibration on success (50ms). Toggleable in Settings.
- **Power profile:** Wake lock keeps screen on; dim to 30% after 60s without a face; wake to full brightness on face detection.
- **Orientation:** Locked portrait.
- **No-network state:** Replace status badge with red "OFFLINE — punching disabled". Suppress all recognition.

### A4. Face recognition + liveness

- **Liveness v1:** Passive — blink detection + frontal-pose gate (`|yaw|, |pitch| < 15°`). No active prompts.
- **Acknowledged limitation:** Video replay of a blinking face can bypass v1. v1.1 adds active head-turn liveness.
- **Embeddings per employee:** **3** (left / forward / right captures), stored separately. At match time: compute similarity vs each, take the max.
- **Threshold:** 0.55 cosine similarity, margin over top-2 ≥ 0.05. Admin-tunable in Settings → Advanced.
- **Borderline matches:** Above threshold = accepted silently. No "Is this you?" tap-confirm.
- **Occlusion:** Detect mask / sunglasses / scarf. Refuse with hint: "Please remove mask to mark attendance".
- **Lighting:** Soft hint only; never blocks the scan.
- **No match:** Short toast "Not recognized — please try again or contact HR".
- **Embedding refresh:** Manual only (admin re-runs enrollment). No auto-refresh.

### A5. Punch in/out logic

- **Type selection:** **Manual IN / OUT buttons on the idle screen.** Employee taps first, then face-scans. Selection resets after every successful punch.
- **Cycles per day:** **Unlimited.** Every event recorded. HRMS aggregates totals.
- **Duplicate window:** 30 seconds. Same employee + same direction within 30s = silent ignore. Opposite direction allowed (rare accidental fix).
- **Shift validation:** Server's job. Server returns `shift_name`, `on_time`, and (on OUT) `today_minutes` in the punch POST response. Kiosk displays these.
- **Late tagging:** Kiosk doesn't block or warn. Server records the time; HRMS reports lateness.
- **Across-midnight:** Server pairs IN/OUT via UTC timestamps; kiosk doesn't model the day boundary.
- **POST failure:** Hard error toast + retry. Preserve IN/OUT selection so retry is one tap. No silent queue (online-only).
- **Manual override:** **None.** All manual corrections happen in the HRMS web portal.
- **Undo:** None on kiosk.
- **Unknown / no-match scans:** Silent ignore. Not posted to server.

### A6. Attendance confirmation

- **Content (Rich):**
  - Type badge: green "PUNCHED IN" or orange "PUNCHED OUT" (largest element)
  - Employee name + code
  - Timestamp (HH:MM:SS)
  - Location label
  - Circular profile photo from HRMS roster cache (not the live frame)
  - Shift status line (e.g., "On Time • Day Shift")
  - On OUT only: "Worked 8h 23m today"
- **Auto-dismiss:** 3 seconds. Tap-to-dismiss after a 0.5s minimum.
- **Post-punch state:** Idle returns with IN/OUT **reset** — next employee must pick.
- **Failure screen (POST 5xx):** Same layout with red banner + retry. No auto-dismiss.

### A7. Admin section

- **Menu items:** 3 — **Enroll Face**, **Settings**, **Logout**. No Attendance Log on kiosk.
- **Enroll Face flow:**
  1. Admin types or scans the **employee code**.
  2. App fetches employee from `GET /employees/{code}` and displays name + photo for confirmation.
  3. Admin runs the 3-pose capture wizard (left, forward, right) with retake-per-pose.
  4. App computes embeddings, checks for duplicate face (sim > 0.7 vs roster) — if found, warn with name + allow override.
  5. POST embeddings + forward pose as reference photo to HRMS.
- **Attendance Log:** **Dropped.** Reporting is HRMS portal only.
- **Settings sub-menu:**
  - Change PIN
  - Change HRMS Password (opens portal via `expo-web-browser`)
  - Camera (device selector, frame-rate preset)
  - Sound & Haptics (toggles)
  - Re-tag kiosk location (re-runs GPS + picker)
  - Advanced → Match threshold slider (hidden behind toggle)
  - About / Diagnostics (version, kiosk ID, last sync, "Test camera", "Test network")

### A8. Logout + error states

- **Logout confirmation:** "Are you sure? — Log Out / Stay Logged In". No PIN re-prompt.
- **Clear on logout:** Token only. Keep PIN hash (per admin), roster cache, photos, settings, kiosk location tag.
- **Camera state:** Release the camera when navigating to login (no preview on the login screen).
- **Token expiry (401):** Auto-refresh transparently. On refresh failure, force logout with email pre-filled.
- **Account deactivated (403 + reason):** Explicit modal "Your account has been deactivated by HR. Please contact your administrator." → forced logout.
- **Camera permission revoked at runtime:** Full-screen block "Camera access required" + "Open Settings" deep-link.
- **Location permission revoked:** Non-blocking banner. Punches still work (lat/lng = null).
- **HRMS persistent unreachable:** After 3 consecutive failures, persistent banner: "Service unreachable. Contact IT." Local Settings still accessible.
- **OS-killed app:** Cold restart resumes admin's session if token still valid.
