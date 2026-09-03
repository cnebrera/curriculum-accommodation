# Feature Specification: Material de estructura — agendas, secuencias e historias sociales

**Feature Branch**: `028-material-de-estructura`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review's PT reviewer (2026-09-03): with a new TEA learner, the
first thing a PT builds is not an adapted worksheet — it is the day's visual schedule,
the step sequence of a routine, and often a social story for a concrete situation. Rampa
has the whole infrastructure (local pictogram set, deterministic render, the profile) and
no door this material fits through. Carlos's decision (P4):

> **Sí, entra con su propia spec** — agendas visuales, secuencias de pasos e historias
> sociales, con su flujo de entrada propio.

## The gap

Rampa's two doors both assume curriculum: *adaptar* starts from a source document,
*componer* starts from learning objectives. A visual schedule is neither — there is no
document, and «hacer la fila» is not an objective with verifiable exercises. So the
week-one material of the support classroom — the material that gets rebuilt every time a
routine changes — is made today with scissors, laminator and a pictogram website, by the
same teacher who has the pictogram set already downloaded inside Rampa.

Three kinds, one family: **material whose content is structure** — what happens, in what
order, shown in pictures the child already knows.

| Kind | What it is | Where the model is |
|---|---|---|
| **Agenda visual** | the day/session as an ordered strip of moments | nowhere — she picks, code renders |
| **Secuencia de pasos** | one routine broken into steps (lavarse las manos, cambio de aula) | nowhere — she picks, code renders |
| **Historia social** | a short first-person story preparing a concrete situation | writes the draft text; she reviews and signs |

