# Feature Specification: Modo ensayo — la primera noche no depende de una clave

**Feature Branch**: `035-modo-ensayo`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review's tutor reviewer (FLU-13): the discovery case is
urgent — «mañana tiene examen y me acabo de acordar del alumno» — and the first step of
the product is its most hostile: create a provider account, set up billing, paste an API
key. Today there is no way to even *see* what Rampa does without one. Carlos's decision
(P16):

> **Sí, modo ensayo completo**: alumno de ejemplo + material pre-adaptado embebido +
> pipeline simulado — todo el flujo sin clave y sin coste, claramente marcado como
> ensayo y separado del vault real.

## The gap

A teacher who hears about Rampa at 20:00 the night before an exam will not clear the API
key wall. She closes the app and adapts by hand — and the product never gets its second
chance. The rehearsal mode gives her the whole journey — bring material, check the
reading, review, sign, print — on embedded examples with a simulated pipeline, so the
first night is for learning the tool and the key comes after, on its own merits.

Two things it must be, absolutely: **clearly a rehearsal** at every moment (a teacher
must never mistake sample output for something adapted to her pupil), and **hermetically
separate** from anything real (nothing rehearsed may ever surface in a real record).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The whole journey, the first night (Priority: P1)

Without a provider connected, Rampa offers «probar con un ejemplo». She meets a fictional
learner — clearly labelled invented — with a filled profile she can read (her first
example of what a good profile looks like). She «brings» the sample worksheet photo,
checks the reading, watches the pre-computed adaptation arrive with its report, reviews
it, signs it, prints it. Every screen carries the ensayo mark. Cost surfaces show what a
run like this **would** cost («esto habría costado unos 3 céntimos») — the fear the cost
display exists to end, addressed before she has spent anything.

**Why this priority**: It is the entire feature: the first night becomes a guided
rehearsal instead of a wall.

**Independent Test**: On a machine with no provider and no network, complete
bring→verify→review→sign→print on the sample; confirm zero network attempts, zero cost,
and the ensayo mark on every screen and output.

**Acceptance Scenarios**:

1. **Given** no provider connected, **When** Rampa opens, **Then** the rehearsal is
   offered alongside — not instead of — connecting (`016`'s no-default rule: trying and
   connecting are both doors, neither pre-chosen).
2. **Given** the rehearsal, **When** any step runs, **Then** no network request occurs
   and nothing is charged — the pipeline is simulated from embedded material, fully
   offline.
3. **Given** any rehearsal screen or printed output, **When** seen, **Then** it is
   unmistakably marked as ensayo, and printed samples say «material de ejemplo» on the
   sheet itself — a rehearsal sheet must not be usable as if adapted for a real child.
4. **Given** cost surfaces during rehearsal, **When** shown, **Then** they present the
   would-be cost in the register of `006` FR-403, labelled as an estimate of a real run.
5. **Given** the fictional learner, **When** presented, **Then** the profile states its
   own inventedness and resembles nothing personal — a fabricated child must be
   fabricated loudly (Principle VII's honesty, applied to the sample itself).

---

### User Story 2 - The rehearsal ends cleanly (Priority: P1)

She connects her real provider — that evening or a week later. The rehearsal steps
aside: her real vault contains nothing from it, no fictional learner in her caseload, no
sample sheets in any record, no rehearsal cost in her ledger. If she wants to rehearse
again later (showing a colleague), the mode remains reachable, still marked, still
separate.

**Why this priority**: Separation is what makes the rehearsal safe to build at all.
A fictional child leaking into a real caseload is a data-integrity defect with RGPD
adjacency (a record that mixes real and invented children is a record nobody can trust).

**Independent Test**: Rehearse fully, connect a provider, inspect the vault: zero
rehearsal artefacts. Re-enter rehearsal: still functional, still marked, still separate.

**Acceptance Scenarios**:

1. **Given** a completed rehearsal, **When** the real vault is inspected, **Then** it
   contains no rehearsal artefact — learner, material, record entry, notes or cost.
2. **Given** a connected provider, **When** she looks for the rehearsal, **Then** it is
   still reachable (for training others) and everything about it remains marked and
   separate.
3. **Given** rehearsal state, **When** the app restarts mid-rehearsal, **Then** resuming
   or starting over are both fine — but nothing has touched the real vault either way.

---

### User Story 3 - The rehearsal teaches the barriers (Priority: P2)

The sample material is chosen so the rehearsal shows the product's character, not just
its mechanics: the reading-check catches something worth checking; the report explains
its decisions and cites recipes; the draft mark and the one-signature-per-sheet rule are
experienced, not described. What works offline for real — agendas and sequences
(`028`), profiles, the record — is presented as real, not simulated, so she leaves
knowing which parts never needed a key at all.

**Why this priority**: A rehearsal that only shows the happy path teaches the wrong
product. P2 because US1's mechanics are the blocker; the pedagogy of the sample is its
quality.

**Acceptance Scenarios**:

1. **Given** the sample, **When** the reading is checked, **Then** there is something
   real to notice (the sample includes an extraction imperfection to find — checking is
   the point of the screen).
2. **Given** the rehearsal's report, **When** read, **Then** it is a genuine report of
   the embedded adaptation — recipes cited, decisions explained — not lorem ipsum.
3. **Given** deterministic features (`028` materials, profile, record), **When** offered
   during rehearsal, **Then** the UI distinguishes «esto ya funciona de verdad sin
   clave» from the simulated provider steps.

---

### Edge Cases

- **Rehearsal sheets and real children.** The «material de ejemplo» mark on printed
  output is the guard; a rehearsal sheet is not adapted to anyone and must not look like
  it was.
- **The ledger.** Would-be costs are shown in the moment and recorded nowhere: the
  month's total is her real spending only (`006`'s honesty — a simulated cent in the
  ledger is a lie in both directions).
