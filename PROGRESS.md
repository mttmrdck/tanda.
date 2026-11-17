# Progress

- [x] Phase 0 — Tooling and ground rules
- [x] Phase 1 — Scaffold and infrastructure
- [x] Phase 2 — Engine (pure TS) with tests
- [x] Phase 3 — Vision pipeline and Demo mode
- [x] Phase 4 — App shell, design system, onboarding, i18n
- [x] Phase 5 — Teach and Signals
- [x] Phase 6 — Live and Calm Watch
- [x] Phase 7 — Timeline, Handover, Settings, About
- [x] Phase 8 — Polish and audits
- [x] Phase 9 — Docs, packaging, optional PWA

## Final gates (2026-11-17)
- [x] Fresh clone → install → setup → check (77 unit tests, 42 contrast pairs, build) → e2e (25 passed, 3 visual-review specs skipped by design)
- [x] Production `dist` contains no debug hook; no third-party request in any e2e test
- [x] Section 10 pitfalls reviewed (StrictMode-safe loader, increasing timestamps, CSS-only mirroring, no frame persistence, IndexedDB-only signal data, BASE_URL asset paths, Tailwind v4 `@theme`, chart heights + text alternatives, async speech voices, ISO UTC times, preallocated DTW, friendly storage errors, CSP with `wasm-unsafe-eval` in builds only, keyboard path, offline after setup)

## UI second pass and Colorion refinement — 17 November 2026

- [x] Read the supplied brief and references; run locally on 127.0.0.1:5173.
- [x] Replace gradients/glow with system typography, flat grouped surfaces, light/dark tokens, and local Inter fallback.
- [x] Add Home and an unlisted styleguide; retain every existing workflow.
- [x] Install selected EasyUI components with shadcn, adapt under UI wrappers, preserve upstream license, record all 134 candidates.
- [x] Add read-only movement trace, real-event frequency/distribution/heatmap, and Day/7-day/31-day gesture views.
- [x] Floating glass icon-only navigation, Hand icon for Teach, custom switch latch and signal loader.
- [x] Compact Insights date header; CSS-checkbox export fan with CSV, JSON, Print; aligned daily chart frames.
- [x] Screenshot review in EN/BM, light/dark, phone/desktop; original EasyUI comparison gallery.
- [x] 77 unit tests, 48 contrast pairs, typecheck and production build.
- [x] Unsuppressed Impeccable scan: zero primary findings; one intentional advisory for the user-requested export spring.
- [x] Before/after frame measurement: demo ~60fps, camera mean ~245ms unchanged; detailed measurements in docs/UI-MAKEOVER-REPORT.md.
- [x] No edits to engine, vision, store, data schemas, crypto, or handover logic.


## Tanda identity and final navigation refinement

- [x] Supplied blue gesture icon in navigation and browser favicon; visible app name Tanda / `tanda.`.
- [x] Existing local data keys and `.isyarat` handover compatibility preserved.
- [x] Simplified header; language, sun/moon/device appearance, and privacy controls in Settings.
- [x] Export anchored next to the Insights date selector, with contextual actions below the header.
- [x] Page-shaped skeleton shimmer for navigation and lazy loading; static reduced-motion fallback.
- [x] Typecheck, 77 unit tests, production build, and screenshot refresh.
- [x] Previous complete regression: 31/31 tests, including camera performance and visual probes. Final targeted recheck covers the rebrand, preference persistence, exports, accessibility, and skeleton transitions.

- [x] Compact Profile groups and a filled handover action; 12 follow-up accessibility, reflow, navigation and screenshot checks pass.
- [x] Standalone Tanda splash preview from the supplied brief, with four-stroke artwork, one-time entrance and reduced-motion support.
- [x] Splash preview: dedicated accessibility, four-stroke, no-navigation, reduced-motion and full-resolution capture check passes.

## Sign packs (Labs, behind a flag)

- [x] `.signpack` format (zod, versioned, plain or encrypted), registry with built-in and device packs; a BIM pack is data only.
- [x] Ships an **empty ASL pack** plus a simulator **demo pack** labelled "Demo only, not real signs". No dataset bundled.
- [x] Dynamic signs reuse the existing DTW/kNN/τ engine unchanged; new static handshape classifier (scale/rotation/mirror invariant) with a location gate.
- [x] Learn mode: pack browser, search, Practice with skeleton reference replay and per-part feedback (handshape / movement / location), fingerspelling sequences, local progress with runs and no loss framing.
- [x] Recognise mode: one candidate with "Is this …?", otherwise "Not sure"; never sentences.
- [x] Author a pack: signer consent, optional credit, 5+ takes, quality checks, confusables, export/import (licence and credits shown), withdraw signer, delete pack.
- [x] Benchmark: real clips + labels file with signer metadata, honest empty state; synthetic demo-pack run labelled synthetic.
- [x] Settings › Labs flag, off by default; first-run notice "Seeking review by Deaf signers".
- [x] Tests: 20 unit (schema, files, registry, invariance, held window, confusables, feedback, metrics, quality, synthetic demo benchmark) + 6 e2e (flag off, framing/practice, fingerspelling, recognise, authoring/import/export/withdraw, benchmark); every e2e test also enforces zero third-party requests.
- [ ] Needs Deaf-signer review before any public use (see docs/SIGN_PACKS.md).

