# Tanda visual refinement plan

Historical first-pass plan. The later user-supplied signature monochrome brief supersedes its teal palette; see SIGNATURE-DIRECTION.md and DESIGN.md for the final system.

Scope: presentation, navigation and accessibility only. Preserve source lifecycle, validated contracts, runtime, storage, migrations and handover. Existing uncommitted work remains intact.

## Audit

The current palette is serviceable but bright blue dominates almost every action. Oversized rounded cards repeat at every hierarchy level; primary states compete with explanatory prose. Overview duplicates a Communication “Overview” in the rail. Mobile combines a wrapping platform strip, secondary tabs and a floating bar. Monitoring gives a large empty diagram and an oversized webcam stage equal emphasis. Events are tall independent cards with repeated metadata, making review slow. Monitoring forms span wide screens without grouping. Existing buttons, focus states, translated labels, disclosure controls and chart alternatives provide a sound foundation.

## System

Retain the supplied blue Tanda mark. Use warm neutral / midnight surfaces, restrained teal for actions and configuration, blue only where informative, amber for experimental/review and red for destructive/high-priority states. Centralise values in existing CSS tokens and contrast JSON. Set a compact 16px body rhythm, 28–34px page titles, 18–20px section headings, 14px metadata, 4/8px spacing, 16px panels, 12px controls. Borders and grouping carry hierarchy; glass remains limited to navigation chrome.

## Implementation

1. Shared PageHeader, StatusBadge and section/form treatments; refine existing controls, surfaces and typography.
2. One ordered desktop primary navigation; compact Communication subnavigation; mobile icon dock + accessible full-navigation sheet instead of a wrapping second primary strip.
3. Overview: identity/environment first, divided operational-status band, actionable review list, compact capability/communication panel.
4. Monitoring: explicit simulated topology with compact controls, separate browser camera section, quality/baseline summary. No fabricated footage or status.
5. Events: readable compact timeline rows, clear priority and review states, consistent metadata/action alignment, preserved history/notes.
6. Individuals/Devices: structured identity, environment, consent and observation settings; no new behaviour policies.
7. Communication/Insights/Settings: apply shared headers and surfaces, harmonise workflow/chart/settings sections without replacing working components.
8. Verify every major destination at 320/375/390/768/1024/1440, light/dim; capture desktop/mobile screenshots and inspect. Run existing regression, axe, strict types, lint, contrast, unit, gateway and build checks.

## Verification boundaries

Browser screenshots and automated accessibility checks verify presentation, not WCAG certification or monitoring accuracy. Real IP cameras, microphone capture, remote delivery and real-world detector validation remain outside this visual phase.
