# Tasks: El segundo eje de frescura

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-three tasks, and the first is the precision/recall invariant over a seed vault
whose ground truth is written by hand — red before any deriver exists. The shape of the
rest follows Phase 0: the datum this feature stands on is computed today and **dropped
before the write** (research R1), so persisting it is foundational; after that, the
feature is one function with two axes and two existing callers.

**Prerequisite, declared not built**: the P50 vault format marker (COLA 1.17) exists
before T004 starts. This feature stamps a per-sheet version under P50's convention; it
does not invent its own key.

---

## Phase 1 · Setup · the two invariants, red first

- [ ] T001 Write `app/packages/core/test/drawing-freshness.test.ts` **first**, red, per
      [quickstart.md](quickstart.md) §1: the seed vault fixture (two learners, five jobs,
      a signed sheet, an override-pinned sheet, a pre-feature sheet, a
      complete-and-empty sheet) and **SC-2901 as an invariant** — change «casa»'s
      resolution and assert precision 1.0 and recall 1.0 against the seed's hand-written
      ground truth, the stale rows naming the word (FR-2902), and the untouched rows
      untouched
- [ ] T002 [P] Write `app/packages/core/test/freshness-writes-nothing.test.ts` **first**,
      red where it can be: hash every byte of the seed vault, run every derivation this
      feature will have (record scan, verification rows, affected-count with `next: id`
      and `next: null`), hash again — **identical** (SC-2903, the teeth of FR-2901). If
      any later task writes a stale flag, this is the test that says so the same day

---

## Phase 2 · Foundational · the datum exists, then the one model over it

**Blocking**: nothing in Phase 3 or later starts until this phase is green. A deriver
over a datum that never reaches disk derives `unknown` forever, and a second freshness
entry point is the parallel mechanism G35 forbids.

- [ ] T003 `app/packages/core/src/pictograms/apply.ts` · `stampPicto(raw, perBlockPairs)`
      — the deterministic patch that writes each block's `data-picto` into the raw
      markdown attr list by block id, `stampReading`'s shape applied to `024`'s format.
      Research R1: `adapt.ts` writes the pre-mutation `result.out`
      (`jobs/adapt.ts:297,321,349-350`), so the pairs `applyPictograms` computes never
      reach `adapted.md` — while `print.ts:90` reads them from the file. Pure string
      work, offline-testable, ids on the existing allowlist (Principle IX)
