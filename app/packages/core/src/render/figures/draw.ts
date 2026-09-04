import { validateGlyph } from './validate.js';

/**
 * The drawer (022 T005, FR-2004/2005/2013,
 * `specs/022-material-que-se-ve/contracts/figures.md` §3).
 *
 * ## Deterministic, and that is a requirement rather than a habit
 *
 * Same `Figure`, byte-identical SVG. No clock, no randomness, no filesystem, no model at
 * render time (FR-2004) — which is what lets a composed document be re-rendered anywhere,
 * for ever, and lets «is this the same sheet?» be answerable.
 *
 * ## The theme cannot move a quantity, structurally
 *
 * Geometry is computed **only** from `quantities`. `theme` and `glyph` decide what one
 * cell looks like and what a label says; there is no expression anywhere in this file
 * where either of them reaches a count or a coordinate (FR-2005). That is why the
 * argument is «structurally» and not «by discipline».
 *
 * ## No references, so «nothing remote» is one assertion
 *
 * Repetition is by **inlining N copies** of the glyph rather than by `<defs>` + `<use>`.
 * That is more bytes and it means the rendered output of any document — hostile or not —
 * contains no `href`, no `url(`, no fetchable anything (FR-2010), which is a one-line
 * assertion instead of a judgement somebody has to keep making.
 *
 * ## Counting never rides on colour
 *
 * Every counted thing is a discrete outlined shape, and the number line's jumps are arcs
 * with tick marks. A black-and-white photocopy is the delivery format (`006` FR-427), not
 * an edge case, and `010` FR-812 says meaning never rides on colour alone.
 */

export type FigureQuantities =
  | { kind: 'grid'; rows: number; cols: number }
  | { kind: 'groups'; groups: number; perGroup: number }
  | { kind: 'number-line'; start: number; jumps: number; end: number }
  | { kind: 'part-whole'; parts: readonly number[]; whole: number };

export interface Figure {
  /** The exercise block this figure draws. Traceability (Principle VI). */
  of: string;
  /** From the verified exercise. The code's, always (FR-2001). */
  quantities: FigureQuantities;
  /** The model's word. Reaches labels and glyphs; reaches no number. */
  theme?: string;
  /** Already validated once at compose time; re-validated here (the vault is editable). */
  glyph?: string;
  /** Corpus template + code-interpolated quantities. What audio and braille say. */
  description: string;
}

/** The unit cell, in the SVG's own units. Everything else is a multiple of these. */
const CELL = 16;
const GAP = 4;
const PAD = 6;
const INK = '#222';

/**
 * One `<svg>` element, inline.
 *
 * A **refused** glyph does not refuse the figure here: the caller decides that, because
 * the caller is the one that can report it and keep the page (FR-2011). What this does is
 * fall back to the plain shape, so a figure never renders somebody's markup unchecked
 * even if a caller forgets to ask.
 */
export function drawFigure(fig: Figure): string {
  const glyph = fig.glyph && validateGlyph(fig.glyph).ok ? fig.glyph : undefined;
  const body = fig.quantities.kind === 'grid' ? grid(fig.quantities, glyph)
    : fig.quantities.kind === 'groups' ? groups(fig.quantities, glyph)
      : fig.quantities.kind === 'number-line' ? numberLine(fig.quantities)
        : partWhole(fig.quantities, glyph);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${body.w} ${body.h}"`
    + ` width="${body.w}" height="${body.h}" role="img"`
    + ` aria-label="${esc(fig.description)}">${body.svg}</svg>`;
}

interface Drawn { svg: string; w: number; h: number }

/**
 * The plain cell, when there is no theme (FR-2006).
 *
 * A square outline: countable, photocopiable, and not pretending to be anything. Themed
 * at random would be inventing a fact about a child.
 */
const plainCell = (): string =>
  `<rect x="1" y="1" width="${CELL - 2}" height="${CELL - 2}" fill="none"`
  + ` stroke="${INK}" stroke-width="1.2"/>`;

/** One cell at a position. The glyph is inlined; nothing is referenced. */
const cellAt = (x: number, y: number, glyph?: string): string =>
  `<g transform="translate(${x} ${y})">${glyph ?? plainCell()}</g>`;

function grid(q: { rows: number; cols: number }, glyph?: string): Drawn {
  const cells: string[] = [];
  for (let r = 0; r < q.rows; r += 1) {
    for (let c = 0; c < q.cols; c += 1) {
      cells.push(cellAt(PAD + c * (CELL + GAP), PAD + r * (CELL + GAP), glyph));
    }
  }
  return {
    svg: cells.join(''),
    w: PAD * 2 + q.cols * (CELL + GAP) - GAP,
    h: PAD * 2 + q.rows * (CELL + GAP) - GAP,
  };
}

/**
 * Groups, drawn as groups.
 *
 * Each group is boxed, because «four groups of three» is a different picture from twelve
 * things in a row and the box is what makes it one. The box is an outline, not a fill:
 * see the colour rule above.
 */
