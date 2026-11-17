# Sign packs (Labs)

Sign packs let someone **practise and check isolated signs and fingerspelling** with the camera. They are a
**practice aid**. They are **not** a translator or interpreter, and the app never presents them as one. The
feature is off by default (Settings › Labs › Sign packs).

- Every pack is labelled with its language, for example "ASL (American Sign Language)". The app never says "sign
  language" generically or "English sign language".
- Sign languages differ by country. Malaysian Sign Language (BIM) is a different language. A BIM pack is planned
  **with** the Deaf community (Malaysian Federation of the Deaf), not built from outside data.
- Hands and body only. No faces, no audio. Facial expression and other non-manual features are part of signing
  grammar, and this tool cannot check them. The pack screens say so.
- Status shown on every pack: "Not yet reviewed by a Deaf signer" until a reviewer is recorded. The first-run
  notice says "Seeking review by Deaf signers"; we do not claim to be "built with" the Deaf community, because
  that is not yet true, and we do not claim any endorsement.

## What ships

| Pack | Content | Real? |
|---|---|---|
| `asl`: ASL (American Sign Language) | **Empty.** Signs appear only when a real signer records them with "Author a pack". | No signs yet |
| `demo`: Demo pack (simulator) | 4 movements + 4 held handshapes produced by the synthetic performer | **Demo only, not real signs** (badge on every screen) |

No dataset is bundled. See *Licence rules* below.

## Format (`.signpack`, schema 1)

JSON, validated with zod (`src/engine/sign/pack.ts`). Plain, or encrypted (PBKDF2-SHA-256 310 000 iterations →
AES-GCM-256, the same scheme as the `.isyarat` handover file, with a key-check so a wrong passphrase is told apart
from a damaged file).

```ts
SignPack {
  format: 'isyarat-signpack', schema: 1,
  id,                    // [a-z0-9-], unique on the device; built-in ids cannot be replaced
  language,              // 'ASL' | 'BIM' | any short code; the UI shows a full name for known codes
  version,               // semver; bumped on every saved sign
  title_en, title_ms,
  signs: Sign[],
  signerCredits: { id, name /* '' = anonymous */, consentedAt }[],
  reviewStatus: 'unreviewed' | 'reviewed', reviewedBy?,
  licence, source,
  demo, builtIn, updatedAt,
}
Sign {
  id, gloss /* English label */, gloss_ms,
  type: 'static' | 'dynamic',
  templates: { n: 16, d: 108, data /* base64 Float32, landmark features only */, hand?, signerId?, recordedAt }[],
  notes, confusableWith: string[],
}
```

Templates are the engine's 108-D body-normalised **landmark features** (pose points relative to the shoulders,
hand points relative to the wrist), time-resampled to 16 frames. A template contains no pixels, faces or audio.
The skeleton replay on the Practice screen is drawn from these numbers.

## Matching (`src/engine/sign/`)

| File | Role |
|---|---|
| `pack.ts` | Schema, validation, plain/encrypted files, signer withdrawal |
| `registry.ts` | Built-in + device packs; a new language is data only |
| `models.ts` | Builds matchers per pack. **Dynamic** signs reuse the existing engine unchanged (banded DTW, kNN, per-class LOO τ, confidence); a margin rule between any two signs is added. **Static** signs use `staticHand.ts`, plus a location gate (a held shape only counts near where the reference signer held it). |
| `staticHand.ts` | Handshape classifier on the 21 hand landmarks: wrist-relative, scale- and rotation-normalised, left hands mirrored; RMS point distance; kNN (mean of 2 nearest) with LOO τ and margin |
| `window.ts` | Which part of a capture is judged: busiest 2 s for movement; for a held shape, the stillest 1 s **among windows where a hand is in view and raised** (so starting from rest does not matter) |
| `feedback.ts` | "Close" / "Try again" + which part differed most: handshape, movement or location. Each component distance is divided by how much the reference signer's own takes vary in that component |
| `confusable.ts` | Signs whose templates come within either sign's threshold of each other; stored as `confusableWith` when a sign is saved |
| `quality.ts` | Authoring checks: hands out of frame, an inconsistent take, very different speeds, near-identical takes, fewer than 5 takes |
| `metrics.ts` | Benchmark confusion matrix, per-sign precision/recall, labels-file parser |
| `demoPack.ts` | The simulator-made demo pack |

The existing child-signal engine is unchanged. The only addition there is a separate helper,
`stillestSubWindow` in `motion.ts`, used by the sign packs.

## Authoring (Settings › Labs › Author a pack)

1. **Reference-signer consent.** Two statements: landmarks only (no video, face or audio stored), and the right to
   withdraw with deletion. An optional name for the credit; empty means anonymous.
2. **Pack**: choose a device pack or create one (language, titles, licence; default "CC BY 4.0", editable).
3. **Sign**: gloss (EN, optional BM), type, notes; record **5 or more takes** (3-2-1 countdown, 2.5 s capture, the
   same processing as Teach). The quality checks show advice next to each take; the signer decides what to keep.
