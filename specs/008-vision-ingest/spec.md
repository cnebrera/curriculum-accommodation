# Feature Specification: Vision ingest — the material as it actually arrives

**Feature Branch**: `008-vision-ingest`

**Created**: 2026-08-28

**Status**: Clarified 2026-08-28 — planned, tasked, in implementation

**Input**: The application accepts only pasted text, and the specification's own
journey starts from a photographed worksheet (006 US1-5, SC-401). The adoption
analysis (§4.4) is blunter: the material increasingly lives inside a publisher's
platform with no export, so the teacher's real file is a photo or a screenshot —
**the low-quality path is the common path, not the fallback.** Scope decided
2026-08-28: photos, PDF, and digital text (DOCX/pasted), in one release.

## Why this feature carries the project's oldest risk

Recovering a textbook page's structure from an image is the highest-risk step in
the whole design (`docs/ESPECIFICACION-V0.md` §12): columns, boxed asides and
exercise numbering are exactly what naive extraction destroys, and an extraction
error contaminates every output while reading perfectly plausibly.

It is also the one stage with genuine open-endedness, so per
[ADR 0007](../../docs/decisions/0007-orchestrated-pipeline.md) it is the one
stage that gets a bounded iteration loop: the model extracts, code validates the
structure, and code decides whether a page is retried and when to stop.

Until this feature exists, the verification gate is theatre — the teacher
"verifies" text she herself pasted. This feature is what makes the gate real.

## Two paths, one IR

| Path | Input | How |
|---|---|---|
| **Vision** | Photos (JPG/PNG/HEIC), scanned PDF, screenshots | Each page rendered to an image, one model call per page, structured output validated against the IR contract |
| **Digital text** | PDF with a text layer, DOCX, pasted text | Deterministic extraction in the core, then one model call to classify blocks and assign figure roles |

Both produce the same IR (`docs/ir.md`); nothing downstream knows which path ran.
The digital path is preferred when available — cheaper and more faithful — and
the vision path is the required baseline because it is the common case.

## Clarifications

### Session 2026-08-28

> **Resolved by the implementing agent, not by the project owner.** Carlos asked
> for the work to continue without blocking on him. Each answer below carries the
> reasoning that produced it precisely so he can overturn any of them on reading;
> none is a coin toss and none is silent. The three that would be expensive to
> reverse are marked **(load-bearing)**.

- Q: What renders a PDF page to an image, reads a DOCX, and decodes HEIC? → A:
  Pure-JS and WASM only — `pdfjs-dist` for PDF, `mammoth` for DOCX,
  `libheif-js` for HEIC. **(load-bearing)** A native module means `electron-rebuild`
  on three platforms and a class of installer failure that presents to a teacher
  as "the app won't open". This project already carries an unsigned-installer
  problem (`006` R14); it cannot also carry a native-build problem.
- Q: What shape does the model return for an extracted page? → A: JSON validated
  against a schema, converted to IR deterministically in the core.
  **(load-bearing)** FR-602 requires code validation before acceptance, and
  validating Pandoc-flavoured markdown with fenced divs means writing a parser
  whose failures are indistinguishable from a model's. JSON has one obvious
  failure mode. The IR stays the interchange format; it is just not what crosses
  the wire.
- Q: Where do the loop's budgets live — attempts per page, pages per job, image
  size? → A: Front matter in `instructions/ingest.md`, read at run time. The spec's
  own assumption says these numbers will move with real material and moving them
  must not be a release; front matter puts them beside the instructions they
  govern, where a contributor changing one sees the other.
- Q: How is the name-in-photo warning "not fired on every job once acknowledged"
  (FR-609)? → A: An acknowledgement flag in the settings file outside the vault,
  alongside the display preferences. Not in the vault: it is a fact about this
  teacher on this machine, and a handover packet must not carry it. Not
  per-learner either — the warning is about her workflow, not about a child.
- Q: What is the fixture set, given no copyrightable textbook material may be
  used? → A: Worksheets written for the purpose, printed, and photographed badly
  on purpose — skewed, shadowed, one page half in shade — with a ground-truth IR
  written by hand beside each. Openly licensed as project content (CC BY-SA 4.0)
  and committed, because SC-601 and SC-602 are unmeasurable without them and an
  unmeasurable success criterion is decoration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A photographed worksheet becomes a faithful IR (Priority: P1)

The teacher photographs a two-page worksheet with her phone, drops the photos on
the application, and gets an extraction with every block classified, original
numbering preserved, every figure assigned a role with both descriptions, and
everything the model could not read flagged in place — never guessed.

**Why this priority**: It is the missing half of 006's P1 journey. SC-401 is
measured from a photographed worksheet, and today that journey cannot start.

**Independent Test**: Ingest the openly licensed fixture set. Structural
validation passes; every `[UNREADABLE]` in the fixtures' ground truth is flagged,
none is guessed.

**Acceptance Scenarios**:

