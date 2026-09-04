import { describe, it, expect } from 'vitest';
import {
  readSet, matchWord, reportSkipped, applyPictograms, parsePicto, normalise,
  parseIR, hasImage, mergeSet, mostUsedFirst, type SetReader, type PictogramSet,
} from '../src/index.js';

/**
 * Pictograms (018 T011, US3).
 *
 * **The one that matters is «the right pictogram, or none».** A wrong pictogram is
 * worse than no pictogram: the child reads the picture, she reads the text, and she
 * may never notice. So every case here that could resolve an ambiguity by picking a
 * winner asserts that it does not.
 *
 * The fixture is ours. We cannot bundle an ARASAAC sample (FR-1601), and the set
 * contract is documented rather than reverse-engineered — see
 * `specs/018-pictogramas/contracts/pictogram-set.md`.
 */
const FIXTURE: Record<string, string> = {
  '/set/pictograms.es.json': JSON.stringify([
    // The two optional fields, on the entries a fetch would have written (P40/P41).
    { id: '2483', keywords: ['rana', 'sapo'], from: 'arasaac', popularity: 900 },
    // Deliberate ambiguity: two pictures claim «rana».
    { id: '2484', keywords: ['rana'], from: 'arasaac', popularity: 12 },
    { id: '1001', keywords: ['casa'] },
    { id: '1002', keywords: ['árbol'] },
    { id: '9999', keywords: ['recreo'] },
    // An id whose image is missing on purpose (FR-1616).
    { id: '7777', keywords: ['tijeras'] },
    { id: '5000', keywords: ['Lucía'] },
  ]),
  '/set/pictograms.en.json': JSON.stringify([{ id: '3001', keywords: ['frog'] }]),
  '/set/LICENSE': 'CC BY-NC-SA 4.0 — Gobierno de Aragón · Sergio Palao',
};

const IMAGES = ['2483.png', '2484.png', '1001.png', '1002.png', '9999.png', '5000.png'];

const reader: SetReader = {
  list: async (dir) => (dir === '/set'
    ? [...IMAGES, 'pictograms.es.json', 'pictograms.en.json', 'LICENSE'] : []),
  readText: async (path) => FIXTURE[path] ?? null,
};

const loaded = async (): Promise<PictogramSet> => {
  const { set } = await readSet('/set', reader);
  if (!set) throw new Error('the fixture set should load');
  return set;
};

describe('reading a set she brought', () => {
  it('maps keyword → ids, plural, because that is where the ambiguity lives', async () => {
    const set = await loaded();
    expect(set.byLanguage.get('es')?.get('rana')).toEqual(['2483', '2484']);
    expect(set.byLanguage.get('es')?.get('sapo')).toEqual(['2483']);
  });

  /**
   * The two fields a fetch records, and the reader's tolerance for their absence
   * (review COD-08/COD-09, decisions P40 and P41).
   *
   * `PictogramEntry` was `{ id, keywords }` and nothing else: `mergeSet` kept no
   * publisher — so a set built from two sources was attributed to one of them, and
   * the render printed a **false** credit — and it threw popularity away, so «los
   * candidatos, del más usado al menos» could not be true however many tasks said
   * it was.
   */
  it('reads where each pictogram came from, and how used it is', async () => {
    const set = await loaded();
    expect(set.from.get('2483')).toBe('arasaac');
    expect(set.popularity.get('2483')).toBe(900);
    expect(set.popularity.get('2484')).toBe(12);
  });

  it('tolerates their absence, which is every hand-built set', async () => {
    // `018` FR-2102's «no change to the contract»: an entry without them is valid,
    // and «I do not know where this came from» is answered honestly rather than
    // guessed at.
    const set = await loaded();
    expect(set.from.has('1001')).toBe(false);
    expect(set.popularity.has('1001')).toBe(false);
    expect(set.byLanguage.get('es')?.get('casa')).toEqual(['1001']);
  });

  it('reads each language separately', async () => {
    const set = await loaded();
    expect(set.byLanguage.get('en')?.get('frog')).toEqual(['3001']);
    expect(set.byLanguage.get('en')?.get('rana')).toBeUndefined();
  });

  it('says what it found, in her words', async () => {
    const { summary } = await readSet('/set', reader);
    expect(summary).toContain('imágenes');
    expect(summary).toContain('español');
  });

  it('shows her the licence file when the set carries one', async () => {
    const set = await loaded();
    expect(set.licence).toContain('CC BY-NC-SA');
  });

  it('knows which ids have an image and which do not', async () => {
    const set = await loaded();
    expect(hasImage(set, '2483')).toBe(true);
    expect(hasImage(set, '7777')).toBe(false);
  });
});

