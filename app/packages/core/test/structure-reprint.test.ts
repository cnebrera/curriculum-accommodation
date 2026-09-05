import { describe, it, expect } from 'vitest';
import {
  buildStructure, parseIR, renderHTML, sheetFreshness, type PictogramSet,
} from '../src/index.js';

/**
 * What is saved is what reprints (028 T018, FR-2603, SC-2602).
 *
 * ## The invariant, and the thing it is defending against
 *
 * She prints the sequence in October and pins it above the sink. In March a child loses
 * it and she reprints. **The second sheet must be the first sheet** — because the child
 * learned that routine from that strip, and a step that has quietly acquired a different
 * picture is not a reprint, it is a new material handed over as an old one.
 *
 * The tempting mistake is not a bug anyone would write deliberately: it is rebuilding
 * from her word list at print time, which sounds like «keeping it up to date» and would
 * be right for almost anything else in this application. Here it means her vocabulary
 * changing in January silently rewrites a strip a child reads every day.
 *
 * `024` already settled this for adapted worksheets — sheets already made keep the
 * drawing they were made with — and `031` gave her the way to find out that a sheet no
 * longer matches her current choice. This asserts the same two facts for structure
 * material: the file does not change, and the record can say that it is out of date.
 */
const SET: PictogramSet = {
  root: '/fixture',
  byLanguage: new Map([['es', new Map([
    ['jabon', ['1001']],
    ['grifo', ['2001']],
    ['secar', ['3001', '3002']],
  ])]]),
  images: new Set(['1001', '2001', '3001', '3002']),
  from: new Map(),
  popularity: new Map(),
};

const STEPS = [{ word: 'grifo' }, { word: 'jabon' }, { word: 'secar' }];

const october = buildStructure({
  kind: 'secuencia', title: 'Lavarse las manos', items: STEPS,
  language: 'es', set: SET, forLearner: 'AL-07', created: '2026-10-06',
  chosen: new Map([['secar', '3001']]),
});

describe('a saved sequence reprints identically', () => {
  it('the same file renders to the same page, months later', () => {
    /*
     * Reprinting reads the file, so this is what «reprint» actually is: parse what is on
     * disk and render it. Nothing recomputes, so there is nothing to drift.
     */
    const fromDisk = parseIR(october.markdown);
    expect(renderHTML(fromDisk)).toBe(renderHTML(parseIR(october.markdown)));
  });

  it('and her vocabulary changing does not change it', () => {
    /*
     * The whole point. In January she decides a different picture is the right «secar»,
     * which is her call and applies to everything she makes afterwards. The strip above
     * the sink is not «afterwards»: a child has been reading it since October.
     */
    const january = buildStructure({
      kind: 'secuencia', title: 'Lavarse las manos', items: STEPS,
      language: 'es', set: SET, forLearner: 'AL-07', created: '2026-10-06',
      chosen: new Map([['secar', '3002']]),
    });
    // The builder run again *would* produce a different document — that is correct, and
    // it is what «hazla otra vez» gives her.
    expect(january.markdown).not.toBe(october.markdown);
    // But the saved one is untouched: reprinting reads the file, and the file is the file.
    expect(parseIR(october.markdown).blocks[2]!.attrs['data-picto']).toContain('3001');
  });

  it('and the record can say the strip no longer matches what she uses now', () => {
    /*
     * The counterpart, and the reason not changing the file is honest rather than merely
     * safe: `031`'s second freshness axis reads the recorded pair against what the word
     * would resolve to today, so October's strip is reported as carrying a drawing she no
     * longer uses. She is told; the file is not edited under her.
     */
    const doc = parseIR(october.markdown);
    const freshness = sheetFreshness(doc, {
      reading: '',
      drawingFor: (word) => (word === 'secar' ? '3002' : SET.byLanguage.get('es')?.get(word)?.[0]),
      recordsDrawings: true,
    });
    expect(freshness.drawings.state).toBe('stale');
    expect(freshness.drawings.state === 'stale' ? freshness.drawings.words : []).toEqual(['secar']);
  });

  it('and it is fresh again the moment she changes her mind back', () => {
    // Derived, not stamped: nothing was written into the strip when she changed her
    // vocabulary, so there is nothing to un-write when she changes it back.
    const doc = parseIR(october.markdown);
    const freshness = sheetFreshness(doc, {
      reading: '',
      drawingFor: (word) => (word === 'secar' ? '3001' : SET.byLanguage.get('es')?.get(word)?.[0]),
      recordsDrawings: true,
    });
    expect(freshness.drawings.state).toBe('fresh');
  });
});

describe('the numbers are positions, not labels she maintains', () => {
  it('reordering the steps renumbers them', () => {
    const reordered = buildStructure({
      kind: 'secuencia', items: [STEPS[1]!, STEPS[0]!, STEPS[2]!],
      language: 'es', set: SET, forLearner: 'AL-07', created: '2026-10-06',
    });
    expect(reordered.doc.blocks.map((b) => b.attrs['data-number'])).toEqual(['1', '2', '3']);
    expect(reordered.doc.blocks.map((b) => b.content)).toEqual(['jabon', 'grifo', 'secar']);
  });

  it('and an agenda has no numbers at all, because a day is not a countdown', () => {
    /*
     * A sequence's number is content — «primero el jabón» is the step. A day's moments
     * are in an order without being counted, and numbering them would invite a child to
     * read «4» as a quantity of something.
     */
    const day = buildStructure({
      kind: 'agenda', items: [{ word: 'grifo' }, { word: 'jabon' }],
      language: 'es', set: SET, forLearner: 'AL-07', created: '2026-10-06',
    });
    expect(day.doc.blocks.every((b) => b.attrs['data-number'] === undefined)).toBe(true);
  });
});
