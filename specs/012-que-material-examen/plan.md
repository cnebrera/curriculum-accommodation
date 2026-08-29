# Implementation Plan: What the material is

**Branch**: `012-que-material-examen` · **Spec**: [spec.md](./spec.md)

## Summary

One question asked, one field carried, one dead constraint made live, and one
plural made real.

The feature is small in code and load-bearing in consequence: the exam rule
already exists in the corpus and in `001` FR-011, and nothing tells the pipeline
when to apply it. What is being built is the input that rule has always needed.

## Technical Context

No new dependencies.

| | What |
|---|---|
| `recipes/README.md` or a corpus file | The list of kinds. **Corpus, not code** — a fifth kind is a pedagogical question |
| `packages/core/src/recipes/index.ts` | `scope` starts filtering (FR-1004) |
| `packages/core/src/vault/schema.ts` | `kind` on a part; parts on a job |
| `packages/core/src/prompt/adapt.ts` | The kind and its rule reach the model |
| `packages/shell/src/jobs/` | `job:create` stops hardcoding; ingest carries a kind per part |
| `ui/` | The question, and the end of «una ficha» everywhere |
| `instructions/adapt.md` | What each kind means for adaptation |

### The one risk worth naming before writing code

**Making `scope` filter is a behaviour change to every existing adaptation.**
Today every recipe is selected regardless of scope; tomorrow some are not. A
recipe that was quietly carrying work it was not scoped for will stop, and the
adaptation will change in a way no test predicts — because no test asserts what
today's selection produces for a real document.

So the first task is not the filter. It is **recording what selection produces
today**, so the change is visible rather than discovered by a teacher whose
worksheets got worse.

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The kinds and what each means for adaptation are corpus. The application asks the question and carries the answer |
| **II** · deterministic core | `scope` filtering is a pure function over block classes, offline |
| **III** · adapt the how, never the what | **This feature is that principle's mechanism.** The exam rule is the sharpest case of it, and `problems` is the sharpest *unnoticed* case: change a quantity and you have changed what is practised, invisibly |
| **V** · barriers not diagnoses | Untouched — this is about the material |
| **VI** · traceability | The report says the material was treated as an assessment, so she can see the rule that governed it |
| **IX** · content is never instruction | The kind comes from her, not from the material. A document claiming to be an exam changes nothing |

**Gate: passes**, with the behaviour change above named rather than buried.

## Phase 0 · Research

One question, in [research.md](./research.md): what the four kinds mean for
adaptation, and whether four is the right number.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the kind, the part, the job with parts.
- [contracts/material-kinds.md](./contracts/material-kinds.md) — what each kind
  promises and forbids, for whoever adds a fifth.

## Sequencing

**MVP is US1 + US2**: the question and the filter. US3 (several parts) is a
structural change to the job model and it is where the cost is, so it comes after
the correctness work is real.

**US2 before US1 in the code**, though not in the spec: the filter needs the
baseline recording first, and the question is worthless while every recipe is
selected anyway.