describe('a set that cannot be used says which problem it is', () => {
  /** **Filenames are not metadata.** Guessing «rana.png» is the whole failure. */
  it('refuses a directory of images with no word list', async () => {
    const onlyImages: SetReader = {
      list: async () => ['rana.png', 'casa.png'],
      readText: async () => null,
    };
    const { set, problems } = await readSet('/set', onlyImages);

    expect(set).toBeNull();
    expect(problems[0]!.kind).toBe('no-metadata');
    expect(problems[0]!.message).toContain('adivinar');
  });

  it('names an unreadable file and loads the rest of the set', async () => {
    const broken: SetReader = {
      list: async () => ['pictograms.es.json', 'pictograms.en.json', '3001.png'],
      readText: async (p) => (p.endsWith('es.json') ? '{ no es json' : FIXTURE['/set/pictograms.en.json']!),
    };
    const { set, problems } = await readSet('/set', broken);

    expect(problems.some((p) => p.kind === 'unreadable-metadata')).toBe(true);
    // The English half still works: one malformed file must not take the others
    // down, or she has no pictograms and no idea which file to fix.
    expect(set?.byLanguage.get('en')?.get('frog')).toEqual(['3001']);
  });

  it('reports a word list with no images', async () => {
    const noImages: SetReader = {
      list: async () => ['pictograms.es.json'],
      readText: async (p) => FIXTURE[p] ?? null,
    };
    const { problems } = await readSet('/set', noImages);
    expect(problems.some((p) => p.kind === 'no-images')).toBe(true);
  });
});

