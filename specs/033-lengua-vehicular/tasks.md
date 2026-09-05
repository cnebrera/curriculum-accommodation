# Tasks: Lengua vehicular en adquisición

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-six tasks, and the first one is a test that no code path ever guesses a
child's language. The shape of the rest follows Phase 0: the mark lives beside the
axes and activates recipes through a `marks:` condition, so the mechanics are small
— parse one key, read one block, print one grouping — and the judgement is three
recipes in Spanish that a PT can read and correct.

---

## Phase 1 · Setup · the tripwire, before anything can trip it

- [x] T001 Write `app/packages/core/test/no-inferred-language.test.ts` **first**,
      red, per [quickstart.md](quickstart.md) §1. Both halves of **FR-3102**:
      behavioural — no prompt, gloss lookup or report ever contains a language the
      profile's `vehicular.languages` does not name, whatever sits in notes,
      interests or free text — and structural — a grep over `app/` asserting no
      source maps names, countries or nationalities to languages, and that
      `vehicular.languages` is read from `profile.yaml` and nowhere else (SC-3103's
      code-review tripwire, made a test so it cannot be skipped in review)
- [x] T002 [P] Write `app/packages/core/test/mark-selection.test.ts` **first**, red,
      from quickstart §2: mark-only profile selects the vehicular recipes
      (non-empty selection — this case's instance of P1's stop closed, SC-3101);
      absent block selects nothing (not observed ≠ 0); intensity 0 selects nothing
      and keeps the block; mark + ATE:2 composes; `lectura-facil-es` never selected
      by the mark alone; `axes: [] + marks:` is an adaptation, not a guard

---

## Phase 2 · Foundational · the mark exists and recipes can name it

**Blocking**: Phases 3–6 wait. A recipe keyed on a condition the parser cannot read
is silently never selected — the unread-field defect, this project's most repeated
shape.

- [x] T003 `app/packages/core/src/vault/schema.ts` · the `vehicular` block beside
      `pictograms` per [data-model.md](data-model.md): `intensity` 0–3,
      `languages: string[]` (metadata codes, hers only, no default), `noted_on`
      via `yamlDate` — real annotation dates, P44 (**FR-3101**, FR-3102). Repair
      semantics for free through `validateWithRepair`; document the block in
      `docs/profile-schema.md`
- [x] T004 `app/packages/core/src/recipes/index.ts` · `marks:` front matter parsed
      into `MarkCondition[]` (the axes' `>=|<=|=` 0–3 grammar, mark names from a
      known list); `applies()` requires axis **and** mark conditions, with absent
      block = `null`, never 0; `isGuard()` becomes «no axes *and* no marks» —
      without this a vehicular recipe would be an undroppable, always-applying
      guard (**FR-3104**'s activation mechanics, FR-3107's scaling substrate)
- [x] T005 [P] `scripts/check-fr-coverage.sh` untouched;
      `scripts/validate-recipes.sh` learns the `marks:` grammar and accepts an
      «Anti-patrones» heading — the corpus is Spanish-source now (P28) and a
      validator that only reads English headings would fail every new recipe.
      Deterministic script, offline, no model (Principle II)
- [x] T006 [P] The mark's level descriptions live in the corpus and are parsed
      deterministically: extend `instructions/axes.md` parsing
      (`app/packages/core/src/axes/parse.ts`) so the mark's own section — outside
      the ten `AXES`, never an eleventh entry — reaches the editor as labels, the
      way axis levels already do

**Checkpoint**: T001 and T002 exist and are red; `npm test` otherwise green.

---

## Phase 3 · User Story 1 · Amina llega en febrero (P1) 🎯 MVP

**Goal**: a profile with only the mark produces a real adaptation — visual support
on instructions, bridge glosses where the set allows, transitional wording — with
the curriculum intact and the report attributing every support to the mark.

**Independent Test**: adapt the fixture source for a mark-only profile; supports
applied, WHAT untouched through the existing completeness gate, report names the
recipes and the mark.

- [x] T007 [US1] `recipes/core/apoyo-visual-instrucciones.md` — **in Spanish (P28),
      `reviewed_by_teacher: false`**, `marks: [vehicular>=1]`, scope
      `[instruction]`: visual and structural support on instructions; uses the
      pictogram layer **only where she enabled it** («Nunca: activar esta familia
      desde un eje del perfil» holds for the mark, `018` SC-1603); states in its
      own text that the WHAT is untouched (**FR-3105**) and carries before/after
      and anti-patterns (**FR-3104**)
- [x] T008 [P] [US1] `recipes/core/vocabulario-clave-con-puente.md` — Spanish,
      `reviewed_by_teacher: false`, `marks: [vehicular>=1]`: key content
      vocabulary kept and bridged to a language the profile names; **glosses only
      from the sources this recipe defines** — the set's own metadata — and the
      boundary written in the recipe: key-vocabulary bridges, never full
      translation, with the reason citable (**FR-3104**, **FR-3106**, FR-3109's
      argument at the recipe level). Anti-patterns include the invented gloss and
      the whole-sheet translation
