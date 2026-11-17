# Tanda hybrid foundation — implementation and validation

The interface was subsequently refined in the [signature design phase](../design/SIGNATURE-REPORT.md). The architecture and capability boundaries below remain applicable; its build/performance figures describe the foundation checkpoint.

17 November 2026. This report separates software verification from real-world validation. **Implemented** means code exists; **Tested** means the stated automated/manual check ran; **Simulated** means generated observations, not a connected person/camera; **Unverified** means no relevant real-world evaluation; **Planned** means not operational.

## 1. Product transformation

**Implemented:** Tanda — Unified Assistive Intelligence Platform. “Understand Individuals. Recognise Changes. Support Better Care.” Caregiver decisions remain central. Environmental, behavioural, communication and future audio capabilities have distinct status descriptions. Existing source/gesture workflows remain in place.

**Unverified:** care outcomes, safety-event sensitivity/specificity and suitability for unsupervised monitoring. No diagnosis, emotion inference, emergency guarantee or clinical accuracy claim.

## 2. Information architecture

**Implemented:** Overview, Live Monitoring, Individuals, Events & Alerts, Communication, Insights, Devices & Cameras, Settings. The desktop rail and collapsed header expose monitoring destinations. Phones retain the existing floating communication controls and add an explicit monitoring destination strip. Research remains separate. EN/BM copy, light/dim themes and existing skeleton transitions are retained.

## 3. Technical architecture

**Implemented:** additive `src/platform` shared Zod contracts, pure baseline and temporal event runtime, camera/frame/perception adapter boundaries; `apps/edge-gateway` separate Node service. No disruptive monorepo move. Existing `src/engine`, `src/vision`, browser storage and React architecture remain.

Browser: webcam → existing local MediaPipe/movement features → explicit monitoring consent → shared runtime → IndexedDB → caregiver review. Browser simulation substitutes validated metadata for camera input. Separate service: simulated adapter → same runtime → disk snapshot → authenticated HTTP API.

**Planned:** production camera decoder, edge vision execution, preprocessing implementation, secure remote relay and supervised reconnect. See [architecture](../architecture/HYBRID.md) and [implementation plan](../architecture/IMPLEMENTATION-PLAN.md).

## 4. Routes

**Implemented:** `/overview`, `/monitoring`, `/events`, `/devices` (hash routes). `/individuals` gains care configuration and category-aware age-band display; `/timeline` gains monitoring metadata summary/export. `/home`, `/`, `/teach`, `/signals`, `/handover`, `/settings`, `/movement`, `/research`, Labs and existing bookmarks remain supported. Default legacy `/` remains gesture recognition.

## 5. Components and modules

**Implemented:** PlatformOverview, MonitoringPage, EventsPage, DevicesPage (`Platform.tsx`); MonitoringConfig; MonitoringInsights; MonitoringSync; useMonitoringProfile; monitoring repository/Zustand store. App, Shell, SessionSync, Individuals, Timeline, database/repository and translation dictionaries integrate these additions. No new runtime dependency was needed.

## 6. Existing capabilities preserved

**Implemented:** original DTW recognition, caregiver meanings and confirmation, teaching, unknown-signal workflow, existing MediaPipe capture, personal libraries, sign research, indexed storage, consent, delete-all, encrypted `.isyarat` handover. The DTW algorithm, handover file format and encryption were not replaced by this transformation.

**Tested:** baseline before work: 131 unit tests; typecheck/lint/build; 52 browser tests passed, 4 intentionally skipped. Existing dirty user changes were preserved rather than reset. Version 2→3 migration keeps profiles, signals, examples and sign packs; profile deletion cascades to monitoring data. Existing export/delete/wrong-passphrase/import regression remains covered.

## 7. New working functionality

**Implemented:** per-individual monitoring consent/category/room/assignment, explicit experimental movement and context switches, evaluation schedule, truthful health states, persistent metadata baseline, review/information event lifecycle, acknowledge/dismiss/context/history, offline local persistence, metadata export, simulated reset safeguard, source/assignment validation. Selecting an age category never enables a policy. Relationship labels are local context, not granted access.

## 8. Demonstration

**Simulated / Tested:** choose an individual; Devices → configure category/room and explicit consent/policy; Monitoring → start simulated camera → collect reviewed demo baseline → simulate sustained unusual activity → local notification toast → Events → acknowledge/add context/dismiss → reload → history persists. Demonstrate ordinary input, disconnect and privacy controls; return to Communication for taught gesture recognition.

