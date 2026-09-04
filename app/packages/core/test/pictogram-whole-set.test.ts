import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  readIndex, planWholeSet, updateStatus, type SetInventory,
} from '../src/pictograms/fetch.js';
import { parsePictogramFetchCorpus } from '../src/pictograms/publisher.js';
import {
  parseVocabulary, renderVocabulary, choose, unchoose, chosenFor, forLanguage,
  emptyVocabulary,
} from '../src/pictograms/vocabulary.js';
import { matchWord, nameWords } from '../src/pictograms/match.js';

/**
 * The whole set, in one press (024 T004/T006/T008).
 *
 * The assertions that carry this feature are the ones about what does **not** happen:
 * a second pass asks for nothing, and an ambiguous word she has not chosen for still
 * gets no pictogram. `023` shipped a download that produced empty worksheets; the
 * second of those is the reason.
 */

const CORPUS = readFileSync(
  new URL('../../../../instructions/pictograms.md', import.meta.url), 'utf8');

/** The shape ARASAAC's bulk index actually returns, verified 2026-09-02. */
const entry = (id: number, word: string, downloads: number, updated = '2025-01-01') =>
  ({ _id: id, keywords: [{ keyword: word }], downloads, lastUpdated: updated });

describe('the corpus decides the size, not the code (FR-2204, FR-2207)', () => {
  const corpus = parsePictogramFetchCorpus(CORPUS);

  it('reads the numbers the download needs', () => {
    expect(corpus.imageSize).toBe(300);
    expect(corpus.concurrency).toBeGreaterThan(0);
    expect(corpus.expectedTotal).toBeGreaterThan(10_000);
    /*
     * At least the measured total. `expected_megabytes` was 60, extrapolated from one
     * 4 KB pictogram; a complete download on 2026-09-02 came to **157 MB** — an average
     * of ~11 KB, because a drawing with interior detail is not a house.
     *
     * The floor is here so the next person who "tidies" this number back down to
     * something plausible fails a test rather than telling a teacher she needs 60 MB
     * free and stopping her download two thirds of the way through.
     */
    expect(corpus.expectedMegabytes,
      'must cover the 157 MB measured on 2026-09-02').toBeGreaterThanOrEqual(157);
  });

  it('the size satisfies the print minimum the corpus itself states', () => {
    /*
     * 300px is not a taste. `instructions/pictograms.md` states `min_print_mm`, and at
     * 300 dpi that many millimetres needs `mm / 25.4 * 300` pixels — so the image size
     * has to be at least that. This test is why both numbers live in the same file, and
     * it is the test that catches the day somebody raises the print size and forgets
     * that the downloaded images are now too small for it.
     */
    const mm = Number(/min_print_mm:\s*(\d+)/.exec(CORPUS)?.[1] ?? 0);
    expect(mm, 'the corpus must state a minimum print size').toBeGreaterThan(0);
    expect(corpus.imageSize).toBeGreaterThanOrEqual(Math.ceil((mm / 25.4) * 300));
  });

  it('fails closed on a corpus with the numbers missing', () => {
    // A plausible default would mean a broken corpus still downloading 200 MB at a
    // size nobody chose. Zero builds no URL and starts nothing.
    const bare = parsePictogramFetchCorpus('---\nid: x\n---\n', 't');
    expect(bare.imageSize).toBe(0);
    expect(bare.concurrency).toBe(0);
  });

  it('refuses a publisher with no bulk index', () => {
    const mk = (extra: string) => ['---', 'publishers:', '  - id: x', '    label: X',
      '    image: "https://x.test/{id}_{size}.png"',
      extra, '    site: "https://x.test"', '    licence: L',
      '    licence_url: "https://x.test/l"', '    languages: [es]', '    attribution:',
      '      author: A', '      owner: O', '      source: S', '---', ''].join('\n');
    expect(parsePictogramFetchCorpus(mk('    index: "https://x.test/all"'), 't').publishers)
      .toEqual([]);   // no {lang}
    expect(parsePictogramFetchCorpus(mk('    index: "https://x.test/all/{lang}"'), 't')
      .publishers).toHaveLength(1);
  });
});

