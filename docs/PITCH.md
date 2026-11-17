# Isyarat — UMSprouts 9.0 pitch notes

**Focus areas:** Healthtech · AI & Digital
**One line:** Isyarat teaches a camera the personal signals of one non-verbal child — on the device, in minutes — so every carer can understand them.

> Figures marked `[VERIFY]` must be checked against the official source before presenting. Isyarat makes no claim of clinical efficacy; all accuracy numbers in this repository are a synthetic benchmark, not a clinical or real-child result.

## 1. Problem

- **Scale.** The Department of Statistics Malaysia (DOSM) reports **805,509 persons with disabilities (OKU) registered in 2024, 2.4% of the population**, up from 736,607 (2.2%) in 2023. Source: DOSM *Statistik Orang Kurang Upaya, Malaysia 2024* (released Dec 2025), as reported by RTM — https://berita.rtm.gov.my/?p=202869 and Sinar Harian — https://www.sinarharian.com.my/article/760160 . Official release: https://www.dosm.gov.my `[VERIFY exact table]`
- **Learning disabilities are the largest group.** About 299,128 registered under learning disability. `[VERIFY — figure from a news summary; confirm in the DOSM publication]` (Sinar Harian, link above.)
- **Autism is rising.** A 2024 analysis of Ministry of Education school records found school-age autism prevalence rose from **6.34 to 9.29 per 1,000** between 2018 and 2022 — Shair et al., indexed at https://update.library.uitm.edu.my/Record/2-s2.0-85216248111 . Registered autistic OKU rose 24% to over 93,000 — CodeBlue, https://codeblue.galencentre.org/?p=73415 `[VERIFY date and source table]`
- **Too few therapists.** In June 2023 the Ministry of Health employed **only 156 speech-language therapists** in the public sector — roughly one per 209,615 people (CodeBlue, https://codeblue.galencentre.org/2023/06/zaliha-only-156-speech-language-therapists-in-moh/). In Penang, government hospitals had seven speech therapists and an average wait of 205 days (Newswav, https://newswav.com/article/6-781-children-in-penang-diagnosed-with-speech-language-disorders-exco-A2505_H3nz9w `[VERIFY]`).
- **The human gap.** A non-verbal child's gestures are understood by the people who live with them. Each change of teacher, relief carer, therapist or classroom aide resets that understanding to zero. Written "communication passports" exist but cannot show *how* a signal looks.

## 2. Solution

A free web app for caregivers and PPKI teachers:
1. **Teach** — show a signal 3–5 times, write its meaning in English and/or Bahasa Malaysia. About a minute.
2. **Live** — Isyarat shows "what they may be saying", with Yes / Not quite / New meaning so the adult always decides; it learns from corrections.
3. **Calm Watch** — a movement-pattern indicator (energy, rhythm, suddenness) that shows the caregiver's own comfort steps. Never a diagnosis.
4. **Handover** — the child's whole vocabulary in one encrypted file for the next carer, including stick-figure replays of how each signal looks.

Runs in Chrome/Edge on an ordinary laptop or Android phone. No account, no server, works offline.

## 3. Why it is hard to copy

- **Per-child few-shot temporal matching** with **calibrated rejection**: banded dynamic time warping over 16-frame, body-normalised pose + hand sequences; per-signal thresholds from leave-one-out statistics; margin and motion gates; a two-consecutive-evaluation rule. It says "I don't know" rather than guess — on the synthetic benchmark 100% of untaught movements were rejected while 95.8% of taught ones were recognised (synthetic benchmark, not a real-child result).
- **Robust signal processing for messy homes and classrooms:** shoulder-centred, scale- and roll-normalised skeletons; 1€ adaptive smoothing; dropout hold; hand-to-arm matching by wrist proximity (MediaPipe's left/right labels flip with mirrored video).
- **Fully on-device pipeline** (MediaPipe WASM, ≈4.5 ms classification) with a strict CSP and automated "no network" tests — privacy is architectural, not a policy promise.
- **Encrypted handover** (PBKDF2-310k + AES-GCM) that separates wrong-passphrase from corrupted-file errors.
- **Calm Watch** combines robust-baseline energy z-scores, autocorrelation periodicity and suddenness with hysteresis, explained in plain words.
- **Bilingual, accessibility-first** (WCAG 2.2 AA, axe-tested in both languages and themes).

## 4. Job-creation and income engine — "Signal Interpreters"

- **Signal Interpreters:** trained parents of children with disabilities, TVET graduates and OKU community members, paid per family or per class to set up and maintain a child's signal profile, run handovers between carers and train families. Flexible, home-based work that values lived experience.
- **School / centre onboarding trainers:** run half-day sessions for PPKI teachers and therapy-centre staff.
- **Language and content roles:** Bahasa Malaysia (and later Tamil, Mandarin, Iban, Kadazandusun) review of UI and training materials.
- Target (assumption to validate): 1 interpreter supports ~25 active families; 100 interpreters by year 3.

## 5. Business model (all prices are assumptions to validate in the pilot)

| Stream | Who pays | Assumption |
|---|---|---|
| Free caregiver tier | – | Always free for families |
| School / therapy-centre licence | Centres, private schools | RM 30–60 per child per year, includes training and handover support |
| Interpreter marketplace | Families or sponsors | 15% take rate on interpreter sessions |
| Sponsored licences | NGOs, CSR, zakat/wakaf-funded programmes | Fund licences and interpreter time for B40 families |

## 6. Impact and sustainability

Pilot metrics: time to first successful communication with a new carer; number of taught signals in active use; share of recognitions confirmed by caregivers; caregiver confidence (short validated questionnaire); handover time when a child changes class. Align with national disability-inclusion priorities (Persons with Disabilities Act 2008; national OKU action plan) `[VERIFY current plan name and year]`.

## 7. Ethics and safeguards (built in, not promised)

On-device only; no face analysis; no audio; caregiver supplies all meanings; Yes / Not quite / New meaning on every recognition; consent gate before any camera use; nickname only (no photo, surname, birth date); delete-everything with typed confirmation; no analytics or CDNs; no accuracy percentages for real children; Calm Watch labelled "movement pattern only — not a diagnosis".

## 8. Pilot plan (6 weeks)

One PPKI class or one therapy centre, 5–10 children, written parental consent.
- Week 0: train 2 teachers + 1 interpreter; each child gets 3–5 signals taught with the family.
- Weeks 1–5: daily use in class; weekly 15-minute check-ins; one planned handover to a relief teacher.
- Week 6: metrics above + interviews; decide go/no-go for a second site.

## 9. Risks and limits (honest)

- Real-world accuracy is unknown until the pilot; lighting, camera angle and occlusion matter.
- Children with very small or highly variable movements may not be distinguishable.
- Calm Watch can be misread as an emotion detector — training and wording must keep it a movement pattern.
- Device access in B40 homes; older laptops may run in low-power mode.
- BM wording needs native-speaker review; no clinical validation yet.

## 10. Roadmap

Pilot (Q1) → teacher dashboard for multiple children and printable signal cards (Q2) → Android packaging and more languages (Q3) → research partnership for a controlled evaluation (Q4).

## 11. Ask

- A pilot site: one PPKI class or therapy centre.
- Introductions to special-education officers and NGOs (e.g. National Autism Society of Malaysia).
- Seed funding for interpreter training and a small-scale pilot.
