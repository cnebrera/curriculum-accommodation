# Implementation Plan: La conversación — iterar el material sin rehacerlo

**Branch**: `026-la-conversacion` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One decision shapes everything here: **a turn is an edit of the current revision, not a
re-run of the job.**

The two operations that exist today both start over — `runAdaptation` re-adapts from
`ir.md`, `correctComposition` re-runs `runCompose` from the stored request. Starting over
is exactly the cost the spec exists to end: «quita los tres últimos» must not pay for, or
gamble, the seventeen exercises that were already right. So the conversation gets **one
new operation, `runTurn`**, which sends the model the *current revision* (fenced as
untrusted content, per P18) plus her sentence (the only instruction in the message), and
receives a whole document back.

And that is the only new thing the provider ever sees. Everything after the call is
machinery every job already passes: the deterministic gates, the exercise verifiers, the
revision files `005` defined and `021` extended to composed jobs, the cost plumbing, the
draft mark derived from the document. What is genuinely new besides `runTurn`: a
**deterministic diff** between revisions (because «what changed» must come from the files,
not from the model — `026` FR-2404), a **corpus instruction** telling the model what a
turn is and when to refuse (`instructions/iterate.md`), a **restore** operation (US3), and
the **panel** where she types.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault, plain files. One new file per conversation
(`conversation.md`, beside the document it is about — research R2); revisions reuse the
`005` shape exactly. **No database, no chat store, no pointer field** — see research R4
and the data model's «what deliberately gains no field».

**Testing**: `vitest` for the diff, the revision mechanics and the gates (provider
mocked); Playwright for the turn, the refusal and the walk-back; the two invariant tests
(SC-2402, SC-2403) written first and red first.

