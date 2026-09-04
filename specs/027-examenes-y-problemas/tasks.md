# Tasks: Exámenes y problemas de verdad

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-seven tasks, and the first one is a test about answers reaching a child's exam.
The two missing kinds become producible in this feature; the check that a composed exam
never carries an answer is written **before** an exam can render, per SC-2502 and `021`
T001's lesson: a check written after the feature works is a check written to fit what
already happens.

The shape of the rest follows Phase 0: the deterministic core (extraction, parsers, the
loop cut, the split) lands before any pipeline, and the pipelines are then mostly wiring
into machinery `002` and `021` already built — the loop, the verifier, the key file, the
draft mark, the report.

---

## Phase 1 · Setup · the two tests that come first

- [x] T001 Write `app/packages/core/test/exam-never-carries-answers.test.ts` **first**,
      red, per [quickstart.md](quickstart.md) §1. **SC-2502 against the rendered
      output, not the IR**: the learner-facing document of a composed exam contains zero
      answers — computed or model-claimed, in text or in any support layer — in HTML, ODT
      and the linear text; and no problem statement contains its computed answer. Its
      failure mode is an answer on the page a child sits an exam with (FR-2503, FR-2512)
      *(done: `packages/core/test/exam-never-carries-answers.test.ts`, 12 cases. Red
      first on two of them — the two answer-space assertions — and **green on the ten
      about answers**, which is worth recording: `buildSheet` already wrote no answer
      anywhere, so what was missing was somewhere to write, not a leak. It also asserts
      the questions **are** there, because «contains no answers» passes trivially for a
      blank page. **And mutation caught one of its own assertions being vacuous**:
      `toContain('answer-space')` was satisfied by the stylesheet, which is emitted
      whether or not any block asked for space — so removing the attribute the renderer
      reads left the suite green. Asserted on the element and its count now. Second time
      in two days a test here has been satisfied by a CSS rule.)*
- [x] T002 [P] Write `app/packages/core/test/problem-verification.test.ts` **first**,
      red, from quickstart §2: the seven cases, including the one the spec's checklist
      warns about — a model whose declared operands are consistent with its own wrong
      answer but absent from the statement is **rejected**, because verifying the
      model's separate claim is verifying the liar with his own declaration (FR-2501,
      FR-2502, FR-2504)
      *(done: `packages/core/test/problem-verification.test.ts`, 21 cases, including the
      one the checklist warned about — `3,50 - 1,10 = 2,40`, internally perfect and
      rejected because `1,10` is nowhere in the statement. And the false positive the
      naive form of the answer-in-the-statement check would cause: «Tenía 10 y se comió
      5» answers 5, which is an operand, and refusing that would reject half of all
      subtractions and burn her budget on correct problems.)*

---

## Phase 2 · Foundational · the deterministic core, before any pipeline

**Blocking**: nothing in Phase 3 or later may start until this phase is green. A pipeline
built against parsers that do not exist yet is a pipeline that gets a lenient parser
retrofitted — and a lenient parser here verifies a guess.
- [x] T003 `app/packages/core/src/compose/problems.ts` (new) · `extractQuantities` and
      `verifyProblem` per [research.md](research.md) R2 and
      [data-model.md](data-model.md): numbers pulled from the statement text (Spanish
      decimal comma, compared as values), the declared expression admitted **only if
      every operand appears among them**, the answer computed by the existing
      `arithmetic` verifier — never taken from the model — constraints and level checked
      by `exercises` unchanged, and the computed answer rejected if it appears in the
      statement. Reject, never repair (FR-2501, FR-2502)
      *(done: `compose/problems.ts`. `extractQuantities` folds the Spanish comma and
      reads a dot as a thousands group only when every group is three digits —
      typography, not pedagogy, which is why it is code. The operand check and the
      answer-in-the-statement check ride `malformed`'s channel with their own sentences,
      so the loop, the budget, `explainOutcome` and the report all work unchanged.)*
