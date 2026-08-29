# Implementation Plan: Phase 0 — adapt one worksheet end to end

**Branch**: `001-phase-0-worksheet` · **Spec**: [spec.md](./spec.md)

## Summary

**This spec's deliverable is not code. It is an answer.**

Its own opening says so: *"the smallest slice that answers the only question that
matters right now: does a real special-education teacher find the output usable
with minor edits?"* Fifteen functional requirements exist to make that question
askable, and every one of them is delivered by `006`, `007` or `008` — the
application, the untrusted-content defences, and the ingest path.

So there is nothing to build here, and saying that plainly is the work. What this
plan produces is: a **trace** from each of the fifteen requirements to the
mechanism that meets it and the test that pins it, and an honest statement that
SC-001 — the one criterion this spec exists for — remains unmeasured because no
teacher has used it.

A spec whose requirements are met by other specs and which nobody has closed reads
as unfinished work. It is not. It is finished work waiting on a person.

## Technical Context

No new code. The trace, and the gaps the trace exposes.

**Where the fifteen live**, from a first read:

| | Delivered by |
|---|---|
| FR-001/002 · profile from a conversation, `null` for unobserved | `006` — the profile editor and axis scoring |
| FR-003/004/005 · IR, numbering verbatim, unreadable flagged in place | `008` — the converter and validator |
| FR-006 · refuses to adapt while unverified | `008` T021, per page and derived |
| FR-007 · recipes by axes only, no diagnosis | `006` — `selectRecipes` |
| FR-008 · provenance on every changed block | `007` FR-512, two functions |
| FR-009 · report grouped by decision | `010` — `ReportView` |
| FR-010 · escalate when the *what* would change | corpus — `hard-rules.md` |
| FR-011 · assessment blocks: presentation only | corpus — the exam-access recipe |
| FR-012 · the draft mark until review | `007` FR-509 — **which the audit found broken** |
| FR-013 · deterministic scripts offline, no key | `007` FR-511 — module-graph isolation |
| FR-014 · degrade to fewer modalities, never silently | `006` |
| FR-015 · the commit hook blocks learner material | `003` FR-214 |

## Constitution Check

Every principle this project has is exercised by this spec, because this spec is
the whole journey. Nothing new to check: the audits in `007`, `003` and `004`
covered the principles, and `006`'s 96 tasks covered the mechanics.

**Gate: passes.** One observation rather than a violation: three of these fifteen
requirements were found broken by audits written for *other* specs — FR-012 by
`007`'s pass, and the memory half of the loop by `003`'s. A requirement traced to
nothing gets checked by nobody, which is the argument for this plan existing at
all rather than being waved through as "covered elsewhere".

## Phase 0 · Research

None.

## Phase 1 · Design

- [contracts/trace.md](./contracts/trace.md) — the fifteen, with mechanism and
  test, and what remains unmeasured.

## Sequencing

One phase. Then it waits for a teacher, and the waiting is the honest state rather
than an unfinished one.
