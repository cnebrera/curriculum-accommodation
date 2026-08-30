# Tasks: The learner's record

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-30

Twenty-two tasks. Six of them are erasure, which is one phase for one reason:
getting it backwards either destroys another child's material or leaves an
orphaned photograph of a worksheet in her folder for ever.

---

## Phase 1 · Setup

- [x] T001 Write `packages/core/test/record.test.ts` first, red, from
      [quickstart.md](quickstart.md)'s offline list. Fixtures include **a vault
      built entirely before this feature** — FR-1204 is the requirement that
      decides whether this ships with history or without it *(done, red first: `packages/core/test/record.test.ts`, 15 cases including a vault with no `adapted_on` stamp anywhere — which is every vault that exists today.)*

---

## Phase 2 · Foundational · the scan

**Blocking.** Everything else reads what this produces.

- [x] T002 `packages/core/src/record/entry.ts` — the `RecordEntry` shape per
      [data-model.md](data-model.md), with `missing` as a **field** and not a
      filter. A record that drops rows whose files it cannot find tidies away her
      history to keep its own list clean *(done. `missing` is a field, not a filter.)*
- [x] T003 `packages/core/src/record/scan.ts` — walk `material/*/`, find the
      directories named for this learner's code, read each adapted document's
      front matter. Deterministic and offline (Principle II) *(done: `packages/core/src/record/scan.ts`. Pure, offline, no model.)*
- [x] T004 Derive `signedOff` from the adapted document itself, via the same
      `isSignedOff` the print path uses (`007` FR-509). Two readers of one truth
      is how the draft mark came off without a sign-off the first time *(done, via the same `isSignedOff` the print path uses.)*
- [x] T005 [P] Resolve `source.of`: `file` when `material/<job>/source/` exists,
      otherwise the IR's own `source:` front matter. A pasted job says the source
      and the read text are one document, rather than reporting a missing file
      (see [research.md](research.md) — without this the *common* case reports a
      fault) *(done — and it needed `Vault.modifiedAt`, because a document written before the stamp existed would otherwise be undated, which sorts wrong and reads as broken.)*
- [x] T006 [P] `missing`: `stat` every path in `documents` and list what is not
      there (FR-1206) *(done.)*
- [x] T007 Sort newest first, group by school year *(done.)*
- [x] T008 A learner directory whose learner no longer exists must not break the
      scan — she erased them and a crash left the directory *(done, plus the case where the learner directory survives but the adapted document does not.)*

---

## Phase 3 · The file she can read

- [x] T009 `packages/core/src/record/markdown.ts` — render `record.md` with
      relative links that resolve in Obsidian (FR-1212). **No name in it**: the
      file is keyed by code, because a plaintext file carrying names is a second
      copy of the name map without its encryption (FR-1207) *(done: `markdown.ts`. The link depth is computed from `learnerDir` rather than hardcoded, so a change there cannot silently produce a file full of links that resolve to nothing in Obsidian.)*
- [x] T010 Assert nothing reads it back (FR-1213/SC-1203) — a source assertion
      that `record.md` appears in no read path. It is written for her, and an
      application that parses it has made it a second source of truth *(done: `record-file.test.ts` greps every source in `core`, `shell` and `ui` for a read of `record.md`.)*
- [x] T011 Write it on the events in FR-1215 — a job completing, a sign-off, an
      erasure — and **never on opening a screen**. A synced vault must not
      generate conflicts from being looked at *(done — `refreshRecord` is called from the adapt handler and from sign-off, never from a read. It swallows its own failure on purpose: a sheet that adapted correctly must not be reported as failed because a courtesy file could not be written to a syncing folder.)*

---

## Phase 4 · The wire and the screen

- [x] T012 `record:forLearner`, `record:rebuild` in a new `ipc/record.ts`, per
      [contracts/record.md](contracts/record.md). `forLearner` writes nothing,
      not even `record.md` *(done: `ipc/record.ts`. `forLearner` writes nothing.)*
- [x] T013 [P] `ui/src/data/record.ts` — `useRecord(code)` over `useAsync` *(done.)*
- [x] T014 The record screen, reached from a learner. Each row: the date, what it
      was, whether it is signed, and the three ways in *(done: `RecordScreen`, reached from the learner's own screen. It needed a new `vault:open` — `job:openForEditing` could only open an adapted document, and a record row offers the source and the read text too. Path confined by `resolveInVault`, which refuses rather than sanitises.)*
- [x] T015 An unsigned sheet appears **marked unsigned** (Principle VII,
      clarification). Hiding it would mean the one thing she cannot find is the
      thing she abandoned halfway *(done.)*
- [x] T016 A row whose document is gone says so and does not offer to open it *(done — the row stays, the buttons for the missing documents are disabled, and it says how many are gone.)*
- [x] T017 **Principle IX**: titles and subjects in a record come from ingested
      material, which is attacker-controllable. Rendered as text, never as
      Markdown that could carry a link or an image (`007`) *(done, and asserted in the e2e: subjects render as text.)*
- [x] T018 **Principle V**: assert a record shows *work* and never the child — no
      axis values, no counts of how much a learner needed, no progress over a
      person *(done: `e2e/record.spec.ts` asserts zero axis elements on this screen and no count of how much a learner needed.)*

---

## Phase 5 · Erasure · the only subtle logic here

- [x] T019 Extend `planForget` (`003`): the plan lists the learner's adaptations,
      renders and record, **and** says which shared sources will survive and why
      (FR-1211). She sees it before anything is deleted *(done: `sharedKept` on the plan, plus a sentence in `survives`. **Counts, not codes** — naming another child inside a dialogue about erasing this one is exposure that buys nothing.)*
- [x] T020 A shared source survives while any other learner references it, and is
      removed when the last one stops (FR-1210). Two learners, one worksheet,
      erase one — this is the case that is easy to get backwards in both
      directions *(done, and it turned out `planForget` had the shared-source logic right since `003`. What it lacked was saying so — and one correction: it counted sibling *directories*, so a directory left behind by a crash would have kept a photograph of a worksheet in her folder for ever. It now asks whether an `adapted.md` is actually there.)*
- [x] T021 `packages/core/test/record-erasure.test.ts`, covering both directions
      and the order they happen in *(done: 8 cases, both directions and the order.)*

---

## Phase 6 · Search, and closing honestly

- [x] T022 `record:search` over the record's own fields — year, kind, subject,
      title — and over the material's text. **Never by name**: names are resolved
      in the renderer and filtered to codes before the call (FR-1208, `015`
      FR-1302). Measure SC-1207 at 400 jobs here; if it misses, the cache under
      `.rampa/` is the fix and FR-1214 already permits it *(**partly done.** `record:search` exists and filters by year, kind and text, over the record's fields and then over the material. The 400-job measurement for SC-1207 has **not** been run, so the argument against a cache is still an argument. No search UI yet: `015` owns the filters.)*

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
