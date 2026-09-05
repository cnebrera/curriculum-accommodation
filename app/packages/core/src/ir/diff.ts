import { parseIR } from './parse.js';
import type { Block, IRDocument } from './types.js';

/**
 * What changed between two revisions — **derived from the files** (026 T004, FR-2404).
 *
 * ## Why the model's own account is never the answer
 *
 * A model asked what it changed will answer confidently, including about changes it did
 * not make. That is the same failure `004` closed for handover reports and `014` closed
 * for dates, and it matters more here: «¿qué ha cambiado?» is the question she uses to
 * decide whether to look at the sheet at all. An account that is wrong in her favour is
 * an account that stops her looking.
 *
 * So this compares the two documents. The IR was chosen partly because «its diffs are
 * legible» — blocks carry stable ids — and the sentences below speak in **exercises and
 * instructions**, which are her units, rather than in lines, which are not.
 *
 * ## Quantities are called out separately
 *
 * «He cambiado el enunciado de e4» and «he cambiado los números de e4» are different
 * facts to a teacher with a verified answer key in her hand. The second is the one that
 * makes her check the key; conflating them into «he cambiado e4» would hide it.
 */

export interface BlockChange {
  id: string;
  kind: 'added' | 'removed' | 'changed';
  /** True when the numbers inside the block moved, not only its wording. */
  quantitiesMoved?: boolean;
}

export interface RevisionDiff {
  changes: BlockChange[];
  /** Nothing moved: the turn produced an identical document. */
  empty: boolean;
  /** What to tell her, in her language. Rendered from `changes` alone. */
  sentences: string[];
}

/** Every number in a block, as comparable values. Order matters: `12 − 5` is not `5 − 12`. */
const numbersIn = (b: Block): string =>
  (b.content.match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')).join(' ');

/** The block's text with its numbers taken out, so wording and quantities separate. */
const wordsIn = (b: Block): string =>
  b.content.replace(/-?\d+(?:[.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim();

export function revisionDiff(before: string, after: string): RevisionDiff {
  const a = parseIR(before);
  const b = parseIR(after);
  return diffDocuments(a, b);
}

export function diffDocuments(before: IRDocument, after: IRDocument): RevisionDiff {
  const was = new Map(before.blocks.map((x) => [x.id, x]));
  const now = new Map(after.blocks.map((x) => [x.id, x]));
  const changes: BlockChange[] = [];

  for (const [id, block] of now) {
    const previous = was.get(id);
    if (!previous) { changes.push({ id, kind: 'added' }); continue; }
    const numbersChanged = numbersIn(previous) !== numbersIn(block);
    const wordsChanged = wordsIn(previous) !== wordsIn(block);
    if (!numbersChanged && !wordsChanged) continue;
    changes.push({ id, kind: 'changed', ...(numbersChanged ? { quantitiesMoved: true } : {}) });
  }
  for (const id of was.keys()) if (!now.has(id)) changes.push({ id, kind: 'removed' });

  return { changes, empty: changes.length === 0, sentences: describe(changes, was, now) };
}

/** «una ficha», «un examen» — what a block is, in her words. */
const noun = (b: Block | undefined): string => {
  if (!b) return 'bloque';
  if (b.classes.includes('exercise')) return 'ejercicio';
  if (b.classes.includes('assessment')) return 'pregunta';
  if (b.classes.includes('instruction')) return 'enunciado';
  if (b.classes.includes('figure')) return 'dibujo';
  if (b.classes.includes('scaffold')) return 'apoyo';
  return 'bloque';
};

const plural = (n: number, one: string): string =>
  n === 1 ? one : one === 'ejercicio' ? 'ejercicios'
    : one === 'pregunta' ? 'preguntas'
      : one === 'enunciado' ? 'enunciados'
        : one === 'dibujo' ? 'dibujos'
          : one === 'apoyo' ? 'apoyos' : 'bloques';

/**
 * The sentences, grouped by what happened and by what kind of thing it happened to.
 *
 * Grouped rather than one line per block: «he quitado 3 ejercicios (e7, e8, e9)» is a
 * sentence she reads; nine lines saying «he quitado e7» is a log she skims. The ids stay
 * in brackets because they are how she finds them on the page.
 */
function describe(
  changes: readonly BlockChange[],
  was: ReadonlyMap<string, Block>, now: ReadonlyMap<string, Block>,
): string[] {
  if (changes.length === 0) return [];
  const out: string[] = [];

  const group = (kind: BlockChange['kind'], pick: (c: BlockChange) => boolean = () => true) => {
    const picked = changes.filter((c) => c.kind === kind && pick(c));
    const byNoun = new Map<string, string[]>();
    for (const c of picked) {
      const n = noun(kind === 'removed' ? was.get(c.id) : now.get(c.id));
      byNoun.set(n, [...(byNoun.get(n) ?? []), c.id]);
    }
    return byNoun;
  };

  for (const [n, ids] of group('removed')) {
    out.push(`He quitado ${ids.length} ${plural(ids.length, n)} (${ids.join(', ')}).`);
  }
  for (const [n, ids] of group('added')) {
    out.push(`He añadido ${ids.length} ${plural(ids.length, n)} (${ids.join(', ')}).`);
  }
  /*
   * Quantity changes first and on their own line.
   *
   * She has a verified answer key in her hand, and «he cambiado los números» is the
   * sentence that makes her check it. Folded in with wording changes it would be the
   * sentence she skims past.
   */
  for (const [n, ids] of group('changed', (c) => c.quantitiesMoved === true)) {
    out.push(`He cambiado **los números** de ${ids.length} ${plural(ids.length, n)} `
      + `(${ids.join(', ')}). Comprueba la hoja de soluciones.`);
  }
  for (const [n, ids] of group('changed', (c) => c.quantitiesMoved !== true)) {
    out.push(`He cambiado cómo está escrito ${ids.length === 1 ? 'un' : `${ids.length}`} `
      + `${plural(ids.length, n)} (${ids.join(', ')}), sin tocar las cantidades.`);
  }

  return out;
}