function groups(q: { groups: number; perGroup: number }, glyph?: string): Drawn {
  const inner = PAD + q.perGroup * (CELL + GAP) - GAP + PAD;
  const boxH = PAD + CELL + PAD;
  const rows: string[] = [];
  for (let g = 0; g < q.groups; g += 1) {
    const top = PAD + g * (boxH + GAP);
    const cells: string[] = [];
    for (let i = 0; i < q.perGroup; i += 1) {
      cells.push(cellAt(PAD + PAD + i * (CELL + GAP), top + PAD, glyph));
    }
    rows.push(
      `<rect x="${PAD}" y="${top}" width="${inner}" height="${boxH}" rx="3"`
      + ` fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 2"/>`
      + cells.join(''),
    );
  }
  return {
    svg: rows.join(''),
    w: PAD * 2 + inner,
    h: PAD * 2 + q.groups * (boxH + GAP) - GAP,
  };
}

/**
 * The number line: ticks, a start mark, and one arc per jump.
 *
 * The jumps are arcs and the ticks are lines, so the count survives greyscale — an
 * arrow drawn in a second colour would be a count carried by colour (FR-2013).
 */
function numberLine(q: { start: number; jumps: number; end: number }): Drawn {
  const lo = Math.min(q.start, q.end, 0);
  const hi = Math.max(q.start, q.end);
  const span = Math.max(1, hi - lo);
  const step = 22;
  const y = 54;
  const at = (n: number): number => PAD + (n - lo) * step;

  const parts: string[] = [
    `<line x1="${at(lo)}" y1="${y}" x2="${at(hi)}" y2="${y}" stroke="${INK}" stroke-width="1.5"/>`,
  ];
  for (let n = lo; n <= hi; n += 1) {
    const major = n === lo || n === hi || n === q.start || n === q.end;
    parts.push(`<line x1="${at(n)}" y1="${y - (major ? 7 : 4)}" x2="${at(n)}" y2="${y + (major ? 7 : 4)}"`
      + ` stroke="${INK}" stroke-width="${major ? 1.5 : 1}"/>`);
    if (major) {
      parts.push(`<text x="${at(n)}" y="${y + 20}" font-size="10" text-anchor="middle">${n}</text>`);
    }
  }

  /*
   * One arc per jump, above the line, each spanning one unit.
   *
   * Per jump and not one long arrow: «cinco saltos» is countable on the page, and a
   * single arrow labelled «+5» is the arithmetic written out rather than shown.
   */
  const dir = q.end >= q.start ? 1 : -1;
  for (let j = 0; j < q.jumps; j += 1) {
    const from = q.start + dir * j;
    const x1 = at(from);
    const x2 = at(from + dir);
    parts.push(`<path d="M${x1} ${y - 8} Q ${(x1 + x2) / 2} ${y - 26} ${x2} ${y - 8}"`
      + ` fill="none" stroke="${INK}" stroke-width="1.2"/>`);
  }

  return { svg: parts.join(''), w: PAD * 2 + span * step, h: y + 28 };
}

/**
 * The bar: one whole, split into its parts, each labelled with its own number.
 *
 * Labelled inside rather than by a legend, for the colour rule again: a legend is a
 * mapping from colour to meaning, which is the thing FR-2013 forbids.
 */
function partWhole(q: { parts: readonly number[]; whole: number }, glyph?: string): Drawn {
  const unit = 14;
  const h = 30;
  const parts: string[] = [];
  let x = PAD;
  for (const [i, p] of q.parts.entries()) {
    const w = Math.max(unit, p * unit);
    parts.push(
      `<rect x="${x}" y="${PAD}" width="${w}" height="${h}" fill="none"`
      + ` stroke="${INK}" stroke-width="1.4"${i > 0 ? ' stroke-dasharray="0"' : ''}/>`
      + `<text x="${x + w / 2}" y="${PAD + h / 2 + 4}" font-size="11"`
      + ` text-anchor="middle">${p}</text>`,
    );
    x += w;
  }
  // The whole, bracketed under the bar and labelled with its number.
  parts.push(
    `<line x1="${PAD}" y1="${PAD + h + 7}" x2="${x}" y2="${PAD + h + 7}"`
    + ` stroke="${INK}" stroke-width="1"/>`
    + `<text x="${(PAD + x) / 2}" y="${PAD + h + 21}" font-size="11"`
    + ` text-anchor="middle">${q.whole}</text>`,
  );
  if (glyph) {
    // The theme rides along as a mark at the end of the bar, where it cannot be counted.
    parts.push(`<g transform="translate(${x + GAP} ${PAD + 7})">${glyph}</g>`);
  }
  return {
    svg: parts.join(''),
    w: PAD + x + (glyph ? CELL + GAP : 0) + PAD,
    h: PAD + h + 28,
  };
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
