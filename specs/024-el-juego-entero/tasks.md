# Tasks: El juego entero, de una vez

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1: Setup

- [X] T001 Corpus: `image_size`, `fetch_concurrency` and `expected_total` in
  `instructions/pictograms.md`, next to the 12 mm minimum they follow from (FR-2204,
  FR-2207). A guard in `corpus-guarantees.test.ts` for every field the code reads.

## Phase 2: Foundational

- [X] T002 `readIndex(json)` in `app/packages/core/src/pictograms/fetch.ts`: the bulk
  index → entries with words and popularity (FR-2202). Structural, allowlisted ids.
- [X] T003 `planWholeSet(index, present, images)`: what is missing, ordered by
  popularity (FR-2203, FR-2206). Pure.
- [X] T004 [P] Test: the plan is popularity-ordered, excludes what is on disk, and is
  empty on a second pass (SC-2203).
- [X] T005 `app/packages/core/src/pictograms/vocabulary.ts`: her chosen words, per
  language, parsed from and written to Markdown (FR-2214, FR-2220).
- [X] T006 [P] Test: her vocabulary round-trips, is per language, and carries nothing
  about a child (FR-2221).
- [X] T007 `matchWord` precedence: learner override ▸ her vocabulary ▸ the set ▸ nothing
  (FR-2215, FR-2216). `source` gains `'vocabulary'` for provenance (Principle VI).
- [X] T008 [P] Test: all four rungs, including that an unchosen ambiguous word still
  gets **nothing** — `018` FR-1609 must survive this feature.

## Phase 3: US1 — one press (P1)

- [X] T009 `fetchWholeSet` in `app/packages/shell/src/pictograms/download.ts`: index
  once, then images throttled and resumable, writing metadata as it goes (FR-2202,
  FR-2206, FR-2207).
- [X] T010 Free-space check before the first byte, reported as itself (FR-2208).
- [X] T010b The set lands in `<vault>/pictogramas/` (FR-2205) — inside what she backs
  up, not in `userData`. `023` already chose this path; the task exists so the
  requirement has somewhere to point rather than being satisfied by accident.
- [X] T011 `bringPictograms` takes **no word list** (FR-2201). The word path is deleted,
  not deprecated: two ways in is how the one without the guard gets called.
- [X] T012 Progress that says something true — «3.140 de 13.802», not a spinner.
  **Ticked once while broken.** The main process sent it and `PictogramSetSection`
  never subscribed: 2 min 45 s of «Trayéndolos…» on a 157 MB download. Found by Carlos
  asking for a progress bar, not by a test. Now a real `Counted` bar with a genuine
  fraction (the total is known before the first image), the numbers in text as well as
  in the width, and `ui/test/props-are-read.test.ts` extended so an unread **payload
  field** fails the way an unread prop already did — verified by adding a field and
  watching it fail.
- [X] T012b The **stop** button (FR-2118). `fetchWholeSet` had accepted an
  `AbortSignal` since it was written and nothing ever passed one — «a fetch MUST be
  interruptible» satisfied in the core and unreachable from the window. The same defect
  shape as an unread field, from the other direction: a capability wired to nothing.
- [X] T013 [P] Test: a spy transport that throws proves nothing is fetched on launch or
  on a second complete pass (SC-2203, SC-2204).
- [X] T014 [P] Test: interrupted at an arbitrary point, `readSet` finds no problems
  (SC-2205).
- [X] T015 The screen: one button, and what she has. No textarea (FR-2209, FR-2222).
- [X] T016 Reachable outside a learner's profile (FR-2222).

## Phase 4: US2 — the word with four pictures (P1)

- [X] T017 `pictograms:candidates` — the ambiguous words of a job with their candidates,
  popularity-ordered (FR-2217).
  *(**«Popularity-ordered» was false until 2026-09-04**, review COD-09, decision P41.
  `popularity` lived only in `readIndex`/`planWholeSet` during the download, where it
  ordered *arrival*; `mergeSet` discarded it when writing `pictograms.<lang>.json`, so
  the number was not on disk and `candidatesFor` returned the ids in whatever order the
  file happened to hold — under a comment in `bring.ts` and another in `ChooseWord.tsx`
  both claiming an order no code produced. Entries persist `popularity` now and
  `mostUsedFirst` in `packages/core` does the sorting — in core, because the first
  version of the fix lived in the shell where nothing offline could test it and it
  survived being deleted with the suite still green.)*
