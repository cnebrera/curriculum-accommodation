# Tasks: One worksheet, several learners

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-30

Twenty tasks. The weighting is deliberate: the loop itself is two of them, and
failure isolation, signing and the two constitutional risks are the other
eighteen. A batch feature is easy to write and easy to write badly, and the bad
version passes a happy-path test.

---

## Phase 1 · Setup

- [x] T001 Write `packages/shell/test/batch.test.ts` **first**, red, from
      [quickstart.md](quickstart.md)'s offline list. Every later task in Phase 2
      turns one of its cases green. The one that matters is not "three sheets
      appear" — it is the forced failure on the second learner *(done, red first. `packages/shell/test/batch.test.ts`, 24 cases.)*

---

## Phase 2 · Foundational · the batch, before any screen sees it

**Blocking**: nothing in Phase 3 or later may start until this phase is green.
The hard part of this feature is what happens when part of it fails, and that is
cheapest to get right where there is no window in the way.

- [x] T002 Add `runBatch(jobId, learners, onProgress, corrections?)` to
      `packages/shell/src/jobs/adapt.ts`, beside `runAdaptation` and calling it
      once per learner. Sequential (FR-518). It is a separate function rather
      than a loop in the handler because "what happens when the second of three
      fails" is orchestration, not wiring (FR-1111) *(done: `packages/shell/src/jobs/batch.ts`. It takes the per-learner adaptation as an **argument** — `runAdaptation` reaches `currentVault()` and `activeProvider()`, both of which transitively import Electron, so importing it would have made the loop untestable without mocking three modules. A testing convenience that turned out to be the right separation.)*
- [x] T003 Deduplicate the learner list before running. A repeated code adapts
      once — she picked the same child twice, she did not ask to pay twice *(done, via `Set`, which also preserves insertion order — the order-independence test needs stable, not sorted.)*
- [x] T004 Isolate failures (FR-506/507): catch per learner, record
      `{ learner, ok: false, kind, message }`, continue the loop. **The catch is
      inside the loop body**, which is the whole task — a `try` around the loop
      is the naive version and it stops at the first failure *(done, and the catch is **inside** the loop, which is the whole function.)*
- [x] T005 Assert order-independence (Principle II): the same learners in reverse
      order produce the same documents. Guards against a shared accumulator
      leaking one learner's state into the next, which is the way this goes wrong
      that no happy-path test can see *(done, forwards and backwards, plus «one learner failing does not change what another produced».)*
- [x] T006 [P] Atomicity per sheet (FR-509): write to a temporary path and move
      into place, so a failure or a cancellation leaves a sheet whole or absent
      and never half-written *(done, and it moved into `Vault.writeRaw` so every writer benefits: temp file plus rename, with a fallback to the direct write for the realistic case of a vault on OneDrive with the destination held open. The observable half — no leftover temp — is asserted.)*
- [x] T007 [P] Per-learner verdicts (FR-510) — completeness, provenance and
      unaccounted-blocks checks each produce a verdict about one learner and
      never about the run *(done; the checks already ran inside `runAdaptation`, so this was verifying rather than building.)*
- [x] T008 Assert the extraction is read once and never written, for a batch of
      three (FR-502). This is Principle IV, and it has been a directory layout
      and a comment since August with nothing exercising it *(done, asserted as an **absence**: `batch.ts` imports no vault, no provider and no ingest, so it could not re-read the source if a future edit wanted to. Also clarified what FR-502 is about — the provider ingest, which is a separate step; reading `ir.md` from disk N times is free.)*
- [x] T009 `BatchProgress` with `learner`, `index` and `of` (FR-519). A
      single-learner run sends `of: 1`, so the renderer needs no branch for the
      old shape *(done. A single-learner run sends `of: 1`, so no caller needs a branch.)*

---

## Phase 3 · The wire

- [x] T010 `job:adapt` accepts `string | string[]` and returns `BatchOutcome`
      per [contracts/job-batch.md](contracts/job-batch.md). Accepting a bare
      string keeps the e2e suite driving the application unchanged **through**
      the change, which is what lets it catch a regression in it *(done, and a bare string is still accepted.)*
- [x] T011 [P] `ui/src/data/jobs.ts`: `useAdapt` takes a list and returns the
      outcome. Errors still decode in the layer (`013` FR-1109) — and now there
      can be three of them, each belonging to a named learner *(done. `BatchOutcome` has no «did it succeed?» field — a screen holding it cannot say «it failed» without saying whose, which is FR-507 enforced by the type.)*
- [x] T012 [P] Assert that `job:signOff`, `job:render`, `job:pdf`,
      `job:isSignedOff` and `job:reportData` still take exactly one learner. The
      contract's most important line: a `signOff` that took a list would be the
      «firmar todo» button FR-512 forbids, arriving through the API instead of
      through the interface *(done, over the **preload**, because that is the surface a renderer can reach.)*

---

## Phase 4 · Choosing

