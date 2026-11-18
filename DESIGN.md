# Tanda — Care, in focus

17 November 2026. The user's signature brief governs this system: architectural monochrome, selective glass and human-centred operational clarity. The supplied blue Tanda icon remains the original brand asset. This is an assistive-care workspace, with actual individual/source context and caregiver actions ahead of decorative metrics.

## Colour and material

Runtime source: `src/index.css`. Automated semantic contrast fixture: `src/ui/theme/tokens.json`.

| Role | Light | Dim |
| --- | --- | --- |
| Foundation | #F5F5F5 | #0A0A0A |
| Opaque reading surface | #FAFAFA | #171717 |
| Secondary surface | #EDEDED | #262626 |
| Primary text/action label | #171717 | #F5F5F5 |
| Secondary text | #666666 | #A3A3A3 |
| Filled action | #171717 | #EDEDED |
| Text on filled action | #FAFAFA | #171717 |
| Soft boundary | #DEDEDE | #333333 |
| Form boundary | #858585 | #777777 |
| Focus | #4D4D4D | #D4D4D4 |
| Status ok (text / pill) | #15803D / #DCFCE7 | #6EE7A0 / #0F2619 |
| Status warn (text / pill) | #A14A07 / #FEF3C7 | #FCC85A / #2B200B |
| Status bad (text / pill) | #B91C1C / #FEE2E2 | #FCA5A5 / #2C1313 |

The requested 60/30/10 balance is a compositional principle: neutral foundation, strong typographic/action contrast, silver/grey supporting detail. It is not a measured screen-area claim. Green means supported positive state, amber means review/experimental, red means destructive/high-priority. Colour never substitutes for text. No decorative teal, purple, neon, chart gradients or generated camera imagery.

Glass is limited to navigation, profile identity, contextual controls and occasional overlays. Light reading-overlay material: 94% #FAFAFA, fine white border, inset highlight, offset soft shadow. Dim material: 84% graphite, restrained white edge and deeper neutral shadow. The icon-only dock can use 82% material, with graphical contrast and no translucent body text. CSS blur is bounded to 16–20px; event records and forms stay opaque. Reduced-transparency preferences and unsupported filters use solid fallbacks. This is a web material treatment, not native Apple refraction.

## Typography

Bundled Inter 400/600/700 leads a system fallback stack; no remote fonts. Body 16px; working descriptions 14–15px, line-height 1.6–1.7; page title 32px desktop/28px mobile; section title 18–20px; metadata 12–13px. Small source/timestamp labels may use 11px, never essential explanatory prose. Individual identity can reach 40px on desktop/32px mobile, with no invented score beside it. Tabular numerals for time/counts. Readable measures around 60–75ch. No ornamental eyebrows or editorial display font in controls.

## Composition

Desktop: 248px solid rail, compact 72px translucent header and up to 1160px content. Main destinations: Overview, Live Monitoring, Individuals, Events & Alerts, Communication, Insights, Devices & Cameras, Settings. Movement/research/About are secondary; Communication retains its four route tabs. Collapsing the rail moves destination access into a horizontally scrollable header without document overflow.

Mobile/tablet: no squeezed sidebar or wrapping primary-navigation strip. A five-destination floating glass icon dock, 62px tall and positioned 8px above the safe area, serves Overview, Monitoring, Events, Communication and Insights. Accessible names remain. Header menu opens all destinations in a focus-trapped sheet; profile opens Individuals. 16px phone margins, 24px tablet insets, safe-area dock clearance and comfortable primary targets. All six widths—320, 375, 390, 768, 1024, 1440—are explicit QA targets. Header actions stack below copy on small screens.

Overview uses an individual/environment dossier, divided operating-status strip, caregiver review records, compact communication entry and honest capability states. No four-card metric grid. Monitoring separates the labelled simulation workbench from actual local browser input. Events use a margin-marked timeline, review priority, consistent metadata and preserved notes/history. Forms use grouped individual/environment, consent/privacy and observation preferences. Insights charts retain actual data, source labels, text alternatives and exports. Settings keeps language/appearance/privacy and destructive controls findable.

## Components and states