- [x] T009 [P] [US1] `recipes/core/lenguaje-claro-transitorio.md` — Spanish,
      `reviewed_by_teacher: false`, `marks: [vehicular>=1]`, graduated by
      intensity in its own text: short direct sentences, one idea per sentence,
      thinning as intensity drops; **explicitly not lectura fácil** and declared
      distinct from it (`conflicts:` with `lectura-facil-es` so the multi-axis
      case resolves in the recorded order, P27); Principle III stated per
      **FR-3105**; anti-patterns include removing or diluting curricular content
- [x] T010 [US1] `app/packages/core/src/pictograms/bridge.ts` · the deterministic
      gloss lookup per data-model: material-language keyword → pictogram ids →
      bridge language's keywords for the same id; returns `BridgeGloss[]` plus
      named `BridgeAbsence`s (`no-set`, `language-not-in-set`,
      `word-has-no-entry`) — pure, offline, `packages/core`, isolation suite
      passes (**FR-3106**)
- [ ] T011 [US1] `app/packages/core/src/prompt/adapt.ts` · the mark's section —
      intensity, her recorded languages, and **only the resolved glosses as
      data**; no glosses → no gloss section at all, the no-fields-no-section rule,
      because an empty section invites the model to fill it (**FR-3106**,
      FR-3102 asserted by T001)
- [ ] T012 [US1] `app/packages/core/src/report/index.ts` · vehicular supports
      grouped under their own heading, attributed to the mark, distinguishable
      from disability-driven adaptations — his record never reads as if a
      disability was observed (**FR-3108**); degradations to visual-only named in
      her words with the language that lacked a bridge (**FR-3106**)
- [x] T013 [US1] `instructions/axes.md` · the **dated** boundary amendment
      (**FR-3103**): LIN is disorder in the material's language; the vehicular
      mark is acquisition; a learner acquiring the language is marked, never
      scored on LIN for it — the falsified-profile workaround dies in writing.
      Plus the mark's own documented levels (read by T006). Corpus edit, no code
- [ ] T014 [US1] `app/ui/src/learners/ProfileEditor.tsx` · the mark edited
      **beside** the axes — its own `Section`, the 0–3 interaction she already
      knows, labels from the corpus via T006; saving writes `noted_on` with
      today's real date (P44); languages are typed or picked by **her**, nothing
      pre-filled from any other field (**FR-3101**, **FR-3102**); pictograms
      remain her separate click — the screen may point at the setting, never
      press it
- [x] T015 [US1] `app/packages/core/test/bridge.test.ts` from quickstart §3: gloss
      resolved via shared id; `language-not-in-set` degrades with zero glosses;
      no profile languages → lookup not consulted and no gloss section; prompt
      gloss data is exactly the resolved list (**FR-3106**, SC-3103)
- [ ] T016 [US1] The fixture walk of quickstart §2/§4 wired end to end: mark-only
      profile over the fixture corpus produces an adaptation with visible
      transitional supports — not a copy (SC-3101) — and **the existing
      completeness gate** reports zero curricular elements absent (SC-3102,
      **FR-3105**): the same gate, no exemption, run over vehicular adaptations
      in `app/packages/core/test/`

**Checkpoint**: Amina's week-one sheet exists, honestly — visual-only where the set
has no Arabic, and the report says so.

---

## Phase 4 · User Story 2 · The barrier is transitory and the profile says so (P2)

**Goal**: supports scale down with intensity, to zero at 0, visibly in the report,
with real dates on every change.

**Independent Test**: same source at intensities 3, 2, 1, 0 — supports decrease
monotonically and the WHAT never changes.

- [ ] T017 [US2] `app/packages/core/test/vehicular-intensity.test.ts` · quickstart
      §4: monotonic decrease across 3→0 over the fixture source; at 0 no vehicular
      recipe applies and the block persists with its date — the mark expires by
      observation, not by deletion (**FR-3107**); completeness green at every
      level (SC-3102)
- [ ] T018 [P] [US2] Lowering the intensity in the editor re-dates `noted_on` with
      the real date of the change, and the report of the next adaptation shows the
      thinner support set — visible in the report, per US2 scenario 1
      (**FR-3107**, P44)

---

## Phase 5 · Honesty around it · refusal, attribution, travel

- [ ] T019 `instructions/hard-rules.md` · rule 12 amended, **dated**: the report
      speaks the teacher's language (P28's correction), and **full-document
      translation is refused with the reason** — unverifiable fidelity;
      scaffolding beats substitution, the recipes' own argument, citable
      (**FR-3109**). One amendment in the file the application already sends with
      every request; the recipes cite it rather than restate it — two copies of
      one rule is how this repository has produced defects before
- [ ] T020 [US1] Test the refusal path in `app/packages/core/test/` and the e2e: a
      request to translate the whole sheet produces a refusal **with the reason**,
      not a translated document and not a silent omission (**FR-3109**)
