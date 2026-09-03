# Specification Quality Checklist: Exámenes y problemas de verdad

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

**The load-bearing line is FR-2501's «extracted from that statement».** The cheap
implementation verifies the model's *separate* claim of the quantities — which the model
can make consistent with its own wrong answer. Extracting from the statement text is
what makes the verification about the problem the child reads. The plan will have to
take a position on extraction (deterministic parse vs a second model pass); the spec
deliberately only fixes *whose* numbers count.

**FR-2504 declares per item, not per sheet.** A sheet «unverified somewhere» teaches her
to distrust everything; naming which items lets her fix two and sign.

**Deliberately absent:** rubric generation, oral exams, and any grading help — the
review's PROD findings on correction (pt-gaps) are real but separate; folding them in
here would sink the two kinds this spec exists to make real.
