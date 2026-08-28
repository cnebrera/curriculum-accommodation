# Tasks: Connecting — choosing a service, and getting the key

**Input**: Design documents from `specs/009-connect-wizard/`

**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. `quickstart.md` defines them as the validation method, and the
recommendation rule is the kind of logic that is wrong in ways nobody notices —
a rule that quietly recommends the cheapest service for a child's data would look
fine in a screenshot.

**Organization**: By user story. Each phase is an independently testable
increment.

> **What is already built** (`006`): the connection step, the key store, the
> egress chokepoint, the cost display, and three adapters. Almost nothing here is
> new machinery; it is a fourth adapter, a corpus format, and a screen that turns
> facts into a recommendation.

---

## Phase 1 · Setup

- [ ] T001 Create the catalogue directory `instructions/providers/` with `README.md` pointing at `specs/009-connect-wizard/contracts/provider-catalogue.md` as the authority, so whoever adds the seventh service finds the contract rather than guessing from the six
- [ ] T002 Confirm `app/scripts/bundle-corpus.mjs` already ships `instructions/**` recursively, and add an assertion to `app/packages/shell/test/corpus-guarantees.test.ts` that `corpus/instructions/providers/` contains at least one entry — a catalogue that silently fails to bundle produces an application with no services and no error

**Checkpoint**: `npm run bundle:corpus` puts the catalogue in the bundle, and a test says so.

---

## Phase 2 · Foundational — blocks every user story

- [ ] T003 Define the catalogue types and parser in `app/packages/core/src/providers/catalogue.ts` per data-model.md: front matter to a typed `ServiceEntry`, plus the body split into `intro`, `steps[]` and `troubleshooting[]` from the three parsed headings
- [ ] T004 Implement repair-not-reject in the same parser: a missing `id`, `key_url` or `last_checked` skips the entry and logs it; unknown fields are preserved; an `endpoint` on a non-`compatible` adapter is ignored and logged. A malformed file must degrade to "this service is not offered", never crash the screen she is standing on
- [ ] T005 [P] Implement the staleness rules in `catalogue.ts` per research R3: ≤180 days normal, 181–365 offered with a marker, >365 not offered. Take "today" as a parameter — a test that changes behaviour in January is not a test
- [ ] T006 [P] Implement key normalisation and prefix identification in `app/packages/core/src/providers/key.ts`: strip whitespace, smart quotes and a `KEY=` prefix; identify the owning service by longest matching prefix so `sk-ant-` is never read as `sk-`; detect a pasted page by shape and length
- [ ] T007 Implement the recommendation rule in `app/packages/core/src/providers/recommend.ts` exactly as the seven steps in data-model.md, returning `{ service, reason }` or a stated conflict. The reason is assembled from *why the winner survived* so it cannot drift from the decision (FR-707a, FR-707b, FR-713)
- [ ] T008 Write the catalogue tests in `app/packages/core/test/catalogue.test.ts` covering quickstart §1: the six entries parse, each malformed case degrades as specified, unknown fields round-trip, and both staleness thresholds fire
- [ ] T009 Write the recommendation tests in `app/packages/core/test/recommend.test.ts` covering quickstart §2 — including the two that matter most: **a `jurisdiction: other` service is never recommended even when it is cheapest and ranks best**, and a no-card recommendation always reads photographs
- [ ] T010 [P] Write the key-handling tests in `app/packages/core/test/provider-key.test.ts` covering quickstart §3
- [ ] T011 Export the new modules from `app/packages/core/src/index.ts`

**Checkpoint**: `npm run test:all` passes offline with no key; `npm run test:isolation` still passes, proving the new logic reaches no network.

---

## Phase 3 · User Story 1 — one question, then one recommendation (P1) 🎯 MVP

**Goal**: She answers whether she can use a card and gets one recommendation with a reason she could repeat to her head teacher.

**Independent test**: Launch with the catalogue bundled and no key. One question appears; a recommendation with a reason appears; the reason names why that service and not another.

