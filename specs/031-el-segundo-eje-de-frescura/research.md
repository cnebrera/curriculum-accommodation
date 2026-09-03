# Phase 0 · Research

Four questions. R1 corrects the spec's central assumption and reshapes the foundational
tasks; R2 is where G35's design constraint becomes a function signature.

---

## R1 · How is each sheet's word→id datum read cheaply — and does it even exist on disk?

**Finding first, because it changes the question: it does not exist on disk.**

G35 says «`data-picto` already records word→id per block on every adapted sheet», and
that is true of the in-memory document and false of the file. The chain, read end to end:

- `applyPictograms` sets `b.attrs['data-picto']` on the **parsed** adapted document
  (`app/packages/core/src/pictograms/apply.ts:154`).
- `adapt.ts` calls it on `adapted = parseIR(result.out)` — and then writes
  **`result.out`**, the raw pre-mutation model output, to `adapted.md`
  (`app/packages/shell/src/jobs/adapt.ts:297,321,333,349-350`). The mutated document is
  used only to build the report, and the report records **words without ids**
  (`core/src/report/index.ts:286-287`).
- `print.ts` then reads `data-picto` back **from the file** with the comment «what is on
  the sheet was decided when it was adapted» (`shell/src/jobs/print.ts:81-91`) — a read
  of a value nothing persists. No test catches it because no test round-trips
  adapt→disk→print (`e2e/pictograms.spec.ts` stops at the corpus; the shell test asserts
  the in-memory `used` list only). This is G37's «written by one place, read by nobody»
  with the write and the read separated by a file.

**Decision**: persist the pairs at the write, deterministically, and read them where the
sheet is already being parsed.

- **Persisting**: a pure function in `core` (`stampPicto(raw, perBlockPairs)`) patches
  each block's attr list in the raw markdown by block id — the same shape as
  `stampReading`, applied at the same moment in `adapt.ts`. Deterministic string work,
  testable offline, and `parseIR` already round-trips attr lists (proven by
  `pictogram-render.test.ts`, which hand-writes `data-picto` in IR text). This also fixes
  the latent print defect for free: `print.ts`'s read starts finding what it was written
  to find.
- **Reading at derive time costs nothing extra**: `entryFor` already holds
  `parseIR(adaptedRaw)` — the blocks and their attrs are in hand. Extracting the pairs is
  `parsePicto` over blocks already parsed. Zero additional file reads per sheet.
- **The current-state side costs O(1) per scan, not O(sheets)**: the vocabulary is one
  file, the learner's override is inside a profile the caller already loads, and the set
  is already read through the existing cached access path. The shell assembles one
  resolution context per screen-open and passes it down — never one per job, which is
  `020` FR-1828's rule (one read of the material directory, not one per learner) applied
  to this axis. The record scan stays O(jobs) with the same constant it has today.

**Consequence for FR-2906**: the honest-unknown path is not a corner for pre-`024`
vaults; **every adapted sheet in every existing vault lacks the datum**, and they all
take it. That is what the spec's edge case already prescribes («where it does not, the
sheet is honestly “no puedo saberlo”») — the population is just larger than assumed, and
no migration is added: sheets gain the datum by being re-made, which is the existing
path.

**Alternatives considered**: reading the rendered HTML under `output/` (it does carry
`data-` attrs) — rejected: the HTML is a rendering, may be absent (she may never have
printed), may be deleted (`014` FR-1206 treats that as normal), and deriving truth about
the sheet of record from one of its outputs inverts Principle IV. Recording word→id in
the report — rejected: the report is prose for her, and parsing prose for data is the
failure `skippedWords` documents. A sidecar file of pairs — rejected: a second copy of a
truth the sheet itself should carry, and one more file for erasure and handover to visit.

---

## R2 · Where exactly is the comparison — extend `freshnessOf`, or a sister function?

**Decision**: **extend, into the one model** — a single deriver
`sheetFreshness(sheet, current)` in `core` returning both axes, where `current` carries
the reading fingerprint **and** a drawing resolver. `entryFor` calls it in the same
place it calls `freshnessOf` today; `jobs/stale.ts` calls the same function. There is no
second entry point.

**Rationale**: `scan.ts`'s own comment is the rule — «two derivations of one answer are
two derivations that can disagree about whether a sheet is stale». A sister function
called beside `freshnessOf` from the same `entryFor` would *look* unified and still be
the parallel mechanism G35 forbids: two functions, two signatures, two ways for a caller
to invoke one and forget the other (which is how FR-2218 died the first time — the
reading axis existed, the drawing axis was a comment). One function whose **return type
has two axes** makes forgetting an axis a type error, not a review finding.

**And the drawing resolver is `matchWord` itself, not a copy of its ladder.** The
current resolution for a word is override → vocabulary → set, names never, exactly one
or nothing — that ladder already exists (`core/src/pictograms/match.ts`) and it is what
a re-render would actually do. Comparing against `matchWord` gives the definition the
spec's A→B→A edge case demands: *stale iff re-making the sheet now would change a
recorded drawing.* It also makes the un-choose and override cases fall out with no code:
un-choosing a word the set resolves uniquely to the same id leaves sheets fresh (the
child is still taught that drawing); un-choosing a genuinely ambiguous word makes them
stale (`matched` → `ambiguous` ≠ the recorded id); a learner override pins that
learner's sheets against global changes because the ladder consults the override first.
A hand-rolled «compare against vocabulary only» would get all three wrong.

