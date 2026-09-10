---
description: Task list for 038 · Ver la hoja
---

# Tasks: Ver la hoja

**Input**: Design documents in `specs/038-ver-la-hoja/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/record.md`, `quickstart.md`

**Tests**: included, and not optional here. Two of the three requirements that could be
got wrong silently — the anti-drift enumeration and «no learner data on a committed
picture» — are only true if something asserts them.

**Organization**: by user story, in priority order.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Paths are repository-relative. `app/` is the npm workspace root; `npm run` commands are
run from there.

---

## Phase 1: Setup

**Empty, and recorded rather than omitted.** No dependency is added (`037` FR-3512), no
scaffolding is needed, and `npm run shots` already exists and already builds. An empty
Setup phase is information: it says the feature adds nothing to the project's surface,
which is why its Constitution Check passed without a Complexity entry for tooling.

---

## Phase 2: Foundational (Blocking Prerequisites)

The enumeration, which both user stories read. Nothing in Phase 3 or 4 can be written
against a hand-listed presentation set without recreating the drift research R2 measured.

- [x] T001 [P] Write `app/packages/core/test/presentations.test.ts` **first and red**:
      no presentation the renderer can produce is missing a picture; every member yields
      a `Presentation` distinct from every other; every `id` is unique and filename-safe.
      A test written after the enumeration is a test shaped to whatever the enumeration
      happened to contain. (FR-3603)

      **And writing it red earned its keep immediately.** The first draft asserted the
      wrong invariant — «every axis `presentationFor` reads appears in some member's
      `levels`» — and went red on `ATE`, which the renderer does read and which is
      deliberately absent because `ATE: 2` produces exactly the same page break as
      `COG: 2`. Satisfying that assertion would have forced a seventh picture identical
      to the fifth.
      The invariant that matters is about **presentations, not axes**: an axis may be
      absent, but only if setting it yields something a member already yields. That is
      strictly stronger — it permits the duplicate and catches the novel — and it was
      found by the test failing rather than by review.
- [x] T002 Add `SHEET_PRESENTATIONS` and `SheetPresentation` to
      `app/packages/core/src/render/presentations.ts`, listing **axis levels only** — the
      type must have no field able to hold a `Presentation` value, which is what makes
      FR-3603 structural rather than remembered. Six members per `data-model.md`.
      (FR-3603)
- [x] T003 Export it from `app/packages/core/src/index.ts` so the shell and the e2e can
      read it. (FR-3603)
- [x] T004 Add to `presentations.test.ts` the equality that keeps the set honest:
      `ATE: 2` produces the same presentation as `COG: 2`, asserted rather than assumed,
      so a seventh identical picture added later reads as waste and not as coverage.
      (FR-3603)
- [x] T005 Derive `PRESENTATIONS` in `app/e2e/sheet-a11y.spec.ts` from
      `SHEET_PRESENTATIONS` instead of the three hand-written literals, and delete the
      literals. **Expect this to find something**: the sweep will run for the first time
      over `#000` on white and over the letter and word spacing `DEC` sets, which
      research R2 measured as missing from the literal. If it fails, the failure predates
      this feature and is recorded here, not worked around. (FR-3603)

      **Measured: it did not fail.** The sweep now covers **seven** presentations (the
      signed state plus the six enumerated) instead of three approximate ones, including
      `#000` on white and `DEC`'s letter and word spacing, and finds zero WCAG 2.2 A/AA
      violations. So the drift was real and its consequence was not — the sheet was
      already conformant at presentations nobody had ever swept. Worth recording as a
      **negative** result: the risk this task was ordered first to contain did not
      materialise, and the reason to keep the derivation is now solely that the literal
      was stale rather than that it was hiding a failure.

      The test's own title had to change with it: it said «en sus tres presentaciones»,
      which stopped being true. It now says «en todas sus presentaciones» and names no
      number, so it cannot go stale the same way twice.

