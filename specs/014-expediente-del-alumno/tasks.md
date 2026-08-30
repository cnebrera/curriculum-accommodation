# Tasks: The learner's record

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-30

Twenty-two tasks. Six of them are erasure, which is one phase for one reason:
getting it backwards either destroys another child's material or leaves an
orphaned photograph of a worksheet in her folder for ever.

---

## Phase 1 · Setup

- [ ] T001 Write `packages/core/test/record.test.ts` first, red, from
      [quickstart.md](quickstart.md)'s offline list. Fixtures include **a vault
      built entirely before this feature** — FR-1204 is the requirement that
      decides whether this ships with history or without it

---

## Phase 2 · Foundational · the scan

**Blocking.** Everything else reads what this produces.

- [ ] T002 `packages/core/src/record/entry.ts` — the `RecordEntry` shape per
      [data-model.md](data-model.md), with `missing` as a **field** and not a
      filter. A record that drops rows whose files it cannot find tidies away her
      history to keep its own list clean
- [ ] T003 `packages/core/src/record/scan.ts` — walk `material/*/`, find the
      directories named for this learner's code, read each adapted document's
      front matter. Deterministic and offline (Principle II)
- [ ] T004 Derive `signedOff` from the adapted document itself, via the same
      `isSignedOff` the print path uses (`007` FR-509). Two readers of one truth
      is how the draft mark came off without a sign-off the first time
- [ ] T005 [P] Resolve `source.of`: `file` when `material/<job>/source/` exists,
      otherwise the IR's own `source:` front matter. A pasted job says the source
      and the read text are one document, rather than reporting a missing file
      (see [research.md](research.md) — without this the *common* case reports a
      fault)
- [ ] T006 [P] `missing`: `stat` every path in `documents` and list what is not
      there (FR-1206)
- [ ] T007 Sort newest first, group by school year
- [ ] T008 A learner directory whose learner no longer exists must not break the
      scan — she erased them and a crash left the directory

---

## Phase 3 · The file she can read

- [ ] T009 `packages/core/src/record/markdown.ts` — render `record.md` with
      relative links that resolve in Obsidian (FR-1212). **No name in it**: the
      file is keyed by code, because a plaintext file carrying names is a second
      copy of the name map without its encryption (FR-1207)
- [ ] T010 Assert nothing reads it back (FR-1213/SC-1203) — a source assertion
      that `record.md` appears in no read path. It is written for her, and an
      application that parses it has made it a second source of truth
- [ ] T011 Write it on the events in FR-1215 — a job completing, a sign-off, an
      erasure — and **never on opening a screen**. A synced vault must not
      generate conflicts from being looked at

---

## Phase 4 · The wire and the screen

- [ ] T012 `record:forLearner`, `record:rebuild` in a new `ipc/record.ts`, per
      [contracts/record.md](contracts/record.md). `forLearner` writes nothing,
      not even `record.md`
- [ ] T013 [P] `ui/src/data/record.ts` — `useRecord(code)` over `useAsync`
- [ ] T014 The record screen, reached from a learner. Each row: the date, what it
      was, whether it is signed, and the three ways in
- [ ] T015 An unsigned sheet appears **marked unsigned** (Principle VII,
      clarification). Hiding it would mean the one thing she cannot find is the
      thing she abandoned halfway
- [ ] T016 A row whose document is gone says so and does not offer to open it
- [ ] T017 **Principle IX**: titles and subjects in a record come from ingested
      material, which is attacker-controllable. Rendered as text, never as
      Markdown that could carry a link or an image (`007`)
- [ ] T018 **Principle V**: assert a record shows *work* and never the child — no
      axis values, no counts of how much a learner needed, no progress over a
      person

---

## Phase 5 · Erasure · the only subtle logic here

- [ ] T019 Extend `planForget` (`003`): the plan lists the learner's adaptations,
      renders and record, **and** says which shared sources will survive and why
      (FR-1211). She sees it before anything is deleted
- [ ] T020 A shared source survives while any other learner references it, and is
      removed when the last one stops (FR-1210). Two learners, one worksheet,
      erase one — this is the case that is easy to get backwards in both
      directions
- [ ] T021 `packages/core/test/record-erasure.test.ts`, covering both directions
      and the order they happen in

---

## Phase 6 · Search, and closing honestly

- [ ] T022 `record:search` over the record's own fields — year, kind, subject,
      title — and over the material's text. **Never by name**: names are resolved
      in the renderer and filtered to codes before the call (FR-1208, `015`
      FR-1302). Measure SC-1207 at 400 jobs here; if it misses, the cache under
      `.rampa/` is the fix and FR-1214 already permits it

---

## Not in scope, recorded so it stays a decision

- **No cache in v1.** FR-1214 permits one; [research.md](research.md) argues
  against building it before a measurement asks. A cache is a second copy of a
  truth, and this project has now found that defect four times.
- **No `record.delete`.** Erasure is `003`'s, extended. Two ways to delete a
  learner is two things to keep correct, and one would stop covering something.
- **Filters and views over the caseload** are `015`.

## Dependencies

- T001 before everything; Phase 2 blocks Phases 3–6.
- T009 needs T002–T007.
- Phase 5 needs Phases 2–4 to exist to be wrong about.
- **SC-1201's real test is a teacher a year later**, and it is not a task.
