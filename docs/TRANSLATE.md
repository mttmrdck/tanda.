# Translate (Labs)

Translate works between **words and individual signs of one loaded sign pack**. It is **not** a sentence
translator or interpreter, and every screen says so: "Works with signs in the loaded pack. Sign languages have
their own grammar, so this shows individual signs, not full sentences." It sits behind the same flag as sign packs
(Settings › Labs › Sign packs) and has its own route, `/translate`, and its own nav item.

Every screen shows the active pack and its language (e.g. "ASL (American Sign Language)"), its review status ("Not
yet reviewed by a Deaf signer" until set), and the note "Hands and body only. Facial expression is part of signing
and this tool cannot check it." A demo (simulator) pack shows a persistent banner: **Demo only, not real signs**.

## Modes

### 1. Sign to word
- The camera starts when this tab opens and stops when you leave the tab or Translate.
- **Capture a sign**: 3-2-1, a 2.5 s capture, then up to **3 candidates**, each with the EN and BM gloss, a
  strength label (Strong / Possible / Weak match: text, not colour) and **Replay** of the reference skeleton.
- Only signs within their own rejection threshold are candidates. If none, it says **"Not sure"**. With no hands in
  view: "Move so both hands are in view." It never forces a match.
- Tap the right candidate to confirm it, or **None of these**. Confirmed signs go to **Signs so far**, labelled "A
  list of signs. Word order and grammar in sign languages differ from English or Malay, so this is not a sentence
  translation." There is Copy as text (glosses as a list, `A · B`), Undo and Clear.
- **Speak confirmed words**: off by default, and shown only if the device has a **local** voice
  (`voice.localService === true`). Network voices are never used.

### 2. Word to sign
- Search with suggestions from the pack (EN or BM gloss: exact, prefix, word-prefix, substring).
- Choosing a word replays the **recorded template** as a skeleton (landmarks only):
  - play/pause, 0.5×/1×, loop, a mirror toggle for left-handed learners, and highlighted hands,
  - a frame stepper with a caption ("frame i of 16"), plus the pack's notes.
  - With reduced motion the player starts paused on the step-through and never animates on its own.
- Several words are queued in order (multi-word glosses match greedily, up to 3 words), each labelled, with the
  grammar note.
- A word with no sign shows **Not in this pack**. If the pack has an alphabet, **Fingerspell it** shows the letters
  that have real templates; the rest say "not in this pack". Nothing is invented and there is no made-up animation.

### 3. Fingerspell
- The camera checks continuously, restricted to the pack's alphabet. Up to 3 letters are shown as large buttons; the
  person taps to confirm, and the letter goes to the word box (Space, Delete last letter, Clear).
- ASL packs show "M, N, S and T look similar on camera"; other packs list their recorded confusable letters.
- **J and Z** involve movement. They count only as **dynamic** templates; a static J/Z is ignored, and a missing one
  is shown as "involves movement, not supported in this pack".
- Reverse: type a word and see it letter by letter (only letters with real templates).

The alphabet is the signs with a `letter` field (set by the pack author) or a single-letter gloss. The demo pack
gives its four held shapes the demo letters A–D, always shown as "Demo letter A" and noted "not a real sign or
letter".

## Data rules

- Uses the existing `.signpack` format (one new optional field, `letter`). Translate adds no signs and describes
  none from memory.
- A pack with 0 signs shows, in every mode: "This pack has no signs yet", with **Author a pack** and **Import a
  .signpack file**.
- No faces, no audio capture, no uploads. Session state (strip, word box, chosen pack, speak toggle) lives **in
  memory only** in `useTranslate`. Nothing from Translate is written to storage.

## Isolation from Live

| | Live | Translate |
|---|---|---|
| Templates | the child's personal signals (`useData` → `repo.ts`, stores `signals`/`examples`) | sign-pack signs only (`useSignPacks` → `signRepo.ts`, store `signPacks`) |
| Camera session | `useSession.ts` (`session`) | `translateSession.ts` (own source, processor, subscribers, capture) |
| Matching | `Recognizer` (cooldowns, two-consecutive rule, re-arm), Calm Watch | pure `rankCandidates` (no cooldowns, no events) |
| State | Live page state, event list, feedback queue | `useTranslate` slice (memory only) |

Enforced by `tests/unit/translate.test.ts`:
- **Import-graph test.** Translate's modules cannot reach `useSession`, `useData`, `repo.ts`, `recognizer`,
  `calmWatch`, the Live page, `LiveBits`, `VideoPanel`, `CameraStage` or `SessionSync`. Live's modules cannot reach
  `engine/sign`, `engine/translate`, the Translate/sign pages, `useSignPacks`, `signRepo`, `translateSession` or
  `useTranslate`. Both checks were mutation-tested: adding a forbidden import makes them fail.
- **Storage/runtime test.** With a child signal and a pack recorded from the *same* movement, pack ids and signal
  ids never overlap. Translate's candidates are only pack ids, and Live's recogniser emits only the child's signal.

Refactors made to allow this: `OverlayCanvas` now takes its frame source as a prop; gesture labels moved to
`gestureLabels.ts`; sign-pack storage moved from `repo.ts` to `signRepo.ts` (shared `RepoError`/`guard`/`uid` in
`repoBase.ts`). Live's behaviour is unchanged.

When you enter `/translate`, `SessionSync` stops the Live session (it is not a camera route for Live), so the two
sessions never run at the same time and the shared MediaPipe landmarkers always see increasing timestamps.

## Quality

- **Latency** (dev machine, Chromium, demo performer): **4 ms** from the end of the 2.5 s capture window to the
  candidates on screen; `rankCandidates` takes about **1.4 ms** per capture (8 signs × 5 templates). The capture
  window has a fixed length: if a sign finishes before the window closes, the result appears when the window closes.
  An early stop on stillness is not implemented yet.
- **Synthetic accuracy** (demo pack only, simulator takes; not real signs, not real signers): top-1 **95.8 %**,
  top-3 **100 %** (n = 48).
- Errors: camera denied/missing/busy/unplugged/insecure (same messages as elsewhere), pack missing, low landmark
  quality.
- Accessibility: results are text with icons; tabs use roving focus with arrow keys; targets ≥ 48 px; the replay has
  a caption and a static step-through under reduced motion; all strings EN + BM. Axe (WCAG AA) runs on every mode in
  e2e.

## What only works with the demo pack today

Everything above runs end to end only with the simulator demo pack, because the shipped ASL pack is empty. Real ASL
needs:

- Real signers recording each sign (5+ takes) with "Author a pack", and an ASL alphabet with `letter` set (J/Z as
  movement signs).
- A Deaf signer's review of the recorded signs, the glosses, the confusable-letter note and the wording of every
  disclaimer before anything is shown as real ASL.
- A benchmark on clips from consenting signers (Settings › Labs › Benchmark) instead of the synthetic numbers above.
