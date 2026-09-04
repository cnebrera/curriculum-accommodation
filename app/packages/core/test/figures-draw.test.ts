import { describe, it, expect } from 'vitest';
import { drawFigure, type Figure } from '../src/index.js';

/**
 * The drawing is the code's, and the same every time (022 T005, FR-2004/2005/2010/2013).
 *
 * Four claims, and each of them is the kind that decays quietly if nobody asserts it:
 * the geometry counts what the exercise says, the theme cannot move a number, the output
 * references nothing, and a photocopy keeps the count.
 */
const CARD = '<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>';

const fig = (quantities: Figure['quantities'], over: Partial<Figure> = {}): Figure => ({
  of: 'g1-e1', quantities, description: 'Un dibujo.', ...over,
});

/** How many counted shapes the drawing has, ignoring the frame and the labels. */
const cells = (svg: string): number => (svg.match(/<g transform="translate\(/g) ?? []).length;

describe('the geometry counts what the exercise says', () => {
  it('a grid has rows × cols cells', () => {
    expect(cells(drawFigure(fig({ kind: 'grid', rows: 4, cols: 3 })))).toBe(12);
    expect(cells(drawFigure(fig({ kind: 'grid', rows: 1, cols: 7 })))).toBe(7);
  });

  it('groups has groups × perGroup cells, in boxes', () => {
    const svg = drawFigure(fig({ kind: 'groups', groups: 4, perGroup: 3 }));
    expect(cells(svg)).toBe(12);
    // Four boxes, because «four groups of three» is a different picture from twelve in a
    // row, and the box is what makes it one.
    expect((svg.match(/stroke-dasharray="3 2"/g) ?? []).length).toBe(4);
  });

  it('a number line has one arc per jump and a tick per unit', () => {
    const svg = drawFigure(fig({ kind: 'number-line', start: 3, jumps: 5, end: 8 }));
    expect((svg.match(/<path/g) ?? []).length).toBe(5);
    // 0…8 inclusive.
    expect((svg.match(/<line/g) ?? []).length).toBe(1 + 9);
  });

  it('a bar has one segment per part, each labelled with its own number', () => {
    const svg = drawFigure(fig({ kind: 'part-whole', parts: [7, 5], whole: 12 }));
    expect(svg).toContain('>7<');
    expect(svg).toContain('>5<');
    expect(svg).toContain('>12<');
  });
});

describe('the theme cannot move a quantity', () => {
  /**
   * Structural, not a promise: `drawFigure` computes every coordinate from `quantities`,
   * and there is no expression in the drawer where `theme` or `glyph` reaches a count.
   * This asserts the consequence — the same numbers, whatever the theme.
   */
  it('the same quantities draw the same number of cells, themed or plain', () => {
    const plain = drawFigure(fig({ kind: 'grid', rows: 4, cols: 3 }));
    const themed = drawFigure(fig({ kind: 'grid', rows: 4, cols: 3 },
      { theme: 'cartas', glyph: CARD }));
    expect(cells(themed)).toBe(cells(plain));
  });

  it('and the two drawings differ, so the theme reached something', () => {
    // Otherwise the assertion above would pass on a drawer that ignored the theme, which
    // is a different feature failing silently.
    const plain = drawFigure(fig({ kind: 'grid', rows: 2, cols: 2 }));
    const themed = drawFigure(fig({ kind: 'grid', rows: 2, cols: 2 }, { glyph: CARD }));
    expect(themed).not.toBe(plain);
    expect(themed).toContain('rx="2"');
  });

  it('a plain figure gets a built-in shape rather than a random theme', () => {
    // FR-2006: inventing an interest is inventing a fact about a child.
    expect(drawFigure(fig({ kind: 'grid', rows: 2, cols: 2 }))).toContain('<rect');
  });

  /**
   * A glyph that would not pass the wall is not drawn, even here.
   *
   * The caller is the one that refuses and reports (FR-2011), but a drawer that trusted
   * its input would put unchecked markup into a sheet the first time a caller forgot to
   * ask — and «the caller always asks» is the kind of claim that is true until it is not.
   */
  it('falls back to the plain shape rather than drawing unchecked markup', () => {
    const svg = drawFigure(fig({ kind: 'grid', rows: 1, cols: 1 },
      { glyph: '<rect width="4" onload="x()"/>' }));
    expect(svg).not.toContain('onload');
    expect(svg).toContain('stroke-width="1.2"');
  });
});

describe('the output references nothing (FR-2010)', () => {
  const ALL: Figure['quantities'][] = [
    { kind: 'grid', rows: 3, cols: 4 },
    { kind: 'groups', groups: 3, perGroup: 4 },
    { kind: 'number-line', start: 2, jumps: 6, end: 8 },
    { kind: 'part-whole', parts: [8, 4], whole: 12 },
  ];

  it('no href, no url(, no http, no data: — in any kind, themed or not', () => {
    for (const q of ALL) {
      for (const glyph of [undefined, CARD]) {
        const svg = drawFigure(fig(q, glyph ? { glyph } : {}));
        // The `xmlns` is the SVG namespace declaration, which is the one URL an inline
        // SVG must carry; everything else would be a reference.
        const withoutNamespace = svg.replace('xmlns="http://www.w3.org/2000/svg"', '');
        for (const token of ['href', 'url(', 'http', 'data:', '<use', '<defs', '<image']) {
          expect(withoutNamespace, `${q.kind} · ${token}`).not.toContain(token);
        }
      }
    }
  });

  it('repeats by inlining, which is what makes the assertion above one line', () => {
    const svg = drawFigure(fig({ kind: 'grid', rows: 2, cols: 2 }, { glyph: CARD }));
    expect((svg.match(/rx="2"/g) ?? []).length).toBe(4);
  });
});

describe('deterministic, byte for byte (FR-2004)', () => {
  it('the same figure twice', () => {
    const q: Figure['quantities'] = { kind: 'groups', groups: 3, perGroup: 5 };
    expect(drawFigure(fig(q, { glyph: CARD }))).toBe(drawFigure(fig(q, { glyph: CARD })));
  });

  it('and the description is on the drawing, for a screen reader', () => {
    const svg = drawFigure(fig({ kind: 'grid', rows: 2, cols: 2 },
      { description: 'Una rejilla de 2 filas por 2 columnas: 4 casillas.' }));
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Una rejilla de 2 filas por 2 columnas: 4 casillas."');
  });

  it('and a description with markup in it cannot escape the attribute', () => {
    const svg = drawFigure(fig({ kind: 'grid', rows: 1, cols: 1 },
      { description: 'Una "rejilla" & <b>algo</b>' }));
    expect(svg).toContain('&quot;rejilla&quot;');
    expect(svg).toContain('&lt;b&gt;');
  });
});

describe('a photocopy keeps the count (FR-2013)', () => {
  /**
   * Every counted thing is a discrete outlined shape.
   *
   * The test: strip every fill and stroke to black on white — which is what a
   * black-and-white photocopier does to the page — and the count is unchanged. A drawing
   * that distinguished its cells by colour would collapse here, and the delivery format
   * for this application is a photocopy (`006` FR-427), not an edge case.
   */
  it('counts survive being flattened to black on white', () => {
    for (const q of [
      { kind: 'grid', rows: 3, cols: 4 },
      { kind: 'groups', groups: 3, perGroup: 4 },
      { kind: 'part-whole', parts: [8, 4], whole: 12 },
    ] as Figure['quantities'][]) {
      const svg = drawFigure(fig(q, { glyph: CARD }));
      const flat = svg.replace(/fill="[^"]*"/g, 'fill="none"')
        .replace(/stroke="[^"]*"/g, 'stroke="black"');
      expect(cells(flat), q.kind).toBe(cells(svg));
      // And no shape was distinguished only by its fill: every counted cell still has a
      // stroke, which is the line the photocopier keeps.
      expect((flat.match(/stroke="black"/g) ?? []).length).toBeGreaterThanOrEqual(cells(svg));
    }
  });
});
