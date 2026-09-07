# Feature Specification: El alumno es el sitio — la navegación

**Feature Branch**: `020-el-alumno-es-el-sitio`

**Created**: 2026-09-01

**Status**: Draft

**Input**: Carlos, with the application open in front of him:

> «Y creo que no tiene sentido el botón de preparar material… Todo parte siempre del
> alumno, una vez que lo selecciono deberíamos tener la parte de datos del alumno y la
> parte de preparar cosas para el alumno y qué cosas he preparado para el alumno. Ahí
> es donde va a estar la chicha y necesitará sus propios menús a la izquierda… yo creo
> que el mis servicios de IA, mis notas quizás tengan más sentido en un menú de
> configuración. Luego mis alumnos que me enseñe la lista de alumnos con filtros e
> información básica de cada uno, y cuando entro en uno tendrá que tener su propio menú
> a la izquierda… **necesito que rediseñemos completamente la navegación, así es
> imposible usar esta herramienta.**»

## Why this is a specification and not a tidy-up

Nineteen specifications built the parts. Nobody ever specified **where the parts
live**, so each one attached itself wherever it was cheapest at the time, and the
result is four structural faults that no single feature owns:

**1 · The profile form became the centre of the learner.** Six of the most important
things this application does — the record of everything made for a child, bringing in
their official adaptation document, the ACNS draft, help with an ACS, the handover to
next year's tutor, and erasure — are **cards stacked underneath the edit-profile
form**. To see what you have prepared for a child you go in to *edit* them and scroll
past six cards. That is the actual work of the tool hidden inside a form.

**2 · Two front doors that ask the same question and do not know each other.** «Preparar
material» asks *who is this for?*; «Mis alumnos» also starts from the learner. Choosing
Lucía in one does not put you inside Lucía in the other.

**3 · The top level mixes four categories as though they were siblings**: an action, an
entity, some data, a setting, and an about page.

**4 · There is no such thing as «being inside a learner».** Sixteen views in one flat
switch, plus five more hidden in one screen's local state. Twenty destinations, no
hierarchy.

## What this retires, and why that is not a reversal

`016-una-puerta` **FR-1401** says: *the first screen MUST ask what kind of work this
is, offering adapt and create as peers.* This feature contradicts it head-on — the
first screen becomes **her caseload**.

That requirement exists because of a decision Carlos made during `/speckit-clarify`,
against my recommendation, and for the right reason: **«she arrives thinking about a
child.»** He was right then and the argument still holds. This feature does not revoke
it — it finishes it. *If she arrives thinking about a child, the child is the place,
not the first question of a form.*

Everything else `016` established survives, and is restated here rather than assumed:
the interface must stop calling everything «una ficha», the material kind is never
defaulted, and one job serves several learners with the first-chosen learner never
being the only one.

## Clarifications

### Session 2026-09-01

One question was put to Carlos. The rest are answered **from the constitution and from
specifications already written**, each recording where the answer came from — the
pattern `005` established, so a reviewer can disagree with the source rather than with
my judgement.

- **Q: She leaves a worksheet half-read on Tuesday. On Wednesday, where does she find
  it?** → **A: Marked on the learner in her caseload, and waiting inside *Preparar*.**
  The case that decides it is that on Wednesday she does not remember *which child* it
  was for, so a card only visible inside each learner would have her opening thirty
  learners to find it. Costs one call, not one per learner: `ingest:pending` already
  walks `material/` once. → FR-1825, FR-1826, SC-1808.

- **Q: What is the second top-level destination called?** → **A: «Configuración».**
  Answered from Carlos's own words — «*mis servicios de IA, mis notas quizás tengan más
  sentido en un menú de configuración*». The interface uses her vocabulary, not ours
  (`012` FR-1011), and when the person who asked for it has already used a word, that
  word wins.

- **Q: Does the «who else?» step come before or after checking the reading?** →
  **A: After.** Determined by `005` FR-514/FR-515: the batch's cost must be stated as
  one figure before the run, and the unusual-cost gate must consider the batch. The
  number of sheets therefore has to be known immediately before adapting — and asking
  it before the reading is verified would price a run that might never happen.

