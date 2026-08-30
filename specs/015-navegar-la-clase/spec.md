# Feature Specification: Navigating a caseload, without ranking children

**Feature Branch**: `015-navegar-la-clase`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify`, then `/speckit-plan`

**Input**: Carlos, 2026-08-30: «la navegación de alumnos debe estar más currada…
con distintos tipos de vistas, con filtros (por año, colegio, curso, etc)».

## The thing that makes this feature dangerous

A PT in a Spanish state school carries between fifteen and forty learners. One flat
list of cards is right for three and useless for thirty, so he is right that this
needs work.

But the obvious way to build "views and filters" over a caseload is a sortable
table, and the columns available are the nine axis values — `COG`, `EJE`, `ATE`
and the rest. **A grid of children sortable by their axis values is a league table
of disability.** It reads as a score, it invites comparison between children who
have nothing to do with each other, and it turns a record of barriers into a record
of deficits.

That is Principle V — *barriers, not diagnoses* — and it is the constitutional
constraint this feature has to be designed against rather than checked against
afterwards. The plan's Constitution Check is not a formality here.

It is also the exact risk `013`'s plan already flagged for the axis strip: "the one
screen where layout carries an ethical risk". This feature is that screen, multiplied.

## What this is not

**Not a class register.** Rampa is not the school's system of record and must not
grow into one. Every field added here has to earn itself against the smallest
personal-data footprint that does the job, because a folder holding a child's
barriers, their school, their course and their year is more identifying than the
same folder without them.

**Not a dashboard.** No counts of adaptations per child, no "most active learner",
no progress bars over a person.

## Clarifications

### Session 2026-08-30

Answered from the constitution and from specifications already written rather than
asked, each recording where the answer came from.

- **Q: Which view is the default?** → **A: The list.** It is today's behaviour, and
  a feature that changes what she sees before she has asked for anything is a feature
  that makes her re-find her own caseload.

- **Q: Do filters survive closing the application?** → **A: No.** FR-1303 keeps them
  while she works. A filter she set on Friday and forgot is a caseload that looks
  half-empty on Monday, and the first thing she will conclude is that Rampa lost her
  learners.

- **Q: Is `school` a property of the learner or of the teacher?** → **A: Of the
  learner.** Itinerant PTs and orientadores work across centres, so a single value on
  the teacher would be wrong for most of the people this field exists for.

- **Q: Does this feature introduce a «grupo» or «clase» concept?** → **A: No.**
  `005` already states that choosing several learners for one worksheet does not
  declare a persistent group. If groups turn out to be worth having they need their
  own argument, and building one here would be inventing the school's data model on
  the way past.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She finds a learner in a list of thirty (Priority: P1)

She types two letters of the name she uses and the learner is there.

**Why this priority**: At thirty learners, finding one is the whole interaction,
and it happens before every single adaptation.

**Independent Test**: Thirty learners; typing three characters narrows to the
expected few in under a second.

**Acceptance Scenarios**:

1. **Given** a caseload, **When** she types part of a name, **Then** matching
   learners are shown, matched on the name **she** sees.
2. **Given** that search, **Then** the term is never written to disk and no name
   index is built (`014` FR-1207).
3. **Given** a code typed instead of a name, **Then** it matches too — the code is
   what appears on the printed sheet, so it is what she has in her hand.

---

### User Story 2 - She works one course at a time (Priority: P1)

She filters to 3.º de Primaria because that is the group she is preparing for
tomorrow.

**Why this priority**: It is how the work is actually organised — by session, and a
session is a group.

**Acceptance Scenarios**:

1. **Given** learners with a course set (`011`), **When** she filters by course or
   by stage, **Then** only those learners are shown.
2. **Given** a learner with no course recorded, **Then** they are still findable —
   an unfiltered view and an explicit «sin curso» — because a missing field must
   not make a child disappear.
3. **Given** a filter matching nobody, **Then** she is told which filter to loosen.
4. **Given** filters applied, **Then** they persist while she works and are visibly
   applied, so a caseload that looks half-empty is never a mystery.

---

### User Story 3 - She sees who she worked with this year (Priority: P2)

Filtering by school year, over the record from `014`.

**Acceptance Scenarios**:

1. **Given** work recorded across two school years, **When** she filters by year,
   **Then** only learners she made something for in that year are shown.
2. **Given** a learner she has recorded but never made anything for, **Then** they
   appear under «sin trabajo todavía» rather than vanishing.

---

### User Story 4 - Two ways of looking, neither of them a ranking (Priority: P2)

A list, and a grouping.

**Why this priority**: This is where he asked for "distintos tipos de vistas", and
where the design has to say no to the obvious one.

**Acceptance Scenarios**:

1. **Given** the list view, **Then** each learner shows their barriers as the axis
   strip — visible, unranked, un-sortable.
2. **Given** the grouped view, **Then** learners are grouped by course, stage or
   school, and within a group the order does not encode anything about them.
3. **Given** any view, **Then** there is no ordering by axis value, no total, no
   average and no count of barriers per child.
4. **Given** any view, **Then** two learners' axis strips are never displayed as
   adjacent columns of the same table.

---

### Edge Cases

- **A learner who changed course between years.** The profile carries today's
  course; last year's work carries last year's. A year filter must use the work's
  year, not the profile's current course.
- **A teacher in two schools.** Common for itinerant PTs and for `orientadores`.
  School is per learner, not per teacher.
- **Forty learners, no course on any of them** — a vault that predates `011`.
  Grouping must degrade to one group, not to an empty screen.
- **A name that only differs after the fourth character.** Two Lucías.
- **The high-contrast and largest-text modes.** A filter bar is chrome, and chrome
  is what gets crushed first at `xlarge` — `013` FR-1115 applies here.

## Requirements *(mandatory)*

### Finding

- **FR-1301**: Search MUST match the display name and the code.
- **FR-1302**: Search MUST resolve names in memory. No name index, no search
  history, nothing written (`014` FR-1207).
- **FR-1303**: Filters MUST be combinable, visibly applied, and clearable in one
  action.
- **FR-1304**: A filter that matches nobody MUST name the filter responsible.

### Fields

- **FR-1305**: `school` MUST be an optional free-text field on the learner profile.
  Optional because a teacher in one school never needs it, and free text because a
  taxonomy of Spanish schools is a project of its own.
- **FR-1306**: `school` MUST join the never-sent set alongside the learner's name.
  It is not needed for any adaptation, and a school plus a course plus a set of
  barriers identifies a child far more sharply than a code does.
- **FR-1307**: `school` MUST appear in the erasure plan and be erased with the
  learner (`003`, `014` FR-1209).
- **FR-1308**: No new field about the learner MAY be added by this feature beyond
  `school`. Course, stage and age already exist (`011`); the school year comes from
  the work (`014`).

### Not a ranking

- **FR-1309**: No view MAY sort or order learners by any axis value, nor by any
  quantity derived from one.
- **FR-1310**: No view MAY present several learners' axis values as aligned columns
  of a single table.
- **FR-1311**: No view MAY show a total, average, count or score summarising a
  learner's barriers.
- **FR-1312**: The axis strip MUST keep reading as *what helps this child*, in the
  words of the corpus (`instructions/axes.md`,
  `docs/axis-calibration.md`), in every view it appears in (Principle V).

## Success Criteria *(mandatory)*

- **SC-1301**: With forty learners, a named learner is reached in under three
  seconds and at most two interactions.
- **SC-1302**: A learner missing a course, a school or an age is findable in every
  view.
- **SC-1303**: No file written by this feature contains a learner's name or school
  outside the encrypted map and the learner's own profile.
- **SC-1304**: A reviewer given the screens cannot construct a ranking of learners
  from anything the interface offers. Judged by a person against FR-1309..1312, and
  recorded.
- **SC-1305**: Every view holds at 560 px and at the largest text scale (`013`
  FR-1115).

## Assumptions

- Course, stage and age come from `011` and are not redefined here.
- School year comes from `014`'s record and is not stored on the profile — a
  learner is not "a 2025-2026 learner", their *work* has a year.
- Forty is the working ceiling for one teacher's caseload. Four hundred is the
  ceiling for the *record* (`014`), which is a different number and a different
  screen.

## Dependencies

- `014` — the record supplies the school year and «has she made anything».
- `011` — course, stage, age.
- `013` — the page shell, the data layer and the width rules these screens sit in.
