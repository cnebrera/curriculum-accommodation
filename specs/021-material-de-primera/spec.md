# Feature Specification: Lo compuesto también es material

**Feature Branch**: `021-material-de-primera`

**Created**: 2026-09-01

**Status**: Draft

**Input**: Carlos, after using the application to compose material for a learner:

> «vale he preparado material, pero no hay visualizador o botón de descarga ni del que he
> preparado ni del del profesor… y además solo me ha dicho de preparar fichas, si quiero
> preparar material de estudio, o exámenes u otra cosa cuando le digo que le digo yo que
> quiero que aprenda? como lo hago? y donde está la parte de iterar el material? no veo
> chat ni nada…»

## Three complaints, one cause

Everything Rampa can do **to** a document — print it, export it to PDF or ODT, produce
the audio-ready or braille-ready text, sign it off, and iterate on it with a correction
— reads `material/<job>/<learner>/adapted.md`.

So a document that has been **composed and not yet adapted** exists in her folder and
there is not one thing she can do with it inside the application. It cannot be viewed,
printed, exported, signed or corrected. It is material of the second class, and she
found that out with a sheet she wanted for tomorrow.

**This is Principle IV failing on its own terms.** «One extraction, N outputs» says every
modality is a rendering of the same document. Today one composition has **zero** outputs
until it passes through an adaptation it may not need — because it was already written
for that child, from his objectives, at his level.

The other two complaints are the same fault seen from other angles: the answer key and
the composition report are written to disk and reachable only from the record screen, and
iterating is possible only after adapting.

## What this feature is not

**The conversation.** «No veo chat ni nada» is a real gap and it is `022`: iterating by
talking to Rampa about a document needs its own thinking about cost per turn, versioning
and what happens to a verified answer key when the exercises change. What `021` does is
make the **correction box that already exists** reachable from composed material.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seeing and printing what she just made (Priority: P1)

She composes a worksheet for Lucía from «multiplicar con llevadas». It is finished, at
Lucía's level, and it is what she needs for tomorrow. She reads it on screen, prints it,
and takes the answer key with her — without adapting anything, because it was composed
for Lucía in the first place.

**Why this priority**: It is the complaint, and without it composing produces a file she
cannot use. A feature that writes a document nobody can open is not finished.

**Independent Test**: Compose material, then view, print and export it, and open the
answer key — all without running an adaptation.

**Acceptance Scenarios**:

1. **Given** she has just composed material, **When** she looks at the summary, **Then**
   she can open the sheet, the answer key and the composition report from there.
2. **Given** composed material she has not adapted, **When** she asks for it on paper,
   **Then** she gets it, with the draft mark, and no adaptation is run.
3. **Given** composed material, **When** she exports it, **Then** every modality that
   works on adapted material works on this too, or says specifically why not.
4. **Given** she is looking at a document, **When** she reads it on screen, **Then** she
   sees the document as it will print and is not sent to another application to read it.
5. **Given** she has read it and it is right, **When** she signs it off, **Then** the
   draft mark goes — and it is her signature on the composed sheet, with no adaptation
   in between.

---

### User Story 2 - Saying what kind of material she wants (Priority: P2)

She wants a short study text about the water cycle, not a worksheet. She says so, at the
start, in the same words the application uses everywhere else. Another day she wants an
exam, and she gets one — as a draft she has to read, with Rampa refusing to be the one
who decides what it is worth.

**Why this priority**: «Solo me ha dicho de preparar fichas» is a real limit and it was
invisible: the kind is derived from what came out, silently, and `exam` was unreachable.

**Independent Test**: Ask for each of the four kinds and get material of that kind, with
the interface using that word from the moment she chooses it.

**Acceptance Scenarios**:

1. **Given** she is asking for material from objectives, **When** the first step opens,
   **Then** she is asked what kind of material she wants, with nothing pre-chosen.
2. **Given** she asked for a study text, **When** it is produced, **Then** it is a study
   text and every screen calls it that.
3. **Given** she asked for an exam, **When** it is produced, **Then** it carries the
   draft mark, says that she is the one who validates every question, and says that a
   different exam for one learner is a decision for the teaching team.
4. **Given** she asked for an exam, **When** she looks for a mark scheme, **Then** there
   is none: Rampa does not say what an answer is worth.
5. **Given** what came out does not match what she asked for, **When** she reads the
   report, **Then** it says so plainly instead of relabelling the material.

---

### User Story 3 - Correcting composed material without adapting it (Priority: P3)

The composed sheet is nearly right: one exercise is too long. She says so, the same way
she does after an adaptation, and gets a new version — without adapting for a learner she
has already named.

**Why this priority**: It completes the story, and it is deliberately the smallest of the
three: the correction box, the scope question and the re-run all exist. What is missing is
that they only exist downstream of an adaptation.

**Independent Test**: Compose, correct, and get a second version, with the first kept.

**Acceptance Scenarios**:

1. **Given** composed material, **When** she says what to change, **Then** she is asked
   who it applies to exactly as she is after an adaptation, and nothing infers it.
2. **Given** she has corrected it, **When** the new version is written, **Then** the
   previous one is kept and the answer key is regenerated with it.
3. **Given** an exam or a problem sheet, **When** a correction would change a quantity or
   an operation, **Then** the answer key is verified again before she is shown anything.

### Edge Cases

- **Material composed for a learner who has since been erased.** The sheet is in the job,
  not in the learner's directory; erasure must still take what belongs to him (`003`).
- **She signs off composed material and then corrects it.** A signature is about a
  document, so the new version is not signed.
