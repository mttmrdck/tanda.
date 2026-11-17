# Isyarat — Privacy (for parents and school administrators)

**Short version:** everything stays on the device you use. There is no account, no server and no upload. You can delete everything at any time.

## What data exists

| Data | Example | Where it lives |
|---|---|---|
| Child profile | Nickname "Adam", optional age band "5–8", your comfort steps | This browser's IndexedDB |
| Signals | Name and meaning you wrote, type, urgency, a picture icon | IndexedDB |
| Examples | Numbers describing body and hand **positions** (about 1 700 numbers per example) from signals you chose to record | IndexedDB |
| Events | "Water, 10:05, confirmed"; "Calm Watch: Rising, 11:20" | IndexedDB |
| Settings | Language, theme, sensitivity | This browser's localStorage |
| Sign packs (Labs, off by default) | Packs you recorded or imported: glosses, signer credit (a name, or anonymous), and landmark numbers for each take | IndexedDB |
| Sign practice progress (Labs) | "Practised 4 times, best run 3", per sign | IndexedDB |

There is no photo, surname, date of birth, face data, audio or video anywhere.

## What Isyarat never does

- Never stores, uploads or logs camera video or pictures. Each frame is turned into body and hand points inside the browser and then discarded.
- Never reads faces. No face model is included.
- Never uses the microphone.
- Never sends data to a server. There is no server. The app makes no internet requests while it runs (an automated test fails if it ever does), and the production build enforces this with a Content-Security-Policy.
- No analytics, trackers, adverts, third-party fonts or CDNs.
- Never diagnoses, screens for or treats any condition. Calm Watch describes a movement pattern only.
- "Speak aloud" uses only voices installed on the device; network voices are skipped.

## Sign packs (Labs)

Off by default. A reference signer agrees on a consent screen before recording. Their recordings are landmark
numbers only (no video, face or audio), and they can withdraw at any time: **Withdraw signer** deletes their
recordings. **Delete pack** removes the pack, its landmark data and its practice progress. Exported `.signpack`
files can be encrypted with a passphrase. Benchmark video clips are processed on the device and are not kept.
Sign packs are separate from the child's profile and are never mixed into a handover file.

## Sharing with another carer (Handover)

A handover file is encrypted with a passphrase you choose (PBKDF2-SHA-256 with 310 000 iterations, AES-GCM 256). Without the passphrase the file is unreadable. Send the passphrase separately (in person or by phone). History (events) is only included if you tick the box.

## How to delete

- One signal: Signals → delete icon on its card.
- One child: Settings → Child profile → Delete this profile.
- Everything: Settings → Your data → **Delete all data on this device**, then type the confirmation word. This removes the IndexedDB database and all Isyarat settings from this browser.
- Clearing the browser's site data for the Isyarat address also removes everything.

## Consent

On first use the adult must confirm they are the parent, legal guardian or an authorised carer, that the camera runs only on this device, and that Isyarat is a communication aid, not a medical device. The camera never starts until the adult presses the camera button.

## For schools and centres

Because nothing leaves the device, Isyarat does not create a central database of children's information. Devices should still be protected (screen lock, user accounts), because anyone with access to the browser profile can open the app. For pilots, keep a written consent form from parents alongside the in-app consent.
