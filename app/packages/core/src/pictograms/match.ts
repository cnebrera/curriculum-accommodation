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
 * 1. **A name is never matched** (FR-1610), even if the set has a keyword for it.
 * 2. **This learner's override wins** (FR-1612) — the per-child exception.
 * 3. **Then her vocabulary** (`024` FR-2214): what she chose once, for every learner.
 * 4. Normalise, and infer nothing further.
 * 5. **Exactly one, or nothing.** Several candidates is an omission plus a report
 *    line; none is a silent omission.
 *
 * ## The rung `024` added, and the one it did not
 *
 * Her vocabulary sits **between** the learner's override and the set, because «which
 * drawing is *recreo* in my school» is a different kind of fact from «this child needs
 * a different one». `018` had only the first, stored per learner — so she would have
 * chosen the same picture once per child in her caseload. Carlos: «lo bajo una vez y lo
 * uso para todos los que lo necesiten.»
 *
 * What did **not** change is step 5. A word she has not chosen for, with four
 * candidates, still gets **nothing** (`024` FR-2216). The chooser adds a way to answer
 * the question; it does not answer it for her, and popularity does not either — the
 * publisher's download count orders what arrives, never what is used.
 */

export type Match =
  | { kind: 'matched'; word: string; id: string; source: 'set' | 'override' | 'vocabulary' }
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
  /**
   * Her vocabulary for this language: normalised word → the id she chose
   * (`024` FR-2214). Beaten by `overrides`, beats the set.
   *
   * `chosen` and **not** `vocabulary`, because in this module that word is already
   * taken twice: `PictoScope` has a `'vocabulary'` member and `ApplyOptions.vocabulary`
   * is the unit's key word list. Third name collision of the day — after `inScope` and
   * `Candidate` — and the only one the compiler could not have caught, because it would
   * have type-checked while meaning something else entirely.
   */
  chosen?: ReadonlyMap<string, string>;
}

/**
 * Full names → the normalised single words a lookup can actually find.
 *
 * ## Why this is a function and not two lines at the call site
 *
 * It **was** two lines at the call site, in `jobs/adapt.ts`:
 * `new Set([...names.values()].map((n) => n.toLowerCase()))`. Wrong twice, and both
 * ways had the same consequence — a child's name with a pictogram beside it, which is
 * exactly what FR-1610 exists to prevent:
 *
 * 1. **Accents.** `matchWord` looks up `normalise(word)`, which folds them. «María»
 *    is asked about as `maria`; the set held `maría`; the check missed. Half the names
 *    in a Spanish classroom are accented.
 * 2. **Whole names.** A stored name is «María Nebrera», and `matchWord` is asked about
 *    one word at a time. Neither part was ever in the set, so even unaccented names
 *    missed.
 *
 * Here, in `core`, because it is a pure string function and this is where it can be
 * tested by the offline suite. It is given names by its caller and never learns one:
 * the same arrangement `redact` has.
 *
 * Particles are dropped at two letters — «de», «la», «di». «la» in this set would
 * strip a word from every sentence she writes.
 */
export function nameWords(fullNames: Iterable<string>): Set<string> {
  const words = new Set<string>();
  for (const full of fullNames) {
    for (const piece of full.split(/[\s'\-]+/)) {
      const key = normalise(piece);
      if (key.length > 2) words.add(key);
    }
  }
  return words;
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

  /*
   * Her vocabulary, and it is recorded as its own `source` rather than folded into
   * `'override'` (Principle VI). A pictogram she chose and one the set decided are
   * different decisions, and a wrong one has to trace back to whichever it was — the
   * whole argument for `data-picto` carrying word→id in the first place.
   */
  const chosen = opts.chosen?.get(key);
  if (chosen) return { kind: 'matched', word, id: chosen, source: 'vocabulary' };

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

/**
 * The words out of `reportSkipped`'s own lines (024 T019).
 *
 * ## Why this lives here and not in the renderer
 *
 * Because it parses the sentence the function directly above it writes, and the two
 * have to move together. In the renderer it would be a regular expression matching
 * prose produced in another package — which works until somebody improves the wording
 * and the chooser quietly stops offering anything, with no test failing.
 *
 * Beside it, the pairing is visible and `pictogram-fetch.test.ts` asserts the round
 * trip. Twelve times in this project a field has been written by one place and read by
 * nobody; this is the same failure shape with a string instead of a field.
 */
export function skippedWords(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = /^«([^»]+)»: hay \d+ dibujos posibles/.exec(line);
    if (m?.[1]) out.push(normalise(m[1]));
  }
  return [...new Set(out)];
}

/** True where the set has an image file for this id (FR-1616's other half). */
export const hasImage = (set: PictogramSet, id: string): boolean => set.images.has(id);
