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

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-002 | `axisLevelOf` returns `undefined` for an unobserved axis and the prompt says «sin observar». **Never `0`**: `0` means «a normal page is fine», which is a claim |
| FR-003 | `ingest/to-ir.ts` and `ir/parse.ts`, against `docs/ir.md` |
| FR-004 | `one-task-per-page.md` names renumbering as its first anti-pattern — «the single most common way to make an adapted sheet unusable in a real classroom» — and `signpost-the-page.md` repeats it |
| FR-005 | `[UNREADABLE]` in place, plus `checkCompleteness`. `008` FR-604 is the same rule for the vision path |
| FR-006 | `runAdaptation`'s `isVerified` gate. `002` T013 added the one honest exception: composed material has no extraction to verify, and writing `verified: true` into a document that never had one would have been a true-looking field asserting something that did not happen |
| FR-007 | `applies(recipe, profile)` reads axis levels and nothing else. `018` is the sharpest test of this: pictograms fire from **no** axis, and `pictograms-not-automatic.test.ts` asserts the module cannot see one |
| FR-008 | `checkProvenance` / `assertProvenance`. `002` T008 and `compose-proposals.test.ts` closed two holes of the same shape in it |
| FR-009 | `buildReport`, grouped by decision, with «Lo que NO he hecho» first |
| FR-012 | `render/draft.ts`, derived from the document. `007` FR-509 found the version where a renderer could ask for an unmarked sheet, and `018`'s attribution now follows the same rule for the same reason |
| FR-013 | `npm run test:isolation` walks every file in `packages/core/src`, in CI as its own step |
| FR-016, FR-017 | `evidence:` reaches the report. This was the project's **fourth** «parsed and never read» field, and the rule it produced is the one `check-fr-coverage.sh` now enforces at the requirement level |
| FR-018 | `validate-recipes.sh` accepts a recipe with no `evidence:`. Requiring one would push away a contributor who knows how to adapt material and not how to cite it |
| FR-019, FR-020 | **Not done** — backlog **G18**. Provenance records the recipe and its version and not which service produced the material. The service **identifier**, never a model name, because `009` FR-702 says she never sees one |