- [x] T013 `AdaptScreen`: the learner control becomes multi-select, after the
      extraction is verified. Per `016`'s clarification the flow is
      learner-first, so **this control is where the first learner becomes
      several** — `016` FR-1412 says a second learner must not feel like a
      correction, and this is the screen where that is either true or not *(done: a checkbox list, not a select plus «añadir otro». Two controls over one list is two copies of one truth, and it would have read as «this child, and then corrections» — which is what `016` FR-1412 forbids.)*
- [x] T014 The cost estimate covers the batch, stated as one figure with the
      number of sheets (FR-514), and the unusual-cost gate considers the batch
      (FR-515). Three ordinary sheets can be an unusual bill *(done: the estimate multiplies by the number of sheets, and the gate carries the learner list so «Adelante» runs the same set it priced.)*
- [x] T015 Batch progress: «2 de 3 · Mateo», with the stages as today *(done, shown only when there is more than one — «1 de 1» is noise on the common case.)*

---

## Phase 5 · Reviewing and signing · where the constitution is at risk

- [x] T016 `ReviewScreen` handles N sheets: a list she picks from, **not** a
      forced sequence. A sequence is how the third gets signed without being read *(done, and it needed no batch review screen: the outcome list on the adapt screen **is** the list, one row per learner, each entering the existing per-learner review. A forced sequence is how the third gets signed without being read.)*
- [x] T017 Each sheet keeps its own draft mark and its own sign-off (FR-511), and
      the learner is unambiguous on every screen a sheet appears on (FR-513) —
      the same worksheet three times over is exactly where a teacher signs the
      wrong one *(done. The review title said «Revisa y firma» and nothing else — fine while one worksheet meant one sheet, and exactly how a teacher signs the wrong one when three differ only in their content. It now names the learner.)*
- [x] T018 **Assert there is no way to sign two documents with one action**
      (FR-512, SC-504) — over the rendered interface, not over the handler, since
      T012 already covers the handler. Principle VII, and the affordance is the
      risk rather than the API *(done in `e2e/group.spec.ts`, over the rendered interface on every screen a batch reaches. The handler assertion is T012; this is the affordance, which could be built entirely in the renderer without a handler changing.)*
