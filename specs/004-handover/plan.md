# Implementation Plan: Handover — what one teacher learned, without it becoming a label

**Branch**: `004-handover` · **Spec**: [spec.md](./spec.md)

## Summary

**None of this spec's fourteen requirements is cited anywhere in `app/`**, and
`packages/core/src/memory/handover.ts` implements a good deal of it. That is the
worst of the three states this project's audits have found: code with no trace to
the requirement it serves, so nobody can say which requirements it meets and
nobody notices when it stops meeting them.

A first read says the **sending** half is largely built and the **receiving** half
does not exist at all. The spec is explicit that the receiving half is the hard
one — *"moving the files is the easy half; the hard half is the receiving teacher
not believing them more than they should"* — and it is the half that protects a
child from being held inside last year's description of them.

So: audit what exists, fix what is wrong, and state plainly what is missing rather
than implying the feature is done because a module exists.

## Technical Context

No new dependencies. `handover.ts` exists; `memory:handover` exposes it.

**What a first read suggests**, to be confirmed or refuted by the audit:

| | State |
|---|---|
| Packet with claims, dates, evidence markers | built |
| Prose-first rendering, no tooling needed | built |
| Staleness past one academic year | built |
| No re-identifying mapping | built by construction — the packet carries codes |
| States that it supplements the official file | built |
| `axes_confirmed` fallback | **suspect**: falls back to *today* |
| The shareable variant | **suspect**: strips every claim, so it can only ever be empty |
| Review before sending | absent |
| **Import, confirmation state, decline** | absent — the entire receiving half |

## Constitution Check

**Principle V is why this spec is delicate**: *barriers, not diagnoses*. A packet
is the point in the system where a description of one child crosses to a teacher
who has never met them, and the failure mode is not a leak — it is a **label**. A
packet believed wholesale means the new teacher stops observing, and some children
change precisely because last year's adaptation worked.

Every mechanism here is therefore about *weakening* the packet's authority:
evidence markers, `unconfirmed` on import, staleness, and the ability to decline.
None of those is a feature in the usual sense; each is a deliberate reduction in
how much the document is allowed to mean.

**Principle VIII** applies at the boundary: nothing inherited may be promoted to
fact without the receiving teacher confirming it.

**Gate: passes**, with one thing named. `buildPacket` marks every claim
`evidence: 'observed'`, including axis levels, which is a claim about how the
sending teacher knew — and the application cannot know that. A test can check the
marker exists; only a human can check it is true. Recorded, not papered over.

## Phase 0 · Research

None. The question is what holds, not what to build.

## Phase 1 · Design

- [contracts/coverage.md](./contracts/coverage.md) — per requirement, what
  enforces it, what pins it, and its state.

## Sequencing

The sending half first, because it exists and may be wrong. Then a decision on the
receiving half, stated as a decision rather than left as an omission.