The accelerated demo emits 24 one-second synthetic samples; its clock and coverage are labelled. It has no fake video feed. Notification is a local simulated inbox/toast, not delivery to another caregiver. Browser demonstration uses IndexedDB and does not depend on a running gateway process.

## 9. Camera integration

**Implemented:** existing browser webcam/MediaPipe pose/hands path plus low-rate movement/quality bridge after separate monitoring consent. Source modes prevent demo samples from becoming a real-camera reference. Visible stop controls and existing route/track lifecycle retained.

**Simulated:** one metadata camera per room in the edge adapter.

**Unverified:** real people, actual IP cameras, lighting/occlusion accuracy and unattended continuous operation. RTSP/ONVIF adapter intentionally reports unavailable; browsers are not given RTSP URLs. No general-purpose activity/fall detector.

## 10. Edge gateway

**Implemented / Tested:** separately compiled Node service, loopback-only binding, required bearer token (minimum 24 characters), Origin restriction, 64 KiB request limit, validated commands, serialized writes, atomic restrictive-permission snapshot file, persisted review history after restart. Restart reports stopped rather than assuming a persisted camera connection is live. `npm run gateway:test` verifies HTTP authentication, CORS, consent, event creation/review and disk recovery.

**Implemented:** Devices supports an explicitly requested authenticated health check through the Vite development proxy. Token remains in component memory and clears on success.

**Planned:** UI pairing/subscription and event transport to that independent service. Full caregiver demo currently runs locally in-browser; the UI does not control the service's event API. Production static hosting needs an explicit same-origin reverse proxy. No camera inference, remote alerts, cloud video or deployment to production hardware has been performed. Setup: [gateway deployment](../deployment/EDGE-GATEWAY.md).

## 11. Personal baseline

**Implemented / Tested:** Welford movement-intensity reference, accepted sample count/coverage/activity count, room/time-band/source context. Explicit reviewed context + good observations; at least 20 spaced samples and 19 seconds accepted coverage; gaps over 5 seconds contribute no coverage. These are demo engineering defaults, not a validated universal calibration period. Baseline freezes once available; context change requires review. States cover unconfigured, collecting, insufficient, available and requires-review.

**Unverified:** long-term routine learning, movement-frequency/activity-duration classification, representative population accuracy and validated threshold selection. No prediction. Caregiver notes record context but do not automatically retrain a model.

## 12. Event engine

**Implemented / Tested:** typed information/review events, explicit quality, source, room, timestamps, nullable confidence, explanation, simulated flag, acknowledgement, dismissal and bounded history. Movement candidate requires at least three good observations over at least two seconds, reviewed available baseline and configured schedule. Continuous-episode suppression plus 60-second cooldown prevents a single sustained episode from repeatedly alerting, including after restore. Occlusion/missing/disconnection do not imply inactivity. Repetitive movement is not itself a negative criterion.

**Planned:** validated high-priority detectors, escalation, configurable grouping/cooldowns and remote delivery. High-priority schema value is reserved. No numerical confidence is fabricated.

## 13. Audio

**Implemented:** explicit disabled adapter boundary (`implemented:false`, `captureEnabled:false`) and honest capability UI.

**Planned:** separately consented acquisition, preprocessing, evaluated audio classifier, temporal validation and retention controls. No microphone capture, crying results or fabricated sound notifications.

## 14. Privacy and security

**Implemented / Tested:** no default raw video/audio storage or transmission; explicit authority/video consent; visible camera state/stop; category cannot grant consent; validation at trust boundaries; IndexedDB additive sidecar; gateway token/Origin checks; no unsolicited network connection. Production CSP remains same-origin. Browser delete-all removes browser data; individual deletion cascades monitoring sidecars. Communication handover excludes monitoring consent/history so the receiving device must configure anew.

**Implemented:** [privacy documentation](../PRIVACY.md) distinguishes local browser data, optional gateway disk data and exported metadata. Independent gateway snapshots and downloaded exports require separate deletion. JSON monitoring exports are not automatically encrypted. No cloud account, analytics or microphone.

**Planned:** per-caregiver identity/roles, access audit, pairing, credential management, stronger retention controls, relay encryption/retry and formal security assessment. Device/browser access currently grants local data access; a caregiver relationship label is not authorisation. No blanket legal-compliance claim.

## 15. Performance

