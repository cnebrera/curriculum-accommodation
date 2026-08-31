/**
 * What a learner's record is made of (014 T002, FR-1203).
 *
 * Every field comes from a file that already exists. `005` writes them; this
 * reads them back the other way round — from the learner rather than from the
 * job — which is the whole feature.
 */

/** Where the material came from, and what "the original" therefore means. */
export type RecordSource =
  /** A photograph, a PDF or a Word file she brought (008). */
  | { of: 'file'; paths: string[] }
  /**
   * Text she pasted (001). The source and the read text are the **same
   * document**, and the record says so rather than showing an empty "original".
   *
   * Without this case, an implementation looking for `material/<job>/source/`
   * and finding it absent would reasonably report a missing document — so the
   * commonest entry point would report a fault. See `research.md`.
   */
  | { of: 'pasted' }
  /** Composed from objectives (002). The "original" is what she asked for. */
  | { of: 'composed'; objectives: string[]; anchor?: string };

export interface RecordDocuments {
  /** What Rampa read: `material/<job>/ir.md`. */
  ir: string;
  /**
   * The learner's sheet — **absent while a composed job is still unadapted**
   * (`016` T006).
   *
   * It was required until composing existed, because every job arrived by being
   * ingested and only became a learner's when it was adapted. A composed job is
   * hers from the moment it is written: she asked for it for this child, and the
   * `ir.md` records `composed_for`. If it appeared in no record until it had been
   * adapted, she would compose, be interrupted, and find nothing — which is the
   * opposite of «todo lo que se genere se queda ligado al alumno».
   */
  adapted?: string;
  /** The answer key and the composition report, for a composed job (`002`). */
  answers?: string;
  composeReport?: string;
  report?: string;
  /** Superseded versions, oldest first (001). */
  revisions: string[];
  /** What she prints: everything under `output/<job>/<code>/`. */
  rendered: string[];
}

export interface RecordEntry {
  jobId: string;
  /** The code. The name is resolved for display and never written beside it. */
  learner: string;
  /** ISO date, stamped when the adaptation was written — not read from a model. */
  date: string;
  /** e.g. `2025-2026`. Stored, so a record read next August still says May's year. */
  schoolYear: string;
  /** `012`'s material kind. `'material'` until `012` ships. */
  kind: string;
  subject?: string;
  objectives?: string[];
  /** Principle VII: an unsigned draft appears in the record, marked. */
  signedOff: boolean;
  /** 1 for the original; higher when she has corrected it (001). */
  revision: number;
  /**
   * Composed and not yet adapted (`016` T006).
   *
   * A state, not a fault. She has a sheet; nobody has presented it for this
   * learner yet, and the record says which of the two it is rather than showing a
   * row that looks finished.
   */
  pending?: boolean;
  source: RecordSource;
  documents: RecordDocuments;
  /**
   * Paths in `documents` that are not on disk (FR-1206).
   *
   * A field, not a filter. A record that silently dropped rows whose files it
   * could not find would tidy away her history to keep its own list clean —
   * which is the opposite of what she opens it for.
   */
  missing: string[];
}

/**
 * The school year a date falls in.
 *
 * September–June is right in Spain and wrong in the southern hemisphere, so the
 * boundary month belongs in the education corpus of `011` and is passed in. The
 * default is here only so a caller that has no corpus loaded still records
 * something rather than nothing.
 */
export function schoolYearOf(iso: string, startsInMonth = 9): string {
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m) return '';
  return (m >= startsInMonth) ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
