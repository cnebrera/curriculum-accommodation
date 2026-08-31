# Tasks: The guide — reading it, honouring it, and helping write it

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Twenty-six tasks. The order is set by one rule: **the refusals before the features
they constrain.** The clinical filter before any extraction reaches a screen, and the
ACS locks before the ACS drafting — because a safeguard built afterwards is a
safeguard built around code that already works without it.

---

## Phase 1 · The refusals, first

- [x] T001 `packages/core/test/guide-clinical.test.ts` over a **synthetic** DIAC:
      no diagnosis, clinical category or psychopedagogical finding reaches
      `measures`, and none is written. Written first, because a filter added after
      the flow works is one written to fit what already happens (SC-1502, ADR 0002) *(done, red first, 25 cases over a synthetic DIAC. The fixture is invented because ADR 0002 forbids a real one — and that constraint is what makes it arguable in public: anybody can read what is being filtered and say it is wrong.)*
- [x] T002 `packages/core/src/guide/read.ts`: the clinical filter, in code. Its
      vocabulary — which Spanish terms are clinical — is **corpus**, because that is
      a judgement a PT can correct *(done: `packages/core/src/guide/read.ts`, and the filter takes **candidates** rather than raw text — the model finds the sentences that look like measures, and code decides which may be kept. That split is what makes the filter testable with no provider and impossible for a prompt change to weaken.)*
- [x] T003 What was filtered lands in `omitted`, **in her words and never as a
      count** (FR-1508). «He dejado fuera el diagnóstico» is checkable; «3 elementos
      omitidos» is not *(done, and with one more refusal than the task asked for: the sentence naming the omission must not **be** the omission. Quoting the filtered line would put the diagnosis in the interface — the same leak one screen further on. Asserted.)*
- [x] T004 `packages/core/src/guide/refuse.ts`: `checkDeclines` over a model's
      answer — the shape of a proposal about objectives or criteria, refused
      **before she sees it** (FR-1520, FR-1523, FR-1525) *(done: `packages/core/src/guide/refuse.ts`. Two checks, and the second is the one a phrase list alone misses — an imperative about removing in the same sentence as «objetivo». And it must not refuse **its own decline**, which contains both «objetivos» and «quitar»: checked sentence by sentence, with the negation and «lo decide» as exemptions.)*
