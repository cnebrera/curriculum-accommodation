# Specification Quality Checklist: CUR por área

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

**The boundary is the decision.** Carlos drew it at CUR-only (P30), and the spec's job
was to say *why* the boundary is principled — functional axes travel with the child,
CUR is child-×-subject — so the next person tempted to add per-area ATE has an argument
to beat, not a precedent to copy. FR-3002 exists to be pointed at.

**FR-3005's «no migration of meaning» is the compatibility spine**: an old profile's
single value *is* the general value, so SC-3002 can demand zero behaviour change over
the whole suite. The cheap alternative (defaulting absent areas to 0) would silently
un-delay every child on upgrade day.

**FR-3006 is a tripwire, not a feature**: P12 removed the profile-keyed stop; a
finer-grained CUR is exactly the shape someone might rebuild it with. Writing the
prohibition into this spec is cheaper than re-finding it in the next adversarial review.
