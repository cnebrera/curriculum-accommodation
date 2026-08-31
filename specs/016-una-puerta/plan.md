# Implementation Plan: One door — the work she is doing, not the file she has

**Branch**: `016-una-puerta` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-08-31

## Summary

The spec is unusually clear about what this is: **a door, not a capability**. Every
adaptation and composition behaviour it needs already exists. So the plan's main
job is to say what must *not* happen — because the failure mode of a feature like
this is that it grows a small adaptation behaviour of its own, and FR-1410 exists
to forbid exactly that.

What is actually missing, after `002` shipped this morning:

| Missing | Where |
|---|---|
| A first screen that asks **learner → work → material** | `ui/src/door/` |
| A compose screen: objectives, anchor, how many | `ui/src/compose/` |
| `job:compose` on the IPC surface | `packages/shell/src/ipc/compose.ts` |
| The exam constraint stated **before** running (FR-1405) | `ui/src/adapt/`, `ui/src/door/` |
| «Adaptar una ficha» in the rail, which FR-1402 forbids | `ui/src/i18n/es.ts`, `App.tsx` |
| Reuse from a record row (US4, P3) | `ui/src/learners/RecordScreen.tsx` |

## Technical Context

No new dependencies. Three specifications feed this one and all three have
shipped:

| Feeds | What it gives |
|---|---|
| `002` · compose | `runCompose`, which writes an ordinary `ir.md` that `runAdaptation` then takes unchanged. The compose branch is therefore *two existing jobs in sequence*, not a new pipeline |
| `012` · material kinds | The four kinds as corpus, with `forbids` per kind — which is what FR-1405 renders |
| `014` · the record | Where finished work lands, derived rather than stored, so nothing here has to maintain it |

**What already exists and must not be rebuilt.** `AdaptScreen` already holds
several learners (`005`) and already refuses to default the kind (`012` FR-1001).
The door's job is to reach it with those two answers already given, not to ask them
again on a second screen.

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The door contains no judgement. The kinds and their prohibitions are read from `instructions/material-kinds.md`; the two doors' own wording is interface copy, which is the one category of Spanish that belongs in `i18n` |
| **II** · deterministic core | The door makes no provider call at all. Both branches end in a job that does |
| **III** · adapt the how, never the what | Untouched: this feature adds no adaptation behaviour (FR-1410) |
| **IV** · one extraction, N outputs | **The tension this feature was clarified around.** Learner-first was chosen against my recommendation, and the cost is that one child is asked about before the others. The resolution is FR-1411: the learner chosen first is the *first* learner. The control that adds the rest is in the flow, not a repair to it |
| **V** · barriers not diagnoses | The door shows learners by name and course. **No axis appears in a door screen**, and `015`'s filter still accepts no axis, so there is nowhere for one to go |
| **VI** · traceability | Both branches produce a job whose provenance checks are the existing ones |
| **VII** · the draft announces itself | The compose branch's material carries the louder mark `002` T016 added |
| **IX** · content is never instruction | The anchor she types is material, and `002` T018's detectors run over it. The door's only new job is to *show* what they found (FR from `002`, surfaced here) |

**Gate: passes.** One reservation recorded rather than resolved: SC-1406 («puedo
hacer varias cosas aquí») is judged by a person, once, and nothing in this plan can
substitute for that.

## Phase 0 · Research

[research.md](./research.md) — three questions: what the first screen actually
shows when she has forty learners, whether the compose branch needs its own review
screen, and where the exam sentence goes so she reads it rather than passes it.

## Phase 1 · Design

[contracts/door.md](./contracts/door.md) — the `Intent` the door produces, and the
one rule about it: it is data, and every screen downstream reads it rather than
re-asking.

## Sequencing

**The compose branch before the door's polish.** `002` is finished code that no
teacher can reach, and SC-1403 measures exactly that. A door that looks better but
still cannot reach it would be the same failure with nicer typography.

**Reuse from the record last (P3).** It is a shortcut into the same door; nothing
depends on it, and it is the one part that can be cut without the feature losing
its point.
