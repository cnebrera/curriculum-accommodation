# Feature Specification: One worksheet, several learners

**Feature Branch**: `005-group`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify`, then `/speckit-plan`

**Input**: Backlog **G3**, open since 2026-08-27 and rated **High**:

> «The common case in a real classroom is one worksheet and three learners with
> different profiles. Today that means running the pipeline three times from
> scratch, re-verifying the same ingest three times.»

Its data-model foundation landed on 2026-08-28 as T092b. Three years of
specification later, the flow on top of it has still not been written, and `016`
FR-1406 now assumes it exists.

## Why this has waited too long

Everything about this project points at it and nothing does it.

**Principle IV is called "one extraction, N outputs".** The vault layout says so:
`material/<job>/ir.md` is the extraction and `material/<job>/<code>/adapted.md` is
one adaptation per learner. That layout was corrected in August precisely because
the flat version overwrote learner A's sheet when adapting for learner B.

**And the interface has never offered it.** `job:adapt(jobId, learner)` takes one
learner. `AdaptScreen` has one select. A teacher with three learners and one
worksheet photographs it, verifies the extraction, adapts, and then does the whole
thing again. Twice.

The cost is not only her evening. It is **three ingests of the same page**, three
times the provider bill for reading a photograph, and — worse — three separate
verifications of the same text, which means three chances to confirm a different
reading of the same worksheet and three sheets that no longer come from the same
source.

This is the fourth instance of this project's signature defect and the oldest:
built, correct, unreachable.

## What this is not

**Not one sheet for a mixed group.** That is backlog **G17**, recorded as a
deliberate non-goal. Designing a single activity to the intersection of four
profiles is judgement-heavy work where a tool's mistakes are least visible, and no
learner's file justifies the result. This feature makes **N separate sheets** from
one reading.

**Not a class roster feature.** Choosing three learners for one worksheet is not
declaring a group that persists. If groups turn out to be worth having, they are
`015`'s business and they need their own argument.

## Clarifications

### Session 2026-08-30

Answered from the constitution and from specifications already written, rather than
asked — each records where the answer came from, so a reviewer can disagree with the
source rather than with my judgement.

- **Q: Are the learners adapted concurrently or one after another?** → **A: One after
  another.** It was an assumption in this spec; promoted to FR-518. Concurrency
  against a rate-limited provider (`009`) turns one failure into three, and the
  saving this feature exists for is the *ingest*, which happens once either way.

- **Q: What does she see while a batch of three runs?** → **A: Progress names the
  learner and the position — «2 de 3, Mateo».** Determined by FR-507: a failure must
  name the learner it belongs to, and a progress stream that cannot say who it is on
  cannot produce that message. Added as FR-519.

- **Q: She corrects the extraction after one learner has already been adapted. What
  happens to that sheet?** → **A: The correction is allowed, the affected sheets are
  marked stale by name, and nothing is re-run without her.** Blocking the correction
  would make a real misreading permanent; re-adapting automatically spends her money
  on a decision she did not make. Marking and telling is what this project does
  everywhere else. Added as FR-520 and an edge case.

- **Q: Is there a maximum number of learners in one batch?** → **A: No cap; the cost
  gate is the control.** FR-515 already makes the unusual-cost gate consider the
  batch. A hard cap would be a number nobody can justify, and twelve is already the
  realistic ceiling of an aula de apoyo (SC-505).

- **Q: Does she choose the learners before or after verifying the extraction?** →
  **A: One learner first, the rest before the run** — `016` was clarified to
  **learner → work → material**, so a learner is named at the start and the others
  are added once the extraction is verified and she can see what she is adapting.
  This is the spec that has to make that work: `016` FR-1412 says a second learner
  must not feel like a correction, and FR-503 here is what makes it free.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She reads the worksheet once (Priority: P1)

She photographs Monday's worksheet, verifies the extraction once, chooses Lucía,
Mateo and Iván, and gets three sheets.

**Why this priority**: It is the feature. Everything else here is about what
happens when part of it fails.

**Independent Test**: One ingest, three learners, three adapted documents on disk,
and exactly one call to the provider for reading the page.

**Acceptance Scenarios**:

1. **Given** one job and three learners, **When** she runs it, **Then** the source
   is read once and adapted three times.
2. **Given** that run, **Then** exactly one ingest is billed, and she is shown the
   cost as one figure with the number of sheets it covers.
3. **Given** three learners with different profiles, **Then** each sheet reflects
   that learner's own barriers, notes and overlay — a shared extraction changes
   nothing about how personal the adaptation is.
4. **Given** the run, **Then** each learner's record (`014`) gains its own entry,
   all pointing at the same source.
5. **Given** she later adds a fourth learner to the same worksheet, **Then** the
   stored extraction is reused and no provider call is made for reading it
   (`016` FR-1409).

---

### User Story 2 - One of the three fails, and the other two are hers (Priority: P1)

The adaptation for Mateo comes back incomplete. Lucía's and Iván's are fine.

**Why this priority**: This is the requirement that makes the feature safe, and it
is the one a naive implementation gets wrong — a loop that throws on the second
learner and leaves the first one's sheet half-written.

**Independent Test**: Force a failure on the second of three; the first is intact
and signed-off-able, the third still runs, and the failure is named.

**Acceptance Scenarios**:

1. **Given** a failure adapting for one learner, **Then** the others complete.
2. **Given** that failure, **Then** she is told which learner failed and why, in
   her language, and the other two are not described as failed.
3. **Given** the failure, **Then** she can retry that learner alone without
   re-reading the source and without touching the two that worked.
4. **Given** a partial run, **Then** no learner has a half-written document. A
   sheet exists completely or not at all.
5. **Given** the completeness check (`007` FR-516/517) failing for one learner,
   **Then** that is a per-learner verdict, never a verdict on the batch.

---

### User Story 3 - She reviews and signs three sheets (Priority: P1)

Three documents, three signatures, and nothing signs itself because its neighbour
was signed.

**Why this priority**: Principle VII, and the place a batch feature most tempts a
shortcut. «Firmar todo» is one click and one lie: she has not read three
worksheets.

**Acceptance Scenarios**:

1. **Given** three adapted sheets, **Then** each carries its own draft mark and
   requires its own sign-off.
2. **Given** two signed and one not, **Then** the unsigned one still announces
   itself as a draft, wherever it is rendered.
3. **Given** the review screen, **Then** there is **no** control that signs more
   than one document at a time.
4. **Given** she is reviewing three, **Then** she can see which learner she is
   looking at without ambiguity — the same worksheet three times over is exactly
   the situation where a teacher signs the wrong one.
5. **Given** a correction she makes while reviewing Lucía's, **Then** `003`'s scope
   question applies as it does today, and a `learner`-scoped note goes to Lucía and
   to nobody else.

---

### User Story 4 - The report says what differed and why (Priority: P2)

One extraction, three sets of decisions. She wants to see, quickly, where the three
diverged.

**Why this priority**: It is the thing a batch can give her that three separate
runs cannot, and it is a genuine teaching aid — «why did Mateo's lose the picture
and Lucía's keep it?» is a good question with a recorded answer.

**Acceptance Scenarios**:

1. **Given** a batch, **Then** each sheet keeps its own full report (`001` FR-009),
   unchanged.
2. **Given** a batch, **Then** she can additionally see which recipes applied to
   which learners, and the axis that justified each.
3. **Given** that comparison, **Then** it never presents the learners as columns to
   be compared with each other (`015` FR-1310) — the subject of the comparison is
   the **material**, not the children.

---

### Edge Cases

- **One of the three has no profile worth adapting to** — all axes at 0. The sheet
  is still produced and the report says nothing was needed, rather than failing.
- **Two learners with identical profiles.** Two documents, not one shared. They are
  two children and the record is per child; deduplicating output would make
  erasure of one destroy the other's sheet.
- **She adds a learner months later.** The extraction is reused; the *recipes* may
  have changed version since. The provenance records the version used, per sheet
  (`001` FR-008, G4).
- **An `exam`** (`012`). Adapting one exam for three learners is three access
  arrangements, never three different exams; the constraint is per sheet.
- **A learner erased between adaptation and review.** The sheet's learner directory
  goes with them (`014` FR-1209); the batch must not resurrect it.
- **Twelve learners.** A PT's aula de apoyo can hold that many. Cost, time, and
  whether she is told before it runs rather than after.
- **She cancels halfway.** What is on disk must be complete-or-absent per learner.
- **She corrects the extraction after two of three are adapted.** Allowed; those two
  are marked stale by name and she chooses whether to re-run them (FR-520). A stale
  sheet is not deleted — it is the sheet she has already photocopied.

## Requirements *(mandatory)*

### One extraction

- **FR-501**: A job MUST accept one or more learners.
- **FR-502**: The source MUST be ingested and verified exactly once per job,
  however many learners it serves (Principle IV).
- **FR-503**: Adding a learner to an existing job MUST reuse the stored extraction
  and MUST NOT call a provider to read the source again.
- **FR-504**: The verification a teacher performs (`008`) MUST be a property of the
  job, not of a learner. Three verifications of one page are three chances to
  disagree with oneself.

### Running the batch

- **FR-518**: Learners MUST be adapted sequentially. Concurrency against a
  rate-limited provider turns one failure into several, and the saving this feature
  exists for is the ingest, which happens once regardless.
- **FR-519**: Progress MUST name the learner and the position in the batch. A
  progress stream that cannot say who it is on cannot produce FR-507's message.
- **FR-520**: Correcting the extraction after adaptations exist MUST be allowed,
  MUST mark the affected sheets stale **by learner name**, and MUST NOT re-run
  anything on its own. Blocking the correction makes a real misreading permanent;
  re-adapting automatically spends her money on a decision she did not make.

### N adaptations

- **FR-505**: Each learner MUST get their own adaptation, driven by their own
  profile, notes and overlay. A shared extraction MUST NOT produce shared decisions.
- **FR-506**: A failure for one learner MUST NOT prevent or invalidate another's.
- **FR-507**: A failure MUST name the learner it belongs to, and MUST NOT be
  reported as a failure of the batch.
- **FR-508**: A learner's adaptation MUST be retryable alone.
- **FR-509**: An adapted document MUST exist completely or not at all. No
  half-written sheet may remain after a failure or a cancellation.
- **FR-510**: Every per-learner check — completeness, provenance, unaccounted
  blocks — MUST produce a per-learner verdict.

### Signing

- **FR-511**: Each sheet MUST carry its own draft mark and require its own sign-off
  (Principle VII).
- **FR-512**: There MUST NOT be a control that signs more than one document at
  once. A batch signature is a claim she read three worksheets.
- **FR-513**: The review interface MUST make the learner unambiguous on every
  screen where a sheet is shown.

### Cost and consent

- **FR-514**: The estimate MUST be for the whole batch, stated as one figure with
  the number of sheets it covers, before it runs (`006` US4-3).
- **FR-515**: The unusual-cost gate MUST consider the batch, not one sheet. Three
  ordinary sheets can be an unusual bill.

### The record

- **FR-516**: Each learner's record (`014`) MUST gain its own entry, all resolving
  to the same source.
- **FR-517**: Erasing one learner MUST remove their sheet and leave the others' and
  the shared source intact (`014` FR-1210).

## Success Criteria *(mandatory)*

- **SC-501**: One worksheet, three learners: exactly one provider call to read the
  page, and three adapted documents.
- **SC-502**: The provider cost of adapting for three learners is measurably lower
  than three separate runs, and the difference is the ingest.
- **SC-503**: With a forced failure on the second learner, the first and third
  sheets are complete and signable, and the failure names the learner.
- **SC-504**: No sequence of interactions signs two documents with one action.
- **SC-505**: Twelve learners in one job completes, and she was told the cost
  before it started.
- **SC-506**: A teacher who has done this once says she would not go back to
  running it three times. Judged by a person, once — and it is the only criterion
  that says whether the feature was worth writing.

## Assumptions

- The vault layout is already correct and this feature changes none of it. `jobDir`,
  `jobLearnerDir` and `outputDir` were designed for exactly this in T092b.
- Learner selection is per job and does not create a persistent group.
- The batch runs learners sequentially unless measurement says otherwise.
  Concurrency against a rate-limited provider is a way to turn one failure into
  three, and `009` already knows about rate limits.

## Dependencies

- `014` for the record each sheet lands in — **not blocking**: this feature can
  ship writing files where they already go, and gain the record when `014` does.
- `016` FR-1406 assumes this feature. Whichever ships second inherits the other's
  interface.
- `012` for per-sheet material kind.
