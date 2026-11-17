# Tanda UI makeover

17 November 2026. Local preview: http://127.0.0.1:5173/.

## Changed screens

Home is now a real destination rather than a redirect to Live. It shows local signal and confirmation counts, a Live entry point, the signal library, and recent events. Live has quieter interpretation/feedback surfaces, a thinner pose overlay, and a read-only movement-energy trace. Teach, Signals, onboarding, About, and Handover inherit the revised typography, flat surfaces, buttons, navigation, and sheets. Settings uses inset groups, quiet switches, segmented controls, and separators. Insights adds Day/7-day/31-day summaries, frequency/distribution charts, and an hour/weekday heatmap. Its original daily charts, history, and exports remain available.

## EasyUI review and adaptation

The full 134-component index is preserved in [EASYUI-CATALOG.md](EASYUI-CATALOG.md). Components were installed using `npx shadcn@latest add Surajmaurya1/easyui/<name> --yes`, then relocated under `src/ui/vendor` and adapted behind our own wrappers. Existing Motion and Radix packages were reused. Unused registry infrastructure and duplicate packages were removed.

| Registry part | Product wrapper | Adaptation |
| --- | --- | --- |
| Stat Card | SummaryStat | Flat surface, no invented delta or decorative sparkline, spring digit changes, real local counts |
| Live Line Chart | MotionTrace | Actual Calm Watch energy, green semantic line, no pulse or fill, repaint only on new readings/inspection |
| Activity Heatmap | InsightsVisuals | Hour/weekday grid, selected-period events, blue scale, localized labels and summary, keyboard inspection |
| Bar Chart | InsightsVisuals | Signal counts, quiet axes, no entrance animation, one blue series |
| Donut Chart | InsightsVisuals | Blue/neutral categories, visible counts and labels, valid SVG semantics |
| Data Table | HistoryLog | Removed bulk-selection/search machinery; grouped phone rows with native table semantics |
| Pill Navigation | Shell | Four controlled native links, system-blue active icon/label, no pill glow |
| Sheet | Dialog | Retained drag/spring behavior; composed with existing Radix focus management and accessible detents |
| Undo Toast | FeedbackToasts | Retained existing Sonner lifecycle and announcements; material styling, no invented undo behavior |
| PressButton | Button | Native button semantics and existing handlers, quiet shared press feedback, no squash/bounce layers |

Original registry screenshots and restyled screen captures are in [the comparison gallery](screenshots/README.md).

## Boundaries

No edits to `src/engine`, `src/vision`, `src/store`, data models, crypto, or handover logic. UI-adjacent edits: `src/App.tsx` adds Home/styleguide routing and the toast wrapper; `src/i18n/en.ts` and `ms.ts` add interface copy; package files replace the bundled font and include the selected registry components. `OverlayCanvas.tsx` changes stroke presentation only. Existing persisted settings and consent behavior are preserved.

## Verification

Final results and frame measurements are recorded below after the final runs. Automated browser checks enforce zero off-device requests and no unexpected console errors, test EN/BM with both themes, and exercise consent, recognition, correction, teaching, handover, camera teardown, keyboard use, and 320px reflow. New tests cover Home, styleguide, period selection, sheet expansion, and their accessibility.

## Practical limits

This remains a web app. It uses Lucide rather than SF Symbols and browser materials rather than private Apple rendering APIs. Swipe-back remains the browser/platform gesture; there is no custom gesture that can accidentally leave the caregiver’s current task. The existing large recognition feedback panel is preserved rather than automatically presenting a focus-trapping sheet on every recognition. Relabeling uses a sheet. Confidence keeps its existing verbal levels; algorithmic confidence is not presented as medical accuracy. Existing haptic settings and theme defaults are preserved. The desktop title collapses; phone chrome keeps the app identity visible. These preserve product behavior and control.

Playwright MCP and Context7 were unavailable; verification used the installed Playwright test runner, local package types/source, and the published EasyUI component pages. Design guidance used the Sites, UI/UX Pro Max, design-taste-frontend, Emil design engineering, frontend-design, webapp-testing, and Impeccable skills. The explicit app brief took precedence over landing-page conventions in those skills.

## Follow-up refinements

The user’s [Kinetics](https://kinetics.colorion.co/), [Toggle Library](https://toggles.colorion.co/), and [Loader Library](https://cssloaders.colorion.co/) references informed a custom switch latch, three-stroke loading indicator, and the requested checkbox-driven export fan. Timeline now has a compact date header and one export entry point with CSV/JSON/Print. The bottom bar floats, uses glass material and icon-only tabs, and gives Teach a Hand icon. Daily chart titles, caption slots, margins, and axis widths now align; the browser test checks plot tops within one pixel.

The unsuppressed Impeccable scan has zero primary findings and one advisory for the exact spring curve explicitly requested for the export fan. That curve is intentional and remains confined to this control.

## Final measured results

Typecheck and production build pass. All 77 unit tests and all 48 semantic contrast pairs pass. Browser checks cover EN/BM in both themes, WCAG A/AA rules (zero serious/critical violations), keyboard use, 320px reflow, local-only requests, real export downloads, period selection, and sheet behavior. The complete final browser count is recorded in PROGRESS.md.

| Probe | Before | After |
| --- | --- | --- |
| Demo mean frame interval | 16.68ms | 16.65ms |
| Demo p95 interval | 16.8ms | 16.8ms |
| Demo tasks over 50ms | 0 | 0 |
| Fake-camera mean frame interval | 245.64ms | 245.14ms |
| Fake-camera p95 interval | 283.4ms | 266.7ms |
| Detection rate | 4fps | 4fps |
| Inference time | 263.8ms | 255.1ms |

These are individual eight-second probes using Chromium's fake camera and the real MediaPipe path, with one Playwright worker. They show no material UI regression; small timing differences are not evidence of an engine improvement. The engine and camera pipeline were unchanged. Camera inference remains the bottleneck in this environment; a physical-device check is still needed for device-specific performance.

The final detector output is retained in [ui-detector-results.json](ui-detector-results.json); the technical findings and fixes are in [UI-AUDIT.md](UI-AUDIT.md).


## Final identity, navigation, and placement

The visible application is now **Tanda**, using the supplied blue gesture icon and `tanda.` wordmark. Browser title/favicon, English brand copy, and Malay brand references have been updated; ordinary Malay “isyarat” (signal) labels remain. Existing storage keys and handover file format remain compatible.

Language and appearance controls have moved out of the header into Settings. The header is limited to identity and profile access. Appearance has a dedicated sun/moon/device selector. Export is anchored beside the Insights date selector; the checkbox-controlled actions open below the header. The bottom dock remains floating, glass, and icon-only.

Route transitions use a short skeleton shimmer rather than page slides. It reuses the supplied three-line pattern, scaled into a page layout; reduced motion shows static placeholders. New screens mount immediately behind this presentation, so data and camera lifecycle behavior remain unchanged. The attachment describing a premium splash screen was treated as design context; no unrequested splash delay was added.

The final Profile pass reduces oversized spacing and removes stretched desktop rows. Groups have explicit content wrappers and consistent 16px spacing. “Hand over to another carer” is a full-width button with its own tinted surface and tested navigation; its label cannot sit outside the control. All settings and destructive confirmation safeguards remain available.

The requested splash preview is now available at `/#/splash`, with a checked 1179×2556 capture in the screenshot gallery. Its four-stroke composition, absence of app chrome, accessibility, and reduced-motion behavior pass the dedicated browser check. The compact Profile follow-up passes 12 browser checks, including the visible handover button and its navigation.
