# Tasks: Material de estructura

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-nine tasks, and the first one is a test about a learner fact leaving the school in
a backpack. The shape of the rest is a consequence of research R1: **structure material
is a job**, so the record, erasure, printing and sign-off mostly arrive by widening one
predicate — and the builder never resolves a drawing itself, because the four rungs
already exist in exactly one place.

---

## Phase 1 · Setup · the two tests that come first

- [x] T001 Write `app/packages/core/test/structure-no-learner-facts.test.ts` **first**,
      red, per [quickstart.md](quickstart.md) §1. Both halves of SC-2603 over a generated
      corpus of structure documents: no rendering — HTML, ODT, linear — contains the
      learner's code, name or any other learner fact (**FR-2608**, via
      `assertNoLearnerData` plus accented-name fixtures), and every rendering with a
      pictogram carries the set's real derived attribution (**FR-2607**). Written before
      any render path exists, because this failure mode leaves the building
- [x] T002 [P] Write `app/packages/core/test/structure-build.test.ts` **first**, red,
      from quickstart §2: the seven builder cases — override wins, vocabulary next, set
      next, ambiguous → declared gap plus report line, none → silent gap, a child's name
      → nothing and no report line, same args → byte-identical document (**FR-2605**,
      **FR-2606**, the core half of **FR-2603**)

---

## Phase 2 · Foundational · the builder and the widened predicate

**Blocking**: nothing in Phase 3 or later may start until this phase is green. Printing,
signing, the record and erasure all flow through `resolveDocument`/`startedFor`; if a
structure job is not recognised as generated, every later task fails at a distance from
the cause.

- [x] T003 `app/packages/core/src/structure/build.ts` · `buildStructure(args) → Built`
      per [contracts/structure-document.md](contracts/structure-document.md): pure,
      deterministic, no filesystem, no model (**FR-2602**, **FR-2603**); every drawing
      resolved by `matchWord` with the caller's `overrides`/`chosen`/`names`
      (**FR-2605**); `ambiguous`/`none` become declared gaps and are returned verbatim in
      `gaps` (**FR-2606**); her item order is never changed. Front matter per
      [data-model.md](data-model.md): `source: structure`, `structure: <kind>`,
      `for_learner`, `language`
- [x] T004 `app/packages/core/src/ir/types.ts` · `isGenerated` accepts
      `source: structure` beside `source: composed`, with the comment saying why an
      ingested *reading* stays unprintable. Test in
      `app/packages/core/test/document.test.ts`: a structure job resolves, is refused to
      another learner, and derives the draft mark from the document (**FR-2604**'s
      resolution half)
- [x] T005 [P] `app/packages/core/src/record/entry.ts` + `scan.ts` · `RecordSource` gains
      `{ of: 'structure'; kind }` and `sourceOf` reads it from the front matter — the
      record must not describe an agenda as «composed from objectives: —». Test: a saved
      structure job is listed for its learner with kind and date, unadapted, via the
      existing `startedFor` branch (**FR-2604**)
- [x] T006 Assert the structural rule at source level, in
      `app/packages/core/test/structure-build.test.ts`: **no access to
      `set.byLanguage` outside `pictograms/match.ts`** — the four rungs are one
      mechanism, and a second lookup is how they fork (**FR-2605**)

**Checkpoint**: T001 and T002 green for the builder-and-render half; the offline suite,
the isolation suite and the boundary test still passing.

---

## Phase 3 · User Story 1 · The day on a strip (P1) 🎯 MVP

**Goal**: open a learner, assemble an agenda from the set, order it, sign it, print it —
offline, no provider, no cost, five minutes.

**Independent Test**: quickstart §4 with the network disabled.

- [x] T007 [US1] `app/packages/core/src/render/html.ts` · the agenda template as block
      class + CSS beside the existing `.picto` rules: `agenda-moment` as a strip cell,
      picto ≈35mm with the word always beneath (research R3), passing `checkPhotocopy`
      (**FR-2607**). No new renderer — Principle IV
- [x] T008 [US1] `app/packages/shell/src/jobs/structure.ts` · `saveStructure`: allocate a
      job id, call `buildStructure` with the current set (`currentPictogramSet`), the
      learner's overrides, her vocabulary (`forLanguage`) and `nameWordSet()`, and write
      `material/<job>/ir.md` through the vault. No IPC registered here; nothing outside
      `packages/shell` imports `electron` (**FR-2602**, **FR-2604**)
