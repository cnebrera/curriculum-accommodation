# Tasks: Modo ensayo — la primera noche no depende de una clave

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-six tasks, and the first two are the invariants that make the feature safe to
build: zero network (SC-3302) and a real vault that does not change by a byte (SC-3303).
They are written red, before the rehearsal exists, because a separation check written
after the feature works is written to fit whatever leaks the feature already has — the
argument `021` made for the answer key, applied to a fictional child near a real caseload.

The shape of the rest follows Phase 0: **one new root and served jobs** — the rehearsal
store is a second `Vault` instance over `userData/ensayo/`, the two model steps are served
pre-computed from an authored sample, and everything else is the real deterministic code
pointed at the rehearsal vault.

---

## Phase 1 · Setup · the two invariants, first and red

- [x] T001 Write `app/packages/shell/test/ensayo-boundary.test.ts` and
      `app/e2e/ensayo-invariants.spec.ts` **first**, red, per
      [quickstart.md](quickstart.md) §1 — **SC-3302, zero network, both stacks** (FR-3302).
      Structural half: a module-graph test in the shape of `test:isolation` — nothing under
      `packages/shell/src/ensayo/` imports `@rampa/providers`, `ipc/keys.js`,
      `ipc/vault.js` or `ipc/cost.js`. Runtime half: under `RAMPA_TEST`, a counter in
      `app/packages/shell/src/main.ts` watching Chromium's session **and** Node's `fetch`
      (provider calls leave through undici in the main process — a `webRequest` counter
      alone would pass while a request escaped), read back over a diagnostics channel and
      asserted zero across a full rehearsal.
- [x] T002 [P] Write the **SC-3303** half of `app/e2e/ensayo-invariants.spec.ts` **first**,
      red, per quickstart §1 (FR-3306): hash every byte of the real vault, rehearse
      completely — including typing a note and printing — hash again, **identical**; then
      connect a provider, run one real adaptation, and sweep vault and ledger for any
      sample marker (learner code, job id, «material de ejemplo»). Zero. Bytes, not
      intentions.

---

## Phase 2 · Foundational · the root, the seam, the sample

**Blocking**: nothing in Phase 3 or later may start until this phase is green. The ensayo
IPC written before the vault-parameter refactor would be written *around*
`currentVault()`, and «around» is where a real-vault reference sneaks into rehearsal code.

- [x] T003 The vault becomes a parameter at the job layer: `renderJob` in
      `app/packages/shell/src/jobs/print.ts` and the sign-off in
      `app/packages/shell/src/ipc/signoff.ts` take a `Vault` instead of calling
      `currentVault()` internally; the real IPC handlers pass `currentVault()` — no
      behaviour change, asserted by the existing suites staying green. **Only the IPC
      layer decides which vault** (research R2): this is the whole seam.
- [x] T004 `app/packages/shell/src/ensayo/store.ts` · the rehearsal store (FR-3306): a
      second `Vault` over `app.getPath('userData')/ensayo/`, laid out per
      [data-model.md](data-model.md) — the vault's own layout, so `resolveDocument`,
      `isSignedOff` and the renderers run over it unchanged. Seed from the bundled sample;
      **discard = delete the root, totally** (FR-3308); re-enter re-seeds; `ensayo.json`
      makes a mid-rehearsal restart resumable. Offline lifecycle tests per quickstart §2,
      including the escape-path refusal and the asserted **absence** of a ledger file.
- [x] T005 [P] `sample/ensayo/` · **author the sample set** (FR-3307, FR-3310), reviewed
      like corpus, in Spanish, CC BY-SA: the fictional profile (`sample: true` in front
      matter AND the declaration in its prose — «Este alumno no existe» — axes only,
      ordinary given name, no surname, invented school, per `app/scripts/seed-learners.mjs`'s
      register); the source photo; the reading with its **one authored flaw** named in
      `manifest.yaml`; the pre-computed adaptation and its genuine report citing real
      recipes `id@version`; the would-be costs. The «material de ejemplo» sentence and the
      pending-review mark live **in the documents**, so every rendering carries them by
      construction (FR-3305, research R4). **Never generated at build** — authored, and
      the one adaptation every new user will see.
