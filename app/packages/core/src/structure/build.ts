import { matchWord, type Match } from '../pictograms/match.js';
import type { PictogramSet } from '../pictograms/set.js';
import { irToMarkdown } from '../ingest/to-ir.js';
import type { Block, BlockClass, IRDocument } from '../ir/types.js';

/**
 * Agendas, sequences and social stories, assembled (028 T003, FR-2602/2603/2605/2606).
 *
 * ## What a PT actually builds first
 *
 * With a new TEA learner the first thing she makes is not an adapted worksheet — it is
 * the day on a strip, the steps of a routine, and often a story about one situation. Every
 * piece of that already existed here: a local pictogram set, a deterministic renderer, the
 * profile. What was missing was a door.
 *
 * ## Deterministic, and that is what makes it free
 *
 * No clock (`created` arrives from the caller), no randomness, no model. Same arguments,
 * same document, byte for byte — which is what makes «reprint the March one» mean
 * something, and what makes an agenda cost nothing to produce.
 *
 * ## The builder resolves nothing
 *
 * Every drawing comes from `matchWord`: override ▸ vocabulary ▸ set ▸ nothing. There is
 * no lookup in this file and no access to the set's keyword maps — a test asserts that at
 * source level, because a second lookup is how four rungs quietly become five and the
 * fork shows up as one word getting different pictures on an agenda and on a worksheet.
 *
 * The consequence worth stating: a word she chose while building an agenda is chosen for
 * her worksheets too, and a word she overrode for one child stays overridden here.
 *
 * ## Refusal over guessing
 *
 * `ambiguous` and `none` become **declared gaps** — the word on the page, no `data-picto`,
 * and the screen saying there is no drawing. Never a guessed id: a plausible-but-wrong
 * pictogram on a strip a child reads to know what happens next is worse than a blank.
 */

export type StructureKind = 'agenda' | 'secuencia' | 'historia';

export interface StructureItem {
  /** The moment or step, in her words. This is what `matchWord` is asked about. */
  word: string;
  /** A longer label to print, when the word alone is too terse to read on a strip. */
  label?: string;
}

export interface BuildArgs {
  kind: StructureKind;
  title?: string;
  /** Her order **is** the order: nothing here sorts, dedupes or completes it. */
  items: readonly StructureItem[];
  language: string;
  set: PictogramSet;
  /** The opaque code. It reaches the front matter and never a rendering (FR-2608). */
  forLearner: string;
  /** The date, passed in — a pure function that reads the clock cannot be asserted. */
  created: string;
  /** This learner's overrides (`018`). Beat everything else. */
  overrides?: Readonly<Record<string, string>>;
  /** Her vocabulary for this language (`024`). Beaten by overrides, beats the set. */
  chosen?: ReadonlyMap<string, string>;
  /** Words that are names, normalised by the shell. Never get a drawing (`018` FR-1610). */
  names?: ReadonlySet<string>;
}

export interface Built {
  doc: IRDocument;
  /** The IR as it is written to `ir.md`. */
  markdown: string;
  /**
   * Every item that got no drawing, verbatim from `matchWord`.
   *
   * `ambiguous` ones feed the chooser `024` already has; `none` ones are stated gaps the
   * screen prints as such. A `name` never appears here — reporting it would put a child's
   * name in a report, which is the thing `018` FR-1610 exists to prevent.
   */
  gaps: Match[];
}

/** The block class each kind uses. The renderer styles these; nothing else branches. */
const CLASS: Record<StructureKind, BlockClass> = {
  agenda: 'agenda-moment',
  secuencia: 'secuencia-step',
  historia: 'explanation',
};

export function buildStructure(args: BuildArgs): Built {
  const blocks: Block[] = [];
  const gaps: Match[] = [];

  args.items.forEach((item, i) => {
    const match = matchWord(item.word, args.set, {
      language: args.language,
      ...(args.overrides ? { overrides: args.overrides } : {}),
      ...(args.chosen ? { chosen: args.chosen } : {}),
      ...(args.names ? { names: args.names } : {}),
    });

    /*
     * A name is not a gap. It gets no drawing and no report line: the word prints, and
     * nothing anywhere records that this teacher wrote a child's name into an agenda.
     */
    if (match.kind !== 'matched' && match.kind !== 'name') gaps.push(match);

    const attrs: Record<string, string> = {};
    if (match.kind === 'matched') {
      /*
       * The same `word=id@publisher` form `applyPictograms` writes and `parsePicto`
       * reads, so the renderer's pictogram cells, named gaps, alt text and derived
       * attribution all work unchanged.
       *
       * The publisher is not decoration: `attributionFor` keys the credit on it. Written
       * as `word=id` alone, a page full of ARASAAC drawings printed «Pictogramas del
       * juego que tienes puesto» instead of naming Sergio Palao and CC BY-NC-SA — a
       * credit that is not false but is not the attribution the licence asks for either,
       * on the one document that leaves the school. Caught by the test written first.
       */
      const publisher = args.set.from.get(match.id);
      attrs['data-picto'] = publisher
        ? `${item.word}=${match.id}@${publisher}`
        : `${item.word}=${match.id}`;
    }
    // Numbered for a sequence, because the order is the content there rather than a
    // layout choice — «primero el jabón» is the step, not its position on the page.
    if (args.kind === 'secuencia') attrs['data-number'] = String(i + 1);

    blocks.push({
      id: `s${i + 1}`,
      classes: [CLASS[args.kind]],
      attrs,
      content: item.label ?? item.word,
      line: 1 + i * 3,
      notices: [],
    });
  });

  const doc: IRDocument = {
    frontMatter: {
      /*
       * `source: structure` is what `isGenerated` widens by. It is deliberately not one of
       * `material-kinds.md`'s four: those govern **adaptation** judgement, and this
       * material is never adapted.
       */
      source: 'structure',
      structure: args.kind,
      for_learner: args.forLearner,
      language: args.language,
      ...(args.title ? { title: args.title } : {}),
      created: args.created,
    },
    blocks,
    notices: [],
  };

  return { doc, markdown: irToMarkdown(doc), gaps };
}
