import type { ProposedExercise, Skill, Verifier } from './verify/types.js';

/**
 * Where nothing can be checked (002 T021, FR-125).
 *
 * ## The honest position, in one sentence
 *
 * Most of what a teacher will ask for has no verifier and never will. «Que
 * distinga las tildes diacríticas», «que resuma un párrafo», «que ordene los
 * hechos de un relato» — code cannot decide whether an exercise exercises those,
 * and it cannot compute the answer.
 *
 * For those, this feature produces **a draft for a professional to verify, not
 * material to hand out.** That is the whole of the honest position and it is the
 * sentence most likely to be softened into something reassuring, so it is defined
 * once, here, and every surface that needs it imports it rather than writing its
 * own.
 *
 * ## Why it still composes
 *
 * Refusing would be the tidier answer and the wrong one. A draft she edits in ten
 * minutes is worth having; the failure mode is not that the draft exists, it is
 * that she believes it was checked. So the material is produced, it carries
 * `data-unverified` per block, **no answer key is offered for it**, and the report
 * leads with the sentence below rather than mentioning it.
 *
 * The one thing that must never happen is a sheet where checked and unchecked
 * exercises look alike to her. They do not: they are separate groups, the key
 * lists what it has no solutions for, and the report names the objectives.
 */

/** The sentence. In her words, unsoftened. */
export const UNVERIFIABLE_ES =
  'Esto no lo he podido comprobar: es un borrador para que lo revises tú, no '
  + 'material para dar. De los ejercicios de aritmética compruebo las cuentas una a '
  + 'una; de esto no puedo comprobar nada, ni si practica lo que pediste ni si la '
  + 'solución es correcta.';

/** What the answer key says instead of solutions. */
export const NO_ANSWERS_ES =
  'De esto no te doy soluciones porque no las he podido calcular. Un resultado '
  + 'propuesto por el modelo y presentado como solución es peor que ninguno: se '
  + 'corrige con él en la mano.';

/** Which verifier covers a skill, or none — and none is an answer. */
export function verifierFor(
  skill: Skill, verifiers: readonly Verifier[],
): Verifier | null {
  return verifiers.find((v) => v.handles(skill.id)) ?? null;
}

export interface UnverifiedOutcome {
  exercises: ProposedExercise[];
  /** True when the model returned nothing at all. */
  empty: boolean;
}

/**
 * One bounded ask, deduplicated, with **no verdict of any kind**.
 *
 * Deliberately not the compose loop: that loop's whole structure is propose →
 * verify → retry, and running it with a verifier that answers `unknown` to
 * everything would spend the budget to produce nothing. There is nothing to retry
 * *for* here — a second batch is not closer to correct than the first, because
 * nobody is measuring.
 *
 * So: ask once, take what comes, drop the duplicates, stop.
 */
export async function composeUnverified(
  propose: (wanted: number) => Promise<readonly ProposedExercise[]>,
  wanted: number,
): Promise<UnverifiedOutcome> {
  const batch = await propose(wanted);
  const seen = new Set<string>();
  const exercises: ProposedExercise[] = [];

  for (const e of batch) {
    if (exercises.length >= wanted) break;
    const key = e.expression.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    /*
     * The model's stated answer is **dropped here**.
     *
     * It is the only field on a proposal that could be mistaken for a checked
     * answer, and this is the one path where nothing checks it. Carrying it
     * forward would put it one careless `?? statedAnswer` away from the key.
     */
    exercises.push({ expression: e.expression });
  }

  return { exercises, empty: batch.length === 0 };
}
