# Feature Specification: Compose — generate material from learning objectives

**Feature Branch**: `002-compose`

**Created**: 2026-08-27

**Status**: Draft

**Input**: "I need her to learn these three things — make me material she can work
with." A second entry point into the existing pipeline, per
[ADR 0003](../../docs/decisions/0003-two-entry-points-one-pipeline.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a worksheet from objectives (Priority: P1)

A teacher has no usable source material — the textbook page is unusable for this
learner, or there is no page. They state what the learner must learn and what
they must be able to do at the end. They get a worksheet built for that learner
from the start, plus a report of what it teaches and where each claim comes from.

**Why this priority**: It is the half of the teacher's real workload that adapting
does not touch. It also removes the project's highest-risk step — recovering a
scanned textbook's structure — so it can be validated earlier than Phase 0's
ingest path.

**Independent Test**: Give the harness three objectives, an approved source, and
the `A3` type-profile. It succeeds if the teacher would use the result after
correcting content only.

**Acceptance Scenarios**:

1. **Given** stated objectives and an approved anchor source, **When**
   `/rampa-compose` runs, **Then** an IR is produced with `kind: generated`, every
   block carrying `data-objective`, and the anchor recorded in front matter.
2. **Given** objectives with **no** anchor source, **When** `/rampa-compose` runs,
   **Then** it stops and asks for one. It MUST NOT generate curricular content
   from the model's own knowledge alone.
3. **Given** a generated IR, **When** `/rampa-adapt` and `/rampa-render` run,
   **Then** they behave exactly as for ingested material, with no compose-specific
   handling.
4. **Given** generated material, **When** the review checklist is produced,
   **Then** it leads with content verification, and states that review effort is
   higher than for adapted material.

---

### User Story 2 - Know where every claim came from (Priority: P1)

The teacher can see, for each generated block, which objective it serves and
which part of the anchor it rests on.

**Why this priority**: Equal to P1 because it is the only defence against
curricular hallucination. With no source document there is nothing else holding
the content to the truth.

**Independent Test**: A teacher who did not write the objectives can trace every
factual claim in the output back to the anchor or identify it as unsupported.

**Acceptance Scenarios**:

1. **Given** a generated block, **When** the report is produced, **Then** it names
   the objective and the anchor passage or section the content rests on.
2. **Given** content the agent could not anchor, **When** the report is produced,
   **Then** it is listed as unsupported in a section placed first, and marked in
   the material itself.

---

### User Story 3 - Reuse the learner's existing scaffolding (Priority: P3)

Generated material follows the same conventions as the learner's adapted
material: same layout, same response format, same vocabulary already introduced.

**Why this priority**: Real but not blocking. A learner who meets a different
format every time spends effort on the format instead of the content.

**Acceptance Scenarios**:

1. **Given** a learner with prior jobs, **When** composing, **Then** the same
   presentation conventions are applied and previously introduced terms are
   reused rather than reintroduced.

### Edge Cases

- **No anchor offered** — stop and ask. Never generate curriculum unanchored.
- **Anchor contradicts the objective** — flag it; do not silently pick one.
- **An objective is not achievable at this learner's level** — this is the
  significant-adaptation line. Flag and stop, per Principle "escalate, never
  decide".
- **Anchor is copyrighted material** — it is read from `material/`, never copied
  into the repository, exactly as in ingest.
- **Objectives given as official curriculum criteria** — treat the criterion text
  as the objective and preserve its wording in the report.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: The system MUST accept learning objectives as free text or as
  official assessment criteria.
- **FR-102**: The system MUST require an anchor — a source supplied or explicitly
  approved by the teacher — before generating curricular content, and MUST refuse
  to proceed without one.
- **FR-103**: Generated IR MUST carry `kind: generated` and record the anchor in
  front matter.
- **FR-104**: Every generated block MUST carry `data-objective`. Blocks that are
  scaffolding rather than content MUST be marked `.scaffold`.
- **FR-105**: The system MUST list unanchored claims in the report, placed first,
  and mark them in the material.
- **FR-106**: The downstream pipeline (`/rampa-adapt`, `/rampa-render`,
  `/rampa-review`) MUST require no compose-specific changes.
- **FR-107**: The review checklist MUST gain a content-verification section for
  generated material, and MUST state that review effort is higher than for
  adapted material.
- **FR-108**: The system MUST stop and escalate when an objective is not
  achievable at the learner's level rather than quietly generating easier
  objectives.

### Key Entities

- **Objective** — what the learner must know or be able to do. Free text or an
  official criterion.
- **Anchor** — the source of truth the generated content rests on: teacher's
  notes, a textbook contents page, official criteria, an approved reference.
- **Generated IR** — same format as ingested IR, `kind: generated`, blocks keyed
  to objectives instead of source blocks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: Zero unflagged factual errors in generated material across the
  validation set. This is a hard gate: one unflagged error fails the feature.
- **SC-102**: Every factual claim traces to the anchor or is listed as unsupported.
- **SC-103**: A teacher produces usable material for three objectives in under 15
  minutes including verification.
- **SC-104**: Generated material matches the presentation conventions of that
  learner's previously adapted material.

## Assumptions

- The teacher supplies or approves an anchor. Composing from the model's own
  knowledge is explicitly out of scope — it is the failure mode this feature is
  designed around.
- Review burden is **higher** than for adaptation, and the flow says so. The
  intuition runs the other way and the wording must correct it.
- Text-based subjects only, as in Phase 0.
- Compose is specified now and built after Phase 0 validates the adapt path.
