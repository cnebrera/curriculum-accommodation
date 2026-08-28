# Feature Specification: Phase 0 — adapt one text-subject worksheet end to end

**Feature Branch**: `001-phase-0-worksheet`

**Created**: 2026-08-27

**Status**: Draft

**Input**: Phase 0 of the project vision (`docs/ESPECIFICACION-V0.md`). Scope is
deliberately the smallest slice that answers the only question that matters right
now: does a real special-education teacher find the output usable with minor
edits?

> **Note added 2026-08-28 ([ADR 0006](../../docs/decisions/0006-one-vehicle.md)).**
> This spec describes the pipeline in terms of `/rampa-*` commands. Those commands
> no longer exist: the application is the only vehicle, and the judgement layer
> they carried is now `instructions/`, read at run time. **The requirements below
> remain valid** — they specify behaviour, not a vehicle. Read a command name as
> the step it names.

## Dependencies and scope boundary

This spec was written before `002-compose` and `003-memory`. It is **not**
superseded, but two boundaries must be read explicitly:

- **`/rampa-review` also captures memory.** That behaviour is specified in
  `003-memory` (FR-201…FR-204), not here. Phase 0 can be validated without it;
  the time-saving curve it produces cannot.
- **`/rampa-compose` is a second entry point.** Out of scope here. Phase 0
  validates the adapt path only.
- **Per-learner overlays** (`profiles/<CODE>/adaptations.md`) are specified in
  `003-memory`. A Phase 0 learner may not have one.

Where this spec and 002/003 disagree about `/rampa-review`, 003 wins — it is the
later decision.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adapt a worksheet for a learner with high cognitive load (Priority: P1)

A special-education teacher has a two-page worksheet from a Natural Sciences unit
and a learner who cannot work a dense page. They open the repository with their
agent, describe the learner, hand over the worksheet, and get back a set of
adapted sheets plus a report of what changed and why. They read the report, fix
two things, and take it to class.

**Why this priority**: This is the whole hypothesis. If this journey does not
save a teacher time and produce material they would actually hand to a child,
nothing else in the roadmap is worth building.

**Independent Test**: Give the harness an openly licensed worksheet and the
`A3` type-profile. The journey succeeds if a teacher can go from source file to
classroom-ready material in one session without editing any file by hand except
to correct content.

**Acceptance Scenarios**:

1. **Given** a digital PDF worksheet and no existing profile, **When** the teacher
   runs `/rampa-profile` and answers questions about classroom behaviour, **Then**
   a profile is written to `profiles/` containing axis levels and qualitative
   fields, and no name, diagnosis or identity data.
2. **Given** a source worksheet, **When** the teacher runs `/rampa-ingest`,
   **Then** an IR file is produced with every block classified, original exercise
   numbering preserved, every figure assigned a role, and anything unreadable
   flagged in place rather than guessed.
3. **Given** an IR with `extraction.verified: false`, **When** the teacher runs
   `/rampa-adapt`, **Then** the run refuses and directs them to verify first.
4. **Given** a verified IR and a profile with `COG: 3`, **When** the teacher runs
   `/rampa-adapt`, **Then** exercises are split one per sheet with original
   numbering preserved, and every changed block carries `data-from`,
   `data-recipe` and `data-axis`.
5. **Given** an adapted IR, **When** the teacher runs `/rampa-render`, **Then**
   HTML and PDF are produced carrying a visible pending-review mark.
6. **Given** rendered output, **When** the teacher completes `/rampa-review` and
   signs off, **Then** the files are re-rendered without the draft mark.

---

### User Story 2 - Understand what changed without re-reading the material (Priority: P1)

The teacher opens `report.md` and sees roughly fifteen decisions grouped by what
was done and why, not a diff of twelve pages.

**Why this priority**: Equal to P1 because it is what makes the time saving real.
An adaptation the teacher must fully re-read has saved them nothing, and the
review is where errors that matter get caught.

**Independent Test**: A teacher who has not seen the source material can read the
report and correctly state what was changed and on what grounds.

**Acceptance Scenarios**:

1. **Given** an adaptation that split, reworded and scaffolded blocks, **When**
   the report is generated, **Then** changes are grouped by decision with the
   recipe and axis named for each.
2. **Given** an adaptation that dropped a block or could not describe an essential
   figure, **When** the report is generated, **Then** those appear in a "what I
   did not do" section, placed first.

---

### User Story 3 - Refuse to cross the significant-adaptation line (Priority: P2)

The teacher asks for something that would change what the learner is expected to
learn. The agent stops, explains what would have to change, and does not proceed.

**Why this priority**: Lower than P1 only because it is a guard rather than the
main journey. It is non-negotiable in behaviour: a tool that silently modifies
curriculum is worse than no tool.

**Independent Test**: Run the pipeline with a profile carrying `CUR: 2` and an
exam-type source. The run must stop with an explanation and produce no adapted
assessment.

**Acceptance Scenarios**:

