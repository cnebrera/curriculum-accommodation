# Feature Specification: Los pictogramas tienen su sitio

**Feature Branch**: `025-pictogramas-tienen-su-sitio`

**Created**: 2026-09-02

**Status**: Draft

**Input**: Carlos, on `024` as shipped:

> «se me hace raro que la parte de pictogramas, licencia, aceptación, descarga... esté
> en el alumno... no tendría más sentido que en el alumno esté usar pictogramas (si
> quieres con un hint de ayuda para saber qué es) y si no están instalados que te diga
> que no están instalados y si quieres le des, ese le doy debería ir a la configuración
> de la aplicación a una sección de manejo de pictogramas... Pero que tenga su propio
> espacio... sería mucho más limpio que ensuciar con tantas cosas la hoja del alumno.»

## He is right, and it is the same mistake `020` already fixed

`020` exists because the learner's page had become a hub: the record, the guide, the
ACNS draft, the handover and the deletion were **six cards stacked under a profile
form**, and the real work of the tool was hidden inside a form. Carlos then: «no lo
estás pensando bien.»

Two specifications later I put a licence, four bullets of terms, a licence URL, an
acceptance, a withdrawal, a 157 MB download, a progress bar, a stop button, a folder
picker and an update check **inside that same profile form**. Same mistake, larger.

And the test for whose page it is answers itself: **the set is one fact about her
installation, and none of it is about a child.** Iker's profile should say that Iker
uses pictograms. It has no business carrying the Gobierno de Aragón's licence terms.

## What `018` decided, and why it was only half right

`018` put the set inside the profile deliberately, and the reasoning is still in the
code: «the set is only needed once she has decided a learner uses pictograms, and the
requirement and the decision are the same moment. A settings page she has to find first
would mean turning the family on and getting nothing, with no idea why.»

The **problem** was real: turning it on and getting nothing is the failure. The
**solution** was wrong: the fix for «she would not know where to go» is to tell her
where to go, not to move the whole destination into the form.

So: the learner keeps the switch and gains a **pointer**. «No tienes el juego de
pictogramas. Traerlo →» takes her there, and back.

## Where it goes

There is no **Configuración** yet — `020` designed one and its US2–US4 were never
built, which is why the rail still has five top-level entries mixing an action, an
entity, data, a setting and information. This feature builds it, with pictograms as its
first section, and moves the two things that were already settings into it.

```
Mis alumnos          ← still the opening screen
Preparar material    ← still there, retired by 020 US2 and not by this
Mis notas
Configuración        ← new
   Pictogramas          licence · acceptance · download · her vocabulary · folder
   Mi servicio de IA    moved, unchanged
   Acerca de            moved, unchanged
```

The rail goes from five entries to four, and the two that were never siblings of «Mis
alumnos» stop pretending to be.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The learner's page is about the learner (Priority: P1)

She opens Iker's «Quién es». Under **Pictogramas** there is a switch, one line saying
what a pictogram is for someone who has not met the term, and — because the set is not
installed — one line saying so and a link to go and get it. No licence, no URL, no
megabytes.

**Why this priority**: it is the complaint, and it is the `020` principle. A profile
form carrying a third party's licence terms is a page that has stopped being about a
child.

**Independent Test**: open a learner with pictograms on and no set; the profile shows
the switch, the scope, a hint and a pointer, and **nothing else** about the set.

**Acceptance Scenarios**:

1. **Given** a learner's profile, **When** she looks at Pictogramas, **Then** she sees
   the switch, the scope and a hint, and no licence text, no download and no folder
   picker.
2. **Given** no set installed, **When** pictograms are on for this learner, **Then**
   the profile says so plainly and offers one way to go and fix it.
3. **Given** she follows it, **When** she arrives, **Then** she is in Configuración ▸
   Pictogramas with everything `023` and `024` built.
4. **Given** she brings the set and comes back, **Then** the learner's page no longer
   says anything is missing.
5. **Given** a set is installed, **When** she opens the profile, **Then** Pictogramas is
   the switch and the scope — three lines, not thirty.

---

### User Story 2 - Pictograms have a room of their own (Priority: P1)

Configuración ▸ Pictogramas is where the licence is accepted, the set is brought, the
progress is watched, the download is stopped, a folder is pointed at, updates are
checked, and **her vocabulary** is reviewed.

**Why this is P1 alongside US1**: US1 removes things from a page. Without somewhere for
them to be, that is a feature deletion.

**Independent Test**: reach every one of `023` and `024`'s controls without opening a
learner at all.

**Acceptance Scenarios**:

1. **Given** the rail, **When** she opens Configuración, **Then** Pictogramas, Mi
   servicio de IA and Acerca de are its sections.
2. **Given** Configuración ▸ Pictogramas, **When** she is there, **Then** every control
   `023` and `024` built is present and works.
3. **Given** she has never opened a learner, **When** she brings the set, **Then** it
   works — the set is about her installation, not about a child.
4. **Given** her vocabulary has choices in it, **When** she opens this section, **Then**
   she can see and change them (`024` FR-2214 finally reviewable, not only answerable
   at the moment a report asks).
