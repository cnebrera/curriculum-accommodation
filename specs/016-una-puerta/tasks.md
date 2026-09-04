# Tasks: One door — the work she is doing, not the file she has

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Eighteen tasks. The sequencing puts the **compose branch before the door's polish**,
because `002` is finished code no teacher can reach and SC-1403 measures exactly
that. A door that looks better and still cannot reach it is the same failure with
nicer typography.

---

## Phase 1 · Setup

- [x] T001 The `Intent` type and its reducer in `app/ui/src/door/intent.ts`, per
      [contracts/door.md](contracts/door.md). Pure, no React — so «no screen
      re-asks what the intent already holds» is a test over a function rather than
      a convention *(done: `app/ui/src/door/intent.ts`. A reducer, not three `useState`s in a screen — the rules that matter are rules about a value.)*
- [x] T002 Write `app/ui/test/door-intent.test.ts` first, red: no default `work`,
      no default `kind`, going back keeps what she typed, and **no axis anywhere in
      the type** *(done, red first, 12 cases. And it produced the fifth instance of my own recurring test defect: `/ATT/i` flagged the word «matter» in a comment. Axis codes are now matched as standalone uppercase tokens, and «sort»/«order» are deliberately not banned as prose — the reducer's comment explaining that her order encodes nothing is a line that should exist.)*

---

## Phase 2 · Foundational · the channel that makes `002` reachable

- [x] T003 `packages/shell/src/ipc/compose.ts`: `job:compose`, wiring only — the
      orchestration is `runCompose` and this file imports `electron` and nothing
      else new (`013` FR-1111, and the boundary test counts) *(done: `packages/shell/src/ipc/compose.ts`. It grew the Electron surface, the boundary test failed, and that is the mechanism working — the bound was raised from 1,400 to 1,500 lines **with the reason written into the test**: the alternative was putting compose channels into `ipc/adapt.ts`, and one file owning the wiring for two jobs is the fusion `013` T019 split apart.)*
- [x] T004 Preload and the renderer's `window.rampa.job.compose`, with the
      `ComposeResult` shape the screen needs and nothing more *(done. `job:compose` writes the sheet and stops; adapting it is the existing `job:adapt` with the same job id.)*
- [x] T005 [P] `app/ui/src/data/compose.ts`: `useCompose`, through `useCommand`, so
      a failure lands as a sentence in her language rather than a rejected promise *(done: `app/ui/src/data/compose.ts`.)*
- [x] T006 Extend the record after a composition, exactly as `job:adapt` does
      (`014` FR-1215) — a composed job that never reaches a learner's record is
      work she cannot find again *(done, and it needed a change to `014`'s data model rather than a call to `refreshRecord`. My first version called it and wrote a comment claiming it made the material discoverable — which was false: `entryFor` returned `null` without `adapted.md`, so a composed job appeared in no record at all. A teacher who composed, was interrupted and came back would have found nothing, which is the opposite of «todo lo que se genere se queda ligado al alumno». `documents.adapted` is now optional, a composed job with `composed_for` is hers from the moment it is written, and the row says «pendiente de adaptar» rather than «sin firmar» — there is nothing to sign.)*

---

## Phase 3 · US1 — she says what she is doing (P1) 🎯 MVP

**Goal**: both doors reachable from the first screen, as peers.

**Independent test**: from a cold start, «hacer material» reaches a composed sheet
without a file picker ever appearing (SC-1401).

- [x] T007 [US1] `app/ui/src/door/DoorScreen.tsx`: learner → work → material, in
      that order (the clarification's answer), with **neither door pre-selected** *(done: `app/ui/src/door/DoorScreen.tsx`, learner → work → material, neither door pre-selected.)*
- [x] T008 [US1] The learner picker, built from `015`'s `searchRoster`,
      `filterRoster` and `facetsOf` — **not** from `LearnersScreen`, which is where
      she manages learners and where the erasure control lives (research R1) *(done: `LearnerPicker`, built from `015`'s `searchRoster`/`filterRoster`/`facetsOf` and reusing its filter bar unchanged — the «sin curso» option and the «which filter matched nobody» sentence are the two things a second copy would lose first, and they are the two that matter to the learner with the least recorded.)*
- [x] T009 [US1] A single click selects a learner **and** advances. The door is a
      flow; `015`'s screen is a place *(done. One click selects and advances; a place is browsed, a flow moves.)*
- [x] T010 [US1] «Añadir otro alumno» in the flow rather than beside it (FR-1411,
      FR-1412). Principle IV is the common case and the control must not read as a
      repair *(done — and it is the checkbox list that was already on the adapt screen, reached with the first learner already ticked. `005` built it and `016`'s clarification is why it reads as it does.)*
- [x] T011 [US1] No learners at all routes to creating one, and offers **no
      disabled control** (spec edge case, `006` onboarding) *(done, and it is the first screen a new teacher meets now that the order is learner-first — so it offers «Añadir un alumno» rather than a greyed-out control explaining what she cannot do yet.)*
- [x] T012 [US1] `app/ui/src/compose/ComposeScreen.tsx`: objectives, the anchor
      when one is needed, how many exercises. It asks for the anchor rather than
      letting the run fail later (spec edge case, `002` FR-102) *(done: `app/ui/src/compose/ComposeScreen.tsx`. It asks for the anchor as soon as a line looks like content, **before** she can start — `002`'s refusal is right and the wrong place to meet it is after the wait. There is no level field, which is the requirement rather than an omission: the level comes from his course in `011`'s corpus, and a box here would be a level talked into existence.)*
- [x] T013 [US1] The composition summary before adapting (research R2): what
      nothing could check **first**, then the shortfalls, then what was verified.
      Abandonable without spending more *(done: `ComposeSummary`, and it is not a review screen — no sign-off. What nothing could check comes first, then the shortfalls, then what was verified.)*
- [x] T014 [US1] Wire the door into `App.tsx` as the default view, and rename the
      rail: «Adaptar una ficha» is what FR-1402 forbids *(done. The rail said «Adaptar material», which named one of the two things this application does on the control that leads to both — `012` FR-1011 in so many words. `IngestScreen`'s title said it too, and now says «Traer el material».)*

**Checkpoint**: SC-1403 — **met.** `002` is reachable end to end, asserted by
`e2e/door.spec.ts`: she gets to the compose screen without a file picker ever
appearing on the route.

The claim «no code change outside this feature and `002`» did **not** hold, and the
three places it broke were all defects rather than scope creep:

- `presetJobId` was declared, typed, passed by `App.tsx` and read by nothing, so
  the photograph path could not reach an adaptation (T017).
- `job:verify` was called for every job, and throws for anything not pasted (T018).
- `entryFor` returned `null` without `adapted.md`, so a composed job appeared in no
  record (T006).

Each was found by wiring the door to what already existed. That is the argument for
building the door: a route nobody could walk was hiding three broken paving stones.

---

## Phase 4 · US2 — an exam is called an exam (P1)

- [x] T015 [US2] The chosen kind in the interface's own words from then on
      (FR-1404), read from `instructions/material-kinds.md` and never hardcoded *(done, from `instructions/material-kinds.md`.)*
- [x] T016 [US2] The exam constraint on the primary action's own row, before the
      run (FR-1405, research R3) — not a callout that becomes furniture, and not a
      modal that trains her to click through *(done, and it needed a corpus field rather than interface copy. `corpus:materialKinds` deliberately kept `forbids` out of the renderer, so the only way to build this sentence in the interface was to compose it from prohibition ids in TypeScript — which is a sentence about pedagogy written in code. `instructions/material-kinds.md` now carries `before:` per kind: `rule` is for the model, `forbids` for the report, `before` for her, before she spends. A new kind brings its own sentence with no code change.)*

---

## Phase 5 · US3 — for whom, and it lands in their record (P1)

- [x] T017 [US3] One extraction, one adaptation per learner, straight through
      `005`'s `runBatch` — and the primary action says **what is missing** rather
      than being mysteriously disabled (`013` FR-1105) *(done — straight through `005`'s `runBatch`, unchanged. And **this task found a live defect**: `presetJobId` was declared, typed, passed by `App.tsx` after every ingest, and read by nothing. A teacher who photographed a worksheet, waited for the extraction and confirmed every page landed on a screen with an empty paste box and no job — the photograph path could not reach an adaptation, and it type-checked. `ui/test/props-are-read.test.ts` now fails on any prop that is destructured and never read, which is that defect's mechanically detectable signature.)*

---

## Phase 6 · US4 — start from something she already did (P3)

- [x] T018 [US4] «Hazlo otra vez para otro alumno» from a record row: reuses the
      stored extraction and makes **no ingest call** (FR-1409, SC-1405) *(done. «Hacerlo otra vez para otro alumno» reuses the stored extraction through `presetJobId`, so no provider call is made for the reading. The second half of the same defect: `runAdapt` called `job:verify` unconditionally, which throws for anything not pasted — so even with the job id, the flow bounced back with «hay que confirmarlo página a página» about a page she had already confirmed.)*

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

## What is verified, and what is not

**Verified**: 1,049 unit tests and 63 e2e, including six new door tests — the
compose route with no file picker (SC-1401), both doors offered as peers with
neither pre-selected, the action naming what is missing, an objective surviving a
trip back to the door (FR-1408), the anchor asked for before the run, and an exam
saying what will not change before she presses the button (FR-1405).

**Not verified**: no composition has run against a real provider, here or in
`002` — there is no key in the e2e suite on purpose. The route is open and tested;
what comes back down it has met no model.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-1401 | **Retired 2026-09-01 by `020` FR-1801** — the opening screen is her caseload, not a question about work. Was T007 · `DoorScreen`'s two `.door` controls, neither pre-selected. The substance survives as `020` FR-1812: the same two choices, still neither pre-selected, inside the learner. The `aria-pressed="false"` assertion moves with them |
| FR-1403 | T007 · the kinds come from `012`'s corpus with nothing pre-selected, and `e2e/material.spec.ts` asserts it over all four |
| FR-1406 | T017 · straight through `005`'s `runBatch`. The door's learner is the **first**, not the only one — the checkbox list stays on the adapt screen, which `e2e/group.spec.ts` caught when it briefly did not |
| FR-1407 | `job:adapt` calls `refreshRecord` per learner that got a sheet, and `job:compose` calls it too (T006) |
| FR-1408 | T007 · the intent's reducer lives **above** the screens, in `App.tsx`, and that placement *is* the requirement: with `reduceIntent` inside `DoorScreen`, pressing «Volver» from the compose screen returned to a door that had forgotten which child it was for, because navigation had unmounted the state. `ui/test/door-intent.test.ts` holds the reducer, and the note in `App.tsx` records what the e2e caught. **Half-open**: `e2e/door.spec.ts` walks door→compose→back, and what the review found still missing (FLU-07) is the compose screen's own answers — objectives, anchor, kind, minutes — which it asks for itself and loses on the same trip. `026`/`020` US2 own the fix; the door's half holds |
| FR-1410 | **Satisfied by absence, and it is the requirement this feature could most easily have broken.** No file under `ui/src/door/` or `ui/src/compose/` touches a recipe, an instruction or a prompt. The contract states the test: a diff to `016` that changes `recipes/`, `instructions/` or `prompt/` is specifying something `001`, `002` or `012` owns |