- [ ] T004 `app/packages/shell/src/jobs/adapt.ts` · persist at the write: `stampPicto`
      applied to the sheet before `vault.writeRaw`, and the **per-sheet format version**
      (P50's convention) stamped on the same line that stamps `adapted_on` and
      `from_extraction`. Asserted in `packages/shell/test/adapt-pictograms.test.ts`
      against **the file on disk**, not the in-memory document — the gap that let G37's
      mutations pass (quickstart §4). This also gives `print.ts`'s existing image lookup
      the pairs it was already written to read
- [ ] T005 `app/packages/core/src/ir/freshness.ts` · the one model (FR-2901):
      `sheetFreshness(sheet, current)` returning `Freshness` per
      [data-model.md](data-model.md) — the reading axis exactly as `reading.ts` computes
      it today, the drawings axis comparing each recorded pair against
      `current.drawingFor(word)`, naming the stale words (FR-2902), both axes always in
      the return type so neither can be read without the other existing (FR-2903).
      Honest-unknown per research R4's table: pairs present → derived (retroactive);
      absent + format stamp → fresh-and-empty; absent + no stamp → `unknown`, never
      assumed fresh (FR-2906)
- [ ] T006 The drawing resolver **is `matchWord`** (research R2): a `core` helper that
      partially applies the real ladder (override → vocabulary → set, names never) into
      `CurrentState.drawingFor`, so «stale» means «re-making now would change this
      drawing». A→B→A, un-choose-with-unique-set-candidate and override-pins-the-sheet
      all fall out of this and are asserted in T001's suite rather than special-cased
- [ ] T007 [P] Assert the structural rule: `sheetFreshness` has exactly two callers
      (`record/scan.ts`, `jobs/stale.ts`) and nothing else imports the old single-axis
      `freshnessOf`. Source-level, because a sister function somebody calls instead is
      how FR-2218 was a comment for a year

**Checkpoint**: T001 and T002 green over the deriver; nothing above the shell changed yet.

---

## Phase 3 · User Story 1 · She changes a drawing and the record tells the truth (P1) 🎯 MVP

**Goal**: the record and the verification surface show both axes, derived, with the word
named — and nothing on disk moves.

**Independent Test**: make sheets with pictograms, change one choice, and confirm exactly
the sheets carrying that word's old drawing are marked, with the reason naming the word —
and no others (quickstart §3, §5).

- [ ] T008 [US1] `app/packages/core/src/record/scan.ts` · `entryFor` derives both axes
      through `sheetFreshness` **in the same place it calls `freshnessOf` today** — the
      «two derivations of one answer» comment stays true with two axes.
      `RecordEntry.freshness` becomes `Freshness` (`record/entry.ts`); the resolution
      context is assembled **once per scan** by the caller and passed down — one walk,
      never one per learner (`020` FR-1828's shape)
- [ ] T009 [US1] `app/packages/shell/src/jobs/stale.ts` · `staleSheets` returns the
      two-axis answer from the **same** `sheetFreshness`, context assembled in the shell
      exactly as `applyPictogramsIfSheSaidSo` assembles names and chosen words — `core`
      never reads settings, never learns a name
- [ ] T010 [US1] `app/ui/src/data/record.ts` + `jobs.ts` · the data layer carries
      `Freshness`; the compiler finds every reader of the old string, which is why the
      type changes instead of gaining a sibling field
- [ ] T011 [US1] `app/ui/src/learners/RecordScreen.tsx` · both reasons, independently,
      when both apply (FR-2903): the reading sentence as today, and «hecha con un dibujo
      que ya no usas: casa» beside it — never merged, never truncated into one. The
      unknown state says «no puedo saberlo» in her words, not `unknown` (FR-2906)
- [ ] T012 [P] [US1] `app/ui/src/ingest/VerifyScreen.tsx` · the verification surface
      keeps its reading-axis sentences and does not silently swallow the new shape —
      the two surfaces read one deriver and say axis-appropriate things
- [ ] T013 [US1] Assert FR-2904 in T001's suite and in the e2e: a **signed** sheet that
      goes stale by drawing keeps `signedOff` (the signature belongs to the sheet it was
      given to, `005` FR-511); revisions and files untouched byte-wise; re-making a stale
      sheet is the existing re-adapt path and the new revision derives fresh with the
      current drawing while the old revision stays on disk (US1 scenario 3)

**Checkpoint**: US1's independent test passes offline; the record stops being silent.

---

## Phase 4 · User Story 2 · The change itself warns her, with the exact count (P2)

**Goal**: at the moment of changing a choice she is told how many sheets will become
stale, the count equals what the record then shows, and the false texts are gone.

**Independent Test**: change a choice affecting known sheets; the count shown matches the
sheets actually marked (quickstart §5).

- [ ] T014 [US2] `app/packages/core` · `affectedByDrawingChange(vault-walk inputs,
      prospective resolver)` — **the same `sheetFreshness`, run with tomorrow's
      resolution** (research R3): the ladder with one rung hypothetically set. One walk
      of `material/`, short-circuit on sheets whose pairs lack the word, unknown sheets
      **not** counted (they will be marked unknown, not stale — a counted promise the
      record then breaks is SC-2902 failed). Scoped to one learner when the change is an
      override, to all otherwise (spec edge case: global change does not touch
      override-pinned sheets, and vice versa)
- [ ] T015 [US2] `app/packages/shell/src/ipc/pictograms.ts` + `preload.ts` + hook in
      `app/ui/src/data/pictograms.ts` · the new channel `pictograms:affected` per
      [contracts/affected-sheets.md](contracts/affected-sheets.md) — read-only, covered
      by T002's byte-wise invariant, `next` and `language` validated on the existing
      allowlists
- [ ] T016 [US2] `app/ui/src/pictograms/MyVocabulary.tsx` + `ChooseWord.tsx` · before a
      change to an already-chosen word (including «Dejar de elegir»), show «N hojas usan
      el dibujo anterior; quedarán marcadas como desactualizadas en el expediente»
      (FR-2905). A first-ever choice warns nothing: no sheet carries the word, N is 0 by
      definition. The contract records that the future override editor (COLA 2.4 / P48)
      joins through the same channel with `learner` set
- [ ] T017 [US2] The false sentences replaced by true ones (FR-2907's UI half, SC-2904):
      `MyVocabulary.tsx`'s «todavía no sé avisarte de que están desactualizadas», the
      matching prose `renderVocabulary` writes into **her vault file**
      (`app/packages/core/src/pictograms/vocabulary.ts` — «no te aviso… todavía no sé
      hacerlo»), and the stale doc comment in
      `app/packages/shell/src/pictograms/bring.ts:554`. The vault file outlives the
      application, which is where the last lie lived longest
- [ ] T018 [P] [US2] Guard test: the false sentence appears **nowhere** in `app/ui/src`
      or `app/packages` («las hojas que ya hiciste no cambian» / «no sé avisarte»), and
      the true sentence shown is fed by the same IPC the record reads — the G35 lie made
      unmakeable because text and behaviour share one source (SC-2904)
- [ ] T019 [US2] `app/e2e/drawing-freshness.spec.ts` per quickstart §5, `RAMPA_HIDDEN=1`:
      the walk that proves SC-2902 end to end — warning count, confirm, record shows
      exactly that many marked rows naming the word, files byte-identical, signature
      standing, re-make fresh, change-back-to-A current again with no run in between

**Checkpoint**: «solo cambia el texto» is no longer how this requirement is satisfied.

---

## Phase 5 · The paperwork that is the feature's other half (FR-2907)

These are tasks, not follow-ups: the last divergence between documents and behaviour
here shipped as a lie in three places (G37), and G35's whole argument is that a second
axis added silently becomes the fourteenth disagreement.

- [ ] T020 `specs/005-group/data-model.md` · dated amendment, `016` FR-1401 style: the
      Staleness section's `stale_since` front-matter stamp is corrected — **documented
      but never built**; what shipped is derived (`app/packages/core/src/ir/reading.ts`'s
      docstring) — and the section now describes the one freshness model with two axes,
      pointing here. `005` FR-520's clauses unchanged
- [ ] T021 [P] `specs/024-el-juego-entero/spec.md` · FR-2218's deferral note (COLA 1.8)
      closes: «satisfied by `031`», dated, pointing at this spec — and
      `specs/BACKLOG.md` G35 records the closure with the same pointer (SC-2904's
      spec-side half)
- [ ] T022 **Look at it** (`013`): `npm run shots`, quickstart §7 — the record row
      carrying both reasons at the narrowest width and at `xlarge` (truncation is where
      one axis would silently mask the other, and no assertion sees an ellipsis), and
      the warning dialog's «N hojas» as a sentence a person reads under time pressure
- [ ] T023 Archive it: this coverage table kept current, `bash scripts/check-fr-coverage.sh`
      green, `specs/COLA-DE-TRABAJO.md` 3.7 updated, and a `specs/BACKLOG.md` entry for
      anything found on the way — starting with research R1's print-path finding if it
      turns out user-visible before this ships

---

## Not in scope, recorded so it stays a decision

- **The per-learner override editor** — COLA 2.4 (P48). Its warning arrives through this
  feature's channel when that screen exists; building the screen is that item's work.
- **Set updates changing drawings** (a new ARASAAC index resolving a word differently).
  The comparison against `matchWord` already answers it truthfully the day it happens,
  but no UI names «the set changed» as a cause — if that needs its own sentence, it is a
  new requirement, not a silent extension here.
- **The conversation** — `026` consumes this model's answer for «iterating a stale sheet
  warns»; nothing here special-cases it (spec Assumptions).
- **A migration back-filling old sheets.** There is nothing truthful to fill from
  (research R1); old sheets take the honest-unknown path and gain the datum by being
  re-made.

## Dependencies

- T001 and T002 before everything; both red first.
- **P50 (COLA 1.17) before T004** — the format stamp uses its convention.
- **Phase 2 blocks Phases 3–5 entirely.** T003 before T004; T005 before T006/T007;
  T004+T005 before every consumer.
- T008 before T010, T010 before T011; T009 with T008 (same deriver, both callers move
  together, T007 is the proof).
- T014 before T015, T015 before T016.
- **T017/T018 land with US2, not after it** — the warning that replaces the false text
  and the text's removal are one change; shipping the first without the second leaves
  the interface disagreeing with itself, which is the G35 shape again.
- T020/T021 may run in parallel with Phase 4 but before T023.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31.

| | Where it is satisfied |
|---|---|
| FR-2901 | T005 (one model, two axes, derived) · T002 (no stored flags — byte-wise, asserted) · T007 (no parallel mechanism, asserted) |
| FR-2902 | T005/T006 (stale against the current resolution, word named) · T001 (precision/recall over the seed) · T011 (named on screen) |
| FR-2903 | T005 (both axes in the type) · T011 (both reasons shown, never merged) · T012 (the other surface) |
| FR-2904 | T013 (signature stands, revisions and files untouched, re-make is the existing path) · T002 (nothing written) |
| FR-2905 | T014 (same deriver, prospective state) · T015 (the channel) · T016 (the sentence) · T019 (count == marked, end to end — SC-2902) |
| FR-2906 | T005 (research R4's table: unknown never assumed fresh) · T004 (the format stamp that makes «empty» distinguishable from «unrecorded») · T011 («no puedo saberlo» in her words) · T014 (unknown never counted as a promise) |
| FR-2907 | T020 (`005`'s data model amended, dated) · T021 (`024` FR-2218 closed with a pointer, G35 updated) · T017/T018 (the UI and vault-file texts corrected, guarded) |

And the success criteria, because two of them are invariants a task must own:
**SC-2901** → T001 · **SC-2902** → T014/T019 · **SC-2903** → T002 · **SC-2904** →
T017/T018/T021.
