# Isyarat — project conventions

On-device communication aid: caregivers teach a camera a non-verbal child's personal gestures; app recognises them live. No backend.

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
- Privacy is a hard requirement: zero runtime network requests besides own static assets. No faces, no audio, no frame storage, no analytics, no CDNs.
- Caregiver supplies all meanings. Never show accuracy % for real children; synthetic numbers labelled "synthetic benchmark".
- WCAG 2.2 AA: 48px targets, focus rings, icon + text + colour for status, reduced motion respected.
- Design tokens live in `DESIGN.md` and `src/index.css` `@theme`; keep them in sync (contrast script checks `src/ui/theme/tokens.json`).
- All user-visible strings go through `src/i18n` (EN + BM).
- Commit after each phase (conventional commits).
