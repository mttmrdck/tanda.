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
