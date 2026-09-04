import { describe, it, expect } from 'vitest';
import {
  composeExercises, verifyProblem, arithmetic, extractQuantities,
  type ProposedProblem, type Skill,
} from '../src/index.js';

/**
 * The invariant, not a sample (027 T012, SC-2501/FR-2502).
 *
 * SC-2501 says «100% of computable items have keys computed by code and 0
 * rejected-then-repaired items exist. **Invariant, not sample.**» So this runs the real
 * loop with the real judge over a batch built to contain every failure mode, and asserts
 * two things about the accepted set as a whole:
 *
 * 1. Every accepted answer equals what `arithmetic.solve` computes from that item's own
 *    expression. Not «is plausible», not «matches what the model said» — equals the
 *    computation, so a stated answer cannot have leaked into the key.
 * 2. Every accepted statement and expression is **byte-identical** to what was proposed.
 *    That is what «reject, never repair» means operationally, and it is the assertion
 *    that would catch a well-meaning future edit that patched a number to make a
 *    proposal fit.
 *
 * Running the loop rather than the judge alone matters: the loop is where the budget,
 * the dedupe and the 100%-unknown cut live, and it is what the problems pipeline hands
 * these proposals to.
 */
const SUBTRACT: Skill = { id: 'arith.subtract', constraints: [] };

const P = (statement: string, expression?: string, statedAnswer?: string): ProposedProblem => ({
  statement,
  ...(expression ? { expression } : {}),
  ...(statedAnswer ? { statedAnswer } : {}),
});

/** One batch with every failure mode in it, and three that should survive. */
const BATCH: ProposedProblem[] = [
  // Good.
  P('Ana tiene 8 canicas y pierde 3. ¿Cuántas le quedan?', '8 - 3', '5'),
  P('Había 45 libros y se prestaron 18. ¿Cuántos quedan?', '45 - 18', '27'),
  P('Tenía 3,50 € y gastó 1,20 €. ¿Cuánto le queda?', '3,50 - 1,20', '2,30'),
  // Wrong stated answer.
  P('Tenía 20 cromos y regaló 7. ¿Cuántos le quedan?', '20 - 7', '14'),
  // An operand from nowhere: the story and the arithmetic are different problems.
  P('Tenía 20 cromos y regaló 7. ¿Cuántos le quedan?', '20 - 6', '14'),
  // The statement says the result.
  P('Tenía 9 € y gastó 4 €. Le quedan 5 €. ¿Cuánto le queda?', '9 - 4', '5'),
  // Not the operation she asked for.
  P('Tenía 6 lápices y le dan 2 más. ¿Cuántos tiene?', '6 + 2', '8'),
  // Nothing to compute.
  P('¿Por qué crees que le quedan menos?'),
];

const outcome = await composeExercises<ProposedProblem>(
  SUBTRACT, arithmetic,
  async () => BATCH,
  { wanted: 10, maxProposals: 8 },
  verifyProblem,
);

describe('the accepted set, as a whole', () => {
  it('accepted exactly the three that survive every check', () => {
    expect(outcome.accepted).toHaveLength(3);
    expect(outcome.rejected.filter((r) => !r.verdict.ok && r.verdict.reason !== 'unknown'))
      .toHaveLength(4);
  });

  it('every answer equals what code computed from that item, and only that', () => {
    for (const a of outcome.accepted) {
      const computed = arithmetic.solve({ expression: a.exercise.expression! });
      expect(computed, a.exercise.statement).not.toBe('unknown');
      expect(a.answer, a.exercise.statement).toBe(computed);
    }
  });

  /**
   * Reject, never repair — asserted as identity rather than as absence of a bug.
   *
   * A statement rewritten by code is nobody's story, and a repaired expression is a key
   * for a problem the child was not given. This is the assertion that fails if somebody
   * later «fixes» a near-miss instead of asking again.
   */
  it('every accepted item is byte-identical to what was proposed', () => {
    for (const a of outcome.accepted) {
      const original = BATCH.find((b) => b.statement === a.exercise.statement);
      expect(original, 'an accepted statement that nobody proposed').toBeDefined();
      expect(a.exercise.statement).toBe(original!.statement);
      expect(a.exercise.expression).toBe(original!.expression);
    }
  });

  it('and every accepted answer traces to numbers in its own statement', () => {
    // FR-2501 restated as a property of the result rather than of the check that made it.
    for (const a of outcome.accepted) {
      const quantities = extractQuantities(a.exercise.statement);
      for (const operand of extractQuantities(a.exercise.expression!)) {
        expect(quantities, a.exercise.statement).toContain(operand);
      }
    }
  });

  it('never carries a model-stated answer into the accepted set', () => {
    // `20 - 7 = 14` was stated confidently and is wrong. If any accepted answer ever
    // equals a stated one that the computation disagrees with, the key is the model's.
    for (const a of outcome.accepted) {
      if (a.exercise.statedAnswer === undefined) continue;
      const asValue = (x: string) => Number(x.replace(',', '.'));
      expect(asValue(a.answer)).toBe(asValue(a.exercise.statedAnswer));
    }
  });
});

describe('a batch that nothing can check stops the loop', () => {
  /**
   * The P19 cut, reached through the problems path (FR-2510).
   *
   * Non-computable problems come back `unknown`, and the loop's existing cut fires — so
   * a request whose every problem is a «why» question costs one batch instead of the
   * whole budget. Asserted here because the cut was built for a different path, and a
   * guarantee that holds only where it was written is not a guarantee.
   */
  it('after one batch, not after the budget', async () => {
    const o = await composeExercises<ProposedProblem>(
      SUBTRACT, arithmetic,
      async () => [P('¿Por qué le queda menos?'), P('¿Qué harías tú?')],
      { wanted: 10, maxProposals: 30 },
      verifyProblem,
    );
    expect(o.constraintUnverifiable).toBe(true);
    expect(o.accepted).toHaveLength(0);
    // Two proposals judged out of a thirty-proposal budget — and the second one only
    // because it is a different statement; the loop deduplicates on the expression.
    expect(o.proposalsUsed).toBeLessThanOrEqual(2);
  });
});
