# 3-minute judge demo

Start state: Isyarat open in Chrome on the presenting laptop, profile "Adam" created, **no signals yet**, Live page, Demo performer running. Language EN (switch to BM for a Malay-speaking panel). Window at full screen.

| Time | Say | Do |
|---|---|---|
| 0:00 | "Thousands of Malaysian children can't speak, but they *do* communicate — with gestures only their family understands. When a new teacher or relief carer takes over, those signals are lost." | Live page on screen. |
| 0:20 | "Isyarat lets a parent teach the camera those personal signals in about a minute." | Teach → Name: "Water", meaning "I want water, please." → Next. Performer gesture: **Tap the table**. Record 5 takes (Keep each). Next → quality check shows a green tick → Save signal. |
| 1:20 | "Now Adam taps the table…" | Go to Live → ask the performer to **Tap the table**. The card shows the water icon, "Water — I want water, please." Press **Yes, that's it**. Point at Recent events. "Every guess is confirmed or corrected by the caregiver, and it learns from that." |
| 1:50 | "Calm Watch notices rising repetitive movement — a pattern, not a diagnosis — and shows the caregiver's own comfort steps." | Ask the performer to **Rock**. Within ~10 s the meter moves to Rising with "A repeating rhythm (about 1 per second)". Point at "Movement pattern only — not a diagnosis." |
| 2:20 | "When Adam moves class, his vocabulary moves with him — encrypted." | Handover → passphrase → Create file. Settings → Delete all data (type DELETE). Onboarding → consent → "Import it" → choose the file → passphrase → Import. Live → Demo performer → Tap the table → "Water" again. |
| 2:45 | "Everything ran on this laptop — no faces, no audio, no uploads, no server." | Click the **On this device only** chip. "Our ask: a 6-week pilot with one PPKI class or therapy centre." |

## Fallback if the camera fails

Everything above uses the Demo performer, so the camera is optional. If you show the real camera and it fails (permission, busy, lighting): press **Try Demo mode** in the error message and continue. Never debug live.

## 10 minutes before presenting

- [ ] Laptop on mains power; battery saver off; other apps closed (especially anything using the camera: Zoom, Teams).
- [ ] `npm run build && npm run preview` (or `npm run dev`) running; app open at full screen; browser zoom 100%.
- [ ] Profile "Adam" exists with **no** signals (Settings → Delete all data, then onboard again, or use a fresh browser profile).
- [ ] Demo performer started on Live; status reads "Seeing the child".
- [ ] Notifications muted; Wi-Fi may be off (the app is offline after setup).
- [ ] If showing the real camera: test it once in the room's lighting, sitting 1–1.5 m away, shoulders and hands visible.
- [ ] Handover passphrase decided in advance (e.g. "blue kettle under stairs").
- [ ] Have the letter of support from a school, centre or parent group ready to show.