- [x] T006 `app/scripts/bundle-corpus.mjs` bundles `sample/` beside `recipes/`,
      `instructions/` and `checklists/`, under the same licence gate — the sample is
      content and ships with attribution like the rest of the commons.
- [x] T007 [P] `app/packages/shell/test/ensayo-sample.test.ts` · the sample tells the
      truth, per quickstart §3 (FR-3310): every cited recipe resolves in the bundled
      corpus at that version; the manifest's flaw exists at the authored spot and nowhere
      else; the profile declares itself and carries no surname and no diagnosis
      (FR-3307); every document carries the ensayo sentence in its content (FR-3305).

**Checkpoint**: T001/T002 still red (the mode does not exist), everything else green — the
root is confinable, the sample is honest, the seam is a parameter.

---

## Phase 3 · User Story 1 · The whole journey, the first night (P1) 🎯 MVP

**Goal**: with no provider and no network, «probar con un ejemplo» carries her through
bring → verify → adapt (simulated) → review → sign → print, marked at every moment.

**Independent Test**: quickstart §4 on a machine with no provider; §6 with networking
disabled — printed, signed sample, zero requests, zero cost.

- [x] T008 [US1] `app/packages/shell/src/ensayo/ipc.ts` · the `ensayo:*` channels
      (FR-3301, FR-3302): state/start/resume/discard over the store, `bring` (the sample
      photo), the reading and the pre-computed adaptation **served, behind a staged
      progress that says «simulado»** — never a fake `Provider`, never an entry in the
      credential store (research R2). Registered in `app/packages/shell/src/main.ts`;
      T001's boundary test now bites: this module imports neither `currentVault` nor
      `@rampa/providers`.
- [x] T009 [US1] `app/ui/src/data/ensayo.ts` · the hook layer for the `ensayo:*` channels
      — components never call `window.rampa` (`013`, `ui/test/data-layer.test.ts` already
      asserts it and must keep passing).
- [x] T010 [US1] `app/ui/src/ensayo/EnsayoFrame.tsx` · the mark, structurally (FR-3305,
      SC-3304): every rehearsal screen renders inside it and no rehearsal screen exists
      outside it, so «100% of screens marked» is a property of the component tree. Built
      from `ui/src/shell/` pieces — a frame that invents its own layout is a fact about
      the shell (`013`).
- [x] T011 [US1] The offer, beside the wall and never a step (FR-3301, `016`'s no-default
      rule): with no provider connected, `app/ui/src/onboarding/ConnectStep.tsx` and the
      no-provider state in `app/ui/src/App.tsx` offer «probar con un ejemplo» **alongside**
      connecting — two doors, neither pre-chosen, and the teacher with her key already in
      hand is never routed through fiction (spec edge case).
- [x] T012 [US1] The rehearsal stays reachable after a provider is connected (FR-3304),
      from the connection screen in `app/ui/src/settings/` — for showing a colleague —
      still marked, still separate; re-entry re-seeds through T004.
- [x] T013 [US1] `app/ui/src/ensayo/` · the journey's screens inside `EnsayoFrame`
      (FR-3301): meet the learner (the profile shown as the first example of a good one,
      its inventedness visible — FR-3307), bring the sample photo, **verify the reading
      against the photo** — real comparison over the rehearsal vault, where T005's flaw
      waits — then the simulated adaptation arriving with its genuine report. Reuses the
      review/report presentation components; the data comes only through T009's hooks.
- [x] T014 [US1] Sign and print, for real, over the rehearsal vault (FR-3305, FR-3311):
      T003's `renderJob` and sign-off pointed at the rehearsal root — the draft mark
      derived from the document, removed only by sign-off, **one signature per sheet**;
      the printed PDF says «material de ejemplo» on the paper because the document does
      (T005), with no renderer branch. Output lands under the rehearsal root, nowhere
      else.
