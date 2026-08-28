# Tasks: The application — a vault she owns, over a corpus she doesn't

**Input**: Design documents from `specs/006-desktop-app/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. `quickstart.md` defines them as the validation method, and two
constitutional principles (II and IX) are only real if a test enforces them.

> **Status note, 2026-08-28.** The checkboxes below are stale: most of Phases 1-9
> is implemented and its tests pass, but nothing here was ticked as it landed.
> `validation.md` is the reliable record of what has been verified. Do not read an
> unchecked box as unbuilt work — reconcile against the code first.

**Organization**: By user story. Each phase is an independently testable increment.

---

## Phase 1 · Setup

- [ ] T001 Create the workspace root at `app/package.json` with npm workspaces for `packages/*` and `ui`, Node 22 engine, and scripts `test:core`, `test:isolation`, `test:vault`, `test:injection`, `test:e2e`, `dev`, `build`, `dist`
- [ ] T002 [P] Add the shared TypeScript config in `app/tsconfig.base.json` (strict, ES2022, NodeNext) and per-package `tsconfig.json` extending it
- [ ] T003 [P] Add the vitest workspace config in `app/vitest.config.ts` so `packages/core` runs with no network and no environment key
- [ ] T004 [P] Add `app/.gitignore` for `node_modules`, `dist`, `out`, `release`
- [ ] T005 Add the `electron-vite` config in `app/electron.vite.config.ts` wiring main, preload and renderer
- [ ] T006 Add the `electron-builder` config in `app/electron-builder.yml` targeting NSIS (Windows), DMG (macOS), AppImage and deb (Linux), publishing to GitHub Releases, with signing left unconfigured per R14
- [ ] T007 Add the corpus copy step in `app/scripts/bundle-corpus.mjs` that copies `recipes/`, `instructions/`, `checklists/`, `LICENSE` and `LICENSE-CONTENT.md` into `app/corpus/`, and fails the build if either licence file is missing (R8). Bundle only what the application reads — see ADR 0006

**Checkpoint**: `npm ci && npm run build` completes and the corpus is bundled with both licences.

---

## Phase 2 · Foundational — blocks every user story

- [ ] T008 Implement the module-graph isolation test in `app/packages/core/test/isolation.test.ts`, asserting nothing under `packages/core/src` imports `packages/providers`, `node:http`, `node:https`, `undici`, or references `fetch`, failing with Principle II quoted (R2)
- [ ] T009 [P] Define the vault path resolver in `app/packages/core/src/vault/paths.ts` implementing the layout in data-model.md, with `resolveInVault()` rejecting any path escaping the vault root
- [ ] T010 [P] Implement the damage-tolerant front-matter parser in `app/packages/core/src/vault/parse.ts` per R3: try YAML, fall back to whole-file-as-body, keep unknown keys, collect repairs, never throw
- [ ] T011 Implement the zod schemas with repair semantics in `app/packages/core/src/vault/schema.ts` for profile, roster, journal entry and job, keeping mismatches in `_unparsed` and never coercing a missing axis to `0`
- [ ] T012 [P] Implement vault read/write in `app/packages/core/src/vault/io.ts`, writing only through the resolver and only on explicit action
- [ ] T013 [P] Implement the IR parser in `app/packages/core/src/ir/parse.ts` using `markdown-it` with container and attrs plugins for fenced divs, attributes and math (R12)
- [ ] T014 Implement provenance validation in `app/packages/core/src/ir/provenance.ts`: a changed block without `data-from`, `data-recipe` and `data-axis`, and not marked `.scaffold`, fails the job (007 FR-512)
- [ ] T015 [P] Implement recipe loading and selection in `app/packages/core/src/recipes/index.ts`: bundled corpus then vault overrides, axis-condition matching, conflict resolution per `recipes/core/conflicts/README.md`
- [ ] T016 [P] Implement redaction in `app/packages/core/src/redact/index.ts`: known-name substitution plus the dictionary-and-heuristic probable-name detector from R5, returning flagged spans and never blocking
- [ ] T017 Implement the HTML renderer in `app/packages/core/src/render/html.ts` taking an IR document **and no profile argument** (007 FR-506), applying presentation tokens derived from axis levels (the Pandoc template it replaced is gone — ADR 0006 — and its WCAG 2.2 AA target is documented in the module)
- [ ] T018 [P] Implement the print stylesheet and photocopy check in `app/packages/core/src/render/photocopy.ts`: contrast after desaturation, no meaning carried by colour alone (006 FR-427)
- [ ] T019 [P] Implement report generation in `app/packages/core/src/report/index.ts`, grouping changes by decision from provenance attributes
- [ ] T020 Implement the output check in `app/packages/core/src/render/check.ts` that fails a render if any learner code or known name appears in learner-facing output (007 FR-507)

**Checkpoint**: `npm run test:core` and `npm run test:isolation` pass offline with no key.

---

## Phase 3 · User Story 1 — installer to adapted worksheet, alone (P1) 🎯 MVP

**Goal**: A teacher who has never used AI gets from a fresh install to a printed adapted worksheet with no help and no documentation.

**Independent test**: Give the installer to a teacher who has not seen the project, say nothing, and watch. Every hesitation is a defect (SC-407).

- [ ] T021 [P] [US1] Implement the Electron main process in `app/packages/shell/src/main.ts`: window, single instance, menu in Spanish
- [ ] T022 [US1] Implement the preload bridge in `app/packages/shell/src/preload.ts` exposing exactly the surface in `contracts/ipc-surface.md`, with `contextIsolation` on and no node integration in the renderer
- [ ] T023 [US1] Implement vault IPC handlers in `app/packages/shell/src/ipc/vault.ts` — `choose`, `read`, `write`, `watch` — with `write` rejecting out-of-vault paths rather than sanitising them (007 FR-508)
- [ ] T024 [P] [US1] Implement external-edit watching in `app/packages/shell/src/ipc/watch.ts` with `chokidar`, debounced, surfacing repairs (006 FR-409)
- [ ] T025 [P] [US1] Implement the provider adapter interface in `app/packages/providers/src/types.ts` per `contracts/provider-adapter.md`
- [ ] T026 [P] [US1] Implement the Anthropic adapter in `app/packages/providers/src/anthropic.ts` using the official SDK, streaming, with typed domain errors
- [ ] T027 [P] [US1] Implement the Google adapter in `app/packages/providers/src/google.ts` as the no-payment-card path (006 FR-404)
- [ ] T028 [US1] Implement the egress chokepoint in `app/packages/providers/src/send.ts` so every payload passes redaction before any adapter is reached, and assert it in `app/packages/providers/test/chokepoint.test.ts` (007 FR-510)
- [ ] T029 [US1] Implement key storage in `app/packages/shell/src/ipc/keys.ts` using `safeStorage`, probing `isEncryptionAvailable()` and reporting honestly when Linux has no keyring (R4, R15)
- [ ] T030 [P] [US1] Build the React app shell in `app/ui/src/App.tsx` with routing and the Spanish string catalogue in `app/ui/src/i18n/es.ts` — teacher vocabulary only, no project jargon (006 FR-406)
- [ ] T031 [P] [US1] Build the design tokens and base stylesheet in `app/ui/src/styles/tokens.css`, hand-written CSS with custom properties (R10)
- [ ] T032 [US1] Build onboarding step 1, vault location, in `app/ui/src/onboarding/VaultStep.tsx`, defaulting to `Documentos/Rampa` so it can be accepted without a decision (006 FR-402)
- [ ] T033 [US1] Build onboarding step 2, connection, in `app/ui/src/onboarding/ConnectStep.tsx`: one plain sentence, deep link to the provider key page, one paste box, immediate validation, success shown as **"✓ Conectado. Unos 3 céntimos por ficha."** (006 FR-403)
- [ ] T034 [US1] Build onboarding step 3, first learner, in `app/ui/src/onboarding/LearnerStep.tsx` — guided questions in her words, axes derived and shown for confirmation, no axis code visible (006 FR-405)
- [ ] T035 [US1] Implement resumable onboarding state in `app/ui/src/onboarding/state.ts` so closing mid-setup loses nothing (006 FR-401)
- [ ] T036 [US1] Build the adapt screen in `app/ui/src/adapt/AdaptScreen.tsx`: drop a photo or PDF, streaming progress, plain-language summary
- [ ] T037 [US1] Implement the adaptation job orchestration in `app/packages/shell/src/jobs/adapt.ts` wiring ingest → verify gate → adapt → render
- [ ] T038 [US1] Implement PDF export in `app/packages/shell/src/jobs/print.ts` via `webContents.printToPDF()`, with no external tooling (006 FR-425)
- [ ] T039 [US1] Implement the draft mark so only `job.signOff` can clear it, in `app/packages/shell/src/jobs/signoff.ts` (007 FR-509)
- [ ] T040 [P] [US1] Write the onboarding end-to-end test in `app/e2e/onboarding.spec.ts` driving install → vault → key → learner → adapt → print with a stubbed provider

**Checkpoint**: the MVP journey runs end to end with a stubbed provider.

---

## Phase 4 · User Story 2 — the name never leaves the machine (P1)

**Goal**: She types "Lucía" because that is how she thinks; the model never sees it.

**Independent test**: log every outbound request across a session in which she uses a real first name throughout. Zero occurrences (SC-403).

- [ ] T041 [US2] Implement the encrypted name map in `app/packages/shell/src/ipc/names.ts`, ciphertext stored at `.rampa/names.enc` inside the vault and excluded from every export path (R4, 006 FR-417)
- [ ] T042 [US2] Wire `names.redact` into the egress chokepoint in `app/packages/providers/src/send.ts` so substitution covers typed free text as well as stored fields (006 FR-418)
- [ ] T043 [US2] Implement the unknown-name prompt in `app/ui/src/components/NameWarning.tsx`, asking before sending and never silently rewriting (006 FR-419)
- [ ] T044 [P] [US2] Implement display-name resolution in `app/ui/src/hooks/useLearnerName.ts` with a branded type keeping display strings out of payloads (`contracts/ipc-surface.md` rule 3)
- [ ] T045 [US2] Implement code generation in `app/packages/core/src/vault/codes.ts` — opaque, never initials — and flag hand-written initial-like codes (006 FR-421)
- [ ] T046 [P] [US2] Write the redaction test in `app/packages/providers/test/redaction.test.ts` asserting zero name occurrences across a full simulated session

**Checkpoint**: names are enforced absent from egress, verified by test.

---

## Phase 5 · User Story 3 — her notes are hers (P1)

**Goal**: the vault is plain markdown she can open anywhere, edit by hand, and keep if the app disappears.

**Independent test**: edit files by hand outside the app, break some deliberately, confirm nothing is lost or rejected.

- [ ] T047 [P] [US3] Implement profile read/write against the nested layout in `app/packages/core/src/vault/profile.ts` (`profiles/<CODE>/profile.yaml`, `notes.md`, `adaptations.md`)
- [ ] T048 [P] [US3] Implement roster read/write in `app/packages/core/src/vault/roster.ts`, warning on any free-text field long enough to hold a name
- [ ] T049 [US3] Implement the repair reporter in `app/ui/src/components/RepairNotice.tsx` — *"He arreglado el formato… No he cambiado nada de lo que escribiste."* (006 FR-410)
- [ ] T050 [P] [US3] Build the learners screen in `app/ui/src/learners/LearnersScreen.tsx` and the profile editor in `app/ui/src/learners/ProfileEditor.tsx`, axes as observable behaviour from `docs/axis-calibration.md`
- [ ] T051 [P] [US3] Build the notes browser in `app/ui/src/notes/NotesScreen.tsx` over `memory/house.md` and `memory/journal/`
- [ ] T052 [P] [US3] Write the vault-survival test in `app/packages/core/test/vault-repair.test.ts` covering broken YAML, unknown keys, out-of-range axis, renamed file and duplicated learner

**Checkpoint**: `npm run test:vault` passes; the vault opens correctly in a plain editor.

---

## Phase 6 · User Story 4 — she can see what it costs (P2)

- [ ] T053 [P] [US4] Implement usage accounting in `app/packages/core/src/cost/index.ts` with the bundled price table from R7
- [ ] T054 [US4] Persist per-job and per-month totals to `.rampa/costs.json` in `app/packages/shell/src/ipc/cost.ts`
- [ ] T055 [P] [US4] Build the cost display in `app/ui/src/components/CostBadge.tsx` in cents, never tokens (006 FR-422)
- [ ] T056 [US4] Warn before an unusually expensive job in `app/ui/src/adapt/CostGate.tsx`

---

## Phase 7 · User Story 5 — it degrades honestly (P2)

- [ ] T057 [P] [US5] Implement the domain error taxonomy in `app/packages/core/src/errors.ts` and the Spanish message map in `app/ui/src/i18n/errors.ts` — no status codes, no stack traces (006 FR-423)
- [ ] T058 [US5] Implement offline detection and degraded mode in `app/ui/src/hooks/useOnline.ts` so everything except adaptation still works (006 FR-424)
- [ ] T059 [US5] Implement job recovery in `app/packages/shell/src/jobs/recover.ts` so a crash mid-adaptation leaves material and profile intact
- [ ] T060 [P] [US5] Write the degradation test in `app/e2e/degradation.spec.ts` for network loss, bad key and rate limit

---

## Phase 8 · Untrusted content (spec 007, cross-cutting)

- [ ] T061 [P] Implement instruction-shaped-content detection in `app/packages/core/src/ir/injection.ts`, annotating blocks and never removing them (007 FR-503, FR-504)
- [ ] T062 [P] Implement hidden-text surfacing in `app/packages/core/src/ir/hidden.ts` for text present in the source but not visible on the page (007 FR-505)
- [ ] T063 Implement the input bound in `app/packages/core/src/ir/bounds.ts`, reporting rather than silently truncating (007 FR-513)
- [ ] T064 [P] Build the injection notice in `app/ui/src/components/InjectionNotice.tsx` quoting and locating the text in plain Spanish
- [ ] T065 [P] Author the ten fixtures in `cases/injection/` per its README, including the two clean controls
- [ ] T066 Write the injection suite in `app/packages/core/test/injection.test.ts` asserting all six pass conditions per fixture and no notice on the clean controls

**Checkpoint**: `npm run test:injection` passes, including no false positives on the controls.

---

## Phase 9 · Memory and review (specs 003, 004)

- [ ] T067 [P] Implement journal read/write and index generation in `app/packages/core/src/memory/index.ts`, writing `.rampa/index.md`
- [ ] T068 Implement scoped-memory loading in `app/packages/core/src/memory/load.ts` — house style and the subject learner always, journal only for selected recipes, never wholesale (003 FR-207, FR-208)
- [ ] T069 [US1] Build the review screen in `app/ui/src/review/ReviewScreen.tsx` leading with risky decisions per `checklists/review.md`
- [ ] T070 Implement the scope routing question in `app/ui/src/review/ScopeQuestion.tsx` with **no default option**, since inferring scope is a privacy incident (003 FR-201)
- [ ] T071 [P] Implement handover export in `app/packages/core/src/memory/handover.ts` with full and shareable variants, the shareable one carrying no learner scope and no names (004 FR-313, 003 FR-213)
- [ ] T072 [P] Implement `forget` in `app/packages/core/src/memory/forget.ts`: list everything first, remove, verify nothing remains, record a dated tombstone with no learner content (003 FR-215…217)

---

## Phase 10 · Polish and cross-cutting

- [ ] T073 [P] Implement corpus update in `app/packages/shell/src/ipc/corpus.ts`, one action, never touching the vault (006 FR-414)
- [ ] T074 [P] Build the "Acerca de" screen in `app/ui/src/about/AboutScreen.tsx` carrying both licences and corpus attribution (R8)
- [ ] T075 [P] Add accessibility checks to `app/e2e/a11y.spec.ts` against the WCAG 2.2 AA target for the app's own interface
- [ ] T076 [P] Write `app/README.md` covering build, test and release for contributors
- [ ] T077 Add the CI workflow in `.github/workflows/app.yml` running lint, core, isolation, vault, injection and e2e on all three platforms
- [ ] T078 Run the full `quickstart.md` validation and record the results in `specs/006-desktop-app/validation.md`
- [ ] T079 [P] Write the uninstall-survival test in `app/packages/core/test/vault-standalone.test.ts` asserting a vault is complete and readable with no application present (006 FR-408, previously uncovered)
- [ ] T080 Enforce the corpus as read-only at runtime in `app/packages/shell/src/ipc/corpus.ts` and assert it in `app/packages/shell/test/corpus-readonly.test.ts` — bundling it is not the same as preventing writes (006 FR-413, previously uncovered)
- [ ] T081 Record `recipe@version` in provenance in `app/packages/core/src/ir/provenance.ts` and assert in `app/packages/core/test/corpus-update.test.ts` that a corpus update never rewrites already-adapted material (006 FR-416, previously partial)
- [ ] T082 [P] Add the Principle I guard to `app/README.md` and the CI checklist in `.github/workflows/app.yml`: any string telling the teacher *how to adapt* belongs in the corpus, not in code. Weakest gate in the plan, so it is at least explicit

---

## Dependencies

- **Phase 1** blocks everything.
- **Phase 2** blocks all user stories.
- **US1 (Phase 3)** is the MVP and blocks nothing else structurally, but US2 and US5 touch its files.
- **US2 (Phase 4)** depends on T028's chokepoint from US1.
- **US3 (Phase 5)** depends only on Phase 2.
- **US4, US5** depend on Phase 2 and are independent of each other.
- **Phase 8** depends on T013/T014 and is required before any real material is processed.
- **Phase 9** depends on Phase 2 and US1's review flow.

## Parallel opportunities

- T002-T004 together; T009-T010 together; T012-T013, T015-T019 largely parallel.
- T025-T027 (providers) parallel with T030-T031 (UI foundations).
- T047-T052 (US3) parallel with T053-T056 (US4).
- T061-T065 parallel; T066 after them.

## Implementation strategy

**MVP = Phase 1 + Phase 2 + Phase 3.** That is the journey the whole feature is
judged on. Ship nothing to a real teacher before **Phase 8**, because processing
her real material without injection defences is the one irreversible mistake
available here.

Order after MVP: Phase 8 (safety) → Phase 4 (the name promise) → Phase 5 (trust in
the vault) → Phase 9 (the loop that makes it worth using) → Phases 6, 7, 10.
