# Tasks: Los pictogramas tienen su sitio

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1: Foundational — the route

- [X] T001 `ui/src/nav/route.ts`: a `settings` section with tabs, through the same
  `reduceRoute` the learner uses (FR-2305).
- [X] T002 The pointer carries where it came from, so following it can come back
  (FR-2304). **Route state, not component state** — the two navigation defects `020`
  found were both state held in the wrong place.
- [X] T003 [P] Extend `ui/test/nav-route.test.ts`: into Configuración and back to the
  learner she came from, and «Mis alumnos» still wins from anywhere.

## Phase 2: US2 — pictograms have a room of their own (P1, first)

**Ships before US1**, because US1 removes controls from a page and without somewhere for
them to be that is a feature deletion.

- [X] T004 `ui/src/settings/SettingsSections.tsx` — Pictogramas, Mi servicio de IA,
  Acerca de (FR-2305).
- [X] T005 `Rail.tsx`: four top-level entries, and Configuración's tabs in the same rail
  that already becomes the learner's (FR-2310).
- [X] T006 The active section marked by more than colour (FR-2311, `010` FR-812), and
  the second level reachable by keyboard alone as a named navigation region (FR-2312) —
  the same `aria-label`-follows-contents rule the learner's rail already has.
- [X] T007 `PictogramSetSection` loses `compact` and renders full (FR-2306).
- [X] T007b `ConnectionScreen` and `AboutScreen` change their route and **nothing else**
  (FR-2307). Asserted by their diffs being import-and-route only: a move that quietly
  improves things is a move nobody can review.
- [X] T008 Her vocabulary, reviewable and changeable here (FR-2308) — `024` FR-2214
  finished, since only a report could reach it.
- [ ] T009 A download in progress survives navigation (FR-2309): the progress subscription
  belongs to the application, not to a screen. **Not done.** `bringPictograms` keeps the
  `AbortController` at module level so the download itself survives, but the bar is
  `PictogramSetSection`'s own `useState` — navigate away and back and it is gone while
  the fetch continues. Recorded rather than ticked; the fix is progress in the same place
  the controller already is.
- [ ] T010 [P] e2e: every control `023` and `024` built, reached without opening a
  learner (SC-2302).

## Phase 3: US1 — the learner's page is about the learner (P1)

- [X] T011 `ui/src/pictograms/LearnerPictograms.tsx`: switch, scope, a hint saying what a
  pictogram is, and — only when the set is missing — one pointer (FR-2302, FR-2303).
- [X] T012 `ProfileEditor.tsx`: the pictogram block becomes that and nothing else
  (FR-2301).
- [X] T013 [P] Test: the learner's profile contains no licence text, no megabytes, no
  download control, and the block is under six lines (SC-2301, SC-2303) — measured,
  because «mucho más limpio» has to mean something.
- [ ] T014 [P] e2e: turn pictograms on with no set, follow the pointer, arrive, come back
  (US1 scenarios 2-4).

## Phase 4: US3 — the rail stops mixing categories (P2)

- [X] T015 Nothing that was reachable is unreachable: `a11y.spec.ts` and `layout.spec.ts`
  both walk «every screen the rail reaches» and their lists change (SC-2305). The walk
  moved into `e2e/nav.ts`, which exists for exactly this — three specs had hand-rolled
  it and all three broke, which is that file's opening note coming true.
  **And it found a real defect**: the rail's `rail-who` was an `<h2>` before `<main>`,
  so Configuración's document started at H2 with its own `h1` second. Latent since
  `020`, invisible because the sweep only walked top-level screens and the rail only
  showed that heading inside a learner. Now a `<p>` — the `<nav>` already carries the
  accessible name (G34).
- [ ] T016 [P] `axe` on Configuración at every width and the largest text (SC-2306).

## Phase 5: Polish

- [ ] T017 `018` FR-1605 still holds: no axis enables pictograms, and moving the set out
  did not make it a global switch (FR-2313). And `020` FR-1801: Mis alumnos is still the
  opening screen (FR-2314) — the rail losing an entry must not change where she lands.
- [ ] T018 Opening Configuración fetches nothing (FR-2315) — the transport spy again.
- [ ] T019 Look at it: two widths and `xlarge`, including a download in progress
  (`013` FR-1113/FR-1118).
- [ ] T020 One primary control per screen (`013` FR-1105). G31 is open, so this is looked
  at rather than trusted.
- [ ] T021 SC-2304 **needs a teacher**. Recorded as pending, not ticked.

## Dependencies

T001-T003 → **US2 before US1** → US3 → polish.
