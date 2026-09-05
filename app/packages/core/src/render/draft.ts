import { isGenerated, isSignedOff, type HasFrontMatter } from '../ir/types.js';

/**
 * The draft mark (Principle VII, 002 T016).
 *
 * ## Why it lives here and not in each renderer
 *
 * Because there are two renderers and one fact. HTML and ODF both announce the
 * draft, and a mark that each of them decides for itself is a mark that can
 * disagree — which is how a document ends up unmarked in the format she actually
 * prints. Same reasoning as `isSignedOff`: derived from the document, never passed
 * in by a screen.
 *
 * ## Why generated material says more
 *
 * Everywhere else in Rampa the draft mark means «her adaptation has not been
 * reviewed» — there was an original, and the question is whether the changes to it
 * are right. Composed material has no original: **nobody has read this content at
 * all.** The exercises were proposed by a model, and what code could check it
 * checked (the arithmetic is exact, the constraints hold, the level is bounded
 * where the corpus knew it) — but whether these exercises teach what she wanted,
 * in the order that makes sense, is unexamined.
 *
 * A teacher who reads «pendiente de revisión docente» on a composed sheet will
 * review it the way she reviews the others: checking the adaptation. That is the
 * wrong review, and it is a review that passes.
 */
export interface DraftMark {
  /** The banner on screen and at the top of the page. */
  banner: string;
  /** The per-page watermark, so a separated sheet still announces itself. */
  watermark: string;
}

export function draftMark(doc: HasFrontMatter, signedOff?: boolean): DraftMark | null {
  // Signed off is signed off, in both directions: she has read it and said so,
  // and a mark she cannot remove is a mark she works around.
  if (signedOff === true || isSignedOff(doc)) return null;

  /*
   * The adaptation document says something else again (P46, review COD-22).
   *
   * Not «no entregar al alumnado» — nobody was ever going to hand one of these to a
   * child. What must not happen to it is being **filed**, and the way an unreviewed
   * draft gets filed is a copy-paste out of the printed page. So the mark names that,
   * and it is the only banner in Rampa that talks about where a document must not go
   * rather than to whom.
   *
   * ## Why this text is not a corpus phrase (`029` FR-2709)
   *
   * Because the draft mark is Principle VII and Principle VII is a guard. A corpus
   * supplies what a document is *called*; it has no field for the mark, and it must not
   * — a banner a stranger's Markdown file could word is a banner it could empty. So this
   * says «no lo presentes» rather than naming a platform: territory-neutral because it
   * is code's, not because a territory was blanked out of it.
   */
  if (doc.frontMatter['kind'] === 'acns') {
    return {
      banner: 'BORRADOR de adaptación curricular — sin firmar · no lo presentes todavía',
      watermark: 'BORRADOR — SIN FIRMAR',
    };
  }

  if (isGenerated(doc)) {
    return {
      banner: 'BORRADOR — CONTENIDO GENERADO, SIN REVISAR · revisa el contenido, '
        + 'no sólo la adaptación · no entregar al alumnado',
      watermark: 'BORRADOR — CONTENIDO SIN REVISAR',
    };
  }

  return {
    banner: 'BORRADOR — pendiente de revisión docente · no entregar al alumnado',
    watermark: 'BORRADOR — PENDIENTE DE REVISIÓN',
  };
}