- **Redaction and names during rehearsal**: the fictional profile exercises the same
  gates (she should *see* the name-question fire once — it is the product's most
  important promise), but no real name she types in a rehearsal goes anywhere, because
  nothing goes anywhere: offline by construction.
- **Ensayo inside onboarding vs beside it**: the rehearsal is an offer, never a step —
  the teacher with her key already in hand must not be routed through fiction.
- **Updates (`034`)** do not interrupt a rehearsal; the notice waits.
- **Erasure**: rehearsal artefacts live outside the real vault, so `003`'s promises are
  untouched; discarding a rehearsal is total by construction and needs no verifier.

## Requirements *(mandatory)*

### Functional Requirements

#### The rehearsal is complete and free

- **FR-3301**: With no provider connected, the application MUST offer a rehearsal
  covering the full journey — bring, verify reading, adapt (simulated), review, sign,
  print — using embedded sample material and a fictional learner.
- **FR-3302**: The rehearsal MUST function with zero network access and zero cost; no
  step may require, attempt or wait on a connection.
- **FR-3303**: Cost surfaces during rehearsal MUST show the would-be cost of an
  equivalent real run, labelled as such, in `006` FR-403's register; nothing is written
  to the real ledger.
- **FR-3304**: The rehearsal MUST remain reachable after a provider is connected.

#### Marked and separate, absolutely

- **FR-3305**: Every rehearsal screen and every rehearsal output MUST carry an
  unmistakable ensayo mark; printed rehearsal sheets say «material de ejemplo» on the
  sheet.
- **FR-3306**: No rehearsal artefact may enter the real vault, ledger, record, caseload
  or memory — separation is structural (its own storage), not a filter.
- **FR-3307**: The fictional learner MUST declare its inventedness on its own profile
  and MUST NOT resemble a real child's data in any way that could be mistaken for one.
- **FR-3308**: Anything typed during a rehearsal stays local and dies with the
  rehearsal's discard; discarding is offered and total.

#### The rehearsal tells the truth

- **FR-3309**: The simulated steps MUST be presented as simulated; features that
  genuinely work offline (`028` materials, profiles, record) MUST be presented as real —
  the rehearsal never claims more, and never less, than the product.
- **FR-3310**: The sample's reading-check MUST contain something to find, and the
  sample's report MUST be a real report of the embedded adaptation, recipes cited.
- **FR-3311**: The rehearsal exercises the same visible barriers as real use — draft
  mark, one signature per sheet, the name question — so what she learns is the product's
  character (Principle VII experienced, not narrated).

### Key Entities

- **Rehearsal store**: where the fictional learner, sample jobs and rehearsal state
  live — structurally apart from the vault.
- **Sample set**: fictional profile, sample source photo/document, pre-computed
  adaptation and report, would-be costs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3301**: On a machine with no provider and networking disabled, a first-time user
  completes the full journey — timed under 15 minutes to a printed, signed sample.
  (`006` SC-401's 30-minute promise, rehearsed at half.)
- **SC-3302**: Zero network requests during rehearsal — instrumented, invariant.
- **SC-3303**: After rehearsal + connect + real use, the real vault and ledger contain
  zero rehearsal artefacts — byte-level inspection over the vault, invariant.
- **SC-3304**: 100% of rehearsal screens and outputs carry the ensayo mark — checked
  over the rehearsal's screen inventory, and on printed output.
- **SC-3305**: A teacher who rehearsed can, next morning, do the real flow without help.
  **Needs a teacher** — transfer is the feature's purpose and not answerable here.

## Assumptions

- **One sample set at launch** — a single well-chosen worksheet and fictional learner;
  more samples (an exam, a `028` agenda walkthrough) grow from use.
- **The sample content is authored and reviewed like corpus** (P28: en español; reviewed
  before shipping) — it is the first material a teacher ever sees from this product.
- **The simulated adaptation is pre-computed at authoring time**, not generated at build
  by a model — determinism and quality control over the one adaptation everyone will see.
- **Ensayo does not simulate failure modes** (provider errors, cost warnings) in v1 —
  teaching the happy path plus the barriers is the scope; a troubleshooting rehearsal is
  future.
- **Where the offer lives follows onboarding's current shape** (`009`/`016`) and moves
  with `020` when it lands; the spec fixes the offer's existence, not its pixel.