- [x] T004 [P] `app/packages/core/src/compose/proposals.ts` · `parseProblemProposals`
      and `parseExamProposals` per
      [contracts/proposal-formats.md](contracts/proposal-formats.md), with
      `parseProposals`' exact intolerance: tolerant of a fence, numbering and a full
      stop; a half-labelled block is **no proposal**, never a guessed one (FR-2507)
      *(done: `parseProblemProposals` and `parseExamProposals` in
      `compose/proposals.ts`, sharing one label parser and `parseProposals`' exact
      intolerance. A block with no `ENUNCIADO`/`TEXTO` is no proposal; one with no
      `OPERACIÓN` **is kept**, because that is the declared-unverified case and dropping
      it would hide it.)*
- [x] T005 `app/packages/core/src/compose/loop.ts` · the P19 cut: a batch whose every
      verdict is `unknown` **aborts** `composeExercises` instead of re-proposing; the
      outcome records it, and `explainOutcome` names the constraint in her words (the
      verifier's `describe`) and the proposals spent (FR-2510). In the loop so the new
      paths get it by construction. **COLA 0.4 names the same cut** — whichever lands
      first owns it, the other cites it (`021` R2's ownership rule)
      *(**done by COLA 0.4 on 2026-09-04**, which named the same cut — the ownership
      rule says whichever lands first owns it. `constraintUnverifiable` in
      `compose/loop.ts`, with `explainOutcome`'s own sentence («no lo sé comprobar en
      esta operación») instead of the one that read as a model having a bad day. Cited
      here, not reimplemented.)*
- [x] T006 [P] `app/packages/core/src/compose/objectives.ts` · an objective naming
      several operations yields **several skills**, one per operation, constraints
      resolved per operation — «llevadas» + resta → `borrows` (Carlos's P19 answer) — so
      «sumas y restas con llevadas» composes both, verified, and nothing silently narrows
      to the first match (FR-2508, SC-2504). The borrows mapping is also COLA 0.4's:
      same ownership rule as T005
      *(done, and it is the half 0.4 did **not** do. 0.4 fixed «llevadas» resolving per
      operation; the silent narrowing stayed — `OPERATIONS.find()`, first match wins.
      Now `readObjective` returns a **list**, one skill per operation named, in her
      order, each with its constraints resolved for its own operation. There is
      deliberately no single-objective variant left in the API, because that variant is
      the defect: the four test files that wanted one now declare a local `one()` and
      say why. 7 new cases in `objectives.test.ts`.)*
- [x] T007 `app/packages/core/src/compose/sheet.ts` · `buildSheet` takes problem items
      and exam questions per [data-model.md](data-model.md): statements and prompts as
      blocks with `data-objective` (and `data-unverified` where declared), numbered
      questions, **no answer of any provenance written to the sheet**; `renderAnswerKey`
      takes `KeyEntry` — computed entries as today, `declared-unverified` entries led by
      their per-entry label (research R3's position, and the recorded fallback if it is
      rejected in review). The skill path's no-model-answers rule untouched (FR-2503,
      FR-2507)
      *(done, with **two departures from plan.md, recorded rather than slipped in**: no
      new `problem`/`question` block classes. `BlockClass` is a closed vocabulary and
      recipes select on it (`presentClasses`), so classes nothing scopes to would put
      every composed problems sheet and every composed exam **outside every recipe's
      scope** — adapting one would apply nothing at all, which is this feature's own
      «offered and not produced» failure one layer down. A word problem is an
      `exercise`; an exam question is an `assessment`, the class
      `exam-access-not-difficulty` is already scoped to, so a composed exam gets the
      access-not-difficulty recipe by construction. `SheetGroup` is a union so a group
      cannot be two shapes at once, and `KeyEntry` keeps `status` optional on the
      computed variant so the skill path's contract is literally untouched (FR-2507).)*
- [ ] T008 `app/packages/shell/src/jobs/compose.ts` · **one system per path**
      (FR-2507): `OUTPUT_FORMAT` appended only for skill practice; problems and exam
      paths get their own format suffixes from the contract; `composeContent`'s system
      stops demanding one-liners while its user message demands IR blocks — the review's
      AGE-04 contradiction dies here. (COLA 2.12's max_tokens detection is **not** this
      task; noted so its absence is a decision)

**Checkpoint**: T001 and T002 written and red where the feature is missing, the offline
suite otherwise green.

---

## Phase 3 · User Story 1 · Problems with a statement (P1) 🎯 MVP

**Goal**: «problemas de sumas y restas con dinero, 6, para 4.º» produces six stories
whose numbers the code extracted and computed; the key carries computed answers; an
inconsistent proposal died in the loop.

**Independent Test**: compose problems; every key answer computed by code from the
statement's own quantities; no proposal with inconsistent arithmetic survived.

- [ ] T009 [US1] `app/packages/shell/src/jobs/compose.ts` · the problems pipeline:
      `request.kind === 'problems'` selects it, proposals parsed by
      `parseProblemProposals`, verified by `verifyProblem` **through the existing
      `composeExercises` loop** (budget, dedupe, reject-don't-repair and the T005 cut for
      free), and the quantity she gave counts **problems** — the kind's unit from the
      corpus `quantity:` block (FR-2501, FR-2502, FR-2505)
- [ ] T010 [P] [US1] Interests reach the **wording only** (FR-2511): the propose prompt
      keeps `002`'s «úsalo en el contexto, no en la dificultad», and the test asserts the
      structure makes it true — quantities are re-extracted and re-verified from the
      statement whatever the prompt said, and with no interest recorded the prompt asks
      for plain statements (`022` FR-2005/2006's pair, applied to text)
- [ ] T011 [US1] Per-item declaration (FR-2504): an item carried unverified is named on
      the report, its block carries `data-unverified`, and a sheet containing **any**
      unverified item says so **beside the draft mark** — per item, because a sheet
      «unverified somewhere» teaches her to distrust everything (spec checklist)
- [ ] T012 [US1] The SC-2501 invariant, as a test over the composed corpus fixtures:
      100% of computable items have code-computed keys and **zero** rejected-then-
      repaired items exist — asserted structurally (the accepted set never contains a
      mutated statement or expression), not sampled

**Checkpoint**: the P1 the spec calls complete — problems compose, verified, declared
where not.

---

## Phase 4 · User Story 2 · An exam that is an exam (P1)

**Goal**: «examen, 10 preguntas» produces numbered questions with answer space, zero
answers on the sheet, a separate key for her, computable questions verified.

**Independent Test**: compose an exam; questions match the named scope; the sheet
carries no answers; the key exists as a separate job document; every computable question
was verified.

- [ ] T013 [US2] `app/packages/shell/src/jobs/compose.ts` · the exam pipeline:
      `request.kind === 'exam'` selects it, `parseExamProposals` parses, questions with
      an `OPERACIÓN` verified exactly as problems, questions without one carried
      **declared-unverified** — and the report says which are which before she signs
      (FR-2503, FR-2504). The quantity counts **questions** (FR-2505)
- [x] T014 [US2] Answer space in the renderers: a `question` block renders with space to
      answer in `app/packages/core/src/render/html.ts`, `odt.ts` and `linear.ts` — and
      **T001 goes green here**: zero answers in any learner-facing rendering, in text or
      support layer (FR-2503, SC-2502)
      *(done: `data-answer-space` written by the sheet and read by all three renderers —
      ruled lines and a «Respuesta:» label in HTML and ODT, and in the linear reading
      the corpus sentence `019` already had, because lines on paper mean nothing read
      aloud. Keyed on the attribute and **not** on the `assessment` class: an ingested
      exam already has its own space on the page it was photographed from, and every
      adapted exam in the vault would have gained a second one. T001 green.)*
- [ ] T015 [US2] The key is the job's, and never the learner's (FR-2512): exam entries
      land in `material/<job>/answers.md` (`jobAnswers`, the existing file — no sibling),
      and an asserted **absence**: no learner-facing path — `resolveDocument`, the
      adaptation, export, linear — reads `jobAnswers`. Extend
      `app/packages/core/test/answer-key-never-on-the-sheet.test.ts` to the two new kinds
- [ ] T016 [US2] The FR-2509 gate, request-keyed: composing an exam below the enrolled
      level **stops with the teaching-team sentence when no registered ACS covers it**
      and composes to the modified objectives when the learner's overlay
      (`adaptations.md`, via `017`) records one — access adaptations always pass, and an
      asserted absence: **no profile-CUR-keyed stop exists anywhere in the compose
      path** (the P12 unlock; the sentence is corpus in `instructions/material-kinds.md`
      or `compose.md`, the gate is code). **COLA 2.11 owns the adapt-side gate**; this
      task is the compose-exam side, and whichever lands first writes the shared sentence
- [ ] T017 [P] [US2] `app/e2e/compose-kinds-real.spec.ts`, the exam walk from quickstart
      §5.2: ten numbered questions, answer space, nothing on the sheet that answers
      anything, the key its own document with `SOLUCIONES · NO REPARTIR` and per-entry
      labels

**Checkpoint**: choosing «examen» produces an exam. The storefront has a shop behind it.

---

## Phase 5 · User Story 3 · The kind governs the shape (P2)

**Goal**: `021` FR-1909, finally true: four kinds, four shapes, the count counts the
kind's unit, and the discrepancy note fires only on real mismatch.

**Independent Test**: compose one of each kind from the same objective; four documents,
four shapes, each matching its contract in `instructions/material-kinds.md`.

- [ ] T018 [US3] The kind **selects the pipeline** in `runCompose`
      (`app/packages/shell/src/jobs/compose.ts`): worksheet → skill loop, problems →
      T009, exam → T013, study → content path; the quantity question's unit comes from
      the corpus `quantity:` block per kind and the count she gives counts that unit
      (FR-2505). The derivation stays the fallback for requests recorded before `021`
- [ ] T019 [US3] The derived-kind check reads the **structure of what was produced**
      (research R5): exam questions → `exam`, problem items → `problems`, content only →
      `study`, bare expressions → `worksheet` — the `/\bproblema/i` dead code dies, and
      the mismatch note fires **only on real mismatch**, with SC-2503's zero false
      positives asserted over the test corpus (FR-2506)
- [ ] T020 [P] [US3] A request naming a kind the catalogue lacks («una rúbrica») is
      refused honestly with the four kinds offered — `findKind` already returns `null`
      and never a fallback (`012` FR-1003); this makes the refusal say the four, not
      silently map to the nearest (spec edge case)
- [ ] T021 [US3] The report names the kind, what was verified, what was declared, and
      what it cost (US3 acceptance 2), in `app/packages/core/src/report/compose.ts` —
      one report shape for the four kinds, per kind's vocabulary from the corpus labels
      (no second `KIND_ES`, `021` T020's lesson)
- [ ] T022 [P] [US3] `instructions/compose.md` · the judgement the new paths need, as
      corpus (Principle I): what makes a good problem statement (the statement is not
      the obstacle, his world's context, the question really asked, the quantities his
      level's) and what makes a good exam question — extending the existing «cuando lo
      que se pide es un examen» section, whose no-baremo rules stand unchanged (`021`
      FR-1913/FR-1914 referenced, not restated)
- [ ] T023 [US3] `app/e2e/compose-kinds-real.spec.ts` · the four-kinds walk from
      quickstart §5.3–5.4: one objective, four recognisably different documents, and the
      report every time

**Checkpoint**: «lo que ha salido se parece más a una ficha» is a sentence this
application can no longer say by mistake.

---

## Phase 6 · Polish · and the parts that need a person

- [ ] T024 **Look at it** (`013` FR-1113/FR-1118): a problems page — stories or padded
      arithmetic?; an exam's first page — does «borrador» read clearly when the page is a
      test, is the answer space usable?; the key's per-entry unverified label — unmissable
      in a pile of paper? `npm run shots`, then eyes
- [ ] T025 [P] Run quickstart §7 with a real key: interests in the wording and not the
      quantities, «restas con llevadas» composing borrows or stopping early **with the
      constraint and the spend named**, and a correction regenerating and re-verifying
      the key through `correctComposition` unchanged
- [ ] T026 **SC-2505 needs a teacher**: a composed exam, no preamble, would she put it in
      front of the group with her name on it. The only criterion here that can come back
      «no» with everything else green; «why not» is worth more than the answer
- [ ] T027 Archive it: this coverage table kept current; the ownership notes against
      COLA 0.4 (T005/T006), 2.11 (T016) and 2.12 (T008's scope note) resolved to
      citations for whichever landed first; a `specs/BACKLOG.md` entry for anything found
      on the way — and for research R3's key position if review overturned it

---

## Not in scope, recorded so it stays a decision

- **Verifying language-subject exercises.** Spelling, comprehension, series: the
  declared-draft path, per the spec's own assumption. Extending verifiers to new domains
  is future work.
- **Narrative plausibility.** «3 melones a 40 €» verifies; the report says which checks
  ran and the draft mark and T026 exist for exactly this. Pretending otherwise is the
  failure this project exists to prevent.
- **Rubrics, oral exams, grading help** — the spec's checklist names them deliberately
  absent; `021` FR-1913/FR-1914 already forbid the grading half outright.
- **AGE-06's quote-character bug** in the pictogram exam guard: COLA Lote 0/2, referenced
  by the spec's assumptions, not duplicated here.
- **`026`'s conversation**: it iterates these documents like any other; nothing here is
  conversation-specific.

## Dependencies

- T001 and T002 before everything, and red first.
- **Phase 2 blocks Phases 3–6 entirely.** T003 and T004 before T009; T007 before T009
  and T013; T008 before T009 and T013.
- T005 lands with or before the first new pipeline (T009), never after — the new paths
  multiply the ways a batch comes back 100% unknown.
- T009 before T013 (the exam path reuses the problems path's verification and key
  entries).
- **T016 lands with US2, not after it** — `002` FR-126's history, twice cited (`021`
  tasks): an exam composable before its limits exist is the same mistake with a worse
  outcome.
- T018 before T019 (the structural derivation reads shapes the dispatch produces).
- T022 lands with the pipelines it instructs (before T017/T023 run against a real
  model's output).
- T026 is the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31. Other specs' requirements
are cited with their spec's prefix, per the repository rule.

| | Where it is satisfied |
|---|---|
| FR-2501 | T002 (test, first) · T003 (extraction + computed answer) · T009 (the pipeline) |
| FR-2502 | T002 · T003 (reject, never repair) · T012 (the invariant) |
| FR-2503 | T001 (test, first) · T007 (nothing on the sheet) · T013 (the pipeline) · T014 (answer space, zero answers rendered) · T015 (the key is a separate job document) |
| FR-2504 | T002 · T011 (per item, beside the draft mark) · T013 (exam questions declared) |
| FR-2505 | T009, T013 (each pipeline counts its unit) · T018 (the kind selects, the unit from the corpus) |
| FR-2506 | T019 (structural derivation, note only on real mismatch) |
| FR-2507 | T004 (own parseable formats) · T007 (own key contract per kind) · T008 (one system per path — the one-liner stays the skill path's) |
| FR-2508 | T006 (the split, constraints per operation) · asserted end-to-end by SC-2504 in T006's tests |
| FR-2509 | T016 (request-keyed gate, ACS unlock, no profile-keyed stop — asserted) |
| FR-2510 | T005 (the cut in the loop, constraint and spend named) · exercised with money in T025 |
| FR-2511 | T010 (wording only, structurally; plain without interests) |
| FR-2512 | T001 · T015 (no learner-facing path reads the key — asserted as an absence) |
| SC-2501 | T012 |
| SC-2502 | T001, T014 |
| SC-2503 | T019 |
| SC-2504 | T006 |
| SC-2505 | T026 — needs a teacher, and is not a task in the buildable sense |
