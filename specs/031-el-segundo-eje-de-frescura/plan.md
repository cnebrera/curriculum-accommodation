# Implementation Plan: El segundo eje de frescura

**Branch**: `031-el-segundo-eje-de-frescura` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One structural decision decides this feature, and G35 already made it: **there is ONE
freshness model with two axes — the reading and the drawings — everything derived at the
moment somebody asks, and nothing stored.** No `stale` flag, no event log, no date that
moves (FR-2901). A sheet is stale by drawing exactly when re-making it now would put a
different drawing — or none — where a recorded one is. That definition is a comparison
between two things that are both already on disk: what the sheet recorded (`data-picto`)
and what the current resolution says (`matchWord` over her vocabulary, the learner's
override and the set).

**Why an event log would be incorrect, not merely redundant — the A→B→A case.** She
chooses drawing A for «casa» in September, B in October, A again in November. An event
log records two changes after the September sheets were made, so any log-derived answer
marks them stale — but re-making those sheets today reproduces A exactly. They *are*
current, and only a derivation against the current resolution can say so. The log gives
the **wrong answer**, on top of being a second copy of a truth the filesystem holds
(`014` SC-1203), a file erasure would have to visit, and a thing a handover would have to
either carry or lose. `005`'s own history repeats the warning from the other side:
backlog G23's date-stamp option marked every sheet stale on every confirmation. Anything
that counts *events* instead of comparing *states* fails one of these two ways.

**And one honest correction from Phase 0** (research R1): the spec assumes «the datum is
already in `data-picto`» — it is in the in-memory document and in G35's reading of the
code, but `adapt.ts` writes the **pre-mutation raw string** to `adapted.md`, so the pairs
never reach the sheet of record. Making the datum load-bearing therefore starts by making
it *exist on disk*, which is a bounded, deterministic fix in the write path — and it is
why the vault format marker (P50, COLA 1.17) is a declared prerequisite of this plan, not
something it implements.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault. Two changes, both provenance and neither of them state:
`data-picto` pairs actually persisted into `adapted.md` (they were computed and dropped),
and the per-sheet format version stamped under P50's convention so «no record» and «no
drawings» stop being the same absence. **No staleness is ever written** — SC-2903 is a
byte-wise invariant over the whole vault.

**Prerequisite**: **P50 / COLA 1.17 — the vault schema version marker — lands first.**
This spec makes a stored format load-bearing and wants the version marker under it
(spec Assumptions). This plan *uses* the marker's convention; it does not build it.

**Testing**: `vitest` over a seeded vault for the precision/recall invariant (SC-2901)
and the byte-wise invariant (SC-2903); Playwright for the warning-equals-record walk
(SC-2902); a text-and-behaviour guard for SC-2904.