describe('the right pictogram, or none', () => {
  const opts = { language: 'es' };

  it('uses an unambiguous match', async () => {
    const m = matchWord('casa', await loaded(), opts);
    expect(m).toEqual({ kind: 'matched', word: 'casa', id: '1001', source: 'set' });
  });

  it('folds accents and case', async () => {
    const set = await loaded();
    expect(matchWord('Árbol', set, opts).kind).toBe('matched');
    expect(matchWord('arbol', set, opts).kind).toBe('matched');
    expect(normalise('  Ráná  ')).toBe('rana');
  });

  /**
   * The smallest morphology that is safe (review AGE-05, decision P20).
   *
   * This test used to assert the opposite — «no plural rule, no stemming: «casas» is
   * a word the set does not have» — and the design it recorded was explicit. What
   * the review found is that the cost is not low coverage but **inconsistent**
   * coverage: «rana» matched and «ranas» did not, so the same word carried a drawing
   * in one sentence and not in the next, which for a learner reading by pictogram is
   * worse than a consistent absence, because the absence reads as a difference in
   * meaning.
   *
   * And the `instructions` scope — «sólo en lo que hay que hacer», the one that
   * exists so he can understand *what is being asked* — was the worst served of the
   * three: an instruction is an imperative («rodea») and a keyword is an infinitive.
   */
  it('finds the singular of a plural it was given', async () => {
    const set = await loaded();
    const m = matchWord('casas', set, opts);
    expect(m.kind).toBe('matched');
    if (m.kind !== 'matched') throw new Error('unreachable');
    expect(m.id).toBe('1001');
  });

  it('tries the lemma only where the literal word found nothing', async () => {
    /*
     * The whole safety argument. «Casa» is in the set, so it never reaches the
     * stemmer and cannot become «casar» — a real word is never displaced by the
     * stem of a different one.
     */
    const set = await loaded();
    expect(matchWord('casa', set, opts)).toEqual(
      { kind: 'matched', word: 'casa', id: '1001', source: 'set' });
  });

  it('keeps «exactly one, or nothing» through the lemma', async () => {
    // «Ranas» stems to «rana», which two pictures claim: an omission plus a report
    // line, exactly as the literal word gets (FR-1609). Not a vaguer guess.
    const m = matchWord('ranas', await loaded(), opts);
    expect(m.kind).toBe('ambiguous');
    if (m.kind !== 'ambiguous') throw new Error('unreachable');
    expect(m.candidates).toEqual(['2483', '2484']);
  });

  it('never puts a picture on a function word', async () => {
    /*
     * «Para» stems to «parar», and a stop sign on the preposition *para* is exactly
     * the wrong-pictogram failure this module is built around. Refused outright
     * rather than relied on to match nothing — and a pictogram on «de» helps nobody
     * anyway.
     */
    const set = await loaded();
    for (const word of ['para', 'de', 'con', 'que', 'como', 'sobre']) {
      expect(matchWord(word, set, opts).kind, word).toBe('none');
    }
  });

  it('refuses a function word even when her override names it', async () => {
    // Her override is a map from a word to a picture, and a closed-class word is
    // not a word anybody meant to map — so the check runs before it.
    const m = matchWord('para', await loaded(), { ...opts, overrides: { para: '9999' } });
    expect(m.kind).toBe('none');
  });

  /** **The case the feature turns on.** */
  it('puts nothing when two pictures claim the word, and reports the candidates', async () => {
    const m = matchWord('rana', await loaded(), opts);

    expect(m.kind).toBe('ambiguous');
    if (m.kind !== 'ambiguous') throw new Error('expected ambiguous');
    expect(m.candidates).toEqual(['2483', '2484']);

    const said = reportSkipped([m]);
    expect(said[0]).toContain('«rana»');
    expect(said[0]).toContain('elige tú');
  });

  it('reports only the ambiguous ones, never the ordinary misses', async () => {
    const set = await loaded();
    const matches = ['rana', 'bicicleta', 'ordenador'].map((w) => matchWord(w, set, opts));
    // Two of the three found nothing, and most words in most sentences do.
    expect(reportSkipped(matches)).toHaveLength(1);
  });

  it('never matches a name, even one the set has a keyword for', async () => {
    // The fixture deliberately contains a pictogram for «Lucía».
    const m = matchWord('Lucía', await loaded(), { ...opts, names: new Set(['lucia']) });
    expect(m.kind).toBe('name');
  });

  it('lets her override win over the set', async () => {
    const m = matchWord('recreo', await loaded(),
      { ...opts, overrides: { recreo: 'mi-patio-1' } });
    expect(m).toEqual({ kind: 'matched', word: 'recreo', id: 'mi-patio-1', source: 'override' });
  });

  it('checks the name before the override, so a name cannot be overridden into one', async () => {
    const m = matchWord('Lucía', await loaded(),
      { ...opts, names: new Set(['lucia']), overrides: { 'Lucía': '5000' } });
    expect(m.kind).toBe('name');
  });

  it('finds nothing when the set is in another language', async () => {
    expect(matchWord('casa', await loaded(), { language: 'en' }).kind).toBe('none');
  });
});