- **Q: Does the learner's heading carry the axis strip?** → **A: Yes.** `015`
  FR-1310/FR-1311 forbid presenting *several* learners' axes as aligned columns or
  summarising a child; one learner's own strip inside their own place is neither, and
  `015` FR-1312 says the strip must keep reading as *what helps this child*.

- **Q: What happens to a half-finished job that belongs to no learner — every one that
  exists in a vault today?** → **A: Surfaced in the caseload, unattached, and it asks
  who it is for when she resumes.** Follows from FR-1811: navigation may not lose work
  she has entered, and a job she paid a provider for is exactly that.

- **Q: Are the long flows themselves redesigned?** → **A: No.** Recorded in
  Assumptions. This feature moves where they live and adds one step; `008`, `001`,
  `002` and `005` own what happens inside them, and a specification that quietly
  redesigned four others would be the scope creep `016` FR-1410 warns about.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entering a learner (Priority: P1)

She opens Rampa. The first thing she sees is her caseload, with the filters `015`
already built. She clicks Lucía and is **inside Lucía**: a heading that says who this
is, and a menu down the left with the things she does for a child. She reads who Lucía
is, then looks at what has already been made for her, and goes back to the list — never
once opening a form to get somewhere.

**Why this priority**: It is the hierarchy itself. Without it there is nowhere to put
anything else, and it is the whole of what makes the tool usable: the two consultation
tasks — *who is this child* and *what have I made for them* — stop being buried.

**Independent Test**: Fully testable on its own, and **it must not remove any existing
route**: until US2 lands, «Preparar material» stays in the top level. Delivered value
is that the record and the profile are each one click from the learner instead of three
clicks and a scroll.

**Acceptance Scenarios**:

1. **Given** the application opens with learners in the vault, **When** she looks at
   the first screen, **Then** it is her caseload and not a question about work.
2. **Given** she is in her caseload, **When** she picks a learner, **Then** she is in
   that learner's own place, with a heading naming them and a menu of their sections.
3. **Given** she is inside a learner, **When** she opens *lo que le he preparado*,
   **Then** she reaches the record **without passing through the profile editor**.
4. **Given** she is inside a learner's record, **When** she presses the learner's name
   in the heading or her caseload in the top level, **Then** she returns to a list that
   is not still showing the previous screen.

---

### User Story 2 - Preparing something, from inside the learner (Priority: P2)

Lucía needs tomorrow's worksheet adapted. From inside Lucía she chooses *Preparar*,
which offers the two things she might be doing as peers: adapt something she has, or
make material for something he has to learn. She says what the material is, brings it,
checks that Rampa read it right, and is then asked **who else** — with Lucía already
ticked. Two more children, three sheets, each reviewed and signed on its own.

**Why this priority**: This is where the retired door's work goes. It is P2 rather than
P1 only because US1 must exist first to have somewhere to live; **the door cannot be
removed until this ships.**

**Independent Test**: Testable by preparing material for one learner and for three,
from inside a learner, and confirming the extraction was read once.

**Acceptance Scenarios**:

1. **Given** she is inside Lucía, **When** she opens *Preparar*, **Then** adapting and
   composing are offered as peers, and neither is pre-chosen.
2. **Given** she is in the adapt flow, **When** she reaches the step that asks who else
   it is for, **Then** Lucía is already included and adding others does not re-ask the
   material or the kind.
3. **Given** she is midway through a long flow, **When** she looks at the screen,
   **Then** the learner's menu is still there and the current step is marked.
4. **Given** she leaves a flow after a provider has already been paid, **When** she
   navigates away, **Then** she is told what has already been spent and is not blocked.
5. **Given** three sheets came out of one run, **When** she reviews them, **Then** she
   signs them one at a time and never in one action.

---

### User Story 3 - The curriculum document has its own place (Priority: P3)

The official adaptation document for a child — and the ACNS draft, and help with an
ACS — is about *this child*, permanently, and not about a piece of work. It becomes a
section of the learner rather than a card under a form.

