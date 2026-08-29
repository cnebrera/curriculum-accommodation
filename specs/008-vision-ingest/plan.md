# Implementation Plan: Vision ingest — the material as it actually arrives

**Branch**: `008-vision-ingest` · **Spec**: [spec.md](./spec.md)

## Summary

Make the application accept the material a teacher actually has — photographs, a
PDF, a DOCX — and turn it into the same IR that pasted text produces, with a
verification gate she compares against the original rather than against her own
paste.

Two paths, one IR, one converter. The model extracts; **code validates and code
decides whether to retry** (ADR 0007). Nothing downstream knows which path ran.

## Technical Context

**Language**: TypeScript, strict. **Runtime**: Electron 33, Node 22.
**Testing**: vitest offline, Playwright `_electron` for the gate.

**New dependencies**, all pure JS or WASM (FR-614, research R1):

| | Why | Where it runs |
|---|---|---|
| `pdfjs-dist` | Render PDF pages to images; read the text layer | Renderer (canvas) for rendering; main for text |
| `mammoth` | DOCX → HTML → blocks | Main |
| `libheif-js` | HEIC → RGBA | Main |
| `zod` | Already a dependency. Validates the extraction schema | Core |

**Where the work lands.**

| Package | What |
|---|---|
| `packages/core` | The schema, the validator, the JSON→IR converter, the budget parser, the digital-text block builder. All deterministic, all offline |
| `packages/providers` | Nothing new. The adapters already take `images[]`; `capabilities().vision` already exists |
| `packages/shell` | The ingest job: decode, downscale, call per page, validate, retry, write IR and `extraction.json`. Format reading (`mammoth`, `libheif`, pdfjs text) |
| `ui` | The drop target, the page list with progress, the verification screen, the name-in-photo warning |
| `instructions/ingest.md` | The extraction rules **and the budgets**, in front matter |
| `cases/003-ingest-fixtures` | The fixture set. A deliverable, not an afterthought |

## Constitution Check

| Principle | How this feature satisfies it |
|---|---|
| **I** · judgement in Markdown | The whole extraction prompt is `instructions/ingest.md`. The budgets are its front matter. No extraction rule in TypeScript |
| **II** · deterministic core | The schema, the validator and the converter are in `packages/core` and run with no key. The isolation test covers them by construction |
| **III** · adapt the how, never the what | Extraction changes nothing: numbering survives verbatim, unreadable content is flagged in place. This is the stage where "never the what" is most fragile, and flagging is how it holds |
| **IV** · one extraction, N outputs | The extraction call receives **no learner and no profile**. That is what makes it reusable, and it is enforced by the contract's input list |
| **V** · barriers not diagnoses | Not touched — no profile reaches this stage |
| **VI** · traceability | Each IR block carries its page and block id; `extraction.json` records attempts per page |
| **VII** · the draft announces itself | Unchanged. Ingest produces no learner-facing document |
| **VIII** · human-routed memory | Her in-place corrections land in the IR as hers. Nothing is promoted to memory from an extraction |
| **IX** · content is never instruction | **Load-bearing here.** Extracted text is data. The injection and hidden-text detectors (`007`) run over the IR after conversion, so a worksheet that says «ignora lo anterior» is flagged, not obeyed. Structural, not instructional |

**Gate: passes.** One thing to watch, recorded rather than waved through: this
feature adds three dependencies to a project that has kept its dependency list
short on purpose. Each is justified in R1 by a failure mode it avoids, and all
three are pure JS or WASM so none of them can break the build on a platform the
author does not own.

## Phase 0 · Research

[research.md](./research.md) — five decisions: pure-JS/WASM formats, JSON over the
wire, budgets in corpus front matter, the downscale bound, and where page images
live.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the extracted page, the persisted extraction,
  the budget, the one settings flag.
- [contracts/extraction.md](./contracts/extraction.md) — one call: what is sent,
  what must come back, and what happens to every bad answer.
- [quickstart.md](./quickstart.md) — six validation runs, five of them offline.

## Sequencing, and the honest bit

**MVP is US1 + US2 together**, which is unusual and deliberate: an extraction with
no verification screen is worse than no extraction, because it produces a
plausible IR nobody has checked and the whole point of this feature is that the
gate becomes real.

Then US4 (the name warning — small, and it closes a hole in the project's central
promise), then US3 (the digital path, an optimisation).

**What cannot be finished here.** SC-601 and SC-602 need the fixture set *and a
key*. The fixtures are built in this feature; the measurement is not, and
`validation.md` will say so rather than implying otherwise.