describe('inserting them into the document', () => {
  const doc = () => parseIR([
    '---', 'lang: es', '---', '',
    '::: {#b1 .instruction}', 'Rodea la casa con un círculo.', ':::', '',
    '::: {#b2 .explanation}', 'El árbol da sombra a la casa.', ':::', '',
    '::: {#b3 .report-notes}', 'Una casa cualquiera.', ':::',
  ].join('\n'));

  it('records which id for which word, so a wrong one is traceable', async () => {
    const { doc: out, used } = applyPictograms(doc(), await loaded(),
      { language: 'es', scope: 'all' });

    expect(used.map((u) => `${u.word}:${u.id}`)).toContain('casa:1001');
    const b1 = out.blocks.find((b) => b.id === 'b1');
    expect(parsePicto(b1?.attrs['data-picto'])).toEqual([{ word: 'casa', id: '1001' }]);
  });

  it('never touches the report notes, which she reads and he does not', async () => {
    const { doc: out } = applyPictograms(doc(), await loaded(),
      { language: 'es', scope: 'all' });
    expect(out.blocks.find((b) => b.id === 'b3')?.attrs['data-picto']).toBeUndefined();
  });

  it('honours «sólo en lo que hay que hacer»', async () => {
    const { doc: out } = applyPictograms(doc(), await loaded(),
      { language: 'es', scope: 'instructions' });

    expect(out.blocks.find((b) => b.id === 'b1')?.attrs['data-picto']).toBeDefined();
    expect(out.blocks.find((b) => b.id === 'b2')?.attrs['data-picto']).toBeUndefined();
  });

  it('honours «sólo el vocabulario clave», which she names', async () => {
    const { doc: out, used } = applyPictograms(doc(), await loaded(),
      { language: 'es', scope: 'vocabulary', vocabulary: ['árbol'] });

    expect(used.map((u) => u.word)).toEqual(['árbol']);
    expect(out.blocks.find((b) => b.id === 'b1')?.attrs['data-picto']).toBeUndefined();
  });
});

describe('the exam rule', () => {
  /**
   * A pictogram beside «rana» in a vocabulary test **supplies the answer**. That is
   * not changing the presentation, it is changing what is asked — Principle III,
   * and `012` FR-1006 lets presentation move in an assessment and nothing else.
   */
  const vocabTest = () => parseIR([
    '---', 'lang: es', 'kind: exam', '---', '',
    '::: {#q1 .assessment}', '1. ¿Qué significa «casa»?', ':::', '',
    '::: {#q2 .assessment}', '2. Escribe una frase con la palabra casa.', ':::',
  ].join('\n'));

  it('puts nothing on a question about the word itself', async () => {
    const { doc: out } = applyPictograms(vocabTest(), await loaded(),
      { language: 'es', scope: 'all', isExam: true });

    expect(out.blocks.find((b) => b.id === 'q1')?.attrs['data-picto']).toBeUndefined();
  });

  it('still helps on a question that is not about the word', async () => {
    const { doc: out } = applyPictograms(vocabTest(), await loaded(),
      { language: 'es', scope: 'all', isExam: true });

    expect(out.blocks.find((b) => b.id === 'q2')?.attrs['data-picto']).toBeDefined();
  });

  it('applies per block, so one assessment block does not disarm a worksheet', async () => {
    const mixed = parseIR([
      '---', 'lang: es', 'kind: worksheet', '---', '',
      '::: {#b1 .instruction}', 'Rodea la casa.', ':::', '',
      '::: {#q1 .assessment}', '¿Qué es una casa?', ':::',
    ].join('\n'));

    const { doc: out } = applyPictograms(mixed, await loaded(), { language: 'es', scope: 'all' });
    expect(out.blocks.find((b) => b.id === 'b1')?.attrs['data-picto']).toBeDefined();
    expect(out.blocks.find((b) => b.id === 'q1')?.attrs['data-picto']).toBeUndefined();
  });
});