- **An exam whose answer key could not be fully verified.** What could not be checked is
  named before she can print it, not after.
- **She asks for a study text and the objectives are bare arithmetic.** There is nothing
  to write a text about; saying so is better than producing prose around sums.
- **Composed material for several learners.** The composition is one; adapting it for
  three is `005`, unchanged.
- **A document with a figure that cannot be described.** Printing must fail the same way
  it fails for adapted material (`007` FR-511), not more quietly.
- **The vault holds composed material from before this feature.** It becomes viewable and
  printable with no migration and no re-composition.

## Requirements *(mandatory)*

### Functional Requirements

#### Everything Rampa produces is a document she can use

- **FR-1901**: Viewing, printing, exporting, signing off and correcting MUST work on
  composed material that has never been adapted.
- **FR-1902**: Every output modality that works on adapted material MUST work on composed
  material, or MUST name the specific reason it cannot. «It is not adapted» is not a
  reason: Principle IV says a modality is a rendering of a document.
- **FR-1903**: The answer key and the composition report MUST be reachable from the
  moment they exist, at the place she is standing when they are written — not only from
  the record.
- **FR-1904**: The draft mark and its removal MUST behave identically on composed and
  adapted material (Principle VII). Signing off MUST stay the only thing that removes it.
- **FR-1905**: A composed document MUST be readable **inside** the application, showing
  what will print. Editing it is still done in her own folder: the vault is hers, and
  Rampa is a guest in those files.
- **FR-1906**: No feature in this specification MAY require an adaptation to have been
  run, and none MAY start one on its own.

#### She says what kind of material she wants

- **FR-1907**: Asking for material from objectives MUST ask what kind it is, with nothing
  pre-selected (`012` FR-1001, `016` FR-1403).
- **FR-1908**: The four kinds MUST be offered, **including exams**, read from the material
  corpus rather than from a list inside the interface (Principle I).
- **FR-1909**: The chosen kind MUST govern what is produced and MUST be the word every
  screen uses from then on (`016` FR-1402/FR-1404).
- **FR-1910**: Where what was produced does not match what she asked for, the report MUST
  say so. Relabelling the material to match the request is falsifying the *what*
  (Principle III).

#### What Rampa may not do with an exam it wrote

- **FR-1911**: A composed exam MUST carry the draft mark and MUST state that she
  validates every question. It is the one output where «looks finished» is most dangerous.
- **FR-1912**: A composed exam MUST state that giving one learner a different assessment
  is a decision for the teaching team, and that Rampa has not made it.
- **FR-1913**: Rampa MUST NOT produce a mark scheme, weightings, a pass mark, or any
  statement of what an answer is worth. Deciding what a child's answer is worth is not a
  thing this application does.
- **FR-1914**: Rampa MUST NOT mark, score or correct a learner's answers, in this feature
  or through it.
- **FR-1915**: A composed exam's answer key MUST be verified by the same deterministic
  checks as any composed material, and whatever could not be verified MUST be named
  **before** she can print it (`002`, Principle II).

#### Correcting without adapting

- **FR-1916**: She MUST be able to correct composed material and get a new version,
  without an adaptation being involved.
- **FR-1917**: A correction MUST ask her who it applies to — this learner, her practice,
  or the rules — and MUST NOT infer it (Principle VIII).
- **FR-1918**: Previous versions MUST be kept (`001`).
- **FR-1919**: When a correction changes a quantity or an operation, the answer key MUST
  be regenerated and re-verified before she is shown the result. A stale key is worse than
  no key.
- **FR-1920**: A signature MUST NOT survive a correction.

### Key Entities

- **Document**: what Rampa produced for a job — composed or adapted. The thing every
  output renders and every signature is about. Today only the adapted one is treated as
  one; that is the defect.
- **Answer key**: the teacher's copy, verified, and **never** on the learner's sheet
  (`002`). Belongs to the composition, not to a learner's adaptation.
- **Material kind**: one of four, chosen by her, read from the corpus. Governs what may
  and may not change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-1901**: Composed material can be read, printed and exported with **zero**
  adaptations run and zero provider calls made.
- **SC-1902**: Every modality available on adapted material is available on composed
  material, or has a named reason recorded in the specification's own coverage.
- **SC-1903**: From the moment material is composed, the answer key is reachable in one
  action.
- **SC-1904**: All four kinds can be asked for from objectives, and the word she chose
  appears on every subsequent screen.
- **SC-1905**: No output anywhere in the application states what a learner's answer is
  worth. Checked as an absence across every rendering.
- **SC-1906**: A composed exam that a teacher reads either gets used or gets rejected for
  a reason she can name — **needs a teacher, and it is the criterion that matters most in
  this feature.**
- **SC-1907**: Correcting composed material produces a new version and keeps the old one,
  with the answer key re-verified whenever a quantity changed.

## Assumptions

- **Printing composed material needs no learner-specific presentation.** It was composed
  at that learner's level from his objectives; the presentation rules of `007`/`019` apply
  to it as they do to anything else.
- **The viewer is read-only.** Editing stays in her folder — Rampa is a guest in those
  files, and a second editor would be a second place for the document to diverge.
- **The exam limits are stated on the document, not just in the interface.** A printed
  page outlives the screen it was made on.
- **No new provider call is introduced by any of this.** Viewing, printing and exporting
  are deterministic; only a correction spends money, exactly as it does today.
- **`002`'s derivation of the kind becomes a fallback**, for material composed before this
  feature and for a vault that has documents in it already.
- **The conversation is `022`.** This feature makes the existing correction box reachable
  and does not build a chat.
