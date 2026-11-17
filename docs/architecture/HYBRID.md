# Tanda hybrid monitoring foundation

## Product and scope

Tanda identifies observable events that may deserve caregiver attention. It does not determine that someone is safe, diagnose a condition, infer emotions or intentions, or guarantee emergency detection.

The MVP is one individual, room and assigned source per runtime. Profiles may explicitly select child/additional care, older adult, or unspecified. Selecting a category never enables a policy. Existing gesture recognition, encrypted `.isyarat` handover, sign research, camera capture and local communication data remain intact.

## Boundaries implemented

```text
Browser webcam → existing MediaPipe pose/hands → existing movement energy
                                              ↓ explicit monitoring consent
                                        MonitoringSync
                                              ↓
Simulated camera → validated Observation → personal baseline → temporal evaluator
                                              ↓
                                     typed review/information event
                                              ↓
                              local persistence → caregiver event review
```

`src/platform/contracts.ts` supplies Zod contracts for individuals, care configuration, environments, camera/gateway devices, observations, baseline states, event/alert metadata, feedback, consent, device health and persisted snapshots. Invalid/mismatched inputs do not enter the evaluator. No pixels, recordings or microphone samples are accepted by these contracts.

`src/platform/adapters.ts` separates source acquisition from perception and observation delivery. The simulated adapter works. The RTSP/ONVIF adapter deliberately throws “not implemented”; it opens no sockets. A future frame decoder feeds a `PerceptionAdapter<Frame>`, producing quality and movement features, rather than placing an RTSP URL in an HTML video element.

`src/platform/behaviour.ts` implements an experimental Welford mean/variance reference for movement intensity plus accepted coverage and activity counts. Context includes room, six-hour time band and simulated/actual source mode. Thus a demo baseline cannot be applied to real-camera observations. It requires reviewed context and good observations. It freezes once available; room/time changes require review. Thresholds (20 one-second samples and 19 seconds accepted coverage) are engineering demonstration defaults, not an empirically validated observation period or a universal number of days.

`src/platform/runtime.ts` implements consent gates, assignment validation, monotonic observation checks, information events, sustained deviation candidates, minimum temporal span, continuous-episode suppression, cooldown, review notes and history. Only review-priority movement candidates are implemented. High-priority is a reserved contract value, not an operational fall/emergency detector. Repetitive movement itself is never a criterion. Missing input cannot become zero movement or an inactivity alert.

`apps/edge-gateway/server.ts` is a separate runnable Node service. The same pure runtime receives simulated observations through an authenticated HTTP API and atomically persists metadata snapshots to disk. It does not execute MediaPipe, decode CCTV, send remote alerts, or capture audio. Its HTTP interface is independently tested. The caregiver Devices page can explicitly check its authenticated health through the development proxy. The full repeatable caregiver demonstration runs in-browser using the same core and IndexedDB; it does not require or pretend to be the separately running service.

## Persistence and migration

IndexedDB remains named `isyarat`. Version 3 adds a `monitoring` sidecar store keyed by the existing profile identifier. It does not rewrite legacy profile, signal, example, event, sign-pack or practice data. Existing profiles start with unspecified category, no monitoring consent and no enabled movement policy. The v2→v3 migration and legacy-data retention are tested. Profile deletion cascades to monitoring metadata; delete-all removes the entire database. `.isyarat` format/version/encryption and import/export code remain compatible. Monitoring policies/authority are deliberately not silently transferred in communication handover files; the receiving device must configure them explicitly.

Browser writes are serialized. Persistence errors are surfaced instead of reporting success. Restarted browser/service snapshots report stopped processing rather than assuming that a persisted connected flag proves availability. Event history is bounded at 10,000 events and 200 review entries per event; reaching capacity fails explicitly instead of evicting alerts silently. Prototype retention controls need refinement before a pilot.

## Four intelligence capabilities

| Capability | Operational scope |
| --- | --- |
| Environmental | Existing browser webcam/pose processing; simulated gateway adapter; explicit source and quality states |
| Behavioural | Experimental intensity baseline, accepted coverage, context separation, temporal deviations; no clinical validation |
| Communication | Existing Teach → Recognise → Confirm → Improve; DTW logic preserved |
| Audio | Disabled boundary, `implemented:false`, `captureEnabled:false`; no microphone or classifier |

## Caregiver information architecture

- `/overview`: selected individual, room, local state, last observation, baseline and review queue.
- `/monitoring`: labelled metadata demonstration, controls, baseline/quality status, existing browser camera path.
- `/individuals`: existing profile CRUD plus explicit monitoring care configuration.
- `/events`: information/review events, explanations, source, quality, acknowledgement, dismissal, notes and history.
- `/home`, `/teach`, `/`, `/signals`: existing Communication destinations.
- `/timeline`, `/movement`: existing Insights and experimental movement history.
- `/devices`: source assignment, optional service health, future IP/audio boundaries, consent configuration.
- `/settings`: existing language, appearance, privacy, deletion and Labs.
- Existing research, sign packs, translation, splash, styleguide and handover routes remain.

No wholesale monorepo migration was needed. Root `npm run dev`, tests and static build remain. A separate gateway build is additive.

## Research and pilot path

[ONVIF Profile T](https://www.onvif.org/profiles/profile-t/) covers modern video streaming features, codecs and device features; compatibility must be checked against a specific conformant camera. [MDN streaming guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Live_streaming_web_audio_and_video) explains why browser media delivery needs suitable streaming formats and server components. These do not establish that the current prototype has RTSP support.

Google's [Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) outputs body landmarks rather than arbitrary validated care events. Google provides a [Raspberry Pi example](https://github.com/google-ai-edge/mediapipe-samples/blob/main/examples/pose_landmarker/raspberry_pi/README.md), but model/runtime compatibility, memory, sustained throughput and thermal behaviour must be measured on the chosen 64-bit deployment hardware. The user's current MacBook and historical headless-browser speed are not a production sizing guarantee.

Next: select one actual ONVIF/RTSP camera, implement a local decoder and sampled-frame adapter, evaluate the perception model on target hardware, validate quality/context coverage with consented representative data, then validate deviations with caregivers. Add authenticated pairing, role-based remote access, retention/export controls and an encrypted event-only outbox/relay before remote use. A relay needs durable retry/acknowledgement and visible delivery state; offline remote alert delivery is not implemented.
