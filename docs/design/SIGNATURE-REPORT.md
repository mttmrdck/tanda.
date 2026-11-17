# Tanda signature interface — implementation and verification

17 November 2026. This is a visual refinement of the working hybrid foundation. **Implemented** describes shipped presentation code; **Tested** describes checks actually run; **Simulated** describes generated demo observations; **Unverified** describes real-world or physical-device behaviour not evaluated here.

## Direction and resources

**Implemented:** “Care, in focus”: architectural monochrome, restrained editorial identity and selective glass controls. The three explored directions and rationale are in [SIGNATURE-DIRECTION.md](SIGNATURE-DIRECTION.md). The latest monochrome brief supersedes the earlier teal exploration. Neutral colours carry the product; green/amber/red carry actual status/review/destructive meaning. The original blue icon and separately requested splash remain intact.

**Used:** Sites local workflow, local Frontend Design, Design System/token architecture, UI/UX Pro Max accessibility/responsive search, and Impeccable context/Operate/craft/polish guidance plus its detector. Design Taste was inspected but its landing-page workflow was unsuitable for this operational app. Apple's materials guidance and Linear's interface-refinement article informed bounded material and predictable control placement; links/analysis are in the direction document. Existing Radix, Motion, Lucide, Sonner, Recharts and adapted EasyUI/shadcn wrappers were reused. No new package or runtime network dependency.

**Unavailable:** no 21st.dev, Playwright, Figma, Blender or Superdesign MCP exposed in the current tool inventory. Installed Playwright/Chromium supplied actual browser verification. No unavailable tool or native liquid-refraction renderer is claimed.

## Design system

**Implemented:** existing CSS tokens and contrast fixture updated together; #F5F5F5/#FAFAFA light surfaces and #0A0A0A/#171717/#262626 dim layers. Monochrome buttons and selection, tuned Inter hierarchy, 16px base, 28–32px page titles, 18–20px section headings, readable metadata. Shared `PageHeader` and `StatusBadge`, 12px controls, 16px panels, 20px identity dossier, fine neutral boundaries and offset shadows. `DESIGN.md` records the current system.

Glass belongs to the icon dock, header, profile identity and occasional overlays. Reading/form/event surfaces remain solid. Reading overlays use higher-opacity light material for text contrast; the icon-only dock can remain more translucent. Blur is bounded; no shader, 3D rendering, WebGL scene or fake live background.

## Pages and components

**Implemented:**

- Shell: ordered primary rail, secondary research/movement, clearer current destination, compact header, accessible full mobile menu and five-icon floating dock. Communication tabs remain available.
- Overview: individual/environment identity, explicit input-mode label, divided camera/processing/baseline/review strip, real recent events, source-specific observation time, compact communication and capability availability.
- Monitoring: labelled metadata-simulation topology and controls, independent browser-input section, visible assigned individual, smaller preview, baseline/quality evidence and actual accepted-sample progress only while collecting.
- Events: review candidates first, neutral information records, timeline markers, aligned source/time/quality data, persistent acknowledgement/dismissal/context/history. No detector or storage rule changed.
- Individuals: selected-profile treatment, quieter editable identity, consistent library/handover actions, visible destructive action, grouped monitoring configuration.
- Devices: source identity, real stored source/time metadata, explicit simulation clock, gateway authentication/check controls and unavailable IP/audio treatments. No implied camera connectivity beyond stored source state.
- Communication/Live/Teach/Signals: shared hierarchy, monochrome actions, compact workflow rail and preserved recognition/confirmation behaviour.
- Insights: neutral charts with actual underlying data/source labels, consistent date/export controls, aligned daily chart frames, extra top room for wrapped level labels, independent short panels instead of stretching to the history table.
- Settings: grouped privacy/language/appearance/recognition/camera/data controls, theme-correct switches, preserved handover and typed delete-all safeguards.

## Responsive, accessibility and motion

**Implemented:** intentional 320/375/390/768/1024/1440 layouts. Mobile has one primary dock plus a full menu; no wrapping second primary navigation strip. Header actions stack beneath copy. Forms use container-sized auto-fitting groups; events reflow into readable two-column metadata. Focus scroll margin accommodates fixed chrome.

**Implemented:** native/Radix labels and keyboard controls, visible focus, accessible icon names, text-plus-icon status, semantic fieldsets and event metadata. Existing table alternatives, translations, consent and modal focus management preserved. Reduced-motion and reduced-transparency fallbacks remain.