| Feeds | What it gives |
|---|---|
| `005` · versions | `adapted.rN.md`, the shape every revision keeps; `005` FR-511 (the signature belongs to the sheet); `005` FR-520 (stale readings, and `staleSheets` already computes it) |
| `002` · compose | The deterministic verifiers (`verifierFor` and the compose loop), the answer key, and the rule a turn re-applies: a quantity comes from the verifier or not at all |
| `021` · composed is material | `resolveDocument` — «which document?» answered once; `ir.rN.md` for composed revisions; research R3's lesson that re-running is not editing |
| `004` · report | The anti-fabrication rule `026` FR-2404 extends: what the report says happened is derived, never asked |
| `006` · desktop app | `costCents`/`addCost`/`formatCost` and the ledger (`recordCost`); FR-403's register — cents, never tokens; `null` says «no lo sé» |
| `007` · print | `sendRedacted`, the one egress; `isSignedOff` derived from the document, never a parameter |
| `011` · errors | FR-910: a refusal states its reason in her language |
| `022` · diagrams | FR-2016: a diagram whose exercise changed is redrawn from the exercise or removed |
| `023` · pictogram download | The single-in-flight rule a turn copies: one conversation, one turn running |
| `014` · the record | Where revisions become visible to her later (`026` FR-2412), via `record/scan.ts` |
| `003` · memory | The scope of a conversation (the child's data, deleted with the child) and the human-routed door `026` FR-2411 points at |
| P12 · review | The stop is keyed on **the request**, not the profile: access always proceeds, WHAT-changes stop |
| P18 · review | Fence + nonce + task reaffirmation around untrusted content. **Arrives by its own task; this plan assumes it and does not implement it** |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/ir/diff.ts` | `revisionDiff` and its sentences — what changed, from the files |
| `app/packages/core/src/vault/revisions.ts` | One revision mechanism for both document families: list, archive, restore |
| `app/packages/core/src/prompt/turn.ts` | `buildTurnPrompt` — the document fenced as content, her sentence as the instruction |
| `app/packages/shell/src/jobs/turn.ts` | `runTurn` — the provider call and the gates, verify-before-write |
| `app/packages/shell/src/ipc/conversation.ts` | The three channels ([contracts/conversation.md](./contracts/conversation.md)) |
| `ui/src/data/conversation.ts`, `ui/src/review/ConversationPanel.tsx` | The hook and the panel, inside the review screen for now (spec assumption: it moves when `020` US2 lands, and nothing here depends on where) |
| `instructions/iterate.md` | The judgement: what a turn may do, when it refuses, which rule it names |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What a turn may change, when it must refuse and which rule outranks her — all of that is `instructions/iterate.md`, corpus. The only prose the code produces is the diff's sentences («he quitado 3 ejercicios»), which are facts about files in the register of `completenessNotice`, not pedagogy |
| **II** · deterministic core | The diff, the revision mechanics, the restore and the re-verification call no model. One provider call per turn, through the existing chokepoint. Everything but the turn itself runs offline |
| **III** · adapt the how, never falsify the what | **FR-2405 and FR-2406 are this principle per turn.** A quantity the model altered is corrected *from the exercise*; a request that would change what is evaluated is refused with the reason. The barriers hold in every revision or they are not barriers |
| **IV** · one extraction, N outputs | A revision **is** the same IR. Every modality renders it unchanged; there is no conversation-specific output path, and the panel shows what the printer will print |
| **V** · barriers not diagnoses | Strengthened rather than merely respected: P12 moves the significant-adaptation stop from the profile (CUR≥2) to the request, so the conversation never keys a decision on what the profile says the child *is* |
| **VI** · traceability | The turn record is the trace: her words, the revision, what changed (derived), what it cost. `026` FR-2404 is Principle VI applied to a conversation — she reviews decisions, not the model's account of itself |
| **VII** · the draft announces itself | **The sharpest risk in this feature.** A sheet a model just touched is a draft, whoever touched it last — so the turn output's front matter never carries a `review` block across (structural: stripped and asserted, the `021` T029 pattern), and `isSignedOff` stays derived from the document |
| **VIII** · human-routed memory | **FR-2411.** A turn writes nothing to memory. «Siempre le pongo más espacio» MAY be offered, and the offer goes through the same scope question as every correction. Asserted as an absence |
| **IX** · content is never instruction | **FR-2408.** The document under iteration answers back like any material: it enters the prompt fenced with a nonce and followed by the task reaffirmation (P18), and only her turn text carries intent. A refusal is surfaced with its rule, never silent (`011` FR-910) |

**Gate: passes.** Two reservations recorded rather than resolved:

**The completeness gate changes meaning inside a turn, deliberately.** `runAdaptation`
rejects output that drops blocks; a turn exists to drop blocks when she says so. The
compensating control is the diff: every removal is derived and stated, and provenance is
checked against the *previous revision* — nothing may appear from nowhere (research R3).
This is a weakening of one gate justified by the feature's purpose, and it is written
down here so nobody later reads it as an accident.

**SC-2404 needs a teacher.** Whether the walk-back is *findable* is not answerable in
this repository. The mechanism is testable; the confidence («I can always go back, so I
can afford to try») is the point of US3 and only she can report it.

## Phase 0 · Research

[research.md](./research.md) — six questions. R1 is the structural one above: a turn
edits, it never re-runs. R4 found that `021` already built half of this feature's
revision story (`ir.rN.md`), and that the remaining work is to stop the two copies of the
mechanism drifting rather than to invent a third.

## Phase 1 · Design

- [data-model.md](./data-model.md) — Conversation, Turn, Revision, and the table of what
  deliberately gains no field.
- [contracts/conversation.md](./contracts/conversation.md) — the three IPC channels,
  their payloads, and who calls them.
- [quickstart.md](./quickstart.md) — the walks, offline first, money last, teacher very
  last.

## Sequencing

**The two invariant tests before the operation exists.** SC-2402 (no quantity ever comes
from the model, per revision) and SC-2403 (draft mark on every turn output; a signed
revision is never mutated) are the failures that put a wrong sheet in a child's hands
with a signature on it. A check written after `runTurn` works is a check written to fit
what `runTurn` already does.

**The revision mechanism before the operation.** `adapt.ts` and `compose.ts` each carry
their own copy of «archive the previous, number the next» today. `runTurn` must not
become the third; the shared module lands first and the two existing copies converge on
it (research R4).

**The diff before the panel.** The panel's most important line is «esto es lo que ha
cambiado», and it must be derived before anything displays it — a panel wired to the
model's own summary, even temporarily, is `004`'s defect reintroduced at the exact spot
this spec forbids it (FR-2404).

**US1 before US2's refusals, but US2's verifiers land with US1's e2e, not after.** A
turn that can mint an unverified revision, even briefly on a branch, is the «worse than
no conversation» the spec names — so T017 blocks the US1 checkpoint from being called
done, mirroring how `021` landed the exam limits with US2 rather than after it.
