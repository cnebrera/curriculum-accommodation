/**
 * The smallest deterministic Spanish morphology that is safe here
 * (review AGE-05, decision P20).
 *
 * ## What was wrong
 *
 * `matchWord` did an exact orthographic lookup. `normalise` folds accents, case and
 * whitespace and nothing else — by explicit design, documented in `set.ts` — and the
 * consequence is worse than low coverage: it is **inconsistent** coverage. «rana» gets
 * a picture and «ranas» does not, so the same word carries a drawing in one sentence
 * and not in the next. For a learner who reads by pictogram that is worse than a
 * consistent absence, because the absence looks like a difference in meaning.
 *
 * And the `instructions` scope — «sólo en lo que hay que hacer», the one that exists
 * so he can understand *what is being asked* — was the worst served of the three: an
 * instruction is an imperative («rodea», «une», «escribe») and a catalogue's keywords
 * are infinitives. The scope aimed at the most important words matched the fewest.
 *
 * ## Why a stemmer and not a dictionary
 *
 * Because a dictionary is a data file somebody has to keep, in a project whose whole
 * argument is that judgement lives in Markdown a teacher can correct. And because the
 * safety net is not this function's accuracy: **a lemma is only tried when the literal
 * form matched nothing**, and the result still goes through «exactly one candidate, or
 * nothing» (`018` FR-1609). A wrong lemma that matches nothing costs nothing.
 *
 * ## What keeps it from putting the wrong picture on the page
 *
 * Three things, in order:
 *
 * 1. **The closed-class list below.** «Para» stems to «parar», and a stop sign on the
 *    preposition *para* is exactly the wrong-pictogram failure this project is built
 *    around. Function words never get a pictogram anyway, so refusing them costs
 *    nothing and removes the whole class of accident.
 * 2. **Literal first, always.** «Casa» never reaches the stemmer, so it cannot become
 *    «casar».
 * 3. **One or none, unchanged.** A lemma with four candidates is still an omission
 *    plus a report line.
 */

/**
 * Words that never carry a pictogram, whatever the set says.
 *
 * Articles, prepositions, conjunctions and pronouns. A pictogram on «de» helps
 * nobody, and this list is also what stops the stemmer turning a preposition into a
 * verb — see the note above.
 *
 * Closed classes, so the list is finite and does not grow with use. It is code
 * rather than corpus for the same reason the redaction word lists are: it is
 * mechanics, not pedagogical judgement about a child.
 */
export const NEVER_A_PICTOGRAM: ReadonlySet<string> = new Set([
  // Articles and determiners
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'aquel', 'aquella', 'aquellos', 'aquellas', 'mi', 'mis', 'tu', 'tus', 'su', 'sus',
  'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra',
  'cada', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
  'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas',
  // Prepositions
  'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre',
  'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'sin', 'sobre', 'tras',
  // Conjunctions and the rest of the glue
  'y', 'e', 'o', 'u', 'ni', 'que', 'pero', 'aunque', 'porque', 'pues', 'si',
  'como', 'cuando', 'donde', 'mientras', 'aqui', 'alli', 'ahi', 'muy', 'mas',
  'menos', 'tambien', 'tampoco', 'no', 'se', 'le', 'les', 'me', 'te', 'nos', 'os',
  'yo', 'tu', 'el', 'ella', 'ellos', 'ellas', 'nosotros', 'vosotros', 'usted',
  'es', 'son', 'era', 'eran', 'ser', 'estar', 'esta', 'estan', 'hay',
]);

/**
 * Lemma candidates for a word, most likely first.
 *
 * Takes a **normalised** word (accent-folded, lower-cased) and returns normalised
 * candidates. Never returns the word itself: the caller has already tried it.
 *
 * Returns an empty array for a closed-class word, for anything under four letters —
 * where the rules produce noise rather than lemmas — and for anything with a space,
 * which is the multi-word case this does not attempt (BACKLOG G44).
 */
export function lemmaCandidates(word: string): string[] {
  if (word.includes(' ')) return [];
  if (NEVER_A_PICTOGRAM.has(word)) return [];
  if (word.length < 4) return [];

  const out: string[] = [];
  const add = (w: string): void => {
    if (w.length >= 3 && w !== word && !out.includes(w)) out.push(w);
  };

  /* ── Plurals ─────────────────────────────────────────────────────────────
   * Ordered from the most specific rule to the least, because `-ces` is also
   * an `-es` and the wrong answer would win.
   */
  if (word.endsWith('ces')) add(`${word.slice(0, -3)}z`);      // lapices → lapiz
  if (word.endsWith('es')) {
    add(word.slice(0, -2));                                     // papeles → papel
    add(word.slice(0, -1));                                     // (rare) -es → -e
  }
  if (word.endsWith('s')) add(word.slice(0, -1));               // ranas → rana

  /* ── Verbs, and only the two forms a worksheet actually uses ─────────────
   *
   * An instruction is «rodea» (2nd-person imperative) or «rodear»; a statement is
   * «salta» (3rd-person present). Both end in the stem plus one vowel, so one rule
   * covers them — and it is deliberately the only conjugation attempted. Tenses a
   * worksheet rarely puts in an instruction are not worth the false positives.
   *
   * `-e` is ambiguous between `-er` and `-ir` («come» → comer, «escribe» →
   * escribir), so both are offered and the set decides which exists.
   */
  if (/[aeáéíóú]$/.test(word)) {
    const stem = word.slice(0, -1);
    if (word.endsWith('a')) add(`${stem}ar`);                   // rodea → rodear
    if (word.endsWith('e')) { add(`${stem}er`); add(`${stem}ir`); }
    // «rodeó», «saltó»: the accent is already folded by `normalise`, so this is
    // the same rule reached from a different tense.
  }
  // Reflexive infinitives are how a catalogue lists a self-directed action:
  // «lavarse» rather than «lavar». Offered after the plain one.
  if (word.endsWith('ar') || word.endsWith('er') || word.endsWith('ir')) {
    add(`${word}se`);
  }

  return out;
}