**Why this priority**: It is a move, not new behaviour: `017` is built. It is separated
from US1 because it is the section most likely to grow, and because the ACS lock must
survive the move untouched.

**Independent Test**: Reach all four `017` screens from inside a learner, and confirm
the refusals still refuse.

**Acceptance Scenarios**:

1. **Given** she is inside a learner, **When** she opens *su adaptación curricular*,
   **Then** bringing the document, the ACNS draft and ACS help are all there.
2. **Given** she asks which objectives to remove, **When** the answer comes back,
   **Then** it still declines and still names who decides.

---

### User Story 4 - Configuración stops being scattered (Priority: P4)

Her AI service, how she works, the display and the licences are one place called
*Configuración*. And what Rampa has learned **about a particular child** moves to that child,
because that is where she is thinking about him.

**Why this priority**: Lowest user-visible value, highest tidiness value. It is also
the one with a genuine finding inside it — see below.

**Independent Test**: Every setting reachable from one top-level destination; a
learner-scoped journal entry visible inside that learner.

**Acceptance Scenarios**:

1. **Given** she wants to change service, **When** she opens *Configuración*, **Then** the
   service, her house style, the display controls and the licences are all there.
2. **Given** a journal entry was recorded against Lucía, **When** she is inside Lucía,
   **Then** she can see what Rampa learned about her without opening a global screen.

### Edge Cases

- **A learner with nothing prepared yet.** The empty state must read as *not yet*, and
  never as a fault or an empty box she interprets as lost work.
- **No learners at all.** Onboarding owns that; the caseload must not render an empty
  frame with filters over nothing.
- **She erases the learner she is inside.** Where she lands has to be somewhere that
  still exists.
- **She is midway through a flow and clicks another learner.** Work must not vanish
  silently, and she must not be trapped either.
- **Thirty learners in a narrow window with the text scale at `xlarge`.** A second menu
  is a third column, and this is where it breaks.
- **One job, three learners.** It appears in the record of all three (`016` FR-1407),
  and the sheet each of them sees is their own.
- **A composed job she abandons at the summary.** It is hers from the moment she asked
  for it, so it appears in her record marked pending — moving the navigation must not
  lose that.
- **She returns to a flow that finished while she was elsewhere.** The section shows the
  outcome, not the first step again.

## Requirements *(mandatory)*

### Functional Requirements

#### The shape

- **FR-1801**: The opening screen MUST be her caseload. **This retires `016` FR-1401.**
- **FR-1802**: The top level MUST offer exactly two destinations: **her learners** and
  **«Configuración»**. Adding a third is adding a category, and this feature exists
  because there were five. The second one carries **Carlos's own word** rather than one
  of ours (`012` FR-1011).
  **Deferred 2026-09-03 by `025` FR-2310 (decision P25) and MET 2026-09-07 by US2–US4.**
  `025` shipped a four-entry rail — Mis alumnos, Preparar material, Mis notas,
  Configuración — as an intermediate step, because the entries could not be removed
  before their contents had somewhere to go. They do now: «Preparar material» went
  inside the learner (T028) and «Mis notas» split by its own scope (T034/T035), so the
  rail is her learners and Configuración. Asserted rather than read off the screen —
  `e2e/nav.spec.ts`, «the rail offers exactly two, and neither is an action» — because
  «five became two» is the one claim this specification is about and it is one careless
  addition away from being false again.

  The deferral note is kept rather than deleted, since it is the record of a requirement
  that was *held* and not dropped: «a requirement that quietly disappears is a
  requirement nobody can argue with later».
- **FR-1803**: A learner MUST be a place she enters and not a form she opens.
- **FR-1804**: Inside a learner, these MUST be first-level destinations: **who he is**,
  **preparing something**, **what has been prepared**, and **his curriculum
  adaptation**. Handover and erasure MUST be reachable there too, set apart from the
  four.
- **FR-1805**: None of those destinations MAY require passing through the profile
  editor. That is the defect this specification was opened for.
