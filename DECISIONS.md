# Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-17 | Pinned `@mediapipe/tasks-vision` to `~0.10.35` (latest 0.10.x) rather than 1.2.3 | Prompt pins 0.10.x; 1.x is a new major released within the last month; API verified in vision.d.ts |
| 2026-11-17 | TypeScript `~6.0.3` instead of 7.0.2 | `typescript-eslint@8.73` peer range is `<6.1.0` |
| 2026-11-17 | Scaffolded Vite react-ts by hand instead of `npm create vite` | Non-interactive, controlled file set in a folder that already had `.git` |
| 2026-11-17 | Tooling available: skills ui-ux-pro-max, design-taste-frontend, impeccable, emil-design-eng (+ animation skills), frontend-design, webapp-testing. MCP servers playwright + context7 registered but their tools were not exposed to this session; used `@playwright/test` scripts for screenshots and `.d.ts` files for API checks | Continue without blocking, per prompt |
