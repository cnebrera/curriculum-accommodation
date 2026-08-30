# Implementation Plan: One worksheet, several learners

**Branch**: `005-group` · **Spec**: [spec.md](spec.md) · **Date**: 2026-08-30

## Summary

Make `job:adapt` take a list of learners instead of one, run them sequentially,
and let each succeed or fail on its own.

That is genuinely most of it, and the smallness is the point: the vault layout
was corrected for this in August (T092b), `runAdaptation(jobId, learnerCode, …)`
is already per-learner and already writes to `material/<job>/<code>/`, and
`jobLearnerDir`, `jobAdapted` and `outputDir` all take a code. **Nothing about
the data model changes.** What is missing is a caller that passes more than one
code, and a screen that lets her choose them.

The work that is *not* small is failure isolation and the review flow, and that
is where the tasks are weighted.

## Technical Context

| | |
|---|---|
| **Language** | TypeScript, Node 24, Electron 38, React 19 |
| **Entry point** | `runAdaptation()` in `packages/shell/src/jobs/adapt.ts` — unchanged |
| **New orchestration** | `runBatch()` beside it, which loops and isolates |
| **Wiring** | `packages/shell/src/ipc/adapt.ts` — `job:adapt` gains a list |
| **Screens** | `AdaptScreen` (choose), `ReviewScreen` (sign, one at a time) |
| **Data layer** | `ui/src/data/jobs.ts` — `useAdapt` becomes batch-aware |
| **Storage** | No change. `material/<job>/<code>/` already exists per learner |
| **Tests** | vitest for the batch semantics, Playwright for the flow |
| **New dependencies** | None |

**No NEEDS CLARIFICATION.** Five were resolved in `/speckit-clarify`; the answers
are in the spec's Clarifications section with their sources.

## Constitution Check

| Principle | How this feature stands against it |
|---|---|
| **I** · judgement in Markdown | Untouched. No adaptation policy moves; the same `instructions/` are read once per learner |
| **II** · deterministic core | The batch loop is deterministic and belongs in code. The **order** of learners must not affect any learner's output — asserted, because a shared mutable accumulator across iterations is the obvious way to get this wrong |
| **III** · adapt the how | Untouched |
| **IV** · one extraction, N outputs | **This feature is Principle IV.** It has been a directory layout and a comment since August, and nothing has ever exercised it |
| **V** · barriers not diagnoses | **Live risk.** Three learners on one screen is the first place in this application where children appear side by side. `015` FR-1310 forbids their axes as aligned columns; the batch progress and the review list must not become that by accident |
| **VI** · traceability | Each sheet keeps its own full report and its own provenance, including the recipe versions in force at *its* run |
| **VII** · the draft announces itself | **The sharpest risk here.** A batch invites «firmar todo», which is one click and a claim she read three worksheets. FR-512 forbids the control; the plan forbids the affordance |
| **VIII** · human-routed memory | A correction captured while reviewing Lucía's sheet is scoped by `003`'s existing question and reaches Lucía. Unchanged, but worth asserting: a `learner`-scoped note must not leak to the other two |
| **IX** · content is never instruction | Unchanged. One extraction means the untrusted content is annotated once instead of three times, which is strictly better |

**Gate: passes**, with two named and carried into tasks: the sign-off affordance
(VII) and the side-by-side presentation of children (V).

## Phase 0 · Research

Nothing to research. This is the rare feature where the unknowns were removed by
earlier work rather than by investigation: the layout question was settled in
T092b, the sequencing question in clarification, and there are no new
dependencies, no new file formats and no new provider behaviour.

Recorded as a decision rather than skipped — [research.md](research.md) says so
and says what would have needed research if T092b had not happened.

## Phase 1 · Design

- [data-model.md](data-model.md) — what a batch is, and why it is not stored.
- [contracts/job-batch.md](contracts/job-batch.md) — the IPC change, including
  what happens to the old single-learner shape.
- [quickstart.md](quickstart.md) — how to prove it end to end.

## Sequencing

1. **Batch semantics in the orchestration layer, with tests.** `runBatch()`,
   isolation, order-independence. No screen involved, so the hard part is done
   where it is cheapest to get right.
2. **The IPC surface**, and the data-layer hook.
3. **Choosing learners** on the adapt screen.
4. **Reviewing and signing** N sheets — the phase carrying both constitutional
   risks.
5. **The record** (`014`) — deliberately last and deliberately optional: this
   feature ships writing files where they already go, and gains record entries
   when `014` exists.

## Complexity Tracking

No violations to justify. The one thing worth naming: `runBatch` is a new
function rather than a loop inside `job:adapt`, and that is on purpose —
FR-1111 says wiring registers channels and orchestration decides what happens,
and «what happens when the second of three fails» is emphatically orchestration.
