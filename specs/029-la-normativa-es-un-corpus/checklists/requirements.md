# Specification Quality Checklist: La normativa es un corpus

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

**The design is Carlos's, and the spec's job was the safeguards.** Selection + generic
fallback + upload came from him whole (review P3). What the spec adds is the three-part
containment — printed provenance, shown-and-scanned import, hard rules outranking every
corpus — because a normative corpus is *policy entering prompts*, the most
instruction-shaped content this project handles. FR-2708's refuse-by-default with
recorded override is the load-bearing line.

**FR-2704 is quietly the biggest task**: extracting Andalucía out of `guide.md`/`acs.md`
into the first corpus file without changing any behaviour for an Andalusian teacher.
SC-2701's invariant («zero Andalusian artefacts under another corpus») is what proves
the extraction was complete — grep is the test.

**Deliberately absent:** a corpus exchange/registry (sharing between teachers beyond
files), legal validation of bundled corpora (needs a person per territory, recorded like
`011` P31), and any statement about *which* territories ship in v1 beyond Andalucía.
