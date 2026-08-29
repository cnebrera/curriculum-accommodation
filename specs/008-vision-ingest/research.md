# Phase 0 — Research

Five decisions. Three came out of the clarify pass and are restated here with the
alternatives that were rejected; two are new and were forced by writing the plan.

## R1 · Reading the formats a teacher actually has

**Decision: pure-JS and WASM only. `pdfjs-dist` renders PDF pages and reads text
layers, `mammoth` converts DOCX, `libheif-js` decodes HEIC. No native module.**

**Rationale.** The failure mode of a native module in Electron is an application
that does not launch, on one platform, after an npm version bump — and the person
holding it is a special-education teacher who cannot read the stack trace and has
nobody to ask. This project already ships unsigned installers (`006` R14); adding
a per-platform compilation step would put two unsupportable failure classes in
front of the same person.

`pdfjs-dist` is Mozilla's, ships a WASM build, and is the same engine Firefox
uses to display PDFs — so its rendering is the rendering a teacher already trusts.
It also exposes the text layer, which is what makes the digital path (US3) and the
hidden-text comparison (FR-607) possible at all.

**Alternatives rejected.** `pdf-poppler`/`pdftoppm`: a system binary, so the app
would work on the developer's machine and not on hers. `canvas` (node-canvas):
native, and the exact dependency that breaks on macOS after an Xcode update.
`sharp`: native, superb, and unnecessary — the only image operation needed is a
downscale, which the renderer's own canvas does. `heic-convert`: pulls libheif
through a native binding; `libheif-js` is the same library compiled to WASM.

**Consequence accepted.** WASM decoding of a 12-megapixel HEIC is slower than
native — roughly a second per photo. A teacher ingesting two pages will not
notice; a teacher ingesting forty will. FR-612's page bound is what keeps that
honest, and the progress display already exists.

## R2 · What crosses the wire

**Decision: the model returns JSON validated against a declared schema. The core
converts JSON to IR deterministically.**

**Rationale.** FR-602 requires each page validated *in code* before acceptance,
and that requirement decides the format. Asking for Pandoc-flavoured markdown with
fenced divs means writing a parser that has to distinguish "the model wrote a
malformed div" from "the model wrote prose containing a colon" — and a parser whose
failures look like model failures is a parser that hides them. JSON has exactly one
failure mode and `zod` already reports it precisely.

It also puts the IR conversion in `packages/core`, where Principle II can see it:
the mapping from an extracted block to an IR block is a deterministic function,
tested offline, and the same function serves both the vision and the digital path
— which is what makes "nothing downstream knows which path ran" true rather than
aspirational.

**Alternatives rejected.** Markdown directly: rejected above. A tool-call
per block: many round trips per page, and the per-page cost is already the largest
line in the budget. Free-form text plus a second "structure it" call: two calls
where one does, and the second call can disagree with the first.

## R3 · Where the loop's numbers live

**Decision: front matter in `instructions/ingest.md`, read at run time.**

**Rationale.** The spec's own assumption already says the budgets "will move with
real material, and changing them must not be a release". Front matter puts them
in the same file as the instructions they govern, so a contributor loosening the
retry bound sees the extraction rules in the same edit — and a teacher, or the
person helping her, can read both.

Defaults, chosen to be adjusted rather than defended: **2 attempts per page**
(a third rarely differs from the second and triples the cost of a bad photo),
**20 pages per job** (a unit, not a book — `007` FR-513), **1600px on the long
edge** (legible for 11pt print at typical phone distance; see R4).

**Alternatives rejected.** A settings file: machine-specific, and these are
corpus judgements. Hardcoded constants: the thing the assumption forbids. A
teacher-facing control: she has no basis to set a retry bound and no reason to
care.

## R4 · How small an image can be and still be read

**Decision: downscale to 1600px on the long edge, JPEG quality 0.82, from the
corpus.**

**Rationale.** A modern phone photograph is 12 megapixels, and a provider prices
an image by its tile count — a full-resolution page can cost several times a
downscaled one for the same extraction. 1600px on the long edge puts an A4 page at
roughly 190 DPI, which resolves 11pt body text and the small print in an exercise
rubric. Below about 1100px, superscripts and the difference between a comma and a
full stop start to go, and both matter in a worksheet.

This is a **reasoned starting point, not a measurement.** No fixture has been run
at multiple scales. `cases/002-model-floor` is where that gets measured, and until
it does the number is a corpus value precisely so that being wrong is an edit.

**Alternatives rejected.** Send the original: costs several times more for no
demonstrated gain. Adaptive scaling by detected text height: a real technique and
a second extraction problem to get wrong before the first one works.

## R5 · Where page images live

**Decision: `material/<job>/source/`, inside the vault, alongside every other
source file.**

**Rationale.** The vault is hers and readable without this application (`006`
FR-410). Her photographs are the source material for an adaptation, so they belong
with it: she can open the folder and see the photo beside the worksheet it became,
which is also what makes the verification screen re-openable after a restart.

**Consequence accepted, and it must be written down.** `profiles/`, `material/`,
`output/` and `memory/` are already never committed, and a vault backup is a folder
copy — so photographs of worksheets, which may carry a handwritten name, are inside
what she copies. That is correct (they are her documents) and it is exactly why the
name-in-pixels residual (US4) is documented rather than glossed.

**Alternatives rejected.** A temp directory: the verification screen dies on
restart, and `006`'s whole premise is that she is interrupted. A cache outside the
vault: two places to back up, and one of them invisible.
