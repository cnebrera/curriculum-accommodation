# Quickstart — proving the record tells the truth about drawings

Everything here is offline until §5, and §5 spends no money either — this feature calls
no model anywhere. Ordered so the invariants exist before the code they constrain.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite, green before starting
```

**And the P50 format marker exists** (COLA 1.17). If it does not, stop: this feature
stamps a per-sheet format version under its convention, and inventing our own key here
would be the two-names-for-one-fact defect at birth.

## §1 · The seed vault, and the test to write first

```bash
npx vitest run packages/core/test/drawing-freshness.test.ts
```

A seed vault built by hand in the test fixtures — its ground truth written as data, not
derived by the code under test:

- Learner M and learner L; five jobs. Sheets that carry «casa=A», sheets that carry
  «sol=X» and not «casa», one sheet with pictograms recorded as complete-and-empty, one
  pre-feature sheet with no pairs and no format stamp, one **signed** sheet carrying
  «casa=A», and one sheet for L whose **override** pins «casa=A».

Then: change the vocabulary so «casa» resolves to B, and assert **SC-2901 as an
invariant** — precision and recall both 1.0: exactly the sheets that recorded «casa=A»
are stale-by-drawing, each naming «casa»; the «sol» sheets untouched; L's pinned sheet
untouched by the global change (and touched by an override change, and only then).

Red first. A precision/recall check written after the deriver works is a check written
to fit what it already marks.

## §2 · The invariant that is FR-2901's teeth

```bash
npx vitest run packages/core/test/freshness-writes-nothing.test.ts
```

Hash every byte of the seed vault. Run every derivation this feature has — record scan,
verification rows, the affected-count with both `next: id` and `next: null`. Hash again.
**Identical, or the feature has stored a flag** (SC-2903). This is the cheapest test in
the feature and the one that catches a «small optimisation» writing state next year.

## §3 · Offline · the model's edges

Same suite, the cases that decide the design:

| Case | Expected |
|---|---|
| A→B→A | Sheets made under A are **fresh** — compared against the current resolution, not a change count |
| Un-choose, word still resolved uniquely by the set to the same id | fresh — re-making reproduces the drawing |
| Un-choose, word genuinely ambiguous | stale, naming the word — what the child is taught changed |
| Stale by reading **and** by drawing | both reasons present, independently (FR-2903) — neither masks the other |
| Signed sheet goes stale by drawing | `signedOff` still true (FR-2904); staleness is currency, not un-signing |
| Sheet with pairs, made before this feature | derived retroactively — the datum exists, so the axis works |
| Sheet with no pairs, no format stamp | `unknown` — «no puedo saberlo», never fresh (FR-2906) |
| Sheet with format stamp and no pairs | fresh on this axis: complete and empty |
| Choosing a drawing for a word no sheet carries | zero sheets affected — never marks by addition |

Plus the structural one: `sheetFreshness` has exactly two callers (`record/scan.ts`,
`jobs/stale.ts`) and nothing else imports the old single-axis `freshnessOf`. Asserted at
source level, because «a sister function someone called instead» is how this axis was a
comment for a year.

## §4 · Offline · the datum reaches the disk

```bash
npx vitest run packages/shell/test/adapt-pictograms.test.ts
```

The R1 fix, asserted where it broke: after an adaptation with pictograms, **the
`adapted.md` on disk** carries `data-picto` in its block attr lists and the format stamp
in its front matter — not the in-memory document, the file. And the round trip: parse
the file back, `parsePicto` returns the pairs, `print.ts`'s image lookup finds its ids.

## §5 · With a window · the warning and the record agree

```bash
npm run build && RAMPA_HIDDEN=1 npx playwright test e2e/drawing-freshness.spec.ts
```

1. Adapt a sheet with pictograms for two learners. Open MyVocabulary, change «casa».
2. **Before confirming**: «N hojas usan el dibujo anterior; quedarán marcadas como
   desactualizadas en el expediente» — and N is the seed's ground truth, not a guess.
3. Confirm. Open each record: exactly those N sheets say «hecha con un dibujo que ya no
   usas: casa» (SC-2902 — the count and the record are the same number).
4. The old sheets on disk: byte-identical. The signature on the signed one: still there.
5. Re-make one stale sheet: the new revision uses the current drawing and derives fresh;
   the old revision is still on disk, unchanged.
6. Change it back to A: the September sheets are current again, with no run in between.

## §6 · The sentences (SC-2904)

- `MyVocabulary` no longer says «todavía no sé avisarte» — it says what now happens, and
  the number it shows comes from the same deriver the record reads.
- `renderVocabulary`'s prose in **her vault file** says the same truth — that file
  outlives the application, which is where the last lie lived longest.
- A guard test asserts the false sentence («las hojas que ya hiciste no cambian… no te
  aviso») appears nowhere in `ui/` or `core/` — the G35 lie made unmakeable because the
  text that replaced it is exercised by §5's walk.

## §7 · Looked at, not asserted

```bash
npm run shots
```

Open them: a record row carrying **both** reasons at the narrowest width and at
`xlarge` — two sentences in one cell is exactly where truncation would silently mask an
axis, and no assertion sees an ellipsis the way an eye does. And the warning dialog:
whether «N hojas» reads as a consequence or as jargon.

## §8 · The paperwork is part of the feature

`bash scripts/check-fr-coverage.sh` green, and the three FR-2907 amendments in place:
`005`'s data model describes the two-axis derived model (dated note, `016` FR-1401
style — including the correction that `stale_since` was documented and never built);
`024` FR-2218's deferral note closes with a pointer here; no UI text contradicts the
behaviour.