- [ ] T012 [US1] Author the six catalogue entries in `instructions/providers/`: `google.md`, `groq.md`, `mistral.md`, `anthropic.md`, `openai.md`, `deepseek.md`. Every fact checked against the provider's own pages on the date in `last_checked` — not copied between entries, not inferred (contract §"What the author of an entry promises")
- [ ] T013 [US1] Write each entry's walkthrough: at most six steps, one action each, saying what she will **see** on the provider's page. `openai.md` leads with the ChatGPT-Plus-does-not-work warning; `google.md` and `groq.md` state their free-tier limits plainly
- [ ] T014 [US1] Expose the catalogue over IPC in `app/packages/shell/src/ipc/corpus.ts` as `corpus:services`, filtering to entries whose `adapter` has a registered implementation and whose facts are not older than a year, and add it to `app/packages/shell/src/preload.ts`
- [ ] T015 [US1] Rebuild `app/ui/src/onboarding/ConnectStep.tsx` as question → recommendation → walkthrough, reading strings through the i18n context (never importing `es` directly — that was T095's whole lesson)
- [ ] T016 [US1] Build the walkthrough in `app/ui/src/onboarding/Walkthrough.tsx`: numbered steps, the deep link opening **outside** the application, `signup_first` shown before step one, and "no encuentro eso" as a details block
- [ ] T017 [US1] Persist walkthrough position so reopening returns her to the service she was working on (FR-719), reusing `app/ui/src/onboarding/state.ts`
- [ ] T018 [US1] Add the optional data-location line beside the recommendation per FR-708: one quiet line, "no lo sé" is first-class and leaves the recommendation unchanged, and it offers `docs/proteccion-de-datos.md`
- [ ] T019 [US1] Add the honest-residual sentence wherever data location is discussed (FR-708a): barriers and notes travel pseudonymised, and a name handwritten on a photographed worksheet reaches the provider inside the image. It MUST NOT claim nothing personal leaves

**Checkpoint**: the MVP journey runs to the paste box with the catalogue driving every word on screen.

---

## Phase 4 · User Story 2 — she can compare, in her terms (P1)

**Goal**: The full list, comparing what actually decides it, with the facts dated.

**Independent test**: Open the comparison; every column in FR-710 is present; every fact shows its check date; no model name, token count or context size appears anywhere.

- [ ] T020 [US2] Build `app/ui/src/onboarding/ServiceComparison.tsx`: card, free tier and its limit, cost per worksheet, where it is processed, what the terms say about training, photographs, and one sentence on who it suits
- [ ] T021 [US2] Show `last_checked` per row, and the staleness marker for anything past 180 days (FR-706)
- [ ] T022 [US2] Mark unmeasured costs as estimates and unmeasured quality as provisional, in her words — *"de momento por lo que sabemos, no por lo que hemos medido"* (research R6)
- [ ] T023 [US2] Flag aggregators explicitly: a `jurisdiction: varies` row says the request may be forwarded again, so "where is it processed" answers *depende*, and a school cannot act on *depende*
- [ ] T024 [P] [US2] Add the jargon assertion to `app/e2e/connect.spec.ts`: the rendered text of both screens contains no model name and none of "IR", "corpus", "token", "prompt", "endpoint" (FR-702)

**Checkpoint**: `npm run test:e2e -- connect` passes the comparison assertions.

---

## Phase 5 · User Story 3 — she is walked to the key (P1)

**Goal**: Covered by T013/T016; this phase is the adapter that makes the six services real.

**Independent test**: Each of the six validates a correctly-shaped key against a stubbed endpoint, and each rejects another service's key by naming that service.

- [ ] T025 [US3] Implement the OpenAI-compatible adapter in `app/packages/providers/src/compatible.ts` per research R1: endpoint and model from the catalogue entry, streaming and usage parsing as in `openai.ts`, and **no branching on service id** — differences that are not the endpoint are declared quirks
- [ ] T026 [US3] Implement quirk handling for `no-usage` and `no-stream-options` in the same adapter, driven by the entry's `quirks` list
- [ ] T027 [US3] Register the compatible adapter in `app/packages/providers/src/index.ts` and resolve an entry's adapter by its `adapter` field rather than by `id`
- [ ] T028 [US3] Write the compatible-adapter contract tests in `app/packages/providers/test/compatible.test.ts` against a stub: streaming assembles, usage is read, a missing-usage quirk does not throw, and the egress chokepoint still runs first
- [ ] T029 [US3] Extend `app/packages/providers/test/chokepoint.test.ts` to cover the compatible adapter — the redaction invariant must hold for a service added by a Markdown file, or the guarantee is only true for the three that were hand-written

---

## Phase 6 · User Story 4 — pasting tells her the truth (P1)

**Goal**: Five distinct failure sentences, each with a next step.

**Independent test**: Trigger all five and read them. None says only "no válida".

- [ ] T030 [US4] Wire normalisation and prefix identification into the paste box, so a key from another service names that service and offers the switch (FR-722)
- [ ] T031 [US4] Map the five validation outcomes to their Spanish sentences in `app/ui/src/i18n/es.ts`, each with its next step; the wrong-service case names the service it belongs to
- [ ] T032 [US4] Report success in cost terms from the entry's `cost_cents` — **"✓ Conectado. Unos N céntimos por ficha."** — rather than from a hardcoded three (FR-724). Today's screen says "3 céntimos" regardless of provider
- [ ] T033 [US4] Add the failure-path cases to `app/e2e/connect.spec.ts` covering quickstart §4: malformed, wrong service, and offline. Expired and no-credit are asserted at the adapter level in T028, since triggering them needs a real account

---

## Phase 7 · User Story 5 — she can change it later (P2)

- [ ] T034 [US5] Migrate the credential store to one key per service in `app/packages/shell/src/ipc/keys.ts` per data-model.md, reading the old single-key shape once and rewriting it. Nobody has a real installation yet, so this is the cheapest it will ever be (research R5)
- [ ] T035 [US5] Make validation precede storage, so a failed replacement cannot be destructive and FR-730 holds by construction rather than by an undo path
- [ ] T036 [US5] Build `app/ui/src/settings/ConnectionScreen.tsx`: the active service, its `verified_at`, a switch, and a replace — never the stored key (FR-729)
- [ ] T037 [US5] Remind her once when a switch changes jurisdiction (FR-731), because that is the fact her school cared about
- [ ] T038 [P] [US5] Write the credential-store tests in `app/packages/shell/test/keys.test.ts`: migration from the old shape, per-service isolation, and a failed replacement leaving the previous key working

---

## Phase 8 · Polish and cross-cutting

- [ ] T039 [P] Add a CI check in `.github/workflows/app.yml` that fails when any catalogue entry's `last_checked` is older than 300 days — earlier than the run-time threshold, so a contributor fixes it before a teacher sees a marker (research R3)
- [ ] T040 [P] Add the catalogue to the Principle I reviewer checklist in `.github/workflows/app.yml`: a cost figure, a step or a jurisdiction claim added to `app/` instead of to a catalogue entry is the leak this feature exists to prevent
- [ ] T041 Run quickstart §5 — connect all six for real, once — and record in `specs/006-desktop-app/validation.md` which services were actually reached. An adapter implemented against documentation and never called is not verified, and that document exists to say so
- [ ] T042 Update `docs/escenario.md` moment 0 to describe the real connection step, since it currently describes 006's minimal version
- [ ] T043 [P] Add `009` to the spec table in `docs/decisions/README.md`

---

## Dependencies

- **Phase 1** blocks everything.
- **Phase 2** blocks all user stories. T003/T004 block T005–T009.
- **US1 (Phase 3)** is the MVP. T012 blocks T014–T019: the screen has nothing to render without entries.
- **US2 (Phase 4)** depends on Phase 2 and on T012's entries.
- **US3 (Phase 5)** is independent of US1's UI and can run in parallel with it.
- **US4 (Phase 6)** depends on T006 and on US3 for anything beyond the shape check.
- **US5 (Phase 7)** depends on T034 before T035–T038.
- **T041** depends on everything, and on a real key.

## Parallel opportunities

- T005, T006 together; T008, T009, T010 together once T003/T004 land.
- Phase 5 (the adapter) in parallel with Phase 3 (the screen) — different packages, no shared files.
- T012 and T013 are one file each per service and parallelise six ways, but every entry needs its facts checked against the provider's own pages, which is research time and not typing time.

## Implementation strategy

**MVP = Phase 1 + Phase 2 + Phase 3.** That is a screen driven entirely by the
catalogue, which is the property the whole feature turns on.

Order after MVP: **Phase 5 (the adapter) → Phase 6 (the failure sentences) →
Phase 4 (the comparison) → Phase 7 → Phase 8.** The adapter comes before the
comparison because three of the six services do not exist without it, and a
comparison listing services that cannot be selected is worse than no comparison.

**Do not run T041 before Phase 6.** Spending a real key on a screen whose failure
paths are unwired means the first genuine error a teacher could hit is one nobody
has seen.
