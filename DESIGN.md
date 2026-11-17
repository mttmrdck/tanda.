---
version: alpha
name: Isyarat
description: Calm clinic-meets-craft. A quiet, warm, spacious interface for stressed caregivers.
colors:
  bg: "#FAF7F2"
  surface: "#FFFFFF"
  surface-2: "#F3EEE6"
  border: "#8C8172"
  border-soft: "#E3DCCF"
  ink: "#1B2430"
  ink-muted: "#4A5565"
  primary: "#0B6E6E"
  primary-hover: "#095858"
  on-primary: "#FFFFFF"
  primary-soft: "#E1F0EF"
  calm-fg: "#1E6B4A"
  calm-bg: "#E7F4EC"
  rising-fg: "#8A5A00"
  rising-bg: "#FFF4DB"
  high-fg: "#A4261A"
  high-bg: "#FDECEA"
  focus: "#0B6E6E"
  dim-bg: "#14181D"
  dim-surface: "#1C2229"
  dim-surface-2: "#242C35"
  dim-border: "#6B7A89"
  dim-border-soft: "#34404C"
  dim-ink: "#EEF2F6"
  dim-ink-muted: "#B6C0CC"
  dim-primary: "#4DB6B0"
  dim-primary-hover: "#6CCBC5"
  dim-on-primary: "#0B1114"
  dim-primary-soft: "#1D3534"
  dim-calm-fg: "#8FD9B0"
  dim-calm-bg: "#16302A"
  dim-rising-fg: "#F2C46B"
  dim-rising-bg: "#33280F"
  dim-high-fg: "#F6A59B"
  dim-high-bg: "#3A1D1A"
typography:
  display:
    fontFamily: Fraunces Variable
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Atkinson Hyperlegible
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  scale: [14px, 16px, 18px, 22px, 28px, 36px, 48px]
rounded:
  control: 12px
  card: 20px
  sheet: 28px
spacing:
  base: 4px
  touch-target: 48px
  min-gap: 8px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: 48px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  privacy-chip:
    backgroundColor: "{colors.calm-bg}"
    textColor: "{colors.calm-fg}"
---

# Isyarat design system

## Overview
"Calm clinic-meets-craft." The people using Isyarat are stressed caregivers, often with a child who is already overwhelmed. The interface is quiet, warm and spacious: paper-tone background, one confident teal accent, large type, large targets, no debug-looking panels. Nothing flashes. Nothing makes a sound unless the caregiver turns speech on.

## Colors
Tokens above (light) with `dim-*` for the Dim theme; the runtime source of truth is `src/index.css` and `src/ui/theme/tokens.json`. `npm run contrast` fails the check if any text pairing is below 4.5:1 or any UI boundary below 3:1. Body text is ≥ 13:1.
- `border` (≥ 3:1) outlines controls; `border-soft` is for decorative dividers only.
- Status (Calm / Rising / High, urgency, coach advice) always uses **icon + word + colour**, never colour alone.

## Typography
Fraunces (600) for headings; Atkinson Hyperlegible for everything else, chosen for legibility. Base 18 px / 1.6. Scale 14 · 16 · 18 · 22 · 28 · 36 · 48. Nothing below 14 px. Numbers use tabular figures.

## Layout
Desktop ≥ 1024 px: 264 px left rail (logo, nav, profile switcher), content max 1200 px. Tablet/phone: top bar + 5-item bottom tab bar (Live, Teach, Signals, Timeline, More). Grids are explicit `minmax(0,1fr)` columns so nothing overflows at 320 px. 4-pt spacing grid.

## Elevation & depth
One soft shadow (`--shadow`). Cards: surface + 1 px `border-soft` + shadow. No other elevation levels.

## Shapes
Radius 12 (controls), 20 (cards), 28 (sheets / dialogs).

## Components
Button (primary / secondary / quiet / destructive; loading; disabled), IconButton (48×48, labelled), Card, Dialog / Sheet (Radix: focus trapped and returned, Escape closes), Stepper, Tabs, Switch, Slider, Select, Chip, SegmentedControl, Toast (Sonner, token-styled), CameraStage + OverlayCanvas, Countdown, RecordRing, ConfidenceBar (bars + words, never percentages), CalmMeter, SignalCard, SignalGlyph, EventList, CoachCard, EmptyState, ConfirmDelete, PassphraseField.

## Motion
`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`; 120 / 200 / 320 ms. Only opacity, translate ≤ 8 px and scale ≥ 0.97. Press = scale 0.98 for 120 ms. `prefers-reduced-motion`: transforms off, instant fades, glyphs static, record ring static. The camera stage never animates its layout.

## Do's and Don'ts
- Do say what the app is not (no diagnosis, no faces, no uploads) wherever it matters.
- Do keep the caregiver in control: Yes / Not quite / New meaning on every recognition.
- Don't use parallax, marquee, neon, 3D, dramatic scroll effects, infinite animations or flashing.
- Don't show accuracy percentages for real children.
- Don't use the word "fail" in coaching.
