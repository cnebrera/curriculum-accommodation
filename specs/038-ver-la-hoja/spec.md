# Feature Specification: Ver la hoja

**Feature Branch**: `038-ver-la-hoja`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: «`npm run shots` fotografía veinte pantallas de la
aplicación y ninguna hoja. Se descubrió imprimiendo el primer PDF generado por un
modelo real: salió legible, contrastado y fotocopiable, y con el aspecto de un
documento técnico, y nadie lo había visto nunca.»

## Why this specification exists

**This project deliberately has no pixel-diff suite, and the thing it put in that
suite's place does not cover the product.**

ADR 0009 rejected pixel diffing with its reasons written down — it would fail on every
intentional change, get updated without being read, and end up asserting whatever the
last commit produced. `013` FR-1114 records the refusal as a requirement satisfied by
absence. What went in its place is a rule in AGENTS.md, and it is the only rule in this
repository that is not a test:

> **And the one that is not a test: look at it.** Run `npm run shots` and open the
> screenshots. Every test `010` produced checks a *property* — a contrast ratio, an
> absence of overflow, a present label — so the suite passed on screens that were
> correctly coloured, correctly labelled and ugly, for a whole feature, because nobody
> rendered them.

`app/scripts/screenshot.mjs` captures onboarding, the caseload, Configuración, three
learner sections, seven widths and two themes. Around twenty images, and **every one of
them is application chrome**. There is no sheet in the record.

So the rule that exists because appearance cannot be tested is not applied to the one
artefact that leaves the building. `006` ADR 0006 says there is one delivery vehicle
and it is the application; the thing the application delivers is a sheet of paper a
child holds in a classroom.

### What that cost, measured

On 2026-09-09 the first PDF produced by a real model over a real key was printed and
looked at for the first time. Three defects were in it that no test could see, and all
three had been shipping:

| | |
|---|---|
| **G74** | The exercise number printed twice — «1.» and under it «1. 3 × 6 = 18» |
| **G75** | Four-space continuation lines became markdown **code blocks**: monospace, emphasis asterisks printed raw, and the line running off the card because `<pre>` does not wrap. A child received a sentence cut mid-word |
| **G76** | The sheet named Atkinson Hyperlegible and embedded no `@font-face`, so the PDF came out in **Verdana**. The face `010` chose for legibility, bundled for the application's own interface, never reached paper |

Every one of them is visible in two seconds to a person holding the page, and invisible
to 2 526 passing tests. That is the definition of the gap this specification closes.

And a fourth thing, which is not a defect and is why this spec goes first: after those
three were fixed the sheet still did not look like school material. Deciding what it
should look like is `040`. **`040` cannot be reviewed without this.** If the instrument
shipped inside the appearance feature it could not have been used to review that
feature's own corpus, which is `013`'s failure repeated one level down.

### What already exists, and must be reused rather than rebuilt