5. **Given** a download in progress, **When** she navigates away and back, **Then** the
   progress is still there. It is a fact about the application, not about a screen.

---

### User Story 3 - The rail stops mixing categories (Priority: P2)

**Why this priority**: it is `020`'s own diagnosis — «el raíl mezcla cuatro categorías
distintas como si fueran hermanas» — and it is P2 because the rail being wrong costs
her less than the profile being wrong.

**Independent Test**: the rail's top level is four entries, and «Mi servicio de IA» and
«Acerca de» are reachable in one more click, not lost.

**Acceptance Scenarios**:

1. **Given** the rail, **Then** its top level is Mis alumnos, Preparar material, Mis
   notas, Configuración.
2. **Given** an old habit, **When** she looks for «Mi servicio de IA», **Then** it is
   inside Configuración and its screen is unchanged.
3. **Given** Configuración, **When** she is inside it, **Then** she can tell which
   section she is in without relying on colour (`010` FR-812).

### Edge Cases

- **A download running while she is inside a learner.** It is application state, so it
  survives navigation and the learner's page can say «se están trayendo».
- **She declines the licence.** The learner's page still says the set is missing, and
  the pointer still works — declining is not a dead end.
- **A folder she pointed at, then moved.** `018` FR-1616 already covers the sheets;
  Configuración is where she re-points it.
- **She turns pictograms on for a learner with no set and never goes.** Sheets render
  with named gaps and say why (`018` FR-1616). Nothing silently does nothing.
- **Deep-linking back.** Following the pointer and pressing back returns her to the
  learner she came from, not to the caseload.
- **Screen-reader and keyboard.** A second level in the rail is a new navigation
  region, and `020`'s lesson was that a second menu is a column you have to *look* at.

## Requirements *(mandatory)*

### The learner's page

- **FR-2301**: A learner's profile MUST NOT contain a third party's licence text, a
  download control, a progress indicator or a folder picker.
- **FR-2302**: A learner's profile MUST keep the switch and the scope, and MUST carry a
  short explanation of what pictograms are for a reader who has not met the term.
- **FR-2303**: Where the set is missing and pictograms are on for this learner, the
  profile MUST say so and MUST offer exactly one way to reach where it is fixed.
- **FR-2304**: Following that MUST return her to the learner she came from.

### Configuración

- **FR-2305**: Configuración MUST be a top-level destination containing Pictogramas, Mi
  servicio de IA and Acerca de.
- **FR-2306**: Every control `023` and `024` built MUST be reachable there **without
  opening a learner**.
- **FR-2307**: The screens moved into Configuración MUST NOT otherwise change.
- **FR-2308**: Her vocabulary MUST be reviewable and changeable there, not only
  answerable when a report asks (`024` FR-2214).
- **FR-2309**: A download in progress MUST survive navigation, because it is application
  state and not screen state.

### The rail

- **FR-2310**: The rail's top level MUST be four entries: Mis alumnos, Preparar
  material, Mis notas, Configuración.
- **FR-2311**: Which section of Configuración she is in MUST NOT be signalled by colour
  alone (`010` FR-812).
- **FR-2312**: The second level MUST be reachable by keyboard alone and MUST be a named
  navigation region.

### What must not regress

- **FR-2313**: `018` FR-1605 stands: no axis value may enable pictograms. Moving the set
  out does not make it a global switch.
- **FR-2314**: `020` FR-1801 stands: Mis alumnos is still the opening screen.
- **FR-2315**: Nothing MUST fetch on opening Configuración (`023` FR-2107).

### Key Entities

- **Configuración**: a top-level destination with named sections. The second one in the
  application, after the learner — so the pattern is shared rather than invented twice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2301**: A learner's «Quién es» contains no licence text, no megabytes and no
  download control. Asserted, because it is the requirement.
- **SC-2302**: Every control `023` and `024` built is reachable without opening a
  learner.
- **SC-2303**: The Pictogramas block on a learner's profile is under six lines of text.
  Measured, because «mucho más limpio» has to mean something.
- **SC-2304**: A teacher who has never seen Rampa turns pictograms on for a child, is
  told the set is missing, brings it, and returns — without asking where to go.
  **Needs a teacher.**
- **SC-2305**: The rail's top level is four entries, and nothing that was reachable
  before is unreachable.
- **SC-2306**: `axe` finds no new violation on Configuración at every width the window
  allows, at the largest text scale.

## Assumptions

- **«Preparar material» stays.** `020` US2 retires it and is still unbuilt; doing it
  here would be a second redesign inside one feature.
- **The moved screens are moved, not rewritten.** `ConnectionScreen` and `AboutScreen`
  change their route and nothing else.
- **`018`'s reasoning is honoured rather than reversed.** Turning pictograms on and
  getting nothing is still the failure it identified; the pointer is the fix.
- **Her vocabulary being reviewable is `024` FR-2214 completed**, not a new capability:
  the file existed and only the report could reach it.
- **This is the second two-level destination**, after the learner. If a third appears,
  the shell wants a shared component and this feature is where that becomes visible.
