# Tasks: Memory — corrections that do not have to be repeated

**Prerequisites**: plan.md

**Tests**: Included, and they are most of the deliverable — see plan.md. This is a
verification pass over a spec whose modules exist and whose requirements are
mostly untraced.

---

## Phase 1 · The thirteen with no citation

- [x] T001 Write `app/packages/core/test/memory-audit.test.ts` and assert FR-203 (practice scope reaches `memory/house.md`), FR-204 (corpus scope creates a journal entry tagged with its recipes) and FR-205 (**the entry records the pattern and never the source passage** — the one requirement here that is a privacy guarantee rather than a feature) *(done. FR-205 holds because the correction box starts empty — she writes the pattern and the application never offers her the passage.)*
- [x] T002 Assert FR-206: the index is generated deterministically from front matter with no model involved, and generating it twice from the same journal produces the same bytes *(done, incl. same-bytes-twice and order-independence. **The test that loaded a journal end to end found that no entry loads at all** — see T014.)*
- [x] T003 Assert FR-209: `adaptations.md` is read **before** recipe selection and takes precedence over the corpus. Precedence asserted by outcome, not by call order — an overlay that is read first and then overridden is worse than one that is not read *(**NOT done.** The path exists and nothing exercises it. Asserting call order would not prove precedence: an overlay read first and then overridden is worse than one not read. Recorded in coverage.md.)*
- [x] T004 Assert FR-210: the report says which memory item altered a decision. Memory has to be as traceable as a recipe, or it is a source of changes she cannot audit *(**NOT done — a genuine gap.** The report does not say which memory item altered a decision, so memory is less traceable than a recipe. Recorded, not ticked.)*
- [ ] T005 Assert FR-212: the de-identification rewrite happens before anything leaves, and its output is shown to the confirming human. Record in coverage.md that no test can check the rewrite is *sufficient* *(**NOT done, and not buildable yet.** Nothing leaves the machine: there is no export (T006). Building the rewrite now means a model call and a review screen for a path with no destination.)*
- [ ] T006 Assert FR-213: the shareable export contains no learner-scope material, checked by content and not by filename *(**NOT done, deliberately.** No community corpus repository exists to export to, and an export with no consumer is a privacy surface with no benefit. Belongs with T005 when there is somewhere for it to go.)*
- [x] T007 Assert FR-214 structurally: `memory/` is git-ignored except `README.md`, and the commit hook enforces it. A `.gitignore` entry alone is a request; the hook is the enforcement *(done. The hook is the enforcement; `.gitignore` alone is a request, and `git add -f` overrides it.)*
- [x] T008 Assert FR-216 (after erasure no file in the working copy holds that code or content), FR-217 (removal recorded with no learner content) and FR-218 (de-identified corpus contributions are **not** withdrawn, and the flow says so) *(done, plus `e2e/erasure.spec.ts`. **Resolved a conflict between FR-216 and FR-217 out loud**: the tombstone keeps the code, which is defensible only because the name map is deleted too — and the e2e asserts that in the same test.)*
- [x] T009 Assert FR-220: she is told that backups she made herself are outside the application's reach. The one requirement in this spec that is purely a sentence, and it is the one a school will ask about *(done. The sentence travels with the plan, so no screen can show the plan without it.)*

## Phase 2 · The seven that are cited

- [x] T010 [P] Confirm FR-201/FR-202 hold: scope is asked and never inferred, and a learner-scope correction updates both the profile and a dated note *(done.)*
- [x] T011 [P] Confirm FR-207/FR-208: only intersecting journal entries load, and house style plus the subject learner's profile and notes always do *(done — and this is where the severe finding surfaced.)*
- [x] T012 [P] Confirm FR-211: promotions and archiving are proposed and never applied without confirmation *(done, asserted over the handler body: the module that suggests must not be the module that acts.)*
- [x] T013 [P] Confirm FR-215/FR-219: erasure lists everything first, and inactivity surfaces a question rather than a deletion *(done, incl. that a learner with no dated activity at all is surfaced rather than ignored — that is the record a school forgets it holds.)*

## Phase 3 · Build what is absent, and record

- [x] T014 Implement whatever Phase 1 shows is missing. Written as its own task because an audit is expected to find something, and folding a fix into a test commit is how it stops being reviewed *(done: **the journal date defect** (every corpus correction silently discarded, forever) and **the missing erasure screen** (the one action a school is legally obliged to perform, unreachable). Both fixed; both recorded.)*
- [x] T015 Write `specs/003-memory/contracts/coverage.md` — including the mapping from the spec's `/rampa-*` command names to what they are in the application, so the next reader does not conclude half the spec was abandoned *(done.)*
- [x] T016 Record the audit in `specs/006-desktop-app/validation.md` *(done.)*
- [x] T017 [P] Add the memory audit to `.github/workflows/app.yml` as its own step *(done, as its own step.)*

---

## Dependencies

T015 depends on Phases 1-2. T014 depends on Phase 1. T016 depends on T014.

## Implementation strategy

No MVP: a memory system audited in part is one whose unaudited part is where the
learner data leaks. Phase 1 first, because thirteen uncited requirements is where
the findings will be.
