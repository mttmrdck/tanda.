# Tanda signature interface screenshots

Captured from the actual local application with Playwright/Chromium. Populated pages use explicitly simulated monitoring observations and labelled seeded gesture data; empty views use a newly created individual without monitoring consent. No real person or fabricated camera footage is shown.

Run `VISUAL=1 SCREENS=1 npm run e2e -- --workers=2` to regenerate. Layout checks also run at 320, 375, 768 and 1024; the major-page gallery uses 390 and 1440.

| Destination | Light desktop | Light mobile | Dim desktop | Dim mobile |
| --- | --- | --- | --- | --- |
| Overview | [View](overview-light-1440.png) | [View](overview-light-390.png) | [View](overview-dim-1440.png) | [View](overview-dim-390.png) |
| Live Monitoring | [View](monitoring-light-1440.png) | [View](monitoring-light-390.png) | [View](monitoring-dim-1440.png) | [View](monitoring-dim-390.png) |
| Events & Alerts | [View](events-light-1440.png) | [View](events-light-390.png) | [View](events-dim-1440.png) | [View](events-dim-390.png) |
| Individuals | [View](individuals-light-1440.png) | [View](individuals-light-390.png) | [View](individuals-dim-1440.png) | [View](individuals-dim-390.png) |
| Devices & Cameras | [View](devices-light-1440.png) | [View](devices-light-390.png) | [View](devices-dim-1440.png) | [View](devices-dim-390.png) |
| Communication | [View](home-light-1440.png) | [View](home-light-390.png) | [View](home-dim-1440.png) | [View](home-dim-390.png) |
| Insights | [View](timeline-light-1440.png) | [View](timeline-light-390.png) | [View](timeline-dim-1440.png) | [View](timeline-dim-390.png) |
| Settings | [View](settings-light-1440.png) | [View](settings-light-390.png) | [View](settings-dim-1440.png) | [View](settings-dim-390.png) |

Unconfigured profiles:

| Destination | Light desktop | Light mobile | Dim desktop | Dim mobile |
| --- | --- | --- | --- | --- |
| Overview | [View](overview-empty-light-1440.png) | [View](overview-empty-light-390.png) | [View](overview-empty-dim-1440.png) | [View](overview-empty-dim-390.png) |
| Live Monitoring | [View](monitoring-empty-light-1440.png) | [View](monitoring-empty-light-390.png) | [View](monitoring-empty-dim-1440.png) | [View](monitoring-empty-dim-390.png) |
| Events | [View](events-empty-light-1440.png) | [View](events-empty-light-390.png) | [View](events-empty-dim-1440.png) | [View](events-empty-dim-390.png) |
| Devices | [View](devices-empty-light-1440.png) | [View](devices-empty-light-390.png) | [View](devices-empty-dim-1440.png) | [View](devices-empty-dim-390.png) |

Mobile navigation: [light](navigation-light-390.png), [dim](navigation-dim-390.png).

The fixed dock appears at the viewport bottom within full-page captures. Caregiver notes, histories and source distinctions were also exercised by workflow tests. See the [design report](../../design/SIGNATURE-REPORT.md) for results and verification limits.
