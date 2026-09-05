# Tasks: CUR por área

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-two tasks, and the first one changes no code at all: it pins what every existing
profile does today, before anything exists that could change it. SC-3002 promises the old
single CUR keeps its exact behaviour — a promise is testable only if the baseline predates
the feature.

The shape of the rest follows Phase 0: the general value never moves, the pairs are a
sibling field every old reader carries verbatim, one `curFor` helper answers every
consumer, and the significant-adaptation stop — which P12 just untied from CUR — gets a
tripwire before anyone can be tempted to re-tie it.

---

## Phase 1 · Setup · the baseline before the field exists

- [x] T001 Write `app/packages/core/test/cur-compat.test.ts` **first**, green against
      today's code, per [quickstart.md](quickstart.md) §1 (SC-3002, FR-3005): for a
      profile carrying only `axes.CUR` — `axisLevelOf`, recipe selection over the real
      corpus, the prompt's axis line (`prompt/adapt.ts`), the presentation map
      (`jobs/print.ts`), and a load→save round-trip that leaves the file byte-identical.
      Never edited after this phase: a baseline written once the field exists is written
      to fit what the field already does.
- [x] T002 [P] Write `app/packages/core/test/cur-areas.test.ts` **first**, red, from
      quickstart §2: `curFor` returns the pair, else the general, else `null` — an absent
      pair is **fallback, never zero-by-omission** (FR-3001), and `null` keeps `011`'s
      no-guessing rule. Includes the old-app simulation: parsing a profile with
      `cur_areas` through a schema without the field keeps the whole `axes` record intact
      and carries `cur_areas` verbatim through a save (research R1's catastrophe test).

---

## Phase 2 · Foundational · the marker, the field, the helper, the tripwire

**Blocking**: nothing in Phase 3 or later starts until this phase is green. FR-3005 says
writing a per-area value upgrades the profile under the vault schema version — so the
marker must exist before the first writer, which is also COLA 1.17's stated ordering.

- [x] T003 Vault schema version marker (P50 / COLA 1.17) in
      `app/packages/core/src/vault/version.ts` + test: `.rampa/vault.yaml` with
      `schema: <integer>`, **absent file ⇒ version 1**, bumped only on the first write of
      a shape older readers do not know — never on read, never on install (research R5).
      This feature owns it because it is the first motivating change; COLA 1.17 cites
      these tasks rather than duplicating them.
      *(done 2026-09-04, out of order and on purpose: COLA's own sequencing puts the
      marker before the shape changes of lots 2–3, and `031` needs it too. `vaultSchema`,
      `bumpVaultSchema`, `vaultIsNewer` and the named constants —
      `VAULT_SCHEMA_CUR_AREAS = 2` is «profiles may carry `cur_areas`» — plus
      `packages/core/test/vault-version.test.ts`, 9 cases. Monotonic and write-time
      verified by mutation: lowering the number fails, and writing on read fails four
      cases. Nothing else in this feature is built: T004 onwards are still open.)*
- [x] T004 `app/packages/core/src/vault/schema.ts` · `cur_areas` as an **optional
      top-level sibling** of `axes` on `profileSchema` (keys: subject names; values: the
      same `axisLevel` 0–3), and `curFor(profile, area?)` beside `axisLevelOf` per
      [data-model.md](data-model.md) (FR-3001, FR-3005 read path). Inside `axes` is
      forbidden by test T002: a nested change makes an old app's repair set aside the
      whole `axes` field — every recipe off, silently.
- [x] T005 The write path: saving a profile whose `cur_areas` is non-empty bumps the
      vault to the version that means «profiles may carry per-area CUR» (FR-3005); a
      profile nobody details stays untouched and the vault stays version 1 (quickstart
      §6.4). In `app/packages/core/src/vault/profile.ts` + the save IPC.
- [x] T006 The two structural tests, in `app/packages/core/test/`:
      **(a)** FR-3002 — no axis other than CUR has area machinery: no generic
      `axes_by_area`, `curFor` is CUR's alone, and the ten-axis structures
      (`AXES`, recipe conditions, prompt lines) are untouched by area anywhere;
      **(b)** FR-3006, the tripwire — no code path keys a refusal or a stop on any CUR
      value, per-area or general, asserted as an absence (the `021` pattern: an absence
      is the finding), and `instructions/adapt.md`'s significant-adaptation line speaks
      of **the request**, not of `CUR>=2` — guarded the way `corpus-guarantees.test.ts`
      already guards corpus sentences. P12 just untied this; the test is what keeps it
      untied.

**Checkpoint**: T001 still green and unedited; T002 green; full offline suite green with
no consumer changed.

---

## Phase 3 · User Story 1 · Marco, bien en Lengua, dos cursos en Mates (P1) 🎯 MVP

**Goal**: per-area CUR recordable without ceremony, and composed material for each area
targets its own level, general as fallback.

**Independent Test**: one profile, two areas with different CURs; compose for each area
and for an unnamed one; each targets its own level, the unnamed uses the general.

- [x] T007 [US1] `knownAreas(...)` in `app/packages/core/src/` (beside
      `vault/profile.ts` / `record/`): the suggestion vocabulary as the union of roster
      `subjects` (`rosterEntrySchema`) and the learner's record `subject`s
      (`record/scan.ts:170`), plus the deterministic near-duplicate check — case- and
      accent-insensitive, prefix containment («Mates»/«Matemáticas») — that **flags and
      never merges** (FR-3007, research R2). Accent-insensitivity tested explicitly: it
      is this project's known blind spot.
- [x] T008 [US1] `app/ui/src/learners/ProfileEditor.tsx` (+ `AxisEditor.tsx`): the CUR
      row shows the general **and** the pairs at a glance, editable without ceremony
      (FR-3001, SC-3004 groundwork); adding an area suggests from T007, creating a new
      one is explicit, a near-duplicate gets a flag and a choice, and **her spelling wins
      if she insists** (FR-3007). Suggestions sourced from record `subject`s render as
      plain text — that field was read out of a document somebody else wrote (Principle
      IX, the `RecordScreen` rule).
- [ ] T009 [US1] The compose flow gains the job's area: asked in
      `app/ui/src/compose/`'s screen (suggested from T007, optional), carried on
      `ComposeRequest`, and written by `app/packages/shell/src/jobs/compose.ts` to the
      sheet's front matter as **`subject`** — the field `record/scan.ts` has read
      best-effort since `014`. No new field, no new taxonomy; a job with no area uses the
      general (FR-3003 fallback half).
- [ ] T010 [US1] `app/packages/core/src/compose/level.ts` + `jobs/compose.ts`: the
      `enrolled` fallback becomes area-aware through `curFor` (FR-3003, research R3).
      Area at 0/1/`null`: enrolled stands as today. Area at ≥2: the screen asks her the
      target level before composing — her answer arrives as `she-chose`, P32 intact —
      and `explainTarget`'s enrolled sentence names **this area's** gap instead of the
      generic one. **Declining still composes at enrolled: asking is never blocking**,
      because a mandatory gate keyed on CUR would be the profile-keyed stop reborn
      (FR-3006). No arithmetic from CUR to a year, anywhere — CUR 2 is «cursos
      anteriores», count unknown, and a computed year is an invented number.
- [ ] T011 [US1] `app/packages/core/test/compose-level-by-area.test.ts` from quickstart
      §3 — the six cases, including the tripwire absence and the never-zero fallback
      (SC-3001).
- [ ] T012 [P] [US1] The compose report says which area's CUR was consulted and whether
      it was the pair or the general fallback (Principle VI): «composing at a stated
      level is a different act from quietly lowering someone's worksheet, and the
      difference is who decided». Sentences in i18n/corpus, not born in `compose.ts`.
- [ ] T013 [P] [US1] `app/packages/core/src/prompt/adapt.ts`: for a job whose `subject`
      is known, the CUR line carries the **effective** value for that area
      (`curFor`), with the general and the remaining pairs named as data (FR-3001, US1's
      «nothing about Lengua is treated as delayed» — otherwise it fails in the prompt
      while succeeding in compose). Data, not policy: no adaptation rule moves into code.
- [ ] T014 [US1] `app/e2e/cur-areas.spec.ts` from quickstart §6: record «bien en Lengua,
      dos cursos en Mates» from the profile screen; the near-duplicate flag; the vault
      file readable by eye; the untouched profile writing nothing.

**Checkpoint**: the unrepresentable child of the review is representable, and his Lengua
material stops being composed below him.

---

## Phase 4 · User Story 2 · The normative conversation speaks per area (P2)

**Goal**: ACNS/guide surfaces cite the gap of the area under discussion — what the
normativa actually conditions on.

**Independent Test**: draft normative documents for two areas of one learner with
different CURs; each cites its own area's gap.

- [ ] T015 [US2] `app/packages/core/src/guide/acns.ts` + its caller in
      `packages/shell/src/ipc/`: the desfase the draft cites is
      `curFor(profile, input.subject)` — the area's pair, the general **only** when no
      pair exists, and the draft says which it used (FR-3004). The «desfase curricular is
      not sourceable» sentence survives for areas nobody assessed: named as missing,
      never filled (`011` no-guessing, `017` FR-1514's spirit).
- [ ] T016 [US2] The guide conversation surface (`017`, and `029`'s corpus sections):
      where the ACNS orientation conditions on «desfase en esa área», the datum passed is
      the area's (FR-3004) — and an at-level area (pair = 0) never has an ACNS suggested
      for it. Judgement stays in `instructions/guide.md`; code only stops handing it the
      wrong number.
- [ ] T017 [US2] `app/packages/core/test/acns-gap-by-area.test.ts` from quickstart §4 —
      fixtures for multi-area profiles, both drafts, the wrong-area absence (SC-3003).

**Checkpoint**: Marco's ACNS conversation about Mates cites his Mates gap; nothing
suggests one for Lengua.

---

## Phase 5 · The packets (both stories ride on this)

- [ ] T018 Per-area CUR travels in handover (`004`) and coordination (`030`) packets as
      the profile data it is (FR-3008, research R4): pairs ride the profile/deltas the
      packets already carry, name-free (egress redaction applies to area names as to any
      string), each pair individually acceptable on import with provenance (`030`
      FR-2804/2805); the packet states the vault schema version it was written under
      (T003). No parallel channel for one field.
- [ ] T019 [P] `app/packages/core/test/packet-cur-areas.test.ts` from quickstart §5 —
      including the older-receiver simulation: `cur_areas` carried verbatim, general in
      effect, and the version mismatch producing a sentence rather than a silence (the
      spec's edge case, made a test).

---

## Phase 6 · Polish · and the parts that need a person

- [ ] T020 Corpus and docs: `instructions/axes.md` («A note on CUR» gains the per-area
      sentence: CUR is a relationship between the child and one subject's curriculum —
      and its ≥2 note must already speak P12's request-keyed language, not resurrect the
      profile-keyed stop) and `docs/profile-schema.md` (+ `profiles.example/` gains one
      example with `cur_areas`). Judgement in Markdown, where a teacher can correct it
      (Principle I).
- [ ] T021 **Look at it** (`013` FR-1113): `npm run shots` — the profile screen with
      three detailed areas, narrowest width and `xlarge`. The question is whether
      general-plus-pairs reads as one fact about one axis or as clutter, which no
      assertion can answer. Then run the **full** offline suite and confirm T001 is green
      and byte-identical to when it was written (SC-3002's closing evidence).
- [ ] T022 **SC-3004 needs a teacher**: sit her at the profile screen, say only «apunta
      que va bien en Lengua y lleva dos cursos de desfase en Mates», time it (under a
      minute is the criterion) and keep her words for the labels. This is the axis a
      tutor updates after an evaluation; if it has ceremony it will not be updated, and
      the general will quietly govern everything again. The arrangement is the task; the
      verdict cannot be produced here. Plus the archive round: coverage table current,
      COLA 1.17 marked as satisfied by T003 with a pointer here, and a BACKLOG note that
      a future CUR-conditioned *recipe* must answer «which area?» before it may exist.

---

## Not in scope, recorded so it stays a decision

- **Area on notes/works/avoid** — real, separate, and folding it in would triple the
  surface for a datum nobody asked to split yet (spec Assumptions).
- **Upward/enrichment CUR (P9)** — future spec; the 0–3 record shape does not preclude
  it, and nothing here builds it.
- **A per-area target year in the profile** — the overlay already carries the stated
  level for the ACS case; a second stored level goes stale against the first.
- **Any per-area machinery for the other nine axes** — not deferred: **refused**
  (FR-3002). They describe barriers that travel with the child.

## Dependencies

- T001 and T002 before everything; T001 is never edited after Phase 1.
- **Phase 2 blocks Phases 3–6 entirely.** T003 before T005 (the marker before the first
  writer — COLA 1.17's own ordering); T004 before T005–T017.
- T007 before T008 and T009 (both consume the vocabulary).
- T009 before T010 (the level derivation needs the job to have an area first).
- **T006's tripwire lands with the field, not after it** — the moment per-area CUR
  exists is the first moment someone can key a stop on it.
- T015 before T016 and T017.
- T018 before T019.
- **The spec's own assumption**: P12's request-keyed stop ships first or together — T006
  asserts the post-P12 state and fails loudly if `adapt.md` still keys on CUR≥2, which
  makes the ordering visible instead of remembered.
- SC-3004 needs a teacher and is not a task in the buildable sense — T022 is the
  arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31. Every row below is
**pending** — no task in this file is done.

| | Where it is satisfied |
|---|---|
| FR-3001 | T002/T004 (`cur_areas` + `curFor`, absent = fallback never zero) · T008 (edited at a glance) · T013 (reaches the prompt as data) |
| FR-3002 | T006(a) · asserted structurally: no other axis gains area machinery, and the refusal is recorded in «Not in scope» |
| FR-3003 | T009 (the job's area, via the existing `subject` field) · T010 (area-aware enrolled fallback, P32 kept, no CUR→year arithmetic) · T011 (SC-3001's test) · T012 (who decided, reported) |
| FR-3004 | T015 (ACNS drafts) · T016 (guide conversation) · T017 (SC-3003's fixtures: never another area's gap, never the general when a pair exists) |
| FR-3005 | T001 (the baseline, written before the field) · T004 (single value read as the general, no migration) · T005 (writing upgrades under the vault version) · T003 (the version itself, P50) |
| FR-3006 | T006(b) · the tripwire test: no code path re-keys the stop on any CUR value, and the corpus line stays request-keyed (P12) · T010 (asking is never blocking) |
| FR-3007 | T007 (vocabulary from roster + record, deterministic near-duplicate flag) · T008 (explicit creation, flagged never merged, her spelling wins) · T014 (exercised end to end) |
| FR-3008 | T018 (pairs travel as profile data, name-free, per-item import) · T019 (older receiver sees the general — the version guard tested) |

**Success criteria**: SC-3001 → T011 · SC-3002 → T001 + T021 (the closing run) ·
SC-3003 → T017 · SC-3004 → T022 (**needs a teacher**).
