# Feature Specification: Memory — the system learns from the teacher

**Feature Branch**: `003-memory`

**Created**: 2026-08-27

**Status**: Draft

**Input**: A teacher's corrections must survive the session, at learner level and
in general, in files they own and cannot lose. Per
[ADR 0004](../../docs/decisions/0004-memory-is-human-routed.md); format contract
in [`docs/memory.md`](../../docs/memory.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A correction is never made twice (Priority: P1)

A teacher rejects an adaptation during review. Next week, on different material
for the same learner, the system does not repeat it.

**Why this priority**: Without this the only expertise in the loop is discarded
on every run, and the teacher's cost per worksheet never falls. The time saving
the project promises is a curve, not a constant, and this is what bends it.

**Independent Test**: Run two jobs for the same profile a week apart, rejecting
one adaptation in the first. The second must not reproduce it.

**Acceptance Scenarios**:

1. **Given** a rejected adaptation in review, **When** the teacher routes it as
   learner-scope, **Then** the profile is updated and a dated note is appended.
2. **Given** an updated profile, **When** a later job runs for that learner,
   **Then** the rejected adaptation is not produced, and the report says which
   memory suppressed it.
3. **Given** a correction the teacher routes as practice-scope, **When** any later
   job runs for **any** learner, **Then** the convention is applied.

---

### User Story 2 - The teacher decides what is general (Priority: P1)

At the point of correction the teacher is asked one question: is this about this
learner, about how you work, or about the recipe itself?

**Why this priority**: Equal P1, and it is a safety requirement rather than a
quality one. An agent guessing this wrong routes learner-specific information
into shared material.

**Independent Test**: Every captured item has a scope, set by a human, recorded
in the file.

**Acceptance Scenarios**:

1. **Given** a correction, **When** it is captured, **Then** the agent asks for
   the scope and MUST NOT infer it.
2. **Given** a corpus-scope item, **When** it is prepared for upstream, **Then**
   it is rewritten as a general statement with learner and material specifics
   removed, and the teacher sees the rewritten version before it goes anywhere.

---

### User Story 3 - Memory stays readable and does not rot (Priority: P2)

Every few weeks the teacher runs `/rampa-memory`. Repeated notes get promoted,
superseded ones archived, and a recipe patch is proposed where the same problem
keeps appearing.

**Why this priority**: An append-only log nobody consolidates becomes an
unreadable log nobody reads. Deferred behind P1 because the loop delivers value
before consolidation is needed — but not for long.

**Acceptance Scenarios**:

1. **Given** a note appearing three times, **When** consolidation runs, **Then**
   promotion into the profile or house style is proposed with the evidence.
2. **Given** entries already promoted, **When** consolidation runs, **Then**
   archiving is proposed.
3. **Given** `house.md` past roughly two pages, **When** consolidation runs,
   **Then** it says so — it has stopped being a style guide.
4. **When** consolidation runs, **Then** every promotion is confirmed by a human.
   Nothing is promoted silently.

---

### User Story 4 - The teacher never loses it, and can hand it over (Priority: P2)

Memory is plain files in two folders. A learner changing school takes their
profile and notes with them.

**Acceptance Scenarios**:

1. **Given** a repository update (`git pull`), **When** it completes, **Then**
   `profiles/` and `memory/` are untouched.
2. **Given** `/rampa-memory export`, **When** the full variant is requested,
   **Then** it contains profile, notes and overlay for handover.
3. **Given** the shareable variant, **When** it is produced, **Then** it contains
   no learner-scope material at all, enforced by the export rather than by the
   teacher remembering.

### Edge Cases

- **Ambiguous correction** — the agent asks. It never defaults the scope.
- **Learner note contradicts house style** — learner wins; the conflict is
  recorded so consolidation can surface it.
- **Overlay contradicts a hard rule** — flag and ask. Never silently obey, never
  silently refuse.
- **Journal grows large** — never loaded wholesale; entries reach a run only via
  `memory/index.md` for the recipes actually selected.
- **Index missing or stale** — regenerate before use. A stale index silently
  drops memory, which is worse than no memory because the teacher believes it is
  working.
- **Two learners' notes in one journal entry** — rejected at capture. One scope
  per entry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: `/rampa-review` MUST ask for the scope of every correction and MUST
  NOT infer it.
- **FR-202**: Learner-scope corrections MUST update `profiles/<CODE>.yaml` and
  append a dated entry to `profiles/<CODE>.notes.md`.
- **FR-203**: Practice-scope corrections MUST update `memory/house.md`.
- **FR-204**: Corpus-scope corrections MUST create a journal entry tagged with the
  recipes concerned.
- **FR-205**: Journal entries MUST record the pattern, never the source passage.
- **FR-206**: `memory/index.md` MUST be generated deterministically from journal
  front matter, with no model involved.
- **FR-207**: A run MUST load only the journal entries whose recipes intersect the
  recipes it selected.
- **FR-208**: `memory/house.md` and the subject learner's profile and notes MUST
  always load; the journal MUST NOT load wholesale.
- **FR-209**: `profiles/<CODE>.adaptations.md`, when present, MUST be read before
  recipe selection and MUST take precedence over the corpus.
- **FR-210**: The system MUST report which memory item suppressed or altered a
  decision, so memory is as traceable as recipes.
- **FR-211**: `/rampa-memory` MUST propose promotions and archiving, and MUST NOT
  apply any of them without human confirmation.
- **FR-212**: Corpus-scope items MUST pass a de-identification rewrite, visible to
  the confirming human, before leaving the machine.
- **FR-213**: `/rampa-memory export` MUST produce full and shareable variants, the
  shareable one containing no learner-scope material.
- **FR-214**: `memory/` MUST be git-ignored except `README.md`, enforced by the
  commit hook.

### Key Entities

- **Journal entry** — one observation: date, recipes, scope, status, what
  happened, what should happen, proposed change.
- **Learner note** — dated narrative attached to a profile; the profile YAML is
  the state, the note is the history.
- **House style** — the teacher's or school's conventions. A style guide, bounded.
- **Adaptation overlay** — instructions from the teaching team, taking precedence
  over the corpus.
- **Memory index** — derived map from recipe id to journal entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: Zero repeated corrections across a four-week validation period —
  no adaptation rejected once is produced again for that learner.
- **SC-202**: 100% of captured items carry a human-set scope.
- **SC-203**: Zero learner-scope content in any shareable export, verified by
  inspection.
- **SC-204**: Teacher review time per worksheet decreases measurably between week
  one and week four for the same learner. This is the feature's real thesis.
- **SC-205**: Context loaded from memory stays bounded as the journal grows —
  a run's memory load does not scale with total journal size.
- **SC-206**: A teacher can state where their memory lives and how to back it up,
  unprompted, after one session.

## Assumptions

- The teacher runs `/rampa-memory` occasionally. Consolidation is not automatic:
  automatic promotion without confirmation would violate Principle VIII.
- Practice memory is local by default. A school wanting to share it across a
  department does so in their own fork; that path is documented, not built.
- Corpus contributions travel as pull requests, reviewed like any other recipe
  change. There is no automatic upstream channel, by design.
- Memory improves consistency and stops repetition. It is not a learning system
  and makes no claim to model the learner.
