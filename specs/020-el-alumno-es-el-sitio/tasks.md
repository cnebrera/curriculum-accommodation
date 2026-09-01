# Tasks: El alumno es el sitio — la navegación

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-01

Forty-one tasks, and the shape of the list is the argument: **eight of them are the
route and the one field on disk**, before a single screen moves. Both navigation defects
this project has already found were navigation state held in the wrong place, and moving
twenty destinations on top of that mistake would produce twenty of it.

**Tests are written first**, per the repository's practice: `ui/test/door-intent.test.ts`
is the model for T001, and it exists because the door forgot which child it was for.

---

## Phase 1 · Setup

- [x] T001 Write `app/ui/test/route.test.ts` **first**, red, from
      [quickstart.md](quickstart.md) §1. Six cases, each one a defect this project has
      had or is one move away from: entering a learner lands on a section rather than on
      nothing; the current section pressed again starts over; changing learner mid-flow
      does not carry the previous learner's job; `also` always contains the entered
      learner; a flow cannot exist outside `prepare`; nothing is persisted

---

## Phase 2 · Foundational · the route, and the field, before any screen moves

**Blocking**: nothing in Phase 3 or later may start until this phase is green.

> **Corrected 2026-09-01, during implementation.** T006 and T007 — the `for_learner`
> field and `ingest:pending` returning it — started in this phase, on the plan's
> reasoning that «the field goes in before the marker that reads it». Writing T005
> showed that argument only holds *inside* one phase: US1 has no writer for the field
> (a job gains its learner in `Preparar`, which is US2) and no reader either, so
> shipping them here would leave a field written by nobody and read by nobody across
> two phases — **the exact defect this project has found ten times.** Moved to Phase 4,
> immediately before T026/T027, which are its first reader and writer.
 *(done, red first — 11 cases, four more than planned: settings as a place, no duplicate when she picks the entered learner explicitly, and starting a flow from another section.)*
- [x] T002 `app/ui/src/nav/route.ts` — `Route`, `LearnerTab`, `Flow`, `SettingsPane` and
      a pure `reduceRoute`, per [data-model.md](data-model.md). The route holds a
      **code, never a name** (FR-1806): a name in navigation state is a name a future
      «restore where I was» could try to persist *(done. `startRoute`, `reduceRoute`, `learnerTabs` and `MAIN_TABS` — the menu renders from the exported list rather than a second copy, because two lists of «which sections exist» is where one gains a destination and the other does not.)*
- [x] T003 `also` MUST always contain the entered learner, enforced in the reducer
      (FR-1814). Modelling it as «the others» is how `016` FR-1411 gets broken by a data
      structure instead of by a screen *(done, in `withSelf`, and it deduplicates: she can tick the entered learner explicitly without him appearing twice.)*
- [x] T004 [P] A `Flow` MUST be unrepresentable outside `tab: 'prepare'` — by the type,
      so no screen can render a step outside the section that owns it *(done. `flow/start` from another section moves her to `prepare` rather than refusing silently — a refusal that looks like a dead button is the FR-1105 defect wearing a different hat.)*
- [x] T005 [P] Nothing is persisted across restarts; restarting lands on the caseload.
      Same argument `015` applied to filters *(done, and asserted over the **source**: no `localStorage`, `sessionStorage` or `indexedDB` anywhere in the file. The tempting version of «be helpful» is one call away.)*
- [x] T008 Rewrite `app/e2e/door.ts` as `app/e2e/nav.ts` — the one place that knows how
      to walk to a screen. Done now rather than at the end so every later step is
      verified by a suite that already agrees with the new shape. **Routes change; what
      they assert does not**

**Checkpoint**: `npx vitest run ui/test/route.test.ts` green, and the offline suite still
passes with no screen having moved.

---

## Phase 3 · User Story 1 · Entering a learner (P1) 🎯 MVP

**Goal**: the caseload is where she starts, a learner is a place with a menu, and the two
consultation tasks stop being buried.

**Independent Test**: open the application, pick a learner, read who they are, open what
has been prepared for them, go back — **without ever opening a form to get somewhere**.

> **Design corrected 2026-09-01, by looking at it.** T009 first built the learner's menu
> as a **second column beside the rail** — which is what the specification's own
> Assumptions described, and what Carlos rejected the moment he saw it. He was right and
> it is measurable: 248px of rail + 221px of menu + 32px gap is **501px of chrome before
> the content**, 37% of a 1366px window, and 43% at the large text scale, in an
> application whose content is a worksheet.
>
> Four options were mocked up to scale in the real palette. The one taken — **A** — has
> the rail *become* the learner's: outside a learner it holds her caseload and the
> settings; inside one it holds the way back, their name, and their sections. One column,
> one place to look, 253px handed back to the sheet, and **no change to the shell** — so
> it costs no layout or accessibility test.
>
> What it costs, stated: «Configuración» is not visible from inside a learner. It is a
> destination reached twice a month and it lives in the rail's foot, beside the cost
> badge and the text-size control.

