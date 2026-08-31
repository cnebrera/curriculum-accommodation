# Feature Specification: One door — the work she is doing, not the file she has

**Feature Branch**: `016-una-puerta`

**Created**: 2026-08-30

**Status**: Planned 2026-08-31 — [plan.md](./plan.md), [tasks.md](./tasks.md). Unblocked by `002` and `012` shipping the same day.

**Input**: Carlos, 2026-08-30:

> «seguimos teniendo solo la opción de adaptar una ficha… no habíamos dicho que
> íbamos a poder generar material en base a qué tuviera que aprender, adaptar
> material de estudio, exámenes, etc? es más debería ser un “generar adaptación” y
> de ahí elegir»

## He is describing a gap between specifications, not a missing feature

Three specifications already cover what he is asking for, and every one of them is
written and unimplemented:

| | | |
|---|---|---|
| `002` | Compose from objectives, with a required anchor | specified, 0 tasks done |
| `012` | Material has a kind: worksheet, exam, study, problems | specified, 0 tasks done |
| `001` | Adapt a worksheet | shipped |

So the application does the one thing that was built first, and the front door
still says «Adaptar una ficha» with a paste box under it — which `012` FR-1011
already forbids in so many words: *the interface MUST stop calling everything «una
ficha»*.

**This specification is the door those three walk through.** It adds no adaptation
capability. If it added one, that would be a sign it was specifying something
`002` or `012` should own.

## Why a door is worth its own feature

Because the question it asks changes what she has to know before she can start.

Today the first screen asks for a file. That is the application's question, not
hers: she does not arrive holding a file, she arrives with *a thing she has to get
done by tomorrow*, and sometimes that thing has no file at all — «que aprenda a
multiplicar con llevadas» is an objective, not a document.

A door that asks "what are you doing?" reaches `002` naturally. A door that asks
"which file?" cannot reach it at all, which is precisely why `002` has sat
specified and unreachable.

## What this is not

**Not a wizard with steps she cannot skip.** She will be interrupted — that is the
premise `009` was built on — and a five-step flow with no way back is how a setup
gets abandoned.

**Not a new pipeline.** ADR 0003: two entry points, one pipeline. Both doors end in
the same IR and the same adaptation.

## Clarifications

### Session 2026-08-30

- **Q: In what order does the door ask — work first, or learner first?** →
  **A: Learner → work → material** (Carlos, chosen against my recommendation).

  I argued for work-first on `012` US1 («she says what it is, once, before anything
  else») and on its fit with `005`. He is right that it reads as the application's
  order rather than hers: she does not arrive holding a category of work, she
  arrives thinking about a child.

  What that costs, named so it is designed for rather than discovered: **Principle
  IV pulls the other way.** One worksheet for three learners is the classroom's
  common case, and a flow that starts with one child makes the other two an
  afterthought. So the resolution is that the learner chosen first is *the first
  learner*, not *the only one*, and adding the others happens at the point of
  running — where `005` FR-503 already reuses the extraction. FR-1411/1412.

  And `012` US1 is preserved in substance rather than in sequence: the material kind
  is still chosen explicitly and still never defaults (FR-1403). What moves is when
  she is asked, not whether.

- **Q: Does the interface say «generar adaptación» as one verb covering both doors?**
  → **A: No — the two doors are named separately, in her words.** «Generar
  adaptación» is our vocabulary for the pair; hers is «adaptar algo que tengo» and
  «hacer material para que aprenda algo». `012` FR-1011 is about exactly this: the
  interface must stop using one word for several things.

- **Q: What happens if she has no learners at all?** → **A: The door routes to
  creating one and does not offer a disabled control.** Already an edge case; with
  learner-first it stops being an edge case and becomes the first screen a new
  teacher meets, which is `006`'s onboarding.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She says what she is doing (Priority: P1)

The first screen asks what kind of work this is. Two answers: *adapt material I
already have*, or *make material for something she has to learn*.

**Why this priority**: It is the branch that makes `002` reachable. Without it,
that specification cannot ship however finished it is.

**Independent Test**: From the first screen, both branches are reachable in one
interaction, and neither is presented as the exception.

**Acceptance Scenarios**:

1. **Given** the first screen, **Then** both kinds of work are offered as peers,
   with a sentence each saying when to pick it.
2. **Given** she picks *adapt*, **Then** she is asked what the material is (`012`)
   and how she is bringing it (`008`, `001`).
3. **Given** she picks *make*, **Then** she is asked what the learner has to learn
   and what to anchor it to (`002` FR-101/102).
4. **Given** she picks either, **Then** she can go back without losing what she
   typed.

---

### User Story 2 - An exam is called an exam (Priority: P1)

She says it is an exam, a study text, a set of problems, or a worksheet, and the
application uses the word she used from then on.

**Why this priority**: `012` FR-1002 makes `kind` change the adaptation — an exam
brings a constraint that only presentation may change. A door that cannot express
"this is an exam" makes that requirement unreachable, and the failure is silent and
serious: an exam quietly adapted like a worksheet is a different exam.

**Acceptance Scenarios**:

1. **Given** the material kinds from `012`, **Then** she picks one, and it is not
   pre-selected.
