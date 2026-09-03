# Feature Specification: Material que se ve, no sólo que se lee

**Feature Branch**: `022-material-que-se-ve`

**Created**: 2026-09-01

**Status**: Draft

**Input**: Carlos, after the pictogram screen told him to go and download something:

> «la idea de adaptar no es solo generar puto texto siempre, si te monto material para
> enseñarte a multiplicar para un niño, no lo puedo hacer con texto... necesitara
> diagramas, explicaciones, dibujos...»

And, when I proposed a fixed catalogue of code-drawn diagrams:

> «si hago el diagrama con codigo para un niño que le gustan los pokemon, no voy a poder
> hacer un pokemon que te enseña cosas... me sigues? tendrá que decidir el sistema que
> combinacion hace, pero no ilusraría diagramas con IA, montaría HTMLs internos o algo
> parecido que renderizo»

## A process note, recorded rather than tidied away

**This specification was cited as shipped without being so.** `023`'s input line
said «after `022` shipped» on 2026-09-02, and `023`'s T023 ticked an assertion
about «`022`'s diagrams» — while this feature had, at that moment, a spec and no
`plan.md`, no `tasks.md` and no code. Nothing of it had shipped. Found by the
2026-09-03 review (P21, P42); both downstream claims now carry corrections.

What let it happen: the Spec Kit gate blocked a spec and its implementation in
one commit, but nothing checked a spec being *declared* built by another spec.
The gate is being hardened for exactly that (P42: a spec cited by code or
declared shipped/built must have `plan.md` and `tasks.md`), and this feature is
in the BACKLOG (G38) as genuinely pending until it has been through `plan` →
`tasks` → `implement`. Carlos's decision keeps it on the table and prioritised —
teaching multiplication needs the diagram, and the plan/tasks work is already
queued as item 3.2.

## The gap

Rampa can produce a page of prose about multiplying with carrying. It cannot produce the
thing a child actually needs: a rectangle of twelve squares, a number line, four groups of
three. Twenty-one specifications in, **everything Rampa makes is text**, and for the
subject where its verifiers are strongest — arithmetic — that is the wrong medium.

And a fixed catalogue would only get halfway. `profile.interests` already records that a
learner is into Pokémon, and `002` already uses it for the **wording** of problems. A
generic area rectangle is the same rectangle for every child, which throws away the one
thing that makes a nine-year-old start.

## Why the model writes markup and not a picture

Carlos's decision, and it is the right one for a reason that is about verification rather
than cost:

**An image is opaque. Markup is inspectable.** A generated picture of eight apples might
contain seven, and neither Rampa nor the child can tell — the sheet is simply wrong in a
way that looks fine. Markup can be counted before it is drawn.

