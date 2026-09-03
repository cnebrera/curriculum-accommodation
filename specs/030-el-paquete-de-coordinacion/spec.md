# Feature Specification: El paquete de coordinación — dos docentes, dos vaults, un alumno

**Feature Branch**: `030-el-paquete-de-coordinacion`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review's two persona reviewers found, independently, that the
product calls itself «copilot para el PT y el Tutor» (`017`) while specifying no way for
the two to work on the same child in the same week — and that the obvious workaround, a
shared vault on OneDrive, is broken by design (the encrypted name map makes the other
machine's vault unreadable, and concurrent writes have no arbiter). Carlos's decisions
(P5/P7/P13):

> **Un vault = una docente, siempre.** El vault compartido queda fuera por diseño. La
> coordinación se hace con **paquetes ligeros** derivados de `004`, y la **segunda
> mirada** («que lo valide el PT antes de firmarlo yo») va por el mismo paquete.

## The shape of the answer

`004` already built the annual handover: a reviewed, name-free packet that travels from
June to September. This spec derives its weekly sibling: **a small packet about one
learner, sent between two active teachers, whose contents are reviewed and incorporated
by a human on arrival** — never merged silently (Principle VIII). Each vault keeps
exactly one writer; nothing syncs; coordination is an explicit act with a document, which
is also how schools actually coordinate.

Two uses, one mechanism:

1. **Coordination**: «esto he aprendido de él esta semana, esto le he preparado».
2. **Second look**: the tutor exports a draft sheet for the PT to review; her
   corrections come back in a packet and the sheet records that she looked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - What I learned this week, to your vault (Priority: P1)

The PT worked with Marco on Wednesday and noted «no arranca sin el primer paso hecho».
She exports a coordination packet for Marco — recent notes, recent material titles, what
changed in his profile since the last packet — and sends the file to the tutor however
their school sends files. The tutor opens it in his Rampa: he sees each item, accepts the
note into his Marco, skips what he already knew. Nothing entered his vault without his
eyes on it.

**Why this priority**: It is the weekly reality the review found unserved: same child,
two machines, same term. Without it the product's second declared user coordinates by
hallway.

**Independent Test**: Export from vault A, import into vault B; every accepted item lands
attributed to the packet, every skipped item leaves no trace, and no name appears
anywhere in the packet file.

**Acceptance Scenarios**:

1. **Given** a learner and a period, **When** a packet is exported, **Then** it contains
   notes, material references and profile changes for that learner and period — and no
   real name, hers or any child's (`006` FR-417's rule for every export).
2. **Given** a received packet, **When** imported, **Then** each item is shown for
   accept/skip individually; nothing is written without an explicit accept (Principle
   VIII, the same door as every observation).
3. **Given** an accepted item, **When** it lands in the vault, **Then** it records that
   it arrived by packet, from which role, and when — a claim from a packet is `reported`,
   not `observed` (the honest markers of P44).