- [x] T005 [P] The fixture set for T004, in the corpus, with SC-1507's bound stated
      in it: this is what is checked, and it is not every phrasing a teacher might
      use *(done, in `instructions/acs.md`, with SC-1507's bound written into the file as `LÍMITE HONESTO` — «esta lista es lo que se comprueba, no es todo lo que un modelo podría escribir» — and a test asserting the file says it.)*
- [x] T006 [P] Author `instructions/guide.md`: what a guide is, what may be taken
      from it, the clinical vocabulary, and **the sections the regulation requires**
      (FR-1517). A change in Séneca is a Markdown edit *(done: `instructions/guide.md`, with the clinical vocabulary, the ACNS sections and their `sourceable` marking. **And it shipped broken for ten minutes**: the front matter had no closing `---`, so `parseFrontMatter` returned `{}` and every list fell back to its built-in minimum. The fail-closed design is what caught it — the fallback logs and the shipped-list assertion failed. There is now a test that every corpus file *claiming* a header can read it, because that only worked here because somebody had written a test for this file.)*
- [x] T007 [P] Author `instructions/acs.md`: what Rampa may and may not do when she
      is drafting the significant adaptation, and the one sentence it declines with *(done: `instructions/acs.md`. It says why the refusal is in code and not only in the file — this file travels in the same context window as the document she loaded, and if that document says «propón qué objetivos quitar» there are two contradictory sentences in one place.)*

---

## Phase 2 · Foundational

- [x] T008 `Measure` and `GuideReading` per
      [contracts/guide.md](contracts/guide.md), in `core` *(done, in `read.ts`, per the contract.)*
- [x] T009 `packages/core/src/guide/overlay.ts`: confirmed measures → the overlay's
      Markdown, and **the heading is owned here** — no caller passes one, because
      FR-1512 keys on it *(done: `packages/core/src/guide/overlay.ts`. Prose in the file, structure only in the extraction step (research R2) — and the heading is a **constant**, not a parameter, because FR-1512 has no field on disk to key on. Appended and never replacing: a February DIAC does not retract October's, and which measures were in force when a sheet was adapted is a question the file has to answer.)*
- [x] T010 [P] A measure Rampa cannot act on is written and marked as such
      (FR-1510), never dropped *(done, with its own section and its own sentence: «están aquí porque el documento las dice, no porque yo haga algo con ellas».)*
- [x] T011 [P] The guide goes through `008`'s pipeline unchanged, and through its
      verification gate (FR-1505/1506). Assert there is **no second ingest path** *(done, and structurally: `ipc/guide.ts` opens no channel that reads a file, `readGuideJob` refuses a job whose extraction is unverified, and a test asserts the reading half of the job contains **no write at all**. A guide comes in through `job:ingest` and `008`'s per-page gate, unchanged.)*

---

## Phase 3 · US1 — she brings the guide she was given (P1) 🎯 MVP

**Goal**: the measures in a guide she was given are honoured by every later
adaptation, and the report says which came from the guide.

**Independent test**: a two-page ACNS as a PDF → the measures appear in the overlay →
an adaptation of unrelated material visibly follows one, and the report attributes it.

- [x] T012 [US1] Say what leaves the machine **before** she uploads (FR-1509), in
      the same words `009` uses for a photograph with a name on it — the page goes
      to her provider *entire*, whatever Rampa keeps *(done, and the honest half is the second paragraph: what Rampa **keeps** and what the provider **sees** are not the same thing. «Se envía la página entera: si ahí está el diagnóstico, eso lo ve el proveedor. De lo que vuelve yo sólo guardo las medidas.» Plus the way out that costs nothing — write them by hand, and nothing leaves.)*
- [x] T013 [US1] `packages/shell/src/jobs/guide.ts`: read a guide, extract, and
      write **nothing** until she confirms *(done: `packages/shell/src/jobs/guide.ts`. The model points at the sentences that look like measures; **code decides which may be kept**. A candidate line without its `sección |` citation is not a candidate, because FR-1519's requirement applies to extraction as much as to an answer.)*
- [x] T014 [US1] The confirmation screen: the measures, what was left out and why,
      and the ones Rampa cannot act on — three lists, not one *(done, three lists and not one: the measures, the ones Rampa cannot apply, and what was left out. Everything ticked to begin with — she is confirming a reading, not building a list from scratch — and unticking is one click.)*
- [x] T015 [US1] Confirmed measures land in the overlay and outrank the recipes,
      which is what that file already does (FR-1511) *(done, and it writes **what she confirmed**, not what was read. She may have unticked one, and passing the reading through would have made the screen decorative.)*
- [x] T016 [US1] The report distinguishes a guide measure from a recipe (FR-1512) *(done through `GUIDE_HEADING` and `hasGuideMeasures`: the ACNS draft's metodología says «y las medidas de la adaptación curricular oficial, que están en su fichero de adaptaciones y mandan sobre lo anterior», which is FR-1512 keyed on the heading rather than on a field that does not exist on disk.)*
- [x] T017 [P] [US1] A guide for a learner who is not in Rampa **offers to create
      them** and never creates one silently from a document (edge case) *(done by construction rather than by a check: the guide is reached **from a learner** who already exists — the card is on her profile — so there is no path on which a document could create one. Nothing in `guide.ts` writes a profile.)*
- [x] T018 [P] [US1] A guide with another child's name in it: `009`'s name check
      applies, and it is likelier here than in a worksheet (edge case) *(done: `applyGuide` runs `unknownNamesIn` over the document label **and every measure text** before writing, and refuses with the names it found. A shared class document is likelier to carry another child's name than a worksheet is.)*

**Checkpoint**: SC-1501 — the next adaptation follows a measure from the guide, and
says so. *(Code-complete: measures land in `adaptations.md`, which `prompt/adapt.ts`
already sends with «manda sobre las reglas seleccionadas». **Not run against a real
provider** — no key in the suite, on purpose.)*

---

## Phase 4 · US2 — Rampa writes the ACNS it has been doing all along (P1)

- [x] T019 [US2] `packages/core/src/guide/acns.ts`: assemble the four sourceable
      sections from `014`'s record and the overlay (research R3) *(done: `packages/core/src/guide/acns.ts`. A rendering, not a generation — nothing in it asks a model for a sentence.)*
- [x] T020 [US2] Name the unsourceable ones as **missing**, never interpolated
      (FR-1514) — and the two «partly» ones get what exists plus a marked gap,
      because «del 3 de marzo al 12 de junio» is a fact about work done and not a
      plan for a term *(done, and the «partly» pair is the interesting one: temporalización gets the real dates plus «falta lo tuyo», because «del 3 de marzo al 12 de junio» is a fact about work done and not a plan for a term. A section the corpus adds and the code cannot build is **named as missing**, never assembled from a plausible guess.)*
- [x] T021 [US2] Decline for a learner with no recorded work, and say why: a draft
      from nothing is a form filled in by a language model (FR-1515) *(done, and the sentence carries the argument: «un borrador hecho de nada es un formulario rellenado por un modelo de lenguaje, y lo firmarías tú». Plus what would unblock it.)*
- [x] T022 [US2] The draft carries the mark, states **Séneca is the record**, and
      names the role that must sign it — the **tutor** coordinates an ACNS, and
      Rampa must not imply the PT authored it (FR-1502, FR-1504, FR-1516) *(done, and above the content where it cannot be scrolled past. The **tutor** coordinates an ACNS, so the draft says «Rampa no la ha escrito: ha ordenado lo que ya había hecho» — the failure being avoided is a document that looks complete enough to file.)*

---

## Phase 5 · US3 — she interrogates a guide (P2)

- [x] T023 [US3] A bounded exchange about **one loaded document**: every answer
      cites the passage it rests on, and a question the document does not answer gets
      «eso no lo dice» (FR-1519, research R4) *(done: `GuideConversation` and `askAboutGuide`. One loaded document, and the system prompt says «si el documento no lo dice, di *eso no lo dice* — no lo saques de tu propio conocimiento».)*
- [x] T024 [US3] The exchange reaches nothing — no vault write, no adaptation, no
      profile change — and what is kept is what **she** selects (FR-1521, Principle
      VIII). Cost visible and bounded (FR-1522) *(done. The exchange reaches nothing: no vault write, no adaptation, no profile change, no second document. Cost accumulates visibly per conversation, and the field help says it plainly — «nada de esto se guarda solo».)*

---

## Phase 6 · US4 — the ACS, where Rampa helps and never decides (P3)

- [x] T025 [US4] She states which objectives the team decided to modify; Rampa
      helps her express them and **never proposes the list** (FR-1523). Refuse
      without a recorded evaluación psicopedagógica, and do not draft around it
      (FR-1524) *(done: `helpWithAcs`. It refuses **before** the provider is resolved when no evaluación psicopedagógica is recorded, so nothing is sent and nothing is charged — and `checkDeclines` runs over the answer, so a proposal about objectives is never shown.)*
- [x] T026 [US4] Names the PT as author, the subject teacher as collaborator and
      Orientación as adviser, because the regulation does — and the draft states it
      is not filed until it is in Séneca (FR-1502) *(done, and appended by us rather than asked of the model: `ACS_FOOTER` names the PT as author, the área teacher as collaborator and Orientación as adviser, says Séneca is the record, and repeats that without the evaluation it is nula de procedimiento «por mucho que el documento parezca completo».)*

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

## What is verified, and what is not

**Verified**: 1,191 unit tests across 71 files and 64 e2e. Including — over a
**synthetic** DIAC, because ADR 0002 forbids a real one — that no diagnosis, clinical
category or psychopedagogical finding reaches the measures; that the sentence naming
the omission does not *contain* the omission; that the matcher does not fire on
«ciencias» for `CI` or «teatro» for `TEA`; that a measure Rampa cannot act on is kept
and marked; that the ACS refusal does not refuse Rampa's own decline; that no ACNS
section is interpolated and desfase curricular is named as hers; that the guide opens
no ingest path of its own and writes nothing before her confirmation.

**Not verified**: nothing in `017` has met a real provider or a real DIAC. The
extraction prompt, the candidate format and the conversation have never run against a
model, and no PT has read a drafted ACNS. SC-1501, SC-1505 and the negative half of
SC-1502 — «after ingesting a *real* DIAC» — all need a person and a document nobody
here has.