It also lands where the architecture already is: Rampa renders HTML to PDF with a bundled
engine (ADR 0008's surviving argument). Generated markup is native here; generated images
would be a new dependency, a per-sheet cost, and something nothing can check.

## Who decides what

| | Decided by |
|---|---|
| **How many** — that 4×3 is twelve cells, that the line reaches 20, that the bar has five parts | **Code**, from the exercise, which `002` has already verified |
| **What of** — that the cells are cards, that the groups are creatures, that the context is his | **The model**, because that is where the thing that makes him start lives |
| **How it is drawn** | **Code**, always. One renderer, the same one that makes the PDF |

This is the pattern `002` already uses for answers — the model proposes, the code computes
— applied to the picture instead of the number.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A diagram that is right (Priority: P1)

She composes material for multiplying with carrying. Beside `4 × 3 =` there is a rectangle
of four rows and three columns, twelve cells, because the exercise says twelve. It prints,
it photocopies, and it is correct — not because a model was careful, but because nothing
was asked to count.

**Why this priority**: It is the complaint. Without it, «material para enseñar a
multiplicar» is a page of sentences about multiplying.

**Independent Test**: Compose arithmetic material and confirm every diagram's quantities
match its exercise, with no provider deciding a number.

**Acceptance Scenarios**:

1. **Given** a verified exercise, **When** a diagram accompanies it, **Then** every
   quantity in the diagram comes from that exercise.
2. **Given** the model asks for a diagram whose quantities do not match, **When** the sheet
   is written, **Then** it is drawn with the exercise's numbers and the report says the
   quantity was corrected.
3. **Given** a diagram, **When** it is printed and photocopied in black and white,
   **Then** it is still readable — no meaning carried by colour alone.
4. **Given** a learner who reads by ear or by touch, **When** the material is turned into
   the linear text, **Then** each diagram is described in words rather than silently
   dropped.

---

### User Story 2 - A diagram that is his (Priority: P2)

The same twelve cells, and they are cards, because his profile says cards. Another child
gets the same twelve cells as buses. The mathematics is identical and the page is not.

**Why this priority**: It is what a fixed catalogue cannot do, and it is Carlos's
correction. It is P2 because US1 must be right before it is personal — a charming diagram
with the wrong number of cells is worse than a plain one.

**Independent Test**: Two learners with different interests, one objective, and two sheets
whose quantities agree and whose themes do not.

**Acceptance Scenarios**:

1. **Given** a profile recording an interest, **When** material is composed, **Then** the
   diagram's theme may draw on it and the quantities are unaffected.
2. **Given** no interest recorded, **When** material is composed, **Then** the diagram is
   plain rather than themed at random.
3. **Given** an interest naming a commercial character or brand, **When** the diagram is
   drawn, **Then** the theme is used and the property is not.

---

### User Story 3 - It cannot become a way in (Priority: P1)

**Why this is P1 alongside US1**: markup from a model, rendered by the application, is the
largest new attack surface this project has taken on. It ships with US1 or US1 does not
ship.

**Independent Test**: markup containing a script, an event handler, a remote reference and
a navigation attempt produces a diagram with none of them, or no diagram.

**Acceptance Scenarios**:

1. **Given** markup containing a script or an event handler, **When** it is rendered,
   **Then** nothing executes and the sheet says a diagram was refused.
2. **Given** markup referencing anything remote, **When** it is rendered, **Then** nothing
   is fetched.
3. **Given** markup using an element or attribute outside what is allowed, **When** it is
   rendered, **Then** it is refused rather than sanitised into something plausible.

### Edge Cases

- **An exercise nothing could verify.** No verified quantity, so no quantity to draw from:
  the diagram is refused rather than drawn from the model's numbers.
- **A diagram that would not fit the page.** Bounded, and the bound reported — the same
  rule as `008`'s page bound.
- **Thirty cells.** A grid of thirty is not a helpful picture; there is a size past which
  a diagram stops being one.
- **A learner whose interest is a brand.** Covered by US2 scenario 3, and it is the
  trademark case rather than the licence one.
- **The linear renderings.** `019` promises one document, N renderings; a diagram that
  exists only in the printed one breaks that promise for the learner who needs it most.
- **A corrected exercise.** `005` FR-520: the sheet is already marked stale, and its
  diagram must not survive the correction with the old numbers.
- **Adapted material, not composed.** An adapted worksheet's quantities were somebody
  else's and are not verified, so a diagram may not be invented for it.

## Requirements *(mandatory)*

### Functional Requirements

#### The quantities are the code's

- **FR-2001**: Every quantity in a diagram MUST come from an exercise `002` has already
  verified. No quantity may originate from a model.
- **FR-2002**: Where what the model asked for does not match the exercise, the diagram MUST
  be drawn with the **exercise's** quantities, and the report MUST say the quantity was
  corrected.
- **FR-2003**: Where there is no verified quantity, no diagram MAY be drawn. An unverified
  exercise with a confident picture beside it is worse than one without.
- **FR-2004**: Rendering a diagram MUST be deterministic: the same document MUST produce
  the same drawing, with no model call at render time.

#### The theme is hers, and the property is not

- **FR-2005**: A diagram's theme MAY draw on `profile.interests`, and MUST NOT affect any
  quantity.
- **FR-2006**: With no interest recorded, a diagram MUST be plain rather than themed at
  random. Inventing an interest is inventing a fact about a child.
- **FR-2007**: A diagram MUST NOT reproduce a third party's characters, logos or other
  protected property. **The theme, not the property**: a trademark on a child's worksheet
  is a sharper infringement than a Creative Commons breach, and this project has just
  spent a day being careful about the softer one.

#### What the markup may be

- **FR-2008**: Markup from a model MUST be checked against an **allowlist** of elements and
  attributes and refused if it strays outside it. Refused, **not sanitised**: rewriting
  attacker-shaped input into something plausible hides the event worth seeing (`007`
  FR-508's rule for paths, applied here).
- **FR-2009**: No script, event handler, or executable content of any kind MAY survive into
  a rendered document (Principle IX).
- **FR-2010**: No diagram MAY cause a network request, at render time or at view time.
  Anything remote in a document turns opening a worksheet into a signal that it was opened.
- **FR-2011**: A refused diagram MUST be reported, and the sheet MUST render without it. A
  refusal that loses the whole page punishes her for something the model did.

#### It is a document, so it is every rendering

- **FR-2012**: A diagram MUST be described in words in the audio-ready and braille-ready
  renderings (`019`). A picture that exists only on paper is a picture the learner who
  needs it most cannot have.
- **FR-2013**: A diagram MUST carry no meaning in colour alone, and MUST survive a
  black-and-white photocopy (`010` FR-812, `007`'s photocopy check).
- **FR-2014**: A diagram MUST NOT contain a learner's name, code, school, course or any
  other fact about him (`011` FR-910, `015` FR-1306).
- **FR-2015**: A diagram's size MUST be bounded, and a bound reached MUST be reported
  rather than silently applied.
- **FR-2016**: Where an exercise's numbers change, its diagram MUST change with them or be
  removed. A diagram is part of the document, not decoration attached to it.

### Key Entities

- **Diagram request**: what the model asks for — a kind of figure, a theme, and labels.
  Carries **no quantities**; those are read from the exercise.
- **Figure**: what is drawn. A kind, its quantities from the exercise, its theme from her
  profile, and a description for the linear renderings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2001**: Every diagram on every generated sheet has quantities matching its
  exercise. Checked as an invariant across a generated corpus, not sampled.
- **SC-2002**: No diagram anywhere causes a network request or executes anything, given
  markup that tries all three of script, handler and remote reference.
- **SC-2003**: Two learners with different interests and the same objective get sheets
  whose diagrams differ in theme and agree in every quantity.
- **SC-2004**: Every diagram appears in the audio-ready and braille-ready text as a
  description.
- **SC-2005**: Every diagram remains readable as a black-and-white photocopy — **needs a
  photocopier**, and it is the second criterion in this project to need one.
- **SC-2006**: A teacher shown a themed sheet and a plain one says which she would put in
  front of the child, and why. **Needs a teacher**: whether a diagram helps is not
  answerable here, and «it looked nice» is not the question.

## Assumptions

- **Diagrams accompany composed material, not adapted material.** An adapted worksheet's
  quantities came from somebody else's document and are not verified, so there is nothing
  safe to draw from — see the edge case.
- **The set of figure kinds starts small and grows from use.** Grids, groups, number lines
  and part-whole bars cover what `002`'s verifiers can already check. A kind nothing can
  verify does not belong in the first version.
- **The theme is words and shapes, not artwork.** A model writing markup produces forms and
  labels; nobody is drawing a character. That is also what keeps FR-2007 achievable.
- **No new provider call.** The diagram request rides along with the composition that is
  already being made.
- **ARASAAC pictograms are `023`** and blocked on reading their terms of use. Nothing here
  depends on them, and this feature is not a workaround for them: a diagram is not a
  pictogram, and a child who reads by pictogram needs the vocabulary he has learned.
- **The conversation is `026-la-conversacion`** *(corrected 2026-09-03, was `024` —
  CONS-05/P24)*.
