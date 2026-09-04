import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  parseFigureCorpus, parseDiagramRequests, figureQuantities, describeFigure,
  acceptGlyph, isRefusal, drawFigure, arithmetic, buildSheet, type Figure,
} from '../src/index.js';

/**
 * Every quantity in a diagram is the exercise's (022 T003, SC-2001, FR-2001…2004).
 *
 * Written before anything stamps a figure into a document, because the failure it guards
 * is the one this whole feature is against: **eleven cells beside `4 × 3 =`**. A child
 * who is lost in the wording and counts the picture instead has just been taught that
 * mathematics does not add up.
 *
 * Asserted as an invariant over the four kinds and both directions of every operation,
 * not as a sample — SC-2001 says «invariant, not sample» in those words.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseFigureCorpus(readFileSync(join(root, 'instructions', 'figures.md'), 'utf8'));

/** Every exercise the arithmetic verifier can actually solve, with its computed answer. */
const EXERCISES: Array<[string, string]> = [
  ['4 × 3', '12'], ['7 × 8', '56'], ['1 × 9', '9'],
  ['12 ÷ 3', '4'], ['20 ÷ 4', '5'],
  ['3 + 5', '8'], ['17 + 6', '23'],
  ['12 - 5', '7'], ['20 - 8', '12'],
];

const solved = (expression: string): string => {
  const a = arithmetic.solve({ expression });
  expect(a, expression).not.toBe('unknown');
  return a as string;
};

