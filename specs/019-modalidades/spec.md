# Feature Specification: The other outputs — and the route she answers by

**Feature Branch**: `019-modalidades`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify`, then `/speckit-plan`

**Input**: Backlog **G8**, open and deliberate since 2026-08-27:

> «Audio, braille-ready text and ODT are named in the README and in `render.md`
> but specified nowhere. Deliberate — `001` scopes them out and the IR is designed
> so they need no re-adaptation.»

And half of backlog **G19**: the `MOT` axis — *how the learner answers* — has no
recipe family at all. «A profile with `MOT>=2` today selects zero recipes for the
response route and the model improvises from the hard rules alone.»

## Why these are one specification and not two

Principle IV says: *every output modality is a rendering of the same adapted IR.*
Audio, braille and ODT are that promise being kept.

`MOT` looks like a different problem — a recipe gap rather than a rendering one —
and it is not. «How does this child answer?» is a question about **the form the
document takes**: a sheet answered by pointing has answer boxes shaped for
pointing; a sheet answered by dictation has a different response space, or none;
a sheet answered on a computer is not a sheet.

Putting them together is also the honest scoping: doing audio without asking what
she does with a spoken worksheet produces a file nobody uses.

## The promise being tested

The IR was designed so a new modality needs **no re-adaptation**. That claim has
never been tested, because there has only ever been one renderer. This feature is
where it is either true or it is not, and finding out is worth as much as the
modalities are.

If a modality turns out to need the adaptation redone, that is a finding about the
IR and it belongs in `docs/ir.md`, not a reason to build a parallel pipeline —
Principle IV forbids one in so many words.

## What this is not

**Not a text-to-speech product.** Rampa produces a document meant to be listened
to; whether it is spoken by the operating system, by her player or by a service is
a rendering decision made where the render happens.

**Not braille.** Braille-ready text is not braille: it is a document with the
structure, the ordering and the notation a braille transcription needs, produced
for a transcriber or an embosser. Claiming to produce braille would be claiming an
expertise this project does not have and cannot check.

**Not a general export menu.** Every modality here has a learner it exists for. A
format nobody named is not in scope.

## Clarifications

### Session 2026-08-30

- **Q: Which modality is built first?** → **A: The editable export (ODT/Word)**
  (Carlos). Confirms US1's P1: the most users by a wide margin, and the one that
  makes every other feature safer — a teacher who can fix the last two words herself
  does not abandon a sheet that is 95% right.

- **Q: Is `MOT` part of this feature or corpus work?** → **A: Both, and the split is
  the point.** This specification says what the response route must achieve
  (FR-1716…1719); the recipes that achieve it are corpus under `recipes/core/`
  (backlog G19), written in Markdown by someone who knows how a child answers —
  Principle I.

- **Q: Does Rampa speak the audio itself?** → **A: No.** It produces an audio-*ready*
  document; what speaks it is the operating system, her player, or a service. A
  bundled speech engine is a large dependency and a per-language quality problem
  nobody here can judge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She edits it (Priority: P1)

The adapted worksheet opens in Word or LibreOffice and she changes two words.

**Why this priority**: It is the modality with the most users by a wide margin, it
is the one that exists in the README today, and it is the one that makes every
other feature safer — a teacher who can fix the last two words herself does not
abandon a sheet that is 95% right.

**Independent Test**: The exported document opens in LibreOffice and in Word with
its structure intact, is edited, and the edit survives back into the vault.

**Acceptance Scenarios**:

1. **Given** an adapted document, **When** she exports it, **Then** it opens in
   both LibreOffice and Word with headings, lists and exercise numbering intact.
2. **Given** she edits it and saves, **Then** `001`'s existing hand-edit path
   (T094) applies: the vault sees the change and the report is rebuilt from the
   file rather than from what we remember.
3. **Given** an unsigned document, **Then** the draft mark is in the exported file
   and survives being opened and saved elsewhere (Principle VII).
4. **Given** the export, **Then** it carries no learner data beyond the code
   (`006` FR-417…421), including in document metadata — the author field of an
   exported file is a place a name has escaped from other tools.
5. **Given** Pandoc is not installed, **Then** the export still works. `006` R12
   already decided the application cannot ship Pandoc.

---

### User Story 2 - He listens to it (Priority: P2)

A learner who cannot read the sheet gets it as audio, in the order it should be
heard.

**Why this priority**: Second because it depends on the ordering question below
being answered, and because a badly ordered audio worksheet is unusable in a way a
badly ordered visual one is not — she cannot skim it to find out.

**Acceptance Scenarios**:

1. **Given** an adapted document, **Then** an audio-ready rendering exists in which
   every block appears in the order it should be heard.
2. **Given** a figure with a description (`001` FR-011 territory), **Then** the
   description is what is spoken, and a figure without one is announced as
   undescribed rather than skipped.
3. **Given** an exercise with an answer space, **Then** the rendering says there is
   one, because silence where the page has a box is a missing question.
4. **Given** the draft mark, **Then** it is heard first. A draft that only announces
   itself visually does not announce itself to this learner (Principle VII).
5. **Given** any spoken rendering, **Then** the learner's code is not read aloud in
   a classroom.

---

### User Story 3 - It goes to the transcriber (Priority: P2)

A learner who reads braille gets a document a transcriber or an embosser can work
from.

**Acceptance Scenarios**:

1. **Given** an adapted document, **Then** a braille-ready rendering exists with a
   linear reading order, explicit structure, and no information carried by layout
   alone.
2. **Given** a table, **Then** it is linearised in a way that states what the
   original was, rather than being flattened into ambiguity.
3. **Given** anything that cannot be rendered honestly — a diagram, a spatial
   arrangement that carries the exercise — **Then** it is named as such for the
   transcriber, never silently dropped.
4. **Given** the output, **Then** it does not claim to be braille.

---

### User Story 4 - She answers the question «how does he answer?» (Priority: P1)

`MOT` finally does something. The learner dictates, or types, or points, and the
sheet is shaped for that.

**Why this priority**: P1 with the ODT, because it is a live defect rather than a
missing feature: a profile with `MOT>=2` today selects zero recipes and the model
improvises. The axis exists, the teacher sets it, and nothing reads it.

**Acceptance Scenarios**:

1. **Given** a profile with `MOT>=2`, **Then** at least one recipe applies to the
   response route, and the report says which.
2. **Given** a learner who answers by pointing, **Then** answer spaces are shaped
   for selection rather than for writing.
3. **Given** a learner who dictates, **Then** the sheet does not spend a third of
   its space on lines nobody will write on.
4. **Given** a learner who types, **Then** the exported document is one she can
   type into (US1's ODT, not a PDF).
5. **Given** any of these, **Then** what is asked is unchanged. A different
   response route is an access arrangement, never a different question
   (Principle III, `012` FR-1006).

---

### Edge Cases

- **A document with no describable figures** — the common case, and it must not
  produce a warning every time.
- **An exam** (`012`). Changing the response route in an exam is an access
  arrangement and needs to be named as one in the report, because that is the word
  the centre will use when it justifies it.
- **A learner who needs two modalities.** Audio for the text, ODT for the answers.
  N outputs from one adaptation is the whole point, so nothing may assume one.
- **Ordering when the visual layout was the point** — a matching exercise, a
  number line. This is where the IR's promise gets tested hardest.
- **A very long document as audio.** Whether it is one file or one per section is a
  decision, not an accident.
- **An ODT opened in Google Docs**, which is what a school with Chromebooks has.

## Requirements *(mandatory)*

### One IR, N renderings

- **FR-1701**: Every modality MUST render the same adapted IR with no
  re-adaptation and no second pipeline (Principle IV).
- **FR-1702**: Where a modality cannot be produced from the IR as it stands, that
  is a finding recorded in `docs/ir.md` and a change to the IR — never a
  modality-specific adaptation path.
- **FR-1703**: A modality that cannot be produced MUST degrade to fewer outputs
  with the reason named, never to a failed run (`001` FR-014).

### Editable

- **FR-1704**: An editable export MUST open in LibreOffice and in Microsoft Word
  with structure intact.
- **FR-1705**: It MUST NOT require Pandoc or any tool the application cannot ship
  (`006` R12).
- **FR-1706**: It MUST carry no learner data beyond the code, **including document
  metadata**.
- **FR-1707**: An unsigned document MUST carry the draft mark in the exported file,
  and it MUST survive a round trip through an editor (Principle VII).

### Heard

- **FR-1708**: An audio-ready rendering MUST have an explicit reading order.
- **FR-1709**: A figure MUST be spoken by its description; an undescribed figure
  MUST be announced as undescribed (`001` FR-011).
- **FR-1710**: An answer space MUST be announced.
- **FR-1711**: The draft mark MUST be heard first.
- **FR-1712**: The learner's code MUST NOT be spoken.

### Touched

- **FR-1713**: A braille-ready rendering MUST be linear, explicitly structured, and
  MUST carry no information in layout alone.
- **FR-1714**: Anything that cannot be honestly linearised MUST be named for the
  transcriber.
- **FR-1715**: Rampa MUST NOT claim to produce braille.

### Answered

- **FR-1716**: `MOT` MUST select recipes. An axis a teacher sets and nothing reads
  is worse than an axis that does not exist, because she believes she has told us.
- **FR-1717**: The response route MUST change the shape of the answer space and
  MUST NOT change what is asked (Principle III).
- **FR-1718**: In an exam, a changed response route MUST be named in the report as
  an access arrangement.
- **FR-1719**: A learner MUST be able to have several modalities from one
  adaptation.

## Success Criteria *(mandatory)*

- **SC-1701**: One adaptation produces every configured modality with zero
  re-adaptation and zero additional provider calls.
- **SC-1702**: An exported document opens in LibreOffice, Word and Google Docs with
  headings, lists and numbering intact.
- **SC-1703**: No exported file contains a learner name, in its body or in its
  metadata. Asserted by a test that reads the metadata.
- **SC-1704**: An unsigned export still announces itself after being opened, edited
  and saved in a word processor.
- **SC-1705**: A profile with `MOT>=2` selects at least one recipe, and the report
  names it.
- **SC-1706**: A blind learner's teacher, or a transcriber, says the braille-ready
  output is workable — the only test that counts, and it needs a person who does
  this work.
- **SC-1707**: The IR needed no modality-specific field to make any of this work,
  or the fields it needed are recorded in `docs/ir.md` as a correction to the
  claim.

## Assumptions

- ODT and DOCX are both worth producing if one of them is nearly free once the
  other exists; if not, ODT first, because LibreOffice is what a Spanish state
  school has.
- Audio means an audio-*ready* document plus whatever speaks it, not a bundled
  speech engine. A bundled engine is a large dependency and a per-language quality
  problem.
- `MOT`'s recipes are corpus work and belong in `recipes/core/` (G19); this
  specification says what they must achieve, not what they say.

## Dependencies

- Backlog **G7** — the output's own accessibility target — is a prerequisite in
  substance: three of these modalities exist for learners the target is about.
- `018` shares the text-alternative field.
- `005` — every modality multiplies by the number of learners, so the batch
  arithmetic in `005` FR-514 has to know about it.
