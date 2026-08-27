# Feature Specification: The application — a vault a teacher owns, over a corpus they don't

**Feature Branch**: `006-desktop-app`

**Created**: 2026-08-27

**Status**: Draft

**Input**: A desktop application over an open folder of the teacher's own files,
with the corpus shipped read-only, and the teacher's own AI key. Decided in
[ADR 0005](../../docs/decisions/0005-delivery-vehicle.md).

## The constraint that shapes everything

**The test user has never used AI, and nobody will be sitting next to her.**

That is not context, it is the specification. Every requirement here is written
against a teacher who opens the application knowing nothing about models, keys,
prompts or markdown, and who will close it for good if the first ten minutes do
not work.

This means the usual order is inverted: **onboarding is not polish applied at the
end, it is the feature most likely to fail.** A perfect adaptation engine behind
a setup screen she abandons has produced nothing.

## Two layers, two treatments

| Layer | Whose | Visible? | Editable? |
|---|---|---|---|
| **Vault** — learners, notes, house style, adapted material | The teacher's | Yes, an open folder of markdown | Yes, by hand, in any editor |
| **Corpus** — recipes, instructions, templates | The project's | No | No. Updated by a button |

The test that decides which is which: *is the file worth anything without the
model?* A teacher's notes on a learner are — they are the professional record she
already keeps. A recipe is not.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She gets from installer to adapted worksheet alone (Priority: P1)

A teacher who has never used AI downloads the application, installs it, connects
it, describes a learner, feeds it a worksheet, and prints an adapted one. Nobody
helps her. She reads no documentation.

**Why this priority**: This is the whole feature. Everything else in this spec
exists to make this journey survivable.

**Independent Test**: Hand the installer to a teacher who has not seen the
project, say nothing, and watch. Every place she hesitates is a defect.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** she opens it, **Then** she is asked where
   to keep her files, with a sensible default she can accept without deciding.
2. **Given** the connection step, **When** she reaches it, **Then** she is told in
   one plain sentence what is needed and why, given a direct link to the exact
   page, a single box to paste into, and — on success — confirmation in the terms
   she cares about: **"✓ Conectado. Unos 3 céntimos por ficha."**
3. **Given** she closes the app mid-setup, **When** she reopens it, **Then** she
   resumes where she stopped and loses nothing.
4. **Given** a first learner, **When** she answers the guided questions in her own
   words, **Then** a profile exists without her having seen an axis code.
5. **Given** a photographed worksheet, **When** she adapts it, **Then** she gets
   material she can print and a plain-language summary of what changed.
6. **Given** the whole journey, **When** measured, **Then** it completes in under
   30 minutes including setup, and under 15 for every worksheet after the first.

---

### User Story 2 - The name never leaves the machine (Priority: P1)

She types "Lucía" because that is how she thinks. The model never sees it.

**Why this priority**: This is the promise the harness could not keep, and the
main reason to build an application at all.

**Independent Test**: Log every outbound request during a full session in which
the teacher uses a real first name throughout. The name must appear zero times.

**Acceptance Scenarios**:

1. **Given** a learner, **When** she names them, **Then** the name is stored
   encrypted, outside anything a share or handover exports, and a code is
   generated for the files.
2. **Given** any outbound request, **When** it is built, **Then** known names are
   replaced by codes, in typed text as well as in stored fields.
3. **Given** she types a name the system does not know, **When** it is detected as
   a probable name, **Then** she is asked before sending — never silently.
4. **Given** the interface, **When** she reads it, **Then** she sees "Lucía"
   everywhere. The substitution is invisible to her.
5. **Given** the vault is shared or backed up, **When** it is, **Then** it carries
   no names in readable form.

---

### User Story 3 - Her notes are hers (Priority: P1)

The vault is plain markdown in a folder. She can open it in Obsidian, in Word, in
Notepad, back it up by copying it, and read it in ten years without this
application.

**Why this priority**: It is what makes the tool safe to adopt. A teacher who
believes her records are trapped inside a program will not put real work into it.

**Acceptance Scenarios**:

1. **Given** the vault, **When** opened in any text editor or in Obsidian,
   **Then** every file is readable prose and the structure is obvious.
2. **Given** a file edited by hand outside the app, **When** the app next reads
   it, **Then** the change is picked up.
3. **Given** a hand-edit that breaks the expected structure, **When** the app
   reads it, **Then** it **repairs and normalises**, says what it changed, and
   never rejects the file or loses the teacher's words.
4. **Given** the app is uninstalled, **When** it is, **Then** the vault remains
   complete and usable.

---

### User Story 4 - She can see what it costs (Priority: P2)

Running cost is visible before she worries about it.

**Why this priority**: Not required for the journey to work, but a teacher who
fears an unknown bill stops using it, and finds out too late that she should not
have worried.

**Acceptance Scenarios**:

1. **Given** any adaptation, **When** it completes, **Then** its cost is shown in
   cents.
2. **Given** a month of use, **When** she looks, **Then** she sees the running
   total for the month.
3. **Given** an unusually expensive job, **When** it is about to run, **Then** she
   is told first.

---

### User Story 5 - It degrades honestly (Priority: P2)

Network down, key expired, provider failing: she is told what happened, in her
words, and nothing is lost.

**Acceptance Scenarios**:

1. **Given** any failure, **When** it happens, **Then** the message says what went
   wrong and what to do, never a status code or a stack trace.