| Feeds | What it gives |
|---|---|
| `005` · group | The one-axis freshness this extends: `readingFingerprint`, `freshnessOf`, `from_extraction`, and the rule that a stale sheet is never deleted or un-signed (`005` FR-511, FR-520) |
| `014` · the record | `entryFor` — the single place freshness is derived — and SC-1203's nothing-is-stored principle |
| `018`/`024` · pictograms | `matchWord`'s rung ladder (override → vocabulary → set), `data-picto`'s word→id format, `parsePicto`, her `vocabulario.md` |
| `020` · navigation | FR-1828's cost rule: one walk of `material/`, never one per learner |
| P50 · COLA 1.17 | The vault/sheet format version marker this plan stamps and reads — prerequisite, not built here |
| `026` · the conversation | Consumes this model's answer for «iterating a stale sheet warns»; nothing here special-cases it |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/ir/freshness.ts` (new, absorbing `reading.ts`'s answer) | The one two-axis derivation: `sheetFreshness(sheet, current)` |
| `app/packages/core/src/pictograms/apply.ts` | `stampPicto` — the deterministic patch that writes the pairs into the raw sheet before it hits disk |
| `app/packages/shell/src/jobs/adapt.ts` | Persist `data-picto` + the format stamp at the same moment `from_extraction` is stamped |
| `app/packages/core/src/record/scan.ts` | `entryFor` derives both axes from documents it already holds — the same one place |
| `app/packages/shell/src/jobs/stale.ts` | The verification surface reads the same deriver |
| `app/packages/shell/src/ipc/pictograms.ts` | New IPC `pictograms:affected` — the exact count before a change (see contracts/) |
| `app/ui/src/pictograms/ChooseWord.tsx`, `MyVocabulary.tsx` | The pre-change warning, and the false sentences replaced by true ones |
| `app/packages/core/src/pictograms/vocabulary.ts` | `renderVocabulary`'s prose in her vault file stops saying «no sé avisarte» |
| `specs/005-group/data-model.md`, `specs/024-el-juego-entero/spec.md`, `specs/BACKLOG.md` | FR-2907's amendments |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Not engaged as policy: «is this sheet current?» is a fact, not pedagogy. The sentences shown to her live where the existing freshness sentences live, and `vocabulario.md`'s corrected prose stays a file she can read |
| **II** · deterministic core | The whole feature is string comparison over files already on disk. No model, no network, no key. The seed-vault test runs offline |
| **III** · adapt the how, never falsify the what | Staleness is **information**, never action: nothing re-runs, nothing rewrites (`005` FR-520's third clause, kept) |
| **IV** · one extraction, N outputs | The recorded pairs live on the adapted IR; every rendering reads them from there. No modality gets its own freshness |
| **V** · barriers not diagnoses | Not engaged. Codes, never names, in every row this produces — as `stale.ts` already does |
| **VI** · traceability | **The feature is this principle applied to time**: `data-picto` records which drawing, `from_extraction` records which reading, and staleness names the word so she knows *why* |
| **VII** · the draft announces itself | Untouched, and guarded: FR-2904 — staleness never alters a signature. A stale signed sheet stays signed; the signature belongs to the sheet it was given to (`005` FR-511) |
| **VIII** · human-routed memory | Nothing re-runs on its own. She is told what a change implies **before** it, and re-making stays her decision, one sheet at a time |
| **IX** · content is never instruction | `data-picto` values pass the same id allowlist on the way in; the deriver only ever compares strings, never executes or resolves paths from them |

**Gate: passes.** One reservation recorded rather than resolved: **FR-2901 forbids stored
flags, and `005`'s data-model.md documents a `stale_since` front-matter stamp** that was
never built (what shipped is derived, per `reading.ts`'s own docstring). The FR-2907
amendment corrects that document to describe reality *and* the second axis — leaving it
saying `stale_since` while this spec forbids stored flags would be the fifteenth thing
two places disagree about, which is the exact defect G35 was opened to prevent.

## Phase 0 · Research

[research.md](./research.md) — four questions. R1 is the one that reshapes a task: the
datum this feature stands on is computed and then **dropped before the write**, so
persisting it is the first foundational task, and the honest-unknown path (FR-2906)
covers every sheet in every existing vault, not only pre-`024` ones. R2 keeps the
project's unicity rule: the comparison extends the answer `entryFor` already derives —
one deriver, called from the places that already ask.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `Freshness` with two axes, what is persisted
  (provenance only), and what deliberately gains no field.
- [contracts/affected-sheets.md](./contracts/affected-sheets.md) — the one new IPC:
  the exact count, from the same deriver, before she confirms.
- [quickstart.md](./quickstart.md) — seed vault first, invariants before screens,
  nothing here costs money.

## Sequencing

**The precision/recall test before the model exists.** SC-2901 is an invariant (1.0 and
1.0, exactly the sheets that carried the word), and a check written after the deriver
works is a check written to fit what it already does. It is red first, over a seed vault
whose ground truth is written by hand.

**Persisting the datum before deriving from it.** Until `data-picto` reaches
`adapted.md`, the deriver has nothing to read and every sheet is `unknown` — true, but
untestable for the interesting cases. T003/T004 block everything behind them.

**The byte-wise invariant lands with the deriver, not after it.** SC-2903 is the
structural form of FR-2901: if any task quietly writes a flag, this test is what catches
it the same day. It is also the cheapest test in the feature.

**US1 before US2.** The record telling the truth is the substance; the warning at the
moment of change is its echo, and FR-2905's count must equal what the record shows — so
the record's deriver has to exist before the warning can share it.

**The documentary amendments land in this feature, not «later».** FR-2907 is a
requirement precisely because the last time behaviour and documentation diverged here,
the fix shipped was a lie in three places (G37). The false texts are corrected in the
same phase that makes them false-no-longer.
