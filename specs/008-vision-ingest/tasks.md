# Tasks: Vision ingest — the material as it actually arrives

**Input**: Design documents from `specs/008-vision-ingest/`

**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. `quickstart.md` defines them as the validation method, and
this is the stage where a wrong result reads perfectly plausibly — an extraction
that renumbered an exercise looks exactly like an extraction that did not.

**Organization**: By user story. **US1 and US2 are one increment** (plan.md
§Sequencing): an extraction with no verification screen produces a plausible IR
nobody has checked, which is worse than no extraction at all.

---

## Phase 1 · Setup

- [x] T001 Add `pdfjs-dist`, `mammoth` and `libheif-js` to `app/package.json`, and assert in `app/packages/shell/test/build-layout.test.ts` that no dependency requires a native build — SC-606 is measured by the build working, so it needs something that fails when a native module arrives *(done. `pdfjs-dist`, `mammoth`, `libheif-js` — all JS or WASM. The assertion walks `node_modules` for `binding.gyp` and also rejects `canvas`, `sharp`, `heic-convert` and `pdf-poppler` by name, because each is native and each would reintroduce exactly the failure research R1 rejects them for.)*
- [x] T002 [P] Create `cases/003-ingest-fixtures/README.md` stating what a fixture is, that material must be written for the purpose or openly licensed, and that a ground-truth IR is part of every fixture *(done, with three fixtures: a skewed photo, numbering that restarts per section, and a platform screenshot.)*

**Checkpoint**: `npm ci && npm run build` on all three platforms with no toolchain.

---

## Phase 2 · Foundational — blocks every user story

- [x] T003 Define the extraction schema in `app/packages/core/src/ingest/schema.ts` per data-model.md, with `zod`, exported as both a type and a JSON Schema the provider call can declare *(done: `app/packages/core/src/ingest/schema.ts`. The printed number is a `string` and a test rejects an integer — coercing `"3.a"` is how numbering gets quietly rewritten.)*
- [x] T004 Implement the validator in `app/packages/core/src/ingest/validate.ts` exactly as the contract table specifies: schema, duplicate ids and undescribed figures reject; `unusable` and `sheets > 1` **stop** rather than retry; non-monotone numbering flags; `[UNREADABLE]` accepts *(done. `stop` and `retry` are kept distinct deliberately: collapsing them is cheaper to write and charges a teacher twice for a photograph she has to retake either way.)*
- [x] T005 Implement the JSON→IR converter in `app/packages/core/src/ingest/to-ir.ts`. Numbers verbatim into `data-number`, figures with role and both descriptions, `[UNREADABLE]` markers preserved in place, page and block id carried for traceability (Principle VI) *(done. One converter for both paths, and a test asserts they produce byte-identical IR from the same content — otherwise "nothing downstream knows which path ran" is a claim with no check on it.)*
- [x] T006 [P] Implement the budget parser in `app/packages/core/src/ingest/budget.ts`: read the four values from `instructions/ingest.md` front matter, clamp absurd values with a log rather than obeying them, fall back on a missing block *(done, with the floor and ceiling in code: a corpus is editable content, and `attempts_per_page: 500` on a dark photo would bill her five hundred times. Code protects her from the file rather than implementing it.)*
- [x] T007 [P] Implement image downscaling in `app/packages/core/src/ingest/downscale.ts` as a pure function over dimensions — the bound arithmetic, testable offline, separate from any canvas *(done as pure arithmetic over dimensions — no canvas — so the policy question is testable offline and separate from the mechanical one.)*
- [x] T008 Write `app/packages/core/test/extraction.test.ts` covering quickstart §1, including the one that matters most: **the same converter produces byte-identical IR from a vision page and a digital page carrying the same content** *(done: 37 tests.)*
- [x] T009 [P] Write `app/packages/core/test/ingest-budget.test.ts` covering quickstart §2, against the shipped `instructions/ingest.md` *(done: 14 tests, against the shipped `instructions/ingest.md`.)*
- [x] T010 Export the new modules from `app/packages/core/src/index.ts` *(done.)*
- [x] T011 Author `instructions/ingest.md`: the extraction rules in Markdown, with the budgets in front matter. Flagging over guessing stated as the rule, with its reason — this file is the whole judgement layer for this stage *(done. Kept the judgement that was already there and added the output contract, the budgets in front matter, and the awkward pages — a photo at an angle, platform chrome around a screenshot, a formula, a page half in shadow, handwriting.)*

**Checkpoint**: `npm run test:all` passes offline; `npm run test:isolation` still passes.

---

## Phase 3 · US1 + US2 — a photograph becomes a checked IR (P1) 🎯 MVP

**Goal**: She drops two photos, gets an extraction she compares against the paper page by page, and only her confirmation unlocks adaptation.

