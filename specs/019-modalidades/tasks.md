# Tasks: The other outputs, and the route she answers by

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

> Written after Phases 1-2 were already implemented. Marked accordingly rather
> than presented as a forecast.

---

## Phase 1 · The editable export (US1) — the one with the most users

- [x] T001 A store-only ZIP writer in `packages/core/src/render/zip.ts`, no
      dependency, deterministic *(done. `node:zlib`'s `crc32` is native in Node 24, so this is sixty lines. `jszip` and `archiver` were both resolvable transitively and both rejected: a dependency reached through somebody else's package.json is one nobody declared.)*
- [x] T002 `renderODT` in `packages/core/src/render/odt.ts` — the same adapted IR,
      no re-adaptation (FR-1701) *(done, and it needed **no field the IR did not already have** — the first evidence for Principle IV's untested claim.)*
- [x] T003 The draft mark as the **first paragraph**, derived from the document
      (FR-1707, Principle VII) *(done. A paragraph rather than a page header: a header lives in the page style and whether a word processor carries it through an open-edit-save cycle depends on the editor. A first paragraph is content.)*
- [x] T004 No learner data beyond the code, **including in the metadata**
      (FR-1706) *(done: `meta.xml` writes an empty `dc:creator` deliberately, because a word processor fills the author field from the machine's account name unless told otherwise — so an export would have carried the **teacher's** name out of the vault.)*
- [x] T005 The same output checks as the HTML path, on the same document *(done. A modality that skipped `checkOutput` would be the first parallel pipeline Principle IV forbids, arriving as an omission rather than a design.)*
- [x] T006 `job:odt`, the data-layer hook, and a button on the review screen
      *(done, beside the PDF rather than instead of it: the PDF is what she photocopies and this is what she corrects.)*
- [x] T007 **Open it with something.** `packages/core/test/odt.test.ts` converts
      the output with `soffice` where it exists *(done, and it is the only assertion in that file that could catch a malformed container — everything else compares XML we wrote against expectations we wrote. Where `soffice` is absent it skips and **says so out loud**, because a green suite on a machine without LibreOffice means the openability claim was not checked.)*

---

## Phase 2 · The response route (US4) — a live defect, not a gap

- [x] T008 `recipes/core/response-route.md`: what changes and what does not
      (FR-1716/1717) *(done, and rewritten once — my first version was in Spanish with «Anti-patrones» and no Before/After, against nine existing recipes that are English prose with Spanish examples. Matched the corpus rather than starting a second style.)*
- [x] T009 Assert `MOT>=2` selects it, `MOT: 0` does not, and an exam does
      (FR-1716) *(done in `selection-baseline.test.ts`, beside the evidence that it selected nothing before.)*
- [ ] T010 Name a changed response route in the report as an **access
      arrangement** (FR-1718). Needs `012`'s kind to be in the report, which it
      now is — so this is a small addition and is not done

---

## Phase 3 · Audio (US2) — blocked on a question, not on effort

- [ ] T011 **Answer the reading-order question first.** What is the order when the
      visual layout *was* the point — a matching exercise, a number line, a
      two-column comparison? This is where the IR's promise gets tested hardest,
      and a guess produces an audio file nobody uses
- [ ] T012 An audio-ready rendering with an explicit reading order (FR-1708)
- [ ] T013 A figure spoken by its description; an undescribed one **announced as
      undescribed** rather than skipped (FR-1709)
- [ ] T014 An answer space announced (FR-1710) — silence where the page has a box
      is a missing question
- [ ] T015 The draft mark **heard first** (FR-1711). A draft that only announces
      itself visually does not announce itself to this learner
- [ ] T016 The learner's code never spoken (FR-1712) — a code read aloud in a
      classroom is a code that stops being a code

---

## Phase 4 · Braille-ready (US3) — blocked on a person

- [ ] T017 A linear rendering with no information carried by layout alone
      (FR-1713)
- [ ] T018 Anything that cannot be honestly linearised **named for the
      transcriber** (FR-1714), never silently dropped
- [ ] T019 Do not claim to produce braille (FR-1715)
- [ ] T020 **SC-1706 needs a transcriber or a blind learner's teacher.** Not a
      task, and no substitute exists. Building Phase 4 without one produces a file
      that satisfies a specification and possibly nobody

---

## Not in scope, recorded so it stays a decision

- **A bundled speech engine.** Large, and a per-language quality problem nobody
  here can judge. The spec says audio-*ready*.
- **Braille itself.** Braille-ready is a document a transcriber or an embosser
  works from. Claiming to produce braille would be claiming expertise this
  project does not have and cannot check.
- **DOCX.** ODT opens in Word, LibreOffice is what a Spanish state school has, and
  a second container format is a second thing to keep valid.

## Dependencies

- T010 needed `012`'s kind in the report, which shipped.
- T011 blocks all of Phase 3, and it is a design question rather than a task.
- T020 blocks nothing and gates everything: Phase 4 can be written and cannot be
  known to be right.
