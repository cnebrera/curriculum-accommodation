# Feature Specification: What the material is — and when it is more than one thing

**Feature Branch**: `012-que-material-examen`

**Created**: 2026-08-29

**Status**: Draft — clarifications below, then `/speckit-plan`

**Input**: Carlos, 2026-08-29: *"un PT tiene que adaptar el material de estudio,
exámenes, fichas, problemas. Y además a veces tiene el texto o ficheros (podrían
ser más de uno)."*

Two findings behind it, both real:

1. **`job:create` writes `kind: 'worksheet'` hardcoded.** The application never
   asks what the material is. Every screen says «Adaptar una ficha».
2. **`recipe.scope` filters nothing.** It is parsed, exposed over IPC for display,
   and read by no selection logic. `exam-access-not-difficulty` — scoped
   `[assessment]`, axes `[]` — is therefore selected for every adaptation, and
   whether it applies only to exam blocks depends on the model reading its body.

## Why this matters more than a label

An exam is not a worksheet with different words. `007` FR-011 and the whole
`exam-access-not-difficulty` recipe rest on one distinction: **in an exam you may
change how it is asked and never what is being demonstrated.** Simplify a
worksheet's question and you have helped; simplify an exam's question and you have
altered the assessment — which is the thing the child's grade, and sometimes his
placement, is built on.

Today nothing in the pipeline knows which it is. The model infers it from the
content, and for an exam that is usually obvious. *Usually* is doing a great deal
of work in a sentence about a child's grades.

And the naming compounds it: a teacher who reads «Adaptar una ficha» on every
screen concludes it does not do exams and never tries.

## Clarifications

### Session 2026-08-30

Answered from the constitution and from specifications already written, each
recording where the answer came from.

- **Q: Where is the kind asked?** → **A: In the door (`016`), after the learner
  and before the material arrives.** `016` was clarified to learner → work →
  material, so US1's «before anything else» is preserved in substance rather than
  in sequence: the kind is still explicit, still never defaulted (FR-1003), and
  still chosen before the model sees anything. What moved is when she is asked
  relative to naming a child, not relative to the adaptation.

- **Q: What is the kind of material composed from objectives (`002`)?** → **A:
  She says, same as any other material.** `002` FR-126 already requires generated
  material to carry a kind. Composing does not exempt it: a generated exam is
  still an exam, and the assessment rule applies to it for the same reason.

- **Q: Does a kind survive a re-adaptation or a revision?** → **A: Yes — it is a
  property of the material, not of a run.** It lives in the IR's front matter,
  which `job:revise` re-reads. A revision that quietly became a worksheet would
  be `001`'s revision mechanism undoing `012`'s rule.

- **Q: Where does `kind` live for a multi-part unit (FR-1009)?** → **A: On the
  part, not on the job.** A unit of three documents can be a study text, a
  worksheet and an exam, and putting one kind on the job would force the
  strictest rule onto all three or the loosest onto the exam. Both are wrong and
  the second is dangerous.

- **Q: What happens to material already in a vault, which carries
  `kind: 'worksheet'` written unconditionally by `job:create`?** → **A: It stays
  a worksheet and is not re-asked.** It was adapted as one, the report says so,
  and retroactively relabelling finished work would make the record disagree with
  the document. New material is asked; old material keeps what it was treated as.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She says what it is, once, before anything else (Priority: P1)

Bringing material, she says what it is: **una ficha o unos ejercicios, un examen o
una prueba, apuntes o un texto para estudiar, una hoja de problemas.** One choice,
before the model sees anything.

**Why this priority**: It is the input the exam rule needs, and no amount of
downstream cleverness recovers it.

**Independent Test**: Ingest the same document twice, once as a worksheet and once
as an exam. The prompts differ, and the exam one carries the assessment rule.

**Acceptance Scenarios**:

1. **Given** material of any source, **When** she brings it, **Then** she is asked
   what it is and there is **no default** — the same reasoning as the scope
   question: inferring is the failure.
2. **Given** she says it is an exam, **When** the adaptation runs, **Then** the
   hard rule about assessments is in the prompt and the report says the material
   was treated as an assessment.
3. **Given** the model finds assessment-shaped blocks in something she called a
   worksheet, **When** the report is built, **Then** it says so rather than
   silently applying either rule.

---

### User Story 2 - A recipe's scope actually means something (Priority: P1)

