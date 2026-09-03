# Feature Specification: El segundo eje de frescura — cambiar un dibujo caduca las hojas que lo llevan

**Feature Branch**: `031-el-segundo-eje-de-frescura`

**Created**: 2026-09-03

**Status**: Draft

**Input**: `024` FR-2218 requires that changing a pictogram choice mark the sheets made
with the previous drawing as stale. It was never implemented — freshness today compares
only the reading fingerprint of `ir.md`, which a vocabulary change does not touch — and
the shipped «fix» was to change the UI text to say the opposite of the spec. BACKLOG G35
records why the real fix needs a spec: «005's data model has exactly one freshness axis
today, and adding a second silently would be the fourteenth thing two places disagree
about». Carlos's decision in the adversarial review (P34):

> **Construir la detección de verdad.** El dato word→id ya está en data-picto; es
> computable. Mientras llega, FR-2218 se anota como aplazado en 024.

## The gap

For a child who reads by pictogram, the drawing **is** the reading. When the teacher
changes which drawing means «casa», every printed sheet carrying the old drawing is now
inconsistent with what the child is being taught — and Rampa currently says nothing. The
record can already say «this sheet was made from a reading that has since been
corrected» (`005` FR-520); it cannot say «this sheet was made with a drawing you have
since changed». Same defect, second cause, no second axis.

The design constraint G35 states is the whole spec: **the second axis must be a first
citizen of the one freshness model, not a parallel mechanism** — two derivations of «is
this sheet current?» are two derivations that can disagree.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She changes a drawing and the record tells the truth (Priority: P1)

In October the teacher changes the drawing for «casa». She opens Marco's record: the
September sheets that printed the old «casa» are marked desactualizada, each saying
why — «hecha con un dibujo que ya no usas: casa» — alongside (not replacing) any
reading-staleness they might also have. Sheets that never used «casa» are untouched.

**Why this priority**: It is the requirement, unimplemented since `024`, and the app
currently states the opposite. One story is the feature.

**Independent Test**: Make sheets with pictograms, change one choice, and confirm exactly
the sheets carrying that word's old drawing become stale, with the reason naming the word
— and no others.

**Acceptance Scenarios**:

1. **Given** sheets whose support layer used drawing A for a word, **When** the
   vocabulary (or a learner override) changes that word to drawing B, **Then** those
   sheets — and only those — are marked stale with the word named.
2. **Given** a sheet stale for both causes (reading corrected AND drawing changed),
   **When** shown, **Then** both reasons appear; one axis never masks the other.
3. **Given** a stale-by-drawing sheet, **When** re-rendered/re-made, **Then** the new
   revision uses the current drawing and is fresh; the old revision remains on disk
   unchanged (`005`'s revision rules).
4. **Given** a signed sheet, **When** it becomes stale by drawing, **Then** the signature
   stands — staleness is information about currency, never an un-signing (`005` FR-511's
   rule: the signature belongs to the sheet it was given to).

---

### User Story 2 - The change itself warns her (Priority: P2)

At the moment she changes a choice (in ChooseWord, MyVocabulary or a learner override),
Rampa tells her what it implies: «N hojas usan el dibujo anterior; quedarán marcadas como
desactualizadas en el expediente». The false sentence the review caught — the UI claiming
sheets do not change and nothing more can be said — is replaced by the true one.

**Why this priority**: The warning converts an invisible consequence into a decision she
makes knowingly. P2 because US1's record truth is the substance; this is its echo at the
point of change.

**Independent Test**: Change a choice affecting known sheets; the count shown matches the
sheets actually marked.

**Acceptance Scenarios**:

1. **Given** a pending choice change, **When** confirmed, **Then** the affected-sheet
   count shown equals the sheets subsequently marked stale. A mismatch is a defect, not
   an estimate.
2. **Given** the UI texts that today claim sheets cannot be tracked, **When** this ships,
   **Then** they say what actually happens — and `024` FR-2218's deferral note is closed
   with a pointer here.

---

### Edge Cases

- **Un-choosing (word returns to ambiguous/none).** Sheets that used the old drawing are
  stale for the same reason: what the child is taught changed.
- **Changing back (A→B→A).** Sheets made under A are current again or stale — decided by
  comparing the sheet's recorded drawing against the *current* resolution, not by
  counting changes. Derivation, not event log (`014`'s nothing-is-stored rule).
- **A learner override changes but the global vocabulary does not** — only that
  learner's sheets are affected; and vice versa, a global change does not touch sheets
  whose learner override pinned the drawing.
- **Sheets from before this feature** carry no word→id data beyond what `data-picto`
  already recorded; where the datum exists, the axis works retroactively — where it does
  not, the sheet is honestly «no puedo saberlo» rather than assumed fresh.
- **Erasure and handover**: staleness is derived, so it neither adds files to delete nor
  travels in packets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-2901**: Freshness MUST become one model with two axes — reading and pictogram
  choices — with staleness derived, per sheet, from comparing what the sheet recorded
  against the current state. No event log, no stored flags (`014` SC-1203's principle).
- **FR-2902**: A sheet whose support layer used a drawing that no longer matches the
  current resolution (vocabulary or that learner's override) for that word MUST show as
  stale, naming the word(s).
- **FR-2903**: Both axes MUST be independently visible when both apply; neither masks
  the other.
- **FR-2904**: Staleness MUST NOT alter signatures, revisions or files: it is derived
  information shown in the record and verification surfaces, nothing more.
- **FR-2905**: At the moment of changing a choice, the teacher MUST be told how many
  sheets will become stale, and the count MUST equal what the record then shows.
- **FR-2906**: A sheet lacking the recorded drawing data MUST be reported as unknowable
  for this axis, never assumed fresh.
- **FR-2907**: `005`'s data model documentation MUST be amended (dated, FR-1401-style)
  to describe the two-axis model; `024` FR-2218's deferral note closes with a pointer
  here; the UI texts claiming the opposite are corrected.

### Key Entities

- **Sheet's pictogram record**: per sheet, word → drawing used (exists today as
  `data-picto`; this spec makes it load-bearing and therefore versioned by the vault
  schema of P50).
- **Freshness**: one derived answer per sheet with up to two reasons.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2901**: Over a seeded vault, changing one word's drawing marks exactly the sheets
  that used it — precision and recall both 1.0 against the seed's ground truth.
  Invariant, not sample.
- **SC-2902**: The pre-change count and the post-change record agree in 100% of cases.
- **SC-2903**: No file in the vault changes as a result of staleness computation —
  verified byte-wise over the vault before/after. Invariant.
- **SC-2904**: `024` FR-2218 closes as satisfied-by-`031` and no UI text contradicts the
  behaviour — the G35 lie is unmakeable because text and behaviour now share one source.

## Assumptions

- **The recorded drawing datum (`data-picto`) is sufficient** for sheets made since
  `024`; older sheets take the honest-unknown path (FR-2906) rather than a migration.
- **Vault schema versioning (P50 / COLA 1.17) lands first** — this spec makes a stored
  format load-bearing and wants the version marker under it.
- **Re-making a stale sheet is the existing re-adapt/re-render path**; this spec adds no
  new generation machinery.
- **The conversation (`026`) does not special-case staleness**: iterating a stale sheet
  warns (its own edge case) using this model's answer.
