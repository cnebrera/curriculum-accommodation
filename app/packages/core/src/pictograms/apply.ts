import type { Block, IRDocument } from '../ir/types.js';
import { matchWord, reportSkipped, type Match, type MatchOptions } from './match.js';
import type { PictogramSet } from './set.js';

/**
 * Inserting pictograms into the IR (018 T012/T013, FR-1605…1611).
 *
 * ## Why this is not a recipe
 *
 * A recipe is selected by an axis and applied by a model. Both are wrong here.
 *
 * **No axis value may enable this family** (FR-1605), so a pictogram recipe would
 * have no selection criterion — it would either never fire or always fire. And
 * inserting a pictogram is `keyword → id → file`, which is a lookup, not judgement:
 * a recipe telling a model to pick the picture for each key noun is exactly what
 * FR-1608 forbids.
 *
 * So `selectRecipes` never sees pictograms, and there is **no code path in which an
 * axis value reaches this function**. That is the structural half of Principle V,
 * the same way `015` made a ranking unexpressible rather than forbidden.
 *
 * ## What decides, then
 *
 * `profile.pictograms.enabled`, set by her, with a date. This function takes the
 * decision as an argument and has no access to a profile's axes — so it cannot
 * consult one even by mistake.
 */

/**
 * Where she wants them: everywhere, on instructions only, or on key vocabulary
 * only. From `instructions/pictograms.md`, where each one says when it helps.
 *
 * Named `PictoScope` rather than `Scope` because `memory/index.ts` already owns
 * that name for a correction's scope — and a name that means two things in one
 * codebase is one somebody reads as the other. The compiler caught it, as it caught
 * `Verdict` in `002`.
 */
export type PictoScope = 'all' | 'instructions' | 'vocabulary';

export interface ApplyOptions extends MatchOptions {
  scope: PictoScope;
  /**
   * The unit's key vocabulary, for `scope: 'vocabulary'`.
   *
   * Passed in rather than guessed: «which words are the new ones» is a judgement
   * about the unit, and inferring it from frequency would put a picture beside
   * whatever happened to repeat.
   */
  vocabulary?: readonly string[];
  /** True where the material is an assessment (`012`). Changes what is allowed. */
  isExam?: boolean;
}

export interface Applied {
  doc: IRDocument;
  /** Which pictogram went where, for provenance and for the report (FR-1611). */
  used: Array<{
    blockId: string; word: string; id: string;
    source: 'set' | 'override' | 'vocabulary';
  }>;
  /** Ambiguities, in her language (FR-1609). */
  skipped: string[];
}

/**
 * A block that may carry pictograms, under the scope she chose.
 *
 * `report-notes` is never learner-facing, and `scaffold` is exempt because a
 * pictogram on a worked example is decoration on a thing that is already support.
 */
/**
 * Exported for its own test only, since `024` deleted `wordlist.ts`.
 *
 * `pictogramInScope` and not `inScope`: `recipes/index.ts` already exports that name,
 * and this project has now had `Verdict` three times and `Freshness` twice. The
 * collision was caught by the barrel file at the moment of export rather than by a
 * confusing import six weeks from now.
 */
export function pictogramInScope(b: Block, scope: PictoScope): boolean {
  if (b.classes.includes('report-notes')) return false;
  if (scope === 'all') return true;
  if (scope === 'instructions') return b.classes.includes('instruction');
  // `vocabulary` is filtered by word rather than by block.
  return true;
}

/**
 * A question whose subject is the word itself.
 *
 * **The exam rule** (T013, `012`, Principle III). A pictogram beside «rana» in a
 * vocabulary test supplies the answer, and that is not changing the presentation —
 * it is changing what is asked. `012` FR-1006 lets presentation move in an
 * assessment and nothing else.
 *
 * Deliberately broad: it fires on any assessment block that quotes the word, asks
 * «qué significa», «qué es» or «cómo se dice». A false positive costs one missing
 * picture; a false negative costs a child's mark.
 */