**Checkpoint**: `npx vitest run packages/core/test/presentations.test.ts` green, and
`RAMPA_HIDDEN=1 npx playwright test e2e/sheet-a11y.spec.ts` green over six real
presentations instead of three approximate ones.

---

## Phase 3: User Story 1 - Somebody looks at the sheet before it reaches a child (Priority: P1) 🎯 MVP

**Goal**: one command, and a person is looking at pages a child would receive.

**Independent Test**: on a clean checkout with no key and no network, run
`npm run shots` and open what it wrote. Nothing else in the repository has to change for
that to be worth having.

- [x] T006 [US1] In `app/scripts/screenshot.mjs`, seed the temporary vault with the
      sample's **adapted** document (`sample/ensayo/material/ensayo-1/E00/adapted.md`)
      as a job, reading it from the bundled corpus rather than copying it. No model is
      called. (FR-3606, FR-3612)
- [x] T007 [US1] Capture one sheet per member of `SHEET_PRESENTATIONS` by seeding a
      learner with those axis levels and calling `window.rampa.job.render` and
      `window.rampa.job.pdf` over IPC — the application's own path, so what is captured
      is what `job:pdf` produces for a teacher. (FR-3601, FR-3605, FR-3609)
- [x] T008 [US1] Capture the first-page image beside each page, from a window the record
      owns in the main process, leaving the viewer's `sandbox` untouched. (FR-3611,
      `037` FR-3511)
      - **Medido, y es el primer hallazgo del registro mirándose a sí mismo**: la primera
        tanda de PNG salió **sin una sola letra**. La hoja incrusta Atkinson con
        `font-display: block` —decisión buena y tomada: «a brief blank beats a flash of
        Verdana and then a reflow»— y `capturePage()` disparaba dentro de ese blanco. Se
        veían el banner, los bordes y las cajas de los ejercicios, y ni una palabra.
        Cerrado esperando a `document.fonts.ready`. Ningún test de este repositorio podía
        ver ese defecto, que es exactamente el argumento de la feature.
- [x] T009 [US1] Name every file `hoja--<kind>--<presentation>--<state>` per
      `data-model.md`, written into the same directory the record already uses.
      (FR-3608, FR-3616)
- [x] T010 [US1] Print how many sheets were written and where, so a person knows what to
      open. (FR-3613)
- [x] T011 [P] [US1] Write `app/e2e/shots-record.spec.ts`: driving the command writes the
      expected set, exits `0`, and makes **zero network requests** — counted in both
      stacks the way `035`'s rehearsal counts them. (FR-3604, FR-3612)
- [x] T012 [US1] In the same spec, run `checkOutput` over each captured **document**
      with the fictional learner's code, name, year, stage and school as needles.
      This is the gate that matters, because the output of this feature is committed.
      (FR-3607, SC-3606)
      - **La fixture tuvo que crecer para que esta puerta pudiera fallar.** Los alumnos
        de las hojas se creaban con ejes y nada más, así que un `checkOutput` con su
        nombre y su centro como agujas no tenía nada que encontrar: verde por vacío. Ahora
        el registro tiene **una sola niña inventada** —`age: 14` en `es:primaria-5`, con
        centro— compartida por las veinte pantallas y por las doce hojas, y la lista de
        agujas *es* la fixture.
      - **La edad se queda fuera, y no es un olvido.** `checkOutput` documenta cuatro
        campos que no deben llegar a la hoja —«an age, a course, a stage, a school»— y
        las dos tuberías (`jobs/print.ts:126`, `jobs/export.ts:196`) le pasan tres. La
        aguja sería `"14"`, y dos cifras son subcadena de media aritmética de primaria:
        es el fallo del código vacío otra vez, la guarda que salta con todo y se acaba
        apagando. Anotado en el BACKLOG como G78 en vez de cerrado con falsos positivos.
      - **Y una medición que salió de que mi primera aserción estaba mal.** Añadí un
        `expect(html).not.toContain(code)` para cubrir el canal de atributos, que
        `checkOutput` no mira porque quita las etiquetas antes de buscar. Falló. La causa
        no es un fuga: la hoja lleva dos `@font-face` en `data:` URI, **62.632 caracteres
        de base64**, y un código es una letra y dos cifras (`vault/codes.ts:17`) —
        **566 de los 2.600 códigos posibles, el 21,8%, aparecen como subcadena dentro de
        ese base64**. Con la frontera de letra/cifra que usa `checkOutput`: **0 de
        2.600**. Esa frontera no es un detalle de estilo: es lo único que hace que la
        comprobación del código funcione en una hoja que incrusta una fuente. La aserción
        del canal de atributos ahora quita el `<style>` y usa la misma frontera.

