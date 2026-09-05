import { parsePicto } from '../pictograms/apply.js';
import { readingOf, type ReadingFreshness } from './reading.js';
import type { IRDocument } from './types.js';

/**
 * One freshness model, two axes (031 T005, FR-2901/2902/2903/2906).
 *
 * ## Why the type has both axes always
 *
 * Because `024` FR-2218 was «satisfied by a comment» for a year: the reading axis existed,
 * the drawing axis was deferred, and a caller reading `freshness` got one answer with no
 * way to know a second one was missing. A shape with both fields present is a shape a
 * caller cannot read half of by accident — FR-2903's «neither masks the other», enforced
 * by the compiler rather than by remembering.
 *
 * ## And why they never merge into one value
 *
 * «Hecha con una lectura que cambió» and «hecha con un dibujo que ya no usas» are
 * different facts with different remedies: re-verify the reading, or re-make the sheet.
 * A single `'stale'` for display convenience is exactly where one would mask the other.
 * Any surface that wants a summary computes it in front of her, from the two it was given.
 *
 * ## Derived, never stored
 *
 * Nothing on disk ever says «stale». Both axes compare **provenance** — facts stamped at
 * the moment the sheet was written — against what is current now. So there is nothing to
 * reset, nothing to keep true, and A→B→A is fresh again without an event log noticing
 * two events (which is what makes an event log the wrong instrument here, not merely a
 * redundant one).
 */

/** One axis's state. The reading axis reuses `005`'s three values unchanged. */
export type AxisState = ReadingFreshness;

/**
 * `DocumentFreshness` and not `Freshness`.
 *
 * `providers/catalogue.ts` owns `Freshness` for how old the provider catalogue is, and
 * `jobs/stale.ts` owns `SheetFreshness` for a learner-and-state pair. That is the **fifth**
 * name collision in this codebase — `reading.ts` recorded the fourth and said why: a short
 * noun for a common shape is where two unrelated features meet, and the fix is to say
 * which thing it is. data-model.md calls this `Freshness`; the name is the only thing that
 * differs, and this comment is the trail from one to the other.
 */
export interface DocumentFreshness {
  /** `005`'s axis: `from_extraction` against the current reading fingerprint. */
  reading: AxisState;
  /** This spec's axis: the drawings this sheet used against what she uses now. */
  drawings:
    | { state: 'fresh' }
    /** The words whose drawing no longer matches — **named**, per FR-2902. */
    | { state: 'stale'; words: string[] }
    /** No record, and no stamp to vouch for its absence (FR-2906). */
    | { state: 'unknown' };
}

export interface CurrentState {
  /** `readingFingerprint(parseIR(ir.md))`, exactly as today. */
  reading: string;
  /**
   * The live ladder for this learner and this sheet's language: override → vocabulary →
   * set, names never. **`matchWord` itself**, partially applied by the shell.
   *
   * Returns the id a re-render would use now, or `undefined` for ambiguous, none or a
   * name. `undefined` where the sheet recorded an id is the un-choose case and is stale;
   * equal is the A→B→A case and is fresh. Asking the ladder «what would it be now»
   * subsumes «where did it come from», which is why no sheet records a source.
   */
  drawingFor: (word: string) => string | undefined;
  /**
   * Does this sheet's format stamp vouch for the absence of pairs? (research R4.)
   *
   * A sheet written before `031` has no pairs **and** no way to say whether that means
   * «no pictograms were used» or «nobody recorded them». The vault's schema version is
   * what distinguishes the two: at or above the version that started stamping, an empty
   * record is a real record of nothing.
   */
  recordsDrawings: boolean;
}

export function sheetFreshness(sheet: IRDocument, current: CurrentState): DocumentFreshness {
  const from = readingOf(sheet);
  const reading: AxisState = from === undefined ? 'unknown'
    : from === current.reading ? 'fresh' : 'stale';

  const recorded = new Map<string, string>();
  for (const b of sheet.blocks) {
    for (const { word, id } of parsePicto(b.attrs['data-picto'])) recorded.set(word, id);
  }

  if (recorded.size === 0) {
    /*
     * Nothing recorded. Whether that is «no drawings on this sheet» or «this sheet
     * predates the record» is not something the sheet can say on its own — so the vault's
     * own version answers it, and where it cannot, the answer is «no lo sé» (FR-2906).
     *
     * Never `fresh`. A sheet reported fresh on a claim we cannot check is the one outcome
     * that would make this axis worse than not having it.
     */
    return { reading, drawings: current.recordsDrawings ? { state: 'fresh' } : { state: 'unknown' } };
  }

  const moved: string[] = [];
  for (const [word, id] of recorded) {
    if (current.drawingFor(word) !== id) moved.push(word);
  }
  return {
    reading,
    drawings: moved.length ? { state: 'stale', words: moved.sort() } : { state: 'fresh' },
  };
}

/** True when either axis has something to say. For a surface deciding whether to speak. */
export const staleInAnyAxis = (f: DocumentFreshness): boolean =>
  f.reading === 'stale' || f.drawings.state === 'stale';
