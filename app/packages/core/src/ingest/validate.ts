import { ExtractedPageSchema, hasUnreadable, type ExtractedPage } from './schema.js';

/**
 * Code validates; code decides whether to retry (008 T004, FR-602/603, ADR 0007).
 *
 * The model is not asked to check its own work — that would be one model call
 * dressed up as two. Every rule here is the contract table in
 * `contracts/extraction.md`, and the three outcomes are deliberately distinct:
 *
 * - **retry**: the answer is malformed, and another attempt may fix it.
 * - **stop**: another attempt cannot fix it, so spending one is spending her
 *   money to produce a second bad extraction. A dark photograph and two
 *   worksheets in one image are both this.
 * - **accept, with flags**: the answer is usable and carries things she must see.
 *
 * Collapsing `stop` into `retry` is the mistake worth guarding against: it is
 * cheaper to write, and it charges a teacher twice for a photograph she needs to
 * retake either way.
 */
export type Verdict =
  | { outcome: 'accept'; page: ExtractedPage; flags: Flag[] }
  | { outcome: 'retry'; problems: string[] }
  | { outcome: 'stop'; problems: string[]; advice: string };

export interface Flag {
  kind: 'unreadable' | 'numbering' | 'note' | 'essential-figure';
  /** Her words. This reaches the verification screen unchanged. */
  message: string;
  blockId?: string;
}

export function validatePage(raw: unknown, expectedPage?: number): Verdict {
  const parsed = ExtractedPageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      outcome: 'retry',
      problems: parsed.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`),
    };
  }
  const page = parsed.data;

  /*
   * Stop, not retry. A second call on an unusable photograph produces a second
   * unusable extraction and a second charge — and the fix is hers and physical:
   * open a curtain, move the paper.
   */
  if (page.quality === 'unusable') {
    return {
      outcome: 'stop',
      problems: ['La foto no se puede leer.'],
      advice: 'Vuelve a hacer la foto con más luz, y con la hoja lo más plana y recta que puedas.',
    };
  }

  if (page.sheets > 1) {
    return {
      outcome: 'stop',
      problems: [`Parece que hay ${page.sheets} hojas en la misma foto.`],
      // The model never decides where one worksheet ends: getting that wrong
      // silently merges two children's work, or two subjects.
      advice: 'Haz una foto de cada hoja por separado y vuelve a probar.',
    };
  }

  const problems: string[] = [];

  const ids = page.blocks.map((b) => b.id);
  const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicated.length) {
    problems.push(`Hay bloques con el mismo identificador: ${[...new Set(duplicated)].join(', ')}.`);
  }

  for (const b of page.blocks) {
    if (b.class !== 'figure') continue;
    /*
     * A figure with no description is the accessibility failure this whole
     * project exists to prevent, arriving through its own pipeline. Decorative
     * is the one role that legitimately needs none.
     */
    if (b.role && b.role !== 'decorative') {
      if (!b.short?.trim()) problems.push(`La imagen ${b.id} no tiene descripción corta.`);
      if (!b.long?.trim()) problems.push(`La imagen ${b.id} no tiene descripción larga.`);
    }
    if (!b.role) problems.push(`La imagen ${b.id} no dice si es decorativa, informativa o imprescindible.`);
  }

  const nonFigureEmpty = page.blocks.filter((b) => b.class !== 'figure' && !b.text?.trim());
  if (nonFigureEmpty.length) {
    problems.push(`Hay bloques sin texto: ${nonFigureEmpty.map((b) => b.id).join(', ')}.`);
  }

  if (expectedPage !== undefined && page.page !== expectedPage) {
    problems.push(`Dice que es la página ${page.page} y le pedí la ${expectedPage}.`);
  }

  if (problems.length) return { outcome: 'retry', problems };

  return { outcome: 'accept', page, flags: flagsFor(page) };
}

/**
 * What she must see, in the order FR-608 requires.
 *
 * None of these is a failure. `[UNREADABLE]` in particular is the *correct*
 * behaviour — the instructions ask the model to flag rather than guess, and an
 * instruction like that is only credible if the pipeline rewards obeying it.
 */
export function flagsFor(page: ExtractedPage): Flag[] {
  const flags: Flag[] = [];

  for (const b of page.blocks) {
    for (const [where, text] of [['texto', b.text], ['descripción', b.short], ['descripción', b.long]] as const) {
      if (text?.includes('[UNREADABLE')) {
        flags.push({
          kind: 'unreadable', blockId: b.id,
          message: `Hay algo que no se ha podido leer en la ${where} de ${b.id}. Mira la foto y escríbelo tú.`,
        });
      }
    }
  }

  for (const b of page.blocks) {
    if (b.class === 'figure' && b.role === 'essential') {
      flags.push({
        kind: 'essential-figure', blockId: b.id,
        message: `La imagen ${b.id} es imprescindible para entender el ejercicio. Comprueba que la descripción dice lo que hace falta.`,
      });
    }
  }

  /*
   * Numbering: evidence, not a rule.
   *
   * A worksheet may genuinely restart numbering per section, and rejecting that
   * throws away a good extraction. But a renumbered exercise is exactly the
   * error that reads perfectly plausibly, so it is surfaced.
   */
  const numbers = page.blocks
    .filter((b) => b.class === 'exercise' && b.number)
    .map((b) => ({ id: b.id, n: leadingNumber(b.number!) }))
    .filter((x): x is { id: string; n: number } => x.n !== null);

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i]!.n < numbers[i - 1]!.n) {
      flags.push({
        kind: 'numbering', blockId: numbers[i]!.id,
        message: `La numeración va hacia atrás en ${numbers[i]!.id}. Puede ser correcto si la ficha empieza a contar de nuevo, pero míralo.`,
      });
      break;
    }
  }

  for (const note of page.notes) {
    flags.push({ kind: 'note', message: note });
  }

  return flags;
}

/** `"3.a"` → 3, `"b)"` → null. The printed string is never modified. */
function leadingNumber(raw: string): number | null {
  const m = /^\s*(\d+)/.exec(raw);
  return m ? Number(m[1]) : null;
}

export const pageIsFlagged = (v: Verdict): boolean =>
  v.outcome === 'accept' && v.flags.length > 0;

export { hasUnreadable };
