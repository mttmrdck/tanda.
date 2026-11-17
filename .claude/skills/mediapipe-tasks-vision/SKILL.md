---
name: mediapipe-tasks-vision
description: Rules for using @mediapipe/tasks-vision (PoseLandmarker + HandLandmarker) in the Isyarat browser app. Use whenever touching src/vision/*, model loading, detectForVideo calls, or MediaPipe types.
---

# MediaPipe Tasks Vision — project rules (Isyarat)

Pinned: `@mediapipe/tasks-vision ~0.10.35` (last 0.10.x; 1.x exists but is a new major — not adopted, see DECISIONS.md).
Verified against `node_modules/@mediapipe/tasks-vision/vision.d.ts`.

## Never
- Never import `@mediapipe/pose`, `@mediapipe/hands` or `@mediapipe/holistic` (deprecated legacy solutions).
- Never use `FaceLandmarker`, `FaceDetector` or any face model (product rule: we do not read faces).
- Never leave a CDN URL (jsdelivr, storage.googleapis.com) in shipped code. Models and WASM are served locally.
- Never retain MediaPipe result objects. Copy numbers into our own arrays immediately.

## Create
```ts
import { FilesetResolver, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
const base = import.meta.env.BASE_URL; // sub-path safe
const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
const pose = await PoseLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: `${base}models/pose_landmarker_lite.task`, delegate: 'GPU' },
  runningMode: 'VIDEO', numPoses: 1,
});
const hands = await HandLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate: 'GPU' },
  runningMode: 'VIDEO', numHands: 2,
});
```
If creation with `delegate: 'GPU'` throws, retry with `'CPU'`. Expose which delegate is active.

## Detect
- Signature (from vision.d.ts): `detectForVideo(videoFrame: ImageSource, timestamp: number): PoseLandmarkerResult` / `HandLandmarkerResult`. The timestamp argument is REQUIRED in practice; public snippets omit it.
- Timestamp: integer, strictly increasing **per landmarker instance**: `ts = Math.max(lastTs + 1, Math.round(performance.now()))`.
- Only call when `video.readyState >= 2`, `video.videoWidth > 0`, and `video.currentTime` advanced since last call.
- Calls are synchronous and block the main thread. Cap the loop (default 15 fps); drop fps a step (min 8) if inference EMA > 60 ms.
- Wrap in try/catch; 5 failures in a row → surface a friendly error with "Try Demo mode".

## Results
- Pose: `result.landmarks[0]` → 33 `NormalizedLandmark {x, y, z, visibility}`, x/y normalised 0–1 in un-mirrored image space.
- Hands: `result.landmarks[i]` → 21 points; `result.handedness[i][0].categoryName` is 'Left'|'Right' but is UNRELIABLE and flips with mirrored input. Match hands to pose wrists (15 left, 16 right) by proximity — see `src/vision/handMatching.ts`.
- Preview is mirrored by CSS `scaleX(-1)` only. Never mirror data.

## Lifecycle
- One shared, idempotent init (module-level promise) so React StrictMode double-mount does not create two landmarkers.
- `close()` landmarkers when the app disposes the vision runtime; stop all MediaStream tracks on unmount / route change.
