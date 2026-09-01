# Specification Quality Checklist: El alumno es el sitio — la navegación

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

**Re-validated 2026-09-01 after `/speckit-clarify`.** All sixteen items still pass. One
question went to Carlos (where half-finished work surfaces); the other five were
answered from the constitution and from specifications already written, each recording
its source. Four requirements and one success criterion were added — FR-1825…FR-1828
and SC-1808 — and «Ajustes» became **«Configuración»**, which is the word Carlos used
when he asked for it.

The clarification that changed most: half-finished work now has to be findable **without
opening any learner**, and establishing which learners have it must cost one directory
read rather than one per learner. That second half is a requirement rather than a note
because the slow version only shows up at the roster size this product is for.

Two things were fixed by running this checklist rather than by declaring it passed.

**«No implementation details» needed a second pass.** The first draft of FR-1807 named
a left-hand rail and the first draft of the Key Entities section described a reducer.
Both are the *how*. The requirement is that the learner's menu stays visible and that
where she is lives in one place; whether that is a rail, a strip or a set of tabs is
the plan's decision, and the narrow-window assumption is recorded as an assumption
precisely because it is a design choice and not a requirement.

**«Measurable» exposed a weak success criterion.** SC-1801 first read «the record is
easier to reach». Rewritten as a count — no more than three actions, none of them
«edit» — against today's five. That is the number this feature either moves or does
not, and «easier» is not checkable by anyone.

**Two criteria are honest about needing a person.** SC-1803 needs a teacher who has
not seen the tool; nothing in a test suite substitutes for it, and it is the criterion
that decides whether the redesign actually worked. SC-1805 needs the narrow window
**looked at** (`013` FR-1113/FR-1118), not merely asserted.

**One requirement retires another**, deliberately and in writing: FR-1801 retires `016`
FR-1401. Recorded this way so the change reads as a decision with an argument rather
than as a requirement that quietly disappeared.