## Translate (Labs, same flag)

- [x] `/translate` with its own nav item, store slice (memory only), camera session and matcher; three tabs: Sign to word, Word to sign, Fingerspell.
- [x] Sign to word: capture → up to 3 candidates with EN/BM gloss, strength label, replay; "Not sure"; "None of these"; Signs-so-far strip with copy/undo/clear; local-voice-only speech, off by default.
- [x] Word to sign: EN/BM search with suggestions, skeleton player (play/pause, 0.5×/1×, loop, mirror, highlight, step-through, captions), multi-word queue, not-in-pack with fingerspelling from real templates only.
- [x] Fingerspell: camera letters with candidates and confusable warning, word box (space, backspace, clear), reverse spelling; J/Z only as dynamic templates.
- [x] Empty-pack state in every mode; persistent demo banner; pack/language/review status on every screen.
- [x] Isolation from Live: import-graph test (mutation-checked) + storage/runtime test.
- [x] Tests: 18 unit + 6 e2e (flag, empty state, sign-to-word, word-to-sign, fingerspell, camera lifecycle; axe on every mode; zero third-party requests).
- [x] Measured: 4 ms from capture end to result; ranking ~1.4 ms; synthetic demo top-1 95.8 % / top-3 100 %.
- [ ] Early stop on stillness, so a short sign does not wait for the full 2.5 s window.
- [ ] Real ASL needs recorded signs/alphabet from real signers and a Deaf signer's review.

## Hybrid assistive monitoring foundation — 17 November 2026

- [x] Baseline audited: typecheck/lint/build, 131 unit tests, 52 browser passes and 4 intentional skips.
- [x] Additive shared Zod contracts, independent baseline/event core, simulated camera interface and disabled IP/audio boundaries.
- [x] Separate authenticated loopback simulation service with atomic metadata persistence and HTTP integration test.
- [x] IndexedDB v3 sidecar with tested legacy migration and profile-delete cascade; existing communication data and encrypted handover preserved.
- [x] Overview, Monitoring, Events and Devices; explicit child/older-adult care configuration; actual event review/history and local metadata Insights.
- [x] Repeatable labelled simulation, no automatic age policies, explicit monitoring consent, camera quality/disconnection distinct from inactivity.
- [x] EN/BM and light/dim accessibility checks, 320px reflow, rendered screenshot review.
- [x] 148 unit tests, 48 contrast pairs, typecheck/lint/production build; full browser suite 60 passed/1 opt-in skip; final focused suite 16 passed; separate performance and gateway probes passed. Details: docs/validation/HYBRID-REPORT.md.
- [ ] Real IP camera decoder/inference, edge pairing/event transport, caregiver roles, validated risk detectors, remote notifications and audio remain future work.

## Signature monochrome workspace — 17 November 2026

- [x] Supplied monochrome/liquid-glass brief applied over the preserved hybrid foundation; original blue brand icon retained.
- [x] Three directions compared; local skills/tool availability inspected; chosen system documented in DESIGN.md and docs/design/SIGNATURE-DIRECTION.md.
- [x] Refined shell and all eight primary destinations, shared page headers/status badges, grouped consent forms, real source and event metadata.
- [x] Five-icon glass dock, keyboard-accessible mobile menu, six explicit viewport widths, clear EN/BM and light/dim states.
- [x] Manual rendered review, populated/unconfigured profile checks and 50 screenshot artifacts in docs/screenshots/refinement.
- [x] 148 unit tests, 48 contrast pairs, strict typecheck, zero-warning lint, gateway integration and production build.
- [x] Corrected full browser suite: 63 passed/1 opt-in skip; separate performance probe passed; final focused UI/reflow/gallery suite: 6 passed.
- [x] Detector: zero primary findings; one intentional advisory for the previously requested export spring.
- [x] Performance, limitations and resources recorded in docs/design/SIGNATURE-REPORT.md. No production CCTV/audio/remote-alert claim added.

## Fluid glass follow-up — 17 November 2026

- [x] Removed stacked bottom positioning/padding; dock is 62px high and 8px above the usable safe-area edge.
- [x] Real translucent backdrop blur, full capsule curvature, specular border, moving selection lens and keyboard/zoom-aware visibility.
- [x] Curved panels/actions, floating desktop chrome, route reveal, select/sheet/press/review feedback, actual-data chart motion and reduced-motion alternatives.
- [x] Reduced repeated counts/prose; supporting capability/event explanations remain in accessible disclosures.
- [x] 148 unit tests; 48 contrast pairs; gateway integration; typecheck/lint/build; 65 browser passes and one opt-in skip; separate performance probe passed.
- [x] Viewport docking tests in both themes and at three heights; refreshed 52 screenshot artifacts. See docs/design/FLUID-REFINEMENT.md.
