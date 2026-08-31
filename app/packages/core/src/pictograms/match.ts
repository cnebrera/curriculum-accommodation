import { normalise, type PictogramSet } from './set.js';

/**
 * Matching a word to a pictogram (018 T009/T010, FR-1608…1612).
 *
 * **Deterministic lookup. No model chooses a picture.** A model choosing is the
 * wrong-pictogram failure with no traceability, and the wrong pictogram is worse
 * than none: the child reads the picture, she reads the text, and she may not
 * notice.
 *
 * The order is the contract, and every step of it is a refusal:
 *
 * 1. **Her override wins** (FR-1612). Her school uses a different picture for
 *    «recreo». That is not an error to correct.
 * 2. **A name is never matched** (FR-1610), even if the set has a keyword for it.
 * 3. Normalise, and infer nothing further.
 * 4. **Exactly one, or nothing.** Several candidates is an omission plus a report
 *    line; none is a silent omission.
 */

export type Match =
  | { kind: 'matched'; word: string; id: string; source: 'set' | 'override' }
  /** Several candidates. Omitted, and **reported** so she can choose (FR-1609). */
  | { kind: 'ambiguous'; word: string; candidates: string[] }
  /** No candidate. Omitted silently: most words have none. */
  | { kind: 'none'; word: string }
  /** A name. Never matched, and never reported as a miss either. */
  | { kind: 'name'; word: string };

export interface MatchOptions {
  language: string;
  /** Her overrides: word → pictogram id. Hers wins over the set's. */
  overrides?: Readonly<Record<string, string>>;
  /**
   * Words that are names, normalised by the caller's own name knowledge (`009`).
   *
   * Passed in rather than detected here: the encrypted name map lives in the
   * shell, and `core` never learns a learner's name — which is the one boundary in
   * this project that has no exceptions.
   */
  names?: ReadonlySet<string>;
}

export function matchWord(
  word: string, set: PictogramSet, opts: MatchOptions,
): Match {
  const key = normalise(word);
  if (!key) return { kind: 'none', word };

  /*
   * The name check runs **before** the override and before the set. «Lucía» must
   * get nothing even if her school's override names it and even if the set has a
   * keyword for it — a pictogram of a girl beside a child's own name on his
   * worksheet is not something either of them asked for.
   */
  if (opts.names?.has(key)) return { kind: 'name', word };

  const override = opts.overrides
    ? Object.entries(opts.overrides).find(([w]) => normalise(w) === key)?.[1]
    : undefined;
  if (override) return { kind: 'matched', word, id: override, source: 'override' };

  const candidates = set.byLanguage.get(opts.language)?.get(key) ?? [];
  if (candidates.length === 0) return { kind: 'none', word };
  if (candidates.length > 1) return { kind: 'ambiguous', word, candidates };

  return { kind: 'matched', word, id: candidates[0]!, source: 'set' };
}

/**
 * What she is told about the ones that were skipped.
 *
 * **Only the ambiguous ones.** A word with no pictogram is the ordinary case — most
 * words in most sentences — and listing each would bury the handful where the set
 * genuinely offers a choice she should make.
 */
export function reportSkipped(matches: readonly Match[]): string[] {
  return matches
    .filter((m): m is Extract<Match, { kind: 'ambiguous' }> => m.kind === 'ambiguous')
    .map((m) => `«${m.word}»: hay ${m.candidates.length} dibujos posibles `
      + `(${m.candidates.join(', ')}). No he puesto ninguno — elige tú.`);
}

/** True where the set has an image file for this id (FR-1616's other half). */
export const hasImage = (set: PictogramSet, id: string): boolean => set.images.has(id);
