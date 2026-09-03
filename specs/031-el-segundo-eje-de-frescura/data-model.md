# Data model

One derived type in memory with two axes, and on disk only **provenance** — facts about
the moment a sheet was written, stamped once and never maintained. Nothing on disk says
«stale», ever: SC-2903 asserts the whole vault is byte-identical before and after every
freshness computation.

## On disk — provenance, not state

```
material/<job>/<code>/adapted.md   front matter:
                                     from_extraction: "a1b2c3d4e5f6"   exists (005)
                                     <format version key, P50's name>  NEW — stamped at write
                                   blocks:
                                     ::: {#b3 .instruction data-picto="casa=6964 sol=2483"}
                                                                        exists as a format,
                                                                        NEW: actually written
```

- **`data-picto` pairs** — word→id per block, `024`'s format unchanged
  (`word=id`, space-joined, ids on the same `[A-Za-z0-9_-]{1,40}` allowlist). What is
  new is only that `adapt.ts` persists them (research R1: today they are computed on the
  in-memory document and dropped before the write). This is «makes it load-bearing» from
  the spec's Key Entities, done literally.
- **The format version** — P50's marker (COLA 1.17, prerequisite), stamped per sheet at
  the same line where `adapted_on` and `from_extraction` are stamped. It is how the
  deriver distinguishes «record complete and empty» from «no record» (research R4).

Both are the same kind of fact as `from_extraction`: written once, at the write, by the
process that knows them; a re-made sheet comes back through the same line and stamps
current values, so there is nothing to reset and nothing to keep true.

## In memory — the one answer with two axes

```ts
/** One axis's state. The reading axis reuses 005's three values unchanged. */
export type AxisState = 'fresh' | 'stale' | 'unknown';

/**
 * The one derived answer per sheet (FR-2901). Both axes always present in the
 * type, so a caller cannot read one and forget the other exists — which is how
 * FR-2218 was satisfied by a comment for a year (FR-2903's «neither masks the
 * other», enforced by shape).
 */
export interface Freshness {
  /** 005's axis: from_extraction vs the current reading fingerprint. */
  reading: AxisState;
  /** This spec's axis: recorded drawings vs the current resolution. */
  drawings:
    | { state: 'fresh' }
    /** The words whose drawing no longer matches — named, per FR-2902. */
    | { state: 'stale'; words: string[] }
    /** No record and no format stamp to vouch for its absence (FR-2906). */
    | { state: 'unknown' };
}

/** What «current» means, assembled by the shell once per scan (research R2). */
export interface CurrentState {
  /** readingFingerprint(parseIR(ir.md)) — exactly as today. */
  reading: string;
  /**
   * The live rung ladder for this learner and this sheet's language:
   * override → vocabulary → set, names never — matchWord itself, partially
   * applied. Returns the id a re-render would use, or undefined for
   * ambiguous/none/name. Undefined ≠ a recorded id ⇒ stale, which is the
   * un-choose case; equal ⇒ fresh, which is the A→B→A case.
   */
  drawingFor: (word: string) => string | undefined;
}

export function sheetFreshness(sheet: IRDocument, current: CurrentState): Freshness;
```

`entryFor` (`record/scan.ts`) and `staleSheets` (`jobs/stale.ts`) call `sheetFreshness`
where they call `freshnessOf` today — the same one place per surface, and the only two
callers. `RecordEntry.freshness` changes type from `ReadingFreshness` to `Freshness`;
the UI data layer (`ui/src/data/record.ts`, `jobs.ts`) follows. The compiler finds every
reader, which is the point of changing the type instead of adding a second field.

## What deliberately gains no field

| | Why |
|---|---|
| `stale: true` / `stale_since` in front matter | FR-2901, and `014` SC-1203: a stored fact about the vault is a second copy of a truth the filesystem holds. **Note**: `005`'s data-model.md *documents* `stale_since` but it was never built — what shipped is derived (`ir/reading.ts`'s docstring). The FR-2907 amendment corrects that document rather than this one inheriting its mistake |
| An event log of vocabulary changes | Wrong, not just redundant: A→B→A has two events and zero staleness (plan.md). Also one more thing for erasure and handover to visit — the spec's edge case requires staleness to add no files and travel in no packet |
| A copy of the vocabulary (or its hash) on each sheet | The pairs already say which drawing this sheet used; hashing the whole vocabulary would mark a sheet stale when an unrelated word changed |
| `source` (set/vocabulary/override) per recorded pair | Tempting for the un-choose case, unnecessary once the comparison is against `matchWord` itself: the ladder answers «what would it be now», which subsumes «where did it come from» (research R2) |
| A count or list of affected sheets, cached anywhere | FR-2905's count must equal the record; the only structure that guarantees it is deriving both from one function at ask-time (research R3) |
| «checked at» timestamps | Usage tracking nobody asked for, and G23: a date that moves reports nothing |

## The two axes never merge into one value

`Freshness` is deliberately **not** collapsed to a single `'stale'` for display
convenience. FR-2903: a sheet stale for both causes shows both reasons; the reading
axis's sentence and the drawing axis's sentence («hecha con un dibujo que ya no usas:
casa») are different facts with different remedies (re-verify vs re-make), and a merged
value is where one would mask the other. Any surface that wants a summary computes it in
front of her, from the two axes it was given.

## What this changes for signatures, revisions and files

Nothing (FR-2904). `signedOff` remains `isSignedOff(adapted)`; a sheet stale by drawing
keeps its signature — the signature belongs to the sheet it was given to (`005` FR-511).
Re-making a stale sheet is the existing re-adapt path: it writes a new revision, keeps
the old one on disk unchanged, and the new sheet stamps current provenance and derives
fresh. No new generation machinery (spec Assumptions).