`PageHeader` and `StatusBadge` join the existing product wrappers. `Button`, Card, Controls, Dialog, Shell, HistoryLog, SummaryStat and chart wrappers extend one semantic token system. Adapted EasyUI source stays in `src/ui/vendor`; no screen imports a second component library.

Panels use 24–28px continuous corners, identity 30–32px, field controls 16–18px, capsule actions and a fully curved 999px dock. Sheets retain 28–32px corners. 4/8px spacing rhythm, 20–28px panel insets, larger separation between functional groups. Borders and separators define density; shadows indicate real layering. Primary buttons are solid monochrome. Secondary controls use neutral surfaces; destructive actions use semantic red and retain confirmation safeguards. Switch thumb/checkmark colours invert with the theme.

Source vocabulary always distinguishes browser-camera input, metadata simulation and unavailable integrations. Monitoring state does not prove a person is visible. Experimental baseline sample/coverage displays do not claim validated calibration. No fake sound results, camera video, remote alerts or confidence percentages.

## Motion and accessibility

Motion tokens (`src/ui/motion.ts`, mirrored as `--m-*`): 120ms press (scale 0.98), 150ms hover, 180ms micro state, 200ms tab/indicator, 240ms screen, 140ms exit, 260ms onboarding step, 280ms disclosure; ease-out `cubic-bezier(0.22,1,0.36,1)` to enter, ease-in to leave, no spring overshoot. Pages arrive with a 240ms fade and 8px lift (no blank cover; the skeleton only covers real code loading); deeper levels (People → profile) move laterally by direction; shared-layout indicators travel between rail, top-nav, dock-adjacent and segmented items; 420ms sliding glass dock lens. Introduction (root URL, once per session, ≈3.1s): the four symbol strokes draw on their own paths with shrinking 140/120/100ms gaps (0.40–0.44s each, ease-out), the symbol settles 0.96→1, the wordmark rises at 1.16s; at 2.6s Home mounts underneath, the identity clears first and the surface follows while navigation and content arrive. Reduced motion shows the finished identity at once. Motion answers an action or communicates actual state. No perpetual decorative status pulse, shader/WebGL context, background parallax or animated chart fabrication. Actual chart bars and arcs animate on reveal/range change; the dense heatmap remains static. A baseline progress indicator uses actual accepted sample count and remains labelled experimental. The existing user-requested CSS-checkbox export fan retains its spring/stagger; reduced motion removes its movement. Existing Motion/Radix sheets retain focus management, Escape, close and keyboard detent controls.

Visible 3px neutral focus ring; native labels, switches, radios and keyboard order; typed delete confirmations preserved. Icon-only navigation keeps accessible names. Important states carry text and icons. Scroll margin accounts for sticky header/dock. Contrast script checks 64 semantic pairings; axe tests cover EN/BM, light/dim, populated and unconfigured routes. Browser checks do not constitute formal WCAG certification or physical-device validation.

## Compatibility and standalone surfaces

Routes, gateway contracts, engines, camera lifecycle, IndexedDB and encrypted `.isyarat` handover are outside visual redesign ownership. Existing user data is not rewritten. The standalone `/#/splash` retains the user's separate midnight/blue gesture-mark direction and has no automatic launch redirect. Navigation uses the original PNG; no raster redraw.

See [direction and resources](docs/design/SIGNATURE-DIRECTION.md), [verification report](docs/design/SIGNATURE-REPORT.md) and [screenshot gallery](docs/screenshots/refinement/README.md).

## Fluid glass refinement

The user's follow-up rejects the previous flat/cornered material. Dock placement now has one owner rather than stacked bottom offsets and padding. Its 66% light / 68% dim neutral material blurs the real content behind it at 26px, with a bounded specular edge, 999px silhouette and a sliding selection lens. Text remains hidden accessibly; icons retain graphical contrast. Supported reduced-transparency/unsupported-filter paths use opaque material. Dock visibility adapts to keyboard-induced viewport reduction without treating pinch zoom as keyboard input.

Reading surfaces use calmer curves and fewer repeated notices. Overview uses the assigned environment as context, removes a repeated review counter and folds future-capability details into a disclosure. Existing event explanations remain available in an explicit disclosure. The standalone splash and all monitoring truths remain unchanged. See docs/design/FLUID-REFINEMENT.md for measured outcomes and viewport screenshots.
