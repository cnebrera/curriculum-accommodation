# Feature Specification: Handover — what the teacher knows travels with the learner

**Feature Branch**: `004-handover`

**Created**: 2026-08-27

**Status**: Draft

**Input**: A learner changes year, teacher or school. The official adaptation
document travels. The practical knowledge — what actually works with this child —
does not, and is rebuilt from scratch every September.

Extends `003-memory`, whose export was specified as a utility. This spec treats
handover as the feature it actually is.

## Why this is not a file export

The official file says *significant adaptation in Language*. It does not say
*she starts unprompted if the first item is already worked*, or *checkboxes read
to her as extra tasks*, or *nothing with a clock*.

That second kind of knowledge takes a term to acquire and is discarded annually.
The cost is paid by the learner, in a first term spent being discovered again.

The hard part is not moving files. It is moving them **without the receiving
teacher believing them more than they should**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send what I learned (Priority: P1)

In June a teacher produces a handover packet for a learner: profile, what works,
what to avoid, and what they would say over coffee — every claim dated and marked
as observed, inferred or reported.

**Why this priority**: Without it, `003-memory` compounds only within one
teacher's year and resets. Handover is what makes memory worth accumulating.

**Independent Test**: A teacher who has used the system for a term produces a
packet another teacher can read and act on without them ever meeting.

**Acceptance Scenarios**:

1. **Given** a learner with a profile and notes, **When** the packet is produced,
   **Then** it contains the axis levels, `works`, `avoid`, response preferences,
   and a plain-language summary — with a date and an evidence marker on every
   claim.
2. **Given** claims of differing strength, **When** the packet is produced,
   **Then** each is marked `observed` (seen repeatedly), `inferred` (deduced, not
   directly seen) or `reported` (said by family or another professional).
3. **Given** journal entries about recipes, **When** the packet is produced,
   **Then** they are excluded. They are corpus scope, not this learner's.
4. **Given** a packet, **When** the sending teacher reviews it, **Then** they can
   remove any item before it leaves, and nothing is sent without that review.

---

### User Story 2 - Receive it without being anchored by it (Priority: P1)

In September the receiving teacher loads the packet. It arrives as **hypotheses
to confirm**, not as settled fact, and the system keeps track of which have been
confirmed in this classroom.

**Why this priority**: Equal P1, and it is the safety requirement. A packet
believed wholesale is worse than no packet: the new teacher stops observing, and
a child is held inside last year's description of them. Children change; some
change precisely because the adaptation worked.

**Independent Test**: After loading a packet, every imported item is marked
unconfirmed, and the system can say which items this teacher has since confirmed,
disconfirmed, or not yet tested.

**Acceptance Scenarios**:

1. **Given** an imported packet, **When** it is loaded, **Then** every item is
   marked `unconfirmed` with its origin and date, and none is treated as
   established.
2. **Given** unconfirmed items, **When** adaptation runs, **Then** they are used
   but the report says they are unconfirmed and inherited.
3. **Given** an item the receiving teacher contradicts, **When** they say so,
   **Then** it is marked `disconfirmed` with the date, and **not deleted** — a
   support that stopped working is information about the learner.
4. **Given** items still unconfirmed after a configurable period, **When**
   `/rampa-memory` runs, **Then** it lists them and asks whether they still hold.
5. **Given** a packet older than one academic year, **When** it is loaded,
   **Then** it is marked stale and the receiving teacher is told to treat it as
   history rather than as a profile.

---

### User Story 3 - The school stays in the loop (Priority: P2)

Handover accompanies the school's own transfer process; it does not replace it or
run around it.

**Why this priority**: Real but institutional. It decides whether a school can
adopt this at all, and it is where the legal basis lives.

**Acceptance Scenarios**:

1. **Given** a packet, **When** it is produced, **Then** it states that it
   supplements the learner's official file and does not replace it.
2. **Given** a pseudonymised packet, **When** it is handed over, **Then**
   re-identification is performed by a person at the school, outside the system,
   and the packet itself never carries the mapping.