1. **Given** photos of a worksheet, **When** ingest runs, **Then** one extraction
   call is made per page and the result is validated in code: well-formed blocks,
   known classes, ids unique, numbering monotone with the original.
2. **Given** a page whose extraction fails validation, **When** it is retried,
   **Then** the retry is bounded and code decides; after the bound, the page's
   problems are shown to the teacher rather than silently accepted.
3. **Given** a smudged word or a cut-off line, **When** it is extracted, **Then**
   it appears as `[UNREADABLE: …]` in place. Guessing is the most dangerous
   failure in the pipeline, and the instructions say so.
4. **Given** a figure, **When** it is extracted, **Then** it carries a role —
   decorative, informative, essential — and both descriptions, written for the
   teacher to review, not to skip.
5. **Given** exercise numbering in the original, **When** the IR is produced,
   **Then** the printed numbers survive verbatim in `data-number`.

---

### User Story 2 - The verification gate becomes real (Priority: P1)

The teacher sees each original page beside what was extracted from it, with the
risky items surfaced first, and confirms page by page. Only her confirmation sets
`extraction.verified: true`.

**Why this priority**: The gate is the project's defence against contaminating
all outputs with one reading error, and it only defends anything if she is
comparing against the original, not re-reading her own paste.

**Independent Test**: A seeded extraction error (a changed number, an invented
word) is findable in the verification screen without opening any file.

**Acceptance Scenarios**:

1. **Given** a completed extraction, **When** verification opens, **Then** each
   page image is shown beside its extracted blocks.
2. **Given** the extraction, **When** the screen leads, **Then** it leads with:
   every `[UNREADABLE]`, every `essential` figure description, every
   instruction-shaped or hidden-text notice — in that order — before the prose.
3. **Given** an error she spots, **When** she corrects the extracted text in
   place, **Then** the correction lands in the IR and is hers, not the model's.
4. **Given** unconfirmed pages, **When** she tries to adapt, **Then** the gate
   holds: adaptation refuses until every page is confirmed.

---

### User Story 3 - Digital files take the faithful path (Priority: P2)

A PDF with a text layer or a DOCX is extracted deterministically — the text is
already text — and the model is used only for what needs judgement: classifying
blocks and assigning figure roles.

**Why this priority**: Cheaper, faster and more faithful when available, but the
vision path already covers these files (a digital PDF still renders to images),
so this is an optimisation with a correctness bonus, not the baseline.

**Acceptance Scenarios**:

1. **Given** a PDF with a text layer, **When** ingested, **Then** the text comes
   from the layer, not from vision, and figures are cropped and carried into the
   IR for description.
2. **Given** a DOCX, **When** ingested, **Then** structure that the format
   already encodes (headings, lists, tables) survives into the IR.
3. **Given** a digital PDF, **When** its text layer and its rendered appearance
   disagree — text present in the layer but not visible on the page — **Then**
   the hidden-text notice fires (007 FR-505). This is the input where that
   defence becomes implementable.

---

### User Story 4 - The name written on the worksheet (Priority: P1)

Worksheets often carry the learner's name — "Nombre: Lucía" on the top line. The
egress redaction is text-based, and an image goes to the provider as pixels.

**Why this priority**: It is a hole in the one promise the application exists to
keep (006 US2). It cannot be fully closed without local OCR before send, so what
is required is the honest version: warn before, scrub after, and say plainly
what the residual is.

**Acceptance Scenarios**:

1. **Given** photos about to be sent, **When** the job starts, **Then** the
   teacher is told, once and in her language, that a name visible in the photo
   reaches her AI provider, and is offered the chance to crop or cover it first.
2. **Given** extracted text containing a known learner's name, **When** the IR is
   written, **Then** the name is replaced by the code in the IR — the vault stays
   name-free even when the photo was not.
3. **Given** extracted text containing a probable unknown name, **When** it is
   found, **Then** the teacher is asked, exactly as with typed text (006 FR-419).
4. **Given** the documentation of what is sent to the provider, **When** it
   covers ingest, **Then** it states the image residual plainly rather than
   implying the redaction covers pixels.

### Edge Cases

- **A blurry or dark photo** — the extraction call reports quality; below usable,
  the page is rejected with "vuelve a hacer la foto con más luz", not extracted
  badly.
- **A rotated or sideways photo** — normalised before extraction; never extracted
  sideways.
- **A screenshot with platform UI around the material** — the instructions say to
  extract the material and ignore the chrome; anything ambiguous is flagged, not
  guessed.
- **Two worksheets in one photo** — flagged; the teacher splits, the model never
  decides where one sheet ends.
- **Formulae** — captured as LaTeX when trivially legible, flagged
  `[UNREADABLE]` otherwise. Never guessed. Mathematics remains out of Phase 0
  scope (`docs/ESPECIFICACION-V0.md` §12).
- **A very long PDF** — the per-job bound applies (007 FR-513): the boundary is
  reported, pages beyond it are listed, nothing is silently skipped.
