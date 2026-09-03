# Specification Quality Checklist: Lengua vehicular en adquisición

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-03
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

**FR-3102 is the sharpest line in the spec**: language is never inferred from a name.
The review's names-heuristic finding (P17) showed exactly how demographic inference goes
wrong, and this feature sits closer to that cliff than any other — a system that guesses
«Amina probably speaks Arabic» has invented a fact about a child from her name. The
teacher says what the child speaks, or nothing bridges.

**FR-3109 (no full translation) is a refusal with a reason, not a limitation**: a
translated sheet cannot be verified for fidelity by this project's deterministic core,
and substitution defeats acquisition. Writing the refusal into the spec keeps a
well-meaning future contributor from «just adding translate».

**Distinct-from-LIN is documented at the boundary (FR-3103)** because the workaround it
kills — LIN:3 for an L2 child — is what a rushed teacher will do the day the mark is
hard to find. The axes file has to make the wrong path name its own wrongness.
