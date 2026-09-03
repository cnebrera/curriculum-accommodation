# Feature Specification: Exámenes y problemas de verdad — el tipo gobierna lo que sale

**Feature Branch**: `027-examenes-y-problemas`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review (2026-09-03) found that two of compose's four material
kinds — «examen» and «problemas» — are offered on screen, charged for, and cannot be
produced: the pipeline only knows arithmetic expression lists and study text, the
required output format makes a word problem unparseable by construction, and the
kind-discrepancy note fires every time as an automatic apology. Carlos's decision (P2):

> **Construir la generación ya** — no atenuar las puertas ni retirarlas.

## The gap

`021` FR-1908/1909 promised the four kinds as equals and that the chosen kind «MUST
govern what is produced». What was built governs only the footnotes. A teacher who picks
«examen», is asked how many questions she wants, and pays, receives a list of sums or a
study text — with a note apologising that «lo que ha salido se parece más a una ficha».
The door is a storefront.

This spec makes the two missing kinds real: **a composed exam is questions with a key;
a composed problem has a statement whose numbers the code has checked.** The pattern is
`002`'s, extended: the model proposes, the code computes what is computable, and what
cannot be computed is declared — never dressed up as verified.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Problems with a statement (Priority: P1)

She asks for «problemas de sumas y restas con dinero, 6, para 4.º». Each problem is a
short story — «María tiene 3,50 € y compra…» — whose numbers and asked-for answer the
code has extracted and computed. A proposal whose story contradicts its own arithmetic
is rejected, not repaired. The key page carries the computed answers.

**Why this priority**: «Problemas» is the daily vocabulary of primary mathematics — the
skill gap between naked operations and worded problems is exactly what teachers practise.
It is P1 over exams because its verification story is complete.

**Independent Test**: Compose problems; confirm every problem's numeric answer on the key
was computed by code from the statement's own quantities, and that no proposal with
inconsistent arithmetic survived.

**Acceptance Scenarios**:

1. **Given** a request for problems, **When** the material is composed, **Then** every
   item has a statement and the key's answer is computed by code from the statement's
   quantities — never taken from the model.
2. **Given** a proposal whose stated quantities do not produce its claimed answer,
   **When** verified, **Then** it is rejected and re-proposed, not corrected in place —
   a story rewritten by code is nobody's story (`002`'s reject-don't-repair rule).
3. **Given** a proposal whose question cannot be computed from its quantities (a
   «why»-question, a missing datum), **When** verified, **Then** it is either rejected
   or carried as **unverified and declared** — and a sheet containing any unverified
   item says so beside the draft mark.