- **FR-1806**: The learner MUST be named on every screen inside them (`005` FR-513),
  resolved in memory — no screen makes a name reachable from disk (`003`). The heading
  MAY carry that learner's own axis strip: one child's strip inside their own place is
  neither a comparison nor a summary, and `015` FR-1312 requires it to keep reading as
  *what helps this child*.
- **FR-1807**: The learner's menu MUST stay visible during multi-step flows, and the
  current step MUST be marked.
- **FR-1808**: Leaving a flow midway MUST be possible, MUST NOT be blocked, and MUST
  say what has already been spent.
- **FR-1809**: Choosing the destination she is already in MUST return to the start of
  it. A control that means «start again here» and does nothing is worse than absent.
- **FR-1810**: The active destination MUST NOT be indicated by colour alone (`010`
  FR-812).
- **FR-1811**: Navigating MUST NOT lose work she has entered (inherits `016` FR-1408,
  which the e2e suite caught being broken once already).

#### Preparing

- **FR-1812**: *Preparar* MUST offer adapting existing material and composing from
  objectives as peers, with neither pre-selected. This is `016` FR-1401's substance,
  relocated inside the learner.
- **FR-1813**: The material kind MUST still be chosen explicitly and MUST NOT default
  (`012` FR-1001, `016` FR-1403), and the interface MUST keep using her word for it
  (FR-1402, FR-1404). An exam MUST still state its constraint before running (FR-1405).
- **FR-1814**: The flow MUST include a step that asks **who else**, with the learner
  she entered through already included, and it MUST NOT re-ask the work or the material
  (`016` FR-1411/FR-1412, `005` FR-503). It MUST come **after** the reading is verified:
  `005` FR-514/FR-515 require the batch's cost as one figure before the run, so the
  number of sheets has to be known immediately before adapting — and asking earlier
  would price a run that may never happen.
- **FR-1815**: Reviewing and signing MUST remain per learner, with no action that signs
  two documents (`005` FR-511/FR-512).
- **FR-1816**: Completed work MUST appear in the record of every learner it was made
  for (`016` FR-1407).

#### Work left half-finished

- **FR-1825**: A learner with work left half-finished MUST be marked as such **in her
  caseload**, saying how far it got. On Wednesday she does not remember which child
  Tuesday's worksheet was for, and a marker only visible inside each learner would have
  her opening thirty of them to find one.
- **FR-1826**: Inside that learner, *Preparar* MUST offer to continue it, and continuing
  MUST NOT re-read the source through a provider (`005` FR-503, `016` FR-1409).
- **FR-1827**: Half-finished work that belongs to no learner — which is **all of it in
  any vault that exists today** — MUST be reachable from the caseload and MUST ask who
  it is for when she continues. A job a provider has already been paid for is work she
  entered (FR-1811).
- **FR-1828**: Establishing which learners have work half-finished MUST cost **one**
  read of the material directory, not one per learner. `014` FR-1214 permits a cache
  only when a measurement demands one, and a caseload that scans per learner is how a
  screen becomes slow at exactly the roster size the product is for.

#### Configuración, and what belongs to a child

- **FR-1817**: *Configuración* MUST hold the AI service, her house style, the display
  controls, the vault location, and the licences.
  **Deferred 2026-09-03 by `025` FR-2305 (decision P25) and MET 2026-09-07 by T033/T034.**
  Configuración now carries six sections: Pictogramas, Normativa, **Cómo trabajo yo**,
  El criterio pedagógico, Mi servicio de IA, and Acerca de y licencias. Her house style
  and the vault's location arrived with the notes split, which is where they already
  lived.

  **The display controls are the one item read differently, and it is on purpose.** The
  text size, contrast and motion controls are in the rail's foot (`013` FR-1106, «the
  rail's foot MUST be a composed block»), which is visible *while she is in
  Configuración* and from every other screen too. A second home for them would be two
  copies of one truth, and the copy she found first would be the one that felt broken.
  So Configuración holds them in the sense that matters — they are reachable from it —
  and there is deliberately no `display` pane. Recorded here rather than resolved
  silently in favour of whichever requirement was read last.