The resolver's inputs (set, vocabulary, overrides, names) are assembled **in the shell**
and passed in — the identical arrangement `applyPictogramsIfSheSaidSo` already has,
because `core` never reads settings and never learns a name.

**Alternatives considered**: comparing in the UI or in the IPC layer — rejected: the
verification screen and the record row must read one function (the reading axis's
existing rule). Comparing at choose-time and marking sheets — rejected twice over: it
writes state (violates FR-2901/SC-2903) and it is the event-log shape (wrong on A→B→A,
see plan.md). Extending `readingFingerprint` to hash the pairs into one fingerprint —
rejected: one hash cannot say **which** axis moved or name the word, so it fails
FR-2902/FR-2903 by construction.

---

## R3 · The pre-change warning with an exact count (FR-2905)

**Decision**: a new IPC, `pictograms:affected` (see contracts/), that answers «if this
word's resolution becomes X, how many sheets become stale by drawing?» by running **the
same deriver** over the vault with a *prospective* resolver — the current ladder with
one rung hypothetically changed. `ChooseWord` and `MyVocabulary` call it before
confirming a change to an already-chosen word; the number shown is «N hojas usan el
dibujo anterior; quedarán marcadas como desactualizadas en el expediente».

**Rationale**: SC-2902 demands the count and the record agree in 100% of cases, and the
spec says a mismatch is a defect, not an estimate. The only structure that makes the
promise unbreakable is *one derivator, two moments*: the warning runs it with tomorrow's
resolution, the record runs it with today's, and after she confirms, tomorrow's is
today's. Any second counting path — a cached tally, a heuristic over `used` lists, a
count kept at choose-time — can drift, and drift here is the G35 lie again with numbers.

**Cost shape**: one walk of `material/` per invocation (the moment she is about to
confirm — a human-paced event, not a render loop), parsing only sheets that exist,
short-circuiting on sheets whose pairs do not contain the word. Same complexity class as
`recordFor`, which `014` measured as milliseconds for 400 jobs, and it satisfies `020`
FR-1828's shape: one directory walk, never one per learner.

**Alternatives considered**: showing «some sheets may be affected» — rejected by the
spec's own text. Counting from the pictogram `used` lists in reports — rejected: reports
are prose and per-run, not per-current-sheet. Marking sheets at change time so the count
is trivially right — rejected: writes state, and SC-2903 exists to make that impossible
to sneak in.

---

## R4 · The honest-unknown path (FR-2906): distinguishing «no drawings» from «no record»

**Problem**: after R1's fix, a sheet with no `data-picto` pairs is one of two very
different things — a sheet genuinely made without drawings (most sheets, forever), or a
sheet written before the datum persisted (every sheet today). Reporting the first as
«no puedo saberlo» buries the signal in noise — G23's lesson: a tool that reports every
sheet as suspect has reported nothing. Reporting the second as fresh is the assumption
FR-2906 forbids.

**Decision**: the discriminator is the **per-sheet format version stamped under P50's
convention** (COLA 1.17 — prerequisite, declared not built). `adapt.ts` already stamps
facts-of-the-write into front matter (`adapted_on`, `from_extraction`); the format
version joins them at the same line. The rule the deriver applies:

| Pairs on the sheet | Format ≥ this feature's | Drawing axis |
|---|---|---|
| present | (any) | derived — retroactive wherever the datum exists, per the spec's edge case |
| absent | yes | `fresh` on this axis: the record is complete and empty — nothing recorded that could have gone stale |
| absent | no / unstamped | `unknown` — «no puedo saberlo», never assumed fresh |

Note the second row's corollary, which is US1's own sentence applied forward: **choosing
a drawing for a word a sheet never carried does not mark that sheet** («sheets that never
used “casa” are untouched»). The axis compares recorded pairs only; it never asks what a
re-make would *add*.

**Why a version stamp and not a boolean**: `drawings_recorded: true` is a flag-shaped
key that answers exactly one feature's question; the format version is P50's general
mechanism for «can this stored shape be trusted?», it is being built anyway, and this
spec's Assumptions already tie the two together («makes a stored format load-bearing and
wants the version marker under it»). If P50 ships vault-level only, this plan's stamp is
the per-sheet application of the same convention — recorded here so the dependency is a
conversation, not a surprise.

**Alternatives considered**: treating absence as fresh — forbidden by FR-2906, and it is
precisely the silent wrongness this project exists to catch. Treating absence as stale —
marks a teacher's whole folder suspect the day she updates (G23). A migration that
back-fills pairs — rejected: there is nothing truthful to back-fill from (R1: the datum
was dropped, not stored elsewhere), and inventing it would be falsifying provenance.
