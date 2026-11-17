# Isyarat

**Teach the camera what your child already says.**

Isyarat (Malay: "signal") is a communication aid for caregivers, special-education teachers (PPKI) and therapists of children who are non-verbal or minimally verbal. A caregiver shows the camera a gesture the child already uses ("tapping the table twice means *I want water*"), a few times, and writes what it means. From then on Isyarat watches for that signal and shows the caregiver the meaning, with **Yes / Not quite / New meaning** buttons so the caregiver always has the final say.

It also offers **Calm Watch**, a movement-pattern indicator (energy, rhythm, suddenness) with the caregiver's own comfort steps, and **Handover**, an encrypted file that passes a child's whole signal vocabulary to a new teacher or relief carer.

> Isyarat is a communication aid. It does not diagnose, treat, screen for any condition, or replace therapists, doctors or caregivers. It does not read minds or detect emotions, and it only works for the child it was taught. **We deliberately do not read faces.**

## Privacy, in one paragraph

All camera processing happens in the browser. Video frames are never stored, uploaded or logged; only abstract body/hand landmark numbers from signals the caregiver deliberately records are kept, in this browser's IndexedDB. No account, no server, no analytics, no third-party fonts or CDNs, no microphone. The production build ships a strict Content-Security-Policy and an automated test fails if any request leaves `localhost`. Details: [docs/PRIVACY.md](docs/PRIVACY.md).

## Quick start

Needs Node 20+ and Chrome or Edge (desktop or Android).

```bash
npm install
npm run setup        # once, needs internet: copies MediaPipe WASM, downloads 2 model files (~13 MB) into public/
npm run dev          # http://localhost:5173
```

After `npm run setup` the app runs fully offline. `predev`, `prebuild`, `prepreview` and `pree2e` re-run setup with `--if-missing`, so it only downloads when files are absent.

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
| Console shows `W… gl_context.cc` / "GL Driver Message" warnings on the camera path | Emitted by MediaPipe's WASM graph / the GPU driver, not by Isyarat. Harmless. |
| e2e: port 4319 in use | Stop the other process; the e2e preview never reuses a foreign server. |

## Limitations

- Needs a steady camera placed where the signals were taught; large camera-angle (yaw) changes reduce accuracy.
- One child in view at a time. Taught per child; it does not work for children it has not learned.
- It can be wrong. Calm Watch is a movement pattern only, not a diagnosis or a measure of feelings.
- Not a medical device. Accuracy numbers anywhere in this repo are synthetic.

## Licences of third-party assets

- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) and the Pose Landmarker (lite) and Hand Landmarker models — Google, Apache License 2.0.
- Atkinson Hyperlegible and Fraunces fonts — SIL Open Font License 1.1.
- Lucide icons — ISC. React, Vite, Tailwind CSS, Radix UI, Motion, Sonner, Recharts, Zustand, wouter, idb, zod — MIT.

Isyarat source: MIT.