describe('one request, and she types nothing (FR-2201, FR-2202)', () => {
  it('reads the publisher bulk index', () => {
    const got = readIndex([entry(1, 'casa', 900), entry(2, 'perro', 50)]);
    expect(got.map((e) => e.id)).toEqual(['1', '2']);
    expect(got[0]!.keywords).toContain('casa');
    expect(got[0]!.popularity).toBe(900);
    expect(got[0]!.updated).toBe('2025-01-01');
  });

  it('refuses an id that would become a path, 13.802 times over', () => {
    const hostile = [
      { _id: '../../etc/passwd', keywords: [{ keyword: 'casa' }], downloads: 1 },
      { _id: 'ok', keywords: [{ keyword: 'casa' }], downloads: 1 },
    ];
    expect(readIndex(hostile).map((e) => e.id)).toEqual(['ok']);
  });

  it('drops an entry with no words rather than writing one nothing can find', () => {
    expect(readIndex([{ _id: 5, keywords: [], downloads: 1 }])).toEqual([]);
  });

  it('gives an entry with no download count last place, not no place', () => {
    const got = readIndex([{ _id: 7, keywords: [{ keyword: 'casa' }] }]);
    expect(got).toHaveLength(1);
    expect(got[0]!.popularity).toBe(0);
  });
});

describe('most-used first, and never twice (FR-2203, FR-2206, SC-2203)', () => {
  const index = readIndex([
    entry(1, 'raro', 3), entry(2, 'casa', 900), entry(3, 'perro', 400),
  ]);

  it('orders by the publisher own popularity, so it is useful before it is complete', () => {
    /*
     * SC-2202 wants the most-used two thousand inside a minute. By id, the first
     * thousand images are whatever ARASAAC drew in 2009 and «casa» arrives at minute
     * ten.
     */
    expect(planWholeSet(index, undefined).fetch.map((e) => e.id)).toEqual(['2', '3', '1']);
  });

  it('asks for nothing at all on a second pass', () => {
    const done = planWholeSet(index, new Set(['1', '2', '3']));
    expect(done.fetch).toEqual([]);
    expect(done.present).toBe(3);
    expect(done.total).toBe(3);
  });

  it('resumes with only what is missing', () => {
    const half = planWholeSet(index, new Set(['2']));
    expect(half.fetch.map((e) => e.id)).toEqual(['3', '1']);
    expect(half.present).toBe(1);
  });

  it('is stable across runs, so a resumed download does not re-plan differently', () => {
    const tied = readIndex([entry(10, 'a', 5), entry(2, 'b', 5), entry(30, 'c', 5)]);
    const once = planWholeSet(tied, undefined).fetch.map((e) => e.id);
    const twice = planWholeSet(tied, undefined).fetch.map((e) => e.id);
    expect(once).toEqual(twice);
  });

  it('records the publisher high-water mark for the update check', () => {
    const dated = readIndex([
      entry(1, 'a', 1, '2024-01-01'), entry(2, 'b', 1, '2026-08-30'),
    ]);
    expect(planWholeSet(dated, undefined).highWater).toBe('2026-08-30');
  });
});