**Checkpoint**: US1 alone is the MVP. It delivers the instrument `039`, `040` and `041`
are reviewed with.

---

## Phase 4: User Story 2 - The record covers what the renderer can actually do (Priority: P2)

**Goal**: the record is a set, not a sheet, so a change that shows up for one learner is
still in it.

**Independent Test**: count the files against the presentations the renderer declares;
every presentation has a picture, and the count is not maintained by hand.

- [ ] T013 [US2] Capture the other three material kinds that render differently — an
      assessment, a sheet carrying pictograms, and a `028` structure strip — at the
      baseline presentation. (FR-3602)
- [ ] T014 [US2] Capture the pictogram sheet with **no set installed**, which is the
      normal state since Rampa ships none (`023` FR-2101), and assert the named gap
      renders rather than a failure (`018` FR-1616). (FR-3602)
- [ ] T015 [P] [US2] Assert in `shots-record.spec.ts` that the number of captured
      presentations equals the number of members in `SHEET_PRESENTATIONS` — so a rule
      added to `presentationFor` produces a picture or a failing count, never a silent
      gap. (FR-3603, SC-3603)

**Checkpoint**: fifteen pages and fifteen images, and adding a presentation rule adds
pictures without anyone editing a list.

---

## Phase 5: User Story 3 - Signed and unsigned are both in the record (Priority: P3)

**Goal**: the draft mark is a designed thing, and `010` SC-807 is judged by a teacher
looking at a page. Until now there was no page to show her.

**Independent Test**: two files, one with the banner and per-page watermark and one
without, both openable without running the application.

- [ ] T016 [US3] Capture each representative sheet in both states, obtaining the signed
      one through `window.rampa.job.signOff` — the application's own sign-off, never a
      flag of the record's. Principle VII forbids a convenience that produces material
      looking finished without sign-off, and that includes this script. (FR-3610)
- [ ] T017 [P] [US3] Assert in `shots-record.spec.ts` that the unsigned document carries
      the banner and the watermark and the signed one carries neither — which is also
      what makes the determinism claim safe, since a signed sheet has no date on it
      (research R4). (FR-3610, FR-3614)

**Checkpoint**: the difference between reviewed and unreviewed is visible at a glance,
on paper, for the first time.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Assert determinism in `shots-record.spec.ts`: two runs over unchanged
      inputs produce pages that agree. Research R4 measured that nothing interpolates a
      clock, a path or a random value; this keeps it true. (FR-3614)
- [ ] T019 **The retrospective measurement, and the task that decides whether this
      feature worked.** For each of G74, G75 and G76, check out the parent of its fix in
      a worktree, run the record, and record here whether the defect is **visible** in
      `hoja--ficha--sin-barreras--borrador.png`. Write the answer into this file next to
      the task, including a «no». If any of the three is invisible, the record has the
      wrong shape and that is the finding. (SC-3604)
- [ ] T020 Regenerate the record and commit it, per the decision `.gitignore` already
      states. (FR-3616)
- [ ] T021 [P] Note in `specs/BACKLOG.md` that G62's blind spot is closed and that G77's
      cheap half is done, and record the drift T005 found in `sheet-a11y.spec.ts` as its
      own line — a test that swept a less-adapted sheet than any learner's is worth a
      backlog entry whether or not it failed.
