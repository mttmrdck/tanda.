# Tanda — Privacy for individuals and authorised caregivers

**Short version:** browser camera processing and stored data remain local. No video is recorded or uploaded. An optional authenticated local gateway prototype stores monitoring metadata on disk. Remote alerts and microphone capture are unavailable.

## What data exists

| Data | Example | Where it lives |
|---|---|---|
| Individual profile | Nickname "Adam", optional age band "5–8", your comfort steps | This browser's IndexedDB |
| Signals | Name and meaning you wrote, type, urgency, a picture icon | IndexedDB |
| Examples | Numbers describing body and hand **positions** (about 1 700 numbers per example) from signals you chose to record | IndexedDB |
| Events | "Water, 10:05, confirmed"; "Calm Watch: Rising, 11:20" | IndexedDB |
| Monitoring sidecar | Category, assigned room/camera, authority/video consent, schedule, baseline summary, event review history | IndexedDB; optional independent gateway snapshot on local disk |
| Settings | Language, theme, sensitivity | This browser's localStorage |
| Sign packs (Labs, off by default) | Packs you recorded or imported: glosses, signer credit (a name, or anonymous), and landmark numbers for each take | IndexedDB |
| Sign practice progress (Labs) | "Practised 4 times, best run 3", per sign | IndexedDB |

There is no photo, surname, date of birth, face data, audio or video anywhere.

## What Tanda never does

- Never stores, uploads or logs camera video or pictures. Each frame is turned into body and hand points inside the browser and then discarded.
- Never reads faces. No face model is included.
- Never uses the microphone.
- No cloud service or remote notification delivery. Devices can explicitly send an authenticated health request to the optional loopback gateway via a same-origin proxy. The browser demo runs independently; raw video and gesture points are not sent to that service.
- Gateway API clients can submit validated simulated observation metadata. The token is local access control, not per-caregiver identity or an audited permission system. Protect the host and browser profile.
- No analytics, trackers, adverts, third-party fonts or CDNs.
- Never diagnoses, screens for or treats any condition. Calm Watch describes a movement pattern only.
- "Speak aloud" uses only voices installed on the device; network voices are skipped.

## Sign packs (Labs)

Off by default. A reference signer agrees on a consent screen before recording. Their recordings are landmark
numbers only (no video, face or audio), and they can withdraw at any time: **Withdraw signer** deletes their
recordings. **Delete pack** removes the pack, its landmark data and its practice progress. Exported `.signpack`
files can be encrypted with a passphrase. Benchmark video clips are processed on the device and are not kept.
Sign packs are separate from the child's profile and are never mixed into a handover file.

## Translate (Labs)

Translate uses its own camera session that runs only while its Sign-to-word or Fingerspell tab is open; leaving
the tab or the page stops every camera track. It matches only against sign packs, never the child's signals. The
"Signs so far" list, the fingerspelled word and the chosen pack are kept in memory only and are gone when the app
closes. "Speak" is off by default and uses on-device voices only. Nothing from Translate is stored or sent.

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

## Monitoring consent, access and deletion

Monitoring requires explicit authority and video consent in addition to the existing camera workflow. Selecting a child or older-adult category enables no policy. Movement evaluation and reviewed baseline context require explicit configuration. Audio remains disabled. Informed individual consent, autonomy, guardian authority, assent and institutional approval must be considered for each setting; the app cannot establish legal authority. Avoid covert or unnecessary bedroom monitoring.

Relationship labels are local context, not authorisation or remote invitations. Per-caregiver accounts, role enforcement and access logs remain planned. Browser access implies access to its local data; use device accounts and screen locks.

Deleting an individual also deletes their browser monitoring sidecar. Delete-all removes browser IndexedDB and settings. Independent gateway disk snapshots and manually downloaded metadata exports are outside browser deletion: stop the gateway and delete its configured data file/directory separately. Communication handovers preserve the `.isyarat` format and do not transfer monitoring consent, baseline or events; configure monitoring anew on the receiving device. Metadata export is not encrypted automatically. No automatic raw evidence retention exists. Event/history capacity failures are surfaced; retention controls need pilot review.