- [ ] T021 [P] The mark travels in handover and coordination packets as profile
      data with its real dates — asserted over `004`'s and `030`'s exporters in
      `app/packages/shell/test/` (**FR-3110**). Expected to be mostly a test: the
      packets already carry the profile; what the test pins is that the block
      survives export, import and the repair path with dates intact
- [ ] T022 [P] Exams: vehicular recipes on assessment blocks apply access supports
      only — visual instructions, simple wording — and the criterion is untouched;
      the exam guard governs and is never dropped (edge case; **FR-3105** on
      assessment; asserted beside the existing exam-guard tests in
      `app/packages/core/test/`)
- [ ] T023 [P] `instructions/pictograms.md` · extend the publisher's `languages:`
      **only after checking the live API** for each added code, with the file's
      own «Comprobado el <date>» convention (research R3) — a corpus edit, and the
      honest sentence in the UI when a recorded language is not offerable:
      supports stay visual-only and the report says so (**FR-3106**). Downloading
      a bridge language's metadata reuses `024`'s flow unchanged — her click, one
      language per run, images deduplicated by id

---

## Phase 6 · Polish · and the parts that need a person

- [ ] T024 `app/e2e/vehicular-mark.spec.ts` · quickstart §6: the mark beside the
      axes, dates written on set and on change, languages hers, pictograms her
      separate click, the mark visible in a coordination packet (**FR-3101**,
      **FR-3110**)
- [ ] T025 **Look at it** (`013`): `npm run shots` — does the mark's control read
      as «something temporary about language» or as an eleventh barrier? And a
      week-one sheet at intensity 3: usable support or decoration? No assertion
      can answer either
- [ ] T026 **SC-3104 needs a teacher**: give a PT with a late-incorporation learner
      the week-one sheet, no preamble — ideally one with interculturalidad
      experience. The recipes stay `reviewed_by_teacher: false` until a person
      with AL/interculturalidad background disagrees with something concrete in
      them (the spec's own assumption, `011`'s «needs a person» honesty). The
      arrangement is the task; the verdict is not buildable

---

## Not in scope, recorded so it stays a decision

- **Full-document translation** — not a feature to build later by default: it is
  **refused with the reason** (FR-3109), because Rampa cannot verify a
  translation's fidelity and substitution replaces the vehicular language instead
  of scaffolding its acquisition. Its reappearance is a decision, not a drift.
- **Cooficiales (P51)** — a Catalan-vehicular classroom with a newcomer is this
  same feature with another vehicular language; out of v1 with the honest message
  already decided. Nothing here assumes Spanish: the mark names the relationship
  between his languages and the classroom's, and the recipes are keyed on the
  mark, not on `es` (multi-país, P3).
- **Per-language-pair word lists** — corpus growth when someone qualified writes
  them, not code, and not this feature.

## Dependencies

- T001 and T002 before everything, red first.
- **Phase 2 blocks Phases 3–6.** T003 before T004 (conditions read the block);
  T004 before T007–T009 (a recipe keyed on an unparsed key is silently dead);
  T005 with T007 (the validator must accept what the recipes ship); T006 before
  T014.
- T010 before T011; T011 before T012; T013 before T014's labels.
- T019 lands **with** T008, not after — a recipe that asks for bridges without the
  stated boundary is an invitation to cross it.
- T017 after T007–T009 (it exercises their thresholds).
- T023 is independent but gates real Arabic glosses; nothing else waits on it —
  degradation (T010/T012) is the week-one behaviour either way.
- T026 is the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`scripts/check-fr-coverage.sh` fails if a requirement in the spec appears nowhere
here. Written **with** the tasks.

| | Where it is satisfied |
|---|---|
| FR-3101 | T003 (the block: intensity 0–3, languages, dates) · T014 (edited beside the axes) · T024 |
| FR-3102 | **T001, first** — behavioural and structural, before anything can trip it · T003 (no default, no origin field) · T014 (nothing pre-filled) |
| FR-3103 | T013 · the dated LIN boundary in `instructions/axes.md`, corpus not code |
| FR-3104 | T007, T008, T009 · corpus files in Spanish (P28), activated by the mark alone through T004's mechanics |
| FR-3105 | T007–T009 state it per recipe · T016 and T017 run it through the **existing** completeness gate (SC-3102) · T022 on assessment |
| FR-3106 | T010 (glosses only from the set, absences named) · T011 (resolved list only; no section when empty) · T012 (the report says visual-only and why) · T015 · T023 |
| FR-3107 | T004 (thresholds substrate) · T009 (graduation in the recipe text) · T017 (monotonic, zero at 0) · T018 (visible in the report, dates real) |
| FR-3108 | T012 · transitional supports grouped and attributed to the mark, distinguishable from disability-driven changes |
| FR-3109 | T019 (rule 12 amended, dated, with the citable reason) · T020 (the refusal tested) · T008 (the boundary in the recipe's own text) |
| FR-3110 | T021 · T024 · the mark as profile data in `004`/`030` packets, dates intact |