describe('asked once, and told only when it matters (FR-2209…2213)', () => {
  const have = (over: Partial<SetInventory> = {}): SetInventory => ({
    publisher: 'arasaac', language: 'es', images: 100, total: 100,
    highWater: '2026-08-01', broughtOn: '2026-09-02', ...over,
  });

  it('says complete, which is what makes the screen silent', () => {
    // FR-2209 is a requirement about silence, so there has to be a value meaning it.
    expect(updateStatus(have())).toEqual({ state: 'complete' });
  });

  it('says how much is missing when a download was interrupted', () => {
    expect(updateStatus(have({ images: 60 }))).toEqual({ state: 'incomplete', missing: 40 });
  });

  it('offers an update only when the publisher actually has more', () => {
    expect(updateStatus(have(), { total: 100, highWater: '2026-08-01' }))
      .toEqual({ state: 'complete' });
    expect(updateStatus(have(), { total: 140, highWater: '2026-09-01' }))
      .toEqual({ state: 'update', added: 40, highWater: '2026-09-01' });
  });

  it('does not offer the same update again once she has declined it', () => {
    /*
     * «que no me lo vuelva a preguntar salvo que haya una actualización» — so a
     * declined offer stays declined until the index moves *further*, not until she
     * next opens the screen.
     */
    const declined = have({ declined: '2026-09-01' });
    expect(updateStatus(declined, { total: 140, highWater: '2026-09-01' }))
      .toEqual({ state: 'complete' });
    expect(updateStatus(declined, { total: 180, highWater: '2026-10-01' }))
      .toEqual({ state: 'update', added: 80, highWater: '2026-10-01' });
  });

  it('says nothing with no fresh index, so opening the screen costs no request', () => {
    // FR-2210: no check on launch, on a timer, or as a side effect.
    expect(updateStatus(have({ images: 100 }))).toEqual({ state: 'complete' });
    expect(updateStatus(null)).toEqual({ state: 'unknown' });
  });
});

describe('her vocabulary: chosen once, for everyone (FR-2214…2221)', () => {
  it('round-trips through the file she can read', () => {
    const v = choose(choose(emptyVocabulary(), 'es', 'Casa', '6964'), 'es', 'recreo', '2483');
    const back = parseVocabulary(renderVocabulary(v));
    expect(chosenFor(back, 'es', 'casa')).toBe('6964');
    expect(chosenFor(back, 'es', 'CASA')).toBe('6964');
    expect(chosenFor(back, 'es', 'recreo')).toBe('2483');
  });

  it('is per language (FR-2220)', () => {
    const v = choose(choose(emptyVocabulary(), 'es', 'casa', '1'), 'en', 'casa', '2');
    expect(chosenFor(v, 'es', 'casa')).toBe('1');
    expect(chosenFor(v, 'en', 'casa')).toBe('2');
    expect(chosenFor(v, 'ca', 'casa')).toBeUndefined();
  });

  it('can be changed and forgotten', () => {
    let v = choose(emptyVocabulary(), 'es', 'casa', '1');
    v = choose(v, 'es', 'casa', '2');
    expect(chosenFor(v, 'es', 'casa')).toBe('2');
    v = unchoose(v, 'es', 'casa');
    expect(chosenFor(v, 'es', 'casa')).toBeUndefined();
  });

  it('refuses an id that is not an id', () => {
    const v = choose(emptyVocabulary(), 'es', 'casa', '../../etc/passwd');
    expect(chosenFor(v, 'es', 'casa')).toBeUndefined();
  });

  it('survives a line she broke by hand, and keeps the rest', () => {
    const raw = ['---', 'words:', '  es:', '    "casa": "6964"', '    "roto": "no-soy-un-id/x"',
      '  zz-no-idioma:', '    "x": "1"', '---', ''].join('\n');
    const v = parseVocabulary(raw);
    expect(chosenFor(v, 'es', 'casa')).toBe('6964');
    expect(chosenFor(v, 'es', 'roto')).toBeUndefined();
    expect(v.byLanguage.has('zz-no-idioma')).toBe(false);
  });

  it('tells her, in the file itself, what may not go in it (FR-2221)', () => {
    // It travels in a handover, and it travels because it says nothing about anybody.
    const text = renderVocabulary(choose(emptyVocabulary(), 'es', 'casa', '1'));
    expect(text).toMatch(/No pongas aquí nada de un alumno/);
    expect(text).toMatch(/una vez/);
  });
});

