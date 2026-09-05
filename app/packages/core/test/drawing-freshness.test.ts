import { describe, it, expect } from 'vitest';
import {
  parseIR, sheetFreshness, staleInAnyAxis, stampPicto, stampReading, readingFingerprint,
  type CurrentState,
} from '../src/index.js';

/**
 * A sheet knows which drawing it used, and can say when that changed
 * (031 T001, FR-2901…2903, FR-2906).
 *
 * ## The gap this closes
 *
 * `005` gave a sheet one axis of freshness — the reading it was made from — and `024`
 * FR-2218 deferred the second: whether the pictogram beside «casa» is still the one she
 * uses. That deferral was «satisfied by a comment» for a year, and the shape of this type
 * is the fix: **both axes are always present**, so a caller cannot read one and not know
 * the other exists.
 *
 * ## And the defect underneath it
 *
 * The pairs were not on disk at all. `applyPictograms` set `data-picto` on the parsed
 * document and `adapt.ts` wrote the raw model output, so nothing persisted them — while
 * `print.ts` read them back from the file under a comment saying they had been decided at
 * adaptation time. This axis is only answerable because `stampPicto` now writes them.
 */
const sheet = (pairs: string): string => `---
from_extraction: "abc123def456"
---

::: {#b1 .instruction${pairs ? ` data-picto="${pairs}"` : ''}}
Rodea la casa y el sol.
:::

::: {#e1 .exercise}
1. 4 × 3 =
:::
`;

/** The live ladder, as a fixture: word → what a re-render would draw now. */
const ladder = (map: Record<string, string>): CurrentState['drawingFor'] =>
  (word: string) => map[word];

const current = (over: Partial<CurrentState> = {}): CurrentState => ({
  reading: 'abc123def456',
  drawingFor: ladder({ casa: '6964', sol: '2483' }),
  recordsDrawings: true,
  ...over,
});

describe('the drawing axis', () => {
  it('is fresh when every recorded drawing is still the one she uses', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964 sol=2483')), current());
    expect(f.drawings).toEqual({ state: 'fresh' });
    expect(staleInAnyAxis(f)).toBe(false);
  });

  it('is stale when one changed, and it names the word (FR-2902)', () => {
    // Named, because «esta hoja está antigua» is a sentence she cannot act on and
    // «hecha con un dibujo que ya no usas: casa» is one she can.
    const f = sheetFreshness(parseIR(sheet('casa=6964 sol=2483')),
      current({ drawingFor: ladder({ casa: '9999', sol: '2483' }) }));
    expect(f.drawings).toEqual({ state: 'stale', words: ['casa'] });
  });

  it('names every word that moved, in a stable order', () => {
    const f = sheetFreshness(parseIR(sheet('sol=2483 casa=6964')),
      current({ drawingFor: ladder({}) }));
    expect(f.drawings).toEqual({ state: 'stale', words: ['casa', 'sol'] });
  });

  /**
   * The un-choose case, which a stored flag would get wrong.
   *
   * She had chosen a drawing for «casa» and then removed the choice, so the ladder now
   * answers «nothing». The sheet still carries a drawing she no longer uses — stale, and
   * for the same reason as a changed one.
   */
  it('is stale when she un-chose a word and the ladder now answers nothing', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964')),
      current({ drawingFor: ladder({}) }));
    expect(f.drawings).toEqual({ state: 'stale', words: ['casa'] });
  });

  /**
   * A→B→A, which an event log would get wrong.
   *
   * Two changes happened and zero staleness resulted, because what is compared is the
   * sheet against **now** — not a history of events. That is why the design has no log:
   * a log is the wrong instrument here, not merely a redundant one.
   */
  it('is fresh again when a choice went away and came back', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964')),
      current({ drawingFor: ladder({ casa: '6964' }) }));
    expect(f.drawings).toEqual({ state: 'fresh' });
  });
});