4. **Given** the packet file itself, **When** inspected as text, **Then** it is readable
   Markdown a teacher could audit (the `004` packet's virtue, inherited).

---

### User Story 2 - «¿Me lo miras antes de firmarlo?» (Priority: P1)

The tutor adapted Thursday's exam for Marco but — as the corpus itself warns — «quien lo
firma se está jugando la nota de un alumno», and he wants the PT's eyes first. He exports
the draft for review. The PT opens it in her Rampa, reads the sheet with its draft mark,
writes corrections («el enunciado 3 sigue siendo doble instrucción»), and sends the
review packet back. The tutor sees her corrections beside his draft, applies what he
takes, and when he signs, the sheet records «revisada por PT» next to his signature.

**Why this priority**: It is the tutor's blocking question, found by the persona review
verbatim, and the reason a non-specialist can use this product on an exam at all.

**Independent Test**: Round-trip a draft: export for review, annotate in the second
vault, import the review; corrections display beside the draft, and the signed sheet
records the reviewer role and date.

**Acceptance Scenarios**:

1. **Given** an unsigned draft, **When** exported for review, **Then** the packet carries
   the sheet with its draft mark and its report — and still no learner name.
2. **Given** a review packet returned, **When** imported, **Then** corrections are shown
   beside the draft; applying any of them produces a new revision (`026`'s rule: turns
   make revisions), and the corrections themselves are recorded so they are not remade
   next week (`review.md`'s own warning).
3. **Given** a sheet signed after a review was imported, **When** recorded, **Then** the
   record shows signature and «revisada por <rol>» with the review's date — two facts,
   not a co-signature: the signature stays one person's (`005` FR-512).
4. **Given** a review packet for a sheet that changed since export, **When** imported,
   **Then** the mismatch is declared (the corrections were about revision N, this is
   N+1) rather than silently attached.

---

### User Story 3 - A packet about a child I don't have (Priority: P2)

The tutor receives a packet for a code his vault does not know. Rampa says so, shows
what the packet claims (no name — the sender tells him which child by voice, as with
`004`), and offers to link it to one of his learners or hold it unlinked. Linking is his
act; a wrong link is undoable before anything is accepted.

**Why this priority**: The name-free design makes this case structural, not rare. P2
because US1/US2 between teachers who share a class roster covers the common week.

**Independent Test**: Import a packet with an unknown code; confirm nothing auto-links,
the hold state exists, and linking then accepting attributes items correctly.

**Acceptance Scenarios**:

1. **Given** an unknown learner code, **When** a packet is opened, **Then** no automatic
   match is attempted — codes are opaque and names are absent by design, so matching is
   human (`004`'s edge case, now normative).
2. **Given** a held packet, **When** she links it to a learner, **Then** the link is
   shown for confirmation before any item can be accepted.

---

### Edge Cases

- **A packet that tries to instruct.** Packet content is content (Principle IX): notes
  from another teacher pass the same injection scan as any untrusted material before
  display; instruction-shaped content is flagged, and nothing in a packet executes or
  auto-applies anyway — the human door is also the security boundary.
- **Erasure.** Packets a learner appears in are part of «todo lo suyo»: exported packets
  on this machine are deleted by `003` (the P38 rule extended: the coordination packet
  joins handover/ in the deletion plan and in `verifyForgotten`'s reach). What already
  left the machine is the sender's responsibility, and the export screen says so once.
- **Stale packets.** A packet older than its learner's current school year is marked
  stale on import, like `004`'s.
- **Both teachers edit the same fact.** There is no merge: the import shows «tu perfil
  dice X, el paquete dice Y» and she chooses. Choosing is the feature.
- **A packet as a channel for the whole class.** Out: one packet, one learner. A class
  of packets is a loop of US1, and keeping the unit small keeps review honest.
- **The second look and pressure.** «Revisada por PT» is a fact, not an approval
  workflow: nothing blocks the tutor from signing without review, because making the PT
  a gate would make her a bottleneck for material she never sees. The record just says
  what happened.

## Requirements *(mandatory)*

### Functional Requirements

#### The packet

- **FR-2801**: A coordination packet MUST be exportable for exactly one learner, as a
  human-readable Markdown file, containing notes, material references, profile changes
  and (optionally) one draft sheet for review, scoped to a period.
- **FR-2802**: No packet may contain any real name — learner's, teacher's or third
  parties' (`006` FR-417 applied to this export); learners are carried by code only.
- **FR-2803**: Exported packets MUST live in the vault where exports live today, be
  listed, and fall inside the learner's erasure scope (`003`, extended per P38).

#### The human door

- **FR-2804**: Import MUST present every item for individual accept/skip; no item may be
  written to the vault without an explicit accept (Principle VIII).
- **FR-2805**: An accepted item MUST record its provenance: arrived by packet, from
  which role, when. Claims from packets are `reported`, never `observed` (P44's honest
  markers).
- **FR-2806**: Packet content MUST be treated as untrusted content (Principle IX):
  scanned before display, flagged when instruction-shaped, and never executed or
  auto-applied.
- **FR-2807**: A packet for an unknown learner code MUST NOT auto-link; linking is an
  explicit act, confirmable and reversible before any accept.

#### The second look

- **FR-2808**: An unsigned draft MUST be exportable for review with its draft mark and
  report; corrections returned MUST display beside the draft and be persistable as the
  teacher's recorded corrections (so they are not remade — `review.md`'s rule).
- **FR-2809**: Applying a returned correction MUST produce a new revision (`026`
  FR-2402's no-in-place rule).
- **FR-2810**: A sheet signed after an imported review MUST record «revisada por <rol>»
  with date, distinct from the signature; the signature remains a single person's
  (`005` FR-512). Review MUST NOT be a gate on signing.
- **FR-2811**: A review returned for a superseded revision MUST be declared as such on
  import, never silently attached to the current one.

#### What stays out

- **FR-2812**: No shared-vault mode exists: the application MUST NOT offer, and its
  documentation MUST advise against, two writers on one vault. The packet is the
  coordination channel (Carlos's «un vault = una docente, siempre»).

### Key Entities

- **Coordination packet**: learner code, period, sender role, items (notes, material
  refs, profile deltas, optional draft-for-review), creation date. Name-free by
  construction.
- **Review**: corrections attached to a specific revision of a specific sheet, sender
  role, date.
- **Provenance marker**: on every accepted item — packet, role, date, `reported`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2801**: A full round-trip (export → import → accept) between two vaults completes
  with zero real names in the packet file — checked by inspection of the bytes, over a
  seeded corpus. Invariant.
- **SC-2802**: Zero vault writes occur on import without an explicit accept —
  instrumented over the import flow. Invariant.
- **SC-2803**: The review round-trip records corrections and «revisada por» such that a
  correction made once is visible the next time the same sheet family is adapted —
  `review.md`'s «a correction not written down will be made again» measurably closed.
- **SC-2804**: A tutor and a PT complete the second-look loop on a real exam draft and
  the tutor signs with the review recorded. **Needs two teachers** — the mechanism is
  testable; whether the loop fits a school week is not answerable here.

## Assumptions

- **Transport is theirs.** Email, USB, the school platform — Rampa produces and consumes
  files and never sends anything itself (no new egress; `007` FR-511 as amended by P23
  stays true).
- **Derived from `004`, not duplicating it**: the handover packet remains the
  year-boundary instrument with its richer review flow; this packet is smaller, more
  frequent, and reuses `004`'s reviewed-import pattern. Where both could apply (June),
  the handover wins.
- **Identity of the sender is asserted, not authenticated.** The role in a packet is a
  claim; schools exchange files between people who know each other. Cryptographic
  authorship is out of scope and saying otherwise would be theatre.
- **`026` (conversation) and this spec compose**: corrections applied become revisions;
  neither spec special-cases the other.
