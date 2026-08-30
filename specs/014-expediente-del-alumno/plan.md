# Implementation Plan: The learner's record

**Branch**: `014-expediente-del-alumno` · **Spec**: [spec.md](spec.md) · **Date**: 2026-08-30

## Summary

Give each learner a list of everything ever made for them, derived by scanning
the vault, with every row opening the source, the read text and the output.

The files do not move. `material/<job>/<code>/` already holds one adaptation per
learner and `005` now puts several codes under one job routinely, so the data
this feature displays is already being written. What is missing is the direction
of travel: today you can ask a *job* who it served (`job:learners`) and there is
no way to ask a *learner* what they have been given.

## Technical Context

| | |
|---|---|
| **New core module** | `packages/core/src/record/` — scan, entry shape, and the Markdown rendering. Deterministic, offline, no model (Principle II) |
| **New IPC** | `record:forLearner(code)`, `record:rebuild(code)`, `record:search(query)` |
| **New screen** | The learner's record, reached from `LearnersScreen` |
| **Storage** | `profiles/<code>/record.md`, **written and never read back** |
| **Index** | None in v1 — see below |
| **Erasure** | Extends `003`'s `planForget`/`executeForget` |
| **New dependencies** | None |

## The three decisions that shape everything

**1. Derived, never stored.** The record is a view over the vault. Deleting
`record.md` and reopening the learner produces the same list (SC-1203). This is
the requirement the rest of the design serves, and it exists because a record the
application *reads* would be a second copy of a truth that already has one —
which is this project's recurring defect, found four times so far.

**2. No index in v1.** FR-1214 permits a cache under `.rampa/`; SC-1207 asks for
400 jobs without a perceptible wait. Reading front matter from 400 directories
is milliseconds, so the cache is not built. A cache added before a measurement
asks for it is the same defect wearing a performance costume.

**3. `record.md` is written for her and read by nobody.** It exists so the vault
tells the same story in Obsidian, which is the promise `006` made and which
Carlos relies on personally. The application never parses it. FR-1213.

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Untouched — a record is a fact about what happened, not a judgement about how to adapt |
| **II** · deterministic core | The scan, the entry shape and the search are pure functions over file contents. No model anywhere near this feature |
| **III** · adapt the how | Untouched |
| **IV** · one extraction, N outputs | **Load-bearing.** One source appears in several learners' records, linked and never copied. The naive "file everything under the learner" would break it, and `005` has just made multi-learner jobs the normal case |
| **V** · barriers not diagnoses | A record lists *work*, not the child. No axis values, no progress, no counts of how much a learner needed |
| **VI** · traceability | This feature is traceability made visible: every row resolves to what was given, what was read, and what came out |
| **VII** · the draft announces itself | An unsigned sheet appears in the record **marked unsigned** (clarification). Hiding it would mean the one thing she cannot find is the thing she abandoned halfway |
| **VIII** · human-routed memory | Untouched |
| **IX** · content is never instruction | **Named.** The record renders titles and subjects taken from *ingested material*, which is attacker-controllable. It is rendered as text, never as Markdown that could carry a link or an image, and `007`'s existing defences apply |

**Gate: passes**, with two carried into tasks: Principle IX on rendered titles,
and Principle V on what a record may not show.

## The hard part

Not the scan. **Erasure.**

`003` deletes a learner. With `014`, "everything of theirs" includes their
adaptations, their renders and their record — and *excludes* a shared source that
another learner still references, while *including* one that nobody does any
more. Getting that backwards either destroys another child's material or leaves
an orphaned photograph of a worksheet in her folder for ever.

That is FR-1210/1211, it is the only genuinely subtle logic in this feature, and
it gets its own phase with its own tests.

## Phase 0 · Research

[research.md](research.md) — one real question (what "the original" is when there
is no file), and the reasoning against an index.

## Phase 1 · Design

- [data-model.md](data-model.md) — the entry, and what is derived from what.
- [contracts/record.md](contracts/record.md) — the IPC surface and the
  `record.md` format.
- [quickstart.md](quickstart.md) — proving it, including the erasure case.

## Sequencing

1. The scan and the entry, in `packages/core`, with tests. No IPC, no screen.
2. `record.md`, written and never read.
3. The IPC surface and the data-layer hook.
4. The screen.
5. **Erasure** — last, because it needs everything above to exist to be wrong about.
6. Search.

## Complexity Tracking

One thing to justify: the scan reads every job directory to answer one learner's
question, which is O(jobs) for a screen. Accepted, measured by SC-1207, and the
alternative — an index — is refused above for a reason stronger than performance.
If the measurement fails, the cache is the fix and FR-1214 already allows it.
