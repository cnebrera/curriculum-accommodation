import type { IRDocument } from '../ir/types.js';

/**
 * The attribution line no setting can remove (018 T019, FR-1603).
 *
 * ## Why it is derived and takes no parameter
 *
 * `007` FR-509 found the defect this avoids: `job:render` used to take `signedOff`
 * **from the renderer**, so an unmarked worksheet could be produced with no
 * sign-off having happened — while the sign-off handler carried a comment
 * asserting the opposite. A licence condition passed as an argument is a licence
 * condition somebody passes `false`.
 *
 * So: `attributionFor(doc)` returns a line when the document contains a pictogram
 * and `null` when it does not. There is no option, no preference, and nothing to
 * set.
 *
 * ## Why it is at the foot and the draft mark is at the head
 *
 * The draft mark's job is to stop her handing the sheet out, so it must be the
 * first thing anybody sees. This is a legal line about a document that is otherwise
 * fine, and putting it above the child's first exercise costs him a line of
 * attention for a reason that is not about him.
 *
 * ## Whose infringement it would be
 *
 * Hers. A sheet with a pictogram on it is a derivative work under CC BY-NC-SA, and
 * a rendering pipeline that dropped the credit would make **her** sheet the
 * infringing document rather than ours. That is why this is not a courtesy.
 */

/** What a set says about itself, when the set's own metadata carries it. */
export interface Attribution {
  author: string;
  source: string;
  licence: string;
}

/**
 * The default is ARASAAC's required credit, because it is the set Spanish schools
 * have — and it is a **string**, not a dependency: nothing in code assumes that set
 * (FR-1604), and a different set overrides all three fields.
 */
export const ARASAAC_ATTRIBUTION: Attribution = {
  author: 'Sergio Palao',
  source: 'ARASAAC (https://arasaac.org) · Gobierno de Aragón',
  licence: 'CC BY-NC-SA',
};

/** True when this document has a pictogram on it anywhere. */
export const hasPictograms = (doc: IRDocument): boolean =>
  doc.blocks.some((b) => typeof b.attrs['data-picto'] === 'string' && b.attrs['data-picto'] !== '');

/**
 * The line, or `null` when the document carries no pictogram.
 *
 * `null` rather than an empty string, so a renderer that forgets to check gets
 * `"null"` in its output and somebody notices — an empty string would render as
 * nothing and hide the mistake.
 */
export function attributionFor(
  doc: IRDocument, attribution: Attribution = ARASAAC_ATTRIBUTION,
): string | null {
  if (!hasPictograms(doc)) return null;
  return `Autor pictogramas: ${attribution.author} · Origen: ${attribution.source}`
    + ` · Licencia: ${attribution.licence}`;
}

/**
 * The text alternative for one pictogram (FR-1614).
 *
 * The word itself, because that is what the picture means and because the same
 * sheet may be read by a screen reader — a picture with no alt is a hole in the
 * document. It also does double duty for `instructions/pictograms.md`'s rule that a
 * pictogram is never printed without its word: colour alone carries nothing on a
 * greyscale photocopy.
 */
export const pictogramAlt = (word: string): string => `pictograma de «${word}»`;