`app/e2e/sheet-a11y.spec.ts` already renders a sheet: it writes `renderHTML(...)` to a
temporary file and loads it in a hidden `BrowserWindow` to run axe over it. From there
to a captured page is one call. `037` FR-3512 (no new dependency) and FR-3511 (the
viewer's sandbox is not touched) already govern that path and continue to.

## Clarifications

### Session 2026-09-10

Three ambiguities were found by the scan. All three were resolved from decisions this
repository has already recorded, so none was put to a person — which is the right
outcome when the answer is in the repo and the wrong one when it is not.

- Q: In what form is a sheet captured, given that a scrolling screenshot cannot show
  pagination? → A: **A printable page is the artefact of record; a first-page image is
  captured beside it for scanning.** What fooled everybody was six pages for six
  exercises, and that is invisible in a screenshot. But all three defects the first
  printed PDF revealed (G74, G75, G76) were visible on **page one**, so the cheap image
  catches that whole class and the page is what settles pagination.
- Q: Where does the record live, and is it committed? → A: **Beside the existing record,
  and committed.** Already decided: `.gitignore` carries the sentence «the record is
  `docs/screenshots/`, which is committed on purpose», and 44 files are tracked there.
  This feature follows that rather than inventing a second convention.
- Q: Does the record cover the other output modalities — the editable document, and the
  braille-ready and audio-ready text? → A: **No, and the reason is a boundary rather
  than laziness.** This record is what a child receives **on paper**. The editable
  document needs a converter that may not be installed, and the linear modalities are
  read rather than looked at, so a picture of them proves nothing. Both belong to `019`
  and are reviewed where those renderers are. **Consequence worth naming:** the
  editable document carries no presentation at all today, so `040`'s parity work has no
  review surface in this record and will need its own.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Somebody looks at the sheet before it reaches a child (Priority: P1)

Whoever is about to change how a sheet is produced — a contributor, the maintainer,
eventually a PT looking at the rehearsal — runs one command and opens a small set of
sheets. Not properties of sheets: the pages themselves, paginated, in the presentations
the axes actually produce.

**Why this priority**: it is the whole feature, and it is the precondition for `039`,
`040` and `041` being reviewable at all. Without it the only way to judge appearance is
the way that already failed twice: a suite of property tests, all green.

**Independent Test**: run the command on a clean checkout with no API key and no
network, and open what it wrote. Nothing else in the repository has to change for that
to be valuable.

**Acceptance Scenarios**:

1. **Given** a clean checkout with no provider key, **When** the record command is run,
   **Then** sheets are written beside the existing application screenshots, and the
   command says how many and where.
2. **Given** the record, **When** a person opens the worksheet at the largest visual
   presentation, **Then** they can see the pagination, the typeface, the answer space
   and the draft mark as a child would receive them.
3. **Given** a change to how sheets are rendered, **When** the record is regenerated,
   **Then** the difference is visible to a person opening two files — and **nothing
   fails, and nothing is compared automatically**.

---

### User Story 2 - The record covers what the renderer can actually do (Priority: P2)

The set is not one sheet. It covers the material kinds that render differently and the
presentations the axes produce, so a change that only shows up for one learner is still
in the record.

**Why this priority**: a record of one sheet would have caught G75 and missed the ODT
size mismatch, the `PER-V` scaling of diagrams, and everything `040` is about. Coverage
is what makes the record worth opening.

**Independent Test**: count the files against the presentations the renderer declares;
every presentation the code can produce has a picture.

**Acceptance Scenarios**:

1. **Given** the presentations the renderer derives from axis levels, **When** the
   record is produced, **Then** each of them appears, and the file names say which is
   which without opening the script.
2. **Given** a learner with no pictogram set installed, **When** the pictogram sheet is
   captured, **Then** it renders with the named gap rather than failing (`018` FR-1616).
3. **Given** a new presentation added to the renderer, **When** the record is produced,
   **Then** it appears without anyone editing a list of presentations by hand.

---

### User Story 3 - Signed and unsigned are both in the record (Priority: P3)

The draft mark is the difference between a sheet nobody has read and a sheet a person
signed for. Both states are captured, because the mark is a designed thing and the only
way to know it reads correctly is to look at it.

**Why this priority**: `010` FR-821/822/823 and SC-807 all turn on the mark being
unmistakable in print, and SC-807 is judged by a teacher looking at a page. Today there
is no page to show her.

**Independent Test**: two files, one with the banner and watermark and one without, both
openable without running the application.

**Acceptance Scenarios**:

1. **Given** an unsigned sheet, **When** it is captured, **Then** the banner and the
   per-page watermark are visible on every page.
2. **Given** the same sheet signed off, **When** it is captured, **Then** neither
   appears, and the difference between the two files is obvious at a glance.

---

### Edge Cases

- **No pictogram set installed.** Pictograms are hers and Rampa ships none (`023`
  FR-2101). The pictogram sheet must still be captured, showing the named gap.
- **A presentation that produces an ugly or broken sheet.** The record must capture it
  as it is. A record that hides its worst case is worse than none — that is the failure
  ADR 0009 predicted for a pixel-diff suite whose baselines get updated unread.
- **The hand-authored sample changes.** `sample/ensayo` is reviewed corpus and pinned by
  `035`'s tests. The record follows the sample; it does not carry a second copy of it.
- **Two records taken minutes apart.** They must not differ for reasons that are not
  the sheet — a date, a temporary path or a random id rendered into the page would make
  every regeneration look like a change and teach people to ignore it.
- **A machine with no LibreOffice.** The ODT conversion check is a separate concern
  (`019`); this record must not depend on it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-3601**: The screenshot record MUST include rendered sheets, alongside the
  application screens it already captures, produced by the same command.
- **FR-3602**: The set MUST cover the material kinds that render differently: a
  worksheet, an assessment, a sheet carrying pictograms, and a structure strip
  (`028`).
- **FR-3603**: Sheets MUST be captured in every presentation the renderer derives from
  axis levels, and the set of presentations MUST be **derived from the same source the
  renderer uses** rather than duplicated as a list in the record script.
- **FR-3604**: The record MUST NOT compare its output against anything, MUST NOT fail a
  build, and MUST NOT become a pixel-diff suite. `013` FR-1114 forbids the last, and
  this feature does not reopen it.
- **FR-3605**: The record MUST reuse the existing sheet-rendering path. It MUST NOT add
  a dependency (`037` FR-3512) and MUST NOT alter the viewer's sandboxing (`037`
  FR-3511).