**This phase removes nothing.** «Preparar material» stays in the top level until US2
replaces it, so at no point is there a Rampa where the work cannot be done. FR-1802's
«exactly two destinations» is therefore satisfied at T037, not here — stated so it is a
sequencing decision and not a requirement quietly unmet.
 *(done: `e2e/door.ts` → `e2e/nav.ts`, with the learner walks added and the door's half kept and marked with the task that deletes it. Five specs re-pointed. Both shapes live there at once because US1 removes nothing.)*
- [x] T009 [US1] `app/ui/src/nav/LearnerShell.tsx` — the learner's heading (name, code,
      their own axis strip per FR-1806) and their menu, with the sections rendered
      inside it. The menu MUST stay visible during flows (FR-1807) *(done as **option A**: `nav/Rail.tsx`, one rail that changes with where she is. `LearnerShell.tsx` was written, built, looked at and deleted — see the note above.)*
- [x] T010 [US1] The caseload becomes the opening screen (FR-1801), keeping every filter,
      search, facet and grouping `015` built *(done. `LearnersScreen` went from 355 lines to 199: it lists, and it says which learner she picked. The four sub-views it held in local state are destinations now.)*
- [x] T011 [P] [US1] `Quién es` renders `ProfileEditor` and the pictogram section, and
      **nothing else** *(done — the editor and the pictogram section, and nothing else.)*