- **HEIC from an iPhone** — converted locally; the teacher never sees a format
  error for the default photo format of the most common phone.
- **A provider without vision** — detected via the capability probe; the teacher
  is told which of her options support photos, in plain language.
- **DOCX with embedded images** — images extracted and carried as figures into
  the vision-description flow; the text path and the image path compose.

## Requirements *(mandatory)*

- **FR-601**: The application MUST accept photos (JPG, PNG, HEIC), PDF (scanned
  or digital) and DOCX, plus pasted text, as ingest sources.
- **FR-602**: Vision extraction MUST run one call per page, and each page's
  result MUST be validated in code against the IR contract before acceptance.
- **FR-603**: Failed pages MUST be retried inside a code-owned bound; exhausting
  it MUST surface the page's problems to the teacher, never accept them silently.
- **FR-604**: Unreadable content MUST be flagged in place and MUST NOT be
  inferred. The extraction instructions live in `instructions/ingest.md`, per
  Principle I.
- **FR-605**: Original exercise numbering MUST survive verbatim; every figure
  MUST carry a role and both descriptions (`docs/ir.md`).
- **FR-606**: Digital sources with a text layer MUST be extracted
  deterministically, with the model used only for classification and figure
  roles.
- **FR-607**: Where a digital source's text layer and rendered appearance can be
  compared, invisible text MUST raise the hidden-text notice (007 FR-505).
- **FR-608**: Verification MUST show each original page beside its extraction,
  lead with unreadables, essential figures and notices, allow in-place
  correction, and gate `extraction.verified` on per-page confirmation.
- **FR-609**: Before the first image of a job is sent, the teacher MUST be told
  that names visible in photos reach the provider, with the chance to fix the
  photos first. This notice MUST NOT fire on every job once acknowledged.
- **FR-610**: Known learner names in extracted text MUST be replaced by codes
  before the IR is written; probable unknown names MUST be asked about
  (006 FR-418, FR-419).
- **FR-611**: Ingest cost MUST accumulate per page into the job's visible cost
  (006 FR-422), and an unusually expensive job MUST warn before running
  (006 US4).
- **FR-612**: The per-job input bound (007 FR-513) MUST apply to page count, and
  reaching it MUST be reported, never silently truncated.
- **FR-613**: Everything above MUST hold identically for material later fed to
  compose as an anchor. An anchor is ingested material; it takes no shortcut.
- **FR-614**: Page rendering, DOCX reading and HEIC decoding MUST use pure-JS or
  WASM implementations. A native module would require a per-platform rebuild, and
  its failure mode is an application that does not start — which a teacher cannot
  diagnose and this project cannot support.
- **FR-615**: The extraction call MUST return JSON validated against a declared
  schema; conversion to IR MUST be deterministic and MUST live in the core. The
  model never emits IR directly.
- **FR-616**: Images MUST be downscaled before send, to a bound read from the
  corpus. A full-resolution phone photograph is several times the cost of a
  legible one and buys no accuracy.
- **FR-617**: The loop's budgets — attempts per page, pages per job, image size —
  MUST be read from `instructions/ingest.md` front matter at run time, never
  hardcoded.

## Success Criteria *(mandatory)*

- **SC-601**: Over the fixture set, exercise numbering survives in 100% of pages
  and no `[UNREADABLE]` in the ground truth is ever replaced by invented content.
- **SC-602**: A seeded extraction error is found by a reviewer using only the
  verification screen, on every fixture it is seeded into.
- **SC-603**: Ingest plus verification of a two-page photographed worksheet fits
  inside the 006 budget: the full journey stays under 15 minutes (SC-402).
- **SC-604**: Zero learner names in outbound *text* during ingest; the image
  residual is documented where 006 documents what is sent (SC-403 is measured on
  text, and the asterisk is written down, not discovered).
- **SC-605**: For digital-PDF fixtures with hidden text, 100% raise the notice
  (007 SC-502 extended to ingest).
- **SC-606**: The application installs and starts on all three platforms with no
  compilation step. Measured by the existing CI matrix: `npm ci` followed by the
  build, with no `electron-rebuild` and no native toolchain.

## Assumptions

- One provider per teacher, and its vision capability is probed, not assumed
  (`Capabilities.vision` already exists in the adapter contract).
- Page images live in `material/<job>/source/` inside the vault, like any other
  source file. Nothing new leaves the machine except the extraction calls.
- The bounded loop's budget (attempts per page, pages per job) is configuration
  shipped with the corpus, not hardcoded — the numbers will move with real
  material, and changing them must not be a release.
- Fixture material is openly licensed or invented, photographed badly on
  purpose. The fixture set is the deliverable that makes SC-601/602 measurable,
  and building it is part of this feature, not an afterthought.
- The name-in-pixels residual (US4) is accepted for v1 and documented. Local
  OCR-before-send would close it and is deliberately out of scope: it adds a
  heavy dependency to the exact step that must stay light, for a risk the
  warning mitigates.
