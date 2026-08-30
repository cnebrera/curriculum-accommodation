# Tasks: One worksheet, several learners

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-30

Twenty tasks. The weighting is deliberate: the loop itself is two of them, and
failure isolation, signing and the two constitutional risks are the other
eighteen. A batch feature is easy to write and easy to write badly, and the bad
version passes a happy-path test.

---

## Phase 1 · Setup

- [ ] T001 Write `packages/shell/test/batch.test.ts` **first**, red, from
      [quickstart.md](quickstart.md)'s offline list. Every later task in Phase 2
      turns one of its cases green. The one that matters is not "three sheets
      appear" — it is the forced failure on the second learner

---

## Phase 2 · Foundational · the batch, before any screen sees it

**Blocking**: nothing in Phase 3 or later may start until this phase is green.
The hard part of this feature is what happens when part of it fails, and that is
cheapest to get right where there is no window in the way.

- [ ] T002 Add `runBatch(jobId, learners, onProgress, corrections?)` to
      `packages/shell/src/jobs/adapt.ts`, beside `runAdaptation` and calling it
      once per learner. Sequential (FR-518). It is a separate function rather
      than a loop in the handler because "what happens when the second of three
      fails" is orchestration, not wiring (FR-1111)
- [ ] T003 Deduplicate the learner list before running. A repeated code adapts
      once — she picked the same child twice, she did not ask to pay twice
- [ ] T004 Isolate failures (FR-506/507): catch per learner, record
      `{ learner, ok: false, kind, message }`, continue the loop. **The catch is
      inside the loop body**, which is the whole task — a `try` around the loop
      is the naive version and it stops at the first failure
- [ ] T005 Assert order-independence (Principle II): the same learners in reverse
      order produce the same documents. Guards against a shared accumulator
      leaking one learner's state into the next, which is the way this goes wrong
      that no happy-path test can see
- [ ] T006 [P] Atomicity per sheet (FR-509): write to a temporary path and move
      into place, so a failure or a cancellation leaves a sheet whole or absent
      and never half-written
- [ ] T007 [P] Per-learner verdicts (FR-510) — completeness, provenance and
      unaccounted-blocks checks each produce a verdict about one learner and
      never about the run
- [ ] T008 Assert the extraction is read once and never written, for a batch of
      three (FR-502). This is Principle IV, and it has been a directory layout
      and a comment since August with nothing exercising it
- [ ] T009 `BatchProgress` with `learner`, `index` and `of` (FR-519). A
      single-learner run sends `of: 1`, so the renderer needs no branch for the
      old shape

---

## Phase 3 · The wire

- [ ] T010 `job:adapt` accepts `string | string[]` and returns `BatchOutcome`
      per [contracts/job-batch.md](contracts/job-batch.md). Accepting a bare
      string keeps the e2e suite driving the application unchanged **through**
      the change, which is what lets it catch a regression in it
- [ ] T011 [P] `ui/src/data/jobs.ts`: `useAdapt` takes a list and returns the
      outcome. Errors still decode in the layer (`013` FR-1109) — and now there
      can be three of them, each belonging to a named learner
- [ ] T012 [P] Assert that `job:signOff`, `job:render`, `job:pdf`,
      `job:isSignedOff` and `job:reportData` still take exactly one learner. The
      contract's most important line: a `signOff` that took a list would be the
      «firmar todo» button FR-512 forbids, arriving through the API instead of
      through the interface

---

## Phase 4 · Choosing

- [ ] T013 `AdaptScreen`: the learner control becomes multi-select, after the
      extraction is verified. Per `016`'s clarification the flow is
      learner-first, so **this control is where the first learner becomes
      several** — `016` FR-1412 says a second learner must not feel like a
      correction, and this is the screen where that is either true or not
- [ ] T014 The cost estimate covers the batch, stated as one figure with the
      number of sheets (FR-514), and the unusual-cost gate considers the batch
      (FR-515). Three ordinary sheets can be an unusual bill
- [ ] T015 Batch progress: «2 de 3 · Mateo», with the stages as today

---

## Phase 5 · Reviewing and signing · where the constitution is at risk

- [ ] T016 `ReviewScreen` handles N sheets: a list she picks from, **not** a
      forced sequence. A sequence is how the third gets signed without being read
- [ ] T017 Each sheet keeps its own draft mark and its own sign-off (FR-511), and
      the learner is unambiguous on every screen a sheet appears on (FR-513) —
      the same worksheet three times over is exactly where a teacher signs the
      wrong one
- [ ] T018 **Assert there is no way to sign two documents with one action**
      (FR-512, SC-504) — over the rendered interface, not over the handler, since
      T012 already covers the handler. Principle VII, and the affordance is the
      risk rather than the API
- [ ] T019 Assert the review of three learners never presents their axes as
      aligned columns (`015` FR-1310, Principle V). This is the first screen in
      the application where children appear side by side, and a comparison view
      is one layout decision away

---

## Phase 6 · Close it honestly

- [ ] T020 `e2e/group.spec.ts`, then **measure**: adapt one worksheet for one
      learner and the same worksheet for three, and record both costs
      (SC-502). If the second is three times the first, the extraction is being
      re-read and FR-502 is unmet however green the suite is

---

## Not in scope, recorded so it stays a decision

- **One sheet for a mixed group** — backlog G17, a deliberate non-goal.
- **A persistent group or class** — `005` chooses learners per job; if groups are
  worth having they are `015`'s and need their own argument.
- **The record entries** (`014` FR-516) — this feature ships writing files where
  they already go and gains record rows when `014` exists. Sequenced that way in
  the plan on purpose: building the reader before there is anything worth reading
  is how you get a record designed for one row.

## Dependencies

- T001 before everything.
- Phase 2 blocks Phases 3–6 entirely.
- T010 blocks T011 and T013.
- T016 blocks T017, which blocks T018 and T019.
- **SC-506 needs a teacher** and is not a task.