**Implemented:** short colour/opacity/press feedback, existing skeleton route transition, occasional modal/sheet motion and real state feedback. No continuous decorative status pulse. The previously requested CSS-checkbox export fan retains its spring/stagger; movement is removed under reduced motion.

## Verification and iteration

**Tested baseline:** strict types, zero-warning lint, production build, 148 unit tests, all 48 contrast pairs, one gateway integration test. Browser baseline: 58 passed, four opt-in checks skipped.

The first refinement review passed the monitoring workflow and all four EN/BM/light/dim monitoring axe cases. The light-theme screenshot test initially changed localStorage beneath the active settings store; it was corrected to use the actual appearance radio. A later full run caught invalid Devices definition-list markup introduced with its simulation-clock note; the note was moved inside its value. Neither test was suppressed. Screenshot review also corrected a compressed mobile header, short Insights panels stretching to long neighbours, chart-label clipping and dim switch contrast.

**Tested:** final strict typecheck, zero-warning lint, 148 unit tests across 20 files, 48/48 contrast pairs, production build and gateway HTTP integration (one passed). Corrected full browser release run: 63 passed, one opt-in performance test skipped; that probe is run separately. Full suite includes EN/BM, light/dim axe, camera lifecycle/denial/unavailable/model failure, recognition/teaching, handover/export/import/delete-all, profiles, baseline/event workflow, keyboard/reduced motion, populated 96 route/viewport/theme combinations and fresh-profile unconfigured states. The final focused header/chart/responsive/screenshot suite passed all six tests after the last mobile-tab refinement. The separate performance probe passed. No browser test remains failing.

**Tested design detector:** unsuppressed/no-project-config scan of the main redesigned UI/CSS returned zero primary findings and one advisory for the exact spring curve previously requested for the export fan. It is retained intentionally; a detector result is not a claim of whole-product design quality.

**Tested performance impact:** no new runtime dependencies or model assets. Production main entry 636.20 kB / 204.05 kB gzip, versus 635.75 / 203.96 kB before this visual phase (about +0.45 kB raw / +0.09 kB gzip). CSS 108.73 / 20.62 kB gzip, versus 88.63 / 17.30 kB (+3.32 kB gzip). Lazy platform route 21.04 / 5.25 kB gzip. MediaPipe/model directories remain approximately 46 MB.

**Tested isolated headless probe:** demo eight-second window: 481 animation frames, mean 16.64 ms, p95 16.8 ms, zero >50 ms frames or long tasks. Fake webcam/MediaPipe: mean 256.42 ms, p95 283.3 ms, 4 detections/s at an 8 fps target, sampled inference 273.1 ms. Earlier same-environment reference was mean 247.85 ms, p95 299.9 ms and 4 detections/s. Detection throughput remains unchanged; the mean varied by about 3.5%, so this is not a claim of performance equivalence across hardware. Main-thread inference remains the dominant limitation. No new continuous animation or WebGL context was introduced.

## Rendered screenshots

**Tested:** actual running Chromium application, seeded and unconfigured states; desktop/mobile; both themes. [Screenshot gallery](../screenshots/refinement/README.md). Seeded gestures and simulated monitoring events are explicitly labelled in the UI. Screenshots are evidence of presentation, not real-person/CCTV performance.

**Inspected:** Overview, Monitoring, Events, Individuals, Devices, Communication, Insights and Settings in light/dim at 390/1440; four unconfigured monitoring destinations in both themes/sizes; mobile menu in both themes. Fifty PNGs total. Detailed visual review covered hierarchy, full-page composition, readable metadata/forms, fixed-dock clearance and empty/source states; browser assertions cover document overflow at all six requested widths. Screenshots show the fixed dock at the viewport bottom even within long full-page images.

## Preserved boundaries and limits

**Implemented / Tested:** original routes, monitoring contracts/engine, storage migration, camera lifecycle, gesture teaching/recognition, consent, event review persistence, encrypted handover and delete-all remain. This visual pass modifies UI presentation/semantics and adds responsive tests; it does not rewrite perception, gateway APIs or baseline/event policies. Earlier authorised foundation changes were already uncommitted and are included when publishing the completed app.

**Unverified:** physical iPhone/Android/touch/VoiceOver behaviour, browser engines beyond Chromium, formal WCAG certification, real CCTV, real-person detection accuracy and long-running edge operation. Native Apple Liquid Glass is not implemented. No audio classifier, remote notification relay, identity verification or validated safety detector was added. Browser MediaPipe remains constrained by main-thread inference. The optional gateway UI continues to check health only. No production deployment is claimed by a Git push.
