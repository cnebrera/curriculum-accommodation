# Tasks: La normativa es un corpus

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-nine tasks, and the first one is a grep. The extraction of Andalucía must change
nothing for a teacher in Sevilla and leave nothing Andalusian outside the corpus file —
so the test that says «zero artefacts outside the corpus» and the snapshot that says
«her draft is byte-identical» are written **before** anything moves, while they can
still be red against today's code.

The shape of the rest follows Phase 0: one contract (mirroring `011`'s), one resolver
(mirroring `024`'s precedence), one scan (reusing `007`'s tiers plus P18's shapes) — and
a contract with **no field that reaches any guard**, which is FR-2709 before any test
runs.

---

## Phase 1 · Setup · the two tests that come first

- [x] T001 Write `app/packages/core/test/no-territory-outside-corpus.test.ts` **first**,
      red, per [quickstart.md](quickstart.md) §1: the named Andalusian artefact list
      (Séneca, 8-3-2017, Instrucciones de 8 de marzo, DIAC, ACNS, ACS, Andalucía…) greps
      to zero in `instructions/*.md` outside `instructions/normative/`, in
      `app/packages/*/src` and `app/ui/src`, and in every generic-mode rendering the
      suite produces. Allowlist: `instructions/normative/`, `docs/normativa-andalucia.md`,
      `specs/`. It must be red at all the sites research R5 names — the four TypeScript
      ones included — because a grep written after the refactor is written to fit it
      (FR-2704, SC-2701, SC-2702)
- [x] T002 [P] Capture the golden Andalusian draft **before the refactor**:
      `app/packages/core/test/andalucia-unchanged.test.ts` snapshots a drafted ACNS from
      a fixture record with today's code; after extraction, the same draft with `es-an`
      selected must be identical apart from the provenance line T012 adds — and that
      exception is declared in the test, not discovered by it (FR-2704, US1 «nothing
      changes for her»)

---

## Phase 2 · Foundational · the extraction, then the machinery, before any screen

**Blocking**: nothing in Phase 3 or later may start until this phase is green. The
extraction rewrites the base corpus every consumer reads; screens built against the
pre-extraction shape would be built twice.

- [x] T003 Write `instructions/normative/es-an.md` per
      [contracts/normative-corpus.md](contracts/normative-corpus.md): everything
      Andalusian moved from `instructions/guide.md`/`acs.md` — the ACNS/ACS table, the
      `acns_sections` list as `documents:`, Séneca as `register`, the printed phrases
      (the «no está presentado» line, the name line, the ACS authorship footer), the
      8-3-2017 provenance comment, and territory clinical terms as
      `clinical_terms_extra`. `reviewed_by_teacher: false`; `last_checked` from
      `docs/normativa-andalucia.md` (FR-2704)
- [x] T004 Rewrite `instructions/guide.md` and `instructions/acs.md` as **the generic
      product** (research R3): «el documento de adaptación vigente en tu territorio»,
      «tu plataforma de registro»; keep the clinical base list, the decline and
      `proposal_phrases` (universal, not territorial); gain the generic draft scaffold —
      its own section list of only what Rampa can source — and the generic
      statement-plus-orientador-pointer and provenance-line templates the drafts print
      (FR-2703, FR-2704)
- [x] T005 [P] `instructions/normative/README.md`: points at the contract, and states
      the hierarchy where corpora are documented — **hard rules outrank every corpus**
      (FR-2709, spec edge case), in the teacher's language
- [x] T006 Parser `app/packages/core/src/normative/parse.ts` per
      [data-model.md](data-model.md): repair-not-reject for structure (`011` FR-907's
      rule), unknown fields preserved, a file with no usable id/label not offered — and
      the structural assertion beside it: **no parsed field reaches any guard**;
      `checkDeclines`, the clinical base list, the output checks and the draft-mark path
      take no corpus input (FR-2709)
- [x] T007 Resolver `app/packages/core/src/normative/resolve.ts` returning
      `ResolvedNormative`: precedence learner ▸ configuración ▸ generic (`024` FR-2215's
      chain); `normative_corpus: none` forces generic; a selected-but-missing corpus is
      generic **with the notice**, never another corpus; the provenance line is composed
      here and nowhere else, from review status + derived origin (FR-2701, FR-2702,
      FR-2711, research R2/R5)
- [x] T008 Shell loader `app/packages/shell/src/corpus/normative.ts`: bundled corpora via
      `readBundledDir('instructions', 'normative')`, vault corpora from `normative/`,
      the selection and activation log in `normative/selection.md`, origin derived
      (bundled | subido | modificado-by-hash), IPC handlers registered from
      `corpus/index.ts` (FR-2701)
- [ ] T009 Move the four hardcoded normative strings out of TypeScript into corpus
      phrases (research R5): the draft header and name line in
      `app/packages/core/src/guide/acns.ts`, the registro line in
      `app/packages/core/src/report/index.ts`, `ACS_FOOTER` in
      `app/packages/shell/src/jobs/guide.ts`, and the sentence in
      `app/ui/src/learners/LearnerSections.tsx` — each supplied by the resolved corpus,
      or by the generic template in `guide.md` when generic. Latent Principle I
      violations; T001 is what stops them creeping back (FR-2704)
- [ ] T010 Consumers read the resolved corpus: `jobs/guide.ts` assembles prompts as
      hard-rules + generic `guide.md`/`acs.md` + the resolved corpus's raw file;
      `draftAcns` takes its document type and sections from the corpus (or the generic
      scaffold); an imported or modified corpus travels **inside P18's fence-with-nonce
      with the task reminder after it** — a bundled one travels as `guide.md` does today
      (FR-2701, research R4)
- [ ] T011 Amend `specs/017-la-guia/spec.md` with **one dated note**, FR-1401 style, on
      its Assumptions' «Andalusia first» and FR-1517: the Andalusian vocabulary moved to
      `instructions/normative/es-an.md` per this feature; extraction unchanged; the
      «DIAC from another comunidad» edge case inverts to the home case when her corpus
      is selected. A note, not a rewrite

**Checkpoint**: T001 green, T002 identical with `es-an` selected, offline suite passing.

---

## Phase 3 · User Story 1 · She says where she teaches (P1) 🎯 MVP

**Goal**: the corpus is a visible selection in Configuración, every normative phrase
follows it, and every drafted document prints its provenance.

**Independent Test**: two configurations, two territories, one identical request — each
draft cites its own corpus and register and names the corpus it followed.

- [ ] T012 [US1] Provenance printed: every drafted normative document **and its report**
      carry the resolver's provenance line — «siguiendo el corpus normativo: Andalucía
      (incluido, sin revisar)» — in the document itself, not only on screen, from the
      template T004 put in the corpus layer (FR-2705, FR-2706)
- [ ] T013 [US1] The «Normativa» pane in `app/ui/src/settings/` (a `SettingsPane`, per
      `025`'s shapes): corpora listed by file with label and review status, none
      pre-selected, generic named as what she has when nothing is; selection by corpus
      id, never by territory string (spec edge case); deselecting returns to generic
      (FR-2701)
- [ ] T014 [US1] The per-learner override: `normative_corpus` parsed in
      `app/packages/core/src/vault/schema.ts` (beside `018`'s pictogram `overrides`),
      editable on the learner's screen, `none` offered for the cross-territory case; it
      never appears in learner-facing output — the existing output check extends to it
      (FR-2702, `011` FR-910's rule)
- [ ] T015 [P] [US1] Assert the review-status honesty: an unreviewed, imported or
      locally-modified corpus can never print as reviewed, because the provenance line
      is built in one place from `review` + derived origin (FR-2706)
- [ ] T016 [US1] `app/e2e/normative.spec.ts`, quickstart §5 items 1–2: select Andalucía
      and the draft prints its provenance; two territories, one request, two drafts each
      citing only its own corpus (SC-2701, SC-2703)

**Checkpoint**: the review's finding is answered — the Andalusian assumption is now a
visible, changeable selection.

---

## Phase 4 · User Story 2 · No corpus, honest generic (P1)

**Goal**: generic mode is a product: helpful drafts, zero territory names, and it says
plainly what is hers to verify.

**Independent Test**: with no corpus selected, draft an adaptation document; no
territory-specific register, law or procedure named; the generic disclaimer present.

- [ ] T017 [US2] Generic drafting end to end: the generic scaffold's sections only, the
      generic statement with one pointer to the orientador, and the §1 artefact grep
      asserted over the rendered output — zero territory names in any generic rendering
      (FR-2703, SC-2702)
- [ ] T018 [US2] Selecting or importing a corpus later affects **new drafts only**:
      assert that a selection change writes no existing document — a document is what it
      was when signed, and its provenance line is already inside it (FR-2710)
- [ ] T019 [US2] Deleting or deactivating the selected corpus falls back to generic
      **with the notice**, never to a silently different corpus — the resolver's
      `selected-missing` case reaching the screen and the next draft (FR-2711)

**Checkpoint**: a teacher in a territory with no corpus has a product, not an apology.

---

## Phase 5 · User Story 3 · She brings her own (P2)

**Goal**: import is shown, scanned, refusable and recorded — the growth path that makes
the layer generic for any country, carrying the injection surface safely.

**Independent Test**: import a corpus file; it is displayed before activation, scanned,
refusable; documents drafted under it carry its provenance and unreviewed status.

- [ ] T020 [US3] The import flow: the **full content shown before any activation**, and
      activation a separate explicit act; the file lands in the vault's `normative/`
      through `Vault`/`resolveInVault` — which refuses paths that leave the vault rather
      than sanitising them, `007` FR-508's refuse-don't-repair posture (FR-2707)
- [ ] T021 [US3] `app/packages/core/src/normative/scan.ts`: deterministic, offline, over
      the raw file — `007`'s tiers via `detectInjection`
      (`app/packages/core/src/ir/injection.ts`), plus the **section-spoofing shapes per
      P18** (headings imitating the prompt's own section markers, role prefixes, fence
      imitation) added beside `detectInjection` so the adapt pipeline gains them too
      rather than a second copy drifting, plus hard-rule-contradicting shapes reported
      as conflicts (FR-2708, FR-2709)
- [ ] T022 [US3] Refused by default, override hers and recorded: findings shown quoted
      and located, activation blocked until her explicit override, the override written
      to the activation log with the content hash — and `007` FR-514's non-blocking rule
      deliberately does **not** apply: activating policy is the moment to block, and a
      false positive costs one press, not a job (FR-2708, SC-2704)
- [ ] T023 [US3] «Modificado por ti»: a vault corpus whose hash no longer matches its
      activation derives `origin: 'modificado'`, prints as such, and re-enters the scan
      before its next activation — editing is allowed and visible, never silent
      (FR-2706, FR-2708)
- [ ] T024 [P] [US3] Fixtures: `cases/injection/` extended with corpus-shaped cases —
      the `007` shapes as normativa files, the P18 section-spoofing shapes, and one
      hostile corpus that «authorises» easier exams and printing names (SC-2704)
- [ ] T025 [US3] **Hard rules outrank every corpus, as a test**: with the hostile
      fixture activated (override recorded), the decline is the same sentence, the exam
      guards, clinical filter and output checks return identical results to no corpus at
      all, and the conflict was reported at import. Lands **with** the import flow, not
      after it — a corpus activatable before this test exists is `021` T022's mistake
      with a policy file (FR-2709)
- [ ] T026 [P] [US3] `e2e/normative.spec.ts` extended with quickstart §5 items 3–6:
      shown-then-activated, hostile refused, override logged, edited prints modificado,
      deletion falls back with notice, learner `none` stays generic

**Checkpoint**: a shared «normativa-madrid.md» from a forum is a shown, scanned,
refusable file — not a prompt.

---

## Phase 6 · Polish · and the parts that need a person

- [ ] T027 **Look at it** (`013` FR-1113/FR-1118): the Normativa pane narrow and at
      `xlarge`; the import screen with findings — whether «no lo actives» reads as
      clearly as it must; the provenance line on a printed draft, which will sit on
      every official document she produces
- [ ] T028 **SC-2705 needs a teacher**: a PT from a second territory, given the import
      flow, the contract and her territory's rules, produces a working corpus without
      touching code. The claim Principle I stakes on this layer; the task is the
      arrangement, not the verdict — and «where she got stuck» is worth more than the
      answer
- [ ] T029 Archive it: this coverage table kept current, and a `specs/BACKLOG.md` entry
      for anything found on the way — including whether `034`'s corpus updates need a
      note that normative corpora update under FR-2710's «signed documents never
      change»

---

## Not in scope, recorded so it stays a decision

- **A registry or exchange of corpora between teachers** — import of a file she has,
  only. Sharing infrastructure is its own future decision (spec Assumptions).
- **Legal validation of any bundled corpus.** `es-an` stays `reviewed_by_teacher: false`
  until an Andalusian PT disagrees with something; no format field can claim legal
  validity (plan's second reservation).
- **Corpus update delivery** — `034`'s when it lands; until then import/edit is the
  path.

## Dependencies

- **T001 and T002 before everything** — both must be red/captured against today's code.
- **Phase 2 blocks Phases 3–6 entirely.** T003/T004 (the extraction) before T006–T010
  (the machinery); T006 before T007 before T008; T009/T010 are what turn T001 green and
  must keep T002 identical.
- T011 (the `017` note) after T003 — the note records where the vocabulary went, once it
  has gone.
- T007 before T012 (the provenance line is the resolver's) and before T013/T014.
- T020 before T021/T022; T024 before T025.
- **T025 lands with US3, not after it.**
- T028 is not a task in the buildable sense — the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31.

| | Where it is satisfied |
|---|---|
| FR-2701 | T007 (the resolver) · T008 (the loader) · T010 (the consumers) · T013 (the selection) |
| FR-2702 | T007 (precedence) · T014 (the profile field, and `none`) |
| FR-2703 | T004 (generic as its own product) · T017 (asserted over rendered output) |
| FR-2704 | T001 (the grep, first) · T002 (byte-identical for Sevilla) · T003 (the corpus file) · T004 (guide/acs retain nothing territorial) · T009 (the four TypeScript strings) |
| FR-2705 | T012 · in the document and the report, not only the UI |
| FR-2706 | T012 (the line carries the status) · T015 (never prints as reviewed) · T023 (modificado por ti) |
| FR-2707 | T020 · shown entire, activation a separate act |
| FR-2708 | T021 (the scan: `007` tiers + P18 shapes) · T022 (refused by default, override recorded) · T023 (edits re-enter the scan) |
| FR-2709 | T006 (no field reaches any guard — structure) · T005 (stated where corpora are documented) · T025 (the hostile-corpus test) |
| FR-2710 | T018 · a selection change writes no existing document |
| FR-2711 | T007 (the `selected-missing` case) · T019 (reaching the screen and the next draft) |
