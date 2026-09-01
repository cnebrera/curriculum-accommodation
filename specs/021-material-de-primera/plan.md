# Implementation Plan: Lo compuesto también es material

**Branch**: `021-material-de-primera` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-01

## Summary

One question decides most of this feature: **what is «the document» of a job?**

Today the answer is hard-coded in eight places as `material/<job>/<learner>/adapted.md`,
so a composed document has no outputs at all. The work is to make that a **resolved
question** rather than a constant — and then almost everything else already exists:
`renderHTML`, `renderODT`, the linear renderer, the sign-off, the answer-key renderer and
the correction box are all written and tested.

Two pieces are genuinely new: the **viewer** and **asking her which kind of material she
wants**. Everything else is a change of what gets read.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault, unchanged. **No new file and no new front-matter field** — see
research R1.

**Testing**: `vitest` for the resolver and the exam limits; Playwright for the walks that
print and view; `axe` for the viewer.

| Feeds | What it gives |
|---|---|
| `002` · compose | `runCompose`, `buildSheet`, the answer-key renderer, the verifiers. The composed sheet is already a complete IR at `material/<job>/ir.md` |
| `007` · print | `renderHTML`, `presentationFor`, the output checks, and the rule that the draft mark is **derived from the document** and never passed in |
| `019` · modalities | ODT, audio-ready, braille-ready — all of them take an IR |
| `012` · material kinds | The four kinds, in the corpus, already parsed |
| `020` · navigation | Where the buttons go, and `startedFor()` — see R2 |
| `014` · the record | Already surfaces a composed job, and already has the buttons this feature adds elsewhere |

**Where the work lands:**

| | What |
|---|---|
| `packages/core/src/vault/document.ts` | `resolveDocument` — the one place that answers «which document?» |
| `packages/shell/src/jobs/print.ts` | Reads the resolved document instead of a constant path |
| `packages/shell/src/jobs/linear.ts`, `ipc/signoff.ts` | The same, for the other modalities and the signature |
| `packages/shell/src/jobs/compose.ts` | Takes the kind from her instead of deriving it; re-composition with a correction |
| `packages/core/src/compose/answers.ts` | The key's own heading, on every rendering of it |
| `ui/src/viewer/` | The viewer, and the buttons that reach it |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The four kinds come from `instructions/material-kinds.md`, which is already the case for adapting. The kind picker in the compose flow reads the corpus — a second hard-coded list of four is exactly how the corpus stops being the authority |
| **II** · deterministic core | `resolveDocument` is a path decision over the filesystem. Viewing, printing and exporting call no model. Only a correction spends money, as today |
| **III** · adapt the how, never falsify the what | **FR-1910 and FR-1923 are this principle.** Relabelling material so it matches what she asked for would be falsifying the *what* — so the kind she chose is recorded and the mismatch is reported |
| **IV** · one extraction, N outputs | **The feature is this principle being kept.** One composition currently has zero outputs; afterwards every modality renders it |
| **V** · barriers not diagnoses | Not engaged. The viewer shows a document, never a learner |
| **VI** · traceability | A composed document already carries its objectives and its anchor. Signing off, correcting and printing record against the same job |
| **VII** · the draft announces itself | **The sharpest risk in this feature.** Printing a composed exam that looks finished is the failure; `isSignedOff` derived from the document (never a parameter) is what already stops it, and it must keep being derived through the resolver |
| **VIII** · human-routed memory | The correction on composed material asks the scope, exactly as after an adaptation. Nothing infers it |
| **IX** · content is never instruction | **FR-1924.** A composed document rests on an anchor she pasted; the viewer must render it without executing anything — see research R4 |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-1906 needs a teacher.** Whether a composed exam is fit to put in front of a class is
not answerable here, and it is the most consequential thing this feature produces. It is
also the only success criterion in the feature that could come back «no» after everything
else is green.

**The answer key becomes printable, which adds a real risk.** SC-1908 checks both sides —
no answer in any learner rendering, and a «no repartir» heading on every rendering of the
key. That is a test, not a reassurance, and it is the one to write first.

## Phase 0 · Research

[research.md](./research.md) — five questions. R1 is the one that shapes the feature: the
resolver needs **no new stored fact**, because a composed job already records who it was
for. R3 found that iterating on composed material is *not* the same operation as
iterating on adapted material, and calling it «revise» would have hidden that.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `ResolvedDocument`, and what deliberately gains no field.
- [contracts/document.md](./contracts/document.md) — the resolver, what every caller gets,
  and the four rules the viewer keeps.
- [quickstart.md](./quickstart.md) — the walks, offline first, money last.

## Sequencing

**The answer-key test before the answer key is printable.** SC-1908 is the one whose
failure puts solutions in a child's hands, and a check written after the feature works is
a check written to fit what already happens.

**The resolver before any caller moves.** Eight call sites read a constant path; changing
them one at a time against a resolver that does not exist yet means eight chances to
disagree about what «the document» is.

**US1 before US2.** Viewing and printing what already gets composed is the complaint;
choosing the kind is what makes the *next* composition better. And US2 changes
`runCompose`, which US1's tests will already be exercising.

**The exam limits land with US2, not after it.** `002`'s own history is the argument:
FR-126 shipped a composed sheet with no kind rule governing it because the kind was set
before anyone asked what it was for. An exam that can be composed before its limits exist
is the same shape of mistake with a worse outcome.