- [x] T012 [P] [US1] `Lo que le he preparado` renders `014`'s record as a destination in
      its own right (FR-1805). This is the assertion the whole specification exists for *(done, and asserted end to end: `e2e/nav.spec.ts` reaches the record from the menu and checks the editor's own fields are **not on the screen at all**, which is what «without opening the editor» means when it is checked rather than claimed.)*
- [x] T013 [P] [US1] Handover and erasure at the foot of the learner's menu, set apart
      from the four (FR-1804) *(done, below a rule. And the rule needed fixing at 560px, where it had turned into a vertical hairline that disappeared into the wrap — leaving «Borrar todo lo suyo» beside the ordinary sections as though it were one. Found in a screenshot, which is the whole reason FR-1118 exists.)*
- [x] T014 [US1] **Strip the six cards out of `ProfileEditor`** — record, guide, ACNS,
      ACS, handover, erase. It goes back to being only the editor. The cards are the
      defect; the destinations are the fix *(done, and the diagnosis was **more precise than the specification said**: the six cards were not inside `ProfileEditor`, they wrapped it in `LearnersScreen`'s `editing` sub-view. Identical effect for her — go in to edit to reach them — but the fix was splitting the screen, not stripping the editor. Their words survive in `LearnerSections.tsx`: «no la escribo yo, la ordeno» is the sentence that tells a PT what the ACNS draft is.)*
- [x] T015 [P] [US1] Choosing the destination she is already in returns to its start
      (FR-1809). Shipped broken once already: the rail set a `view` it already had while
      the screen's own state survived *(done in the reducer, so it holds for every destination rather than for the one screen somebody remembered.)*
- [x] T016 [P] [US1] The active destination is distinguishable with colour removed
      (FR-1810), and every destination announces which section it is (FR-1822) *(done — `.rail button[aria-current]` already carried the active state with a fill, bold weight and a shadow rather than colour alone, so option A inherited FR-1810 for free. The rail's accessible name follows its contents: «Secciones de Rampa» outside a learner, «Apartados de <nombre>» inside — a region whose label says one thing while holding another lies to a screen reader.)*
- [x] T017 [US1] `app/e2e/nav.spec.ts` from quickstart §2 — including **the record
      reached without passing through the profile editor**, and every section reachable
      by keyboard alone *(done, `e2e/nav.spec.ts`, 8 cases — including «US1 removes nothing: the door is still reachable», so the sequencing promise is asserted rather than trusted.)*
- [x] T018 [P] [US1] Update the screen list in `e2e/a11y.spec.ts` and `e2e/layout.spec.ts`
      to the new shape. A stale list here is a set of screens nobody checks

**Checkpoint**: US1 is usable and nothing has been taken away.

---

## Phase 4 · User Story 2 · Preparing something, from inside the learner (P2)

**Goal**: the door's work happens inside the learner, and the door goes.

**Independent Test**: from inside a learner, adapt one worksheet for her and the same
worksheet for three, and confirm the source was read once.
 *(done, plus `scripts/screenshot.mjs`, which walked the old rail and timed out on a control the rail no longer holds — the screenshots now include the learner's rail at 560, 880, 892 and 1024, which is where option A either holds or does not.)*
- [ ] T019 [US2] `app/ui/src/prepare/` — the two branches offered as peers with neither
      pre-selected (FR-1812). This is `016` FR-1401's substance, relocated
- [ ] T020 [US2] Step 1 asks what the material is, explicitly and with no default
      (FR-1813), still reading `instructions/material-kinds.md` — the kind picker must
      not become a hard-coded list on its way across the application
- [ ] T021 [P] [US2] Move `whatIsMissing` and the drop-the-kind-when-the-branch-changes
      rule out of `door/intent.ts` **with their tests** (research R2). An exam that
      becomes a composition must not silently keep «examen»
- [ ] T022 [US2] Steps 2 and 3 — bring the material, check the reading — inside the
      section, with the learner's menu still visible and the current step marked
- [ ] T023 [US2] Step 4, «¿para quién más?», with the entered learner already included
      and no re-asking of the work or the material (FR-1814, FR-1816)
- [ ] T024 [US2] The batch's cost stated as one figure before the run, with the
      unusual-cost gate considering the batch (`005` FR-514/FR-515) — which is why step 4
      comes after verification and not before
- [ ] T025 [US2] Step 5 reviews and signs **per learner**, with no action anywhere that
      signs two sheets (FR-1815)
- [ ] T006 [US2] `packages/shell/src/jobs/ingest.ts` writes `for_learner` into `ir.md`
      at creation. **`startedFor()` already exists**: `021` T004 built it in
      `packages/core/src/vault/document.ts`, because that feature arrived first and needed
      it — so this task shrank to the writer. And building it there immediately found a
      reader nobody had thought about: `record/scan.ts` read `composed_for` directly, so a
      job stamped with the current spelling vanished from her record
- [ ] T007 [US2] `ingest:pending` returns `learner?`, from **one** walk of `material/`
      (FR-1828). Optional and it must stay optional: every job in every vault today has
      no such field, and treating its absence as an error would break the first vault it
      met
- [ ] T026 [US2] «Tenías esto a medias» inside `Preparar`, and the marker on the learner
      in the caseload (FR-1825, FR-1826). Continuing MUST NOT re-read the source through
      a provider
- [ ] T027 [P] [US2] Half-finished work belonging to no learner — **all of it in any
      vault today** — surfaces in the caseload and asks who it is for (FR-1827)
- [ ] T028 [US2] Retire the door: remove it from the top level and delete
      `app/ui/src/door/`, with `016` FR-1401 already marked retired in its own spec
      (FR-1801)
- [ ] T029 [P] [US2] Leaving a flow midway says what has already been spent and does not
      block (FR-1808). A teacher with a class in ten minutes must never be held inside a
      screen
- [ ] T030 [US2] Extend `e2e/nav.spec.ts` with the five steps, and keep
      `e2e/group.spec.ts`'s «no way to sign two documents with one action» passing over
      the new screens

**Checkpoint**: the door is gone and nothing it did was lost.

---

## Phase 5 · User Story 3 · The curriculum document has its own place (P3)

**Goal**: `017` becomes a section of the learner rather than a card under a form.

**Independent Test**: reach all four `017` screens from inside a learner, and confirm the
refusals still refuse.

- [ ] T031 [US3] `Su adaptación curricular` holds bringing the document, the ACNS draft
      and ACS help, reached from the learner's menu
- [ ] T032 [P] [US3] Assert the ACS locks survive the move: asking which objectives to
      remove still declines and still names who decides. A move is exactly when a
      refusal gets left behind

---

## Phase 6 · User Story 4 · Configuración stops being scattered (P4)

**Goal**: one place for settings, and what Rampa learned about a child moves to the child.

**Independent Test**: every setting reachable from one top-level destination; a
learner-scoped journal entry visible inside that learner.

- [ ] T033 [US4] `Configuración` with the service, the house style, the display
      controls, the vault location and the licences (FR-1817)
- [ ] T034 [US4] Split `NotesScreen` by `scope`: house style plus `practice` and `corpus`
      entries stay here (FR-1819). **Nothing about what is written, where, or by whom
      changes** (FR-1820) — this is a change of where things are read
- [ ] T035 [P] [US4] Journal entries scoped to a learner appear inside that learner
      (FR-1818). Nothing infers a scope and nothing moves an entry between scopes
      (Principle VIII)
- [ ] T036 [P] [US4] «Acerca de» and the licences move inside `Configuración`
- [ ] T037 [US4] The top level is now **exactly two destinations** (FR-1802), and the
      rail's foot — cost badge, display preferences, locale — stays as it is (`013`
      FR-1106)

---

## Phase 7 · Polish · and the parts that need a person

- [ ] T038 **Look at it**, narrow and at `xlarge` (`013` FR-1113/FR-1118, SC-1805). Three
      columns is the failure; the menu must have become a strip. Also: a learner with
      nothing prepared, a learner with thirty items, and the unfinished marker in a
      caseload of thirty
- [ ] T039 [P] Assert no view orders or compares learners by axis, including the grouped
      view (FR-1821, SC-1807). The caseload is the screen `015` wrote that rule about and
      the screen this feature rebuilds
- [ ] T040 Run quickstart §6 with a real key: three sheets, one cost figure, one
      signature at a time, and a correction afterwards naming the stale sheets by learner
      (`005` FR-520 still working after the move)
- [ ] T041 Archive it: the coverage table below kept current, and a `specs/BACKLOG.md`
      entry recording **why** the navigation changed, so in six months it reads as a
      decision and not as drift

---

## Not in scope, recorded so it stays a decision

- **Redesigning the flows themselves.** `008`, `001`, `002` and `005` own what happens
  inside ingest, adaptation, composition and the batch. This feature moves where they
  live and adds one step.
- **A groups or class entity.** `005` chose learners per job and `015` chose filters over
  groups; if a persistent group is worth having it needs its own argument.
- **Persisting where she was.** Deliberate — see FR and data-model.
- **A third top-level destination.** FR-1802. Five is what this is fixing.

## Dependencies

- T001 before everything.
- **Phase 2 blocks Phases 3–7 entirely.**
- T006 before T007, and both before T026 — the field before the marker that reads it, **all three inside US2** (see the note in Phase 2 for why they moved).
- T008 before T017, T018 and T030.
- T009 before T011, T012, T013.
- T019 before T020–T025; T023 before T024.
- **T028 (retiring the door) must not land before T019–T025 are green.**
- T033 before T034, T035, T036; T037 last of Phase 6.
- **SC-1803 needs a teacher and is not a task.** It is quickstart §7, collectable once.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks rather than after them — the lesson `002` taught on 2026-08-31, when
five requirements sat uncited for a day and one of them was a live defect.

| | Where it is satisfied |
|---|---|
| FR-1801 | T010 (caseload as the opening screen) · T028 (the door retired) |
| FR-1802 | **T037**, not T009 — US1 deliberately removes nothing, so the top level holds five destinations until US2 replaces the door. A sequencing decision, stated rather than left looking like an unmet requirement |
| FR-1803 | T009 · `LearnerShell` is the learner as a place |
| FR-1804 | T009, T011, T012, T013 · four sections plus two set apart |
| FR-1805 | **T012 and T014** · the record as its own destination, and the six cards stripped out of the profile editor. The defect this specification was opened for |
| FR-1806 | T002 (a code, never a name, in the route) · T009 (the heading, with the learner's own axis strip) |
| FR-1807 | T009 · T022 keeps it true during the flow |
| FR-1808 | T029 |
| FR-1809 | T015 |
| FR-1810 | T016 |
| FR-1811 | T002, and T001's case «changing learner mid-flow does not carry the previous learner's job» |
| FR-1812 | T019 |
| FR-1813 | T020, reading the corpus rather than a list copied into the renderer |
| FR-1814 | T003 (in the reducer) · T023 (on the screen) |
| FR-1815 | T025 · T030 keeps `005` FR-512's assertion passing over the new screens |
| FR-1816 | T023, and `014` already records against every learner |
| FR-1817 | T033 · T036 |
| FR-1818 | T035 |
| FR-1819 | T034 |
| FR-1820 | T034 · asserted as an absence: the notes split changes no write path |
| FR-1821 | T039 |
| FR-1822 | T016 · T017 asserts keyboard reach |
| FR-1823 | T038 — **looked at, not asserted.** `013` FR-1114 rules out a pixel-diff suite, so this is a human check and says so |
| FR-1824 | Inherited: every section renders inside the existing `Page` shell, unchanged |
| FR-1825 | T026 |
| FR-1826 | T026 · reuse without a provider call is `005` FR-503 already built |
| FR-1827 | T027 |
| FR-1828 | T007 · one walk of `material/`, not one per learner |