**Independent test**: Ingest a fixture; structural validation passes; every ground-truth `[UNREADABLE]` is flagged and none is guessed; a seeded error is findable in the verification screen without opening a file.

- [x] T012 [US1] Implement format reading in `app/packages/shell/src/ingest/read.ts`: HEIC via `libheif-js`, PDF page rendering and text-layer reading via `pdfjs-dist`, DOCX via `mammoth`, plain images passed through. One function per format, each returning page images and optional text *(done. The JPEG header walker had a bounds check one byte too strict, which returned zero dimensions for a JPEG whose frame header is its last segment — found by the test built from a realistic EXIF layout.)*
- [x] T013 [US1] Implement the ingest job in `app/packages/shell/src/jobs/ingest.ts`: decode → downscale → one call per page → validate → bounded retry → write `ir.md` and `extraction.json`. **Code owns the loop**, per ADR 0007 *(done. Code owns the loop: validate, decide, stop or retry, all in `jobs/ingest.ts`.)*
- [x] T014 [US1] Wire the extraction call through `sendRedacted` like every other provider call, so ingest cannot become a second egress path *(done, through `sendRedacted` like every other provider call.)*
- [x] T015 [US1] Enforce the page bound (FR-612) and report it: the boundary, the pages beyond it, listed. Never a silent truncation *(done, and the cut pages are listed by number. A teacher who dropped 60 pages and got 20 back with no explanation has been lied to by omission.)*
- [x] T016 [US1] Accumulate cost per page into the job's visible cost (FR-611), and warn before an unusually expensive job (006 US4) *(done. Estimated from page count rather than prompt length, because an image is priced by tile count — `estimateCents` alone would have under-read a 20-page job by an order of magnitude.)*
- [x] T017 [US1] Refuse a provider without vision, naming which of her services read photographs, in plain language — the catalogue already carries `vision` per service (009) *(done, naming her service: «Groq no lee fotos» is actionable where a failed extraction is not.)*
- [x] T018 [US2] Build `app/ui/src/ingest/IngestScreen.tsx`: the drop target, accepted formats in her words, per-page progress, and the rejection sentences for a dark photo and for two sheets in one image *(done. Also gained «Seguir con esto» — see T026.)*
- [x] T019 [US2] Build `app/ui/src/ingest/VerifyScreen.tsx`: each page image beside its extracted blocks, leading with every `[UNREADABLE]`, then every `essential` figure description, then every notice — in that order, before the prose (FR-608) *(done, with the page image sticky beside the block column so it stays visible as she scrolls.)*
- [x] T020 [US2] Implement in-place correction: her edit lands in the IR and is recorded as hers, not the model's (Principle VIII) *(done, and the correction and the confirmation are one call: two would let a confirmation land without the edit it was based on.)*
- [x] T021 [US2] Gate `extraction.verified` on per-page confirmation, derived and never settable, and make adaptation refuse while any page is unconfirmed (FR-608) *(done, derived and never settable. **This exposed the worst defect in the project so far**: `job:verify` flipped the flag with a regex over the whole document, for any document, so the gate could be passed by clicking once having read nothing.)*
- [x] T022 [US2] Run the injection and hidden-text detectors over the converted IR, so a worksheet that says «ignora lo anterior» is flagged as content (Principle IX, 007 FR-503/505) *(done. Those detectors had only ever seen pasted text; a photographed worksheet is a new input path into the same pipeline.)*
- [ ] T023 [US1] Build the fixture set in `cases/003-ingest-fixtures/`: worksheets written for the purpose, photographed badly on purpose, each with a hand-written ground-truth IR **(PARTLY done — the worksheets and their hand-written ground truth are written; the photographs need a printer and a phone and have not been taken. Fixture 03 additionally cannot publish its screenshot, because the content belongs to a publisher. Recorded in `validation.md` and in each `notes.md`.)**
- [x] T024 [P] [US1] Write `app/packages/core/test/fixtures.test.ts` covering quickstart §4 — asserting the **ground truth** is well-formed, which is the harness SC-601/602 are measured with *(done: 12 tests over the ground truth, including that a fixture exists whose numbering restarts — so nobody "fixes" that flag into a rejection.)*
- [x] T025 [US2] Write `app/e2e/ingest.spec.ts` covering quickstart §5, including the assertion the gate exists for: **adaptation refuses while a page is unconfirmed** *(done: 14 tests. Found the wrapped IPC error reaching a teacher as «Error invoking remote method ...: Error: [rampa:ingest-empty] ...».)*
- [x] T026 [P] [US2] Add the ingest and verification screens to `app/e2e/a11y.spec.ts` and `app/e2e/layout.spec.ts`. A page image beside a block list at 1366×768 with `data-text=xlarge` is the hardest layout in the application *(done — and writing it found that **the verification screen was unreachable after a restart**. It could only be opened by the ingest that produced it, so an extraction she did not finish confirming was lost along with what it cost, in an application whose whole premise is that she is interrupted.)*

