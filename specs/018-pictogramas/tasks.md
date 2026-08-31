# Tasks: Pictograms — the family we planned and never built

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Twenty-one tasks. The order is the argument: **the licence refusal, then the
per-learner gate, then matching, then anything that draws a picture.** Each of
those three is a safeguard the next one could otherwise be built around.

---

## Phase 1 · The refusals, before anything can insert a picture

- [ ] T001 `packages/core/test/pictogram-licence.test.ts`: **the repository
      contains no pictogram asset** (SC-1601). Walks the tree, fails on any image
      that is not one of ours, and names the file. Written first, because a licence
      assertion added after the feature works is one written to fit what already
      happens
- [ ] T002 Assert `packages/core/src/pictograms/` reaches no network — in the
      isolation suite, which already walks all of `core`. A set is fetched by her,
      never by us (FR-1601)
- [ ] T003 Author `instructions/pictograms.md`: what pictograms are for, when they
      help, and the sentence this feature exists to honour — a dyslexic
      fifteen-year-old does not want a worksheet that looks like it is for a
      five-year-old. Corpus, per Principle I. Carries the minimum print size
      (research R4) so it can move without a release

---

## Phase 2 · Foundational · the gate that keeps the decision hers

- [ ] T004 `pictograms` on the profile schema: `enabled`, `scope`, `decided_on`,
      `overrides`. Optional, absent by default, and **absent means off**
- [ ] T005 [P] Assert **no axis value can enable it** (FR-1605, SC-1603): a test
      over `selectRecipes`' own signature and over the apply path, so there is no
      code in which an axis reaches this family. The structural half of Principle
      V, exactly as `015` T005 did it for ordering
- [ ] T006 [P] `pictograms` joins the fields an erasure plan names and erases
      (`003`): it is a recorded decision about a child

---

## Phase 3 · US3 — the right pictogram, or none (P1) 🎯 MVP

**Goal**: «rana» gets the frog, or it gets nothing. Never the wrong one.

**Independent test**: over a fixture set with a deliberate ambiguity, zero wrong
pictograms, and the ambiguity reported with its candidates.

- [ ] T007 [US3] `packages/core/src/pictograms/set.ts` per
      [contracts/pictogram-set.md](contracts/pictogram-set.md): read a directory,
      build **keyword → ids** (plural), report what it found and in which language
- [ ] T008 [US3] The unusable-set cases, each named rather than collapsed into «no
      pude leer la carpeta»: no metadata, metadata with no images, unreadable JSON,
      images only. **Filenames are not metadata**
- [ ] T009 [US3] `packages/core/src/pictograms/match.ts`: her override, then the
      name check, then normalise, then **exactly one or nothing** (FR-1608…1610)
- [ ] T010 [US3] An ambiguous word is omitted **and reported with its candidates**
      (FR-1609). A word with no match is omitted silently — most words have none,
      and reporting each would bury the ones that matter
- [ ] T011 [US3] Write `packages/core/test/pictograms.test.ts` with a fixture set we
      author: an unambiguous word, an ambiguous one, a name, an accented word, a
      word in the wrong language, and an id whose image is missing
- [ ] T012 [US3] `packages/core/src/pictograms/apply.ts`: insert into the IR as
      `data-picto` per pictogram, scoped as she chose — everywhere, instructions
      only, or key vocabulary only
- [ ] T013 [US3] **The exam rule** (`012`, Principle III): no pictogram on a
      question whose subject is the word itself. A pictogram beside «rana» in a
      vocabulary test supplies the answer, which is changing what is asked

**Checkpoint**: matching is honest before anything is drawn.

---

## Phase 4 · US1 — she brings the set (P1)

- [ ] T014 [US1] Point Rampa at a folder, and record **its location and licence**
      in the vault — never a copy of the set and never a cached index of it
- [ ] T015 [US1] Before she configures one, say what the licence requires,
      including that a sheet containing pictograms is a derivative work under
      CC BY-NC-SA (FR-1602). And **no download button** (FR-1601): Rampa says what
      to fetch and from where
- [ ] T016 [US1] A set that moved or was deleted: sheets still render, and say the
      image is missing (FR-1616)

---

## Phase 5 · US2 — she decides, per learner (P1)

- [ ] T017 [US2] The control in the profile editor, with the three scopes and the
      sentence about what this costs a child in a mainstream classroom
- [ ] T018 [US2] Where it is off, **the report does not propose it** (FR-1607). A
      tool that keeps proposing pictograms is a tool arguing with her about how a
      child is seen

---

## Phase 6 · US4 — it prints, and it is legal (P1)

- [ ] T019 [US4] `packages/core/src/render/attribution.ts`: derived from the
      document, beside the draft mark, and **no parameter** — the defect `007`
      FR-509 found was a renderer that could ask for an unmarked sheet
- [ ] T020 [US4] Embedded as data URIs in HTML and ODF, so a sheet survives being
      emailed to a colleague without the set (FR-1615) — and every pictogram
      carries its text alternative (FR-1614)
- [ ] T021 [US4] A missing image degrades to a named gap, and the provenance still
      says which id it wanted (FR-1616)

---

## Not in scope, recorded so it stays a decision

- **Fetching the set, even behind a confirmation.** FR-1601 is absolute, and a
  download button makes us the distributor of CC BY-NC-SA content inside an
  Apache-2.0 application.
- **A mapping file of ours.** The set's metadata is the vocabulary (FR-1608); ours
  would be a second one to maintain and to get wrong, and FR-1612 already gives her
  the override for the cases the set gets wrong for her school.
- **Generating or choosing images with a model.** Not a performance decision: a
  model choosing a picture is the wrong-pictogram failure with no traceability.
- **An AAC communication board.** A different product, and ARASAAC's own materials
  do it better.

## Dependencies

- Phase 1 blocks everything. Phase 2 blocks Phase 3's apply path.
- `017` for an overlay that prescribes pictogram support — **not blocking**: the
  profile field is the mechanism either way, and `017` sets it.
- `019` for the text alternative, which is the same field braille and audio need.
- **SC-1605 and SC-1606 need a person.** SC-1606 is the one this feature is judged
  on, and it is the negative half: a PT who does *not* use pictograms says Rampa
  never pushed her toward them.
