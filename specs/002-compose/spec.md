# Feature Specification: Compose — generate material from learning objectives

**Feature Branch**: `002-compose`

**Created**: 2026-08-27

**Status**: Clarified 2026-08-29 — specified in full, sequenced after `001`'s SC-001

**Input**: "I need her to learn these three things — make me material she can work
with." A second entry point into the existing pipeline, per
[ADR 0003](../../docs/decisions/0003-two-entry-points-one-pipeline.md).

> **Note added 2026-08-28 ([ADR 0006](../../docs/decisions/0006-one-vehicle.md)).**
> This spec describes the pipeline in terms of `/rampa-*` commands. Those commands
> no longer exist: the application is the only vehicle, and the judgement layer
> they carried is now `instructions/`, read at run time. **The requirements below
> remain valid** — they specify behaviour, not a vehicle. Read a command name as
> the step it names.

> ## Where this sits, and a correction
>
> *(2026-08-29. Carlos: "a veces no tiene nada y lo que quiere es que aprenda algo
> concreto… por ejemplo a multiplicar con llevadas.")*
>
> **He is right that this is part of the job, and I was wrong about why it could
> wait.** Yesterday I deferred this spec arguing that "composition has no anchor,
> so none of this project's structural defences apply". That was an argument about
> a specification I had not read carefully: US1 already **requires** an approved
> anchor source and refuses to generate from the model's own knowledge alone. The
> anchor is the whole design, and it was there before I claimed it was missing.
>
> What remains true is the **sequencing**: `001`'s SC-001 asks whether a teacher
> finds an adapted worksheet usable, and building the harder half on an unanswered
> question is still the wrong order. That is a smaller and more honest claim than
> the one I made.
>
> Two specs now feed this one, and both landed after it was written:
> **`011`** gives the level anchor — where multiplying with carrying sits, what
> comes before it, what a learner that age can already do — and **`012`** gives the
> kind, because generated material is a worksheet or a problem sheet and carries
> the same prohibitions.


## Clarifications

### Session 2026-08-29

- Q: Is "composing" one thing? → A: **No, and the spec had only modelled one of
  them.** *Content composition* — «un texto sobre los ecosistemas» — needs an
  anchor because the facts have to come from somewhere, and US1 already requires
  one. *Skill practice* — «multiplicar con llevadas» — is different: the content is
  generated exercises, and the risk is not factual hallucination but **arithmetic
  that is wrong and a level that is off**. Carlos's own example is the second kind
  and the spec did not have it.
- Q: What anchors skill practice, if not a source document? → A: **The education
  corpus (`011`) for the level, and a deterministically verified answer key for the
  content.** Where the domain allows checking — and arithmetic is the clearest case
  in the whole of primary education — the application computes the answers itself
  and refuses to emit an exercise it cannot verify. That is a stronger defence than
  any anchor document: code checks, the model does not get a vote.
- Q: Does generated material get a material kind (`012`)? → A: Yes, and it is asked
  the same way. A generated problem sheet is bound by `problems`' prohibition on
  changing quantities as soon as it is revised.
- Q: Sequencing? → A: **After `001` SC-001 is answered.** Not because of the anchor
  argument, which was wrong, but because validating the harder half before the
  easier one is unsound whatever the architecture says.

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

### User Story 5 - Practise a skill, with the arithmetic checked (Priority: P1)

*(Added 2026-08-29.)* The teacher says «que aprenda a multiplicar con llevadas».
There is no source document and there does not need to be: she gets a worksheet of
exercises at the right level, with an answer key the application **computed
itself** rather than asked for.

**Why this priority**: It is what Carlos described a PT actually wanting, and it is
the case with the sharpest available defence — most of primary numeracy is
checkable by code.

**Independent Test**: Ask for multiplication with carrying for a 10-year-old. Every
exercise exercises carrying, every answer is verified in code, and one seeded
wrong answer is refused before she sees it.

**Acceptance Scenarios**:

1. **Given** a skill and a learner with an age and year (`011`), **When** compose
   runs, **Then** the level comes from the education corpus and not from the
   model's sense of what a ten-year-old can do.
2. **Given** generated arithmetic, **When** the worksheet is built, **Then** the
   answers are **computed by the application**, and an exercise whose stated answer
   disagrees is refused rather than corrected — a model that got the arithmetic
   wrong got something else wrong too.
3. **Given** a skill the application cannot verify — a writing task, a
   comprehension — **When** compose runs, **Then** it says so plainly and the
   review checklist leads with content verification.
4. **Given** an exercise that does not exercise the skill — a multiplication with
   no carrying — **Then** it is rejected: «multiplicar con llevadas» is a
   constraint, not a topic.

---

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

### Added 2026-08-29

- **FR-121**: Composition MUST distinguish **content** (needs an anchor source)
  from **skill practice** (needs a level and a verifiable answer key).
- **FR-122**: For skill practice, the level MUST come from the education corpus
  (`011`), never from the model's own sense of the learner's age.
- **FR-123**: Where the domain admits deterministic checking, the application MUST
  compute the answer key itself and MUST refuse an exercise whose stated answer
  disagrees. It MUST NOT correct it silently.
- **FR-124**: An exercise that does not exercise the stated skill MUST be rejected.
- **FR-125**: Where the domain does not admit checking, the application MUST say so
  plainly, and the review checklist MUST lead with content verification.
- **FR-126**: Generated material MUST carry a material kind (`012`) and MUST be
  bound by that kind's prohibitions from the moment it is first revised.

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
