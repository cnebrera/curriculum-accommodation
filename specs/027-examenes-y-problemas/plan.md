# Implementation Plan: Exámenes y problemas de verdad

**Branch**: `027-examenes-y-problemas` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

Two decisions carry this feature, and both are about honesty rather than capability.

**The output format is the kind's own** (FR-2507). Today one `OUTPUT_FORMAT` — «una
línea por ejercicio, expresión = resultado, sin texto alrededor» — is appended to the
system prompt for *every* compose call, including the content path whose user message
demands IR blocks (the review's AGE-04: two contradictory formats in one call). A word
problem is unparseable under that format **by construction**, which is the whole reason
«problemas» cannot be produced. So each path gets its own wire format and its own system:
the one-liner stays the skill path's, problems get a labelled statement block, exams get
a labelled question block, and the content path finally stops being told to produce
one-liners.

**The verified numbers are the ones the child reads** (FR-2501). The cheap
implementation asks the model to state its quantities separately and verifies those —
which verifies the liar with his own declaration, as this spec's checklist warns: a model
that got the arithmetic wrong can state quantities consistent with its wrong answer. So
the quantities are **extracted by code from the statement text**, the model's declared
operation is admitted only if every operand is found among them, and the answer is
computed by the same arithmetic verifier `002` built — never taken from the model. What
this deliberately does *not* claim is that the story makes sense: narrative accuracy is
not deterministically verifiable, and the plan declares that (the declared-draft path,
per item) rather than faking it. Research [R2](./research.md) takes the position in full.

Almost everything else already exists: the propose→verify loop, the arithmetic verifier,
the answer key file (`jobAnswers`), the draft mark, `buildSheet`, the report, `021`'s
gates. This feature adds two shapes and makes the kind select the pipeline instead of
only the footnotes.

## Technical Context

**Language/Version**: TypeScript 5, Electron. No new dependencies, no new provider
calls beyond the existing compose loop (spec assumption).

**Storage**: the vault, unchanged. **No new file**: the key is `material/<job>/answers.md`
(`jobAnswers`), which already exists for the skill path and gains entries for the new
kinds — see [data-model.md](./data-model.md).

**Testing**: `vitest` offline for parsers, extraction, verification, loop cut and
renderer absences; Playwright for the four-kinds walk; the SC-2502 test is written
first and red (quickstart §1).

| Feeds | What it gives |
|---|---|
| `002` · compose | The loop (`composeExercises`), the arithmetic verifier (`solve`/`exercises`), reject-don't-repair, `parseProposals` as the pattern, the unverifiable path (`composeUnverified`, `UNVERIFIABLE_ES`) |
| `021` · material | The kind is hers (`request.kind`), `quantity:` per kind in the corpus, the printable key with `ANSWER_KEY_HEADING`, the kind-mismatch note this spec makes stop lying |
| `012` · kinds | The four contracts in `instructions/material-kinds.md`, `forbids`, `findKind` returning `null` and never a fallback |
| `018` · pictograms | The no-chivato exam guard, referenced not duplicated (its quote bug AGE-06 is COLA, not here) |
| `017` · la guía | The registered ACS in the learner's overlay (`adaptations.md`), which is what unlocks FR-2509 |
| Revisión 2026-09-03 | P2 (build, don't soften), P19 (the 100%-unknown cut), P12 (request-keyed gate), AGE-03/04/08 |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/compose/problems.ts` (new) | `extractQuantities`, `verifyProblem` — the statement's numbers, deterministically |
| `app/packages/core/src/compose/proposals.ts` | `parseProblemProposals`, `parseExamProposals` beside `parseProposals` |
| `app/packages/core/src/compose/loop.ts` | The P19 cut: a batch that is 100% `unknown` aborts (FR-2510) |
| `app/packages/core/src/compose/objectives.ts` | Multi-operation objectives become several skills; the constraint resolves per operation (FR-2508) |
| `app/packages/core/src/compose/sheet.ts` | Problem items and exam questions on the sheet; `KeyEntry` with a per-entry status |
| `app/packages/shell/src/jobs/compose.ts` | The kind selects the pipeline; one system per path; the derived-kind check learns the four kinds |
| `app/packages/core/src/render/` | Answer space for exam questions in HTML, ODT and linear — and the asserted absences |
| `instructions/compose.md` | The judgement: what makes a good problem statement, what makes a good exam question (corpus, Principle I) |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What a good problem *is* — statement not the obstacle, context from his world, the question a real question — goes to `instructions/compose.md`, which already holds that judgement for bare exercises. The **wire formats** stay in code, exactly as `OUTPUT_FORMAT` does today with the recorded reasoning «only the wire format is added here, which is mechanics». What is refused: putting the extraction rules in the corpus (they are parsing, not pedagogy) and putting the exam-question judgement in code |
| **II** · deterministic core | The heart of the feature is this principle: `extractQuantities`, `verifyProblem`, the parsers and the loop cut are pure, offline, model-free, in `packages/core` where `test:isolation` guards them. The answer key stays computed, never requested |
| **III** · adapt the how, never falsify the what | The verification is this principle at composition time: a statement whose numbers contradict its answer is rejected, not repaired (FR-2502) — a story rewritten by code is nobody's story. And what code cannot check is **declared**, never dressed up as verified (FR-2504) |
| **IV** · one extraction, N outputs | The exam and the problems sheet are ordinary IR; every modality renders them. The key belongs to the **job**, not to a learner (US2 scenario 1), exactly as `answers.md` already does |
| **V** · barriers not diagnoses | Not engaged, with one edge: FR-2509 forbids re-importing a **profile-keyed** stop into the exam path — the gate keys on the request, which is also this principle's spirit |
| **VI** · traceability | Every item records its objective (`data-objective`, unchanged); the report names the kind, what was verified, what was declared and what it cost (US3 scenario 2) |
| **VII** · the draft announces itself | Sharpened per item: a sheet carrying any unverified item says so **beside the draft mark** (FR-2504), and the composed-material mark (`draftMark` on `isGenerated`) keeps its louder wording |
| **VIII** · human-routed memory | Not engaged. Correcting these documents rides `021`'s `correctComposition`, scope question included |
| **IX** · content is never instruction | The statements the model writes are content: parsed by intolerant parsers (a half-understood line is **no proposal**, never a guess), then `annotateInjection` + `checkBounds` over the sheet, unchanged. The key never enters a learner-facing path (FR-2512), asserted structurally rather than instructed |

**Gate: passes.** Two reservations recorded rather than resolved:

**What the arithmetic check cannot see is the pedagogy.** «3 melones a 40 €» verifies
perfectly (spec edge case). The plan's answer is the honest one, not a clever one: the
report says exactly which checks ran, the draft mark stays, and SC-2505 needs a teacher —
it is the only criterion here that can come back «no» with everything else green.

**The exam key carries model-drafted answers for non-computable questions, labelled
unverified per entry.** That is a deliberate, argued departure from the skill path's
«no answer at all» — research [R3](./research.md) takes the position and names the
tension with `002`'s rule instead of hiding it. If Carlos rejects it, the fallback
(list them under «Sin soluciones», as today) costs one task.

## Phase 0 · Research

[research.md](./research.md) — six questions. R2 is the one the feature stands on: the
quantities are extracted from the statement the child reads, the model's declared
operation is only admitted when its operands are all found there, and the narrative's
sense is declared unverified rather than pretended. R5 found that the derived-kind
check must read the **structure of what was produced**, not regexes over Spanish prose —
which is why today's is dead code.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `ProposedProblem`, `VerifiedProblem`, `ExamQuestion`,
  `KeyEntry`, and what deliberately gains no field.
- [contracts/proposal-formats.md](./contracts/proposal-formats.md) — the three wire
  formats, and the parser guarantee they all share: parse or drop, never guess.
- [quickstart.md](./quickstart.md) — the walks, offline first, money last, teacher last
  of all.

## Sequencing

**The zero-answers test before anything renders an exam** (SC-2502). The failure mode is
an answer on the page a child sits an exam with, and a check written after the feature
works is a check written to fit what already happens — `021` T001's reasoning, applied to
the sharper document.

**The extraction and the parsers before any pipeline.** They are the deterministic core
of both new kinds; a pipeline built against parsers that do not exist yet is a pipeline
that gets a lenient parser retrofitted under schedule pressure — and a lenient parser
here verifies a guess.

**The loop cut lands with the first new pipeline, not after it** (FR-2510). The new
paths multiply the ways a batch can come back 100% unknown; shipping them ahead of the
cut re-creates AGE-03 with more doors.

**US1 (problems) before US2 (exam).** Its verification story is complete, the spec says
so, and the exam path reuses everything the problems path proves: the extraction, the
key entries, the declared-unverified path.

**The FR-2509 gate lands with US2, not after it.** `002`'s own history (FR-126) and
`021`'s repetition of the argument: an exam composable before its limits exist is the
same mistake with a worse outcome.