- [x] T015 [US1] Would-be costs (FR-3303): each simulated step shows what an equivalent
      real run would cost, from the sample's manifest, labelled as an estimate, in `006`
      FR-403's register («esto habría costado unos 3 céntimos») — and **nothing is
      written to any ledger**: her real month-badge is unchanged (asserted in T002's walk)
      and the rehearsal root has no ledger file at all (asserted in T004).
- [x] T016 [US1] The name question fires, offline (FR-3308, FR-3311): a note she types
      goes through core's deterministic detector
      (`app/packages/core/src/redact/names.ts`) before the simulated adapt — the sample's
      authored note guarantees she sees it fire once even if she types nothing — and the
      screen says the other half out loud: nothing was sent anywhere, because there is
      nowhere to send it. What she typed lives under the rehearsal root and dies with the
      discard.
- [x] T017 [US1] `app/e2e/ensayo.spec.ts` · the walk from quickstart §4, all eight steps —
      including finding the flaw, the name question, the unchanged month-badge — plus the
      SC-3304 inventory: every screen in the walk carries the ensayo mark. This is also
      what T001/T002 run their counters and hashes across.

**Checkpoint**: the first night exists — a printed, signed, loudly-fake sheet, produced
with no key, no network and no cost, and both invariants green.

---

## Phase 4 · User Story 2 · The rehearsal ends cleanly (P1)

**Goal**: connecting her real provider makes the rehearsal step aside — reachable, marked,
and absent from everything real.

**Independent Test**: quickstart §1's long form — rehearse, connect, real use, inspect.

- [ ] T018 *(NECESITA UNA CLAVE REAL — es un paseo de pago, como T031 de `026` y T025 de `022`. La mitad offline del barrido está en `e2e/ensayo.spec.ts`: hash del vault antes y después, byte a byte.)* [US2] Extend `app/e2e/ensayo-invariants.spec.ts`: after connect + one real
      adaptation, the rehearsal is still reachable (FR-3304), still framed, and the sweep
      of vault + ledger for sample markers stays zero (FR-3306) — T002 turning from red to
      the feature's standing regression test.
- [x] T019 [US2] Discard and resume, as she would (FR-3308): discard offered from inside
      the rehearsal, total by construction (the root goes); restart mid-rehearsal offers
      resume or start over, and **either way the real vault was untouched** (US2 scenario
      3, covered by T002's hash running across a kill-and-relaunch in
      `app/e2e/ensayo-invariants.spec.ts`).
- [ ] T020 *(BLOQUEADA: `034-como-llegan-las-versiones` no está implementada todavía, así que no hay aviso de actualización con el que coordinarse. Va con `034`.)* [P] [US2] Coordination with `034`: an update notice does not interrupt a
      rehearsal — the notice waits (spec edge case). If `034`'s notice is not yet built,
      record the obligation in `specs/BACKLOG.md` against `034` instead of building a stub
      here; a task that cannot land must not land as an if.

**Checkpoint**: a fictional child cannot reach a real caseload — proven by bytes, standing
in CI.

---

## Phase 5 · User Story 3 · The rehearsal teaches the barriers (P2)

**Goal**: what she rehearses is the product's character, not a demo's happy path.

**Independent Test**: quickstart §3 (the sample's truth) plus the distinction checks below.

- [x] T021 [US3] The reading-check catches something real (FR-3310): the walk in
      `app/e2e/ensayo.spec.ts` fails unless the verification screen surfaces T005's
      authored disagreement — checking is the point of the screen, and a perfect sample
      would train her to skip the product's second most important gate.
- [x] T022 [US3] The report is a genuine report (FR-3310): shown through the same report
      view as a real run (`app/ui/src/review/ReportView.tsx`), recipes cited and
      resolvable (T007), decisions explained — not lorem ipsum, because it is the first
      report she ever reads and it teaches her what reviewing decisions (Principle VI)
      feels like.
- [x] T023 [US3] Real and simulated, told apart in her language (FR-3309): the two served
      steps say «simulado — con tu clave, aquí trabajaría la IA»; the deterministic
      features (`028` materials, the profile, the record) say «esto ya funciona de verdad
      sin clave». Copy in `app/ui/src/i18n/es.ts`; asserted over the walk — the rehearsal
      never claims more, and never less, than the product.
- [x] T024 [P] [US3] The barriers are experienced, not narrated (FR-3311), asserted in
      `app/e2e/ensayo.spec.ts`: the sheet arrives marked and prints marked until she
      signs; signing one sheet unsigns nothing else; the name question fired at least
      once in every complete walk. Principle VII, felt.

---

## Phase 6 · Polish · and the parts that need a person

- [x] T025 **Look at it** (`013`, quickstart §5): `npm run shots` over the ensayo screens
      — is the mark unmissable *while being ignorable*? — and the printed sample beside a
      real sheet: at arm's length, in a pile of photocopies, can they be confused? SC-3304
      asserts presence; only eyes can assert sufficiency.
- [ ] T026 The two verdicts a machine cannot give, arranged: **SC-3301** on a machine with
      networking disabled — install to printed, signed sample, timed under fifteen
      minutes, by someone who has never seen Rampa (quickstart §6); and **SC-3305 needs a
      teacher** — rehearse one evening, real flow next morning without help (quickstart
      §7). Transfer is the feature's purpose, it is the only criterion that can come back
      «no» with everything else green, and «where did she stall» is worth more than the
      answer. Keep this coverage table current and file anything found on the way in
      `specs/BACKLOG.md`.

---

## Not in scope, recorded so it stays a decision

- **Corrections and memory during rehearsal.** A correction is a model call; a canned
  correction is a canned conversation, which is a demo. No scope question, no memory
  writes anywhere — v1 teaches the happy path plus the barriers (spec assumption).
- **Simulated failure modes** (provider errors, cost warnings). A troubleshooting
  rehearsal is future work, per the spec.
- **A second sample set.** One well-chosen worksheet and one learner at launch; an exam or
  a `028` agenda walkthrough grow from use (spec assumption), and `034`'s corpus channel
  can carry them.
- **The rehearsal as a test fixture.** The e2e suite must never lean on ensayo to fake a
  provider, and ensayo must never grow test-only affordances a teacher can trip over
  (research R6).

## Dependencies

- T001 and T002 before everything, red.
- **Phase 2 blocks Phases 3–5 entirely.** T003 before T008 (the seam before its caller);
  T004 before T008; T005 before T004's seeding tests, T007, T013 and T021.
- T006 before anything reads the bundled sample at run time (T004, T008).
- T008 before T009, T009 before T010–T016.
- T010 before T013/T014 (no rehearsal screen outside the frame, ever — including the
  first one written).
- T014 depends on T003 and T005 (the mark is in the document it prints).
- T017 after T011–T016; T018/T019 extend T002's spec and follow T017.
- T025 and T026 last; T026 is the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`scripts/check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
Written **with** the tasks, per the lesson `002` taught on 2026-08-30.

| | Where it is satisfied |
|---|---|
| FR-3301 | T008 (the served journey) · T011 (the offer, beside not instead) · T013 (the screens) |
| FR-3302 | T001 · both stacks instrumented, and the module graph as the structural half · T008 (no provider import exists to call) |
| FR-3303 | T015 · shown in `006` FR-403's register, written to no ledger |
| FR-3304 | T012 · and re-proven after real use by T018 |
| FR-3305 | T010 (every screen, structurally) · T005 (the mark **in** the documents) · T014 (on the printed paper) |
| FR-3306 | T004 (its own root, its own `Vault`) · T002/T018 (byte-level, standing) · T001 (the imports that cannot exist) |
| FR-3307 | T005 (declared in front matter and prose, resembling nobody) · T007 (asserted) · T013 (visible when she meets him) |
| FR-3308 | T004 (discard = the root goes) · T016 (typed text lives and dies inside it) · T019 (offered, total, restart-safe) |
| FR-3309 | T023 · simulated says so, real says so — never more, never less |
| FR-3310 | T005 (the authored flaw and the genuine report) · T007 (both asserted) · T021 (findable) · T022 (readable) |
| FR-3311 | T014 (draft mark and one signature, experienced) · T016 (the name question fires) · T024 (asserted over every walk) |
