# Tasks: Composition

**Prerequisites**: plan.md, contracts/page-shell.md

**Tests**: The existing axe and layout gates run on every screen and catch
regressions loudly. What this feature adds is not a test — it is **looking**
(FR-1113), and the before/after screenshots are the record.

---

## Phase 1 · Look first

- [ ] T001 Take and keep screenshots of every screen at 1366×768, before anything changes. The success criterion of this feature is visual, so the baseline is the deliverable that makes the change reviewable rather than asserted (SC-1105)

---

## Phase 2 · The shell, built by fixing the worst screen with it

- [ ] T002 Write `ui/src/styles/composition.css`: three spacing levels, the measure applied to controls, and the middle of the type scale. Separate from `components.css`, which stays about what a thing looks like rather than where it sits
- [ ] T003 Build `ui/src/shell/Page.tsx` per the contract — title, lede, max width, rhythm — with the `wide` and `canvas` variants the two screens that need them
- [ ] T004 [P] Build `Section`, `Field` and `Actions`. `Actions` enforces one primary control (FR-1105)
- [ ] T005 Recompose **the adapt screen** with it. Worst screen, and the one a teacher opens first — a shell designed in the abstract fits nothing, so it is designed against this
- [ ] T006 Fix the rail's foot: a composed block rather than two controls pinned to the floor (FR-1106)
- [ ] T007 **Screenshot and look.** If the adapt screen is not visibly better, the shell is wrong and Phase 2 is not done

---

## Phase 3 · Outward

- [ ] T008 [P] Recompose `LearnersScreen` and `ProfileEditor`
- [ ] T009 [P] Recompose `NotesScreen` and `AboutScreen`
- [ ] T010 [P] Recompose `ConnectionScreen` and the onboarding steps
- [ ] T011 Recompose `IngestScreen`, and `VerifyScreen` on the `wide` variant — **the verification screen's two columns are the feature**, so the shell must serve it rather than flatten it
- [ ] T012 Recompose `ReviewScreen`, and check the draft mark is still the loudest thing on it. A calmer page invites calming the one element whose job is to be unmissable
- [ ] T013 Screenshot every screen again and put both sets in the record

---

## Phase 4 · The data layer

- [ ] T014 Build `ui/src/data/`: one hook per domain over the IPC surface, with loading, error and empty resolved once (FR-1107/1108)
- [ ] T015 Decode errors in the hook, not in the component (FR-1109) — a component must not be the thing that remembers to call `fromWire`, which is exactly how the raw IPC wrapper reached a teacher's screen in `008`
- [ ] T016 Move all 19 components off direct `window.rampa` calls
- [ ] T017 Assert it: zero components call `window.rampa` directly (SC-1103)

---

## Phase 5 · The back end, and the boundary

- [ ] T018 Split `ipc/corpus.ts` by subject: corpus, services, education, links
- [ ] T019 Separate orchestration from IPC registration in `jobs/` (FR-1111)
- [ ] T020 [P] Assert the Electron boundary: nothing outside `packages/shell` imports `electron` (FR-1112, SC-1104). ADR 0008 chose Electron against the numbers, so the exit stays affordable by test rather than by habit
- [ ] T021 [P] Record the size of the Electron-specific surface, so a future migration is a known number

---

## Phase 6 · Close it honestly

- [ ] T022 Update `specs/006-desktop-app/validation.md`: SC-805 moves from **not met** to whatever is now true, with both screenshot sets referenced
- [ ] T023 Add the composition rules to the CI reviewer checklist — a screen that declares its own width or gap is the regression this feature exists to prevent
- [ ] T024 SC-1101 needs a teacher's first ten seconds. Still unmet, still only collectable once, and still the only verdict that counts

---

## Dependencies

- T001 blocks nothing and must happen first anyway.
- T003 blocks all of Phase 3. T005 and T007 come **before** Phase 3: prove the
  shell on one screen before applying it to nine.
- Phase 4 and Phase 5 are independent of Phases 2-3 and of each other.

## Implementation strategy

**MVP = Phases 1-3.** That is the visible half and the one Carlos is blocked on.

**T007 is a gate, not a checkbox.** If the adapt screen does not look better after
the shell, applying the shell to nine more screens makes nine screens consistently
wrong. Stop and fix the shell.

**Do not skip T001.** A visual change with no before is a change nobody can
review — including the person who made it, who by then remembers only the after.
