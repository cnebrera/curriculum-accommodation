import { readOperation } from './verify/arithmetic.js';
import { validateGlyph } from '../render/figures/validate.js';
import { fillDescription, kindById, kindSaying, type FigureCorpus } from '../render/figures/corpus.js';
import type { FigureQuantities } from '../render/figures/draw.js';

/**
 * The diagram request, and where its quantities come from (022 T007/T008, FR-2001/2002).
 *
 * ## The type is the guarantee
 *
 * `DiagramRequest` has **no numeric field**. Not «we ignore the numbers the model sends»
 * — there is nowhere to put them, so a model that writes rows and columns into the line
 * writes them into nothing. A field that exists is a field somebody eventually reads.
 *
 * Where the stated numbers visibly disagree with the exercise, the disagreement is
 * surfaced for the report (FR-2002) and the diagram is drawn with the **exercise's**
 * numbers. Said, not silently corrected: «la cantidad la corregí yo» is a sentence she
 * can act on, and a silent correction is a model whose mistakes she never learns about.
 */

/** Parsed from the compose response. Carries no quantities, by type. */
export interface DiagramRequest {
  /** The exercise it belongs to, keyed by expression — positions shift, the expression does not. */
  expression: string;
  /** A kind id the corpus declares. An unknown spelling is no request. */
  kind: string;
  /** The theme in words. Absent means plain (FR-2006). */
  theme?: string;
  /** The themed shape, **not yet trusted**: validated before anything is written. */
  glyph?: string;
  /**
   * Numbers the model stated in the line, kept **only** to report the disagreement.
   *
   * Not used to draw anything, ever. They exist here so `buildSheet` can say «la cantidad
   * la corregí yo» rather than quietly drawing something else than what was asked for.
   */
  statedNumbers?: readonly number[];
}

export type FigureRefusalReason =
  | 'markup-outside-allowlist'
  | 'kind-unsuited-to-operation'
  | 'no-verified-quantity'
  | 'bound-exceeded'
  | 'quantities-drifted';

export interface FigureRefusal {
  /** The expression or block id, so she can find it. */
  of: string;
  reason: FigureRefusalReason;
  /** Quoted and located, never paraphrased (Principle IX). */
  detail: string;
}

/**
 * `figura: <expresión> | tipo: … | tema: … | glifo: …`
 *
 * `parseProposals`' exact tolerance: a fence, list numbering, a trailing full stop — and
 * nothing else. A line this half-understands is **no request**, because a guessed request
 * would reach the stamping code, which would then draw a guess.
 */
export function parseDiagramRequests(raw: string, corpus: FigureCorpus): DiagramRequest[] {
  const body = /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
  const out: DiagramRequest[] = [];

  for (const line of body.split(/\r?\n/)) {
    const clean = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (!/^figura\s*:/i.test(clean)) continue;

    const fields = new Map<string, string>();
    for (const part of clean.split('|')) {
      const m = /^\s*([A-Za-zñÑ]+)\s*:\s*([\s\S]*)$/.exec(part);
      if (m) fields.set(m[1]!.toLowerCase(), m[2]!.trim());
    }

    const expression = fields.get('figura');
    const says = fields.get('tipo');
    if (!expression || !says) continue;

    const kind = kindSaying(corpus, says);
    // An unknown `tipo` is no request. Not the nearest kind: remapping a pedagogical
        // choice is sanitising it.
    if (!kind) continue;

    const theme = fields.get('tema');
    const glyph = fields.get('glifo');
    /*
     * Every number the line stated, kept only to report the disagreement.
     *
     * Read from the whole line rather than from a field, because there is no numeric
     * field to read — which is the point. A model that wrote «filas: 4» wrote it into a
     * key nothing looks up, and this still notices the 4.
     */
    const stated = [...(fields.get('tipo') ?? '').matchAll(/-?\d+/g),
      ...(theme ?? '').matchAll(/-?\d+/g)].map((m) => Number(m[0]));

    out.push({
      expression: expression.trim(),
      kind: kind.id,
      ...(theme ? { theme } : {}),
      ...(glyph ? { glyph } : {}),
      ...(stated.length ? { statedNumbers: stated } : {}),
    });
  }

  return out;
}

/**
 * The quantities for one figure, from the verified exercise (FR-2001).
 *
 * Per research R3's table, and the operation decides what is computable: a number line
 * is not a multiplication, and a request that says otherwise is **refused and reported**
 * rather than remapped to the kind that would have worked.
 */
