# Tasks: One door — the work she is doing, not the file she has

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Eighteen tasks. The sequencing puts the **compose branch before the door's polish**,
because `002` is finished code no teacher can reach and SC-1403 measures exactly
that. A door that looks better and still cannot reach it is the same failure with
nicer typography.

---

## Phase 1 · Setup

- [ ] T001 The `Intent` type and its reducer in `app/ui/src/door/intent.ts`, per
      [contracts/door.md](contracts/door.md). Pure, no React — so «no screen
      re-asks what the intent already holds» is a test over a function rather than
      a convention
- [ ] T002 Write `app/ui/test/door-intent.test.ts` first, red: no default `work`,
      no default `kind`, going back keeps what she typed, and **no axis anywhere in
      the type**

---

## Phase 2 · Foundational · the channel that makes `002` reachable

- [ ] T003 `packages/shell/src/ipc/compose.ts`: `job:compose`, wiring only — the
      orchestration is `runCompose` and this file imports `electron` and nothing
      else new (`013` FR-1111, and the boundary test counts)
- [ ] T004 Preload and the renderer's `window.rampa.job.compose`, with the
      `ComposeResult` shape the screen needs and nothing more
- [ ] T005 [P] `app/ui/src/data/compose.ts`: `useCompose`, through `useCommand`, so
      a failure lands as a sentence in her language rather than a rejected promise
- [ ] T006 Extend the record after a composition, exactly as `job:adapt` does
      (`014` FR-1215) — a composed job that never reaches a learner's record is
      work she cannot find again

---

## Phase 3 · US1 — she says what she is doing (P1) 🎯 MVP

**Goal**: both doors reachable from the first screen, as peers.

**Independent test**: from a cold start, «hacer material» reaches a composed sheet
without a file picker ever appearing (SC-1401).

- [ ] T007 [US1] `app/ui/src/door/DoorScreen.tsx`: learner → work → material, in
      that order (the clarification's answer), with **neither door pre-selected**
- [ ] T008 [US1] The learner picker, built from `015`'s `searchRoster`,
      `filterRoster` and `facetsOf` — **not** from `LearnersScreen`, which is where
      she manages learners and where the erasure control lives (research R1)
- [ ] T009 [US1] A single click selects a learner **and** advances. The door is a
      flow; `015`'s screen is a place
- [ ] T010 [US1] «Añadir otro alumno» in the flow rather than beside it (FR-1411,
      FR-1412). Principle IV is the common case and the control must not read as a
      repair
- [ ] T011 [US1] No learners at all routes to creating one, and offers **no
      disabled control** (spec edge case, `006` onboarding)
- [ ] T012 [US1] `app/ui/src/compose/ComposeScreen.tsx`: objectives, the anchor
      when one is needed, how many exercises. It asks for the anchor rather than
      letting the run fail later (spec edge case, `002` FR-102)
- [ ] T013 [US1] The composition summary before adapting (research R2): what
      nothing could check **first**, then the shortfalls, then what was verified.
      Abandonable without spending more
- [ ] T014 [US1] Wire the door into `App.tsx` as the default view, and rename the
      rail: «Adaptar una ficha» is what FR-1402 forbids

**Checkpoint**: SC-1403 — `002` is reachable, and the only code outside `016` and
`002` that changed is the rail's label.

---

## Phase 4 · US2 — an exam is called an exam (P1)

- [ ] T015 [US2] The chosen kind in the interface's own words from then on
      (FR-1404), read from `instructions/material-kinds.md` and never hardcoded
- [ ] T016 [US2] The exam constraint on the primary action's own row, before the
      run (FR-1405, research R3) — not a callout that becomes furniture, and not a
      modal that trains her to click through

---

## Phase 5 · US3 — for whom, and it lands in their record (P1)

- [ ] T017 [US3] One extraction, one adaptation per learner, straight through
      `005`'s `runBatch` — and the primary action says **what is missing** rather
      than being mysteriously disabled (`013` FR-1105)

---

## Phase 6 · US4 — start from something she already did (P3)

- [ ] T018 [US4] «Hazlo otra vez para otro alumno» from a record row: reuses the
      stored extraction and makes **no ingest call** (FR-1409, SC-1405)

---

## Not in scope, recorded so it stays a decision

- **A wizard with steps she cannot skip.** She will be interrupted — that is
  `009`'s premise — and a five-step flow with no way back is how a setup gets
  abandoned.
- **A second sign-off.** The composition summary is not a review screen. One thing
  in this application removes the draft mark and it stays `job:signOff`.
- **Persisting a half-finished intent.** Same reasoning as `015`'s filters.

## Dependencies

- T001-T002 before everything.
- T003-T006 block Phase 3's compose half.
- `002` and `012` shipped; `014` and `015` shipped.
- **SC-1406 needs a person** and is not a task. It is also the criterion this
  feature is actually judged on.