describe('the four rungs, and the one that still refuses (FR-2215, FR-2216)', () => {
  const set = {
    root: '/x',
    byLanguage: new Map([['es', new Map([
      ['casa', ['1', '2', '3']],      // ambiguous
      ['perro', ['9']],               // the set is sure
      ['maria', ['7']],               // a name the set happens to have
    ])]]),
    images: new Set(['1', '2', '3', '7', '9']), from: new Map(), popularity: new Map(),
  };
  const chosen = forLanguage(choose(emptyVocabulary(), 'es', 'casa', '2'), 'es');

  it('1 · a name is never matched, whatever anybody chose', () => {
    const names = nameWords(['María']);
    expect(matchWord('María', set, {
      language: 'es', names, chosen, overrides: { 'María': '7' },
    }).kind).toBe('name');
  });

  it('2 · this learner override beats her vocabulary', () => {
    const m = matchWord('casa', set, { language: 'es', chosen, overrides: { casa: '3' } });
    expect(m).toMatchObject({ kind: 'matched', id: '3', source: 'override' });
  });

  it('3 · her vocabulary beats the set, and is recorded as its own source', () => {
    const m = matchWord('casa', set, { language: 'es', chosen });
    // `source: 'vocabulary'` and not folded into `override`: a wrong pictogram has to
    // trace back to which decision made it (Principle VI).
    expect(m).toMatchObject({ kind: 'matched', id: '2', source: 'vocabulary' });
  });

  it('4 · the set decides when it is sure', () => {
    expect(matchWord('perro', set, { language: 'es', chosen }))
      .toMatchObject({ kind: 'matched', id: '9', source: 'set' });
  });

  it('5 · and an unchosen ambiguous word STILL gets nothing', () => {
    /*
     * The rule `024` must not break. `018` FR-1609: the child reads the picture, she
     * reads the text, and a wrong pictogram is worse than none. The chooser adds a way
     * to answer the question — it does not answer it for her, and popularity does not
     * either.
     */
    const m = matchWord('casa', set, { language: 'es' });
    expect(m).toEqual({ kind: 'ambiguous', word: 'casa', candidates: ['1', '2', '3'] });
  });

  it('and her choice for one word does not decide another', () => {
    expect(matchWord('casa', set, {
      language: 'es', chosen: forLanguage(choose(emptyVocabulary(), 'es', 'otra', '1'), 'es'),
    }).kind).toBe('ambiguous');
  });
});

/**
 * «Te faltan 2» for ever (from a review, 2026-09-02).
 *
 * ARASAAC's index lists two ids its CDN does not serve. `updateStatus` compared `images`
 * against `total`, so a **complete** run left the screen saying «Te faltan 2. Sigo por
 * donde iba» with a «Seguir bajándolos» button, permanently, re-requesting two dead ids
 * on every press — on the screen whose requirement (FR-2209) is to ask her for nothing
 * once she is done.
 *
 * The number that should have given it away was in `024`'s own success criterion:
 * «13.800 of 13.802».
 */
describe('a complete set stops asking, even when the publisher lists dead ids', () => {
  const have = (over: Partial<SetInventory> = {}): SetInventory => ({
    publisher: 'arasaac', language: 'es', images: 13_800, total: 13_802,
    highWater: '2026-08-01', broughtOn: '2026-09-02', ...over,
  });

  it('counts what the publisher does not have as accounted for', () => {
    expect(updateStatus(have({ accountedFor: 13_802 }))).toEqual({ state: 'complete' });
  });

  it('still says incomplete when images are genuinely missing', () => {
    expect(updateStatus(have({ images: 9_000, accountedFor: 9_002 })))
      .toEqual({ state: 'incomplete', missing: 4_800 });
  });

  it('falls back to `images` for an inventory written before this existed', () => {
    // Which is the old behaviour: one more «incomplete» until she presses again.
    expect(updateStatus(have())).toEqual({ state: 'incomplete', missing: 2 });
  });
});