- [x] T019 Assert the review of three learners never presents their axes as
      aligned columns (`015` FR-1310, Principle V). This is the first screen in
      the application where children appear side by side, and a comparison view
      is one layout decision away *(done, structurally: no table containing axis values, and no row-direction container holding two learners' strips.)*

---

## Phase 6 · Close it honestly

- [x] T020 `e2e/group.spec.ts`, then **measure**: adapt one worksheet for one
      learner and the same worksheet for three, and record both costs
      (SC-502). If the second is three times the first, the extraction is being
      re-read and FR-502 is unmet however green the suite is *(e2e done — four tests. **The cost measurement is not done and needs a real key**, and until it is, SC-502 is unverified: if the second run costs three times the first, the extraction is being re-read and FR-502 is unmet however green the suite is.)*

---

## Phase 7 · FR-520 · the sheet made from a reading she has since corrected

Added 2026-09-01, from backlog **G23**. The requirement has been in this spec since
30 August with two of its three clauses met: correcting is allowed, nothing re-runs.
**Nothing marked the sheets, and nothing named the learners** — so a teacher could
fix «4/ × 8» back to «47 × 8» and the three sheets already on her desk said nothing.

**The mechanism, decided here rather than in the code.** G23 recorded two honest
options and leaned toward the second: stamp the extraction's verification date on the
sheet. Building it found a third that is strictly better, and the difference is a real
failure the second one has — **`setPageVerified` rewrites `ir.md` on every single
confirmation**, so anything keyed on *when* the extraction was confirmed, or on the
file's modification time, marks every existing sheet stale for a click that changed
nothing about the reading. What the sheet records instead is a fingerprint of **the
reading itself**: each block's id and text, in order. Front matter, the `verified`
flag, and her own hand edit of the sheet all move around it without moving it.

Derived on read, never stored as a flag. That is the other half of G23's warning: a
`stale: true` in the front matter is a fourth fact that has to stay true through a
re-run, a revision, a sign-off and a hand edit, and `014` already found that a stored
fact about the vault is a second copy of a truth the filesystem holds. A re-run
rewrites the stamp and the sheet is fresh again, with nothing to reset.

- [x] T021 Write `packages/core/test/reading.test.ts` **first**, red. The two cases
      that decide whether this works at all: the fingerprint moves when a block's
      text changes, and does **not** move when the front matter does — which is the
      exact difference between this and the mtime version *(done, red first — 12 cases.)*
- [x] T022 `packages/core/src/ir/reading.ts` · `readingFingerprint(doc)` over block
      id + text, in document order, whitespace collapsed. Over the **blocks**, never
      the file *(done. Twelve hex characters of SHA-256, short because she can open the document in Obsidian and forty characters of hexadecimal beside `adapted_on` is a document explaining itself badly.)*
- [x] T023 [P] `freshnessOf(sheet, current)` → `fresh` | `stale` | `unknown`, and
      `readingOf(sheet)`. **Three states, because a sheet made before this existed
      carries no stamp**: calling it fresh is a claim we cannot make, and calling it
      stale marks every sheet in every vault that exists today *(done, and the type is `ReadingFreshness`: `providers/catalogue.ts` already owns `Freshness` for how old the provider catalogue is. **The fourth name collision in this codebase**, after `Verdict` three times over.)*
- [x] T024 Stamp `from_extraction` beside `adapted_on` in
      `packages/shell/src/jobs/adapt.ts`. A fact about the process at the moment the
      sheet is written, like the date beside it — never from the model *(done, from the extraction as that run read it. `annotateInjection` adds notices and never touches a block's text, so the value cannot drift from what a later read computes.)*
- [x] T025 `packages/shell/src/jobs/stale.ts` · `staleSheets(vault, jobId)`: one row
      per learner the job has been adapted for, each with its freshness. `learnersOf`
      already answers «which learners», so this is a read and writes nothing *(done. A job whose `ir.md` has been deleted returns no rows rather than «todo desactualizado» — that is `014`'s missing-document case and it already has an answer there.)*
- [x] T026 [P] Derive the same answer in `entryFor` (`014`), which already parses both
      documents. One derivation, two surfaces — the alternative is a second
      implementation that can disagree with the first about whether a sheet is stale *(done: `RecordEntry.freshness`, derived on read, absent while a composed job has no sheet.)*
- [x] T027 IPC `job:staleSheets`, preload, and `useStaleSheets(jobId)` joining the
      names **in the renderer** (`013` FR-1107). Codes cross the wire; the name is
      joined where names already live, and no name reaches a file *(done, and the name map is not decrypted at all when every sheet is current — the common case, where the work would be done to say nothing.)*
- [x] T028 `VerifyScreen`: after a correction, name the learners whose sheets were
      made from the previous reading. It offers no «actualizar las tres» — re-running
      is the per-learner adaptation that already exists, chosen by her, one at a time *(done, asked on every refresh rather than only after a correction: she reaches this screen from `ingest:pending` days later and the question is the same one.)*
- [x] T029 [P] `RecordScreen`: the row says so too. **This is the durable half** — the
      callout is seen once, and «which of the material in my folder predates the
      correction?» is a question she asks a week later with the folder in her hand *(done, `stale` only. `unknown` is actionable on the verification screen — she has just corrected — and noise here, where every sheet made before this shipped is `unknown` and a line on every row of an existing vault teaches her to skip the line, taking the `stale` one down with it.)*
- [x] T030 Assert the negative in `packages/shell/test/`: correcting after a sheet
      exists reports it stale **and re-runs nothing** — no revision appears, no
      provider is called. FR-520's third clause is the one a helpful fix breaks *(done, `packages/shell/test/stale.test.ts`, 7 cases. Two are the negative: asking writes no file, and `stale.ts` imports nothing that could adapt — so «y ya que estamos, las rehago» would have to add an import and fail this test.)*

---

## Not in scope, recorded so it stays a decision

- **One sheet for a mixed group** — backlog G17, a deliberate non-goal.
- **A persistent group or class** — `005` chooses learners per job; if groups are
  worth having they are `015`'s and need their own argument.
- **The record entries** (`014` FR-516) — this feature ships writing files where
  they already go and gains record rows when `014` exists. Sequenced that way in
  the plan on purpose: building the reader before there is anything worth reading
  is how you get a record designed for one row.

## Dependencies

- T001 before everything.
- Phase 2 blocks Phases 3–6 entirely.
- T010 blocks T011 and T013.
- T016 blocks T017, which blocks T018 and T019.
- **SC-506 needs a teacher** and is not a task.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-501 | `job:adapt` takes one learner or several; `runBatch`. A bare string still returns a `BatchOutcome` of one, so the e2e drives it unchanged |
| FR-503 | `016` T018 · reuse from a record row passes `presetJobId`, and `runAdapt` no longer calls `job:verify` for a preset job — no provider call for the reading (SC-1405) |
| FR-504 | `extraction.json` is per job and `verified` is **derived** from its pages, never settable. Three verifications of one page cannot exist because there is one page record |
| FR-505 | `runBatch` calls `runAdaptation` per learner, and each call loads that learner's profile, notes and overlay. `batch.test.ts` asserts the second failing does not touch the first or third |
| FR-508 | `job:adapt` accepts a single code, which is how the review screen retries one |
| FR-517 | `record-erasure.test.ts` and `e2e/erasure.spec.ts`: the shared source stays when another learner still reads it, and the plan says so before touching anything |
| FR-520 | Phase 7, T021-T030. Allowed: `setPageVerified` and `ingest:correctAndConfirm`, unchanged. Marked: `from_extraction` on each sheet against `readingFingerprint(ir.md)`, surfaced on the verification screen and on every record row. By name: joined in the renderer, so the layer that decides never holds one. Re-runs nothing: `jobs/stale.ts` imports nothing that could, and `stale.test.ts` fails if that changes |
