import { describe, it, expect } from 'vitest';
import { parseIR } from '../src/ir/parse.js';
import { readSet } from '../src/pictograms/set.js';
import { nameWords, matchWord } from '../src/pictograms/match.js';
import { wordListFrom, wordListOf } from '../src/pictograms/wordlist.js';
import {
  planFetch, readCandidates, mergeSet, describeOutcome, fetchGate,
} from '../src/pictograms/fetch.js';
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

describe('nothing about a child leaves her machine (FR-2108, FR-2109, SC-2104)', () => {
  const names = new Set(['lucia', 'iker', 'nebrera']);

  it('builds a word list from material without the names in it', () => {
    const doc = parseIR([
      '---', 'lang: es', '---', '',
      '::: {#b1 .instruction}',
      'Lucía tiene que leer sobre la casa y el perro de Iker.', ':::', '',
      '::: {#b2 .explanation}',
      'Colegio Nebrera, curso 3.º. El gato bebe agua.', ':::',
    ].join('\n'));

    const list = wordListFrom(doc, { language: 'es', names });

    expect(list.words).toContain('casa');
    expect(list.words).toContain('perro');
    expect(list.words).toContain('gato');
    for (const forbidden of ['lucia', 'lucía', 'iker', 'nebrera']) {
      expect(list.words, `«${forbidden}» must never be sent`).not.toContain(forbidden);
    }
    expect(list.namesRemoved).toBe(3);
  });

  it('reports how many names it dropped and never which ones', () => {
    const list = wordListOf(['Lucía', 'casa'], { language: 'es', names });
    // A count, not the names: a return value carrying them is a return value
    // somebody logs.
    expect(list.namesRemoved).toBe(1);
    expect(JSON.stringify(list)).not.toMatch(/luc/i);
  });

  it('sends nothing that is not a plain word', () => {
    const list = wordListOf(
      ['casa', '../../etc/passwd', 'http://x.test/a', '3.º', 'K42', '', 'a'.repeat(60)],
      { language: 'es' });
    /*
     * Only «casa». A path, a URL, «3.º», the learner code «K42» and a 60-character
     * token are all rejected before a name check even runs — a publisher's search
     * endpoint has no business receiving any of them, and `K42` is the one that
     * would have been a leak.
     */
    expect(list.words).toEqual(['casa']);
  });

  it('encodes every substitution, so a word cannot steer a request', () => {
    const url = urlFor('https://x.test/{lang}/search/{word}', {
      lang: 'es', word: 'a/../b?q=1', id: undefined,
    });
    expect(url).toBe('https://x.test/es/search/a%2F..%2Fb%3Fq%3D1');
  });
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

  it('is what the word list uses too, so a name cannot leave either', () => {
    const list = wordListOf(['María', 'casa'], {
      language: 'es', names: nameWords(['María Nebrera']),
    });
    expect(list.words).toEqual(['casa']);
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

describe('only what she asked for, and the bound is spoken (FR-2111, FR-2112, FR-2117)', () => {
  const list = (words: string[]) => ({ words, language: 'es', namesRemoved: 0 });

  it('does not ask again for a word that already has a usable pictogram', () => {
    const plan = planFetch(
      list(['casa', 'perro']),
      new Map([['casa', ['1']]]), new Set(['1']),
      { wordsPerFetch: 100 });
    expect(plan.present).toEqual(['casa']);
    expect(plan.fetch).toEqual(['perro']);
  });

  it('re-fetches a word whose only pictogram has no image', () => {
    // 018 FR-1616 renders that as a named gap; fetching is how the gap closes.
    const plan = planFetch(
      list(['casa']), new Map([['casa', ['1']]]), new Set(),
      { wordsPerFetch: 100 });
    expect(plan.fetch).toEqual(['casa']);
  });

  it('reports what the bound cut instead of applying it silently', () => {
    const plan = planFetch(
      list(['a', 'b', 'c', 'd']), undefined, undefined, { wordsPerFetch: 2 });
    expect(plan.fetch).toEqual(['a', 'b']);
    expect(plan.cut).toEqual(['c', 'd']);
    expect(describeOutcome({
      found: ['a', 'b'], missing: [], present: [], cut: plan.cut, failed: [],
      images: 2, namesRemoved: 0, ambiguous: [],
    }, 'ARASAAC').join(' ')).toMatch(/faltan 2/);
  });

  it('never fetches the whole catalogue', () => {
    // No path through planFetch returns words nobody asked for.
    const plan = planFetch(list([]), undefined, undefined, { wordsPerFetch: 300 });
    expect(plan.fetch).toEqual([]);
  });
});

describe('an ambiguous word is said out loud, or the button lies (018 FR-1609)', () => {
  /*
   * The first real fetch against ARASAAC returned 26 pictograms for three words. Every
   * candidate is kept on purpose (FR-2113) and `018` FR-1609 then omits the word — so
   * without this line «he traído 3 palabras» would be true, and the sheet would come
   * out bare with nothing connecting the two.
   */
  it('explains the empty sheet before it happens', () => {
    const lines = describeOutcome({
      found: ['casa', 'perro'], missing: [], present: [], cut: [], failed: [],
      images: 18, namesRemoved: 0, ambiguous: ['casa', 'perro'],
    }, 'ARASAAC');
    const all = lines.join(' ');
    expect(all).toMatch(/varios dibujos/);
    expect(all).toMatch(/«casa»/);
    expect(all).toMatch(/peor que ninguno/);
  });

  it('says nothing about it when every word had exactly one', () => {
    const lines = describeOutcome({
      found: ['casa'], missing: [], present: [], cut: [], failed: [],
      images: 1, namesRemoved: 0, ambiguous: [],
    }, 'ARASAAC');
    expect(lines.join(' ')).not.toMatch(/varios/);
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
    expect(corpus.wordsPerFetch).toBeGreaterThan(0);
  });

  it('names no URL in code', () => {
    const src = readFileSync(
      new URL('../src/pictograms/publisher.ts', import.meta.url), 'utf8')
      + readFileSync(new URL('../src/pictograms/fetch.ts', import.meta.url), 'utf8');
    /*
     * 018 FR-1604 requires the set to be replaceable, and a URL compiled into core
     * is the quiet version of the dependency it forbids: it would work, and the
     * assumption would only surface the day somebody had a different set.
     */
    expect(src.replace(/https:\/\/arasaac\.org/g, ''), 'no endpoint in core')
      .not.toMatch(/https?:\/\/(?!x\.test)[a-z]/i);
  });

  it('refuses a publisher missing the attribution its licence requires', () => {
    const bad = ['---', 'publishers:', '  - id: x', '    label: X',
      '    search: "https://x.test/{lang}/{word}"', '    image: "https://x.test/{id}"',
      '    site: "https://x.test"', '    licence: CC BY', '    licence_url: "https://x.test/l"',
      '    languages: [es]', '---', ''].join('\n');
    // It would fetch, the sheets would render, and the credit would be blank.
    expect(parsePictogramFetchCorpus(bad, 'test').publishers).toEqual([]);
  });

  it('refuses a template that cannot carry a word or an id', () => {
    const mk = (search: string, image: string) => ['---', 'publishers:',
      '  - id: x', '    label: X', `    search: "${search}"`, `    image: "${image}"`,
      '    site: "https://x.test"', '    licence: L', '    licence_url: "https://x.test/l"',
      '    languages: [es]', '    attribution:', '      author: A', '      owner: O',
      '      source: S', '---', ''].join('\n');
    expect(parsePictogramFetchCorpus(mk('https://x.test/all', 'https://x.test/{id}'), 't')
      .publishers).toEqual([]);
    expect(parsePictogramFetchCorpus(
      mk('https://x.test/{lang}/{word}', 'https://x.test/img'), 't').publishers).toEqual([]);
  });

  it('fails closed when the corpus has no publishers at all', () => {
    // Nowhere to fetch from is a visible, harmless failure. A built-in URL would
    // reintroduce the compiled-in assumption.
    expect(parsePictogramFetchCorpus('---\nid: x\n---\n', 't').publishers).toEqual([]);
  });
});
