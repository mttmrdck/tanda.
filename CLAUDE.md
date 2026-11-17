# Tanda — project conventions

Privacy-first hybrid assistive monitoring foundation for children and older adults; personalised communication remains operational. Optional simulated edge gateway: see docs/architecture/HYBRID.md and docs/deployment/EDGE-GATEWAY.md.

## Re-read first after context compaction
`CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`, and `.claude/skills/mediapipe-tasks-vision/SKILL.md`.

## Commands
- `npm run setup` — copy MediaPipe WASM + download the 2 model files into `public/` (once, needs internet)
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run dev:https` — LAN https dev server (self-signed) so phones can use the camera
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`, `npm run contrast`
- `npm run check` = typecheck + lint + contrast + test + build

## Layout
- `src/engine/` — PURE TypeScript (no React, no DOM). Fully unit-tested. Time is injected, never `Date.now()` inside.
- `src/vision/` — browser-only camera / MediaPipe / demo sources.
- `src/store/` — IndexedDB (`idb`) repo + Zustand stores. Settings in localStorage only; signal data in IndexedDB only.
- `src/ui/` — components, pages, hooks, theme. `src/i18n/` — EN + BM strings.
- `tests/unit/` (Vitest), `e2e/` (Playwright, Chromium).

## Rules
- TypeScript strict, no `any`; `unknown` + zod at boundaries. No unused code. No TODO / lorem in shipped UI.
- Privacy: own static assets and explicitly requested authenticated local gateway health only. No cloud relay, faces, audio capture, frame storage, analytics or CDNs. Keep simulated and actual observations separate.
- src/platform contains pure shared validated contracts, baseline and event rules; apps/edge-gateway hosts the optional loopback simulation service. Run npm run gateway:test for its HTTP/persistence checks.
- Caregiver supplies all meanings. Never show accuracy % for real children; synthetic numbers labelled "synthetic benchmark".
- WCAG 2.2 AA: 48px targets, focus rings, icon + text + colour for status, reduced motion respected.
- Design tokens live in `DESIGN.md` and `src/index.css` `@theme`; keep them in sync (contrast script checks `src/ui/theme/tokens.json`).
- All user-visible strings go through `src/i18n` (EN + BM).
- Commit after each phase (conventional commits).
