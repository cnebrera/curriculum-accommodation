import { describe, it, expect } from 'vitest';
import {
  readSet, matchWord, reportSkipped, applyPictograms, parsePicto, normalise,
  parseIR, hasImage, type SetReader, type PictogramSet,
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
    { id: '2483', keywords: ['rana', 'sapo'] },
    // Deliberate ambiguity: two pictures claim «rana».
    { id: '2484', keywords: ['rana'] },
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

  it('folds accents and case, and infers nothing else', async () => {
    const set = await loaded();
    expect(matchWord('Árbol', set, opts).kind).toBe('matched');
    expect(matchWord('arbol', set, opts).kind).toBe('matched');
    // No plural rule, no stemming: «casas» is a word the set does not have.
    expect(matchWord('casas', set, opts).kind).toBe('none');
    expect(normalise('  Ráná  ')).toBe('rana');
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
