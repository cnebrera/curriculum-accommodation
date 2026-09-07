---

description: "Tasks for 037 · La hoja que recibe el niño, comprobada"
---

# Tasks: La hoja que recibe el niño, comprobada

**Input**: `specs/037-la-hoja-comprobada/` — spec.md, plan.md, research.md, data-model.md,
contracts/render-html.md, quickstart.md

**Tests are requested**, and the order matters: **the structural layer is written before
the repair**, red, because the previous suite was green with this defect in the output for
weeks. A test written after a fix is a test that agrees with the fix.

## Format: `[ID] [P?] [Story] Description`

`[P]` = parallelisable. Paths are repository-relative; the application lives in `app/`.

---

## Phase 1: Setup

Nothing. No dependency is added (FR-3512) — `axe-core` is already here and Electron already
carries Chromium. Recorded rather than omitted: an empty Setup phase is information.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T001 Write `app/packages/core/test/sheet-structure.test.ts` and **assert the defect
      as it is**: a block the IR marks as a heading renders as a paragraph, so the sheet
      has zero headings. **Red is not the goal — this task is green**, and it is the
      baseline `020` T001 and `031` both used: a snapshot of the wrong behaviour, so the
      diff in T005 is the whole change rather than part of it
- [x] T002 [P] In the same file, the properties that hold **today** and must keep holding
      (FR-3509): one declared language, every image described, header cells on any table,
      no positive tab index, no inline handler. Green now; they are the regression net for
      a change to the renderer, not a claim about this feature

**Checkpoint**: the sheet's current structure is written down, so the repair's effect is
visible as a diff.

---

## Phase 3: User Story 1 — The sheet keeps the shape the original had (Priority: P1) 🎯 MVP

**Goal**: a heading on the original worksheet is a heading on the adapted one.

**Independent Test**: quickstart §1 — render a fixture with `data-heading` and find a
heading element.

### Tests for User Story 1

- [x] T003 [US1] Turn T001's baseline into the requirement: a heading block renders as a
      heading element (FR-3501), **inside its own `<section>` with every `data-*` attribute
      intact** (Principle VI — the plan's post-design finding: a bare `<h2>` would drop the
      recipe and the axis that justify the change)
- [x] T004 [P] [US1] Same file: several headings render at **one level** (FR-3502) and in
      the source's order (FR-3504); a document with **no** heading blocks renders with no
      heading and no `<h1>` (FR-3503, SC-3505); and a heading whose text is markup-shaped
      renders as text (FR-3505, Principle IX)

### Implementation for User Story 1

- [x] T005 [US1] One branch in `renderBlock`, in `app/packages/core/src/render/html.ts`:
      when the block carries the heading flag, its content is wrapped in a heading element
      instead of the markdown renderer's paragraph. The class stays what it was — a heading
      is a **property** of a block that already has a class, not a fifth class (data-model)

**Checkpoint**: US1 shippable. The sixteenth field-nobody-reads has a reader, in the
artefact a child receives.

---

## Phase 4: User Story 2 — The declared target is proven (Priority: P2)

**Goal**: WCAG 2.2 A/AA over the three presentations, offline, nothing installed.

**Independent Test**: quickstart §3.

- [x] T006 [US2] Write `app/e2e/sheet-a11y.spec.ts`: render a real fixture in the three
      presentations — draft, signed, largest text (FR-3507) — and run a WCAG 2.2 A/AA check
      over each from a **hidden `BrowserWindow` in the main process** (FR-3506/FR-3508).
      Nothing installed, and the viewer's `sandbox=""` untouched (FR-3511/FR-3512): those
      three constraints together are what forced this shape, and research R4 has the table
- [x] T007 [P] [US2] Same spec: a sheet carrying pictograms keeps a description on every
      image (US2 scenario 2). The pictogram path is where an image reaches the sheet at
      all, so a check that used a fixture without them would assert nothing about it

**Checkpoint**: the target in `render/html.ts`'s comment is a measurement.

---

## Phase 5: User Story 3 — What a checker cannot see (Priority: P3)

**Goal**: the properties conformance does not cover, asserted separately.

**Independent Test**: quickstart §4, and §5 is the proof it is not redundant.

