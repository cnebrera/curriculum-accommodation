# Tasks: Compose — generate material from learning objectives

**Prerequisites**: plan.md, research.md, contracts/, and **`001` SC-001 answered**

**Tests**: Included, and the verifier is most of them. This is the only feature in
the project with no original to compare against, so what replaces
`checkCompleteness` has to be worth the substitution.

---

## Phase 0 · Not before this

- [x] T000 **Do not start until a teacher has answered `001` SC-001.** Not a
      formality: if she does not find an adapted worksheet usable, composing new
      ones is not the next problem. Recorded as a task so it is a decision rather
      than a drift

      **OVERRIDDEN 2026-08-31 by Carlos, explicitly and with the reason stated:**
      «lo sé, sé que nadie lo ha visto, pero montemos todo y luego ya vamos
      probando e iterando flujo a flujo.»

      I raised this gate, he reaffirmed the direction, and it is his call to make.
      Recorded as an override rather than a tick, because the risk it names does
      not go away by being accepted:

      - Every part of `002` assumes an answer nobody has. The verifier, the anchor
        requirement and the compose loop are all real work built on «adaptation
        produces something a teacher uses».
      - If the answer turns out to be no, the wasted work is this whole
        specification and not a screen.
      - The mitigation that comes with the decision is his own words: **flow by
        flow**. So the sequencing below still puts the verifier first and alone,
        because it is the part that would survive a pivot — an arithmetic checker
        is right or wrong independently of whether anybody wants composed
        material.

      What has **not** changed: SC-101…104 still need a teacher, and none of them
      is satisfied by this being built.

---

## Phase 1 · The verifier, first and alone

- [x] T001 Define the verifier contract in `app/packages/core/src/compose/verify/types.ts`: `exercises(skill, exercise)`, `solve(exercise)`, and an explicit `unknown` that is honest rather than a guess *(done: `packages/core/src/compose/verify/types.ts`. `unknown` is a first-class verdict — a verifier that guesses is worse than none, because not guessing is the entire point of this branch. Named `SkillVerdict`: `ingest/validate.ts` already owns `Verdict`, and the compiler caught the collision.)*
- [x] T002 Implement the arithmetic verifier: four operations, **carrying and borrowing as constraints rather than topics**, fractions, decimals, percentages *(done: `arithmetic.ts`. Exact arithmetic on scaled BigInts, never floats — `0.1 + 0.2` is `0.30000000000000004` in IEEE 754, and a verifier that rejected a model's correct `0.3` would reject every correct exercise and exhaust the retry budget into «no he podido generar nada».)*
- [x] T003 Implement `exercises()` for carrying: `47 × 8` carries, `4 × 2` does not, and an exercise that does not is rejected (FR-124) *(done, column by column as a child does it — not «is the result over ten», which would accept `10 + 5`. And carrying in a subtraction returns **unknown** rather than `false`: the concept does not apply, and answering `false` would report «no practica llevadas» about an exercise where the question is meaningless.)*
- [x] T004 Write `app/packages/core/test/verify-arithmetic.test.ts` — including the case the whole feature turns on: **a model-proposed exercise with a wrong answer is rejected, not corrected** *(done: 32 cases. The one the feature turns on — a wrong stated answer is thrown away and not corrected — plus the three rejections that keep «con llevadas» meaning something.)*
- [x] T005 [P] Assert the verifier is model-free and offline, in the isolation suite *(done, and it needed no change: `isolation.test.ts` already walks all of `packages/core/src`, so the verifier was covered the moment it existed. The local half is asserted too — the module imports exactly `./types.js` and nothing that could reach a model or a network.)*

**Checkpoint**: code can decide, for a set of exercises, which exercise carrying and which of the answers are right. No model involved anywhere.

---

## Phase 2 · Foundational

- [x] T006 Objectives and skills in `app/packages/core/src/compose/`: a skill parsed as a constraint, not a topic *(done: `packages/core/src/compose/objectives.ts`. A skill is a constraint, not a topic — and **a negated constraint is not the absence of one**: «sin llevadas» is a request for the easier case on purpose, and reading it as «no constraint» hands her exercises that carry, on the sheet for the child not ready for it. When in doubt it falls to `content`, because that path asks a human.)*
- [ ] T007 The generated-IR contract: `kind: generated`, `data-objective` per block, the anchor in front matter
- [ ] T008 Extend the provenance check: a generated block tracing to no objective fails the render, exactly as an unaccounted block does (`007` FR-512)
- [x] T009 Author `instructions/compose.md`: what a good exercise for an objective looks like. The judgement, in the corpus *(done. `instructions/compose.md` already covered the anchor, the level line and the IR contract; what it lacked was **what a good exercise looks like** — including that the model states its answer only so the code can compare it, and that a mismatch throws the exercise away rather than correcting it.)*
- [x] T010 [P] Wire `011`'s education corpus as the level source (FR-122) — never the model's own sense of what a ten-year-old handles *(done, and it needed a corpus addition: `can` and `studies` are prose for the model, and FR-122 needs bounds for **code**. `instructions/education/es.md` now carries an optional `skills:` block per year — and a year without one is still valid, with what happens then written down rather than guessed: nothing is constrained and the report says the level was not checked.)*

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

- **T000 blocked everything and was overridden** on 2026-08-31 (see above). It
  is still the case that SC-101…104 need a person.
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
