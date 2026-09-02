import { describe, it, expect } from 'vitest';
import { readSet } from '../src/pictograms/set.js';
import {
  nameWords, matchWord, reportSkipped, skippedWords,
} from '../src/pictograms/match.js';
import { choose, emptyVocabulary, forLanguage } from '../src/pictograms/vocabulary.js';
import { readCandidates, mergeSet, fetchGate } from '../src/pictograms/fetch.js';
import { parsePictogramFetchCorpus, urlFor } from '../src/pictograms/publisher.js';
import { readFileSync } from 'node:fs';

/**
 * Fetching pictograms (023 T004/T008).
 *
 * The two assertions that matter most are about what does **not** happen: no name
 * leaves, and `018`'s reader is unchanged. Both are written against the real reader
 * and the real corpus rather than a fixture of what they ought to say.
 */

const CORPUS = readFileSync(
  new URL('../../../../instructions/pictograms.md', import.meta.url), 'utf8');

/** A folder in memory, in `018`'s shape. */
const folder = (files: Record<string, string>) => ({
  list: async () => Object.keys(files),
  readText: async (path: string) => files[path.replace(/^.*\//, '')] ?? null,
});

describe('a name never gets a pictogram, accents and all (018 FR-1610)', () => {
  /*
   * The defect this closes, found on 2026-09-02 while writing `023`'s word list.
   *
   * `jobs/adapt.ts` built the name set as `.map((n) => n.toLowerCase())`. `matchWord`
   * looks up `normalise(word)`, which folds accents — so «María» was asked about as
   * `maria` while the set held `maría`, and the check missed. It also held whole names
   * where the lookup asks one word at a time. Both misses put a pictogram beside a
   * child's name.
   */
  it('folds accents, so «María» is found by the lookup that folds them', () => {
    const words = nameWords(['María Nebrera']);
    expect(words.has('maria')).toBe(true);
    expect(words.has('nebrera')).toBe(true);
    // What the broken version produced, and what the lookup never asks for:
    expect(words.has('maría nebrera')).toBe(false);
  });

  it('is what matchWord actually consults', () => {
    const set = {
      root: '/x',
      byLanguage: new Map([['es', new Map([['maria', ['1']], ['casa', ['2']]])]]),
      images: new Set(['1', '2']),
    };
    const names = nameWords(['María Nebrera']);
    expect(matchWord('María', set, { language: 'es', names }).kind).toBe('name');
    expect(matchWord('Nebrera', set, { language: 'es', names }).kind).toBe('name');
    expect(matchWord('casa', set, { language: 'es', names }).kind).toBe('matched');
  });

  it('keeps particles out, or «la» would strip a word from every sentence', () => {
    expect([...nameWords(['José de la Cruz'])].sort()).toEqual(['cruz', 'jose']);
  });

  it('is consulted before her vocabulary, so a choice cannot resurrect a name', () => {
    /*
     * The name check is step 1 and her vocabulary is step 3. If she somehow recorded a
     * choice for a word that is also a learner's name, the name still wins — a
     * pictogram beside a child's own name is not something either of them asked for.
     */
    const set = {
      root: '/x',
      byLanguage: new Map([['es', new Map([['maria', ['7']]])]]),
      images: new Set(['7']),
    };
    const chosen = forLanguage(choose(emptyVocabulary(), 'es', 'maria', '7'), 'es');
    expect(matchWord('María', set, {
      language: 'es', names: nameWords(['María']), chosen,
    }).kind).toBe('name');
  });
});

describe('what the publisher returns is content, not instruction (Principle IX)', () => {
  it('refuses an id that would become a path or a URL', () => {
    const hostile = [
      { _id: '../../etc/passwd', keywords: [{ keyword: 'casa' }] },
      { _id: 'a/b', keywords: [{ keyword: 'casa' }] },
      { _id: 'http://evil.test/x', keywords: [{ keyword: 'casa' }] },
      { _id: 'ok-1', keywords: [{ keyword: 'casa' }] },
    ];
    expect(readCandidates(hostile, 'casa').map((c) => c.id)).toEqual(['ok-1']);
  });

  it('keeps every candidate, so an ambiguous word stays an omission (FR-2113)', () => {
    const json = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
    const got = readCandidates(json, 'rana');
    expect(got).toHaveLength(3);
    // Not «the first one wins»: 018 FR-1609 needs all three to omit and report.
    expect(got.every((c) => c.keywords.includes('rana'))).toBe(true);
  });

  it('yields nothing for a response it does not recognise, rather than guessing', () => {
    expect(readCandidates({ error: 'nope' }, 'casa')).toEqual([]);
    expect(readCandidates(null, 'casa')).toEqual([]);
    expect(readCandidates(['casa'], 'casa')).toEqual([]);
  });

  it("always keeps the searched word, so a fetch cannot report success and add nothing", () => {
    const json = [{ _id: 7, keywords: [{ notAKeyword: 'x' }] }];
    expect(readCandidates(json, 'casa')[0]!.keywords).toEqual(['casa']);
  });
});

describe("the downloader writes the format 018's reader already reads (FR-2102, SC-2102)", () => {
  it('produces metadata that readSet reads with no problems', async () => {
    const merged = mergeSet([], readCandidates(
      [{ _id: 6964, keywords: [{ keyword: 'casa' }, { keyword: 'vivienda' }] }], 'casa'));

    const reading = await readSet('/set', folder({
      'pictograms.es.json': JSON.stringify(merged),
      '6964.png': 'x',
    }));

    expect(reading.problems).toEqual([]);
    expect(reading.set!.byLanguage.get('es')!.get('casa')).toEqual(['6964']);
    expect(reading.set!.byLanguage.get('es')!.get('vivienda')).toEqual(['6964']);
    expect(reading.set!.images.has('6964')).toBe(true);
  });

  it('is idempotent, so a resumed fetch cannot duplicate an entry (FR-2115)', () => {
    const c = readCandidates([{ _id: 1, keywords: [{ keyword: 'casa' }] }], 'casa');
    const once = mergeSet([], c);
    const twice = mergeSet(once, c);
    const thrice = mergeSet(twice, c);
    expect(twice).toEqual(once);
    expect(thrice).toEqual(once);
  });

  it('keeps words a hand-assembled set knew and this publisher does not', () => {
    const mine = [{ id: '1', keywords: ['recreo', 'patio'] }];
    const merged = mergeSet(mine, readCandidates([{ _id: 1 }], 'casa'));
    expect(merged[0]!.keywords).toEqual(['casa', 'patio', 'recreo']);
  });

  it('leaves an interrupted fetch readable (SC-2105, FR-2118)', async () => {
    // Half the words fetched, the write already flushed: still a valid set.
    const half = mergeSet([], readCandidates([{ _id: 1 }], 'casa'));
    const reading = await readSet('/set', folder({
      'pictograms.es.json': JSON.stringify(half), '1.png': 'x',
    }));
    expect(reading.set).not.toBeNull();
    expect(reading.problems).toEqual([]);
  });
});

describe('the chooser is offered the words the report skipped (024 T019)', () => {
  it('round-trips reportSkipped own sentence', () => {
    /*
     * These two functions live next to each other for this reason: the renderer needs
     * the words out of a sentence another package wrote, and a regular expression over
     * prose works until somebody improves the wording. Then the chooser silently offers
     * nothing and no test fails — the twelve-unread-fields failure, with a string
     * instead of a field.
     */
    const matches = [
      { kind: 'ambiguous' as const, word: 'Casa', candidates: ['1', '2'] },
      { kind: 'ambiguous' as const, word: 'rana', candidates: ['3', '4', '5'] },
      { kind: 'none' as const, word: 'inexistente' },
      { kind: 'matched' as const, word: 'perro', id: '9', source: 'set' as const },
    ];
    expect(skippedWords(reportSkipped(matches))).toEqual(['casa', 'rana']);
  });

  it('ignores every other line in the report', () => {
    expect(skippedWords([
      'Necesita que lo decidas tú: algo',
      'No he tocado el enunciado.',
      '',
    ])).toEqual([]);
  });
});

describe('nothing is fetched before she accepts (FR-2104, SC-2103)', () => {
  const ids = ['arasaac'];

  it('refuses when she has accepted nothing, and says which licence is waiting', () => {
    /*
     * Found by `e2e/pictograms.spec.ts`: this used to answer `no-publisher` on a fresh
     * install, so she was told «no tengo de dónde traerlos» — false, and it sent her
     * looking for a folder when the answer was a button two lines above.
     */
    expect(fetchGate(ids, null))
      .toEqual({ may: false, because: 'not-accepted', publisher: 'arasaac' });
    expect(fetchGate(ids, null, 'arasaac'))
      .toEqual({ may: false, because: 'not-accepted', publisher: 'arasaac' });
  });

  it('will not guess which publisher when there are several', () => {
    // «Which?» is a real question, and guessing records an acceptance for a licence
    // she did not read.
    expect(fetchGate(['a', 'b'], null)).toEqual({ may: false, because: 'no-publisher' });
  });

  it('allows it once she has, for that publisher', () => {
    expect(fetchGate(ids, { publisher: 'arasaac' }))
      .toEqual({ may: true, publisherId: 'arasaac' });
  });

  it("does not let one publisher's acceptance cover another", () => {
    /*
     * Accepting ARASAAC's licence is not accepting somebody else's. Without this, a
     * corpus edit adding a second publisher would silently extend an agreement she
     * made about one specific licence.
     */
    expect(fetchGate(['arasaac', 'otro'], { publisher: 'arasaac' }, 'otro'))
      .toEqual({ may: false, because: 'not-accepted', publisher: 'otro' });
  });

  it('refuses a publisher the corpus does not define, even if she accepted it', () => {
    // A publisher removed from the corpus, with her acceptance still on disk.
    expect(fetchGate([], { publisher: 'arasaac' }))
      .toEqual({ may: false, because: 'no-publisher' });
  });
});

describe('the publisher is corpus data, not code (FR-2116, 018 FR-1604)', () => {
  const corpus = parsePictogramFetchCorpus(CORPUS);

  it('reads ARASAAC from instructions/pictograms.md', () => {
    const arasaac = corpus.publishers.find((p) => p.id === 'arasaac');
    expect(arasaac, 'the corpus must define arasaac').toBeDefined();
    expect(arasaac!.attribution.author).toBe('Sergio Palao');
    expect(arasaac!.attribution.owner).toBe('Gobierno de Aragón');
    expect(arasaac!.licence).toMatch(/BY-NC-SA/);
    expect(arasaac!.languages).toContain('es');
    expect(corpus.imageSize).toBeGreaterThan(0);
  });

  it('names no URL in code', () => {
    const src = readFileSync(
      new URL('../src/pictograms/publisher.ts', import.meta.url), 'utf8')
      + readFileSync(new URL('../src/pictograms/fetch.ts', import.meta.url), 'utf8');
    /*
     * 018 FR-1604 requires the set to be replaceable, and a URL compiled into core is
     * the quiet version of the dependency it forbids: it would work, and the assumption
     * would only surface the day somebody had a different set.
     *
     * **This used to `.replace(/https:\/\/arasaac\.org/g, '')` first** — it deleted the
     * one URL it was looking for before looking. A review proved it by adding
     * `const FALLBACK_INDEX = 'https://arasaac.org/…'` to `fetch.ts`; the test passed.
     * The whitelist had no legitimate purpose: `arasaac.org` appears in neither file.
     *
     * `x.test` is still allowed because these files' comments quote example templates.
     */
    const urls = [...src.matchAll(/https?:\/\/[\w.-]+/g)].map((m) => m[0])
      .filter((u) => !u.includes('x.test'));
    expect(urls, 'no endpoint in core').toEqual([]);
  });

  it('refuses a publisher missing the attribution its licence requires', () => {
    const bad = ['---', 'publishers:', '  - id: x', '    label: X',
      '    image: "https://x.test/{id}"',
      '    site: "https://x.test"', '    licence: CC BY', '    licence_url: "https://x.test/l"',
      '    languages: [es]', '---', ''].join('\n');
    // It would fetch, the sheets would render, and the credit would be blank.
    expect(parsePictogramFetchCorpus(bad, 'test').publishers).toEqual([]);
  });

  it('refuses a template that cannot carry an id or a language', () => {
    const mk = (index: string, image: string) => ['---', 'publishers:',
      '  - id: x', '    label: X', `    index: "${index}"`, `    image: "${image}"`,
      '    site: "https://x.test"', '    licence: L', '    licence_url: "https://x.test/l"',
      '    languages: [es]', '    attribution:', '      author: A', '      owner: O',
      '      source: S', '---', ''].join('\n');
    // An image template with no `{id}` would fetch the same picture 13.802 times.
    expect(parsePictogramFetchCorpus(
      mk('https://x.test/all/{lang}', 'https://x.test/img'), 't').publishers).toEqual([]);
    // An index with no `{lang}` cannot ask for her language.
    expect(parsePictogramFetchCorpus(
      mk('https://x.test/all', 'https://x.test/{id}'), 't').publishers).toEqual([]);
    // And the shape that works, so this test cannot pass by refusing everything.
    expect(parsePictogramFetchCorpus(
      mk('https://x.test/all/{lang}', 'https://x.test/{id}'), 't').publishers)
      .toHaveLength(1);
  });

  it('fails closed when the corpus has no publishers at all', () => {
    // Nowhere to fetch from is a visible, harmless failure. A built-in URL would
    // reintroduce the compiled-in assumption.
    expect(parsePictogramFetchCorpus('---\nid: x\n---\n', 't').publishers).toEqual([]);
  });
});
