import { verify, type ProposedExercise, type Skill, type SkillVerdict, type Verifier } from './verify/types.js';

/**
 * Anything the loop can carry (`027` T009).
 *
 * Generic over the proposal, and the reason is the whole point of `027`: a word problem
 * and an exam question ride **this** loop rather than getting one of their own, so they
 * inherit the budget, the dedupe, reject-don't-repair and the 100%-unknown cut for free.
 * A second loop would be a second place for those four to drift.
 *
 * `expression` is optional here and required on `ProposedExercise`: a non-computable ask
 * has none, and the judge answers `unknown` for it rather than the loop guessing.
 */
export interface Proposal {
  expression?: string;
  /** What the model said the answer is. Never trusted; only compared. */
  statedAnswer?: string;
}

/**
 * How a proposal is judged. `verify` for exercises; the problems path passes its own.
 *
 * A parameter rather than a second loop, and not a method on `Verifier` either: the
 * extra checks a problem needs are about **the statement**, which is not a thing a
 * skill verifier knows about. `Verifier` answers «does this exercise the skill»; this
 * answers «is this proposal acceptable at all».
 */
export type Judge<T extends Proposal = ProposedExercise> =
  (verifier: Verifier, skill: Skill, proposal: T) => SkillVerdict;

/**
 * The compose loop: the model proposes, **code decides** (002 T011, ADR 0007).
 *
 * Same shape as the ingest loop and for the same reason: the model does one
 * bounded thing — propose exercises — and this file decides whether the answer is
 * acceptable, whether to ask again, and when to stop. Code owns the loop.
 *
 * ## What exhaustion does
 *
 * It surfaces. **It never ships.** A budget that runs out and delivers what it
 * has is a budget that delivers the rejected exercises, which is the one outcome
 * this whole branch exists to prevent: a sheet of arithmetic nobody checked, given
 * to the child who most needed it checked.
 *
 * So a run that cannot fill the sheet returns fewer exercises and says so, and a
 * run that cannot produce any returns none. Both are answers. «Aquí tienes ocho de
 * los diez que pediste, y por qué» is a sentence a teacher can act on.
 *
 * ## Why it is pure
 *
 * `propose` is passed in. That keeps the loop's own behaviour — accepting,
 * rejecting, retrying, stopping, deduplicating — testable with no provider, no
 * vault and no window, which is the same decision `005`'s `runBatch` made for the
 * same reason.
 */

export interface ComposeBudget {
  /** How many exercises she asked for. */
  wanted: number;
  /**
   * How many proposals may be spent in total.
   *
   * A budget rather than a per-exercise retry count, because the failures cluster:
   * a model that has misunderstood «con llevadas» produces twenty bad exercises,
   * not one bad and nineteen good. A shared pool stops early on that instead of
   * paying for twenty retries.
   */
  maxProposals: number;
}

export interface Accepted<T extends Proposal = ProposedExercise> {
  exercise: T;
  /** Computed here, never taken from the model. */
  answer: string;
}

export interface Rejected<T extends Proposal = ProposedExercise> {
  exercise: T;
  verdict: SkillVerdict;
}

export interface ComposeOutcome<T extends Proposal = ProposedExercise> {
  accepted: Accepted<T>[];
  rejected: Rejected<T>[];
  /** True when the budget ran out before the sheet was full. Never silent. */
  budgetExhausted: boolean;
  proposalsUsed: number;
  /**
   * Stopped because a whole batch came back unverifiable (AGE-03, decision P19).
   *
   * A different fact from `budgetExhausted`, and a more useful one: it says the
   * **constraint** cannot be checked for this operation, not that the model was
   * having a bad day. Surfaced rather than folded in, because the sentence she
   * needs is «reformula el objetivo», not «inténtalo otra vez».
   */
  constraintUnverifiable?: boolean;
}

/** Ask the model for more. Returns however many it returned, possibly none. */
export type Propose<T extends Proposal = ProposedExercise> = (
  skill: Skill,
  /** What has already been accepted, so it does not repeat them. */
  soFar: readonly T[],
  /** How many more are wanted. Advisory: the loop counts, not the model. */
  wanted: number,
) => Promise<readonly T[]>;

/**
 * Fill a sheet, or return less and say why.
 */