- **FR-3606**: The material rendered MUST be the reviewed hand-authored sample
  (`sample/ensayo`), not material invented inside the record script — for the same
  reason `035` gives: an example generated by a machine to show what a machine does
  demonstrates nothing.
- **FR-3607**: The record MUST use an invented learner and MUST NOT read, write or
  render anything from a real vault. Nothing about the learner may appear on a captured
  sheet (hard rule 11, `007` FR-506/507).
- **FR-3608**: Each captured file MUST be named so a person can tell what it is —
  material kind, presentation, and signed state — without opening the script.
- **FR-3609**: A captured sheet MUST be the same rendering a teacher would print: the
  same renderer, the same options, the same draft mark. The record MUST NOT have a mode
  of its own that produces a sheet nobody can receive.
- **FR-3610**: Both the unsigned and the signed state MUST be captured (`010`
  FR-821/822/823).
- **FR-3611**: The record MUST capture each sheet as a **printable page**, so that where
  a presentation breaks pages (`one-task-per-page`) the resulting page count is visible.
  A first-page image MUST be captured beside it, because the defects that motivated this
  feature were all visible on page one and an image is faster to scan than a document.
- **FR-3616**: The record MUST be written to the directory the project already treats as
  its record, and MUST be committed there. `.gitignore` already states that decision and
  its reason; this feature does not introduce a second convention.
- **FR-3617**: The record covers what a child receives **on paper**. The editable
  document and the braille-ready and audio-ready texts are out of scope: the first needs
  a converter that may be absent, and the last two are read rather than looked at.
  Reviewing those belongs to `019`.
- **FR-3612**: The record MUST be producible offline, with no provider key and no
  network access.
- **FR-3613**: The command MUST report how many sheets it wrote and where, so a person
  knows what to open.
- **FR-3614**: Two runs over unchanged inputs MUST produce sheets that differ only where
  the sheet differs. Values that would change every run — a date, a temporary path, an
  identifier — MUST NOT reach a captured sheet.
- **FR-3615**: When the appearance corpus of `040` exists, its bands MUST enter this
  record by being derived, not by extending a hand-written list. Until then the record
  covers axis presentations only, and says so.

### Key Entities

- **Record set**: the collection of files a run produces. Its members are named, not
  numbered, and its size is small enough that a person opens all of them.
- **Presentation**: a combination of typography, spacing, colour and page-breaking that
  the renderer derives from axis levels. Already an entity in the system; this feature
  enumerates it rather than defining it.
- **Sample material**: the hand-authored, reviewed worksheet and its adaptation that
  `035` ships for the rehearsal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3601**: A person with a clean checkout and no API key runs one command and, in
  under two minutes, is looking at sheets.
- **SC-3602**: Shown the record and asked what is wrong with a sheet, a person who has
  never read this repository names something real. Recorded verbatim, including when it
  is unflattering — the same protocol as `010` SC-805.
- **SC-3603**: Every presentation the renderer can produce is represented in the
  record. Verified by counting, and the count is not maintained by hand.
- **SC-3604**: Of the three defects the first printed PDF revealed (G74, G75, G76),
  **all three are visible** in the record produced by this feature. This is the
  retrospective test of whether the instrument works, and it can be run today because
  the defects and their fixes are both in the history.
- **SC-3605**: A contributor changing the renderer regenerates the record and points at
  the difference without being asked to.
- **SC-3606**: No sheet in the record contains a learner code, name, age, year, stage
  or school. Checked by the existing output check, over the captured document.

## Assumptions

- **The record is for a person, and nothing judges it.** ADR 0009 and `013` FR-1114
  settle this. It is deliberately not in CI: a record that fails a build becomes a
  baseline somebody updates without looking, which is the failure ADR 0009 named.
- **The captured form is a printable page rather than a screen.** What fooled everybody
  was pagination — six pages for six exercises — and that is invisible in a screenshot
  of a scrolling document. A screen-shaped capture may be produced as a convenience,
  but the page is the artefact that matters.
- **The presentation matrix applies in full to one representative kind**, with one
  capture of each other kind at its default presentation. Four kinds times five
  presentations times two signed states is forty files, which nobody opens; around ten
  is a set a person actually reviews. This is a judgement about human attention and it
  is recorded as such.
- **`sample/ensayo` stays hand-authored and reviewed**, and this feature reads it rather
  than copying it.
- **The appearance corpus does not exist yet.** FR-3615 is written for `040` and is
  satisfied today by the derivation being in place, not by bands existing.
- **The existing screenshot record keeps working.** This feature adds to
  `npm run shots`; it does not replace what it already captures.