The split follows the constitution: the first two are deterministic end to end
(Principle II — no model call at all), and only the story touches a model, entering the
same draft-review-sign cycle as everything else (Principle VII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The day on a strip (Priority: P1)

Lucía starts Monday. Her PT opens her in Rampa, picks «agenda visual», chooses the
moments of her morning from the pictogram set — asamblea, mesa de trabajo, patio,
comedor — orders them, and prints. Five minutes, no provider, no cost. The strip uses
the drawings Lucía's vocabulary already fixed (`024`), photocopies legibly, and carries
the set's attribution — and nothing about Lucía.

**Why this priority**: It is the single most-made piece of TEA support material, and it
is pure assembly of things Rampa already has.

**Independent Test**: Build an agenda offline; confirm it renders with the learner's
chosen drawings, prints in black and white legibly, carries attribution, and contains no
fact about the child.

**Acceptance Scenarios**:

1. **Given** a learner and the downloaded set, **When** the teacher assembles an agenda,
   **Then** it is produced without any provider call and at zero cost.
2. **Given** the learner's vocabulary fixes a drawing for a word, **When** that word's
   moment appears, **Then** her chosen drawing is used — the `024` precedence, same
   rungs, same code path.
3. **Given** the printed strip, **When** photocopied in black and white, **Then** every
   moment is still readable (`010` FR-812's rule), and the sheet carries the set's real
   attribution (P40's rule: derived from the set, never hardcoded).
4. **Given** any structure material, **When** rendered, **Then** it contains no name,
   code, school or other fact about the learner (`011` FR-910; an agenda travels in a
   backpack).

---

### User Story 2 - A routine in steps (Priority: P1)

«Lavarse las manos» in five steps, each a pictogram with a short label, numbered, in
order. She saves it to the learner's material so it prints again next term unchanged —
and it appears in the record like anything else made for him (`014`).

**Why this priority**: Same construction as US1 with one addition — reuse. Routines are
rebuilt constantly; a saved sequence is the difference between a tool and a toy.

**Independent Test**: Build, save, close, reopen, reprint: identical output. Record shows
the entry.

**Acceptance Scenarios**:

1. **Given** a saved sequence, **When** reprinted any later day, **Then** the output is
   identical — deterministic render, no model at render time (`022` FR-2004's rule).
2. **Given** the record, **When** structure material exists for a learner, **Then** it is
   listed with kind, date and reprint access, and erasure (`003`) removes it with
   everything else.

---

### User Story 3 - A social story that is a draft (Priority: P2)

The class is going to the fire station Thursday. The PT asks for a social story: what
will happen, in first person, short sentences, with pictograms over the key words. The
model writes the draft; the sheet announces itself as a draft; she reviews — this is a
text about *her* pupil's Thursday, and only she knows if «habrá mucho ruido» helps or
scares — edits if needed, signs, prints.

**Why this priority**: P2 because it needs a provider and the review cycle; the two P1
kinds work offline the first afternoon.

**Independent Test**: Compose a story from a situation description; confirm draft mark,
sign-off requirement, pictogram support via the learner's vocabulary, cost shown, and no
learner facts leaked into the prompt beyond what redaction allows.

**Acceptance Scenarios**:

1. **Given** a situation described by the teacher, **When** the story is drafted,
   **Then** it carries the draft mark removable only by sign-off, and its cost is shown
   (`006` FR-403 terms).
2. **Given** the learner's profile, **When** the story is drafted, **Then** the request
   passes the redaction chokepoint (`007`) like any job — the situation text is hers,
   and names in it are caught by the same gate as notes (P17's hardened rule).
3. **Given** the story text, **When** pictogram support is applied, **Then** it uses the
   same word→pictogram machinery as adapted material (`018`/`024`, with `P20`'s
   lemmatisation when it lands) — one mechanism, not a second one.

---

### Edge Cases

- **A moment with no pictogram in the set.** The slot shows the word without a drawing
  and says so — never a wrong drawing (the `018` exactly-one-or-none rule, applied to
  assembly).
- **The set is not downloaded.** The builder is reachable and explains, pointing at
  Configuración ▸ Pictogramas (`025`'s pointer pattern) — not hidden, not broken.
- **Photos instead of pictograms.** Real practice uses photos of the actual classroom.
  Out of scope for v1 (assumption below), and the refusal must be honest if she tries.
- **A story the model salts with invented specifics** («verás un camión rojo con
  escalera de 30 metros»). The draft mark and her review are the barrier; the report
  reminds her the story is invented detail until she edits it — this is Principle VII's
  whole argument in miniature.
- **An agenda as a learner's main communication system.** Rampa makes materials; it is
  not an AAC device and must not present itself as one. The hint text keeps the claim
  honest.
- **Erasure and handover.** Structure material is the learner's material: erased by
  `003`, listed by `014`, and its existence (not content) may travel in `004`'s packet
  like other material.

## Requirements *(mandatory)*

### Functional Requirements

#### A third door, deterministic where possible

- **FR-2601**: The application MUST offer structure material — agenda visual, secuencia
  de pasos, historia social — as its own entry, not routed through adaptar or componer.
- **FR-2602**: Agendas and sequences MUST be produced without any model call and at zero
  cost: the teacher selects and orders; code renders.
- **FR-2603**: Rendering MUST be deterministic: the same saved material produces the
  same output on any later day.
- **FR-2604**: Structure material MUST be saved to the learner's material in the vault,
  appear in the record (`014`), be erasable (`003`), and be reprintable from the record.

#### The drawings are his

- **FR-2605**: Pictogram resolution MUST use the same precedence as adapted material
  (`018` FR-1612 / `024` FR-2215: override ▸ vocabulary ▸ set ▸ nothing) — one
  mechanism, no fork.
- **FR-2606**: A word with no unambiguous pictogram MUST render as the word with the gap
  stated, never as a guessed drawing.
- **FR-2607**: Every rendering MUST carry the set's real attribution (P40's derived
  attribution) and MUST survive black-and-white photocopying (`010` FR-812).
- **FR-2608**: No structure material may contain a learner's name, code, school, or any
  other fact about him (`011` FR-910). An agenda names moments, not children.

#### The story is a draft like everything else

- **FR-2609**: A historia social MUST be drafted through the standard provider path —
  redaction chokepoint, cost recording, draft mark removable only by sign-off — and MUST
  NOT be printable unsigned except with the draft mark visible.
- **FR-2610**: The situation description the teacher writes is her instruction; any
  document or text she attaches is content (Principle IX), delimited as such.
- **FR-2611**: The story's report MUST say that concrete details are the model's
  invention until edited — the anti-anchoring rule (`004`) applied to fiction.

#### Honest edges

- **FR-2612**: With no pictogram set downloaded, the structure door MUST remain
  reachable and explain what is missing with one pointer to where to get it (`025`
  FR-2303's pattern).
- **FR-2613**: The feature MUST NOT present itself as a communication system (SAAC); its
  language claims materials, not therapy.

### Key Entities

- **Structure material**: kind (agenda | secuencia | historia), ordered items, learner,
  created/signed like other material. Lives in the learner's material directory.
- **Item**: a moment or step — a word/label plus its resolved pictogram (or declared
  gap); for stories, the text plus its supported words.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2601**: A teacher builds and prints a five-moment agenda in under 5 minutes,
  offline, at zero cost — timed from opening the learner.
- **SC-2602**: A saved sequence reprinted 30 days later is byte-identical in content.
  Invariant.
- **SC-2603**: Across all structure material, zero renderings contain a learner fact and
  100% carry the correct set attribution. Invariant over a generated corpus.
- **SC-2604**: Every drawing on every strip is either the learner's chosen/overridden
  pictogram or a declared gap — zero guessed drawings. Invariant.
- **SC-2605**: A PT with a TEA learner says the week-one set (agenda + two sequences +
  one story) replaced her scissors-and-laminator afternoon. **Needs a teacher** — the
  time claim is measurable, «replaced» is not answerable here.

## Assumptions

- **Photos of the child's real environment are out of scope for v1.** They are the next
  step of the same feature (a personal image joins the set), but they open privacy and
  storage questions (`003`'s scope, consent) that deserve their own decision rather than
  a rider here.
- **Templates start minimal**: vertical/horizontal strip for agendas, numbered rows for
  sequences, text-with-supports for stories. Layout variety grows from use, like
  `material-kinds.md` grew.
- **Where the door lives follows `020`**: inside the learner when US2 lands (a third
  option beside adaptar/componer under «Preparar»); until then, reachable from the
  learner's sections. The spec does not bet on navigation.
- **The story path requires a connected provider; the other two do not.** The ensayo
  mode (`035`) can therefore demonstrate agendas and sequences fully offline.
- **AAC/communication boards remain out** (edge case above): registered as a deliberate
  non-goal, revisitable as its own spec with AL expertise in the room.
