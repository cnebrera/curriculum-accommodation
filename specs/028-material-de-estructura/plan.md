# Implementation Plan: Material de estructura

**Branch**: `028-material-de-estructura` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

The structural decision is that this feature is **two paths with two different costs**,
and the split is drawn where the constitution draws it:

- **Agendas and sequences are deterministic end to end** — Principle II in its purest
  form. There is no source document and no objectives, so there is nothing for a model to
  do: she selects and orders, code resolves the drawings through the *one* precedence
  that already exists (`match.ts`), code builds an IR document, and the renderers this
  project already has produce the strip. Zero provider, zero cost, fully offline.
- **The social story is a draft like everything else** — it enters at the same gates the
  adapt/compose jobs already pass: redaction chokepoint, cost recording, draft mark
  derived from the document, sign-off through the one existing IPC. It borrows the
  standard machinery rather than growing any.

Once the saved form is decided (research R1: structure material **is a job** —
`material/<job>/ir.md` stamped `for_learner`), most of the feature already exists:
`renderHTML` takes an IR and no profile, `attributionFor` is derived, `resolveDocument`
serves generated jobs, the record (`014`) and erasure (`003`) walk `material/` and pick
the new material up almost for free.

**MVP is US1 alone**: build and print an agenda, offline, at zero cost. US2 adds the
record and reprint; US3 adds the one path that spends money.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault, unchanged in shape. A structure job is `material/<job>/ir.md`
with `source: structure` — see research R1. **No new store, no sidecar file.**

**Testing**: `vitest` for the builder, the precedence reuse and the no-learner-facts
invariant; Playwright for the walks; `npm run shots` for the part no assertion answers.

| Feeds | What it gives |
|---|---|
| `018`/`024` · pictograms | `matchWord` and its four rungs (override ▸ vocabulary ▸ set ▸ nothing), `nameWords`, her vocabulary, `candidatesFor`, `pictogramImagesFor` — **the whole resolution problem is already solved once** |
| `023`/`025` · the set | `currentPictogramSet`, `publisherState`, the missing-set pointer pattern (FR-2303) |
| `007`/`010` · render | `renderHTML` (IR only, no profile), `checkPhotocopy`, `assertNoLearnerData`, the derived draft mark, `attributionFor` derived from the document |
| `021` · the document | `resolveDocument`/`startedFor` — a generated job already resolves, prints and signs through one path |
| `014` · the record | `entryFor` already lists a job started for a learner before it is adapted |
| `003` · erasure | The erasure planner asks `entryFor`, so what the record lists, erasure removes |
| `002`/`006`/`007` · provider path | `sendRedacted`, `recordCost`/`addCost`, the corpus loader — the story path reuses all of it |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/structure/build.ts` | The builder: items → IR document. Pure, deterministic, calls `matchWord` |
| `app/packages/core/src/ir/types.ts` | `isGenerated` accepts `source: structure` (one line — see research R1) |
| `app/packages/core/src/record/entry.ts`, `scan.ts` | A `structure` case in `RecordSource` |
| `app/packages/core/src/render/html.ts` | The two minimal templates as block classes + CSS (research R3) |
| `app/packages/shell/src/jobs/structure.ts` | Saving a structure job; drafting a story through the standard provider path |
| `app/packages/shell/src/ipc/structure.ts` | Thin handlers — a job does not register its own IPC |
| `app/ui/src/structure/` | The builder screen; hooks in `ui/src/data/` |
| `instructions/social-story.md` | The story's judgement — what a social story is, in Markdown she can read (Principle I) |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What a social story *is* — first person, short sentences, what may and may not be invented — goes in `instructions/social-story.md`, sent as the corpus, never a string in `jobs/`. The deterministic kinds contain **no pedagogical judgement in code**: which moments, which order and which drawing are all *her* decisions; code only assembles |
| **II** · deterministic core | **The feature's thesis.** Agendas and sequences call no model, need no key, run offline; `buildStructure` is a pure function in `core`, walked by the isolation suite. Only the story spends money, through the existing provider layer |
| **III** · adapt the how | Not falsifiable here for agendas — there is no *what* to falsify. For the story, FR-2611 is this principle: invented detail is declared as invented until she edits it |
| **IV** · one extraction, N outputs | The builder emits an **IR document**, so HTML, PDF, ODT and the linear renderers all work on structure material with no parallel pipeline. The templates are block classes in the one renderer, not a second renderer (research R3) |
| **V** · barriers not diagnoses | Nothing here keys on a diagnosis. The feature is *used mostly* for TEA learners; nothing in it *triggers* on TEA |
| **VI** · traceability | Every drawing records its `source` (`override`/`vocabulary`/`set`) through `matchWord`'s existing `Match`, and `data-picto` carries word→id as everywhere else |
| **VII** · the draft announces itself | The story is unsigned until she signs; the mark is **derived from the document** and removed only by the one existing sign-off IPC. Agendas and sequences pass through the **same** sign-off — a «born signed» shortcut would be a second way the mark disappears (research R4) |
| **VIII** · human-routed memory | Not engaged. No correction loop in v1; a story edit is an edit, not a memory event |
| **IX** · content is never instruction | FR-2610: the situation description is her instruction; anything she attaches is delimited content through the same annotation the adapt path uses. And structurally: the builder writes only inside the vault, the renderer takes no profile, ids pass the same allowlist |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-2605 needs a teacher.** Whether the week-one set replaces the scissors afternoon is
the only criterion that can come back «no» with everything green, and it is the one the
feature exists for.

**FR-2608 is the test to write first.** An agenda travels in a backpack — out of the
school, past every screen. The check that no structure rendering contains a learner fact
is written red before any render path exists, because a check written after the feature
works is a check written to fit what already happens.

## Phase 0 · Research

[research.md](./research.md) — four questions. R1 shapes the feature: structure material
is **a job**, so the record, erasure, printing and sign-off arrive without new machinery.
R4 found that «the story reuses the standard path» is nearly literal: the delta over a
compose-shaped job is one corpus file and one prompt assembly.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the structure document's front matter, the Item,
  and what deliberately gains no store.
- [contracts/structure-document.md](./contracts/structure-document.md) — the builder,
  the front matter contract, and the four rules every rendering keeps.
- [quickstart.md](./quickstart.md) — the walks, offline first, money last.

## Sequencing

**The no-learner-facts test before any render.** FR-2608/SC-2603 is the failure that
leaves the building: an agenda with a child's code on it in a backpack. Written red first.

**The precedence is reused, never rebuilt.** `matchWord` is the one mechanism
(`018` FR-1612 / `024` FR-2215). The builder calls it; a task asserts at source level
that no second lookup of the set exists outside `match.ts`. If a task here appears to
re-implement a rung, the task is wrong.

**US1 before US2 before US3.** The agenda is pure assembly and proves the whole
deterministic path; the sequence adds only persistence-facing behaviour (reprint,
record, erasure) on top of it; the story is the only part that needs a provider, and by
then the rendering, saving and signing it reuses are already exercised.

**`isGenerated` widens before any UI exists.** Printing, signing and the record all flow
through `resolveDocument`/`startedFor`; if structure jobs are not recognised as
generated, every later task fails confusingly at a distance from the cause.