export function figureQuantities(args: {
  corpus: FigureCorpus;
  kindId: string;
  /** The accepted exercise, verbatim. */
  expression: string;
  /** Computed by the verifier. Never the model's claim. */
  answer: string;
}): FigureQuantities | FigureRefusal {
  const { corpus, kindId, expression, answer } = args;
  const refuse = (reason: FigureRefusalReason, detail: string): FigureRefusal =>
    ({ of: expression, reason, detail });

  const kind = kindById(corpus, kindId);
  if (!kind) return refuse('kind-unsuited-to-operation', `No conozco el tipo «${kindId}».`);

  const op = readOperation(expression);
  /*
   * A blank answer is **no** verified quantity — and `Number('')` is 0, which is finite.
   *
   * Caught by T003 before anything stamped a figure. The unverified path sets
   * `answer: ''` (the same branch that keeps its result out of the key), so without this
   * an exercise nothing could check would have got a confident grid of zero-by-something
   * beside it. FR-2003 exists for exactly that: a picture gives confidence the arithmetic
   * has not earned.
   */
  const value = answer.trim() === '' ? NaN : Number(answer.replace(',', '.'));
  if (!op || !Number.isFinite(value)) {
    return refuse('no-verified-quantity',
      `No he dibujado nada para «${expression}»: no tengo una cantidad comprobada.`);
  }

  /*
   * The operator, folded on both sides.
   *
   * The corpus is written by a person, and a Spanish keyboard produces «−» (U+2212) as
   * readily as «-». `readOperation` already folds what the model writes; folding what the
   * corpus writes is the same courtesy — and without it every subtraction figure was
   * refused as «unsuited», silently, for a character nobody can see.
   */
  const fold = (o: string): string => o.replace(/[−–—]/g, '-');
  if (!kind.for.map(fold).includes(fold(op.op))) {
    /*
     * Refused, not remapped (research R3).
     *
     * A number line for a multiplication is a pedagogical mistake, and quietly turning it
     * into a grid would be Rampa making the choice the request exists to let her make.
     */
    return refuse('kind-unsuited-to-operation',
      `Me pidió «${kind.says}» para «${expression}», y ese dibujo no vale para esa `
      + 'operación. No lo he cambiado por otro: esa decisión es tuya.');
  }

  const { bounds } = corpus;
  const named = (what: string, limit: number): FigureRefusal => refuse('bound-exceeded',
    `No he dibujado «${expression}»: ${what} pasa del límite de ${limit}. `
    + 'Un dibujo recortado tendría otras cantidades que el ejercicio.');

  switch (kind.id) {
    case 'grid': {
      if (op.a * op.b > bounds.maxCells) return named('la rejilla', bounds.maxCells);
      return { kind: 'grid', rows: op.a, cols: op.b };
    }
    case 'groups': {
      /*
       * For a division the groups are the **answer**: `12 ÷ 3` is three in each of four
       * groups, and drawing twelve groups of three would be a picture of `12 × 3`.
       */
      const g = op.op === '÷' ? value : op.a;
      const per = op.b;
      if (g * per > bounds.maxCells) return named('los grupos', bounds.maxCells);
      return { kind: 'groups', groups: g, perGroup: per };
    }
    case 'number-line': {
      const end = value;
      if (Math.abs(end) > bounds.maxLineSpan || op.b > bounds.maxLineSpan) {
        return named('la recta', bounds.maxLineSpan);
      }
      return { kind: 'number-line', start: op.a, jumps: op.b, end };
    }
    case 'part-whole': {
      /*
       * For a subtraction the parts are the result and the subtrahend: `12 − 5` is a bar
       * of twelve split into seven and five, which is the picture that explains it.
       */
      // `readOperation` normalises the operator, so a subtraction is always `-` here —
      // the U+2212 minus a Spanish keyboard produces is folded upstream.
      const parts = op.op === '-' ? [value, op.b] : [op.a, op.b];
      const whole = op.op === '-' ? op.a : value;
      if (parts.length > bounds.maxParts) return named('las partes', bounds.maxParts);
      return { kind: 'part-whole', parts, whole };
    }
    default:
      return refuse('kind-unsuited-to-operation', `No sé dibujar «${kind.says}».`);
  }
}

/** The description, from the corpus template with the code's quantities in it (FR-2012). */
export function describeFigure(
  corpus: FigureCorpus, quantities: FigureQuantities, theme?: string,
): string {
  const kind = kindById(corpus, quantities.kind);
  if (!kind) return '';
  const of = theme ? ` de ${theme}` : '';
  const slots: Record<string, string | number> = quantities.kind === 'grid'
    ? { rows: quantities.rows, cols: quantities.cols, total: quantities.rows * quantities.cols, theme: of }
    : quantities.kind === 'groups'
      ? { groups: quantities.groups, perGroup: quantities.perGroup,
          total: quantities.groups * quantities.perGroup, theme: of }
      : quantities.kind === 'number-line'
        ? { start: quantities.start, jumps: quantities.jumps, end: quantities.end, theme: of }
        : { parts: quantities.parts.join(' y '), whole: quantities.whole, theme: of };
  return fillDescription(kind.describe, slots);
}

/** The glyph, if it passes the wall. A refusal is an outcome, never a throw (FR-2011). */
export function acceptGlyph(
  expression: string, glyph: string | undefined,
): { glyph?: string } | FigureRefusal {
  if (!glyph) return {};
  const v = validateGlyph(glyph);
  if (v.ok) return { glyph };
  return { of: expression, reason: 'markup-outside-allowlist',
    detail: `${v.message} Lo que traía: «${v.offending}».` };
}

/** Narrowing helper: a refusal, or the thing itself. */
export const isRefusal = (v: unknown): v is FigureRefusal =>
  typeof v === 'object' && v !== null && 'reason' in v && 'of' in v;