**Tested:** Node 24.14.0, React 19.3.1, TypeScript 6.0.3, Vite 8.3.8, Tailwind 4.3.5, MediaPipe 0.10.35, Zustand 5.1.0, wouter 3.13.0, idb 8.0.4, Zod 4.6.7. Production build main entry 635.75 kB (203.96 kB gzip), platform route 16.53 kB (4.18 kB gzip), chart route 442.59 kB (128.72 kB gzip). Local model/runtime directories approximately 46 MB (33 MB runtime, 13 MB models). Computer vision remains lazy-loaded; no new model assets.

**Tested:** isolated opt-in Chromium headless probe at 390×844, eight-second windows: demo 481 animation frames, mean 16.65 ms, p95 16.7 ms, no >50 ms frames or long tasks. Fake webcam + MediaPipe: 33 animation frames, mean 247.85 ms, p95 299.9 ms, 32 >50 ms frames/long tasks; observed detection 4 fps at an 8 fps target; sampled inference 268.7 ms. This confirms a substantial main-thread inference constraint. Synthetic camera input does not establish real-camera accuracy; these numbers are local measurements, not hardware sizing guarantees.

**Unverified:** target edge hardware memory, thermal behaviour, multi-camera throughput, real-world detection accuracy and long-running resilience. Browser MediaPipe still executes on the main thread. Historical four-detections-per-second observation is not a production guarantee.

## 16. Validation results

**Tested:** final `npm run check` passed: strict typecheck, zero-warning lint, 48/48 contrast pairs, 148 unit tests across 20 files, production build. Gateway HTTP integration: 1 passed. Full Chromium suite with optional visual capture enabled: 60 passed, 1 skipped (the opt-in performance probe). Performance probe subsequently ran separately: 1 passed. A prior new-workflow note-save race was fixed; the repeated full suite has no failures. After the context-review gate and layout refinements, the focused monitoring/camera/accessibility/header suite passed all 16 tests, including the actual browser adapter quality/persistence test. Its synthetic camera produced no visible-person baseline and no movement-deviation event. This is a boundary check, not validation against real people. Final lint and production build passed again.

**Tested:** migration, invalid payload/audio prohibition, sparse coverage, frozen/context baseline, temporal span, deduplication/recovery, consent withdrawal, schedule, adapter mismatch, disconnect/quality distinction, persisted feedback. Browser demonstration covers category isolation, offline local review, notes surviving reload, dismissal/disconnection, 320 px reflow. New pages have axe coverage in EN/BM and light/dim. Existing suite covers onboarding, profiles, gesture teaching/confirmation, camera denial/no device/model failure, handover/export/import/delete-all, keyboard, reduced motion and privacy network guards.

**Tested:** screenshots captured and visually inspected for Overview, Monitoring, Events and Devices. Desktop and 320 px captures contain demonstration metadata. Older screenshot files are regenerated by the existing optional visual suite; no visual test is a real-world camera evaluation.

## 17. Remaining limitations

**Unverified / Planned:** no real IP CCTV or audio integration; no person identity verification for a shared room; no validated risk model, fall/inactivity detector or remote notification delivery. Real-camera quality uses existing landmark visibility, not a validated low-light classifier. Source/time context supports one baseline at a time, not a complete daily model. Schedules restrict event evaluation, not automatic physical camera acquisition. Browser camera stops on navigation away from camera routes; no background caregiver-UI-independent real inference service exists yet. No autonomous stale-frame watchdog, reconnection supervisor or production multi-camera orchestration. Local histories have explicit capacity errors (10,000 events; 200 review entries/event); retention UX needs refinement. Failed disk/browser writes report errors but need power-loss/failure-injection testing before deployment. Existing permissions are local device access plus a gateway shared secret, not multi-user caregiver authorisation.

## 18. Next pilot steps

**Planned:** select and consent one real environment/individual; use a tested compatible camera; implement and harden local frame decoder, preprocessing and perception adapter; benchmark the chosen 64-bit edge hardware/model combination; add watchdog and recovery. Validate quality, coverage, baseline thresholds and temporal candidates using representative consented data and caregiver feedback. Measure false positives/negatives without claiming clinical risk. Add role-based pairing/access audits and retention/deletion controls. Integrate UI event transport to the service, then durable minimum-metadata relay/outbox with delivery acknowledgements if remote alerts are required. Review autonomy/assent/authority and sensitive-room privacy with the pilot institution before observational deployment.
