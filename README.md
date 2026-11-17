# Tanda

**Unified Assistive Intelligence Platform**

Understand Individuals. Recognise Changes. Support Better Care.

Tanda helps caregivers review observable changes for children and older adults, with individually configured consent, environments and policies. It preserves personalised gesture communication: Teach → Recognise → Confirm → Improve. Caregivers provide context and make care decisions.

The hybrid foundation adds a metadata-only monitoring pipeline, experimental personal baseline, temporal event review, and a separate local gateway service. The repeatable browser demonstration uses clearly labelled simulated observations. The existing webcam/MediaPipe path can supply actual movement observations after separate monitoring consent. RTSP/ONVIF, audio classification, fall detection and remote notifications are not operational.

The interface uses an architectural monochrome system with a low floating glass dock, curved surfaces and purposeful transitions. See the [latest interaction refinement](docs/design/FLUID-REFINEMENT.md), the [design report](docs/design/SIGNATURE-REPORT.md) and [desktop/mobile gallery](docs/screenshots/refinement/README.md).

Start at `/#/overview`. See [architecture](docs/architecture/HYBRID.md), [gateway setup](docs/deployment/EDGE-GATEWAY.md), and [implementation and validation report](docs/validation/HYBRID-REPORT.md). Existing communication bookmarks and encrypted `.isyarat` files remain supported.

## Privacy

Camera frames are processed locally and are not stored or transmitted. Recorded gesture landmarks, local events, consent and experimental baseline summaries remain in IndexedDB. There is no microphone capture, analytics or cloud account. The optional authenticated loopback gateway stores metadata on disk; the Devices page checks its health only on request. Remote notification delivery is unavailable. See [privacy details](docs/PRIVACY.md).

## Quick start

Tested with Node 24.14.0; Vite 8 requires Node 20.19+ or 22.12+. Use Node 24+ and Chrome or Edge (desktop or Android).

```bash
npm install
npm run setup        # once, needs internet: copies MediaPipe WASM, downloads 2 model files (~13 MB) into public/
npm run dev          # http://localhost:5173
```

After `npm run setup` the app runs fully offline. `predev`, `prebuild`, `prepreview` and `pree2e` re-run setup with `--if-missing`, so it only downloads when files are absent.

### Using the camera on a phone (same Wi-Fi)

Browsers only allow the camera on `https` or `localhost`. Run:

```bash
npm run dev:https    # https://<this computer's LAN IP>:5173, self-signed certificate
```

Open the `Network:` address on the phone. It warns that the certificate is not trusted (it is generated locally for development): choose **Advanced → Proceed** (Chrome) or **Show Details → visit this website** (Safari). Then allow the camera. Dev only; the production build is unaffected.

### How to demo (no camera needed)

1. Open the app, tick the three consent boxes, create a profile (nickname only).
2. Press **Try the demo first**. A synthetic stick-figure performer appears instead of a camera.
3. Go to **Teach**, name a signal (e.g. "Water" — "I want water, please."), pick the demo gesture "Tap the table", record 5 takes, check, save.
4. Back on **Live**, ask the performer to "Tap the table": the meaning appears. Press **Yes**.
5. Ask the performer to **Rock**: Calm Watch moves to Rising and explains why.

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the 3-minute judge demo.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build (with CSP) into `dist/` |
| `npm run preview` | Serve `dist/` |
| `npm run setup` | Copy MediaPipe WASM + download models (`--if-missing` to skip when valid) |
| `npm run typecheck` / `lint` | TypeScript strict / ESLint (0 warnings allowed) |
| `npm test` / `test:watch` | Vitest unit tests (engine, crypto, repo, i18n, contrast, synthetic benchmark) |
| `npm run e2e` | Builds the `e2e` mode bundle and runs Playwright (Chromium, fake camera) |
| `npm run contrast` | Fails if any design-token pairing is below WCAG thresholds |
| `npm run check` | typecheck + lint + contrast + test + build |

## Architecture (summary)

```
camera / demo performer → MediaPipe Pose + Hands (in browser) → hand-slot matching → 1€ smoothing
  → 108-D body-normalised features → recogniser (banded DTW, calibrated rejection) → Live card
                                   → Calm Watch (energy, rhythm, suddenness)      → Calm card
IndexedDB: profiles · signals · examples (landmark numbers) · events        Settings: localStorage
```

- `src/engine/` — pure TypeScript, no DOM, fully unit-tested (features, 1€ filter, DTW, classifier, recogniser, Calm Watch, coach, simulator, crypto).
- `src/vision/` — camera, MediaPipe loader and loop, demo source.
- `src/store/` — IndexedDB repository and Zustand stores. `src/ui/` — React pages and components. `src/i18n/` — English + Bahasa Malaysia.