- [x] T009 [US1] `app/packages/shell/src/ipc/structure.ts` · thin handlers: save, and the
      builder's candidate/chooser calls **reusing** `candidatesFor` and
      `pictogramImagesFor` from `pictograms/` — the chooser writes to her vocabulary via
      the existing `choose`, so a choice made here serves adapted material too
      (**FR-2605**)
- [x] T010 [US1] Assert the zero-cost claim structurally, in
      `app/packages/shell/test/`: the agenda/sequence path imports nothing from
      `@rampa/providers` and records no cost entry — a source-level check beside the
      boundary test, because «no model call» must not depend on nobody adding one
      (**FR-2602**)
- [x] T011 [US1] `app/ui/src/structure/` · the builder screen: kind picker, moment
      picker, her ordering (declared with `Page`/`Section`/`Field`/`Actions` from
      `ui/src/shell/`; data access through a hook in `ui/src/data/`, never
      `window.rampa`). Ambiguous words offer the same chooser as `ChooseWord`, nothing
      pre-chosen; gaps render as the word with the gap stated (**FR-2606**)
- [x] T012 [US1] The third entry itself: «material de estructura» beside adaptar and
      componer, from the learner per `020`'s placement, in `app/ui/src/App.tsx` +
      `app/ui/src/door/` — not routed through either existing door (**FR-2601**)
- [x] T013 [P] [US1] The missing-set state: door reachable, explains what is missing, one
      pointer to Configuración ▸ Pictogramas — `025` FR-2303's pattern, driven by
      `currentPictogramSet`/`publisherState` (**FR-2612**)
- [x] T014 [P] [US1] The honesty hint in the builder screen: Rampa makes materials, it is
      not a communication system (SAAC) — claim materials, not therapy (**FR-2613**)
- [x] T015 [US1] Print and sign through the existing paths — `jobs/print.ts` over
      `resolveDocument`, sign-off through the one existing IPC (research R4: no
      born-signed shortcut; the mark stays derived and one call removes it). E2E
      `app/e2e/structure-agenda.spec.ts` per quickstart §4: build offline, sign, print,
      attribution present, no cost entry, no learner fact (**FR-2602**, **FR-2607**,
      **FR-2608**, SC-2601)

**Checkpoint**: US1 delivers alone — an agenda, offline, zero cost, printed.

---

## Phase 4 · User Story 2 · A routine in steps, saved and reprinted (P1)

**Goal**: numbered sequences; saved material reprints identically; the record lists it
and erasure removes it.

**Independent Test**: quickstart §5 — build, save, close, reopen, reprint: identical.
Record shows the entry.

- [x] T016 [US2] `app/packages/core/src/render/html.ts` · the sequence template:
      `secuencia-step` rows with `data-number` — number, picto, short label — legible in
      greyscale, passing `checkPhotocopy` (**FR-2607**)
- [x] T017 [US2] Sequence assembly in the builder screen (`app/ui/src/structure/`):
      steps, numbering shown, reordering renumbers — the numbers are positions, not
      labels she maintains
