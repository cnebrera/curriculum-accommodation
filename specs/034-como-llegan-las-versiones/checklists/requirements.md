# Specification Quality Checklist: Cómo llegan las versiones

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

**The two-channel asymmetry is the design.** Code arrives by her hand (notify-only,
FR-3201/SC-3203); policy arrives in-app but *read first* (FR-3206). Collapsing them
either way loses something: auto-updating code needs signing infrastructure and trust
the project hasn't earned yet; making corpus updates a manual reinstall is the exact gap
the critic found.

**FR-3209 (her edits outrank shipped policy) is Principle I under pressure**: the first
corpus update after a teacher fixes a recipe locally is where a naive updater would
silently revert her judgement. The per-file conflict is the moment the product proves
the «you can correct it» promise was real.

**FR-3211 exists because an update channel is an attack channel**: a «corpus update» is
`029`'s import with automated delivery. Integrity check + scan-before-activation makes
the new channel no weaker than the manual one.

**Deliberately absent:** the check schedule (plan's call, with consent), the hosting
choice, retention depth, and any telemetry — a version check that also reports usage
would be a different feature and a different conversation.
