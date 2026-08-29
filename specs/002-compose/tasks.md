# Tasks: Compose — generate material from learning objectives

**Prerequisites**: plan.md, research.md, contracts/, and **`001` SC-001 answered**

**Tests**: Included, and the verifier is most of them. This is the only feature in
the project with no original to compare against, so what replaces
`checkCompleteness` has to be worth the substitution.

---

## Phase 0 · Not before this

- [ ] T000 **Do not start until a teacher has answered `001` SC-001.** Not a
      formality: if she does not find an adapted worksheet usable, composing new
      ones is not the next problem. Recorded as a task so it is a decision rather
      than a drift

---

## Phase 1 · The verifier, first and alone

- [ ] T001 Define the verifier contract in `app/packages/core/src/compose/verify/types.ts`: `exercises(skill, exercise)`, `solve(exercise)`, and an explicit `unknown` that is honest rather than a guess
- [ ] T002 Implement the arithmetic verifier: four operations, **carrying and borrowing as constraints rather than topics**, fractions, decimals, percentages
- [ ] T003 Implement `exercises()` for carrying: `47 × 8` carries, `4 × 2` does not, and an exercise that does not is rejected (FR-124)
- [ ] T004 Write `app/packages/core/test/verify-arithmetic.test.ts` — including the case the whole feature turns on: **a model-proposed exercise with a wrong answer is rejected, not corrected**
- [ ] T005 [P] Assert the verifier is model-free and offline, in the isolation suite

**Checkpoint**: code can decide, for a set of exercises, which exercise carrying and which of the answers are right. No model involved anywhere.

---

## Phase 2 · Foundational

- [ ] T006 Objectives and skills in `app/packages/core/src/compose/`: a skill parsed as a constraint, not a topic
- [ ] T007 The generated-IR contract: `kind: generated`, `data-objective` per block, the anchor in front matter
- [ ] T008 Extend the provenance check: a generated block tracing to no objective fails the render, exactly as an unaccounted block does (`007` FR-512)
- [ ] T009 Author `instructions/compose.md`: what a good exercise for an objective looks like. The judgement, in the corpus
- [ ] T010 [P] Wire `011`'s education corpus as the level source (FR-122) — never the model's own sense of what a ten-year-old handles

---

## Phase 3 · US5 — skill practice, with the arithmetic checked (P1) 🎯 MVP

**Goal**: «Que aprenda a multiplicar con llevadas» produces a worksheet at the right level whose answers are computed, not claimed.

**Independent test**: Ask for it for a 10-year-old. Every exercise carries, every answer is verified, and a seeded wrong answer is refused before she sees it.

- [ ] T011 [US5] The compose loop in `app/packages/shell/src/jobs/compose.ts`: model proposes, **code verifies**, rejections are retried inside a corpus-owned bound, and exhaustion surfaces to her rather than shipping
- [ ] T012 [US5] The level from `011`: digits, one or two, whether decimals are in scope for that year
- [ ] T013 [US5] The presentation from the learner's profile, reusing the adaptation machinery unchanged — this is the part that already exists
- [ ] T014 [US5] The answer key, computed, on a sheet **for her** and never on the child's
- [ ] T015 [US5] The report: which objective each block serves, and that the content was generated
- [ ] T016 [P] [US5] The draft mark says more here: generated material has had no human eyes on its **content**, not merely on its adaptation

**Checkpoint**: Carlos's own example runs end to end, and a seeded wrong answer never reaches the sheet.

---

## Phase 4 · US1/US2 — content, with an anchor (P1)

- [ ] T017 [US1] Require an approved anchor for content composition, and **refuse without one** — unchanged from the spec, and it was right
- [ ] T018 [US1] Run the injection and hidden-text detectors over the anchor: it is material, and material is data (Principle IX)
- [ ] T019 [US2] Trace each generated block to the anchor passage it rests on
- [ ] T020 [US2] The review checklist leads with **content** verification and says the effort is higher than for an adaptation

---

## Phase 5 · Where nothing can be checked

- [ ] T021 Say it plainly (FR-125): for a skill with no verifier, this produces **a draft for a professional to verify**, not material to hand out. In those words, in her language, on the screen where she gets it
- [ ] T022 Record in `specs/006-desktop-app/validation.md` which skills have verifiers and which do not, and that the second list is the honest limit of this feature

---

## Dependencies

- **T000 blocks everything**, and it is a person.
- Phase 1 blocks Phase 3. The verifier exists before anything generates.
- `011` blocks T010 and T012.
- `012` blocks T007 — generated material carries a kind.

## Implementation strategy

**Verifier first, alone, before anything can generate.** Building the generator
first means the verifier arrives to a working demo and gets scoped down to fit it,
which is how a check becomes a warning.

**Skill practice before content**, reversing the spec's own order: it is the more
common request, it is what Carlos described, and it is the one with a real
structural defence. The first composed material a teacher sees should be the kind
we can actually check.

**Do not let T021 become a tooltip.** "This is a draft for you to verify" is the
entire honest position on the unverifiable half, and it is the sentence most likely
to be softened into something reassuring.
