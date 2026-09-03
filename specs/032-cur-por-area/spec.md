# Feature Specification: CUR por área — el desfase vive donde vive el desfase

**Feature Branch**: `032-cur-por-area`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review (CONS-13): the constitution justifies Principle V with
«one learner needs different things in different subjects», and the normativa conditions
an ACNS on curricular gap «en esa área» — but the profile holds a single set of axis
levels per learner. The textbook case — at level in Lengua, two courses behind in
Matemáticas — cannot be represented: one CUR either over-blocks everything or reflects
nothing. Carlos's decision (P30):

> **Solo CUR gana dimensión de área** («Mates: 2, Lengua: 0», con un valor general como
> fallback). Los demás ejes siguen siendo por alumno.

## The gap

CUR is the axis that carries consequences: it feeds the level composed material targets,
the normative conversation about ACNS, and (until P12's fix) the significant-adaptation
stop. Getting it wrong per-area means composing Lengua material below a child who reads
fine, or Mates material above a child who cannot follow it — for the most common profile
in the support classroom.

The boundary Carlos drew is principled: the *functional* axes (DEC, ATE, COG, REG, PER,
LIN) describe barriers that travel with the child between subjects; **CUR describes a
relationship between the child and one subject's curriculum**, so it is the one axis
where a single number is a category error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marco, bien en Lengua, dos cursos en Mates (Priority: P1)

The teacher opens Marco's profile and sets CUR by area: Matemáticas 2, Lengua 0. From
then on, composed Mates material targets the level his gap implies, Lengua material
targets his course level, and nothing about Lengua is treated as delayed. The general
CUR remains available for subjects she has not detailed.

**Why this priority**: It is the unrepresentable child of the review, and roughly half
the support caseload.

**Independent Test**: One profile, two areas with different CUR; compose material for
each area and confirm each targets its own level, with the general value used only for
areas not named.

**Acceptance Scenarios**:

1. **Given** CUR set per area, **When** material is composed for a named area, **Then**
   the level derives from that area's CUR via the course→corpus rule (`002` FR-122/129
   as reconciled by P32), not from any other area's value.
2. **Given** an area with no per-area value, **When** material is composed for it,
   **Then** the general CUR applies — fallback, never zero-by-omission.
3. **Given** a profile with only the old single CUR, **When** read, **Then** it behaves
   exactly as today: the single value is the general value. No migration of meaning.
4. **Given** the profile screen, **When** CUR is shown, **Then** per-area values are
   visible at a glance and editable without ceremony — this is the axis a tutor updates
   after an evaluation.

---

### User Story 2 - The normative conversation speaks per area (Priority: P2)

The guide's ACNS orientation, and the drafts of `017`/`029`, condition on gap *in that
area* — as the normativa actually does. Marco's ACNS conversation about Mates cites his
Mates gap; nothing suggests an ACNS for Lengua.

**Why this priority**: It is what the normativa says the datum is for. P2 because US1's
material-level correctness is the daily value; the normative phrasing rides on it.

**Independent Test**: Draft normative documents for two areas of one learner with
different CURs; each cites its own area's gap.

**Acceptance Scenarios**:

1. **Given** per-area CUR, **When** a normative draft concerns one area, **Then** the
   gap it cites is that area's.
2. **Given** the request-keyed stop of P12, **When** adaptation is requested, **Then**
   the stop still keys on what the request would change — per-area CUR informs level,
   it MUST NOT resurrect a profile-keyed block.

---

### Edge Cases

- **Area vocabulary.** Areas are the subjects the vault already knows (`012`'s kinds and
  the record's best-effort subject) — free-named but suggested from what exists, so
  «Mates» and «Matemáticas» do not become two areas by accident. Normalisation is
  suggestion, never silent merging.
- **Specialists' subjects** (inglés, música, EF): areas like any other; a per-area CUR
  for inglés is how the review's specialist gap (tutor-gaps, low) gets its first honest
  datum.
- **Enrichment (P9)** is future: values stay 0–3 downward for now; the spec's shape must
  not preclude an upward direction later (a note, not a requirement).
- **Handover and coordination packets** (`004`, `030`): per-area CUR travels as the
  profile deltas they already carry; a receiver on an older app version sees the general
  value (vault schema versioning, P50, is the guard).
- **Observation quality**: a per-area value is still an observation with the profile's
  honesty rules — nothing is invented for areas nobody assessed (`011`'s no-guessing).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-3001**: The profile MUST support CUR per area, alongside one general CUR used as
  fallback for areas without their own value.
- **FR-3002**: All other axes remain single-valued per learner. This spec MUST NOT
  introduce per-area machinery for them.
- **FR-3003**: Level derivation for composed material MUST use the target area's CUR
  (fallback: general), through the course→corpus reconciliation of P32.
- **FR-3004**: Normative surfaces (guide conversation, drafts under `017`/`029`) MUST
  cite the gap of the area under discussion, never another area's or the general one
  when a per-area value exists.
- **FR-3005**: Existing profiles with a single CUR MUST keep their exact behaviour, the
  single value acting as general; reading requires no migration, and writing a per-area
  value upgrades the profile under the vault schema version (P50).
- **FR-3006**: The significant-adaptation stop remains request-keyed (P12); no code path
  may re-key it on any CUR value, per-area or general.
- **FR-3007**: Area names MUST be suggested from the subjects the vault already knows;
  creating a new area is allowed and explicit, and near-duplicates are flagged, never
  merged silently.
- **FR-3008**: Per-area CUR MUST travel in handover and coordination packets as profile
  data, name-free as always.

### Key Entities

- **CUR entry**: general value plus zero or more (area, value) pairs. An absent pair
  means fallback, not zero.
- **Area**: a subject name as the vault knows subjects; no new taxonomy is introduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3001**: For a two-area profile with different CURs, composed material for each
  area targets its own level — verified over a composed corpus, invariant.
- **SC-3002**: Zero behaviour change for unmodified existing profiles across the full
  offline suite — the fallback is provably the old semantics.
- **SC-3003**: No normative draft cites a gap from the wrong area — invariant over
  drafted fixtures for multi-area profiles.
- **SC-3004**: A teacher records «bien en Lengua, dos cursos en Mates» in under a minute
  from the profile screen. **Needs a teacher** for the phrasing; the timing is
  measurable.

## Assumptions

- **Depends on vault schema versioning (P50 / COLA 1.17)** — this is the first stored
  format change that motivated it.
- **P12's request-keyed stop ships first or together**: per-area CUR must never become a
  finer-grained version of the profile-keyed block the review condemned.
- **Notes and works/avoid stay learner-level.** The review noted they also lack area;
  that is real and separate — folding it in here would triple the surface for a datum
  nobody asked to split yet.
- **Enrichment/upward CUR (P9)** is a future spec; this one leaves the door open and
  nothing more.
