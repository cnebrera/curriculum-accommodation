# Tasks: Navigating a caseload, without ranking children

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Sixteen tasks. Four of them are Principle V, and they are not a review pass at the
end — the shape that would violate it is a sortable table, and the way to not
build one is to make it unexpressible in the data path.

---

## Phase 1 · Setup

- [ ] T001 Write `packages/core/test/roster.test.ts` first, red, from
      [quickstart.md](quickstart.md). Include forty learners, and include the
      learner with **no course, no school and no age** — she is the one added in a
      hurry because he needed something tomorrow, and she is the one a naive
      filter loses

---

## Phase 2 · Foundational · the filter, which cannot rank

- [ ] T002 `packages/core/src/roster/filter.ts` per
      [contracts/roster.md](contracts/roster.md): pure, stable order, **no sort
      argument and no axis anywhere in the signature**. That absence is the
      structural half of Principle V — a view cannot order children by a barrier
      because nothing in the data path accepts one
- [ ] T003 The `UNSET` sentinel, distinct from `undefined` (FR-1302 territory):
      «do not filter by course» and «show me the ones with no course» are
      different questions, and conflating them hides the learners with the least
      recorded
- [ ] T004 [P] The school-year filter reads the **work's** year (`014`'s record),
      never the profile's current course — a learner who changed course between
      years must still be found under last year's work
- [ ] T005 [P] Assert no exported function in `core/roster` accepts an axis or an
      ordering. A test over the module's own signatures, so adding one later is a
      failing test rather than a review somebody has to catch

---

## Phase 3 · The new field

- [ ] T006 `school`, optional free text, on the profile schema
- [ ] T007 `school` joins the **never-sent** set beside the name (FR-1306): not in
      a prompt, not in an export, not in a log. A school plus a course plus a set
      of barriers identifies a child far more sharply than a code does
- [ ] T008 `school` appears in the erasure plan and is erased with the learner
      (FR-1307) — and `verifyForgotten` already searches the whole vault, so the
      claim is made honestly rather than assumed from a delete list
- [ ] T009 A field in the profile editor, with no explanation asked for. She knows
      what her school is called

---

## Phase 4 · Finding

- [ ] T010 Search by the name she sees **and** by code (FR-1301) — the code is
      what is printed on the sheet, so it is what she has in her hand
- [ ] T011 Resolve names in memory, per keystroke, over at most forty entries
      (FR-1302). **No cache and no index**: a plaintext copy of the decrypted name
      map is the one thing the whole substitution design exists to prevent (`014`
      FR-1207), and forty rows is free
- [ ] T012 A filter bar: course, stage, school, school year. Combinable, visibly
      applied, cleared in one action (FR-1303). **Not persisted across restarts** —
      a filter she set on Friday and forgot is a caseload that looks half-empty on
      Monday, and the first thing she concludes is that Rampa lost her learners
- [ ] T013 A filter matching nobody names the filter responsible (FR-1304), and
      offers to clear it

---

## Phase 5 · A second way of looking, and no third

- [ ] T014 A grouped view: by course, stage or school. Within a group the order
      encodes nothing about the children (FR-1310)
- [ ] T015 Extend `005` T019's assertion to the new views: no table containing
      axis values, no row holding two learners' strips, no total or count of
      barriers per child (FR-1309…1311)
- [ ] T016 Hold at 560 px and at the largest text scale (`013` FR-1115). A filter
      bar is chrome, and chrome is what gets crushed first at `xlarge`

---

## Not in scope, recorded so it stays a decision

- **A table.** Not a style choice: the available columns are the nine axis values
  and a sortable grid of those is a ranking of disability. See
  [research.md](research.md).
- **A `grupo` or `clase` concept.** `005` decided that choosing several learners
  for one worksheet does not declare a persistent group. Whether one is worth
  having is a question for a teacher.
- **Saved filters, "recently viewed", a default filter.** Each is state about her
  caseload that would have to stay true through erasure, a course change and a
  hand-edit in Obsidian.

## Dependencies

- T001 before everything; Phase 2 blocks Phases 4 and 5.
- T004 needs `014`, which shipped.
- T006 blocks T007, T008, T009 and the school filter in T012.
- **SC-1301 and SC-1304 need a person**, and are not tasks. SC-1304 is the one
  this feature is actually judged on: a reviewer given the screens cannot
  construct a ranking from anything the interface offers.
