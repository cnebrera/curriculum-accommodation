# Specification Quality Checklist: Ver la hoja

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-10
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

Three iterations of validation ran. What each one changed, because the record of a
review is worth more than its verdict:

**Iteration 1 — implementation detail in the requirements.** FR-3605 named
`app/e2e/sheet-a11y.spec.ts`, `BrowserWindow` and `capturePage()`. That is *how*, and it
belongs in `plan.md` under Technical Context. The requirement now states the constraint
that matters to a reviewer — reuse the existing path, add no dependency, do not touch
the viewer's sandbox — and cites `037` FR-3511/3512 rather than naming the call. The
existing path is still named, once, in "What already exists", which is context and not a
requirement.

**Iteration 2 — two success criteria were not measurable.** «The record is useful» and
«appearance regressions get caught» were both unfalsifiable. SC-3604 replaced them with
the only test of this instrument that can actually be run: the three defects the first
printed PDF revealed are in the history with their fixes, so «are all three visible in
the record» is a question with an answer. SC-3602 keeps the qualitative half and borrows
`010` SC-805's protocol — recorded verbatim, including when unflattering — so it is a
judgement with a procedure rather than an opinion.

**Iteration 3 — a boundary was stated in prose and not in a requirement.** The spec said
in three places that this must never become a pixel diff and had no requirement saying
so, which is exactly the shape of defect `check-fr-coverage.sh` exists to catch one level
up. FR-3604 now carries it, citing `013` FR-1114.

### One thing deliberately left as an assumption rather than a requirement

The size of the set — the full presentation matrix for one representative kind, plus one
capture of each other kind. Four kinds × five presentations × two signed states is forty
files and nobody opens forty files; around ten is a set a person reviews. That is a
judgement about human attention rather than a property of the system, so it is recorded
in Assumptions where a reviewer can disagree with it, not in a requirement where it
would look measured.

### Not a clarification, and why

Whether the record runs in CI looked like a question and is not one: ADR 0009 already
answered it. A record that fails a build becomes a baseline somebody updates without
looking, which is the precise failure mode that document rejected pixel diffing over.
Recorded in Assumptions with the reasoning rather than asked.