- [ ] T022 Add the record to the honest half of
      `specs/006-desktop-app/validation.md`: what is now looked at, and what still is
      not — the editable document has no presentation at all, so `040`'s parity work has
      no review surface here (FR-3617).

---

## Dependencies & Execution Order

```text
Phase 2 (T001…T005)  ← blocking: the enumeration
        │
        ├── Phase 3 · US1 (T006…T012)  🎯 MVP
        │        │
        │        ├── Phase 4 · US2 (T013…T015)
        │        └── Phase 5 · US3 (T016…T017)
        │
        └── Phase 6 (T018…T022)
```

- **T001 before T002.** The test is written red first, deliberately.
- **T005 after T002/T003** and before anything in Phase 3, because it is where the
  existing drift surfaces and a surprise there changes Phase 3's assumptions.
- **US2 and US3 are parallel** once US1 lands: different kinds and different states,
  same machinery.
- **T019 after T007**, and it needs a worktree rather than the working checkout.

## Parallel Example

```bash
# After the enumeration exists (T002/T003), these touch different files:
T001  packages/core/test/presentations.test.ts
T011  app/e2e/shots-record.spec.ts
T021  specs/BACKLOG.md
```

## Implementation Strategy

**MVP is Phase 2 + Phase 3.** That is the instrument, and it is what unblocks `039`,
`040` and `041`. Phases 4-6 make the record worth opening habitually rather than once.

The order is chosen so the riskiest thing happens early: **T005 is the task most likely
to fail**, because it points an existing accessibility sweep at presentations it has
never seen. Doing it in Phase 2 means a real failure is found before any of the record
machinery is built on top of it, rather than after.

---

## Coverage · every requirement, and where it is

| | Where it is satisfied |
|---|---|
| FR-3601 | T007 · sheets written by the same command; `shots-record.spec.ts` fails if the set is absent |
| FR-3602 | T013, T014 · the four kinds that render differently, including the pictogram sheet with no set installed |
| FR-3603 | T001, T002, T003, T004, T005, T015 · axis levels enumerated and the presentation derived; the type has no field for a presentation value, so it cannot be stated twice |
| FR-3604 | T011 · the command exits `0` whatever the sheets look like, and nothing is compared. Also satisfied **by absence**: no baseline, no manifest, no hashes exist to compare against (`013` FR-1114) |
| FR-3605 | T007, T008 · the application's own IPC path and a window the record owns; no dependency added |
| FR-3606 | T006 · the hand-authored sample, read from the bundled corpus |
| FR-3607 | T012 · `checkOutput` over the captured document with the fictional learner's facts as needles |
| FR-3608 | T009 · the naming scheme in `data-model.md` |
| FR-3609 | T007 · `job:render` / `job:pdf`, so the captured page is the artefact rather than a likeness. Made true by construction (research R1) rather than by a check |
| FR-3610 | T016, T017 · both states, the signed one through the application's own sign-off |
| FR-3611 | T007, T008 · a printable page plus a first-page image |
| FR-3612 | T011 · zero network requests, counted in both stacks; no key needed anywhere in the run |
| FR-3613 | T010 · the command says how many and where |
| FR-3614 | T017, T018 · two runs agree, and the signed sheet carries no date to disagree about |
| FR-3615 | T002 · satisfied by the shape: an appearance band is another input to the same call, so `040` extends the enumeration rather than duplicating presentations. **No band exists yet, and that is the requirement's own condition** |
| FR-3616 | T009, T020 · written to the directory `.gitignore` already names as the record, and committed |
| FR-3617 | T022 · the boundary recorded in `validation.md` together with its consequence for `040` |

### Not done, and why

Nothing is deferred. One requirement — FR-3615 — is satisfied conditionally and says so
in its own text: the derivation is in place and there are no appearance bands to derive
yet, because they are `040`'s. That is a satisfied requirement with a stated condition,
not a deferral, and the distinction matters: `check-fr-coverage.sh` counts it as covered
and a reader can see why without opening `040`.
