# Implementation Plan: Compose — generate material from learning objectives

**Branch**: `002-compose` · **Spec**: [spec.md](./spec.md)

## Summary

The half of a PT's workload that adapting does not touch: she has nothing, and
what she wants is that he learns something.

Two shapes, and the spec had only modelled one:

- **Content** — «un texto sobre los ecosistemas». Needs an approved anchor source,
  because the facts must come from somewhere that is not a model's memory. This is
  the spec's original US1 and its design is sound.
- **Skill practice** — «multiplicar con llevadas». Needs a level and a **verified
  answer key**. This is Carlos's example and it is the more common request.

## Technical Context

No new dependencies. Two existing specs feed this one:

| Feeds | What it gives |
|---|---|
| `011` · education corpus | Where the skill sits, what comes before it, what a learner that age can already do. **The level anchor**, replacing the model's own sense of what a ten-year-old handles |
| `012` · material kinds | A generated worksheet is a worksheet; a generated problem sheet is bound by `problems`' prohibition on changing quantities from the first revision |
| `007` · provenance | `data-objective` per block is the compose analogue of `data-from`, and the same check refuses a block that traces to nothing |

**Where the work lands:**

| | What |
|---|---|
| `packages/core/src/compose/verify/` | **The deterministic answer key.** Arithmetic first, and the module boundary that keeps it honest |
| `packages/core/src/compose/` | Objectives, anchors, the generated-IR contract |
| `instructions/compose.md` | The judgement: what a good exercise for this objective looks like. Corpus, per Principle I |
| `packages/shell/src/jobs/compose.ts` | The loop: generate, verify in code, reject, retry bounded |
| `ui/src/compose/` | Objectives in, review out |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What makes a good exercise for an objective is corpus. The application orchestrates and **verifies** |
| **II** · deterministic core | The answer key is computed offline with no model. That is the point of it |
| **III** · adapt the how, never the what | **Inverted here, and it is the hardest thing in this plan.** There is no "what" to preserve — it is being created. The demand is set by the objective and the level by `011`, and the risk is generating something easier than what she asked for while reporting success |
| **IV** · one extraction, N outputs | Composition is per learner by nature. The objective is shared; the material is not, and the report must not imply reuse that did not happen |
| **V** · barriers not diagnoses | The learner's profile shapes *how* it is presented. It must not shape the objective — that is her decision and the difference between adapting and lowering |
| **VI** · traceability | `data-objective` per block, and for content the anchor passage. A generated block that traces to nothing fails the render, exactly as an unaccounted block does today |
| **VII** · the draft announces itself | Louder here. Generated material has had no human eyes on its *content*, not merely on its adaptation, and the review checklist says the effort is higher |
| **IX** · content is never instruction | The anchor is material. It is data, and the injection detectors run over it |

**Gate: passes, with the sharpest reservation in this project's history recorded
rather than resolved.**

Every other feature here has an original to check against. This one does not, and
`checkCompleteness` — the arithmetic that catches content vanishing — has nothing
to compare with. What replaces it is weaker and must be honestly labelled: an
anchor for content, a computed answer key for arithmetic, and **her review, doing
more work than it does anywhere else in the application.**

Where the domain admits no check — a comprehension text, a writing task — the
honest position is that this feature produces a *draft for a professional to
verify*, not material to hand out. The checklist must say that in those words.

## Phase 0 · Research

[research.md](./research.md): what can actually be verified in code, and what the
anchor is for each shape.

## Phase 1 · Design

- [data-model.md](./data-model.md) — objective, anchor, generated IR, answer key.
- [contracts/verifiable-skills.md](./contracts/verifiable-skills.md) — what a
  verifier must guarantee, for whoever adds the second one.

## Sequencing

**After `001` SC-001.** Not for the anchor reason I gave yesterday, which was
wrong, but because a teacher has not yet told us whether the easier half works.

**Skill practice before content**, reversing the spec's own order. It is the more
common request, it is what Carlos described, and it is the one with a real
structural defence — building it first means the first composed material a teacher
sees is the kind we can actually check.
