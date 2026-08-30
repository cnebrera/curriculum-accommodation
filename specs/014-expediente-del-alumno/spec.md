# Feature Specification: The learner's record — everything ever made, findable

**Feature Branch**: `014-expediente-del-alumno`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify`, then `/speckit-plan`

**Input**: Carlos, 2026-08-30:

> «creo que tiene sentido que todo lo que se suba y todo lo que se genere se quede
> ligado al alumno y almacenado en el directorio junto a la info del alumno…
> deberíamos poder ver todo lo que hemos generado para un alumno y poder recuperar
> tanto lo generado como el material o texto original (como una pequeña base de
> datos), así cuando iteremos cosas lo tenemos, o podemos decir ah esto lo hice el
> año pasado con este alumno, y buscarlo»

## What is actually missing, and what is not

The obvious reading of that sentence is "file everything under the learner". **That
reading is wrong, and acting on it would break the constitution.** The vault
already gets the hard part right:

```
material/<job>/ir.md            ← the extraction. ONE. Shared.
material/<job>/source/          ← the photograph or PDF she brought
material/<job>/<code>/adapted.md ← the adaptation. N of them, one per learner.
output/<job>/<code>/            ← what she prints
profiles/<code>/profile.yaml    ← who the learner is
```

That is Principle IV — one extraction, N outputs — expressed as directories, and it
was written that way on purpose after a defect where one `adapted.md` per job meant
adapting the same worksheet for a second learner overwrote the first.

Moving a source under a learner would undo it: the same worksheet photographed once
would need a copy per child, erasing one child would destroy another child's
source, and a page carrying a handwritten name would exist in four places instead
of one.

**So the files do not move.** What is missing is a *path from a learner to their
work*. Today the information exists and is unreachable: to answer "what have I made
for Lucía?" a teacher must open every `material/job-*/` directory and look for a
folder named `E38`.

This is the same shape as the finding in `003`, where `planForget` was written,
tested and exposed over IPC and no screen called it. Built, correct, unreachable.

## Clarifications

### Session 2026-08-30

Answered from the constitution and from specifications already written rather than
asked, each recording where the answer came from.

- **Q: When is `profiles/<code>/record.md` written?** → **A: When the work changes —
  a job completing, a sign-off, an erasure — and on an explicit rebuild. Never on
  opening a screen.** FR-1215 already forbids rewriting more often than the work
  changes; this names the events. Reading a learner must not touch a synced folder.

- **Q: Does the machine index under `.rampa/` exist in the first version?** → **A:
  No. Scan the vault.** FR-1214 permits a cache; SC-1207 demands 400 jobs without a
  perceptible wait, and reading front matter from 400 directories is milliseconds.
  A cache built before it is needed is a second copy of a truth that already has one
  — the defect this whole specification is written against. It gets added when a
  measurement asks for it, not before.

- **Q: Does an unsigned draft from three months ago appear in the record?** → **A:
  Yes, marked unsigned.** Hiding it would mean the one thing she cannot find is the
  thing she abandoned halfway, which is exactly what she is looking for when she
  comes back to it. Principle VII already requires it to announce itself; the record
  is one more place it must.

- **Q: What is «the original» for material composed from objectives (`002`)?** →
  **A: The objectives she asked for and the anchor that was used.** Already US2-3;
  recorded here because it is the case where «the original» has no file behind it
  and an implementation could reasonably conclude there is nothing to show.

- **Q: Where does the school-year boundary rule live?** → **A: In the education
  corpus (`011`), not in code.** September–June is right in Spain and wrong in the
  southern hemisphere. Already an assumption; promoted here so it is not rediscovered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She opens a learner and sees everything (Priority: P1)

She opens Lucía and sees every piece of material ever made for her, newest first,
with the date, what it was, and whether she signed it. Not a folder — a list.

**Why this priority**: It is the whole feature. Everything below is a way of
finding a row in this list faster.

**Independent Test**: A vault with three jobs for one learner and two for another.
Open each learner; each shows exactly their own work, and the shared job appears in
both.

**Acceptance Scenarios**:

1. **Given** a learner with adapted material, **When** she opens them, **Then**
   every job that produced an adaptation for that learner is listed, with its date,
   its kind (`012`), and whether it was signed off.
2. **Given** a worksheet adapted for two learners, **Then** it appears in both
   records, and each row links to that learner's own adaptation.
3. **Given** a learner with nothing yet, **Then** the record says so and offers the
   thing to do next, rather than showing an empty box.
4. **Given** a job that was ingested but never adapted for anybody, **Then** it
   appears in **no** learner's record — it belongs to nobody yet.

---

### User Story 2 - She gets back what she started from (Priority: P1)

From any row she can open three things: what she gave Rampa, what Rampa read, and
what came out.

**Why this priority**: «poder recuperar tanto lo generado como el material o texto
original». The original is the point — a year later the adapted sheet on its own
does not tell her what the class was doing.

**Independent Test**: For a job ingested from a photograph and one from a paste,
every one of the three opens.

**Acceptance Scenarios**:

1. **Given** a row from a photographed worksheet, **Then** she can open the
   photograph, the text Rampa read from it, and the adapted document.
2. **Given** a row from pasted text, **Then** the source and the read text are the
   same thing and the interface says so rather than showing an empty "original".
3. **Given** a row from composed material (`002`), **Then** the "original" is the
   objectives she asked for and the anchor that was used.
4. **Given** a row with several revisions (`001`), **Then** every revision is
   reachable and the current one is marked.
5. **Given** a file she deleted by hand in Finder, **Then** the row says that
   document is no longer there, and does not pretend to open it.

---

### User Story 3 - She finds the one from last year (Priority: P2)

«ah esto lo hice el año pasado con este alumno». She searches, filtered by school
year, by kind, by subject, or by words in the material itself.

**Why this priority**: It is what turns a list into the "pequeña base de datos" he
asked for. Second because a correct list she can scroll is already most of the
value at twenty entries; search is what makes it hold at four hundred.

**Independent Test**: A vault with two school years of work; a search restricted to
the earlier year returns only that year's rows.

**Acceptance Scenarios**:

1. **Given** a search term, **Then** rows are matched on the material's own text,
   its title, its subject and its objectives.
2. **Given** a school-year filter, **Then** only work recorded in that year is
   shown.
3. **Given** a search that matches nothing, **Then** she is told which filter to
   loosen, not shown a blank panel.
4. **Given** a search, **Then** no learner's name is used as an index key anywhere
   on disk — see FR-1207.

---

### User Story 4 - Her folder still makes sense without Rampa (Priority: P2)

She opens the vault in Obsidian and the learner's folder tells her the same story.

**Why this priority**: It is the promise the vault makes (`006`), and Carlos works
in Obsidian himself. A record that only exists inside the application is a record
she loses the day the application does not open.

**Acceptance Scenarios**:

1. **Given** the vault in a Markdown editor, **Then** `profiles/<code>/record.md`
   lists the same work with relative links that resolve.
2. **Given** that file deleted, **When** she reopens the learner in Rampa,
   **Then** the list is identical and the file is written again.
3. **Given** that file edited by hand, **Then** Rampa does not read her edits back
   as truth, and says the file is regenerated.

---

### Edge Cases

- **The same worksheet, two years running.** She photographs it again. Two jobs,
  two rows, both dated. Not deduplicated: the second one may have been adapted
  differently because the child changed, and that is the history she is asking for.
- **A learner erased** (`003` US4). Their record, their adaptations and their
  renders go. A shared source stays as long as any other learner still references
  it, and goes when the last one does.
- **A vault on OneDrive or Drive.** Two machines, one folder. A record file written
  on every keystroke is a conflict generator.
- **A job whose learner code no longer exists** — she erased the learner but the
  directory survived a crash. The scan must not fail on it.
- **Four hundred jobs.** Opening a learner must not read four hundred files before
  it can draw a list.
- **Work from before this feature existed.** Every current vault has adaptations in
  it. If the record can only be built going forward, this feature launches with the
  history it exists to show already lost.

## Requirements *(mandatory)*

### Where things live

- **FR-1201**: Source material MUST NOT be moved or copied under a learner. One
  extraction is shared by every learner adapted from it (Principle IV).
- **FR-1202**: A learner's record MUST be **derived** from the vault's contents. It
  is a view, not a store. Where the record and the filesystem disagree, the
  filesystem is right.
- **FR-1203**: Every piece of work MUST record, at the moment it is created: the
  date, the school year, the material kind (`012`), the learner codes it was
  adapted for, and — where it applies — the subject and the objectives (`002`).
- **FR-1204**: The record MUST be reconstructible from a vault that has never been
  opened by this feature, so existing work appears the day it ships.

### Getting back to the original

- **FR-1205**: Every entry MUST resolve to the source she supplied, the text Rampa
  read, and each adapted output including superseded revisions.
- **FR-1206**: A document that is missing from disk MUST be reported as missing.
  A record that silently drops rows for files it cannot find would erase her
  history to keep its own list tidy.

### Names, and the line they do not cross

- **FR-1207**: No index, cache or record file MAY contain a learner's name. The key
  is the code; the name is resolved for display from the encrypted map and never
  written beside it. **A plaintext search index containing names is a second copy
  of the name map without its encryption** — which is the one thing the whole
  substitution design exists to prevent.
- **FR-1208**: Searching by the name she sees MUST still work, by resolving names
  in memory at search time.

### Erasure

- **FR-1209**: Erasure (`003` FR-215/216) MUST extend to the record, the learner's
  adaptations, their renders and their index entries.
- **FR-1210**: Erasure MUST NOT remove a source another learner still references,
  and MUST remove one that nobody references any more.
- **FR-1211**: The erasure plan MUST show all of this *before* it acts, including
  which shared sources will survive and why (`003` already requires the sentence;
  this extends what it must cover).

### Being a folder, not a database

- **FR-1212**: `profiles/<code>/record.md` MUST be written as plain Markdown with
  relative links that resolve in a Markdown editor.
- **FR-1213**: The application MUST NOT read that file back as a source of truth.
  It is written for her and regenerated; treating it as input would make it the
  second copy of a truth that already has one, which is this project's recurring
  defect.
- **FR-1214**: Any machine-side index MUST live under `.rampa/`, MUST be a cache,
  and MUST be rebuildable by deleting it.
- **FR-1215**: The record MUST NOT be rewritten more often than the work changes,
  so a synced vault does not generate conflicts from reading a screen.

## Success Criteria *(mandatory)*

- **SC-1201**: A teacher opens a learner and sees every piece of material ever made
  for them, without opening a single folder.
- **SC-1202**: Every row opens its source, its read text and its output; a row
  whose file is gone says so instead of failing.
- **SC-1203**: Deleting `profiles/<code>/record.md` and `.rampa/`'s index, then
  reopening the learner, produces an identical list.
- **SC-1204**: A vault created before this feature shows its full history on first
  open.
- **SC-1205**: Erasing learner A leaves learner B's adaptation of a shared
  worksheet, and B's access to its source, intact.
- **SC-1206**: Zero learner names appear in any file outside the encrypted map.
  Asserted by a test that greps the vault after a full run.
- **SC-1207**: Opening a learner in a vault of 400 jobs draws the list without a
  perceptible wait.

## Assumptions

- A **school year** is recorded explicitly when work is created, defaulting to one
  derived from the date. The derivation rule (September–June in Spain) belongs to
  the education corpus of `011`, not to code, because it is wrong in the southern
  hemisphere and in several systems Rampa will meet later.
- The subject is not a new taxonomy. Where `012` or `002` already carry one, the
  record uses it; where they do not, the row simply has no subject.
- «Base de datos» in Carlos's sentence means *findable history*, not a database
  engine. Introducing one would put the truth somewhere the teacher cannot read,
  which `006` decided against.

## Dependencies

- `012` (material kinds) supplies `kind`; a record can be built before `012` ships,
  with every row reading «material».
- `011` supplies course and stage.
- `002` supplies objectives and the anchor for composed material.
- `003` owns erasure and is extended here rather than duplicated.