- **FR-1818**: Journal entries scoped to a learner MUST be visible inside that learner.
- **FR-1819**: Her house style and entries scoped to her practice or to the corpus MUST
  live in *Configuración*, not inside a learner. The scope decides where it is shown,
  and she is still the only one who sets the scope (Principle VIII).
  **Deferred 2026-09-03 by `025` (decision P25) and MET 2026-09-07 by T034/T035.**
  «Mis notas» is Configuración ▸ «Cómo trabajo yo», and entries scoped to a learner are
  read inside that learner. `journalFor` **only filters**: it checks `scope` as well as
  `learner`, so an entry she scoped to her practice that happens to name a child stays
  where she put it. Nothing infers a scope and nothing moves an entry between them.
- **FR-1820**: Splitting the notes screen MUST NOT change what is written, where, or by
  whom. It is a change of where things are read.

#### What the redesign may not break

- **FR-1821**: No view MAY order or compare learners by an axis value, present several
  learners' axes as aligned columns, or show any total or average over a child (`015`
  FR-1309/FR-1310/FR-1311). The caseload is the screen being redesigned and it is the
  screen this rule is about.
- **FR-1822**: Every destination MUST be reachable by keyboard, and each MUST announce
  which section it is.
- **FR-1823**: Every screen MUST stay usable at any window width the shell allows and
  at every text scale (`013` FR-1115/FR-1116/FR-1117). A second menu is another column.
- **FR-1824**: The page shell MUST keep owning the title, the measure and the vertical
  rhythm, with one primary control per screen (`013` FR-1101/FR-1105).

### Key Entities

- **Route**: where she is — a top-level section, optionally a learner, optionally one of
  his sections, optionally a step within a flow. Held in one place, never persisted
  across restarts (a half-finished intent restored on Monday is a screen that looks
  wrong with no visible cause — `015`'s reasoning about filters).
- **Learner place**: the learner's code plus her name for him, resolved in memory, and
  the sections available for him.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-1801**: From opening the application, what has been prepared for a named learner
  is reachable in **no more than three actions**, and none of them is «edit». Today it
  is five, and one of them is opening a form.
- **SC-1802**: No primary task requires scrolling inside a form to be discovered.
- **SC-1803**: A teacher who has not seen Rampa before finds «prepare something for this
  child» without being told where it is. **Needs a teacher; it is the only verdict that
  settles whether this worked.**
- **SC-1804**: Every destination, old and new, passes an automated accessibility check
  with no violations, and every one is reachable by keyboard alone.
- **SC-1805**: Every screen is usable — nothing clipped, nothing overlapping, no
  sideways scrolling of the page — at the shell's narrowest supported width with the
  text scale at its largest.
- **SC-1806**: Adapting one worksheet for three learners still reads the source exactly
  once (`005` SC-502 unchanged by the move).
- **SC-1807**: No screen anywhere in the redesigned interface presents two learners'
  axis values side by side.
- **SC-1808**: Work left half-finished on one day is findable the next **without
  opening any learner**, and her caseload takes no longer to appear than it does today
  with the same number of learners.

## Assumptions

- **The learner's menu is a second column on a wide window and collapses to a
  horizontal strip when narrow.** Chosen rather than asked: `013` FR-1116 already
  requires layout to answer to the room it has, and a third column at 900px would be
  the thing that rule exists to prevent.
- **The route is not persisted.** Restarting lands her on her caseload.
- **No new field about a learner is introduced.** `015` FR-1308 forbids it and nothing
  here needs one.
- **The flows keep their current steps.** This feature moves where they live and adds
  the «who else» step; it does not redesign ingest, adaptation or review internally.
- **`016`'s spec file is amended rather than deleted**, with FR-1401 marked retired and
  pointing here. A requirement that quietly disappears is a requirement nobody can
  argue with later.
- **The e2e suite will break, and that is the signal.** Its navigation is already
  centralised in one helper; the recorded routes get rewritten, not the assertions
  loosened.
