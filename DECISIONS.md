# Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-17 | Pinned `@mediapipe/tasks-vision` to `~0.10.35` (latest 0.10.x) rather than 1.2.3 | Prompt pins 0.10.x; 1.x is a new major released within the last month; API verified in vision.d.ts |
| 2026-11-17 | TypeScript `~6.0.3` instead of 7.0.2 | `typescript-eslint@8.73` peer range is `<6.1.0` |
| 2026-11-17 | Scaffolded Vite react-ts by hand instead of `npm create vite` | Non-interactive, controlled file set in a folder that already had `.git` |
| 2026-11-17 | Tooling available: skills ui-ux-pro-max, design-taste-frontend, impeccable, emil-design-eng (+ animation skills), frontend-design, webapp-testing. MCP servers playwright + context7 registered but their tools were not exposed to this session; used `@playwright/test` scripts for screenshots and `.d.ts` files for API checks | Continue without blocking, per prompt |
| 2026-11-17 | Model validation looks for the zip signature `PK` in the first 16 bytes, not only bytes 0–1 | `pose_landmarker_lite.task` from Google starts with 2 null bytes before `PK`; the archive is otherwise valid (verified with `unzip -l`) |
| 2026-11-17 | Split `border` into `border` (#8C8172 light / #6B7A89 dim, ≥3:1 for control outlines) and `border-soft` (#E3DCCF / #34404C, decorative dividers only) | Spec value #E3DCCF is 1.3:1 on white — fails WCAG 1.4.11 for UI component boundaries |
| 2026-11-17 | Dim status colours: calm #8FD9B0/#16302A, rising #F2C46B/#33280F, high #F6A59B/#3A1D1A; added `primary-soft` tint | Spec said "adjust for ≥ 4.5:1"; all ≥ 7.8:1 per `npm run contrast` |
| 2026-11-17 | e2e runs against `vite build --mode e2e` (production build + CSP, output `dist-e2e`) served by `vite preview`; `pree2e` builds it. `window.__isyaratDebug` exists only when `DEV` or mode `e2e` | Prompt wants e2e on `vite preview` with CSP *and* a non-production test hook; a dedicated mode satisfies both while the real `dist` never contains the hook |
