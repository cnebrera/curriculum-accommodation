/**
 * Accent- and case-folding, shared by the guide's matchers (017).
 *
 * Its own file because three modules need it and none of them should own it — and
 * because it is the one place where «what counts as the same word» is decided for a
 * filter whose failure mode is a diagnosis in a vault.
 *
 * **Nothing further is inferred.** No stemming, no plurals, no synonyms: a term the
 * corpus does not list is a term that does not match, and the answer to that is to
 * edit the corpus rather than to make the matcher cleverer. A clever matcher fires
 * on «ciencias» for `CI`.
 */
export const normaliseForMatch = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