Full detail with equations and constants: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## What is verified automatically vs by hand

| Area | Automatic | By hand |
|---|---|---|
| Engine: features, smoothing, DTW, classifier, recogniser, Calm Watch, coach, crypto, repo | 77 Vitest unit tests | – |
| Recognition quality | Synthetic benchmark (`docs/benchmark-synthetic.json`) — **synthetic benchmark, not a clinical or real-child result**: 95.8% closed-set accuracy with 5 examples, 95.0% with 3, 100% of untaught flap/rock/idle rejected, ≈4.5 ms per window | Real children, real gestures |
| Full user flows (onboarding, teach, live + feedback, Calm Watch, handover, delete-all, CSV) | Playwright e2e with the demo performer | – |
| Camera path | Chromium's fake camera: camera starts, MediaPipe loads, "can't see the shoulders" coach, tracks stop on route change | **A real webcam on the presenting laptop** (see below) |
| Accessibility | axe on every page × light/dim × EN/BM (0 serious/critical), keyboard-only onboarding, reflow at 320 px, reduced motion | Screen reader run-through (NVDA / VoiceOver / TalkBack) |
| Privacy | Every e2e test aborts and fails on any non-localhost request; CSP in the tested build | – |
| Speech | – | Voice availability per device (only on-device voices are used) |
| Android Chrome | Layout at 390 px | Real phone: camera, performance |
| Bahasa Malaysia wording | Every key present, placeholders match | Native-speaker review: [docs/BM_REVIEW.md](docs/BM_REVIEW.md) |

## Manual real-camera test (cannot be automated)

1. `npm run dev`, open http://localhost:5173 in Chrome or Edge.
2. Sit about 1–1.5 m from the webcam so your shoulders and both hands are in view.
3. Open Live, press **Start camera**, allow the camera. Within a few seconds the status reads "Seeing the child".
4. Step out of view: after about 1 second the coach says it can't see the shoulders. Step back in: it recovers.
5. Turn on "Show skeleton": points and bones follow your shoulders, elbows, wrists and hands. The preview is a mirror.
6. Teach a signal with 5 takes using the camera, then perform it on Live. Try "Not quite" and "New meaning".
7. Navigate to Signals: the camera light must switch off.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `[setup] FAILED` | Needs internet once. Re-run `npm run setup`. |
| "On-device recognition could not run" | Use Chrome/Edge; check `public/models/*.task` exist; try Demo mode. |
| "Running in low-power mode" | The device is slow; frames per second drop automatically. Turn on Battery saver or close other tabs. |
| No speech | Only on-device voices are used. Install a Malay or English voice in the OS; the meaning is always shown on screen. |
| Console shows `W… gl_context.cc` / "GL Driver Message" warnings on the camera path | Emitted by MediaPipe's WASM graph / the GPU driver, not by Tanda. Harmless. |
| e2e: port 4319 in use | Stop the other process; the e2e preview never reuses a foreign server. |

## Limitations

- Needs a steady camera placed where the signals were taught; large camera-angle (yaw) changes reduce accuracy.
- One child in view at a time. Taught per child; it does not work for children it has not learned.
- It can be wrong. Calm Watch is a movement pattern only, not a diagnosis or a measure of feelings.
- Not a medical device. Accuracy numbers anywhere in this repo are synthetic.

## Licences of third-party assets

- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) and the Pose Landmarker (lite) and Hand Landmarker models — Google, Apache License 2.0.
- Inter font — SIL Open Font License 1.1.
- Lucide icons — ISC. React, Vite, Tailwind CSS, Radix UI, Motion, Sonner, Recharts, Zustand, wouter, idb, zod — MIT.

EasyUI component adaptations — MIT; upstream notice is retained in `src/ui/vendor/LICENSE.easyui`. Colorion libraries informed the custom CSS interactions.

Tanda source: MIT.


## UI review

Run `npm run dev` and open the printed local URL. The app includes Home, Teach, Live, and Insights, with a floating glass tab bar on phones. Language and appearance controls are in Settings. Insights has Day/7-day/31-day gesture views; its date-aligned Export control opens CSV, JSON, and Print actions. Daily history and exports retain their selected-day scope.

The unlisted `/#/styleguide` route previews the shared components. See [DESIGN.md](DESIGN.md), the [makeover report](docs/UI-MAKEOVER-REPORT.md), [audit](docs/UI-AUDIT.md), and [screenshot comparison gallery](docs/screenshots/README.md). Source adaptations from EasyUI live in `src/ui/vendor` behind product wrappers.
