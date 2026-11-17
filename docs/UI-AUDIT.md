# Tanda UI audit — 17 November 2026

The implementation keeps one product-specific system: pose and meaning on Live, caregiver-owned local events on Insights, and native form controls. No analytics, decorative data, remote fonts, or face imagery was added.

| Dimension | Score | Evidence |
| --- | --- | --- |
| Accessibility | 4/4 | Automated WCAG A/AA scans across EN/BM and both themes; keyboard and reflow checks; semantic switches, radios, links and sheets |
| Performance | 3/4 | Motion is bounded; trace repaints on new readings. Existing MediaPipe inference remains slow in the software-camera test environment |
| Theming | 4/4 | Semantic tokens, opaque material fallback, 48 checked contrast pairs |
| Responsive layout | 4/4 | Phone and desktop screenshot review, 320px overflow checks, 44–48px controls, aligned daily chart plots |
| Implementation integrity | 4/4 | UI wrappers, real local events, unchanged engine/vision/storage/crypto; unsuppressed detector scan |
| Total | 19/20 | Core quality checks pass; physical-device camera performance remains a validation limit |

## Findings addressed

- P1: SVG donut paths had labels without valid semantic roles. Added image roles.
- P1: Rolling digits had labels on generic spans. A visually hidden text equivalent now carries the number, with animated digits hidden from assistive technology.
- P1: A transient inline title and translucent privacy footer could fall below contrast during animation/compositing. Removed the title fade and increased the light material opacity.
- P1: Intrinsic chart widths overflowed at 320px. Grid children now shrink and charts fit their parent surface.
- P2: Daily chart headers and plot bounds were inconsistent. Shared title/caption slots, margins and axis widths align them; an automated geometry assertion checks their plot tops.
- P2: Heatmap pointer coordinates subtracted an offset twice. Corrected local pointer coordinates. Summary text now describes the selected period and is localized.
- P2: The Timeline header exposed separate exports. One checkbox-controlled fan now exposes CSV, JSON and Print, with hidden items excluded from keyboard navigation until opened.

## Remaining advisory

The detector reports one `bounce-easing` advisory for the exact spring curve the user explicitly requested for the export fan. It has not been suppressed. The occasional fan interaction uses this curve; navigation and continuous camera presentation do not. Reduced-motion mode replaces movement with opacity changes.

No unresolved primary detector findings. No claim of physical-device, VoiceOver, or universal GPU performance certification is made from Chromium automation. Detailed measured results appear in [UI-MAKEOVER-REPORT.md](UI-MAKEOVER-REPORT.md).


## Identity and header follow-up

The visible identity uses the supplied asset; no generated approximation replaces it. Preference persistence now runs through Settings instead of header shortcuts. Export is associated with the selected date rather than an arbitrary viewport corner. The route loading presentation has an accessible busy state, a translated loading status, cancellation on rapid navigation, and a static reduced-motion variant. Existing data schemas and handover payload identifiers remain unchanged.
