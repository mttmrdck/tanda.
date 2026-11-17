# Tanda interface system

Updated 17 November 2026. This is a local, on-device communication aid for caregivers. The interface should feel familiar, calm, and direct. The pose view and the caregiver’s interpretation take priority over metrics.

## Typography

Use `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, Inter, sans-serif`. Inter 400/600/700 is bundled with Fontsource; no font CDN or SF download. Body is 17px, headline 17px semibold, title 22px, large title 34/41px bold, footnote 13px, caption 12px. Tab labels alone are 11px. Use tabular figures and the `NumberRoll` component for changing summary values. Keep explanatory prose left aligned.

## Palette and surfaces

Runtime truth: `src/index.css`; checked contrast pairs: `src/ui/theme/tokens.json`.

| Role | Light | Dark |
| --- | --- | --- |
| Grouped background | #F2F2F7 | #000000 |
| Surface | #FFFFFF | #1C1C1E |
| Secondary surface | #F2F2F7 | #2C2C2E |
| Primary label | #1C1C1E | #FFFFFF |
| Secondary label | #636366 | #AEAEB2 |
| Action label | #0062CC | #69B4FF |
| Filled action | #0069DD | #0069DD |

Blue is reserved for actions and selection. Small blue text and white-on-blue controls use contrast-adjusted shades of system blue to meet AA. Calm/rising/high use green/orange/red with an icon and a word; light-theme status text uses darker shades. Gesture categories use blue and neutral grays, not diagnostic status colors.

Cards are flat opaque surfaces. No gradients, colored shadows, drifting backgrounds, or pulsing chart markers. Apply translucent material only to navigation bars, dialogs/sheets, popovers, and feedback. The light material is 94% white to preserve contrast over a scrim. Blur is 24px with saturation; reduced transparency and unsupported backdrop filters use opaque fallback surfaces.

## Structure

Desktop has a 232px rail, a quiet top bar, and a maximum 1160px content area. Phone/tablet has four tabs: Home, Teach, Live, Insights. Profile remains accessible from the avatar; the Home library links to Signals. Keep 16px mobile margins and 48px primary actions. Bottom navigation includes safe-area padding and 49px tab targets. Preserve every existing route and workflow.

Large titles remain 34px; the desktop bar shows a 17px title after the large title scrolls away. Home combines one primary Live entry with compact summaries and grouped library/recent-event lists. Live uses an asymmetric pose/interpretation layout; cards never animate the camera geometry. Settings uses inset groups and separators; History becomes a compact grouped list on phones while retaining table semantics. Insights adds independently selected Day/7-day/31-day charts while retaining the existing daily timeline and export scope.

## Components

Product-facing wrappers live in `src/ui/components`. Installed and adapted EasyUI source lives in `src/ui/vendor`; screens never import it directly. `SummaryStat`, `MotionTrace`, `InsightsVisuals`, `HistoryLog`, `Button`, `Dialog`, `FeedbackToasts`, and `Shell` own the product contract.

Radii: cards 20px, groups 16px, controls 14px or capsules, sheets 28–32px. Use continuous corners where supported. Switches and segmented controls retain native/Radix semantics. Sheets compose EasyUI-style drag springs with Radix focus trapping, Escape dismissal, explicit close buttons, and a keyboard-operable expand/collapse grabber. Delete confirmations retain their typed confirmation safeguard.

## Motion and accessibility

Press feedback is scale .97 and subtle dimming. Sheet and digit transitions use stiffness 360 and damping 32–34. Page changes show a 260ms content-shaped skeleton shimmer; lazy loading uses the same skeleton. The route updates immediately and the new screen mounts behind the loading presentation, preserving effects and camera teardown. There are no page slides. Reduced motion removes translations and digit rolling, retaining fades. No decorative infinite animation is added.

The movement trace subscribes read-only to the existing Calm Watch output. It draws when a new reading or inspection arrives instead of continuously repainting alongside inference. It stores no history outside the mounted UI. Camera data, consent, capture, recognition, haptics, speech, crypto, storage schemas, and handover behavior remain owned by their existing modules.

Run `npm run typecheck`, `npm test`, `npm run contrast`, `npm run build`, and `npm run e2e` for release checks. The unlisted `/#/styleguide` route provides visual inspection of typography, semantic states, controls, sheets, and number cards. Screenshots and the audit are under `docs/`.

## Colorion refinement

The bottom navigation now floats in a blurred glass capsule and uses icons only, with accessible names retained. Teach uses Lucide Hand. The Timeline header has one date control; an export entry aligned beside the date fans out CSV, JSON, and Print. Actions open below the header. Its hidden checkbox owns open state, with CSS-only staggered fan motion and plus-to-close rotation. The requested spring curve (`.34, 1.56, .64, 1`) is deliberately limited to this occasional interaction. Reduced motion removes the fan movement. The existing Radix switches gain a small checkmark and restrained thumb compression; loading buttons use three signal strokes. These are local CSS adaptations inspired by the user’s Colorion references, not external scripts or runtime requests.


## Tanda identity and header

Use the supplied `public/brand/tanda-icon.png` directly. The visual wordmark is `tanda.`; document titles and app copy use Tanda. The app header contains identity and profile access. Language, appearance, and privacy controls live in Settings. Appearance uses a sun/moon/device selector inspired by Colorion, preserving the existing Match device preference. Persisted database keys and `.isyarat` handover compatibility remain unchanged. The supplied splash-screen document is reference context, not a new automatic launch screen.

## Profile density

Settings/Profile groups use 16px insets, 16px content gaps, 17px section headings, and 44px control targets. Related fields live in one content wrapper so section separators cannot accidentally restyle a button. Desktop groups flow in two independent columns rather than stretching into equal-height rows. The handover action is a full-width, clearly filled button. Destructive copy is compact and secondary, with the destructive action still visibly red.

## Splash preview

The standalone `/#/splash` preview follows the supplied Tanda splash brief: midnight navy, four separated blue vector strokes, `tanda.` at 44px, a short tagline, and a quiet privacy note. Its one-time staggered entrance settles completely; reduced motion shows the final composition immediately. It has no app chrome or automatic redirect. The navigation icon continues to use the supplied PNG directly.
