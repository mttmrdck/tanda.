# Incremental implementation plan

1. Preserve src/engine and src/vision recognition/capture; retain repository structure and existing dirty changes.
2. Add shared Zod monitoring contracts, quality-aware baseline, temporal event evaluator, simulated camera gateway runtime.
3. Add a separately runnable authenticated loopback gateway, disk snapshot persistence, no video retention, no network egress.
4. IndexedDB v3 monitoring sidecar with tested v2 upgrade; existing profile schema and .isyarat format remain valid.
5. Add Overview, Monitoring, Events, Devices, profile care configuration; retain Communication/Home, Live, Teach, Signals, Insights and research routes.
6. Repeatable clearly labelled in-browser simulation uses the same pure gateway core. Manual demo actions establish reviewed baseline and inject temporal unusual movement; review lifecycle persists.
7. Test pure rules, invalid payloads, quality/disconnect gaps, deduplication, migration, HTTP security, UI workflow, axe and regressions. Document capabilities and real-camera/audio limitations.
