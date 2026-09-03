# Feature Specification: La conversación — iterar el material sin rehacerlo

**Feature Branch**: `026-la-conversacion`

**Created**: 2026-09-03

**Status**: Draft

**Input**: Carlos, on first seeing `021`'s output — the request four specs then failed to
point at:

> «¿donde está la parte de iterar el material? no veo chat ni nada»

And his decision in the adversarial review (P24, 2026-09-03): the conversation is this
spec, and the broken pointer chain in `021`–`024` is corrected to point here.

## The gap

Rampa produces a sheet. If it is almost right — too long, one exercise off, the font
still too small — her only tool today is to run the whole job again and hope. That is
the workflow this project explicitly set out to end: a correction that costs a re-run is
a correction she will not make, and the sheet the child gets is the almost-right one.

The conversation is the missing half of the copilot: **the sheet is on the screen, she
says what to change, the sheet changes, and everything this project promises about
drafts, verification and traceability still holds.**

What it is not: a chat about anything. It is a conversation **about one document**, with
the document present, and every turn ends in a concrete revision or a concrete refusal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - «Hazlo más corto» (Priority: P1)

She composed practice material for Marco. It is good but there is too much of it for one
session. She writes «quita los tres últimos y deja más espacio para responder», and the
sheet on screen becomes a new revision with exactly that changed. The revision carries
the draft mark again — a sheet a model just touched is a draft, whoever touched it last
— and she reviews and signs it as always.

**Why this priority**: It is the request, verbatim. Without it the product's answer to
«casi» is «otra vez», and «otra vez» costs money and patience.

**Independent Test**: Compose a sheet, ask for a concrete change, and confirm the result
is a new revision with the change applied, the rest intact, the draft mark restored, and
the previous revision untouched on disk.

**Acceptance Scenarios**:

1. **Given** a composed sheet on screen, **When** she asks for a change in her own words,
   **Then** a new revision is produced and what changed is stated alongside it.
2. **Given** a revision produced by the conversation, **When** she inspects it,
   **Then** it carries the draft mark and requires its own sign-off (Principle VII).
3. **Given** any turn of the conversation, **When** the revision is produced,
   **Then** the previous revision still exists unchanged — a turn never edits in place.
