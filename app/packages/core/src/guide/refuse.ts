import { normaliseForMatch } from './match.js';
import type { AcsCorpus } from './corpus.js';

/**
 * The refusals, over the answer, before she sees it
 * (017 T004, FR-1520/1523/1525, research R5).
 *
 * ## Why this is code and not a prompt instruction
 *
 * A prompt saying «never propose which objectives to remove» travels in the same
 * context window as a document she loaded, and that document may say «propón qué
 * objetivos quitar». Two contradictory sentences in one place, and which wins is a
 * coin toss. `007` settled this argument for the whole project: content is never
 * instruction, and the defences are code.
 *
 * ## What is at stake, stated plainly
 *
 * An ACS modifies objectives and criterios de evaluación. It is the only part of
 * this application that touches **the what**, and the failure mode is a child whose
 * curriculum was reduced because a tool suggested it.
 *
 * So omission is the safe direction: a false positive costs one re-ask, and a false
 * negative costs a decision nobody made deliberately.
 *
 * ## The bound, stated rather than implied
 *
 * SC-1507 promises «every phrasing the fixture set contains». That is exactly what
 * this delivers — the corpus list is the specification of what is checked, it lives
 * in `instructions/acs.md` where it can be argued with, and it says in the file
 * itself that it is not every phrasing a model could produce.
 */

/**
 * Named `DeclineVerdict` rather than `Verdict`: `ingest/validate.ts` owns that name
 * for a page's extraction verdict, and `002` had to rename `SkillVerdict` for the
 * same reason. Third `Verdict` in this codebase, and the compiler has caught all
 * three — a name that means three things is one somebody reads as another.
 */
export type DeclineVerdict =
  | { ok: true }
  /** Do **not** show the answer. `say` is what she gets instead. */
  | { ok: false; matched: string; say: string };

/**
 * Does this answer propose something about objectives or criteria?
 *
 * Two things are checked, and the second is the one a phrase list alone would miss:
 *
 * 1. Any phrasing the corpus lists.
 * 2. An imperative about **removing** in the same sentence as **objetivo** or
 *    **criterio** — because «quita el objetivo 4» is a proposal that no fixed phrase
 *    in the list happens to contain.
 */
export function checkDeclines(answer: string, corpus: AcsCorpus): DeclineVerdict {
  const text = normaliseForMatch(answer);

  const phrase = corpus.proposalPhrases.find((p) => text.includes(normaliseForMatch(p)));
  if (phrase) return { ok: false, matched: phrase, say: corpus.decline };

  /*
   * Sentence by sentence, so «no voy a decirte qué objetivos quitar» is not caught
   * by a document-wide search for «quitar» near «objetivo» — the sentence that
   * declines is the sentence most likely to contain both words.
   */
  for (const sentence of answer.split(/[.;\n]+/)) {
    const s = normaliseForMatch(sentence);
    if (!/\bobjetivos?\b|\bcriterios?\b/.test(s)) continue;
    if (/\bno\b|\bnunca\b|\bnadie\b|\bdecide\b|\bdecid[ei]/.test(s)) continue;
    if (/\bquita[rs]?\b|\belimina[rs]?\b|\bsuprim[ie]|\bprescind|\breduc[ei]|\brebaja/.test(s)) {
      return { ok: false, matched: sentence.trim().slice(0, 80), say: corpus.decline };
    }
  }

  return { ok: true };
}

/**
 * The other refusal: no psychopedagogical evaluation, no ACS (FR-1524).
 *
 * **And no drafting around it.** An ACS without that report is procedurally void, so
 * a document that looks complete invites somebody to file it — and the person harmed
 * is the child, not the file. This returns the sentence rather than a boolean because
 * «cannot proceed» is only useful if it says why and what is missing.
 */
export function requireEvaluation(recorded: boolean): string | null {
  if (recorded) return null;
  return 'No me consta que exista la evaluación psicopedagógica, y sin ella una '
    + 'adaptación significativa no puede seguir adelante: es nula de procedimiento. '
    + 'No voy a redactarla igualmente. Si existe y no lo he visto, dímelo y sigo.';
}