- [x] T018 [US2] The reprint invariant, `app/packages/core/test/structure-reprint.test.ts`:
      render of a saved sequence today equals render of the same file later — including
      **after her vocabulary changes**, because saved material does not chase the
      vocabulary (`024`'s already-made-sheets rule; **FR-2603**, SC-2602)
- [x] T019 [US2] The record surfaces it: kind, date and reprint access in
      `app/ui/src/learners/` record view, reprinting through the resolved document —
      no new render path (**FR-2604**)
- [x] T020 [P] [US2] Erasure: `app/packages/core/src/memory/forget.ts`'s planner covers a
      structure job via `entryFor` — test that erasing the learner removes it with
      everything else, and that a structure-only learner (no adaptations ever) is not
      missed (**FR-2604**)
- [x] T021 [US2] E2E `app/e2e/structure-sequence.spec.ts` per quickstart §5: save, close,
      reopen from the record, reprint identical; vocabulary change does not alter it
      (**FR-2603**, **FR-2604**)

**Checkpoint**: US1+US2 — the two deterministic kinds, saved, listed, erasable,
reprint-identical.

---

## Phase 5 · User Story 3 · A social story that is a draft (P2)

**Goal**: the one kind that spends money, through the standard path — nothing new
between her and the provider.

**Independent Test**: quickstart §7.

- [ ] T022 [US3] `instructions/social-story.md` · the judgement, in Markdown a teacher
      can read and correct (Principle I): first person, short sentences, present tense,
      the concrete situation, what must not be presented as fact — and the report's
      invented-details wording lives **here**, not in `jobs/` (**FR-2611**). Ships with
      a before/after example and at least one anti-pattern, per the quality gates
- [ ] T023 [US3] `app/packages/shell/src/jobs/structure.ts` · `runStory`: system prompt =
      `loadInstruction('hard-rules')` + `loadInstruction('social-story')`; her situation
      text is the instruction, anything attached is content delimited via the existing
      annotation (`annotateInjection`/`injectionNotices`) (**FR-2610**); egress only
      through `sendRedacted`; cost recorded via the existing recording; output written as
      an **unsigned** structure job, `structure: historia` (**FR-2609**)
- [ ] T024 [US3] Pictogram support over the drafted text through `applyPictograms` +
      `matchWord` with her vocabulary — the same machinery as adapted material, asserted
      by reusing the `018`/`024` fixtures (**FR-2605**)
- [ ] T025 [US3] The story's report carries the anti-anchoring line from the corpus —
      concrete details are the model's invention until edited — surfaced in the review
      screen and in `report.md` (**FR-2611**)
- [ ] T026 [P] [US3] The redaction test, `app/packages/shell/test/`: a classmate's name
      in the situation text is caught by the same gate as notes (`nameWordSet` through
      `sendRedacted` — P17's hardened rule); and printing unsigned shows the draft mark,
      which only the existing sign-off removes (**FR-2609**)
- [ ] T027 [US3] UI: the situation form in `app/ui/src/structure/`, cost shown in `006`
      FR-403's terms, review/edit/sign through the existing review screen — E2E
      `app/e2e/structure-story.spec.ts` per quickstart §7 (**FR-2609**, **FR-2610**,
      **FR-2611**)

**Checkpoint**: all three kinds; only the historia ever touched a provider.

---

## Phase 6 · Polish

- [ ] T028 `npm run shots` and **look at them** (quickstart §6): the strip at print
      width, the numbers before the drawings, the gap that looks deliberate, the SAAC
      hint that reads as honesty. No assertion answers these
- [ ] T029 Run the full suites — `npm test`, `test:isolation`, `test:injection`, the
      Playwright walks — and record in this file's coverage notes what was genuinely
      verified and what was not, in `specs/006-desktop-app/validation.md`'s spirit

---

## Coverage · every FR, where it is kept

| FR | Where |
|---|---|
| FR-2601 | T012 · its own entry, not routed through adaptar or componer |
| FR-2602 | T003 (pure builder) · T008 · T010 asserts it structurally · T015 exercises it offline |
| FR-2603 | T002, T003 (byte-identical build) · T018, T021 (reprint invariant, including after vocabulary changes) |
| FR-2604 | T004 (resolves) · T005 (listed with kind/date) · T008 (saved in the vault) · T019 (reprint from the record) · T020 (erasure) · T021 |
| FR-2605 | T002 · T003 (only `matchWord`) · T006 asserts no second lookup · T009 (chooser writes vocabulary) · T024 (the story uses the same machinery) |
| FR-2606 | T002 · T003 (declared gaps) · T011 (the gap stated on screen and sheet, chooser offered, nothing pre-chosen) |
| FR-2607 | T001 (derived attribution asserted first) · T007, T016 (photocopy-legible templates) · T015 |
| FR-2608 | T001 · **written red before any render path exists** · T015 re-checks end to end |
| FR-2609 | T023 (standard provider path, unsigned output) · T026 (mark removable only by sign-off) · T027 |
| FR-2610 | T023 (instruction vs delimited content) · T027 |
| FR-2611 | T022 (the wording, in the corpus) · T025 (on the report) · T027 |
| FR-2612 | T013 · reachable, explained, one pointer |
| FR-2613 | T014 · materials, not therapy |

## Dependencies

- Phase 2 blocks everything: T003 → T004/T005 → all of Phases 3–5.
- T007 before T015; T016 before T018/T021; T022 before T023 (the corpus is what the job
  sends); T023 before T024–T027.
- [P] tasks touch different files than their phase-mates and may run in parallel.

## Out of scope, restated from the spec so nobody rediscovers it here

Photos of the child's real environment (privacy/consent — its own decision), AAC and
communication boards (a deliberate non-goal, revisitable with AL expertise), and any
suggestion or auto-completion of moments — selection and order are hers, always.
