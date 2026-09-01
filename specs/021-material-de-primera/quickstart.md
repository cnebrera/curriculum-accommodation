# Quickstart — proving a composed document is a document

Ordered so everything checkable offline is checked before anything spends money.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with one learner and **one composed job that has never been adapted** — the state
Carlos was in when he found this.

---

## §1 · The test to write first

```bash
npx vitest run packages/core/test/answer-key-never-on-the-sheet.test.ts
```

The answer key becomes printable in this feature, so the check that it never reaches a
learner's page is written **before** it does. Both sides, per SC-1908:

- No rendering of a learner's material contains an answer — for composed and adapted
  material, in HTML, PDF-source, ODT and the linear text.
- Every rendering of the key states that it is the solutions and is not to be handed out.

A check written after the feature works is a check written to fit what already happens,
and the failure mode here is a page of answers in the photocopy pile.

## §2 · Offline · the resolver

```bash
npx vitest run packages/core/test/document.test.ts
```

| Case | Expected |
|---|---|
| Adapted for this learner | the adaptation |
| Composed, never adapted | the composition, with the learner from its front matter |
| Composed, then adapted for her | the adaptation for her; the composition still reachable |
| Composed for A, asked for B | `none`, because *not adapted for this learner* — a different sentence from «no document» |
| Composed before `020`/`021` (no learner recorded) | the composition, no learner, default presentation |
| A job with nothing in it | `none`, because *no document at all* |

Plus the structural one: **no path to `adapted.md` is constructed anywhere except the
resolver and the writers.** A grep, asserted, because eight call sites is how they drift.

## §3 · Offline · everything renders

```bash
npx vitest run packages/core/test/ packages/shell/test/
```

Every modality over a composed document: HTML, ODT, audio-ready, braille-ready. And the
absences that matter — no mark scheme, no weighting, no pass mark, in any rendering of any
kind (SC-1905).

## §4 · With a window · viewing and printing

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/composed.spec.ts
```

1. Compose material, and from the summary open **the sheet, the answer key and the
   composition report** — three buttons that did not exist.
2. Print it. It comes out **with the draft mark**, and no adaptation ran.
3. Read it in the viewer: it is the document, not a Markdown preview, and she was not sent
   to another application.
4. Sign it off. The mark goes. Adapt it for two learners afterwards: **those two sheets are
   unsigned**, because nobody has read them.
5. The viewer over a document containing `<script>`, an `onclick`, an external image and a
   link: **nothing runs, nothing loads, nothing navigates** (FR-1924).

## §5 · With a window · the kind is hers

```bash
RAMPA_TEST=1 npx playwright test e2e/compose-kind.spec.ts
```

- Four kinds offered when asking for material from objectives, **nothing pre-chosen**.
- Ask for a study text, get a study text, and every screen says «apuntes».
- Ask for an exam: the draft mark, «tú validas cada pregunta», and the sentence about the
  teaching team — **on the document, not only on the screen**, because a printed page
  outlives the screen it was made on.
- Ask for an exam, get bare arithmetic: the document stays an exam and **the report says
  what happened** (FR-1910/FR-1923).

## §6 · Looked at, not asserted

```bash
npm run shots
```

Open them. The viewer at the narrowest width and at `xlarge`; a composed exam's first
page, to see whether «borrador» reads as clearly as it needs to when the page is a test;
and the answer key's heading — the question is whether it is unmissable at a glance in a
pile of paper, which no assertion can answer.

## §7 · The one that costs money, last

Compose, then correct: «el ejercicio 3 es muy largo».

1. It asks who the correction applies to, exactly as after an adaptation.
2. A new version appears and the previous one is kept.
3. **The answer key was regenerated**, and if a quantity changed it was re-verified before
   anything was shown.
4. The signature from before the correction is gone.

## §8 · The verdict I cannot produce (SC-1906)

Give a teacher a composed exam, with no preamble, and ask her whether she would use it.

**The most consequential thing this feature produces**, and the only success criterion
that can come back «no» with everything else green. If she would not use it, that is worth
knowing before the feature is called done — and «why not» is worth more than the answer.
