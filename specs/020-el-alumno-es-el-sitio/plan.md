# Implementation Plan: El alumno es el sitio — la navegación

**Branch**: `020-el-alumno-es-el-sitio` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-01

## Summary

The first specification in this project that changes **nothing about what Rampa does**
and everything about where it is. Nineteen features built the parts; nobody specified
where the parts live, so each attached itself wherever it was cheapest — and the record
of a child's work ended up as the fifth card under an edit-profile form.

The work is therefore mostly **subtraction and relocation**, with two genuinely new
pieces: a route that knows what «inside a learner» means, and one field on disk that
says which learner a job started out for.

That second one is the finding from Phase 0 and it is the only place this feature
touches data rather than layout — see [research.md](./research.md) R3.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault, unchanged, plus one front-matter field on `material/<job>/ir.md`.

**Testing**: `vitest` for the route reducer and the split screens; Playwright for the
routes she actually walks; `axe` inside the e2e for every destination.

**Target Platform**: the desktop shell, at every width and text scale it allows.

| Feeds | What it gives |
|---|---|
| `015` · the caseload | Filters, search, facets, grouping — **already built**, and it becomes the opening screen rather than a section |
| `014` · the record | `Lo que le he preparado`, in full, including yesterday's freshness marker (`005` FR-520) |
| `016` · the door | Its two branches and the kind picker move inside the learner. Its `intent` reducer is where the route pattern comes from |
| `017` · the guide | Four screens that already take a learner and are already reached from one |
| `008` · ingest | `ingest:pending` already walks `material/` once, which is what FR-1828 needs |
| `013` · the front | The `Page` shell, the data layer, the container queries a second column needs |

**Where the work lands:**

| | What |
|---|---|
| `ui/src/nav/route.ts` | `Route`, `reduceRoute` — one place that knows where she is |
| `ui/src/nav/TopRail.tsx` | Two destinations and the existing foot |
| `ui/src/nav/LearnerShell.tsx` | The learner's heading, their menu, and what is inside |
| `ui/src/learners/` | The caseload splits from the learner's sections |
| `ui/src/prepare/` | The two branches, and the flow's five steps |
| `ui/src/settings/` | `Configuración`, with «Acerca de» and the house style inside |
| `packages/shell/src/jobs/ingest.ts` | Writes `for_learner` (R3) |
| `packages/shell/src/ipc/ingest.ts` | `ingest:pending` returns the learner |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Untouched. This feature moves screens; no recipe, axis or corpus file changes. The one risk is a *new* place that hard-codes a judgement, and there is none — the kind picker keeps reading `material-kinds.md` |
| **II** · deterministic core | The route reducer is pure and tested like `reduceIntent`. No model anywhere in this feature |
| **III** · adapt the how, never the what | Not engaged, except that `017`'s ACS refusals must still refuse after the move — asserted, not assumed |
| **IV** · one extraction, N outputs | **The load-bearing one.** A flow entered through one learner must still serve several, so the «who else?» step is not a nicety: without it this redesign would quietly make the classroom's common case an afterthought, which is exactly what `016` FR-1412 forbids |
| **V** · barriers not diagnoses | The caseload is the screen this principle is about. `015` FR-1309/1310/1311 hold: no ordering by axis, no aligned columns, no summary of a child |
| **VI** · traceability | `for_learner` is provenance, not a new fact: it records what she chose at the start, which is currently only inferable after the fact from a directory |
| **VII** · the draft announces itself | Sign-off stays per sheet. A menu that reaches five sheets must not grow an action that signs them |
| **VIII** · human-routed memory | Splitting the notes screen by `scope` **shows** what she already routed. Nothing infers a scope, and nothing moves an entry between scopes |
| **IX** · content is never instruction | Untouched. No new ingestion path |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-1803 needs a teacher.** «A teacher who has not seen Rampa finds *prepare something
for this child* without being told.» That is the criterion that decides whether this
worked, and no test I can write substitutes for it. It is also collectable **once** —
the second time she looks she already knows.

**SC-1805 has to be looked at.** `013` FR-1113/FR-1118 exist because a layout can be
written correctly and be wrong on screen. A second column at the narrowest width with
the text scale at `xlarge` is precisely that case.

## Phase 0 · Research

[research.md](./research.md) — six questions. The one that changes scope is **R3**: an
ingested job has never recorded which learner it is for, so «mark the learner who has
work half-finished» needs a field that does not exist. It also found that half of that
field already exists under another name (`composed_for`, from `002`), which makes it a
unification rather than an addition.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `Route`, the learner's sections, and `for_learner`.
- [contracts/navigation.md](./contracts/navigation.md) — every destination, what may
  reach it, and the four rules the shell must keep.
- [quickstart.md](./quickstart.md) — the walks that prove it, offline first.

## Sequencing

**US1 before US2, and US1 removes nothing.** The caseload becomes the opening screen and
the learner gets their sections while «Preparar material» **stays in the top rail**.
That ordering is what lets this ship in pieces without ever handing Carlos a tool where
the work cannot be done: the door is removed in US2, when its replacement exists.

**The route reducer first, before any screen moves.** Both navigation defects this
project has already found — the door forgetting the child on «Volver», and «Mis alumnos»
doing nothing from inside a profile — were navigation state held in the wrong place.
Moving twenty destinations on top of that same mistake would produce twenty of it.

**`for_learner` before the caseload marker.** Writing the field is one line; reading it
in a screen that then has nothing to read is the sort of half-built path this project
keeps finding. It goes in first, with the migration answer (R3) decided rather than
discovered later.

**The e2e helper is rewritten with US1, not after.** `e2e/door.ts` is the single place
that knows how to walk to a screen. Rewriting it as `e2e/nav.ts` at the start means
every later step is verified by a suite that already agrees with the new shape.
