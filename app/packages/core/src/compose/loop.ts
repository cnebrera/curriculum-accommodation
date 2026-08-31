import { verify, type ProposedExercise, type Skill, type SkillVerdict, type Verifier } from './verify/types.js';

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

export interface Accepted {
  exercise: ProposedExercise;
  /** Computed here, never taken from the model. */
  answer: string;
}

export interface Rejected {
  exercise: ProposedExercise;
  verdict: SkillVerdict;
}

export interface ComposeOutcome {
  accepted: Accepted[];
  rejected: Rejected[];
  /** True when the budget ran out before the sheet was full. Never silent. */
  budgetExhausted: boolean;
  proposalsUsed: number;
}

/** Ask the model for more. Returns however many it returned, possibly none. */
export type Propose = (
  skill: Skill,
  /** What has already been accepted, so it does not repeat them. */
  soFar: readonly ProposedExercise[],
  /** How many more are wanted. Advisory: the loop counts, not the model. */
  wanted: number,
) => Promise<readonly ProposedExercise[]>;

/**
 * Fill a sheet, or return less and say why.
 */
export async function composeExercises(
  skill: Skill,
  verifier: Verifier,
  propose: Propose,
  budget: ComposeBudget,
): Promise<ComposeOutcome> {
  const accepted: Accepted[] = [];
  const rejected: Rejected[] = [];
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

    for (const exercise of batch) {
      if (accepted.length >= budget.wanted) break;
      if (used >= budget.maxProposals) break;
      used += 1;

      const key = norm(exercise.expression);
      if (seen.has(key)) continue;
      seen.add(key);

      const verdict = verify(verifier, skill, exercise);
      if (verdict.ok) accepted.push({ exercise, answer: verdict.answer });
      else rejected.push({ exercise, verdict });
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
export function explainOutcome(o: ComposeOutcome, wanted: number): string | null {
  if (!o.budgetExhausted) return null;

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