4. **Given** the learner's profile records interests, **When** statements are worded,
   **Then** the wording MAY draw on them and the quantities are unaffected (`002`'s
   existing rule for wording, `022` FR-2005's rule for themes).

---

### User Story 2 - An exam that is an exam (Priority: P1)

She picks «examen», says «10 preguntas sobre el tema 4, restas con llevadas y problemas»,
and receives: numbered questions, space to answer, no answers on the page, and a
separate key for her. The questions cover what she named. Nothing on the sheet hints at
answers (`018`'s no-chivato rule already guards pictograms; the same intent governs
here). It composes to the level P12's gate allows — by what the request would change,
not by the profile's CUR.

**Why this priority**: «Examen» is the kind with the sharpest rules in the whole corpus
(«quien lo firma se está jugando la nota de un alumno») — which is exactly why offering
it while unable to produce it was the worst version.

**Independent Test**: Compose an exam; confirm questions match the named scope, the
sheet carries no answers, the key exists as a separate document, and every computable
question was verified.

**Acceptance Scenarios**:

1. **Given** «examen» and a quantity, **When** composed, **Then** the sheet has that
   many numbered questions and zero answers; the key is a separate document belonging to
   the job (Principle IV: one composition, the key is not per-learner).
2. **Given** a mix of computable and non-computable questions, **When** composed,
   **Then** computable ones are verified and non-computable ones are declared unverified
   on the report — and the teacher sees which are which before signing.
3. **Given** the derived-kind check, **When** an exam was requested and produced,
   **Then** no discrepancy note appears — the note fires only on real mismatch, which
   requires the detector to be able to recognise exams and problems at all.

---

### User Story 3 - The kind governs the shape (Priority: P2)

Picking «ficha», «examen», «apuntes» or «problemas» produces recognisably different
documents: practice sheets drill, exams ask and withhold, study text explains, problems
narrate. The quantity question adapts to the kind («¿cuántas preguntas?» /
«¿cuántos problemas?»), and what she typed governs the count of the thing she named.

**Why this priority**: It is `021` FR-1909, finally true. P2 because US1/US2 are the
substance; this story is the promise stated once over all four.

**Independent Test**: Compose one of each kind from the same objective; four documents,
four shapes, each matching its kind's contract in `instructions/material-kinds.md`.

**Acceptance Scenarios**:

1. **Given** each of the four kinds, **When** composed from one objective, **Then** each
   output satisfies its kind's contract and the count she gave counts the kind's unit.
2. **Given** the report, **When** any kind is composed, **Then** it names the kind, what
   was verified, what was declared, and what it cost.

---

### Edge Cases

- **«Sumas y restas con llevadas»** — both operations must survive into the request; the
  review's finding that the first match silently wins (AGE-08) dies with this spec: a
  multi-skill request composes a mix or says it cannot.
- **A problem whose realism is wrong but arithmetic is right** («3 melones a 40 €»).
  Arithmetic verification cannot see it; the draft mark and her review exist for exactly
  this, and the report says which checks ran — never implying more than was checked.
- **An exam for a learner with an approved ACS**: composes to the modified objectives —
  the P12 unlock, referenced here so the exam path cannot re-import the profile-keyed
  stop.
- **Zero verifiable proposals in a batch**: the loop aborts before burning the budget
  (the P19 cut), with the constraint named.
- **A request naming a kind the catalogue lacks** («una rúbrica»): refused honestly with
  the four kinds offered — not silently mapped to the nearest.
- **The key and the child**: the key document must never be adapted for or handed to a
  learner path; it belongs to the job and to her.

## Requirements *(mandatory)*

### Functional Requirements

#### The two kinds become producible

- **FR-2501**: Composing «problemas» MUST produce items with a narrative statement, and
  the key's answer for every computable item MUST be computed by code from quantities
  extracted from that statement. No answer may originate from the model.
- **FR-2502**: A proposal whose statement's quantities contradict its claimed answer
  MUST be rejected and re-proposed, never repaired in place.
- **FR-2503**: Composing «examen» MUST produce numbered questions with answer space and
  no answers on the learner-facing document; the key MUST be a separate document
  belonging to the job.
- **FR-2504**: An item that cannot be verified by computation MUST be carried as
  unverified and declared — on the report and, if any unverified item remains, beside
  the draft mark on the sheet (`002`'s declared-draft path, per item).

#### The kind governs

- **FR-2505**: The chosen kind MUST govern the output's shape per its contract in
  `instructions/material-kinds.md`, and the quantity the teacher gives MUST count that
  kind's unit (questions, problems, exercises).
- **FR-2506**: The derived-kind check MUST be able to recognise all four kinds, and the
  discrepancy note MUST fire only on real mismatch. The current always-apology dies.
- **FR-2507**: Each kind's output contract MUST be its own — the one-line
  expression-list format remains the skill path's and MUST NOT be demanded of paths that
  cannot satisfy it (the review's two-contradictory-formats finding, AGE-04).
- **FR-2508**: A request naming several skills MUST compose across them or refuse with
  the reason; it MUST NOT silently narrow to the first recognised skill.

#### The barriers travel with the new paths

- **FR-2509**: Exam composition MUST obey the request-keyed significant-adaptation gate
  (P12): access always; changes to WHAT is evaluated stop, unless an approved ACS
  registered via `017` covers them.
- **FR-2510**: A verification loop whose entire batch returns unverifiable MUST abort
  before re-proposing, name the constraint, and report the spend so far (P19's cut,
  generalised).
- **FR-2511**: Statements MAY draw wording and theme from `profile.interests` and MUST
  NOT let it affect any quantity; with no interest recorded, statements are plain
  (`022` FR-2005/2006's pair, applied to text).
- **FR-2512**: The key document MUST never enter a learner-facing rendering, adaptation
  or export path.

### Key Entities

- **Problem**: statement, extracted quantities, the asked-for value, computed answer,
  verification status.
- **Exam question**: number, prompt, answer space; its key entry lives in the key.
- **Key**: per-job document with computed (or declared-unverified) answers; already
  exists for the skill path (`jobAnswers`), gains entries for the new kinds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2501**: Across a composed corpus of problems, 100% of computable items have keys
  computed by code and 0 rejected-then-repaired items exist. Invariant, not sample.
- **SC-2502**: A composed exam contains zero answers on the learner document, in text or
  in any support layer — checked against the rendered output, not the IR.
- **SC-2503**: Choosing «examen» or «problemas» never produces the kind-discrepancy
  apology when the output matches the request; over the test corpus the note's
  false-positive rate is zero.
- **SC-2504**: «Sumas y restas con llevadas» produces a mixed set with both operations
  present and verified — the review's zero-exercise, full-budget failure is impossible
  by construction.
- **SC-2505**: A teacher shown a composed exam says whether she would put it in front of
  the group with her name on it. **Needs a teacher** — whether the questions are worth
  asking is not answerable here.

## Assumptions

- **Verification of language-subject exercises stays out.** Spelling, comprehension and
  series remain unverifiable by this project's deterministic core; they flow through the
  declared-draft path. Extending verifiers to new domains is future work, not this spec.
- **No new provider calls beyond the compose loop.** The new kinds ride the existing
  propose→verify loop and redaction chokepoint.
- **The exam's «no answers» includes pictograms** — `018`'s exam guard is referenced,
  not duplicated. Its quote-character bug (AGE-06) is a `COLA` Lote 0/2 fix, not this
  spec.
- **`021`'s gates stay.** Anchor, provenance and cost gates apply to the new paths
  unchanged; this spec adds shapes, not exceptions.
- **The conversation (`026`) iterates these documents like any other.** Nothing here is
  conversation-specific.
