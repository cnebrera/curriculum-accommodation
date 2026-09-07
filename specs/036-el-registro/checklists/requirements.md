# Specification Quality Checklist: El registro, y cómo llega ella a él

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

All items pass on the first pass, and two of them are worth saying **why** rather than
just ticking, because they were the easy ones to get wrong here:

- **«No implementation details»** was at real risk. The whole reason this specification
  exists is that a subsystem was built with no requirement, so the tempting shape was to
  describe the code that exists — «the application MUST expose `diagnostics:tail`» — which
  is a specification of the implementation wearing a requirement's clothes. The
  requirements say what she must be able to **do**: find out where the log is, read its
  recent lines inside the application, open its folder. Which channels carry that is the
  plan's business.

- **«Success criteria are measurable»** for the one criterion that matters most, SC-3402:
  *zero* occurrences of the learner's name and no fragment of the material, over a session
  that adapted material for a named learner. A criterion like «the log is anonymous» would
  have passed a reading and been uncheckable.

**Re-validated 2026-09-07 after clarification.** The two questions that were left open
are answered and integrated (Clarifications ▸ Session 2026-09-07, and FR-3408/FR-3409):

1. **A «copy» affordance: yes.** Pasting into an email is what she will actually do.
   FR-3409, and FR-3410 governs it — what reaches her clipboard is the log's text and
   never anything a document could have styled into it.
2. **The rotated file: folder only, no selector on the screen.** Decided by a measurement
   rather than a preference: a line is ~100 bytes, so 2 MB is ~20.000 lines, and a
   packaged build writes `info` and above — tens of lines per session, not thousands.
   Hundreds of sessions before it rotates once. And in the pathological case the
   interesting file is the current one.

The second one is worth keeping as a note about **how** it was answered: the question was
put to Carlos and he said he did not know what it was for, which was fair — the question
had no number attached to it. Measuring it answered it. A question that cannot be decided
without a number should arrive with the number.