describe('a sheet with no drawings recorded', () => {
  it('is unknown where the vault cannot vouch for the absence (FR-2906)', () => {
    // Never `fresh`: a sheet reported fresh on a claim we cannot check is the one
    // outcome that makes this axis worse than not having it.
    const f = sheetFreshness(parseIR(sheet('')), current({ recordsDrawings: false }));
    expect(f.drawings).toEqual({ state: 'unknown' });
  });

  it('and fresh where it can, because then an empty record is a record of nothing', () => {
    const f = sheetFreshness(parseIR(sheet('')), current({ recordsDrawings: true }));
    expect(f.drawings).toEqual({ state: 'fresh' });
  });
});

describe('the two axes never mask each other (FR-2903)', () => {
  it('both are reported when both apply', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964')),
      current({ reading: 'f00d1234beef', drawingFor: ladder({}) }));
    expect(f.reading).toBe('stale');
    expect(f.drawings.state).toBe('stale');
  });

  it('a stale reading does not make the drawings stale', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964')), current({ reading: 'f00d1234beef' }));
    expect(f.reading).toBe('stale');
    expect(f.drawings).toEqual({ state: 'fresh' });
  });

  it('and a stale drawing does not make the reading stale', () => {
    const f = sheetFreshness(parseIR(sheet('casa=6964')),
      current({ drawingFor: ladder({}) }));
    expect(f.reading).toBe('fresh');
    expect(f.drawings.state).toBe('stale');
  });

  it('the reading axis keeps `005`’s three values, unchanged', () => {
    const noStamp = parseIR('::: {#b1 .instruction}\nRodea la casa.\n:::\n');
    expect(sheetFreshness(noStamp, current()).reading).toBe('unknown');
  });
});

/**
 * And the pairs actually reach the file (T003/T004, research R1).
 *
 * The axis above is only answerable because they do. This is the round trip nothing
 * tested before: stamp → parse → read back.
 */
describe('the pairs survive being written', () => {
  const raw = sheet('');

  it('are written onto the block that got them, by id', () => {
    const out = stampPicto(raw, new Map([['b1', 'casa=6964 sol=2483']]));
    expect(out).toContain('data-picto="casa=6964 sol=2483"');
    const back = parseIR(out);
    expect(back.blocks.find((b) => b.id === 'b1')!.attrs['data-picto'])
      .toBe('casa=6964 sol=2483');
  });

  it('and the rest of her document is untouched, line for line', () => {
    // Not `irToMarkdown(mutated)`, which would rewrite block order, attribute order and
    // the model's own line breaks. A diff that changes every line to add one attribute
    // is a diff she cannot read, and the vault is hers to read.
    const out = stampPicto(raw, new Map([['b1', 'casa=6964']]));
    const changed = out.split('\n').filter((l, i) => l !== raw.split('\n')[i]);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toContain('data-picto');
  });

  it('a re-adaptation replaces the pairs rather than appending to them', () => {
    // Otherwise a sheet adapted twice would carry the union of both runs, and the axis
    // would report a word the current sheet does not use.
    const once = stampPicto(raw, new Map([['b1', 'casa=6964']]));
    const twice = stampPicto(once, new Map([['b1', 'casa=9999']]));
    expect(twice).toContain('data-picto="casa=9999"');
    expect(twice).not.toContain('6964');
  });

  it('a block nobody stamped is left alone', () => {
    const out = stampPicto(raw, new Map([['nope', 'casa=6964']]));
    expect(out).toBe(raw);
  });

  it('and it composes with the reading stamp, which is written the same way', () => {
    const both = stampPicto(stampReading(sheet(''), 'abc123def456'),
      new Map([['b1', 'casa=6964']]));
    const doc = parseIR(both);
    expect(readingFingerprint(doc)).toBeTruthy();
    expect(sheetFreshness(doc, current()).drawings).toEqual({ state: 'fresh' });
  });
});
