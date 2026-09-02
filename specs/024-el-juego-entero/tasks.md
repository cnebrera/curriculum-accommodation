# Tasks: El juego entero, de una vez

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1: Setup

- [ ] T001 Corpus: `image_size`, `fetch_concurrency` and `expected_total` in
  `instructions/pictograms.md`, next to the 12 mm minimum they follow from (FR-2204,
  FR-2207). A guard in `corpus-guarantees.test.ts` for every field the code reads.

## Phase 2: Foundational

- [ ] T002 `readIndex(json)` in `app/packages/core/src/pictograms/fetch.ts`: the bulk
  index → entries with words and popularity (FR-2202). Structural, allowlisted ids.
- [ ] T003 `planWholeSet(index, present, images)`: what is missing, ordered by
  popularity (FR-2203, FR-2206). Pure.
- [ ] T004 [P] Test: the plan is popularity-ordered, excludes what is on disk, and is
  empty on a second pass (SC-2203).
- [ ] T005 `app/packages/core/src/pictograms/vocabulary.ts`: her chosen words, per
  language, parsed from and written to Markdown (FR-2214, FR-2220).
- [ ] T006 [P] Test: her vocabulary round-trips, is per language, and carries nothing
  about a child (FR-2221).
- [ ] T007 `matchWord` precedence: learner override ▸ her vocabulary ▸ the set ▸ nothing
  (FR-2215, FR-2216). `source` gains `'vocabulary'` for provenance (Principle VI).
- [ ] T008 [P] Test: all four rungs, including that an unchosen ambiguous word still
  gets **nothing** — `018` FR-1609 must survive this feature.

## Phase 3: US1 — one press (P1)

- [ ] T009 `fetchWholeSet` in `app/packages/shell/src/pictograms/download.ts`: index
  once, then images throttled and resumable, writing metadata as it goes (FR-2202,
  FR-2206, FR-2207).
- [ ] T010 Free-space check before the first byte, reported as itself (FR-2208).
- [ ] T010b The set lands in `<vault>/pictogramas/` (FR-2205) — inside what she backs
  up, not in `userData`. `023` already chose this path; the task exists so the
  requirement has somewhere to point rather than being satisfied by accident.
- [ ] T011 `bringPictograms` takes **no word list** (FR-2201). The word path is deleted,
  not deprecated: two ways in is how the one without the guard gets called.
- [ ] T012 Progress that says something true — «3.140 de 13.802», not a spinner.
- [ ] T013 [P] Test: a spy transport that throws proves nothing is fetched on launch or
  on a second complete pass (SC-2203, SC-2204).
- [ ] T014 [P] Test: interrupted at an arbitrary point, `readSet` finds no problems
  (SC-2205).
- [ ] T015 The screen: one button, and what she has. No textarea (FR-2209, FR-2222).
- [ ] T016 Reachable outside a learner's profile (FR-2222).

## Phase 4: US2 — the word with four pictures (P1)

- [ ] T017 `pictograms:candidates` — the ambiguous words of a job with their candidates,
  popularity-ordered (FR-2217).
- [ ] T018 `app/ui/src/pictograms/ChooseWord.tsx`: the pictures, not the ids. One click
  records it in her vocabulary (FR-2214, FR-2217).
- [ ] T019 Reachable from where the omission is reported, because that is where she
  learns the word was skipped (`018` FR-1609's report).
- [ ] T020 Changing a choice marks sheets stale rather than rewriting them (FR-2218,
  `005` FR-520).
- [ ] T021 [P] e2e: adapt with an ambiguous word, choose, re-adapt, pictogram present —
  and no second question (SC-2206).
- [ ] T022 [P] Test: her vocabulary travels in a handover and her licence acceptance does
  not (FR-2219, `004`).

## Phase 5: US3 — asked once (P2)

- [ ] T023 Record what was downloaded: when, how many, the high-water mark (FR-2213).
- [ ] T024 `pictograms:checkUpdate` — one request, how many are new (FR-2211). Never on
  launch, never on a timer (FR-2210).
- [ ] T025 A declined update is not offered again until the index changes (FR-2212).
- [ ] T026 [P] Test: the update path fetches only the difference.

## Phase 6: Polish

- [ ] T027 SC-2207: `018`'s tests pass untouched.
- [ ] T028 Look at it in two widths and at `xlarge`, **including a real progress state**
  — the thing `023` never looked at because it never ran (`013` FR-1113/FR-1118).
- [ ] T029 One primary control per screen (`013` FR-1105) — and this time write the
  test, closing G31.
- [ ] T030 One real whole-set download, by hand, with the numbers in the commit message.
- [ ] T031 SC-2208 **needs a teacher**. Recorded as pending, not ticked.

## Dependencies

Phase 1 → 2 → **US1 and US2 together**: US1 alone is 55 MB and an empty worksheet, which
is the state `023` shipped and the reason this specification exists. US3 after. Nothing
in Phase 5 may run without an action of hers.