/**
 * Popularity survives the merge, so «most-used first» can be true
 * (review COD-09, decision P41).
 *
 * `024` FR-2217 and US2 both say the candidates are shown «largest-used first», and
 * T017 was ticked as «popularity-ordered». But `popularity` lived only in
 * `readIndex`/`planWholeSet` during the download — it ordered *arrival* — and
 * `mergeSet` **threw it away** when writing `pictograms.<lang>.json`. The data was
 * not on disk, so `candidatesFor` returned the ids in whatever order the file held,
 * and the chooser's own comment claimed an order no code produced.
 */
describe('the catalogue remembers how used a pictogram is', () => {
  it('keeps popularity and the publisher through a merge', () => {
    const merged = mergeSet([], [
      { id: '1001', keywords: ['casa'], popularity: 900 } as never,
      { id: '2002', keywords: ['casa'], popularity: 12 } as never,
    ], 'arasaac');

    expect(merged.map((e) => e.id)).toEqual(['1001', '2002']);
    expect(merged.every((e) => e.from === 'arasaac')).toBe(true);
    expect(merged.find((e) => e.id === '1001')?.popularity).toBe(900);
  });

  it('keeps what a hand-built set already recorded', () => {
    // A fetch is additive by definition, and an entry that arrives with no number
    // must not erase one that has it.
    const merged = mergeSet(
      [{ id: '1001', keywords: ['casa'], from: 'mio', popularity: 5 }],
      [{ id: '1001', keywords: ['vivienda'] }],
    );
    expect(merged[0]).toMatchObject({ from: 'mio', popularity: 5 });
    expect(merged[0]!.keywords).toEqual(['casa', 'vivienda']);
  });

  it('takes the larger number when a re-fetch brings a newer one', () => {
    const merged = mergeSet(
      [{ id: '1001', keywords: ['casa'], popularity: 5 }],
      [{ id: '1001', keywords: ['casa'], popularity: 900 } as never],
    );
    expect(merged[0]!.popularity).toBe(900);
  });

  it('records nothing where there is nothing to record', () => {
    // A set she assembled by hand has no publisher and no download count, and
    // inventing either would be the same false-attribution mistake in the data.
    const merged = mergeSet([], [{ id: '1001', keywords: ['casa'] }]);
    expect(merged[0]).not.toHaveProperty('from');
    expect(merged[0]).not.toHaveProperty('popularity');
  });
});


/**
 * Most-used first, and testable (`024` FR-2217, decision P41).
 *
 * The first version of this fix was two lines inside `candidatesFor`, which reaches
 * the settings and the filesystem — so nothing in the offline suite could see it,
 * and it **survived being deleted**: every test still passed with the ordering
 * gone. Which is the same shape as the defect it was fixing, arriving in the fix.
 */
describe('the candidates she is shown are ordered', () => {
  it('puts the most-used drawing first', () => {
    const order = mostUsedFirst(['2002', '1001', '3003'], new Map([
      ['1001', 12], ['2002', 900], ['3003', 40],
    ]));
    expect(order).toEqual(['2002', '3003', '1001']);
  });

  it('is stable when nothing knows how used they are', () => {
    // An arbitrary order that changes between openings is worse than one that does
    // not: she is comparing four drawings of «casa» by eye.
    const ids = ['3003', '1001', '2002'];
    expect(mostUsedFirst(ids, new Map())).toEqual(['1001', '2002', '3003']);
    expect(mostUsedFirst(ids, new Map())).toEqual(mostUsedFirst([...ids].reverse(), new Map()));
  });

  it('puts an unknown one after every known one', () => {
    // Absent is not zero anywhere else in this project, and it is not here either:
    // «I do not know» sorts below «hardly used», because a real number is evidence.
    expect(mostUsedFirst(['aaa', 'bbb'], new Map([['bbb', 0]]))).toEqual(['bbb', 'aaa']);
  });

  it('does not mutate what it was given', () => {
    const ids = ['2002', '1001'];
    mostUsedFirst(ids, new Map([['1001', 5]]));
    expect(ids).toEqual(['2002', '1001']);
  });
});
