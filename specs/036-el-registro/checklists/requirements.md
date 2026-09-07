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

**Two questions deliberately left for `/speckit-clarify`** rather than guessed, both
recorded as assumptions in the spec:

1. Whether a «copy to clipboard» affordance is worth its surface, or attaching the file is
   enough.
2. Whether the rotated previous file should be reachable from the screen, or only through
   the folder — a failure she is reporting from last week may be in it.

AGENTS.md is explicit that this project's defects live in what nobody questioned, so
neither is being decided here.