- [x] T008 [US3] Extend `sheet-structure.test.ts` with the heading-structure properties as
      requirements rather than observations: levels do not skip (FR-3502), and the count of
      headings equals what the source marked (SC-3501)
- [x] T009 [US3] **The mutation, as a written task** (SC-3503, quickstart §5): with heading
      blocks rendered as paragraphs again, the **structural** layer must fail and the
      **conformance** layer must stay green.
      *(**Run, and both outcomes are exactly what the spec claimed**: the structural layer
      failed with **four** cases and the conformance layer passed **2/2**. So neither
      covers the other, and that is now a measurement rather than an argument. It is also
      the answer to «why not just run axe»: axe is green on a sheet with no headings at
      all.)*

---

## Phase 6: Polish

- [x] T010 [P] Fix the comment that hid this for weeks: `app/e2e/a11y.spec.ts` excludes the
      viewer's contents saying their accessibility «is checked where those renderers are».
      It was not checked anywhere. Now it is, and the comment must point at where — a
      comment claiming a coverage that does not exist is how the sheet went unchecked
- [x] T011 [P] BACKLOG: close **G7** («no conformance target for its own HTML output, and
      no test for it») naming what shipped, and cross-reference **G59** for the `<h1>` that
      has nowhere to come from. And **G36**, the signature defect's own entry, gains its
      sixteenth instance — the first in the artefact a child receives
- [x] T012 [P] Look at a rendered sheet with headings, in the viewer and printed, at the
      largest text. A heading is the first visible change this feature makes to paper, and
      `013` FR-1113/FR-1118 is where this project has broken its own layout twice.
      *(Looked at, at 820px and at 560px with 24pt and a 44ch measure. It holds, and the
      difference is bigger than expected: «Los ecosistemas» was a paragraph identical to
      the body text and is now visibly the title of the sheet.
      **One observation, not acted on**: an exercise's number sits on its own line above
      its text — `<span class="n">1.</span>` before a block-level `<p>`. It predates this
      feature and it is presentation, which FR-3513 puts out of scope. Recorded rather
      than fixed in passing, and rather than left unsaid.)*

---

## Dependencies & Execution Order

- **Phase 2 before Phase 3**, and that ordering is the point: the baseline is written while
  the defect is still there, so T005's diff is the whole behaviour change.
- US1 before US2 and US3 — both check the repaired sheet.
- T009 last of the test tasks: it needs both layers to exist to say anything.

### Parallel Opportunities

T002 with T001 · T004 with T003 · T007 with T006 · T010–T012 with each other.

---

## Implementation Strategy

**MVP is US1**: the repair. It is the defect; everything after it is proof.

**US2 is insurance whose absence let US1 live**, and US3 is why US2 alone is not enough.
The three are one argument in three parts, and T009 is where the argument is checked.

---

## Coverage · every requirement, and where it is

| Requirement | Where |
|---|---|
| FR-3501 | T003 (with T001 as the baseline it replaces) · T005 |
| FR-3502 | T004 (one level) · T008 (no skipping) |
| FR-3503 | T004 — a document with no headings renders with none, and no `<h1>` is invented |
| FR-3504 | T004 |
| FR-3505 | T004 — markup-shaped heading text renders as text |
| FR-3506 | T006 |
| FR-3507 | T006 — draft, signed, largest text |
| FR-3508 | T006 — the hidden window in the main process; research R4 has the three constraints it satisfies at once |
| FR-3509 | T002 (the properties that hold today) · T008 (the heading ones as requirements) |
| FR-3510 | **T009** — the two layers are independent, proved by a mutation that fails one and not the other |
| FR-3511 | Satisfied **by absence**: no task touches the viewer. T006's whole shape exists so that this stays true |
| FR-3512 | Satisfied **by absence**: Phase 1 is empty and no task adds a dependency |
| FR-3513 | Satisfied **by absence**: no task touches the palette, the tokens or the presentation defaults. T005 changes one element inside one wrapper |

| Success criterion | Where |
|---|---|
| SC-3501 | T008 |
| SC-3502 | T006 |
| SC-3503 | **T009** |
| SC-3504 | T006 — and `035`'s counter already fails if anything leaves |
| SC-3505 | T004 |