2. **Given** she chose «examen», **Then** every subsequent screen says «examen».
3. **Given** she chose «examen», **Then** the application states, before it runs,
   that it will change how it looks and not what it asks.
4. **Given** a unit of several documents (`012` FR-1009), **Then** each part
   carries its own kind.

---

### User Story 3 - For whom, and it lands in their record (Priority: P1)

She says which learner or learners this is for, and when it finishes it is in their
record (`014`).

**Why this priority**: It closes the loop Carlos asked for in the same breath —
«todo lo que se suba y todo lo que se genere se quede ligado al alumno».

**Acceptance Scenarios**:

1. **Given** a job, **When** she chooses one or more learners, **Then** one
   extraction produces one adaptation per learner (Principle IV).
2. **Given** it finishes, **Then** it appears in each of their records with its
   kind, its date and its school year (`014` FR-1203).
3. **Given** she chose several learners, **Then** the source is stored once.
4. **Given** no learner is chosen, **Then** the primary action says what is missing
   rather than being mysteriously disabled (`013` FR-1105 and the pattern already
   used on the adapt screen).

---

### User Story 4 - She starts from something she already did (Priority: P3)

From a row in a learner's record: *do this again for another learner*, or *do this
again this year*.

**Why this priority**: It is the payoff of `014` and it is genuinely valuable —
adapting last year's exam for this year's child is a real task — but it is a
shortcut into the same door, so nothing else depends on it.

**Acceptance Scenarios**:

1. **Given** a record row, **When** she reuses it for another learner, **Then** the
   existing extraction is reused rather than re-read, and no provider call is made
   for the ingest.
2. **Given** a reuse, **Then** the new adaptation is a new entry in the second
   learner's record, and the first learner's is untouched.

---

### Edge Cases

- **She has no learners yet.** The door must route to creating one rather than
  offering a disabled control.
- **Her service cannot read images** (`009`, `ingest-no-vision`). The *adapt* door
  must say so at the point she chooses a photograph, not after she has taken it.
- **She picks "make material" with no anchor.** `002` FR-102 requires one; the door
  must ask rather than let the run fail later.
- **She changes her mind about the kind after ingesting.** `012` FR-1005 already
  covers a disagreement between the stated kind and what the blocks look like; the
  door must let her correct it without re-ingesting.
- **One learner, several parts, one of which is an exam.** The strictest kind in a
  unit governs nothing globally — each part keeps its own rules.

## Requirements *(mandatory)*

- **FR-1401**: The first screen MUST ask what kind of work this is, offering *adapt
  existing material* and *create material from objectives* as peers.
- **FR-1402**: The interface MUST stop naming everything «una ficha» (`012`
  FR-1011). This feature is where that requirement becomes visible.
- **FR-1403**: The material kind MUST be chosen explicitly and MUST NOT default
  (`012` FR-1001). A defaulted «worksheet» is how an exam gets adapted as a
  worksheet.
- **FR-1404**: The chosen kind MUST be reflected in the interface's own words from
  that point on.
- **FR-1405**: For an exam, the application MUST state its constraint before
  running, not only in the report afterwards (`012` FR-1006).
- **FR-1406**: A job MUST accept one or more learners, and MUST produce one
  extraction and one adaptation per learner (Principle IV).
- **FR-1407**: Completed work MUST be recorded against every learner it was made
  for (`014`).
- **FR-1408**: Either door MUST be reachable from the other without losing entered
  work.
- **FR-1409**: Reusing recorded work MUST reuse the stored extraction and MUST NOT
  re-read the source through a provider.
- **FR-1410**: The door MUST NOT introduce an adaptation behaviour of its own. Its
  entire job is to reach `001`, `002` and `012`.
- **FR-1411**: The learner chosen first MUST be the first learner and not the only
  one. Adding others MUST be possible before the run without re-entering the work or
  the material, and MUST reuse the extraction (`005` FR-503).
- **FR-1412**: Choosing a learner first MUST NOT make a second learner feel like a
  correction. The control that adds them is part of the flow, not a repair to it —
  Principle IV is the common case, not the exception.

## Success Criteria *(mandatory)*

- **SC-1401**: A teacher with no material and one objective produces usable
  material without ever seeing a file picker.
- **SC-1402**: A teacher with an exam sees the word «examen» on every screen from
  the moment she says so.
- **SC-1403**: `002` becomes reachable from the interface — measured as: the
  compose path exists end to end with no code change outside this feature and
  `002`.
- **SC-1404**: One worksheet adapted for three learners makes one provider ingest
  call and appears in three records.
- **SC-1405**: Reusing a recorded job for a new learner costs zero ingest.
- **SC-1406**: A teacher's first ten seconds on the first screen produce «puedo
  hacer varias cosas aquí», not «esto adapta fichas». Judged by a person, once.

## Assumptions

- The order is **learner → work → material**, decided in clarification. The learner
  chosen first is the *first* learner, never the only one — see FR-1411.
- «Generar adaptación» as a single verb covers both doors. Whether the Spanish
  interface says that or names the two things separately is a wording question for
  clarification, not a structural one.

## Dependencies

- **Blocked on `012`** for material kinds — a door that offers kinds nothing
  consumes would be a lie in the interface.
- **Blocked on `002`** for the compose branch.
- `014` for where the work lands.
- `013` for the shell it is built in.
