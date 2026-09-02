import type { IRDocument } from '../ir/types.js';
import { normalise } from './set.js';
import { pictogramInScope, type PictoScope } from './apply.js';

/**
 * The words that will leave her machine (023 T003, FR-2108/2109/2110).
 *
 * ## This is the only list that goes out
 *
 * A fetch sends one vocabulary word per request to a server in Aragón. That is the
 * first outbound request in this application that is not to her AI provider, and
 * `009` and `011` spent two specifications keeping a child's name off a disk **she
 * owns**. A name leaving for a third party would undo that from a direction nobody
 * was watching, so the removal happens here, once, and everything that fetches goes
 * through this function.
 *
 * ## Why the names are passed in
 *
 * The same boundary `matchWord` already has: the encrypted name map lives in the
 * shell and `packages/core` never learns a learner's name. Passing them in keeps that
 * intact and keeps this testable — and it is why `namesRemoved` is returned as a
 * **count** rather than as the names: a function that reported which names it had
 * dropped would be a function that had them, in a return value somebody logs.
 *
 * ## What this cannot do
 *
 * A first name that is also a common noun — «Rosa», «Olivia», «Sol» — is
 * indistinguishable from the flower, the tree and the star once it is a word in a
 * list. `018` FR-1610 removes the names Rampa **knows**; this removes the same ones.
 * Stated in `023`'s assumptions rather than pretended away.
 */

export interface WordList {
  /** Normalised, deduplicated, in the order first seen. */
  words: string[];
  language: string;
  /** How many words were dropped for being a name. Never *which* ones. */
  namesRemoved: number;
}

export interface WordListOptions {
  language: string;
  /** Normalised names, from the caller's own name knowledge (`009`). */
  names?: ReadonlySet<string>;
  scope?: PictoScope;
}

/**
 * Rejected before a name check even runs: anything that is not a plain word.
 *
 * A digit, a URL fragment, an underscore — none of them are vocabulary, and a
 * publisher's search endpoint has no business receiving them. Narrower than the
 * matcher's own pattern on purpose: the matcher is reading her disk, this is
 * choosing what to transmit.
 */
const WORD = /^\p{L}[\p{L}\p{M}'-]*$/u;

/** Longer than any Spanish word she would put on a worksheet. */
const MAX_LENGTH = 40;

export function wordListFrom(
  doc: IRDocument, opts: WordListOptions,
): WordList {
  const scope = opts.scope ?? 'all';
  const seen = new Set<string>();
  const words: string[] = [];
  let namesRemoved = 0;

  for (const b of doc.blocks) {
    if (!pictogramInScope(b, scope)) continue;
    for (const raw of b.content.match(/\p{L}[\p{L}\p{M}'-]*/gu) ?? []) {
      const key = normalise(raw);
      if (!key || key.length > MAX_LENGTH || !WORD.test(key)) continue;
      if (seen.has(key)) continue;
      if (opts.names?.has(key)) { namesRemoved += 1; seen.add(key); continue; }
      seen.add(key);
      words.push(key);
    }
  }

  return { words, language: opts.language, namesRemoved };
}

/**
 * Words she typed in herself, through the same door.
 *
 * Same filter, same name removal. A separate path for hand-typed words is how the
 * one that skips the check gets written.
 */
export function wordListOf(
  raw: readonly string[], opts: WordListOptions,
): WordList {
  const seen = new Set<string>();
  const words: string[] = [];
  let namesRemoved = 0;

  for (const item of raw) {
    // A line she typed may be several words; each is its own request anyway.
    for (const piece of item.split(/[\s,;]+/)) {
      const key = normalise(piece);
      if (!key || key.length > MAX_LENGTH || !WORD.test(key)) continue;
      if (seen.has(key)) continue;
      if (opts.names?.has(key)) { namesRemoved += 1; seen.add(key); continue; }
      seen.add(key);
      words.push(key);
    }
  }
  return { words, language: opts.language, namesRemoved };
}
