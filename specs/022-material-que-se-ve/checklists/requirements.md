# Specification Quality Checklist: Material que se ve, no sólo que se lee

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-01
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

**Three things the checklist changed rather than blessed.**

**«No implementation details» took two passes.** SVG and HTML are named in the Input
because that is Carlos's own instruction and the reason it is the right approach — markup
is inspectable where an image is opaque. But the requirements had inherited the vocabulary:
FR-2008 said «SVG elements». It now says elements and attributes against an allowlist,
which is the requirement; *which* markup language is the plan's decision.

**A user story was promoted.** «It cannot become a way in» started as P3 polish. It is P1
alongside US1, because markup written by a model and rendered by the application is the
largest new attack surface this project has taken on — it ships with US1 or US1 does not
ship. A security requirement scheduled after the feature it constrains is a requirement
that arrives too late to change anything.

**One requirement came from a licence lesson rather than from the description.** FR-2007 —
the theme and not the property. Carlos's example is Pokémon, and a Pikachu on a child's
worksheet is a **trademark** infringement, which is sharper than the Creative Commons
question the project spent the previous hour being careful about. Recorded as a
requirement rather than a note, because «be careful» is not checkable and «reproduces no
third party's characters or logos» is.

**Two criteria need somebody, and neither is a formality.** SC-2005 needs a photocopier —
the second criterion in this project to need one. SC-2006 needs a teacher to say which
sheet she would put in front of the child *and why*: whether a diagram helps a nine-year-old
is not answerable in a test suite, and «it looked nice» is not the question being asked.
