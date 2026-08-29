# Feature Specification: Who the learner is — age, year and stage

**Feature Branch**: `011-quien-alumno-edad`

**Created**: 2026-08-29

**Status**: Clarified 2026-08-29 — ready for `/speckit-plan`

**Input**: Found by Carlos on the first real run. The profile carries barriers and
nothing about who the learner is, so `buildAdaptPrompt` sends axes, what works,
what to avoid, interests and response modes — and **no notion of age or year**.
The application therefore adapts identically for a seven-year-old and a
fifteen-year-old with the same barrier profile.

`stage`, `year_group` and `group` already exist in the roster schema and reach
nothing.

## Why this is not a nice-to-have

A fourteen-year-old handed a worksheet that reads as though it were written for a
seven-year-old has been labelled. That is the same harm Principle V exists to
prevent and the same one the handover spec spends its whole design weakening —
arriving here through a different door, and arriving on **every single sheet**
rather than once a year.

It also runs the other way. A ten-year-old given a text pitched at fourteen fails
for a reason that has nothing to do with his barriers, and the teacher reasonably
concludes the adaptation was wrong.

Age is **not a diagnosis**. It is the plainest fact about a child there is, and
its absence is why the register of every adapted sheet is currently a guess.

## The problem with `curso`

*(Carlos, 2026-08-29: "el problema es que curso cambia según países y modelos
educativos… podemos empezar por España y luego complicamos.")*

- **Age is universal.** Fourteen is fourteen in Cádiz and in Leeds.
- **Year and stage are not.** "5.º de Primaria", "Year 6" and "6th grade" are three
  systems, and a teacher says the one she uses without thinking about it.

So they are different kinds of fact and the design has to treat them differently:
age is what the adaptation reasons about, year is what the teacher speaks.

## Clarifications

### Session 2026-08-29

- Q: How is the education system chosen? → A: **One question at first run, saved in
  the vault settings, never asked again.** Carlos's call. Inferring it from the OS
  language is free but starts a British or American school in Madrid on the wrong
  model, and they would have to discover where to change it — the population most
  likely to need the choice is the one the inference gets wrong. It costs one
  question in a flow SC-401 times, and it is a question a teacher answers without
  thinking.
- Q: What must the Spanish model cover? → A: **All of it** — Infantil, Primaria,
  ESO, Bachillerato, FP Básica and Grado Medio, educación especial and aulas
  específicas, and educación de personas adultas. Carlos's call, and it changes the
  shape of the file: the last three are precisely where age and year come apart,
  which is what this feature exists for. An adult in ESPA studying ESO material
  would otherwise be handed a register pitched at thirteen.
- Q: How is age stored — a number, or a date of birth? → A: **A number plus the
  date it was recorded.** Decided rather than asked, and the reasoning is here to
  be overturned: a date of birth is a strong identifier, and this project stores
  no learner name on disk precisely to avoid holding one. An age that goes stale by
  a year is a smaller problem than a DOB in a file about a child, and the recorded
  date is what lets the application say "esto lo anotaste hace 14 meses" instead of
  silently drifting.
- Q: Which direction does the default run — year fills age, or age fills year? →
  A: **Year fills age.** The year is what she says without thinking; the age is what
  the adaptation needs. Going the other way would mean asking her for a number she
  has to look up, in a flow measured in minutes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She says the year; the age comes with it (Priority: P1)

Creating a learner, she picks **5.º de Primaria** from a list she recognises. The
age fills in as 10 and she can change it. She never types "10" unless the child
is not the usual age for that year — which is exactly when it matters.

**Why this priority**: It is the whole feature in one interaction, and the friction
budget is small: this sits inside onboarding, which SC-401 measures.

**Independent Test**: Create a learner picking only a year. The profile carries a
year, a stage and an age, and the prompt carries all three.

**Acceptance Scenarios**:

1. **Given** the Spanish model, **When** she picks 5.º de Primaria, **Then** the
   stage is Primaria and the age defaults to 10, both editable.
2. **Given** she changes the age to 12, **When** she saves, **Then** the year stays
   5.º de Primaria and the age is 12 — the application does not "correct" either.
3. **Given** a learner created before this feature, **When** the profile loads,
   **Then** the fields are absent rather than guessed, and nothing breaks.

---

### User Story 2 - The adaptation knows how old he is (Priority: P1)

Every adaptation receives age, year and stage, and the corpus says what to do with
them: pitch the register to the **age**, pitch the curricular demand to the
**year**.

**Why this priority**: It is the reason the feature exists. Storing the fields and
not sending them would be the same gap with more code.

**Acceptance Scenarios**:

1. **Given** a learner with an age, **When** an adaptation runs, **Then** the
   prompt carries it and the corpus rule about register is in the instructions.
2. **Given** age and year that diverge — a fourteen-year-old in 5.º de Primaria —
   **When** the prompt is built, **Then** the divergence is stated rather than left
   to be inferred, because that is precisely when register and curricular level
   come apart.
3. **Given** no age recorded, **When** an adaptation runs, **Then** nothing is
   invented: the prompt says the age is unknown, exactly as an unobserved axis is
   `null` and never 0.

---

### User Story 3 - Another country is a file, not a release (Priority: P2)

The Spanish model ships. A British or American one is a Markdown file in the
corpus, added without touching code — the same way a seventh AI service is.

**Why this priority**: Spain is the only user today. Building the extension point
now costs almost nothing; retrofitting it once year strings are embedded in code
costs a rewrite.

**Acceptance Scenarios**:

1. **Given** `instructions/education/es.md`, **When** the application starts,
   **Then** the Spanish years and stages come from that file and none is hardcoded.
2. **Given** a second model file, **When** it is added, **Then** she can choose the
   system and the years change, with no code change.
3. **Given** a malformed model file, **When** it is read, **Then** it degrades to
   "this system is not offered" and logs, exactly as a service entry does.

---

### Edge Cases

- **A repeater, or a child two years above his class.** Recorded as it is, told to
  the model, never corrected. This is the case the feature is most needed for.
- **A learner with an ACI significativa** working three years below his year group.
  Age, year and the official document all disagree, and all three are true.
- **She does not know the age.** Absent, not guessed. Same rule as an unobserved
  axis.
- **A school year boundary.** The child has a birthday; the year does not change.
  Age is stored as a number with the date it was recorded, not as a birth date —
  see the clarification below.
- **Adult learners, FP, educación de personas adultas.** The model must not assume
  a learner is a child. An adult in ESPA works with ESO-level material, and a
  register pitched at thirteen is the exact failure this feature exists to prevent,
  aimed at the person least able to shrug it off.
- **Educación especial and aulas específicas.** The administrative year and the
  working level separate completely, and sometimes there is no ordinary year at
  all. The file must be able to say a year has **no typical age**, and the
  application must then fill nothing rather than guess.

## Requirements *(mandatory)*

- **FR-901**: The learner profile MUST carry `age`, `year` and `stage`, each
  optional and each absent rather than guessed when unknown.
- **FR-902**: Choosing a year MUST fill the stage and a default age, both editable,
  and the application MUST NOT alter either afterwards.
- **FR-903**: Age, year and stage MUST reach the adaptation prompt.
- **FR-904**: The corpus MUST state the rule the fields exist for: register to the
  age, curricular demand to the year. That rule is pedagogical judgement and lives
  in `instructions/`, per Principle I.
- **FR-905**: A divergence between age and year MUST be stated in the prompt rather
  than left to inference.
- **FR-906**: Education systems MUST be corpus files under `instructions/education/`,
  one per system, with no year, stage or age hardcoded in the application.
- **FR-907**: A malformed education file MUST degrade to "not offered" and log,
  never crash the screen she is standing on.
- **FR-908**: Spanish is the system that ships, covering Infantil, Primaria, ESO,
  Bachillerato, FP Básica and Grado Medio, educación especial and aulas
  específicas, and educación de personas adultas. The format MUST support other
  systems without a code change.
- **FR-911**: The education system MUST be asked once at first run and stored in
  the vault settings. It MUST NOT be inferred from the operating system's language.
- **FR-912**: A year for which a typical age is meaningless MUST be able to say so,
  and the application MUST then fill nothing rather than guess.
- **FR-913**: Each year MAY carry orientation about what a learner at that point
  can typically do and, broadly, what is studied. This MUST be labelled as
  orientation and MUST NOT be presented as curriculum.
- **FR-914**: The teacher's own statement MUST always outrank the orientation, and
  the corpus MUST say so where the model reads it.
- **FR-915**: Years MUST support an optional modality, because Bachillerato's
  content depends on it and a sixteen-year-old's material depends on which.
- **FR-916**: The Spanish file MUST state, in its own text, that it is the
  state-level minimum and that autonomous communities develop their own curriculum
  on top of it.
- **FR-917**: The orientation MUST carry a check date, and it MUST NOT be treated
  as reviewed until a practising teacher has disagreed with it — the same status as
  `docs/axis-calibration.md` and backlog G2.
- **FR-909**: Age MUST be stored as a number plus the date it was recorded, never
  as a date of birth.
- **FR-910**: These fields MUST NOT appear in learner-facing output, and the
  existing output check MUST cover them.

## Success Criteria *(mandatory)*

- **SC-901**: For a learner with an age, the adapted sheet's register matches the
  age rather than the barrier level — judged by a teacher, on the divergent case.
- **SC-902**: Adding a second education system is one Markdown file and zero lines
  of code, demonstrated by adding one.
- **SC-903**: Creating a learner does not get slower: the year is one choice and
  everything else is filled.
- **SC-904**: No learner age, year or stage ever appears on a sheet a child holds.
- **SC-905**: For a learner with no material and only an objective, the orientation
  is enough to keep the output age-appropriate — measured when `002` exists, and
  named here because that is what this half of the corpus is for.
- **SC-906**: A practising teacher reads the Spanish orientation and disagrees with
  it somewhere. Until that has happened it is unreviewed, and the file says so.

## Assumptions

- One education system per vault. A teacher works in one country, and supporting
  two at once is complexity for nobody.
- "Typical age for a year" is a mapping in the file, not arithmetic: Spanish years
  do not map to ages by a formula once FP and repetition exist.
