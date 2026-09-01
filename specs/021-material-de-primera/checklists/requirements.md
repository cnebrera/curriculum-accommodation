# Specification Quality Checklist: Lo compuesto también es material

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

**Re-validated 2026-09-01 after `/speckit-clarify`.** All sixteen items still pass. Two
questions went to Carlos; four more were answered from the constitution and from
specifications already written, each recording its source. Four requirements and one
success criterion were added — FR-1921…FR-1924 and SC-1908.

The clarification with the most consequence: **the answer key is printable**, in its own
file and with a heading that cannot be misread. That adds a real risk — a page of answers
in the photocopy pile — so SC-1908 checks **both sides**: no answer in any rendering of a
learner's material, and every rendering of the key saying on its face that it is not to
be handed out. One of those two failing is what puts answers in a child's hands.

And one requirement arrived from a principle rather than from a question: **FR-1924, the
viewer executes nothing**. A composed document rests on an anchor she pasted, `007` treats
that text as content, and a viewer that ran markup from it would be the single place in
this application where content became instruction (Principle IX).

**Two things the checklist changed rather than blessed.**

**«No implementation details» failed on the first pass**, and in a way worth recording:
the Input quotes `job:render`, `job:pdf` and `adapted.md` because that is what Carlos was
told about the cause — but the requirements had inherited the same vocabulary. FR-1901 and
FR-1902 were rewritten to say *viewing, printing, exporting, signing and correcting*, and
the file path stays only in the narrative section where it explains a diagnosis. The
requirement is that a composed document is usable; which file the code reads is the plan's
problem.

**«Testable and unambiguous» exposed a hole in the exam limits.** The first draft said an
exam «must be handled carefully», which is not checkable by anyone. It became four
requirements that are: the draft mark and who validates (FR-1911), that a different
assessment is the teaching team's decision (FR-1912), **no mark scheme, weighting or pass
mark** (FR-1913), and **no marking of a learner's answers** (FR-1914). FR-1913 and FR-1914
are absences, which is the only shape a limit like this can be tested in.

**One success criterion needs a person, and it is the one that matters most here.**
SC-1906 — a teacher reads a composed exam and either uses it or rejects it for a reason
she can name. Nothing in a test suite can tell us whether an exam Rampa wrote is fit to
put in front of a class, and that is the whole question this user story opens.

**Deliberately out of scope, and stated in the spec rather than left implicit**: the
conversation. Carlos asked for the chat and it is `022`, because iterating by talking
needs its own thinking about cost per turn, versioning, and what happens to a verified
answer key when the exercises change underneath it.
