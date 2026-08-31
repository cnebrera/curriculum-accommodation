# Implementation Plan: Pictograms — the family we planned and never built

**Branch**: `018-pictogramas` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-08-31

## Summary

Two things make this unlike every other family in the project, and both are in the
spec's own headings: **a licence**, and **the risk of being right about a child in a
way that marks them out**.

The licence settles the architecture before any code: Rampa must not bundle,
redistribute or download the set, so the set is hers and Rampa reads it from where
she put it. The pedagogical risk settles the control flow: **no axis value may
enable this**, which — see [research.md](./research.md) R1 — means it is not a
recipe at all.

## Technical Context

No new dependencies. Images are read from her disk and embedded as data URIs, which
`019`'s ZIP writer and the existing HTML renderer already do for fonts.

| Feeds | What it gives |
|---|---|
| `007` · provenance | `data-picto` per pictogram is the analogue of `data-from`, and the same check refuses one that traces to nothing |
| `009` · the key wizard | The shape this borrows: a third party whose terms are **hers**, which Rampa uses and never stands between her and |
| `019` · ODF and the draft mark | The attribution is derived from the document in the same place, for the same reason a signature is not a parameter |
| `010` · contrast and photocopy | The check that already exists for greyscale output |

**Where the work lands:**

| | What |
|---|---|
| `packages/core/src/pictograms/set.ts` | Reading a set directory; the "unusable set" cases, named |
| `packages/core/src/pictograms/match.ts` | **Deterministic lookup.** Override, then name check, then exactly-one-or-nothing |
| `packages/core/src/pictograms/apply.ts` | Insertion into the IR, scoped as she chose |
| `packages/core/src/render/attribution.ts` | The line no setting can remove |
| `instructions/pictograms.md` | The judgement: when this helps and when it marks a child out. Corpus, per Principle I |
| `ui/src/pictograms/` | Pointing at a set; the per-learner decision |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What pictograms are for, when they help, and the sentence about a fifteen-year-old who does not want a five-year-old's sheet: `instructions/pictograms.md`. The **insertion** is code because it is a lookup |
| **II** · deterministic core | The whole matching path is offline lookup with no model, and the isolation suite already walks `packages/core/src` |
| **III** · adapt the how, never the what | A pictogram beside «rana» in a vocabulary test **supplies the answer**, which is changing the what. That is the exam rule and it is a hard one |
| **IV** · one extraction, N outputs | Pictograms are per learner, applied after adaptation, so one extraction still serves N |
| **V** · barriers not diagnoses | **The sharpest instance in the project.** Every other family fires from an axis because reducing load is safe when unnecessary. This one adds to the page and is the most visible difference there is, so it fires from *her decision* and there is no code path where an axis reaches it |
| **VI** · traceability | `data-picto` records the id used. A wrong pictogram traces to a decision rather than to a mystery |
| **VII** · the draft announces itself | Unchanged, and the attribution sits beside it in the same derived-from-the-document place |
| **IX** · content is never instruction | A set is third-party data on her disk: ids and keywords are treated as data, paths are refused rather than sanitised, and no filename becomes a path we write to |

**Gate: passes, with one thing recorded rather than resolved.** SC-1605 — a
pictogram sheet legible in a real black-and-white photocopy — cannot be verified
here. Research R4 does what can be done (a minimum print size in the corpus, and
the word always beside the picture) and the rest needs a photocopier and a person.

## Phase 0 · Research

[research.md](./research.md): whether this is a recipe (it is not), what a "set" is
when nothing may depend on ARASAAC, where the attribution goes so it cannot be
removed, and what can be checked about greyscale before a person looks.

## Phase 1 · Design

[contracts/pictogram-set.md](./contracts/pictogram-set.md) — what a set must
provide, the unusable cases named, and the matching order.

## Sequencing

**The refusal before the feature.** SC-1601 — no ARASAAC asset in the repository,
asserted by a check — lands in Phase 1, before anything can insert a picture. A
licence assertion added after the feature works is an assertion written to fit
what already happens.

**Matching before rendering.** A wrong pictogram is worse than no pictogram, and it
is the failure she will not catch: she reads the text, and the child reads the
picture. So the omission-over-guessing behaviour is built and tested before
anything is drawn.

**The per-learner gate before either.** FR-1605 is the safeguard the whole feature
depends on, and building it last means building it around code that already fires
from something else.
