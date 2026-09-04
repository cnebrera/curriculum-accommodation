import { drawFigure, type Figure, type FigureQuantities } from './draw.js';
import { validateGlyph } from './validate.js';
import { readOperation } from '../../compose/verify/arithmetic.js';
import type { Block } from '../../ir/types.js';

/**
 * Drawing a figure block that came off disk (022 T009, FR-2011/2016).
 *
 * ## Why anything is re-checked at all
 *
 * Because the vault is hand-editable, which is the whole point of it — so a figure block
 * read from a file is **content** (`007`), whatever wrote it. A block that was stamped by
 * `buildSheet` an hour ago and a block a hostile document arrived with are the same thing
 * to this function, and it treats them the same way.
 *
 * Two checks, and they catch different things:
 *
 * 1. **The glyph, against the wall.** A hand edit or an injection can put anything in the
 *    fence between one render and the next.
 * 2. **The quantities, against the exercise `data-of` names.** If that exercise still
 *    parses, its operands must produce the stamped numbers — otherwise the exercise was
 *    changed and its picture was not, which is FR-2016's second net. A diagram is part of
 *    the document, not decoration attached to it.
 *
 * A refusal renders as **its sentence**, and the sheet survives (FR-2011). A refusal that
 * lost the whole page would punish her for something the model did.
 */

export interface DrawnBlock {
  /** The SVG, or `null` when the figure was refused. */
  svg: string | null;
  /** What to print instead, and what the report says. In her language. */
  refusal?: string;
  /** Always present: audio, braille and the ODT caption all say this (FR-2012). */
  description: string;
}

/** Is this a **drawn** figure, or `001`'s ingested image? `data-figure` is the difference. */
export const isDrawnFigure = (b: Block): boolean =>
  b.classes.includes('figure') && b.attrs['data-figure'] !== undefined;

/**
 * The glyph out of the fence.
 *
 * Deliberately intolerant: exactly one ```` ```svg ```` fence and nothing around it. A
 * figure block whose content is anything else has been edited into something this cannot
 * establish, and «no glyph» is the safe reading — it draws the plain shape.
 */
const glyphIn = (content: string): string | undefined => {
  const m = /^\s*```(?:svg)?\s*\n([\s\S]*?)\n?```\s*$/.exec(content);
  return m ? m[1]!.trim() : undefined;
};

const num = (v: string | undefined): number => Number(v ?? NaN);

/** The stamped quantities, read back off the block. */
function quantitiesOf(b: Block): FigureQuantities | null {
  const a = b.attrs;
  switch (a['data-figure']) {
    case 'grid': {
      const rows = num(a['data-rows']); const cols = num(a['data-cols']);
      return Number.isFinite(rows) && Number.isFinite(cols) ? { kind: 'grid', rows, cols } : null;
    }
    case 'groups': {
      const groups = num(a['data-groups']); const perGroup = num(a['data-per-group']);
      return Number.isFinite(groups) && Number.isFinite(perGroup)
        ? { kind: 'groups', groups, perGroup } : null;
    }
    case 'number-line': {
      const start = num(a['data-start']); const jumps = num(a['data-jumps']);
      const end = num(a['data-end']);
      return [start, jumps, end].every(Number.isFinite)
        ? { kind: 'number-line', start, jumps, end } : null;
    }
    case 'part-whole': {
      const parts = (a['data-parts'] ?? '').split(',').map((p) => Number(p.trim()));
      const whole = num(a['data-whole']);
      return parts.length > 0 && parts.every(Number.isFinite) && Number.isFinite(whole)
        ? { kind: 'part-whole', parts, whole } : null;
    }
    default:
      return null;
  }
}

/**
 * Do the stamped quantities still agree with the exercise they claim to draw?
 *
 * `null` where there is nothing to compare — the exercise is not in this document, or no
 * longer parses as arithmetic. **Not a refusal**: a document whose exercise block was
 * renamed by a recipe would lose its diagrams for a change that broke nothing, and this
 * check exists to catch numbers that moved, not ids that did.
 */
function agrees(q: FigureQuantities, exercise: Block | undefined): boolean | null {
  if (!exercise) return null;
  // `3. 47 × 8 =` — the number and the trailing `=` are the sheet's, not the exercise's.
  const bare = exercise.content.replace(/^\s*\d+\.\s*/, '').replace(/=\s*$/, '').trim();
  const op = readOperation(bare);
  if (!op) return null;

  switch (q.kind) {
    case 'grid': return q.rows === op.a && q.cols === op.b;
    /*
     * For a division the groups are the answer, so the product is what can be compared
     * without recomputing it here — and recomputing it here would be a second verifier.
     */
    case 'groups': return q.groups * q.perGroup === op.a * op.b || q.perGroup === op.b;
    case 'number-line': return q.start === op.a && q.jumps === op.b;
    case 'part-whole': return q.parts.includes(op.b) && (q.whole === op.a || q.parts.includes(op.a));
  }
}

export function drawFigureBlock(b: Block, blocks: readonly Block[]): DrawnBlock {
  const description = (b.attrs['data-description'] ?? '').trim();
  const refuse = (why: string): DrawnBlock => ({ svg: null, refusal: why, description });

  const quantities = quantitiesOf(b);
  if (!quantities) {
    return refuse('No he dibujado este diagrama: no dice qué cantidades tiene que dibujar.');
  }

  const glyph = glyphIn(b.content);
  if (glyph !== undefined) {
    const v = validateGlyph(glyph);
    if (!v.ok) {
      /*
       * Re-validated on **every** render, in every modality. The compose-time check was
       * about what a model sent; this one is about what is on disk now.
       */
      return refuse(`No he dibujado este diagrama: ${v.message} Lo que traía: «${v.offending}».`);
    }
  }

  const of = b.attrs['data-of'];
  const still = agrees(quantities, blocks.find((x) => x.id === of));
  if (still === false) {
    return refuse('No he dibujado este diagrama: sus cantidades ya no son las del '
      + 'ejercicio al que acompaña. Alguien ha cambiado uno de los dos.');
  }

  const fig: Figure = {
    of: of ?? b.id,
    quantities,
    ...(b.attrs['data-theme'] ? { theme: b.attrs['data-theme'] } : {}),
    ...(glyph ? { glyph } : {}),
    description,
  };
  return { svg: drawFigure(fig), description };
}
