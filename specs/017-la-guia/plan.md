# Implementation Plan: The guide — reading it, honouring it, and helping write it

**Branch**: `017-la-guia` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-08-31

## Summary

The last unbuilt specification, and the one with the sharpest asymmetry in the
project: **US2 is a rendering of work that already exists, and US4 touches a child's
curriculum.** They are in the same feature and they are not the same risk, so the
plan sequences them at opposite ends and the locks on the second one are structural
rather than cautious.

Unblocked on 2026-08-31 when the DPO prerequisite was retracted — see
[research.md](./research.md) R1. What survived is one requirement, FR-1509: say what
leaves the machine before it leaves.

## Technical Context

No new dependencies. Almost everything this needs already ships:

| Feeds | What it gives |
|---|---|
| `003` FR-209 · the overlay | `profiles/<code>/adaptations.md`, which already exists, already outranks the recipes, and already declares that its text is content and not orders. **The floor**: a teacher can type the measures today |
| `008` · ingest | PDF, photograph, Word, and the per-page verification gate. FR-1505 says a guide uses it unchanged — a parallel path would be the pipeline Principle IV forbids |
| `007` · untrusted content | The injection and hidden-text detectors, over the largest untrusted surface this application will have |
| `014` · the record | What an ACNS draft is assembled *from*. US2 cannot ship before it, and it shipped |
| `019` · the linear renderer | The draft mark and «named, never guessed» — the same shape as a section this feature cannot source |
| `011` · education | Course and stage for the document's own header |

**Where the work lands:**

| | What |
|---|---|
| `packages/core/src/guide/read.ts` | Extraction → `Measure[]`, and **the clinical filter**, in code |
| `packages/core/src/guide/overlay.ts` | Confirmed measures → the overlay's Markdown, with the heading that makes FR-1512 possible |
| `packages/core/src/guide/acns.ts` | The ACNS draft: assembled from `014`, with unsourceable sections **named** |
| `packages/core/src/guide/refuse.ts` | `checkDeclines` — the ACS refusals, over the answer, before she sees it |
| `instructions/guide.md` | What a guide is, what may be taken from it, and the sections the regulation requires. **Corpus** (FR-1517) |
| `instructions/acs.md` | What Rampa may and may not do when she is drafting the significant adaptation |
| `packages/shell/src/jobs/guide.ts` | Orchestration: read, confirm, write; draft; converse |
| `ui/src/guide/` | Bring a guide, confirm the measures, read the draft, ask about it |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The required sections, what a guide is, and what may be taken from it are corpus. FR-1517 says so explicitly, because a change in Séneca must be a Markdown edit |
| **II** · deterministic core | The clinical filter and the ACS refusal are **code over the answer**, not prompt text. `007` settled that argument: a prompt instruction shares its context window with a document that may contradict it |
| **III** · adapt the how, never the what | **This is the statutory line, and `017` is where the project says so out loud.** An ACNS changes no objective — Rampa is entitled to help. An ACS modifies objectives — Rampa helps her *write* and never decides |
| **IV** · one extraction, N outputs | A guide goes through `008` unchanged. No second ingest path |
| **V** · barriers not diagnoses | The clinical filter is this principle in executable form. A diagnosis never reaches the vault |
| **VI** · traceability | Every measure cites the part of the guide it came from; every ACNS line traces to a recorded adaptation or to the overlay; the report distinguishes a guide measure from a recipe (FR-1512) |
| **VII** · the draft announces itself | Every document produced carries the mark, and states that Séneca is the record. SC-1506: nothing may look filed |
| **VIII** · human-routed memory | What is kept from a conversation is what **she** selects. The exchange writes nothing by itself |
| **IX** · content is never instruction | The largest surface yet, and the reason the refusals are code |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-1505 needs a PT** — «she says it saved her an evening, and the parts marked
missing were the right parts to leave to her». The second half is the real test, and
nothing here can substitute for it.

**SC-1507's bound is honest and narrow.** «In every phrasing the fixture set
contains» — the fixture set *is* the specification of what is checked, and it will
not contain every phrasing a teacher might use. That is stated in the corpus and in
the test rather than implied.

## Phase 0 · Research

[research.md](./research.md) — the retracted blocker and what replaced it; where
measures live and in what shape; whether «an ACNS draft is a rendering» survives
contact with what `014` actually stores (four sections yes, two partly, one no);
what bounds a conversation about one document; and where the ACS refusal is enforced.

## Phase 1 · Design

[contracts/guide.md](./contracts/guide.md) — `Measure`, `GuideReading`, the four
rules, and the table of what is refused outright.

## Sequencing

**US1 before US2**, even though US2 is the more impressive one: honouring a guide she
was given is what makes the rest trustworthy, and it is the half that already has its
destination built.

**US4 last, and the locks first within it.** The five locks are load-bearing because
Carlos took the wider scope knowingly with the narrow one on the table. Building the
drafting help before the refusals means building the refusals around code that
already answers.

**The clinical filter before any extraction reaches a screen.** SC-1502 is «no
diagnosis anywhere in the vault after ingesting a real DIAC», and a filter added
after the flow works is a filter written to fit what already happens — the same
argument `018` T001 made about the licence check, which found a real defect by being
written first.
