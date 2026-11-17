# Tanda — fluid glass and interaction refinement

17 November 2026. Follow-up to the user's criticism that the previous interface still felt generic, with a dock too high and insufficient glass/curvature.

## Implemented

- Replaced compound dock spacing with one positioning rule: bottom = safe-area inset + 8px, height 62px, width at most 350px. Fully curved silhouette, 66% light / 68% dim material, real 26px backdrop blur, neutral edge reflection, inset highlight and offset depth.
- Added a moving glass selection lens; native links and accessible names still own navigation. A 420ms CSS transform tracks the active destination. Icons compress on press; no continuously running decorative animation.
- Dock accounts for a keyboard-reduced visual viewport; pinch zoom is excluded from keyboard detection. Opaque fallbacks remain for reduced transparency and unsupported backdrop filters.
- Curved 24–32px reading panels and continuous corners where supported, capsule actions, softer field controls, rounded profile identity and a floating desktop toolbar/rail.
- Kept the requested skeleton route state, then added a short content reveal. Select menus, sheet dismissal, switches, acknowledgement state and contextual links get consistent feedback. Existing Motion-backed chart bars/arcs animate supported real-data changes; the dense heatmap stays static.
- Reduced repetitive prose: Overview leads with the actual assigned environment and no repeated large review metric. Capability details and supporting event explanation use accessible disclosures. No camera footage, person-state inference or new monitoring capability was invented.

## Sources and interpretation

The supplied references informed curved compositions, layered contextual controls and tactile navigation. Their CCTV imagery, emotion faces and toy imagery were not copied into monitoring data. The prior monochrome direction and supplied Tanda mark remain.

Used the existing local design guidance and product wrappers, Radix semantics, Motion and browser CSS. Revisited [Colorion Kinetics](https://kinetics.colorion.co/), [Toggle Library](https://toggles.colorion.co/), [Loader Library](https://cssloaders.colorion.co/) and [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials). Applied interaction principles within Tanda's own components; no external runtime scripts, model assets or new dependencies.

This is a CSS web interpretation of liquid glass, not Apple's native optical renderer.

## Verification

Passed: strict typecheck, zero-warning lint, 148 unit tests across 20 files, 48 semantic contrast pairings, production build and gateway integration (one passed). Full browser suite: 65 passed, one opt-in performance probe skipped; the performance probe subsequently passed separately. The final focused dock verification passed both tests against the final code. No accessibility rule or workflow test was removed.

The contrast harness now waits for the route's loading state and finite animations to complete before scanning the resting UI. Contrast assertions are unchanged; infinite loaders are excluded from waiting. This fixes scans that previously began during a content fade or before a modal's background isolation settled. No accessibility rule was disabled.

The new dock checks verify actual viewport placement at three heights (667, 844, 900), 62px height, 999px curve, translucent computed material, 26px blur, route-following lens state and reduced motion in light/dim. Existing responsive checks cover all eight destinations at 320/375/390/768/1024/1440.

## Visual evidence

Viewport screenshots show the actual screen edge rather than positioning a fixed dock within a long full-page image:

- [Light viewport](../screenshots/refinement/dock-viewport-light-390.png)
- [Dim viewport](../screenshots/refinement/dock-viewport-dim-390.png)
- [Full desktop/mobile gallery](../screenshots/refinement/README.md)

Measured Chromium headless demo: 481 animation frames over eight seconds, mean 16.65ms/p95 16.8ms; zero >50ms frames or long tasks. Fake webcam/MediaPipe: mean animation frame interval 239.9ms/p95 266.6ms, sampled 5 detections/s at an 8 fps target, inference 249.3ms. Previous checkpoint sampled 4 detections/s; this variation is not a real-world accuracy or hardware-throughput guarantee. Main-thread inference remains the limiting factor.

No new runtime dependency or model asset. Main entry approximately 636.61kB (204.21kB gzip), versus 636.20kB (204.05kB gzip) before this follow-up; CSS approximately 114.87kB (21.79kB gzip), versus 108.73kB (20.62kB gzip).

## Unverified and unchanged boundaries

Physical iPhone/Safari rendering, virtual-keyboard behaviour and touch feel still require real-device evaluation. Browser verification uses Chromium and emulated sizes. Reduced motion preserves states without the moving lens. Existing camera/gesture/consent/storage/handover/gateway behaviour stays intact; no real CCTV, audio classifier, remote alerts or validated safety detector was added.