/** How many counted shapes the drawing has. */
const cells = (svg: string): number => (svg.match(/<g transform="translate\(/g) ?? []).length;

describe('the corpus this rests on', () => {
  it('declares the four kinds and their bounds', () => {
    expect(corpus.kinds.map((k) => k.id).sort())
      .toEqual(['grid', 'groups', 'number-line', 'part-whole']);
    expect(corpus.bounds.maxCells).toBeGreaterThan(0);
  });

  it('and the operations each kind suits, so a mismatch is refusable', () => {
    for (const k of corpus.kinds) expect(k.for.length, k.id).toBeGreaterThan(0);
  });
});

describe('the quantities are the exercise’s, in every kind (FR-2001)', () => {
  it('every stated answer in this fixture is the one code computes', () => {
    // The fixture is not the authority — the verifier is. Without this the rest of the
    // file could be asserting against numbers I typed wrong.
    for (const [expression, answer] of EXERCISES) {
      expect(solved(expression), expression).toBe(answer);
    }
  });

  it('a grid has exactly a × b cells, for every multiplication', () => {
    for (const [expression, answer] of EXERCISES.filter(([e]) => e.includes('×'))) {
      const q = figureQuantities({ corpus, kindId: 'grid', expression, answer });
      expect(isRefusal(q), expression).toBe(false);
      if (isRefusal(q)) continue;
      const [a, b] = expression.split('×').map((s) => Number(s.trim()));
      expect(q).toEqual({ kind: 'grid', rows: a, cols: b });
      // And the drawing counts what the quantities say — the whole chain, not the middle.
      expect(cells(drawFigure({ of: 'x', quantities: q, description: '' })))
        .toBe(Number(answer));
    }
  });

  it('groups for a division are the ANSWER groups, not the dividend', () => {
    /*
     * `12 ÷ 3` is three in each of four groups. Drawing twelve groups of three would be
     * a picture of `12 × 3` beside an exercise that says `12 ÷ 3` — arithmetically
     * unrelated, and the kind of wrong picture a child trusts.
     */
    const q = figureQuantities({ corpus, kindId: 'groups', expression: '12 ÷ 3', answer: '4' });
    expect(q).toEqual({ kind: 'groups', groups: 4, perGroup: 3 });
    expect(cells(drawFigure({ of: 'x', quantities: q as never, description: '' }))).toBe(12);
  });

  it('a number line ends where the answer is', () => {
    const q = figureQuantities({ corpus, kindId: 'number-line', expression: '3 + 5', answer: '8' });
    expect(q).toEqual({ kind: 'number-line', start: 3, jumps: 5, end: 8 });
  });

  it('a bar for a subtraction splits the whole into the result and what was taken', () => {
    // `12 − 5` is a bar of twelve split into seven and five, which is the picture that
    // explains it. A bar of seven split into twelve and five would be nonsense.
    const q = figureQuantities({ corpus, kindId: 'part-whole', expression: '12 - 5', answer: '7' });
    expect(q).toEqual({ kind: 'part-whole', parts: [7, 5], whole: 12 });
  });

  it('and a bar for a sum splits the answer into the two addends', () => {
    const q = figureQuantities({ corpus, kindId: 'part-whole', expression: '3 + 5', answer: '8' });
    expect(q).toEqual({ kind: 'part-whole', parts: [3, 5], whole: 8 });
  });
});

describe('what the model states is not what is drawn (FR-2002)', () => {
  it('the parsed request has nowhere to put a quantity', () => {
    const [req] = parseDiagramRequests(
      'figura: 4 × 3 | tipo: rejilla | tema: cartas de 6 palos', corpus);
    expect(req).toBeDefined();
    // Not «we ignore it»: there is no numeric field on the type. What is kept is the
    // **disagreement**, so the report can say «la cantidad la corregí yo».
    expect(Object.keys(req!).sort()).toEqual(['expression', 'kind', 'statedNumbers', 'theme']);
    expect(req!.statedNumbers).toContain(6);
  });

  it('and a request whose numbers disagree still draws the exercise’s', () => {
    const [req] = parseDiagramRequests('figura: 4 × 3 | tipo: rejilla | tema: 20 cartas', corpus);
    const q = figureQuantities({ corpus, kindId: req!.kind, expression: '4 × 3', answer: '12' });
    expect(q).toEqual({ kind: 'grid', rows: 4, cols: 3 });
  });
});

describe('no verified quantity, no diagram (FR-2003)', () => {
  it('an expression nothing could solve gets no figure', () => {
    const q = figureQuantities({
      corpus, kindId: 'grid', expression: 'la mitad de un pastel', answer: '',
    });
    expect(isRefusal(q) && q.reason).toBe('no-verified-quantity');
  });

  it('and an exercise with no computed answer either', () => {
    // The unverified path sets `answer: ''` — the same branch that keeps it out of the key.
    const q = figureQuantities({ corpus, kindId: 'grid', expression: '4 × 3', answer: '' });
    expect(isRefusal(q) && q.reason).toBe('no-verified-quantity');
  });
});

describe('a kind that does not suit its operation is refused, not remapped', () => {
  it('a number line is not a multiplication', () => {
    const q = figureQuantities({ corpus, kindId: 'number-line', expression: '4 × 3', answer: '12' });
    expect(isRefusal(q) && q.reason).toBe('kind-unsuited-to-operation');
    // Named, so she can decide — remapping would be Rampa taking the pedagogical choice
    // the request exists to let her make.
    expect(isRefusal(q) && q.detail).toContain('esa decisión es tuya');
  });

  it('and a grid is not a subtraction', () => {
    const q = figureQuantities({ corpus, kindId: 'grid', expression: '12 - 5', answer: '7' });
    expect(isRefusal(q) && q.reason).toBe('kind-unsuited-to-operation');
  });

  it('but a subtraction written with a real minus sign still works', () => {
    // The corpus writes «−» (U+2212) because a Spanish keyboard does; the verifier
    // normalises to «-». Folding both sides is the only reason every subtraction figure
    // is not silently refused for a character nobody can see.
    const q = figureQuantities({ corpus, kindId: 'part-whole', expression: '12 − 5', answer: '7' });
    expect(isRefusal(q), isRefusal(q) ? q.detail : '').toBe(false);
  });
});

describe('past the bound there is no diagram, and the bound is named (FR-2015)', () => {
  it('a grid too big to be a picture', () => {
    const q = figureQuantities({ corpus, kindId: 'grid', expression: '30 × 30', answer: '900' });
    expect(isRefusal(q) && q.reason).toBe('bound-exceeded');
    expect(isRefusal(q) && q.detail).toContain(String(corpus.bounds.maxCells));
  });

  it('and it is refused rather than clamped', () => {
    // A clamped grid is a diagram whose quantities no longer match its exercise, which
    // would trade FR-2015 for an SC-2001 violation — the very thing this file is about.
    const q = figureQuantities({ corpus, kindId: 'grid', expression: '30 × 30', answer: '900' });
    expect(isRefusal(q) && q.detail).toContain('recortado');
  });
});

describe('the description says the same numbers as the drawing (FR-2012)', () => {
  it('a grid, with and without a theme', () => {
    const q = figureQuantities({ corpus, kindId: 'grid', expression: '4 × 3', answer: '12' });
    const plain = describeFigure(corpus, q as never);
    expect(plain).toContain('4');
    expect(plain).toContain('3');
    expect(plain).toContain('12');
    expect(describeFigure(corpus, q as never, 'cartas')).toContain('cartas');
  });

  it('and every kind has one, so no drawing is silent', () => {
    for (const [kindId, expression, answer] of [
      ['grid', '4 × 3', '12'], ['groups', '4 × 3', '12'],
      ['number-line', '3 + 5', '8'], ['part-whole', '3 + 5', '8'],
    ] as const) {
      const q = figureQuantities({ corpus, kindId, expression, answer });
      expect(isRefusal(q), kindId).toBe(false);
      expect(describeFigure(corpus, q as never).length, kindId).toBeGreaterThan(10);
    }
  });
});

describe('the glyph passes the wall or the figure is refused (FR-2008/2011)', () => {
  it('a good glyph is kept', () => {
    const v = acceptGlyph('4 × 3', '<rect width="8" height="8" fill="none" stroke="black"/>');
    expect(isRefusal(v)).toBe(false);
    expect(!isRefusal(v) && v.glyph).toBeTruthy();
  });

  it('a hostile one is a refusal with its token quoted, and nothing throws', () => {
    const v = acceptGlyph('4 × 3', '<rect width="8" onload="x()"/>');
    expect(isRefusal(v) && v.reason).toBe('markup-outside-allowlist');
    expect(isRefusal(v) && v.detail).toContain('onload');
  });

  it('and no glyph is not a refusal', () => {
    expect(isRefusal(acceptGlyph('4 × 3', undefined))).toBe(false);
  });
});

describe('the same document draws the same picture (FR-2004)', () => {
  it('twice, byte for byte, for every kind', () => {
    for (const [kindId, expression, answer] of [
      ['grid', '4 × 3', '12'], ['groups', '12 ÷ 3', '4'],
      ['number-line', '3 + 5', '8'], ['part-whole', '12 - 5', '7'],
    ] as const) {
      const q = figureQuantities({ corpus, kindId, expression, answer }) as never;
      const fig: Figure = { of: 'g1-e1', quantities: q, description: 'x' };
      expect(drawFigure(fig), kindId).toBe(drawFigure(fig));
    }
  });
});

/**
 * An unverified group stamps nothing (022 FR-2003), asserted where it is decided.
 *
 * Found by mutation: `figureQuantities` refuses an exercise with no computed answer, and
 * `buildSheet` refuses an unverified **group** — two different guards for two different
 * moments, and only the first had a test. Turning the second off left the whole suite
 * green, which means a sheet whose skill has no verifier could have carried confident
 * diagrams beside arithmetic nobody checked.
 *
 * That is the worst possible combination, and it is why FR-2003 exists: the picture lends
 * the exercise a credibility the arithmetic has not earned, and a child counts the picture.
 */
describe('the sheet decides too, not only the quantity computation', () => {
  const OBJECTIVE = 'Multiplicar con llevadas';
  const figure: Figure = {
    of: '4 × 3', quantities: { kind: 'grid', rows: 4, cols: 3 },
    description: 'Una rejilla de 4 filas por 3 columnas: 12 casillas.',
  };
  const figures = new Map([['4 × 3', figure]]);

  const sheet = (unverified: boolean) => buildSheet({
    title: 'Multiplicaciones', lang: 'es', materialKind: 'worksheet',
    objectives: [OBJECTIVE], composedOn: '2026-09-04', figures,
    groups: [{
      objective: OBJECTIVE, instruction: 'Resuelve.',
      ...(unverified ? { unverified: true } : {}),
      accepted: [{ exercise: { expression: '4 × 3' }, answer: unverified ? '' : '12' }],
    }],
  });

  it('a verified group gets its diagram', () => {
    const doc = sheet(false).doc;
    expect(doc.blocks.filter((b) => b.attrs['data-figure'] !== undefined)).toHaveLength(1);
  });

  it('and an unverified one gets none, however good the figure is', () => {
    const doc = sheet(true).doc;
    expect(doc.blocks.filter((b) => b.attrs['data-figure'] !== undefined)).toEqual([]);
    // The exercise is still there, and still marked unverified. It is the picture that
    // is refused, not the work.
    expect(doc.blocks.some((b) => b.attrs['data-unverified'] === '1')).toBe(true);
  });

  it('the figure block names the exercise it draws, and the numbers it claims', () => {
    // On the block so a teacher reading her vault in Obsidian can see what the picture
    // claims — and so the render-time cross-check has something to compare (FR-2016).
    const fig = sheet(false).doc.blocks.find((b) => b.attrs['data-figure'] !== undefined)!;
    expect(fig.attrs['data-of']).toBe('g1-e1');
    expect(fig.attrs['data-rows']).toBe('4');
    expect(fig.attrs['data-cols']).toBe('3');
    expect(fig.attrs['data-description']).toContain('12 casillas');
  });

  it('and it comes after the exercise, because that is the order he reads them', () => {
    const blocks = sheet(false).doc.blocks;
    const e = blocks.findIndex((b) => b.id === 'g1-e1');
    const f = blocks.findIndex((b) => b.attrs['data-figure'] !== undefined);
    expect(f).toBe(e + 1);
  });
});