4. Saving adds the signer credit, bumps the version, and recomputes `confusableWith` for the whole pack.

Withdraw: on the pack page each credited signer has **Withdraw signer**, which deletes their templates (and any
sign left with none). **Delete pack** removes the pack and all its landmark data and practice progress from
IndexedDB. Import shows the licence, source and credits before anything is saved.

## Learn mode

- **Pack browser** → **sign list with search** → **Practise**: gloss EN/BM, skeleton replay of the first template,
  live camera, **Check my sign**. Feedback is text + icon (+ colour): "Close", "Try again" with the part that
  differed, and "It looked more like …" when another sign matched better.
- **Fingerspelling**: pick held handshapes, or type a short word (letters map to static signs whose gloss is that
  letter; missing letters are listed). Each handshape is checked in turn. ASL packs show "M, N, S and T look
  similar on camera".
- **Progress** (IndexedDB, this device only): attempts, current run of "close" results, best run. A "try again"
  ends the run quietly; nothing is ever shown as a loss.

## Recognise mode (secondary)

Isolated signs only. It shows one candidate with a confidence level after two agreeing evaluations, and
"Is this …?" with Yes / No. Below the threshold it shows "Not sure". It never outputs sentences and never claims
to understand.

## Benchmark (Settings › Labs › Benchmark)

- **Real clips**: video files plus a labels file (`filename,gloss` per line), the number of signers, a confirmation
  that all are consenting adult volunteers, and hearing status as reported. Clips are processed on the device
  through the same landmark pipeline and are not kept. Results are titled "n signers, adult volunteers, hearing
  status: …". There is an honest empty state when no clips are given.
- **Synthetic**: simulator clips on the demo pack, labelled "Synthetic: … Not real signs, not real signers." This
  is the **only** accuracy reported anywhere for sign packs.

Current synthetic result (unit test, 8 unseen takes per demo sign): **100 % on the demo pack, synthetic**. It
says nothing about real signers.

## Licence rules

A sign appears in a pack **only** if a real signer recorded it with the in-app tool. Nothing from a dataset is
bundled, even when its licence would allow it.

Sources reviewed (licences as reported by the researcher, **to be re-checked at the source before any use**):

| Source | Reported licence | Decision |
|---|---|---|
| PopSign ASL v1.0 / Kaggle `asl-signs` (MediaPipe landmarks; includes face rows) | CC BY 4.0 (PopSign); Kaggle competition rules | **Offline benchmark candidate only.** Strip face rows on ingestion. Not bundled. |
| FSboard (ASL fingerspelling video, faces) | CC BY 4.0 | Offline benchmark only, after local landmark extraction and deleting the videos. Not bundled. |
| Kaggle `asl-fingerspelling` landmarks | Competition data rules | Offline benchmark only (redistribution unclear). |
| ASL Citizen | Microsoft Research licence: non-commercial, no redistribution | **Do not use** in the app or repository. |
| WLASL | C-UDA 1.0 (non-commercial) | **Do not use** in the app or repository. |
| Sign Language MNIST; HF `asl-static-landmarks-v1` | CC0; CC BY 4.0 | Not used. Not Deaf-community curated, and not needed. |
| Fingerpose, Kazuhito00 classifiers | MIT; Apache-2.0 | Not used. The handshape classifier is our own clean-room code. |
| Repos without a licence file (sign-translate, SignBridge, signSpeak) | none | Not used, not copied. |

## How a BIM pack plugs in

No code changes. A BIM pack is a `.signpack` with `language: 'BIM'`, recorded by consenting BIM signers with
"Author a pack" and reviewed by Deaf BIM users. Import it, or ship it as a built-in by adding it to the registry's
built-in list once it is reviewed and the community agrees. It must be co-created with the Malaysian Federation of
the Deaf (MFD) and BIM educators; BIM is recognised under the Persons with Disabilities Act 2008 (Act 685).

## Ethics references (quotes not verified by us; read the originals)

- WFD & WASLI statement on signing avatars (2018); WFD on AI and sign languages: machine translation does not match
  human interpretation, and Deaf communities must be at the table.
- European Union of the Deaf, *Sign Language in the Era of Artificial Intelligence* (2025): AI must not replace
  professional interpreting; Deaf-led development; informed consent, fair pay, deletion on request.
- Malaysian Federation of the Deaf (mymfdeaf.org): BIM as the official language of Deaf people in Malaysia.

## Needs a Deaf signer's review before any public use

- Every recorded pack (templates, glosses, notes): `reviewStatus` stays "unreviewed" until a Deaf signer reviews it.
- The feedback copy (which part differed) and the confusable-letter note.
- The consent and withdrawal flow and its wording, in English and in BM, including whether signers are paid.
- The BM strings (machine-quality translation by the developer).
- The BIM pack plan, with MFD.
