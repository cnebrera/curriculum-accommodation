# Architecture decisions

Short records of decisions that shape the project, so that a contributor who
disagrees can argue with the reasoning rather than guess at it.

One decision per file, numbered, never rewritten — superseded instead.

| # | Decision | Status |
|---|---|---|
| [0001](0001-recipes-are-guardrails.md) | Recipes exist to constrain the model, not to teach it | Accepted |
| [0002](0002-no-clinical-material.md) | No clinical material in the repository | Accepted |
| [0003](0003-two-entry-points-one-pipeline.md) | Two entry points, one pipeline | Accepted |
| [0004](0004-memory-is-human-routed.md) | Memory is plain files, routed by the teacher | Accepted |
| [0005](0005-delivery-vehicle.md) | Delivery vehicle: who can actually run this | **Proposed** |

## Specs these decisions drive

| Spec | Feature | Decisions |
|---|---|---|
| [001](../../specs/001-phase-0-worksheet/spec.md) | Phase 0 — adapt one worksheet end to end | 0001, 0002 |
| [002](../../specs/002-compose/spec.md) | Compose — generate from objectives | 0003 |
| [003](../../specs/003-memory/spec.md) | Memory — the system learns from the teacher | 0004 |
| [004](../../specs/004-handover/spec.md) | Handover — knowledge travels with the learner | 0004 |
