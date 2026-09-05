/**
 * What a learner's record is made of (014 T002, FR-1203).
 *
 * Every field comes from a file that already exists. `005` writes them; this
 * reads them back the other way round — from the learner rather than from the
 * job — which is the whole feature.
 */
import type { DocumentFreshness } from '../ir/freshness.js';

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
  | { of: 'composed'; objectives: string[]; anchor?: string }
  /**
   * Structure material (`028`): an agenda, a sequence of steps, a social story.
   *
   * Its own case rather than folded into `composed`, because the record's row is what she
   * reads to find something again — and «compuesto a partir de objetivos: —» is what an
   * agenda would say folded in there: a row describing the wrong kind of work with an
   * empty list where the explanation should be.
   */
  | { of: 'structure'; kind: string };

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
  /**
   * Which revision she signed, when it is not the current one (`026` FR-2412).
   *
   * `signedOff` is about the working file, so a turn after a sign-off turns it `false` —
   * and the record would then answer «sin firmar» about a document she remembers signing.
   * Both halves matter to her six weeks later: that revision 2 was signed, and that there
   * is a revision 3 nobody has read.
   */
  signedRevision?: number;
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
  /**
   * Whether this sheet was made from the reading that is on disk now (005 FR-520).
   *
   * Derived here rather than reported only at the moment of the correction, because
   * the correction is seen once and «¿cuál de estas fichas es de antes de que lo
   * arreglara?» is a question she asks a week later with the folder in her hand.
   *
   * Absent while a composed job has no sheet: there is nothing to be stale.
   */
  /**
   * Both axes (`031` FR-2901/2903), where the sheet and its reading are both present.
   *
   * The type changed from `ReadingFreshness` rather than gaining a second field, so the
   * compiler finds every reader — which is the point: `024` FR-2218's deferral was
   * «satisfied by a comment» precisely because nothing forced the readers to notice a
   * second axis existed.
   */
  freshness?: DocumentFreshness;
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
