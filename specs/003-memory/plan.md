# Implementation Plan: Memory — corrections that do not have to be repeated

**Branch**: `003-memory` · **Spec**: [spec.md](./spec.md)

## Summary

Seven of this spec's twenty requirements are cited somewhere in `app/`. Thirteen
are cited nowhere — and the modules that would implement them (`memory/`,
`consolidate.ts`, `forget.ts`) exist and are used.

That combination is the specific state `007`'s audit was built for and found two
real defects in: **code that satisfies a requirement by coincidence is
indistinguishable from code that satisfies it by design, right up until somebody
changes it.**

So this is a verification plan with a construction tail: audit the twenty, and
build whichever turn out to be genuinely absent. The spec was written against
`/rampa-*` commands ([ADR 0006](../../docs/decisions/0006-one-vehicle.md) moved
the project to one vehicle), so part of the work is reading each requirement as
what it means in the application rather than dismissing it because the command
name is gone.

## Technical Context

No new dependencies. The modules exist; what is missing is knowing which
requirements they meet.

**Where the mechanisms are**, from a first pass:

| Area | Where |
|---|---|
| Scope of a correction, asked never inferred | `ui/src/review/ScopeQuestion.tsx` |
| Learner-scope → profile + dated note | `ipc/memory.ts`, `vault/profile.ts` |
| Practice-scope → `memory/house.md` | `ipc/memory.ts` |
| Corpus-scope → journal keyed by recipe | `memory/index.ts` |
| Selective load by recipe intersection | `memory/index.ts` `loadForRun` |
| Promotions and archiving, confirmed | `memory/consolidate.ts`, `notes/ConsolidateSection.tsx` |
| Erasure | `memory/forget.ts` |
| `memory/` git-ignored except README | `.gitignore` + the commit hook |

**Read as the application, not as a command**: FR-201's `/rampa-review` is the
review screen; FR-206's `.rampa/index.md` is whatever the application generates
deterministically from journal front matter; FR-211/213/215's `/rampa-memory` is
the notes screen and its actions.

Recording that mapping is part of the deliverable, because the next person to read
this spec will otherwise conclude half of it was abandoned.

## Constitution Check

**Principle VIII is this spec**: *"memory is human-routed."* Nothing is promoted,
generalised or forgotten without a person saying so, and the check that matters is
whether each write to memory has a confirmation in front of it that a code path
cannot skip.

**Principle V** is load-bearing here too. A journal entry records a *pattern*
("checkboxes did not work for a learner who counts them as content"), never the
passage that produced it — because a stored passage is a stored piece of a child's
worksheet, and the journal is the one part of memory designed to be shared.

**Gate: passes.** One thing named: FR-212's de-identification rewrite "visible to
the confirming human" is the only requirement here whose correctness depends on a
model's output being *good*, not merely on it being reviewed. If the rewrite is
poor, the human sees a poor rewrite and can reject it — which is the right shape,
and it is worth being explicit that no test can check the rewrite is *sufficient*.

## Phase 0 · Research

None. Nothing here is an open technical question; the question is what already
holds.

## Phase 1 · Design

- [contracts/coverage.md](./contracts/coverage.md) — per requirement: what
  enforces it, what pins it, and whether it is met, partly met, or absent.

## Sequencing

The thirteen uncited requirements first, in spec order, because a requirement
nobody has referenced is the most likely to be unmet. Then the seven cited ones.
Then build what is absent.
