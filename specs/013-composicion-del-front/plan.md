# Implementation Plan: Composition

**Branch**: `013-composicion-del-front` · **Spec**: [spec.md](./spec.md)

## Summary

Three layers that do not exist: a page, a data hook, and an enforced boundary.

The screens are not wrong in a hundred small ways — they are each individually
reasonable and there is nothing above them. Fixing them one by one would produce a
clean release and the same problem next month, which is why US2 is P1 alongside
US1.

## Technical Context

No new dependencies. Nothing here needs a router, a store, or a component library.

| | What |
|---|---|
| `ui/src/shell/` | `Page`, `Section`, `Field`, `Actions`. Layout has one owner |
| `ui/src/styles/composition.css` | Rhythm, measure, weight. Separate from `components.css`, which stays about *what a thing looks like* rather than *where it sits* |
| `ui/src/data/` | One hook per domain over the IPC surface, with loading, error and empty resolved once |
| `packages/shell/src/ipc/` | `corpus.ts` split by subject |
| `packages/shell/src/jobs/` | Orchestration and IPC registration separated |
| `packages/core/test/` | The boundary test: nothing outside `shell` imports electron |

### What is deliberately not built

- **No router.** Five views and a `useState`. A router would be a dependency and a
  concept for a problem this application does not have.
- **No store.** The vault and the IPC surface hold the state. A client store would
  be a third copy of a truth that already has two, which is this project's
  recurring defect wearing a new hat.
- **No CSS modules or CSS-in-JS.** The token file and `styles.test.tsx` — which
  already catches a class used and never defined — are working. Changing the
  styling mechanism would be a rewrite justified by taste.
- **No pixel-diff suite** (FR-1114).

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Untouched: no adaptation policy moves |
| **II** · deterministic core | Untouched |
| **V** · barriers not diagnoses | The composition work must not make the axis strip read as a score card. It is the one screen where layout carries an ethical risk |
| **VI** · traceability | Untouched |
| **VII** · the draft announces itself | The draft mark must survive recomposition and stay the loudest thing on the review screen. Easy to lose while making a page calmer |
| **IX** · content is never instruction | Untouched |

**Gate: passes**, with one thing named. This feature touches every screen at once,
which is the shape of change that breaks things quietly. The mitigation is
FR-1113: screenshot before, screenshot after, look at both — and `010`'s existing
axe and layout gates run on every screen already, so a11y regressions fail loudly.

## Phase 0 · Research

None needed, and saying so beats inventing a document. The diagnosis is in
ADR 0009 and the six symptoms are named there with their causes.

## Phase 1 · Design

- [contracts/page-shell.md](./contracts/page-shell.md) — what a screen may decide
  and what it may not, for whoever writes the next one.

## Sequencing

**US1 and US2 together, and US1 first inside them.** Compose the shell by fixing
one real screen with it — the adapt screen, which is the worst and the one a
teacher opens first — then apply it outward. A shell designed in the abstract fits
nothing.

US3 is a test and a split, independent of the rest, and can land any time.

**Screenshots before anything.** They are the baseline for a change whose whole
success criterion is visual, and they take one command.