3. **Given** an official adaptation document, **When** it exists, **Then** the
   packet references it rather than restating it, so the two cannot diverge.

### Edge Cases

- **Learner moves to a school without Rampa** — the packet must be readable as
  plain prose by someone with no tooling. This is a hard requirement, not a
  courtesy: most receiving teachers will not have it.
- **Packet contradicts the official document** — the official document wins;
  flag the divergence for a human rather than resolving it.
- **Two senders** (a PT and a tutor both hold notes) — merge is not automatic;
  conflicts are listed for a human.
- **Learner returns to a previous teacher** — the packet reconciles with the
  existing profile instead of overwriting it.
- **Sending teacher never reviewed the packet** — it does not send.
- **Receiving teacher wants to start clean** — supported and recorded. Refusing
  an inheritance is a legitimate professional decision.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-301**: The system MUST produce a handover packet containing profile, notes,
  a plain-language summary and a reference to the official adaptation document.
- **FR-302**: Every claim MUST carry a date and an evidence marker: `observed`,
  `inferred` or `reported`.
- **FR-303**: Axis levels MUST carry `last_confirmed`.
- **FR-304**: The packet MUST exclude corpus-scope journal entries and anything
  the sending teacher removes in review.
- **FR-305**: The packet MUST NOT send without the sending teacher's review.
- **FR-306**: The packet MUST be readable as prose without any tooling.
- **FR-307**: On import, every item MUST be marked `unconfirmed` with origin and
  date.
- **FR-308**: Adaptation MUST report when it relied on an unconfirmed inherited
  item.
- **FR-309**: A disconfirmed item MUST be retained with its history, never
  deleted.
- **FR-310**: `/rampa-memory` MUST surface items unconfirmed past a configurable
  period.
- **FR-311**: A packet older than one academic year MUST be marked stale on load.
- **FR-312**: The packet MUST carry no re-identifying mapping. Re-identification
  is a human act at the school.
- **FR-313**: The packet MUST state that it supplements and does not replace the
  official file.
- **FR-314**: The receiving teacher MUST be able to decline the inheritance, and
  that decision MUST be recorded.

### Key Entities

- **Handover packet** — a dated, reviewed, human-readable snapshot of what one
  teacher learned about one learner.
- **Evidence marker** — how strongly a claim is held: observed, inferred,
  reported.
- **Confirmation state** — per item, in the receiving context: unconfirmed,
  confirmed, disconfirmed, with dates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-301**: A receiving teacher produces usable adapted material in week one of
  the new year, rather than after a term of discovery. This is the whole point.
- **SC-302**: 100% of imported items carry an evidence marker and a confirmation
  state.
- **SC-303**: Zero packets sent without sender review.
- **SC-304**: A receiving teacher with no tooling can read the packet and act on
  it — verified by giving one to a teacher who has never seen the project.
- **SC-305**: Within the first term, the receiving teacher has confirmed or
  disconfirmed most inherited items rather than leaving them untested.
- **SC-306**: No packet contains re-identifying data, verified by inspection.

## Dependencies

This feature is not buildable before two backlog items, and they are the reason
they were marked serious:

- **G2, axis calibration.** A packet is only meaningful if `COG:3` means the same
  thing to sender and receiver. Handover is the exact case that fails without
  anchored, behaviour-based descriptors. **Blocking.**
- **G1, retention and erasure.** Once data travels between people, retention stops
  being hygiene. A learner leaving must be erasable at both ends, and the packet
  needs a lifetime. **Blocking.**

Also depends on `003-memory` for the underlying notes and export machinery.

## Assumptions

- Handover accompanies the school's existing transfer process. Building a transport
  channel is out of scope: the packet is a file, moved however the school already
  moves such things.
- Between schools, the packet travels with the official file, on the school's
  legal basis, not on this project's.
- The packet is prose first and structured data second. Optimising for the
  receiving teacher who has the tooling would be optimising for the minority.
- Anti-anchoring is a design requirement, not a disclaimer. A packet that is
  believed wholesale has failed even if every claim in it was true last year.
