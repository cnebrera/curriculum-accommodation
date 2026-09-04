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
 * Hers. Attribution is required for **any** use of a CC BY-NC-SA work, so a rendering
 * pipeline that dropped the credit would make her sheet the infringing document rather
 * than ours. That is why this is not a courtesy.
 *
 * The earlier version of this paragraph said «a sheet with a pictogram on it is a
 * derivative work», and that is not right — §3(b) attaches ShareAlike to **adapted
 * material**, and an unmodified pictogram inside her worksheet makes a collection. The
 * conclusion here is unchanged, because BY applies either way; the reasoning was
 * wrong, and it was the reasoning that reached her screen (backlog G28).
 */

/** What a set says about itself, when the set's own metadata carries it. */
export interface Attribution {
  author: string;
  source: string;
  licence: string;
}

/**
 * `ARASAAC_ATTRIBUTION` is gone (review COD-08, decision P40).
 *
 * It was a default parameter of `attributionFor`, and **both call sites called it
 * with no second argument** — so the alternative-attribution parameter was dead
 * and the constant was the only thing that ever printed. A teacher using a set
 * that is not ARASAAC's — the case `018` FR-1604 exists to support, a folder she
 * assembled with its own LICENSE, which `readSet` reads and shows her and never
 * passed to the render — printed «Autor pictogramas: Sergio Palao · Origen:
 * ARASAAC · Licencia: CC BY-NC-SA» on every sheet. **A false attribution, which
 * is legally worse than a missing one.**
 *
 * Where the credit lives now: the publisher catalogue in
 * `instructions/pictograms.md` (`attribution.author`, `attribution.owner`,
 * `attribution.source`, `licence`), which is where `023` already put it, plus the
 * set's own LICENSE for a set she built herself. Nothing in `packages/core` names
 * a publisher.
 */

/** Every source this document actually used, in the order they first appear. */
export function pictogramSources(doc: IRDocument): string[] {
  const seen: string[] = [];
  for (const b of doc.blocks) {
    const raw = b.attrs['data-picto'];
    if (typeof raw !== 'string' || !raw) continue;
    for (const pair of raw.split(/\s+/).filter(Boolean)) {
      const eq = pair.lastIndexOf('=');
      if (eq < 0) continue;
      const at = pair.indexOf('@', eq);
      // No publisher recorded is its own answer, and the caller keys it as `''` —
      // «whatever set she has configured», never a particular one.
      const from = at < 0 ? '' : pair.slice(at + 1);
      if (!seen.includes(from)) seen.push(from);
    }
  }
  return seen;
}

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
  doc: IRDocument,
  /**
   * What each source this document used says about itself.
   *
   * **Required, with no default** — that is the fix. It had a default of ARASAAC's
   * credit and both callers took it, so the parameter was dead and the constant
   * always won. A required parameter cannot be forgotten by anybody, and there is
   * no longer a literal for it to fall back to.
   *
   * Keyed by publisher id, with `''` for «the set she has configured», which is
   * what a pictogram recorded before publishers existed is.
   */
  credits: ReadonlyMap<string, Attribution>,
): string | null {
  if (!hasPictograms(doc)) return null;

  const lines = pictogramSources(doc).map((from) => {
    const credit = credits.get(from);
    if (credit) {
      return `Autor pictogramas: ${credit.author} · Origen: ${credit.source}`
        + ` · Licencia: ${credit.licence}`;
    }
    /*
     * A source nobody can describe is **said**, not guessed at.
     *
     * This is the branch the old code could not have: it printed a credit it had
     * no evidence for. Naming the source and pointing at the licence file in the
     * set is honest and cannot be false — and it tells her exactly what to fix.
     */
    return from
      ? `Pictogramas de «${from}» · la licencia es la que traiga ese juego`
      : 'Pictogramas del juego que tienes puesto · la licencia es la de su fichero LICENSE';
  });

  // Several sources, several lines: a set built from two publishers credits both,
  // which is FR-2116's whole reason for existing.
  return lines.join('\n');
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
