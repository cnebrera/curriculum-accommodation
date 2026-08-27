# 0003 — Two entry points, one pipeline

**Status:** Accepted · 2026-08-27

## Context

Teachers need two different things:

- **Adapt** material they already have.
- **Create** material from scratch: "she needs to learn these three things — make
  me something she can work with."

Orthogonally, the adaptation spec may be **given** (the teacher arrives with the
learner's official adaptation document) or **derived** (only a profile exists).

Four situations. The risk is building four products.

## Decision

One pipeline, two entry points, and a precedence rule.

```
/rampa-ingest    (material)   ─┐
                               ├─→  IR  →  /rampa-adapt → render → review
/rampa-compose   (objectives) ─┘
```

- **`/rampa-compose`** produces the same IR from stated learning objectives.
  Front matter carries `kind: generated`; blocks carry `data-objective` where
  adapted blocks carry `data-from`. The back half of the pipeline is unchanged.
- **Given adaptations** are not a mode. They are a per-learner recipe overlay,
  `profiles/<CODE>/adaptations.md`, which **takes precedence** over the corpus.
  What it does not cover, the corpus fills.

## Why compose is easier technically and riskier pedagogically

Generation removes the highest-risk step in the project — recovering a textbook's
structure from a scan. There is no extraction fidelity problem when there is
nothing to extract.

But it removes the anchor. "Adapt the *how*, never falsify the *what*" works
because the source defines what is true. With no source, curricular hallucination
goes from impossible to easy, and a generated worksheet that teaches something
wrong is worse than a dense one that teaches it right.

Therefore compose requires an explicit anchor — stated objectives plus a source
the teacher supplies or approves — and **raises** the review burden rather than
lowering it. This must be said plainly in the flow, because the intuition runs
the other way.

## Consequences

- The IR gains `kind: generated` and `data-objective`; nothing else changes.
- `/rampa-adapt`, `/rampa-render` and `/rampa-review` are untouched.
- Compose has its own guardrails and its own review checklist section.
- Specified in `specs/002-compose/spec.md`.