export async function composeExercises<T extends Proposal = ProposedExercise>(
  skill: Skill,
  verifier: Verifier,
  propose: Propose<T>,
  budget: ComposeBudget,
  /**
   * How to judge one proposal. Defaults to `verify`, which is the skill path.
   *
   * Last and optional so every existing call site is unchanged — this loop is the one
   * piece of `002` that everything downstream trusts, and a required parameter here
   * would have meant touching five call sites to add a kind.
   */
  judge: Judge<T> = verify as unknown as Judge<T>,
): Promise<ComposeOutcome<T>> {
  const accepted: Accepted<T>[] = [];
  const rejected: Rejected<T>[] = [];
  /*
   * Deduplicated on the expression, normalised.
   *
   * A model asked for ten multiplications with carrying will offer `47 × 8` twice
   * — and two identical exercises on one sheet is not practice, it is a sheet that
   * looks longer than it is.
   */
  const seen = new Set<string>();
  let used = 0;

  while (accepted.length < budget.wanted && used < budget.maxProposals) {
    const batch = await propose(skill, accepted.map((a) => a.exercise), budget.wanted - accepted.length);

    /*
     * A model that returns nothing is not retried into the ground.
     *
     * Asking again for the same thing that just produced nothing spends the
     * budget on the same answer. Stopping here means she is told sooner, which is
     * the whole point of the budget existing.
     */
    if (batch.length === 0) break;

    /*
     * How this batch went, so a batch that is 100% unverifiable can stop the loop
     * (AGE-03, decision P19).
     *
     * `unknown` does not mean «bad exercise». It means the verifier cannot decide
     * whether this exercise exercises this constraint — and for a *constraint that
     * does not apply to the operation* it means every exercise ever proposed will
     * come back the same way. «Restas con llevadas» mapped `carries` onto a
     * subtraction, the verifier answers `unknown` for that combination by design,
     * and the loop had no exit for it: thirty proposals of her money, and zero
     * exercises, for one of the four skills this application can check.
     *
     * The mapping is fixed too (`objectives.ts`). This is the belt: a constraint
     * that turns out to be unverifiable for its operation — by a future mapping
     * mistake, or by a corpus that names a property arithmetic does not have —
     * costs one batch instead of the whole budget.
     */
    let judged = 0;
    let unknowns = 0;

    for (const exercise of batch) {
      if (accepted.length >= budget.wanted) break;
      if (used >= budget.maxProposals) break;
      used += 1;

      /*
       * Deduplicated on the expression — and a proposal with none deduplicates to one.
       *
       * That is the useful behaviour rather than a gap: a batch of non-computable asks
       * collapses to a single judged item, comes back `unknown`, and the cut below stops
       * the loop after one batch instead of after the whole budget.
       */
      const key = norm(exercise.expression ?? '');
      if (seen.has(key)) continue;
      seen.add(key);

      const verdict = judge(verifier, skill, exercise);
      judged += 1;
      if (verdict.ok) accepted.push({ exercise, answer: verdict.answer });
      else {
        rejected.push({ exercise, verdict });
        if (verdict.reason === 'unknown') unknowns += 1;
      }
    }

    /*
     * Every exercise this batch judged came back unverifiable. Asking again buys
     * the same answer, so she is told now instead of after the budget.
     *
     * `judged > 0` guards the case where the whole batch was duplicates: nothing
     * was verified, which is not the same as nothing being verifiable.
     */
    if (judged > 0 && unknowns === judged) {
      return {
        accepted,
        rejected,
        budgetExhausted: accepted.length < budget.wanted,
        proposalsUsed: used,
        constraintUnverifiable: true,
      };
    }
  }

  return {
    accepted,
    rejected,
    budgetExhausted: accepted.length < budget.wanted,
    proposalsUsed: used,
  };
}

/**
 * What to tell her, in her language.
 *
 * Says the number and the commonest reason, because «he rechazado 12» is a
 * complaint and «los que proponía no llevaban» is something she can act on — she
 * can rephrase the objective, or accept eight.
 */
export function explainOutcome(o: ComposeOutcome<Proposal>, wanted: number): string | null {
  if (!o.budgetExhausted) return null;

  /*
   * The unverifiable-constraint case gets its own sentence (AGE-03, P19).
   *
   * «No he podido comprobar los que proponía» reads as a model that was having a
   * bad day, and she would try again — and pay again. What actually happened is
   * that the property she asked for cannot be checked for that operation, and the
   * thing to do is rephrase the objective.
   */
  if (o.constraintUnverifiable) {
    return o.accepted.length === 0
      ? 'No he podido hacer ni uno: lo que pediste no lo sé comprobar en esta '
        + 'operación, así que he parado en cuanto lo he visto en vez de seguir '
        + 'gastando. Prueba a decirlo de otra manera.'
      : `He podido hacer ${o.accepted.length} de los ${wanted} que pediste y he `
        + 'parado ahí: el resto no lo sé comprobar en esta operación. Prueba a '
        + 'decirlo de otra manera.';
  }

  const reasons = new Map<string, number>();
  for (const r of o.rejected) {
    if (r.verdict.ok) continue;
    reasons.set(r.verdict.reason, (reasons.get(r.verdict.reason) ?? 0) + 1);
  }
  const commonest = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const why: Record<string, string> = {
    'does-not-exercise': 'los ejercicios que proponía no practicaban lo que pediste',
    'wrong-answer': 'le salían mal las cuentas',
    unknown: 'no he podido comprobar los que proponía',
    'out-of-level': 'se salían del nivel de su curso',
    malformed: 'no he entendido los que proponía',
  };

  const head = o.accepted.length === 0
    ? 'No he podido hacer ni uno'
    : `He podido hacer ${o.accepted.length} de los ${wanted} que pediste`;

  const tail = commonest && why[commonest] ? `: ${why[commonest]}.` : '.';

  return `${head}${tail} No te doy los que no he podido comprobar.`;
}

const norm = (s: string): string => s.replace(/\s+/g, '').replace(',', '.').toLowerCase();