function asksAboutTheWord(b: Block, word: string): boolean {
  const text = b.content.toLowerCase();
  const w = word.toLowerCase();
  if (/qué (significa|es|quiere decir)|cómo se (dice|llama)|define|señala el dibujo/.test(text)) {
    return true;
  }
  // The word in quotes is the shape of a question about the word.
  return new RegExp(`[«"'”]\\s*${escapeRe(w)}\\s*[»"'”]`).test(text);
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function applyPictograms(
  doc: IRDocument, set: PictogramSet, opts: ApplyOptions,
): Applied {
  const used: Applied['used'] = [];
  const matches: Match[] = [];
  const wanted = opts.scope === 'vocabulary'
    ? new Set((opts.vocabulary ?? []).map((v) => v.toLowerCase()))
    : null;

  for (const b of doc.blocks) {
    if (!pictogramInScope(b, opts.scope)) continue;

    const words = new Set(
      (b.content.match(/\p{L}[\p{L}\p{M}'-]*/gu) ?? []).map((w) => w),
    );

    const here: string[] = [];
    for (const word of words) {
      if (wanted && !wanted.has(word.toLowerCase())) continue;

      const m = matchWord(word, set, opts);
      matches.push(m);
      if (m.kind !== 'matched') continue;

      /*
       * The exam rule, checked per word and per block rather than per document: a
       * worksheet may contain one assessment block, and a pictogram is fine on the
       * rest of it.
       */
      if ((opts.isExam || b.classes.includes('assessment')) && asksAboutTheWord(b, word)) {
        continue;
      }

      /*
       * And **where the picture came from** (`023` FR-2116, decision P40).
       *
       * `word=id@publisher`, with the publisher omitted when the set does not
       * record one — which is every set assembled by hand. Recorded in the
       * document because that is where the attribution is derived from: a sheet
       * built from two sources has to credit both, and until this existed the
       * render printed one publisher's credit over all of them. A false
       * attribution is legally worse than a missing one.
       */
      const publisher = set.from.get(m.id);
      here.push(publisher ? `${word}=${m.id}@${publisher}` : `${word}=${m.id}`);
      used.push({ blockId: b.id, word, id: m.id, source: m.source });
    }

    /*
     * `data-picto` records **which id for which word** (FR-1611, Principle VI). A
     * wrong pictogram then traces to a decision rather than to a mystery — and the
     * word is in there because the id alone cannot be checked by a human reading
     * the document.
     */
    if (here.length > 0) b.attrs['data-picto'] = here.join(' ');
  }

  return { doc, used, skipped: reportSkipped(matches) };
}

/**
 * What `data-picto` holds, parsed back.
 *
 * `word=id` or `word=id@publisher`. The publisher is optional and its absence is
 * the state of every sheet made before it was recorded — read as «the set she has
 * configured», never as a particular publisher, which is the whole point of
 * recording it (P40).
 */
export function parsePicto(
  value: string | undefined,
): Array<{ word: string; id: string; from?: string }> {
  if (!value) return [];
  return value.split(/\s+/).filter(Boolean).map((pair) => {
    const at = pair.lastIndexOf('=');
    if (at < 0) return { word: pair, id: '' };
    const word = pair.slice(0, at);
    const rest = pair.slice(at + 1);
    // Ids are digits and ASCII letters (`fetch.ts`'s allowlist), so `@` cannot be
    // part of one — which is what makes it a safe separator rather than a guess.
    const sep = rest.indexOf('@');
    return sep < 0
      ? { word, id: rest }
      : { word, id: rest.slice(0, sep), from: rest.slice(sep + 1) };
  }).filter((p) => p.id !== '');
}

/**
 * Write the pairs into the raw markdown, by block id (031 T003, research R1).
 *
 * ## The defect this closes
 *
 * `applyPictograms` sets `data-picto` on the **parsed** document, and `adapt.ts` writes
 * `result.out` — the raw, pre-mutation model output. So the pairs never reached the file.
 * Meanwhile `print.ts` reads them back **from the file**, under a comment saying «what is
 * on the sheet was decided when it was adapted»: a read of a value nothing persisted.
 *
 * No test caught it because none round-tripped adapt → disk → print. It is this project's
 * signature defect with the write and the read separated by a file, and `031` needs the
 * pairs on disk to answer «is this sheet's drawing still the one she uses?» at all.
 *
 * ## String work, not a re-serialisation
 *
 * The alternative — `irToMarkdown(mutated)` — would rewrite her whole document: block
 * order, attribute order, whitespace, the model's own line breaks. The vault is hers to
 * read, and a diff that changes every line to add one attribute is a diff she cannot
 * read. So this patches the attribute list of the named blocks and touches nothing else.
 */
export function stampPicto(
  raw: string, perBlock: ReadonlyMap<string, string>,
): string {
  if (perBlock.size === 0) return raw;
  /*
   * `::: {#b3 .instruction data-picto="…"}` — the opening line of a block, by id.
   *
   * An existing `data-picto` is replaced rather than appended to: re-adapting a sheet
   * comes back through here and must stamp what *this* run decided, not the union of
   * every run. Same rule as `stampReading` beside it.
   */
  return raw.replace(/^::: \{#([A-Za-z0-9_-]+)([^}]*)\}/gm, (whole, id: string, rest: string) => {
    const pairs = perBlock.get(id);
    if (pairs === undefined) return whole;
    const without = rest.replace(/\s*data-picto="[^"]*"/g, '');
    return `::: {#${id}${without} data-picto="${pairs}"}`;
  });
}