- [X] T018 `app/ui/src/pictograms/ChooseWord.tsx`: the pictures, not the ids. One click
  records it in her vocabulary (FR-2214, FR-2217).
- [X] T019 Reachable from where the omission is reported, because that is where she
  learns the word was skipped (`018` FR-1609's report).
- [ ] T020 Changing a choice marks sheets stale rather than rewriting them — FR-2218, **deferred: 2026-09-03 (decision P34) to `031-el-segundo-eje-de-frescura`** (`005` FR-520).
  Staleness compares `ir.md`'s fingerprint and a vocabulary change does not touch it,
  so this needs a second freshness axis — which is a spec of its own rather than a
  patch here. BACKLOG G35 carries the history, including the period when this screen
  and `vocabulario.md` claimed it already worked.
- [ ] T021 [P] e2e: adapt with an ambiguous word, choose, re-adapt, pictogram present —
  and no second question (SC-2206). **Not done**: it needs a real provider key to run an
  adaptation end to end, which is `023` T031's problem too. The pieces are covered
  offline — the four-rung precedence, her vocabulary round-tripping, and `chosenWords`
  reaching `applyPictograms` — but the loop is not asserted in the real window.
- [ ] T022 [P] Test: her vocabulary travels in a handover and her licence acceptance does
  not (FR-2219, `004`). **Not done.** `vocabulario.md` is in the vault so a handover
  packet carries it by construction, and the acceptance is in application settings so it
  cannot — but «by construction» is what the twelve unread fields were. Recorded rather
  than ticked.

## Phase 5: US3 — asked once (P2)

- [X] T023 Record what was downloaded: when, how many, the high-water mark (FR-2213).
- [X] T024 `pictograms:checkUpdate` — one request, how many are new (FR-2211). Never on
  launch, never on a timer (FR-2210).
- [X] T025 A declined update is not offered again until the index changes (FR-2212).
- [X] T026 [P] Test: the update path fetches only the difference —
  `pictogram-whole-set.test.ts` asserts zero image requests on a complete second pass,
  and `pictogram-whole-set.test.ts` (core) asserts the decline is remembered until the
  index moves further.

## Phase 6: Polish

- [X] T027 SC-2207: `018`'s tests pass untouched.
- [X] T028 Look at it in two widths and at `xlarge` (`013` FR-1113/FR-1118).
  **Found by looking, again**: the licence still said «al traerlos salen palabras de tu
  ordenador, una por consulta» — true of `023`, **false** once `024` deleted the word
  path. Left alone it would have been an overstatement in the very text her acceptance
  rests on, which is backlog G28's mistake in the opposite direction. Corrected.
  Verified at 1366px, 900px and 720px with `xlarge`.
  *Not* looked at: a real progress state mid-download, and the chooser in situ — both
  need a 55 MB download in the window. The chooser's data path was checked against real
  ARASAAC pictograms and its markup by `ui/test/choose-word.test.tsx`.
- [X] T029 One primary control per screen (`013` FR-1105) — asserted for the chooser in
  `ui/test/choose-word.test.tsx`. **G31 stays open**: the general test that walks every
  screen and counts primaries is still not written, and pretending one component's
  assertion closes it would be worse than leaving it recorded.
- [ ] T030 One real whole-set download, by hand, with the numbers in the commit message.
- [ ] T031 SC-2208 **needs a teacher**. Recorded as pending, not ticked.

## Dependencies

Phase 1 → 2 → **US1 and US2 together**: US1 alone is 55 MB and an empty worksheet, which
is the state `023` shipped and the reason this specification exists. US3 after. Nothing
in Phase 5 may run without an action of hers.