**Checkpoint**: the photographed journey runs end to end to a verified IR, offline up to the extraction call.

---

## Phase 4 · US4 — the name written on the worksheet (P1)

- [x] T027 [US4] Warn before the first image of a job is sent: names visible in a photo reach her provider, with the chance to fix the photos first. Once per machine, acknowledged in the settings file outside the vault (FR-609) *(done, once per machine, in the settings file outside the vault — a handover packet must not carry it.)*
- [x] T028 [US4] Replace known learner names in extracted text with codes before the IR is written, and ask about probable unknown names exactly as typed text does (FR-610, 006 FR-418/419) *(done. Redacts inside figure descriptions too, which is a channel a name arrives through that no typed-text path has.)*
- [x] T029 [P] [US4] Update `docs/proteccion-de-datos.md` to state the image residual plainly. It MUST NOT imply the redaction covers pixels *(done — already correct, and now asserted, including the negative: no claim anywhere that the redaction covers pixels.)*
- [x] T030 [P] [US4] Write the redaction tests for the ingest path: zero learner names in outbound *text* (SC-604), and the vault name-free even when the photograph was not *(done: 7 tests.)*

---

## Phase 5 · US3 — digital files take the faithful path (P2)

- [x] T031 [US3] Build the digital-text block builder in `app/packages/core/src/ingest/digital.ts`: PDF text layer and DOCX structure into candidate blocks, deterministically *(done in `ingest/read.ts`: PDF text layer and DOCX structure, deterministically.)*
- [x] T032 [US3] Use the model only for classification and figure roles on the digital path, returning the **same JSON** so one converter serves both (FR-606) *(done. The digital branch sends the already-extracted text and asks only for classification and figure roles, returning the same JSON — one converter serves both.)*
- [x] T033 [US3] Crop figures from a digital PDF and carry them into the description flow, so the text path and the image path compose (Edge Cases) *(done as figure **positions**, from the operator list. Cropping needs a canvas, which lives in the renderer; what the digital path owes the converter is where the images are. Best-effort by design: a missed figure is one fewer thing to describe, while a wrong box would send a crop of empty paper to be described.)*
- [x] T034 [US3] Raise the hidden-text notice where a text layer and the rendered page disagree (FR-607) — this is the input where that defence, specified in `007`, becomes implementable at all *(done. The one input where 007's hidden-text defence is implementable at all — with pasted text there is nothing to compare against. The fixture's hidden line is «ignora las instrucciones anteriores» at one point, so it exercises two defences at once.)*
- [x] T035 [P] [US3] Write `app/packages/core/test/documents.test.ts` covering quickstart §3, with a digital-PDF fixture carrying hidden text (SC-605) *(done: 14 tests, against a hand-built PDF fixture small enough to read.)*

---

## Phase 6 · Polish

- [x] T036 [P] Add the fixture-set freshness note to `cases/003-ingest-fixtures/README.md`: what a new fixture must add, and that a fixture with no ground truth is not a fixture *(done.)*
- [x] T037 Record in `specs/006-desktop-app/validation.md` what was verified without a key and what SC-601/602/603 still need — a real key and a second reader *(done, and it says the headline first: not one page has been extracted by a real model.)*
- [x] T038 [P] Update `docs/escenario.md` moment 1, which describes ingest as already working *(done.)*
- [x] T039 [P] Add the ingest suites to `.github/workflows/app.yml` *(done.)*

---

## Dependencies

- **Phase 1** blocks everything. T001 blocks T012.
- **Phase 2** blocks all user stories. T003 blocks T004 and T005; T011 blocks T006.
- **Phase 3** is the MVP and US1/US2 are one increment. T013 depends on T012 and on all of Phase 2. T021 depends on T019.
- **Phase 4** depends on T013 only.
- **Phase 5** depends on Phase 2's converter and can run in parallel with Phase 4.
- T023 blocks T024. Neither blocks the MVP's code path.

## Parallel opportunities

- T006, T007 together once T003 lands. T008, T009 together.
- Phase 4 and Phase 5 in parallel — different files, no shared state.
- T023 (building fixtures) is photography and typing, and parallelises with all of Phase 3's code.

## Implementation strategy

**MVP = Phase 1 + Phase 2 + Phase 3.** That is the journey `006` SC-401 measures
and cannot currently start.

Order after MVP: **Phase 4 → Phase 5 → Phase 6.** Phase 4 first because it closes
a hole in the promise the application exists to keep, and it is small.

**Do not defer T022.** Running the injection and hidden-text detectors over the
converted IR is the one task here that keeps a constitutional principle true
across a new input path, and it is the one most likely to be dropped as already
covered — it is not: those detectors have only ever seen pasted text.