A recipe declaring `scope: [assessment]` is offered where there are assessment
blocks and not otherwise.

**Why this priority**: The field exists, is populated across the corpus, and is
read by nothing. Either it filters or it should be deleted — a declared constraint
that does nothing is worse than no constraint, because it reads as one.

**Acceptance Scenarios**:

1. **Given** a document with no `.assessment` blocks, **When** recipes are
   selected, **Then** a recipe scoped only to assessments is not selected.
2. **Given** a recipe with no scope, **When** recipes are selected, **Then** it
   applies as it does today — an absent scope means "anywhere".
3. **Given** the material kind and the block classes disagree — an exam whose
   blocks parsed as exercises — **Then** the kind wins for rule selection and the
   disagreement is reported.

---

### User Story 3 - One unit of work, several documents (Priority: P2)

A unit is a text **and** a problem sheet **and** the exam at the end. She brings
them together and they are adapted as one job, keeping their identity.

**Why this priority**: Real, and second to the exam distinction — which is a
correctness matter where this is a convenience one. Today a mixed drop is refused
outright, which is honest and narrow.

**Acceptance Scenarios**:

1. **Given** several documents, **When** she brings them, **Then** she says what
   each one is and they are ingested into one job as separate parts.
2. **Given** parts of different kinds, **When** the adaptation runs, **Then** the
   exam part is governed by the assessment rule and the text part is not.
3. **Given** several photos of one document, **When** she brings them, **Then**
   they are pages of one part — unchanged from today, and not confused with parts.

---

### Edge Cases

- **A worksheet that ends in an assessed section.** One document, two kinds. The
  block classes carry it; the material kind is the default and not a ceiling.
- **"Apuntes" that are really a textbook chapter.** Study material has no
  exercises to preserve and a different failure mode: over-summarising until the
  curricular content is gone. `007` FR-516's completeness check is what catches it.
- **A problem sheet in maths.** Numbers are content. Changing a quantity to make
  it "easier" changes what is being practised, and this is where Principle III is
  breached most easily and least visibly.
- **She says worksheet and it is plainly an exam.** Reported, never overridden:
  she may be adapting last year's exam as practice, which is a worksheet.
- **A unit where one part is a photo and another is a DOCX.** Today refused. Under
  US3 they are two parts of one job.

## Requirements *(mandatory)*

- **FR-1001**: Material MUST carry a kind: `worksheet`, `exam`, `study`,
  `problems`. It MUST be asked and MUST NOT be inferred or defaulted.
- **FR-1002**: `kind` MUST reach the adaptation prompt, and an `exam` MUST bring
  the assessment rule with it.
- **FR-1003**: `job:create` MUST stop writing `kind: 'worksheet'` unconditionally.
- **FR-1004**: `recipe.scope` MUST filter selection: a recipe is offered only where
  the document contains a block class it declares. An absent scope means anywhere.
- **FR-1005**: A disagreement between the stated kind and the block classes found
  MUST be reported to the teacher and MUST NOT silently change either.
- **FR-1006**: For `exam` and for `.assessment` blocks, only presentation may
  change (`001` FR-011). The report MUST say the material was treated as an
  assessment.
- **FR-1007**: For `problems`, quantities and the operations they exercise MUST NOT
  be altered. Changing a number is changing what is practised.
- **FR-1008**: For `study`, the completeness check MUST apply with no relaxation:
  summarising away curricular content is the failure mode of this kind.
- **FR-1009**: A job MAY contain several parts, each with its own kind and its own
  source, adapted under the rule for its kind.
- **FR-1010**: Several images MUST remain pages of one part, never separate parts.
- **FR-1011**: The interface MUST stop calling everything «una ficha».

## Success Criteria *(mandatory)*

- **SC-1001**: Over the fixture set, an exam adapted as an exam changes no
  question's demand — judged by a teacher, and it is the criterion that matters.
- **SC-1002**: A recipe scoped to assessments is never selected for a document with
  no assessment blocks.
- **SC-1003**: A teacher reading the first screen can tell that exams are
  supported, without being told.
- **SC-1004**: A unit of three documents is adapted in one pass, each part under
  its own rule.

## Assumptions

- Four kinds is enough. A fifth is a corpus question, not a code one, so the list
  should live where the recipes do.
- The kind is a property of a **part**, not of a job, from the start — retrofitting
  that later would touch every screen.
- `.assessment` block classes keep working as they do. The kind is an additional
  signal, not a replacement.