1. **Given** a request that implies changing objectives or assessment criteria,
   **When** `/rampa-adapt` runs, **Then** it stops, states what would change, and
   makes no such change.
2. **Given** an `.assessment` block, **When** adaptation runs, **Then** only
   presentation, access route and response route change; assessed items are
   neither removed nor reduced.

### Edge Cases

- **Scanned source with no text layer** — `extract.sh` exits with a clear message
  directing to vision-based ingest. It must not emit garbage as if it were text.
- **Essential figure that cannot be described** — the render is blocked for that
  exercise rather than emitting a task the learner cannot answer.
- **Profile axis is `null`** — recipes keyed on it stay off. A null is never
  treated as a zero.
- **Recipe conflict** — resolved per `AGENTS.md`, and the resolution is recorded
  in the report.
- **`works` contradicts a selected recipe** — the documented support wins; the
  recipe is dropped and noted.
- **No optional tools installed** — HTML is still produced; each missing tool
  removes exactly one modality and says so.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST produce a learner profile from a conversation about
  classroom behaviour, containing no name, surname, school, birth date, identity
  number or verbatim clinical diagnosis.
- **FR-002**: The system MUST record an unobserved axis as `null` and MUST NOT
  default it to `0`.
- **FR-003**: The system MUST normalise source material into the IR defined in
  `docs/ir.md`, classifying every block and assigning a role to every figure.
- **FR-004**: The system MUST preserve original exercise numbering, and MUST
  record the mapping whenever numbering is extended (`4` → `4a`, `4b`).
- **FR-005**: The system MUST flag unreadable source content in place and MUST
  NOT infer its content.
- **FR-006**: The system MUST refuse to adapt while `extraction.verified` is
  `false`.
- **FR-007**: The system MUST select recipes by profile axes only, and MUST NOT
  select on diagnostic labels.
- **FR-008**: Every changed block MUST carry `data-from`, `data-recipe` and
  `data-axis`. A change that cannot carry all three MUST NOT be made.
- **FR-009**: The system MUST generate an adaptation report grouped by decision,
  leading with content dropped, figures not described, and flags raised.
- **FR-010**: The system MUST stop and escalate when a request implies changing
  learning objectives or assessment criteria.
- **FR-011**: For `.assessment` blocks the system MUST change only presentation,
  access route and response route.
- **FR-012**: Rendered output MUST carry a visible pending-review mark until
  human sign-off is recorded, and only `/rampa-review` MUST be able to remove it.
- **FR-013**: Deterministic scripts MUST run offline with no API key and no
  network access.
- **FR-014**: Missing optional tooling MUST degrade to fewer output modalities,
  never to a failed pipeline.
- **FR-015**: The commit hook MUST block staged changes under `profiles/`,
  `material/` or `output/`.

### Key Entities

- **Learner profile** — pseudonymised description of functional barriers on ten
  axes plus qualitative fields. Lives in `profiles/`, never committed.
- **IR document** — normalised source material: front matter plus classified
  blocks with attributes. One per job.
- **Adapted IR** — the IR after recipe application, with provenance attributes on
  every changed block.
- **Recipe** — one adaptation decision, with trigger axes, scope, conflicts,
  before/after example and anti-patterns.
- **Adaptation report** — changes grouped by decision, derived from provenance
  attributes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A special-education teacher takes a two-page worksheet from source
  file to classroom-ready adapted material in under 20 minutes, including review.
- **SC-002**: The teacher accepts at least 80% of the adapted blocks without
  content changes.
- **SC-003**: Zero instances, across the validation set, of invented content, a
  substituted curricular term, or a silently dropped block.
- **SC-004**: The teacher states unprompted that the process saved them time
  compared with adapting the worksheet by hand.
- **SC-005**: Review takes under 5 minutes for a two-page worksheet, because the
  report is read rather than the material re-read.
- **SC-006**: 100% of assessment-block adaptations preserve the assessed
  criterion, verified by teacher review.

## Assumptions

- The teacher has a working AI agent with vision capability and does not need to
  supply an API key. Provider comparison is out of scope here.
- Phase 0 is scoped to **text-based subjects**. Mathematics — formula extraction
  and voicing — is a separate line of work, per `docs/ESPECIFICACION-V0.md` §12.
- Phase 0 output modalities are **HTML, PDF and the report**. Audio, braille-ready
  text and ODT are Phase 1; the IR is designed so they need no re-adaptation.
- Validation material is openly licensed or invented. No copyrighted classroom
  material enters the repository at any point.
- Validation profiles are the type-profiles in `profiles.example/`. Real profiles
  never leave the teacher's machine, so validation reports describe outcomes, not
  data.
- Spanish is the validation locale. `recipes/core/` is written to hold for other
  languages but is not yet tested against one.
- [NEEDS CLARIFICATION: which real teacher or orientation team validates Phase 0,
  and with which unit of material?] Without this, SC-001 through SC-006 cannot be
  measured and the phase cannot close.
