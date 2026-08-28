# 0007 — An orchestrated pipeline, not an autonomous agent

**Status:** Accepted · 2026-08-28

## Context

With one vehicle decided (ADR 0006), the next question was how the application
should drive the model: as a **staged pipeline** — code owns the control flow,
the model transforms content inside each stage — or as an **autonomous agent** —
the model owns the control flow too, choosing actions and calling tools until it
decides it is done.

The intuition that raised the question is real and worth recording: an agent is
more autonomous and can "do almost anything"; a pipeline "always does what we
want" but looks less powerful. And the fear behind it: what if the deterministic
pipeline is not good enough?

## The framing that decides it

Neither option is deterministic — every model call is sampling. What differs is
**where non-determinism is allowed to act**:

| | Content (how to word this block) | Control flow (what happens next, what gets written where) |
|---|---|---|
| Pipeline | the model | **code** |
| Agent | the model | the model |

So the real question is *who owns the control flow*, and this project has already
answered it three times:

1. **Principle IX (NON-NEGOTIABLE):** *where a rule can be enforced by code that
   does not consult the model, it MUST be — structural defences outrank
   instructional ones.* An autonomous agent inverts this by construction: the
   vault boundary, the draft mark and redaction become requests to a model
   instead of properties of code.
2. **Spec 007's threat model:** the material is attacker-controllable — a child
   with a pen, a downloaded PDF with hidden text. The component that reads that
   input must not be the component that chooses actions and holds capability.
   With a pipeline, an injection can at worst produce a bad adaptation that a
   human reviews. With a tool-holding agent, the blast radius is everything the
   agent can do — which is the escalation 007 exists to prevent.
3. **Mandatory human sign-off caps the value of autonomy.** Autonomy pays when
   outputs ship unattended at volume. Here a person reads every result, so what
   makes the output good is the recipes, the profile, the memory and the model's
   quality on *one* transformation — none of which improves by handing the model
   the control flow.

There is also a false premise in "less powerful": autonomy wins when the task
space is open and the steps are unknown in advance. This itinerary is fixed and
short — read, classify, adapt, render, review — always those, always in that
order. A teacher with a worksheet on a Tuesday is not a planning problem.

## Decision

**The application drives the model as an orchestrated, staged pipeline.**

- **Code owns control flow.** Which stage runs, what is written where, which
  gates apply. Deterministic, offline-testable, per Principle II.
- **The model owns content**, one transformation per stage, with the judgement
  layer (`instructions/`, `recipes/`) as its instructions.
- **Verifiers in the loop are code, not the model grading itself.** Every stage's
  output passes deterministic checks (provenance, completeness, redaction,
  essential-figure descriptions, injection annotation) before it proceeds. A
  model reviewing its own output will never be as rigorous as arithmetic over
  block identifiers.
- **Iteration is bounded and code decides when it ends.** Two places, by design:
  - *adapt*: one automatic retry when the deterministic checks fail, feeding the
    detected problems back as corrections; then a plain-language error, with the
    last good output untouched.
  - *ingest* (spec 008): per-page retry against structural validation, with the
    budget and the stop condition in code. Ingest is the one stage with genuine
    open-endedness — recovering structure from a photographed page — so it gets
    the loop, and only it.
- **No tool-calling.** No stage gives the model the ability to choose actions,
  touch the filesystem, or invoke capabilities. `job:revise` — the teacher's
  correction re-run — is the second turn of the conversation, and it is
  human-initiated.

This *is* the "specialised agent" the intuition was reaching for: narrow
stage-scoped prompts, structured validated outputs, code verifiers, bounded
retries. The difference between "our specialised agent" and "an orchestrated
pipeline" is vocabulary, not architecture.

## What would reopen this

The honest worry — *is the pipeline good enough?* — is to be settled by
measurement, not argument, exactly like ADR 0001's open question and using the
same instrument:

- `cases/` runs where the deterministic verifiers cannot be satisfied even after
  the bounded retry, on material a teacher would actually bring; or
- the Phase 0 blind review failing in ways attributable to control flow rather
  than to recipes or model quality.

If that happens, the next step is still not a general agent: it is widening the
bounded loops (more retries, region-level re-extraction, a second model pass with
a narrower contract). An autonomous agent would additionally require amending
Principle IX, and that amendment — not convenience — is the bar.

## Consequences

- The adaptation call gains deterministic post-checks and one bounded retry
  (tasks in `specs/006-desktop-app/tasks.md`, Phase 11).
- The model needs a declared channel into the report — it cannot "say so in the
  report" if code writes the report. Specified in `docs/ir.md` (the
  `.report-notes` block) and required by 007 FR-516.
- Ingest is specified as its own feature with the bounded per-page loop:
  `specs/008-vision-ingest/spec.md`.
- The offline test suite remains the behavioural contract: a pipeline's control
  flow is testable without a key, an agent's is not. This was already Principle
  II's bargain; this ADR keeps it.
