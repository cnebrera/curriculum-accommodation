/**
 * A verifiable skill (002 T001, FR-123/124).
 *
 * Contract: `specs/002-compose/contracts/verifiable-skills.md`.
 *
 * A skill belongs here only if code can decide two things — whether an exercise
 * exercises it, and whether a proposed answer is right. If it cannot decide both,
 * the skill takes the unverified path and the checklist tells the teacher she is
 * verifying content herself (FR-125).
 *
 * ## The rule that is not negotiable
 *
 * **The answer key is never requested from a model.** Not as a starting point,
 * not as a hint, not "and check it". A sheet with a wrong key goes to a child who
 * is learning the operation and gets marked by a teacher who trusts it — and it
 * teaches him his correct answer was wrong.
 */

/**
 * What she asked for, as a **constraint** rather than a topic.
 *
 * «Multiplicar con llevadas» is not the topic "multiplication" with a decoration.
 * It is multiplication *plus a property the exercise must have*, and that
 * distinction is the whole reason `exercises()` exists: `4 × 2` is multiplication
 * and does not exercise carrying, so an exercise like it is rejected.
 */
export interface Skill {
  /** e.g. `arith.multiply` */
  id: string;
  /** Properties the exercise must have, e.g. `['carries']`. */
  constraints: string[];
  /**
   * Bounds from the education corpus (`011`), never from a model's sense of what
   * a ten-year-old handles (FR-122).
   */
  level?: {
    /** Largest number of digits in an operand. */
    maxDigits?: number;
    /** Whether decimals are in scope for this year. */
    decimals?: boolean;
  };
}

/** One proposed exercise, with the answer the **model** claimed. */
export interface ProposedExercise {
  /** The expression as it will appear, e.g. `47 × 8`. */
  expression: string;
  /** What the model said the answer is. Never trusted; only compared. */
  statedAnswer?: string;
}

/**
 * A verdict, with `unknown` as a first-class answer.
 *
 * A verifier that returns `unknown` for some inputs is useful and honest; one that
 * guesses is worse than none, because not guessing is the entire point of this
 * branch.
 */
/**
 * Named `SkillVerdict` rather than `Verdict` because `ingest/validate.ts` already
 * owns that name for a page's extraction verdict. Two `Verdict`s in one barrel
 * export is an ambiguity the compiler catches — and a name that means two things
 * in one codebase is one somebody will read as the other.
 */
export type SkillVerdict =
  | { ok: true; answer: string }
  /** Rejected. `because` is for the report, in her language. */
  | { ok: false; reason: 'wrong-answer' | 'does-not-exercise' | 'out-of-level' | 'malformed'; because: string; answer?: string }
  /** Cannot decide. Not a rejection and not an approval. */
  | { ok: false; reason: 'unknown'; because: string };

export interface Verifier {
  /** Which skill ids this verifier covers. */
  handles: (skillId: string) => boolean;
  /** Does this exercise require the skill, with its constraints? */
  exercises: (skill: Skill, exercise: ProposedExercise) => boolean | 'unknown';
  /** Compute the answer. Deterministic, offline, never asked of a model. */
  solve: (exercise: ProposedExercise) => string | 'unknown';
  /**
   * The constraints in her words, for the report (optional).
   *
   * The verifier owns this because it owns the vocabulary: «llevadas» is a fact
   * about arithmetic, and a table of labels in the generic module would be a list
   * of terms for domains it knows nothing about.
   */
  describe?: (constraints: readonly string[]) => string;
}

/**
 * Check one exercise against one skill.
 *
 * **Rejects, never repairs.** An exercise whose stated answer disagrees with the
 * computed one is thrown away rather than corrected — a model that got the
 * arithmetic wrong got something else wrong too, and fixing the visible half hides
 * the rest.
 */
export function verify(v: Verifier, skill: Skill, exercise: ProposedExercise): SkillVerdict {
  const computed = v.solve(exercise);
  if (computed === 'unknown') {
    return { ok: false, reason: 'unknown',
      because: `No sé resolver «${exercise.expression}», así que no puedo comprobarlo.` };
  }

  const does = v.exercises(skill, exercise);
  if (does === 'unknown') {
    return { ok: false, reason: 'unknown',
      because: `No sé si «${exercise.expression}» practica lo que pediste.` };
  }
  if (does === false) {
    /*
     * In her words, not in constraint ids.
     *
     * The verifier supplies the wording because it owns the vocabulary — the
     * alternative is a table of Spanish labels in this module for constraints it
     * knows nothing about. `describe` is optional so a verifier without one still
     * works, and falls back to the ids, which read oddly rather than not at all.
     */
    const what = v.describe?.(skill.constraints) || skill.constraints.join(' y ') || skill.id;
    return { ok: false, reason: 'does-not-exercise', answer: computed,
      because: `«${exercise.expression}» no practica ${what}.` };
  }

  if (exercise.statedAnswer !== undefined && normalise(exercise.statedAnswer) !== normalise(computed)) {
    return { ok: false, reason: 'wrong-answer', answer: computed,
      because: `«${exercise.expression}» da ${computed}, no ${exercise.statedAnswer}.` };
  }

  return { ok: true, answer: computed };
}

/**
 * Compare answers as values, not as strings.
 *
 * `8.0` and `8` are the same answer, and a verifier that rejected one for the
 * other would throw away correct exercises — which is the failure mode that makes
 * a strict checker useless: everything gets rejected, the retry budget exhausts,
 * and she is told nothing could be generated.
 */
const normalise = (s: string): string => {
  const t = s.trim().replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? String(n) : t.toLowerCase();
};
