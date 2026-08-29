# Tasks: Phase 0 — adapt one worksheet end to end

**Prerequisites**: plan.md

**Tests**: No new tests. Every requirement here is pinned by a suite belonging to
another spec, and duplicating those assertions would create a second place for the
same guarantee to be checked — which is how this project's every defect has
happened.

---

## Phase 1 · The trace

- [x] T001 Write `specs/001-phase-0-worksheet/contracts/trace.md`: each of FR-001 to FR-015 mapped to the mechanism that meets it and the test that pins it, and any requirement traced to **nothing** named as a gap *(done: `contracts/trace.md`. **Three of the fifteen had been found broken by audits written for other specs** — the draft mark, the memory loop, and the one-click verify — and none was found by anyone reading this spec, because nothing connected these requirements to the code that serves them.)*
- [x] T002 Confirm FR-010 and FR-011 — escalate when the *what* would change, and change only presentation for `.assessment` blocks. Both live in the corpus, so both are instructional and neither is enforced structurally. Record that distinction as `007`'s coverage document does *(done, and recorded as the honest architecture: FR-010 and FR-011 are the heart of the project and **neither is enforced by code**. Provenance, completeness and the report make an over-adaptation *visible*; her signature is the actual enforcement.)*
- [x] T003 Confirm FR-014: missing optional tooling degrades to fewer modalities and says so. The failure mode is silent degradation — she prints a sheet believing it has something it does not *(done.)*

## Phase 2 · What remains

- [x] T004 Record in `specs/006-desktop-app/validation.md` that **SC-001 is unmeasured**, that it is the criterion this spec exists for, and what measuring it needs: one teacher, one worksheet she brought, and no help from us while she reads the output *(done.)*
- [x] T005 Write down the protocol for that session, so the first attempt is not improvised: what she is asked, what is watched, what is *not* said to her, and what would count as a failure *(done: `contracts/protocol.md`. Written before the session, because the first attempt is the only one that yields a first impression and an improvised session spends it.)*

---

## Dependencies

T001 depends on nothing. T004 depends on T001, because what is unmeasured is
clearer once what is measured is written down.

## Implementation strategy

There is nothing to build. The risk in this spec is the opposite of the usual one:
that its requirements get treated as met because other specs deliver them, without
anyone checking. Three of the fifteen were found broken by audits written for other
specs — so the trace is the deliverable, and the gap it names is the point.
