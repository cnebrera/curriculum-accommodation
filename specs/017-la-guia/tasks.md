# Tasks: The guide — reading it, honouring it, and helping write it

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Twenty-six tasks. The order is set by one rule: **the refusals before the features
they constrain.** The clinical filter before any extraction reaches a screen, and the
ACS locks before the ACS drafting — because a safeguard built afterwards is a
safeguard built around code that already works without it.

---

## Phase 1 · The refusals, first

- [ ] T001 `packages/core/test/guide-clinical.test.ts` over a **synthetic** DIAC:
      no diagnosis, clinical category or psychopedagogical finding reaches
      `measures`, and none is written. Written first, because a filter added after
      the flow works is one written to fit what already happens (SC-1502, ADR 0002)
- [ ] T002 `packages/core/src/guide/read.ts`: the clinical filter, in code. Its
      vocabulary — which Spanish terms are clinical — is **corpus**, because that is
      a judgement a PT can correct
- [ ] T003 What was filtered lands in `omitted`, **in her words and never as a
      count** (FR-1508). «He dejado fuera el diagnóstico» is checkable; «3 elementos
      omitidos» is not
- [ ] T004 `packages/core/src/guide/refuse.ts`: `checkDeclines` over a model's
      answer — the shape of a proposal about objectives or criteria, refused
      **before she sees it** (FR-1520, FR-1523, FR-1525)
- [ ] T005 [P] The fixture set for T004, in the corpus, with SC-1507's bound stated
      in it: this is what is checked, and it is not every phrasing a teacher might
      use
- [ ] T006 [P] Author `instructions/guide.md`: what a guide is, what may be taken
      from it, the clinical vocabulary, and **the sections the regulation requires**
      (FR-1517). A change in Séneca is a Markdown edit
- [ ] T007 [P] Author `instructions/acs.md`: what Rampa may and may not do when she
      is drafting the significant adaptation, and the one sentence it declines with

---

## Phase 2 · Foundational

- [ ] T008 `Measure` and `GuideReading` per
      [contracts/guide.md](contracts/guide.md), in `core`
- [ ] T009 `packages/core/src/guide/overlay.ts`: confirmed measures → the overlay's
      Markdown, and **the heading is owned here** — no caller passes one, because
      FR-1512 keys on it
- [ ] T010 [P] A measure Rampa cannot act on is written and marked as such
      (FR-1510), never dropped
- [ ] T011 [P] The guide goes through `008`'s pipeline unchanged, and through its
      verification gate (FR-1505/1506). Assert there is **no second ingest path**

---

## Phase 3 · US1 — she brings the guide she was given (P1) 🎯 MVP

**Goal**: the measures in a guide she was given are honoured by every later
adaptation, and the report says which came from the guide.

**Independent test**: a two-page ACNS as a PDF → the measures appear in the overlay →
an adaptation of unrelated material visibly follows one, and the report attributes it.

- [ ] T012 [US1] Say what leaves the machine **before** she uploads (FR-1509), in
      the same words `009` uses for a photograph with a name on it — the page goes
      to her provider *entire*, whatever Rampa keeps
- [ ] T013 [US1] `packages/shell/src/jobs/guide.ts`: read a guide, extract, and
      write **nothing** until she confirms
- [ ] T014 [US1] The confirmation screen: the measures, what was left out and why,
      and the ones Rampa cannot act on — three lists, not one
- [ ] T015 [US1] Confirmed measures land in the overlay and outrank the recipes,
      which is what that file already does (FR-1511)
- [ ] T016 [US1] The report distinguishes a guide measure from a recipe (FR-1512)
- [ ] T017 [P] [US1] A guide for a learner who is not in Rampa **offers to create
      them** and never creates one silently from a document (edge case)
- [ ] T018 [P] [US1] A guide with another child's name in it: `009`'s name check
      applies, and it is likelier here than in a worksheet (edge case)

**Checkpoint**: SC-1501 — the next adaptation follows a measure from the guide, and
says so.

---

## Phase 4 · US2 — Rampa writes the ACNS it has been doing all along (P1)

- [ ] T019 [US2] `packages/core/src/guide/acns.ts`: assemble the four sourceable
      sections from `014`'s record and the overlay (research R3)
- [ ] T020 [US2] Name the unsourceable ones as **missing**, never interpolated
      (FR-1514) — and the two «partly» ones get what exists plus a marked gap,
      because «del 3 de marzo al 12 de junio» is a fact about work done and not a
      plan for a term
- [ ] T021 [US2] Decline for a learner with no recorded work, and say why: a draft
      from nothing is a form filled in by a language model (FR-1515)
- [ ] T022 [US2] The draft carries the mark, states **Séneca is the record**, and
      names the role that must sign it — the **tutor** coordinates an ACNS, and
      Rampa must not imply the PT authored it (FR-1502, FR-1504, FR-1516)

---

## Phase 5 · US3 — she interrogates a guide (P2)

- [ ] T023 [US3] A bounded exchange about **one loaded document**: every answer
      cites the passage it rests on, and a question the document does not answer gets
      «eso no lo dice» (FR-1519, research R4)
- [ ] T024 [US3] The exchange reaches nothing — no vault write, no adaptation, no
      profile change — and what is kept is what **she** selects (FR-1521, Principle
      VIII). Cost visible and bounded (FR-1522)

---

## Phase 6 · US4 — the ACS, where Rampa helps and never decides (P3)

- [ ] T025 [US4] She states which objectives the team decided to modify; Rampa
      helps her express them and **never proposes the list** (FR-1523). Refuse
      without a recorded evaluación psicopedagógica, and do not draft around it
      (FR-1524)
- [ ] T026 [US4] Names the PT as author, the subject teacher as collaborator and
      Orientación as adviser, because the regulation does — and the draft states it
      is not filed until it is in Séneca (FR-1502)

---

## Not in scope, recorded so it stays a decision

- **Being the register.** Séneca is. Any design where Rampa's copy is authoritative
  is wrong before it is built.
- **A general assistant.** «Chat» here is a bounded conversation about one loaded
  document. A general assistant is a different product and would need its own
  argument about Principle IX.
- **Structured measures on disk.** Research R2: the overlay's value is that she can
  edit it in any editor, and a schema that had to be right about every comunidad's
  DIAC would take that away for a convenience.
- **Producing or summarising an evaluación psicopedagógica.** FR-1503. The single
  most consequential thing this feature could get wrong.

## Dependencies

- Phase 1 blocks everything. That is the point of it.
- `003` FR-209 (the overlay), `008` (ingest), `014` (the record) and `007` (the
  defences) all ship.
- **SC-1505 needs a PT**, and the half that matters is whether the parts marked
  missing were the right parts to leave to her.
- **SC-1507's bound is the fixture set**, which is in the repository so it can be
  argued with rather than trusted.
