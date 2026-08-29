# Tasks: What the material is

**Prerequisites**: plan.md, research.md, data-model.md, contracts/

**Tests**: Included. One of them — the selection baseline — must land **before**
the change it protects, which is unusual enough to be its own task.

---

## Phase 1 · Make the behaviour change visible before making it

- [ ] T001 Write `app/packages/core/test/selection-baseline.test.ts`: for a set of representative documents, record which recipes `selectRecipes` returns **today**. Commit it before anything else changes. `scope` is populated across the corpus and read by nothing, so turning it on changes selection for every document and no test asserts what today produces
- [ ] T002 Author the kinds in the corpus per contracts/material-kinds.md: four, each with a label in her words and a rule naming one prohibition

---

## Phase 2 · Foundational

- [ ] T003 Parse the kinds in `app/packages/core/src/recipes/kinds.ts`, repair-not-reject, with `forbids` machine-readable and `rule` the text the model reads
- [ ] T004 Add `kind` to the part/document schema, optional, **absent by default** — the finding behind this spec is an unasked kind written as `worksheet`, and a default repeats it
- [ ] T005 Make `scope` filter in `selectRecipes` (FR-1004): offered where the document has a declared block class; **absent scope means anywhere**
- [ ] T006 Update the baseline from T001 in the same commit as T005, so the diff is the behaviour change and a reviewer sees it
- [ ] T007 [P] Write `app/packages/core/test/kinds.test.ts` covering quickstart §1
- [ ] T008 Export from `app/packages/core/src/index.ts`

**Checkpoint**: the baseline diff is reviewed and understood. Do not proceed past a diff nobody can explain.

---

## Phase 3 · US1 + US2 — she says what it is, and it changes what happens (P1) 🎯 MVP

- [ ] T009 [US1] Stop writing `kind: 'worksheet'` in `job:create` (FR-1003)
- [ ] T010 [US1] Ask what the material is, with **no option preselected**, on the ingest screen and on the paste path
- [ ] T011 [US2] Carry the kind and its corpus rule into `buildAdaptPrompt` (FR-1002)
- [ ] T012 [US2] Add what each kind means to `instructions/adapt.md` — the pedagogical half, in the corpus (Principle I)
- [ ] T013 [US2] Report when the stated kind and the block classes disagree (FR-1005), overriding neither: she may be adapting last year's exam as practice
- [ ] T014 [US2] Say in the report that an exam was treated as an assessment (FR-1006), so the rule that governed it is visible before she signs
- [ ] T015 [P] [US1] Stop saying «una ficha» where the application means "material" (FR-1011) — a teacher who reads it on every screen concludes it does not do exams
- [ ] T016 [P] Write `app/e2e/material.spec.ts` covering quickstart §6

**Checkpoint**: the same document adapted as a worksheet and as an exam produces different prompts.

---

## Phase 4 · US3 — several documents, one unit of work (P2)

- [ ] T017 [US3] Introduce `parts.json` and the `material/<job>/p1/` layout per data-model.md
- [ ] T018 [US3] Migrate a job with `ir.md` at its root to one part with **kind absent** — never `worksheet`, which would bake the original lie into her existing material
- [ ] T019 [US3] Let her bring several documents, each with its own kind, into one job; keep several images as pages of one part (FR-1010)
- [ ] T020 [US3] Adapt each part under its own rule, into one report
- [ ] T021 [P] [US3] Write `app/packages/core/test/parts.test.ts` covering quickstart §5

---

## Phase 5 · Polish

- [ ] T022 Record in `specs/006-desktop-app/validation.md` what the baseline diff showed, and that SC-1001 needs a teacher and her own exam
- [ ] T023 [P] Update `docs/escenario.md`, which describes adapting «una ficha» throughout
- [ ] T024 Take an exam and a problem sheet to a teacher (quickstart §7). **The question is not whether it looks good — it is whether any question's demand changed**, and she is the only one who can answer it

---

## Dependencies

- T001 blocks T005. T002 blocks T003 and T011.
- T005 and T006 are **one commit**.
- Phase 4 depends on Phase 3 and is where the cost is.

## Implementation strategy

**MVP = Phase 1 + 2 + 3.** The exam distinction is a correctness matter; several
parts is a convenience one, and doing the convenience first would be building the
larger thing on top of the unfixed smaller one.

**T001 is not optional and not reorderable.** Turning `scope` on is a silent
behaviour change to every adaptation this application has ever produced. Landing it
without the baseline means the first person to notice is a teacher whose worksheets
got quietly worse, and nobody will connect it to this commit.
