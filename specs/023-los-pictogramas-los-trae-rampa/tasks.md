# Tasks: Los pictogramas los trae Rampa

**Spec**: [spec.md](./spec.md) · **Feature**: `023-los-pictogramas-los-trae-rampa`

## What makes this cheap

`018` already built everything after the folder: the reader, the matcher, the
ambiguity omission, provenance by id, the unremovable attribution, the photocopy
check and the missing-image gap. Its reader consumes a directory of
`pictograms.<lang>.json` — a list of `{ id, keywords }` — plus `<id>.png` files.

**This feature is a producer of that format.** Which is why there is no task here
that touches `set.ts`, `match.ts`, `apply.ts` or `attribution.ts` except to correct
a comment: FR-2102 and SC-2102 say the reader must be unchanged, and the tasks are
arranged so that any change to it shows up as a diff nobody asked for.

---

## Phase 1: Setup

- [X] T001 Add the publisher catalogue to `instructions/pictograms.md` — ARASAAC's
  endpoints, its required attribution and its licence summary as **corpus data, not
  code** (Principle I, FR-2116, and `018` FR-1604's replaceability). Nothing in
  `packages/core` may name a URL.
- [X] T002 Parse it in `app/packages/core/src/pictograms/publisher.ts`, with a guard in
  `corpus-guarantees.test.ts` asserting every field the code reads is present — the
  twelfth unread field is not shipping in this feature (backlog G25).

## Phase 2: Foundational — what is sent, and what is written

- [X] T003 `app/packages/core/src/pictograms/wordlist.ts`: build a word list from
  material, **excluding every name Rampa knows** (FR-2109, `018` FR-1610). Reuses
  `009`'s name machinery rather than a second list.
- [X] T004 [P] Test in `app/packages/core/test/pictogram-fetch.test.ts`: a word list built
  from material containing a learner's name, code and school contains none of them
  (SC-2104, FR-2108).
- [X] T005 `app/packages/core/src/pictograms/fetch.ts` — `planFetch(words, present,
  limits)`: what to fetch, what is already there, what a bound cut (FR-2111, FR-2112,
  FR-2117). Pure, no transport, no filesystem: `packages/core` stays side-effect-free
  and the isolation suite keeps walking it.
- [X] T006 `readCandidates(json, publisher)` in the same file: publisher response →
  `{ id, keywords }[]`, **every** candidate kept (FR-2113, so `018` FR-1609 can still
  turn ambiguity into an omission).
- [X] T007 `mergeSet(existing, fetched)`: the metadata to write, in `018`'s exact
  format, idempotent so a resumed fetch cannot duplicate an entry (FR-2102, FR-2115).
- [X] T008 [P] Test: `mergeSet`'s output is read by `018`'s **unmodified** `readSet` with
  no problems, including after an interrupted fetch (SC-2102, SC-2105, FR-2118).

## Phase 3: US2 — she knows what she is agreeing to (P1, ships first)

**Independent test**: a fresh vault, a transport that fails the test if called, and no
request until acceptance is recorded.

- [X] T009 `app/packages/shell/src/ipc/pictograms.ts`: record and read the acceptance —
  what was accepted, from whom, and when (FR-2104).
- [X] T010 Withdrawal: stops further fetching, deletes nothing already hers (FR-2106).
- [X] T011 `app/ui/src/pictograms/LicenceStep.tsx`: the acceptance screen — author, owner,
  licence, what non-commercial means for her classroom, what ShareAlike does **and does
  not** do to her worksheets, and that the words travel and where (FR-2105, FR-2110).
- [X] T012 [P] Test in `app/packages/shell/test/pictogram-fetch.test.ts`: the transport is
  a spy that throws if called; every entry point is exercised with no acceptance
  recorded and it is never called (SC-2103, FR-2104, FR-2107).

## Phase 4: US1 — she presses a button and gets pictograms (P1)

**Independent test**: with pictograms on and no set, accept and press the button; images
and metadata land where `018`'s reader finds them, and the sheet renders.

- [X] T013 `app/packages/shell/src/pictograms/download.ts`: the transport — one word per
  request, timeout, interruptible, writing atomically so an interrupted fetch leaves a
  readable set (FR-2108, FR-2115, FR-2118).
- [X] T014 `pictograms:fetch` handler with progress, reporting found, missing by name,
  already-present, and a bound reached (FR-2114, FR-2117).
- [X] T015 The button in `app/ui/src/pictograms/PictogramSetSection.tsx`, beside — not
  instead of — the folder picker (FR-2103): a set she assembled by hand keeps working
  with no network.
- [X] T016 Failure in her language for offline, slow and refused, resuming at the cost of
  what is missing (US1 scenarios 3 and 5).
- [X] T017 [P] Test: an offline transport leaves no half-written set and the second attempt
  fetches only what is missing (SC-2105).
- [X] T018 [P] e2e in `app/e2e/pictograms.spec.ts` against a local fake publisher: accept,
  fetch, render a sheet with its attribution (SC-2101).

## Phase 5: Retiring FR-1601's over-reach

- [X] T019 Narrow `018` FR-1601 in place, pointing at `023` — bundling and redistributing
  stay forbidden, fetching at her request does not (FR-2101).
- [X] T020 Delete the four comments asserting there is no download and that a sheet
  containing a pictogram is a derivative work: `ipc/pictograms.ts`,
  `PictogramSetSection.tsx`, `set.ts`, `render/attribution.ts`. The second claim is the
  one G28 already corrected on screen and left standing in the code.
- [X] T021 Assert no release artefact contains a pictogram (FR-2101) — the half of
  FR-1601 that survives, now with a test instead of a promise.
- [X] T022 Backlog entry: why the download was forbidden, what reading it, and the
  legal-review item under G28 now covering it.

## Phase 6: Polish

- [X] T023 `019`'s linear renderings and `022`'s diagrams are unaffected — asserted, not
  assumed.
  **Correction 2026-09-03 (P21/P42):** the `022` half of this tick was vacuous. `022` has
  a spec and no plan.md, tasks.md or code — there were no diagrams to be unaffected, so
  «asserted, not assumed» asserted nothing about `022`. The `019` half stands. Re-assert
  the `022` half when `022` actually builds its diagrams (BACKLOG G38).
- [X] T024 Look at it in two widths and at `xlarge` (`013` FR-1113/FR-1118).
  **Found two things by looking**, which is the whole reason the task exists:
  - The block sat in **480px with a third of the screen empty**, because it was inside
    a `.field` and `.field` carries `max-width: var(--measure-field)`. Right for a
    `select`, wrong for a licence, a box she types into and a panel of results. Moved
    out of the field. Measured rather than guessed.
  - **Two primary controls on one screen** («Traer los pictogramas» and «Guardar»),
    which `013` FR-1105 forbids — emphasis everywhere is emphasis nowhere. The
    section's strong button is now plain in `compact` mode, where the profile editor
    owns the primary. FR-1105 has **no test**, and that is recorded in G31.
- [X] T025 SC-2106: hand-assembled set, no network, nothing downloaded — `018`'s promise,
  still true. `e2e/pictograms.spec.ts` walks the folder path with nothing accepted and
  nothing fetched; `packages/shell/test/pictogram-fetch.test.ts` proves the transport is
  never touched when there is nothing to ask for.
- [ ] T026 SC-2107 **needs a teacher** and is recorded as pending, not ticked.

## What T018 does not cover, said out loud

The e2e does **not** perform a real fetch: a test that reaches `api.arasaac.org` on
every run is a request nobody asked for, made to somebody else's server, and flaky in
the way that teaches a suite to be ignored. The fetch is covered offline against a fake
transport, which is also the only place the assertion that matters most — *what leaves
her machine* — can be made at all.

One real fetch was run by hand on 2026-09-02 to confirm the endpoints, and the result is
in the commit message.

## Dependencies

Phase 1 → 2 → **US2 before US1** (nothing may fetch before acceptance exists, so the
acceptance is not retrofitted onto a working download) → Phase 5 → 6.