2. **Given** a failure mid-adaptation, **When** she reopens, **Then** her material
   and profile are intact and she can retry.
3. **Given** no network, **When** she opens the app, **Then** everything except
   adaptation still works — reading notes, editing profiles, reprinting.

### Edge Cases

- **She picks a synced folder** (Drive, OneDrive) as the vault. Supported; warn
  once about conflicted copies, and never assume exclusive access.
- **Two learners with the same first name.** The name store must disambiguate
  without pushing that problem onto her.
- **She pastes a key with whitespace, or the wrong provider's key.** Detect,
  explain, do not just say invalid.
- **Free-tier rate limits.** Explain the wait in plain language; never present a
  429 as a failure of hers.
- **Corpus update changes a recipe she relied on.** Previously adapted material
  keeps its recorded `recipe@version`; the update never rewrites history.
- **She wants her own recipe.** A local overrides folder in the vault, loaded
  after the bundled corpus. Unsupported for non-technical users, not forbidden.
- **The vault is on a network drive that disappears.** Fail safe, keep unsaved
  work, do not corrupt.

## Requirements *(mandatory)*

### Onboarding

- **FR-401**: First run MUST establish, in order: vault location, AI connection,
  first learner, first adaptation — each resumable and independently completable.
- **FR-402**: Every step MUST have a default the teacher can accept without a
  decision.
- **FR-403**: The connection step MUST explain in one sentence what is needed and
  why, deep-link to the provider's key page, accept a paste, validate
  immediately, and report success in cost terms, not technical terms.
- **FR-404**: The app MUST support more than one provider, including at least one
  with a no-payment-card free tier.
- **FR-405**: No step MUST require reading documentation, using a terminal, or
  understanding markdown, git, models or prompts.
- **FR-406**: Interface language MUST be the teacher's. Spanish first. No project
  jargon: no "IR", "corpus", "axis", "ingest", "harness".

### The vault

- **FR-407**: All teacher-owned data MUST be plain markdown and YAML in one
  folder the teacher chooses.
- **FR-408**: The vault MUST remain fully usable if the app is uninstalled.
- **FR-409**: The app MUST detect external edits and pick them up.
- **FR-410**: Malformed hand-edits MUST be repaired and reported, never rejected.
  The teacher's words MUST NOT be lost.
- **FR-411**: Structure MUST be prose-first: light front matter, readable body.
- **FR-412**: The vault MUST hold learners, notes, overlays, house style, adapted
  material and outputs, per `docs/memory.md` and `docs/adoption-risks.md` §2.

### The corpus

- **FR-413**: The corpus MUST ship with the app, read-only.
- **FR-414**: Updating it MUST be one action, and MUST NOT alter the vault.
- **FR-415**: A local overrides folder in the vault MUST be loaded after the
  bundled corpus.
- **FR-416**: Provenance MUST record `recipe@version`, and an update MUST NOT
  rewrite already-adapted material.

### Names

- **FR-417**: Names MUST be stored encrypted, and MUST NOT appear in any file a
  share, backup or handover export produces.
- **FR-418**: Outbound requests MUST have known names replaced with codes, in
  free text as well as in fields.
- **FR-419**: Probable unknown names in outbound text MUST be flagged to the
  teacher before sending.
- **FR-420**: The interface MUST show real names throughout; substitution MUST be
  invisible.
- **FR-421**: Learner codes MUST be generated, never chosen, so that initials
  cannot become the identifier.

### Running it

- **FR-422**: Per-job and per-month cost MUST be visible.
- **FR-423**: Failures MUST be reported in plain language with a next step.
- **FR-424**: Everything except adaptation MUST work offline.
- **FR-425**: The app MUST render HTML and PDF itself, with no external tooling to
  install.
- **FR-426**: Builds MUST be signed for Windows and macOS. An operating-system
  security warning is a worse first impression than any missing feature.
- **FR-427**: Adapted material MUST carry the pending-review mark until sign-off,
  and MUST be legible when photocopied in black and white.

## Success Criteria *(mandatory)*

- **SC-401**: A teacher who has never used AI goes from installer to a printed
  adapted worksheet **with no assistance and no documentation**, in under 30
  minutes. *This is the feature's pass/fail.*
- **SC-402**: Subsequent worksheets take under 15 minutes including review.
- **SC-403**: Zero occurrences of a learner's real name in outbound request logs
  across a full session in which the teacher used names throughout.
- **SC-404**: She can say where her files are and how to back them up, unprompted.
- **SC-405**: Zero data loss across app crash, network loss and hand-editing.
- **SC-406**: She can state roughly what a month of use costs.
- **SC-407**: No point in the first-run flow where an observer has to intervene.
  Every intervention is a logged defect.

## Assumptions

- The teacher supplies their own key. Per ADR 0005 this is an onboarding design
  problem, not a barrier: card-free routes exist and the cost is a few cents per
  worksheet.
- Desktop, not mobile. A teacher adapting material is at a computer with the
  source file and a printer.
- The harness keeps working against the same vault. The app is a front door, not
  a replacement, and contributors continue to work in the repository.
- Deterministic rendering beyond HTML and PDF — ODT, audio, braille-ready text —
  stays Phase 1 and is not a first-run dependency.
- Validation is one cold teacher, unassisted. That is a sample of one and will
  find only the largest problems; it will find them cheaply, and they are the ones
  that matter now.