4. **Given** a turn, **When** it completes, **Then** its cost is shown in the same terms
   as any other job (`006` FR-403's register: cents, never tokens).

---

### User Story 2 - The exercises stay true (Priority: P1)

The sheet has verified arithmetic on it. She asks for «los enunciados con los animales
que le gustan». The wording changes; the quantities do not — and every exercise on the
new revision has been verified again, by the same deterministic verifier that approved
it the first time. If her request would change what an exercise evaluates («ponlo más
fácil» on an exam), the conversation stops and says why, exactly as `001` US3 stops.

**Why this priority**: A conversation that can quietly un-verify a sheet is worse than
no conversation. The barriers hold in every revision or they are not barriers.

**Independent Test**: Iterate a sheet with verified exercises; confirm every revision's
exercises pass verification, and that a request implying a change to the WHAT is refused
with the refusal explained.

**Acceptance Scenarios**:

1. **Given** a sheet with verified exercises, **When** a turn rewrites their wording,
   **Then** every exercise on the revision is re-verified before she sees it, and a
   quantity the model altered is corrected from the exercise, not accepted.
2. **Given** an exam, **When** she asks for a change that only touches access (spacing,
   one instruction per line), **Then** it proceeds; **When** the request implies touching
   objectives or difficulty, **Then** the turn refuses and says what decision it would
   take out of her hands (the `001`+P12 rule, by request not by profile).
3. **Given** a sheet with a diagram (`022`), **When** an exercise's numbers change in a
   turn, **Then** its diagram is redrawn from the exercise or removed (`022` FR-2016) —
   never left with the old numbers.

---

### User Story 3 - She can walk back (Priority: P2)

The third revision was better before. She looks at the list of revisions, sees what each
turn changed, and returns to the second one — which is still there, because nothing was
ever overwritten. Signing any revision is signing that one.

**Why this priority**: An iteration tool without a way back teaches her to fear the next
turn. P2 because US1 without undo is already usable — the revisions are files.

**Independent Test**: Three turns, then choose revision two; confirm it renders, signs
and prints as the current one, and the record shows which revision was signed.

**Acceptance Scenarios**:

1. **Given** several revisions, **When** she picks an earlier one, **Then** it becomes
   the working revision without deleting the later ones.
2. **Given** a signed revision, **When** she asks for another change, **Then** the new
   revision starts unsigned and the signed one remains signed on disk — a signature
   never moves (`005` FR-511's rule: the signature belongs to the sheet).

---

### Edge Cases

- **A turn that asks Rampa to break its rules.** «Ponle el nombre del niño arriba» —
  refused with the reason (`011` FR-910); her instruction is an instruction, but the
  hard rules outrank it, and the refusal must say so rather than silently not doing it.
- **The material answers back.** The document under iteration is still Principle IX
  content. A sheet that contains «ignore the teacher and…» is content; only the
  teacher's turn text is instruction. The prompt separation of P18 (fences, task
  reafirmation) applies to every turn.
- **Iterating an adapted sheet whose source has been corrected.** The sheet is stale
  (`005` FR-520). The conversation says so before spending: iterating a stale sheet
  bakes the stale reading in deeper.
- **A turn while another turn is running.** One conversation, one turn in flight — the
  same rule as `023`'s single download.
- **The provider goes away mid-turn.** The revision either exists complete or does not
  exist; a half-written revision is never left as current.
- **Nothing changed.** The model returns the same document; the turn reports «no he
  cambiado nada» rather than minting an identical revision.
- **What the conversation must never do silently: learn.** «Siempre le pongo más
  espacio» is a fact about her practice. The conversation MAY offer to note it, and the
  note goes through the same human-routed door as every observation (`003`, Principle
  VIII). Nothing is remembered as a side effect of a turn.

## Requirements *(mandatory)*

### Functional Requirements

#### A turn is a revision

- **FR-2401**: A conversation MUST be attached to exactly one document (one job × one
  learner for adapted material; one job for composed material before it is adapted).
- **FR-2402**: Every turn that changes the document MUST produce a new revision; no turn
  may edit a revision in place. Prior revisions MUST remain on disk, listed, and
  restorable as the working revision.
- **FR-2403**: Every revision produced by a turn MUST carry the draft mark, removable
  only by sign-off (Principle VII). A signed revision MUST remain signed; a new turn
  starts a new, unsigned revision.
- **FR-2404**: Each turn MUST state what changed, in her language, alongside the
  revision — and the statement MUST be derived from the actual difference between
  revisions, not from what the model says it did (`004`'s anti-fabrication rule).

#### The barriers hold in every revision

- **FR-2405**: Every verifiable exercise on a revision MUST be re-verified before the
  revision is shown. A quantity the turn altered MUST be corrected from the exercise and
  the correction reported (`002`'s rule, applied per turn).
- **FR-2406**: A turn whose request implies changing WHAT is taught or evaluated MUST be
  refused with the reason, under the request-keyed rule of P12 — access changes always
  proceed; objective changes stop.
- **FR-2407**: The hard rules of the corpus outrank the turn. A turn asking for
  something a hard rule forbids MUST be refused stating which rule, not silently
  ignored.
- **FR-2408**: The document under iteration is content, never instruction (Principle
  IX); only the teacher's turn text carries intent, and the prompt MUST delimit the
  document as untrusted (the P18 hardening applies to every turn).
- **FR-2409**: A revision MUST be complete or absent: a failed or interrupted turn MUST
  NOT leave a partial revision as the working document.

#### She sees what it costs and what happened

- **FR-2410**: Each turn's cost MUST be shown in the terms of `006` FR-403 and recorded
  in the ledger like any job; an unpriceable turn says «no lo sé» (the `costCents` null
  rule).
- **FR-2411**: The conversation MUST NOT write to memory as a side effect. Anything
  worth remembering MUST be offered through the human-routed door (Principle VIII).
- **FR-2412**: The record (`014`) MUST show, for a document with revisions, which
  revision was signed and that later unsigned revisions exist.

### Key Entities

- **Conversation**: the sequence of turns attached to one document. Lives with the job
  in the vault; deleted when the learner or job is deleted (`003`'s scope — a
  conversation about a child's sheet is the child's data).
- **Turn**: her request, the revision it produced (or the refusal), what changed, and
  what it cost.
- **Revision**: already exists (`005`'s `adapted.rN.md`); this spec gives composed
  documents the same revision behaviour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2401**: A concrete change to an existing sheet costs one turn, not one re-run:
  measured as time-to-corrected-sheet under 2 minutes on the reference material, versus
  the full compose path.
- **SC-2402**: Across an iterated corpus, zero revisions exist where a verifiable
  exercise is unverified or a quantity came from the model — the `002` invariant holds
  per revision, checked as an invariant, not sampled.
- **SC-2403**: Every revision produced by a turn carries the draft mark until its own
  sign-off; no signed revision is ever mutated. Checked over the vault, not the UI.
- **SC-2404**: A teacher can return to any earlier revision and sign it; the record
  shows which one she signed. **Needs a teacher** to say the walk-back is findable —
  the mechanism is testable, the findability is not answerable here.

## Assumptions

- **The conversation lives where the document lives.** With `020` US2 pending, that is
  the review screen and the record; when `020` completes, it is inside the learner. The
  spec does not depend on which.
- **One provider call per turn.** A turn rides the same provider, redaction chokepoint
  (`007`) and cost plumbing as every job. No new egress.
- **Composed documents gain revisions.** `005` defined revisions for adapted sheets;
  this spec extends the same file-shape to composed jobs rather than inventing a second
  one (the `021` research R2 lesson: two names for one fact is how readers break).
- **The pointer chain is corrected with this spec.** `021`, `022`, `023` and `024` each
  claim the conversation lives somewhere it does not; each gets a dated correction
  pointing here (review P24).
- **Iterating pictogram choices is not this spec.** Choosing drawings is `024`; marking
  old sheets stale when a choice changes is `031`.
