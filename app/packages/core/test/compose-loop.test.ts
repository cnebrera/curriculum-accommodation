import { describe, it, expect } from 'vitest';
import {
  composeExercises, explainOutcome, arithmetic, readObjective,
  type Skill, type ProposedExercise, type Propose,
} from '../src/index.js';

/**
 * The compose loop (002 T011, ADR 0007).
 *
 * The assertion that matters most is **exhaustion never ships**. A budget that
 * runs out and delivers what it has delivers the rejected exercises — a sheet of
 * arithmetic nobody checked, given to the child who most needed it checked.
 *
 * Written with `propose` passed in, so accepting, rejecting, retrying, stopping
 * and deduplicating are testable with no provider and no vault — the same
 * decision `005`'s `runBatch` made for the same reason.
 */
const carrying: Skill = { id: 'arith.multiply', constraints: ['carries'] };

/** A model that offers a fixed script, batch by batch. */
const scripted = (batches: string[][]): { propose: Propose; calls: number[] } => {
  const calls: number[] = [];
  let i = 0;
  const propose: Propose = async (_s, _soFar, wanted) => {
    calls.push(wanted);
    const batch = batches[i++] ?? [];
    return batch.map((expression): ProposedExercise => ({ expression }));
  };
  return { propose, calls };
};

describe('the model proposes, the code decides', () => {
  it('fills the sheet from good proposals', async () => {
    const { propose } = scripted([['47 × 8', '68 × 7', '39 × 4']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 3, maxProposals: 10 });

    expect(out.accepted).toHaveLength(3);
    expect(out.budgetExhausted).toBe(false);
    // The answers are ours.
    expect(out.accepted[0]!.answer).toBe('376');
  });

  it('throws away the ones that do not carry, and keeps going', async () => {
    const { propose } = scripted([['21 × 3', '47 × 8'], ['68 × 7']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 2, maxProposals: 10 });

    expect(out.accepted.map((a) => a.exercise.expression)).toEqual(['47 × 8', '68 × 7']);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0]!.exercise.expression).toBe('21 × 3');
  });

  it('throws away one whose stated answer is wrong', async () => {
    const propose: Propose = async () => [{ expression: '47 × 8', statedAnswer: '368' }];
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 1, maxProposals: 3 });

    expect(out.accepted).toHaveLength(0);
    expect(out.rejected).toHaveLength(1);
  });

  it('does not put the same exercise on the sheet twice', async () => {
    // A model asked for ten multiplications with carrying will offer `47 × 8`
    // twice, and two identical exercises is a sheet that looks longer than it is.
    const { propose } = scripted([['47 × 8', '47 × 8', '47  ×  8']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 3, maxProposals: 10 });

    expect(out.accepted).toHaveLength(1);
  });

  it('asks for only what is still missing', async () => {
    const { propose, calls } = scripted([['47 × 8'], ['68 × 7'], ['39 × 4']]);
    await composeExercises(carrying, arithmetic, propose, { wanted: 3, maxProposals: 10 });
    expect(calls).toEqual([3, 2, 1]);
  });
});

describe('the computed answer never goes back to the model', () => {
  /**
   * Structural, not a rule: `Propose` receives `ProposedExercise[]`, which has no
   * computed answer on it — the loop passes `accepted.map(a => a.exercise)`. So
   * the answer key cannot travel to a provider because there is no field on the
   * wire that carries it.
   *
   * Asserted rather than described, because the tempting refactor is to pass
   * `accepted` straight through for convenience.
   */
  it('shows it only what it said itself', async () => {
    const seen: unknown[] = [];
    const propose: Propose = async (_s, soFar) => {
      seen.push(...soFar);
      return [{ expression: soFar.length === 0 ? '47 × 8' : '68 × 7' }];
    };
    await composeExercises(carrying, arithmetic, propose, { wanted: 2, maxProposals: 6 });

    expect(seen.length).toBeGreaterThan(0);
    for (const e of seen) expect(Object.keys(e as object)).not.toContain('answer');
  });
});

describe('exhaustion surfaces and never ships', () => {
  /** The case this whole branch exists to prevent. */
  it('returns fewer than she asked for rather than the rejected ones', async () => {
    const { propose } = scripted([['21 × 3', '4 × 2'], ['11 × 5'], ['10 × 10']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 3, maxProposals: 4 });

    expect(out.accepted).toHaveLength(0);
    expect(out.budgetExhausted).toBe(true);
    expect(out.proposalsUsed).toBeLessThanOrEqual(4);
    // And none of the rejected ones leaked into `accepted`.
    expect(out.accepted.map((a) => a.exercise.expression)).toEqual([]);
  });

  it('stops at the budget rather than retrying for ever', async () => {
    // A model that never gets it right must not cost an unbounded number of calls.
    const propose: Propose = async () => [{ expression: '21 × 3' }];
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 10, maxProposals: 5 });

    expect(out.proposalsUsed).toBe(5);
    expect(out.budgetExhausted).toBe(true);
  });

  /**
   * Asking again for the same thing that just produced nothing spends the budget
   * on the same answer. Stopping means she is told sooner, which is why the budget
   * exists.
   */
  it('stops when the model returns nothing, rather than asking again', async () => {
    const { propose, calls } = scripted([[]]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 5, maxProposals: 20 });

    expect(calls).toHaveLength(1);
    expect(out.accepted).toHaveLength(0);
    expect(out.budgetExhausted).toBe(true);
  });

  it('keeps what it managed when the budget runs out part way', async () => {
    const { propose } = scripted([['47 × 8', '21 × 3', '68 × 7', '4 × 2']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 4, maxProposals: 4 });

    // Two good ones are hers. The sheet is short and says so.
    expect(out.accepted).toHaveLength(2);
    expect(out.budgetExhausted).toBe(true);
  });
});

describe('what she is told when it could not fill the sheet', () => {
  it('says nothing when it managed', async () => {
    const { propose } = scripted([['47 × 8']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 1, maxProposals: 3 });
    expect(explainOutcome(out, 1)).toBeNull();
  });

  /**
   * «He rechazado 12» is a complaint. «Los que proponía no practicaban lo que
   * pediste» is something she can act on — she can rephrase, or accept eight.
   */
  it('names the commonest reason, not just the count', async () => {
    const { propose } = scripted([['21 × 3', '4 × 2', '11 × 5']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 3, maxProposals: 3 });

    const said = explainOutcome(out, 3);
    expect(said).toContain('no practicaban lo que pediste');
    expect(said).toContain('No he podido hacer ni uno');
  });

  it('says how many it managed when it managed some', async () => {
    const { propose } = scripted([['47 × 8', '21 × 3', '4 × 2']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 3, maxProposals: 3 });

    expect(explainOutcome(out, 3)).toContain('He podido hacer 1 de los 3');
  });

  it('promises not to give her the unchecked ones', async () => {
    const { propose } = scripted([['21 × 3']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 2, maxProposals: 1 });
    expect(explainOutcome(out, 2)).toContain('No te doy los que no he podido comprobar');
  });
});

describe('the level travels with the skill', () => {
  it('rejects proposals outside the year\'s bounds', async () => {
    const bounded: Skill = { ...carrying, level: { maxDigits: 2, decimals: false } };
    const { propose } = scripted([['1234 × 8', '47 × 8']]);
    const out = await composeExercises(bounded, arithmetic, propose,
      { wanted: 1, maxProposals: 5 });

    expect(out.accepted.map((a) => a.exercise.expression)).toEqual(['47 × 8']);
    expect(out.rejected[0]!.exercise.expression).toBe('1234 × 8');
  });
});


/**
 * AGE-03, decision P19 — «restas con llevadas», and the most expensive
 * contradiction in the project.
 *
 * It is how a Spanish primary teacher asks for subtraction with borrowing, and
 * this repository already knew it: the verifier's own Spanish label for `borrows`
 * is «restar llevando». But the objective reader sent «llevadas» to `carries`
 * whatever the operation, and the verifier declares that carrying is not a
 * property of subtraction — so every proposal came back `unknown`, the loop had no
 * exit for that, and she paid for up to thirty proposals to be told «no he podido
 * comprobar los que proponía» with **zero exercises**.
 */
describe('«llevadas» means borrowing when the operation is a subtraction', () => {
  it('reads it as borrows, so the verifier can actually check it', () => {
    const o = readObjective('Restas con llevadas');
    expect(o.kind).toBe('skill');
    if (o.kind !== 'skill') throw new Error('unreachable');
    expect(o.skill.id).toBe('arith.subtract');
    expect(o.skill.constraints).toEqual(['borrows']);
  });

  it('still means carrying in an addition or a multiplication', () => {
    for (const [text, id] of [['Sumas llevando', 'arith.add'],
                              ['Multiplicar con llevadas', 'arith.multiply']] as const) {
      const o = readObjective(text);
      if (o.kind !== 'skill') throw new Error('unreachable');
      expect(o.skill.id).toBe(id);
      expect(o.skill.constraints).toEqual(['carries']);
    }
  });

  it('produces exercises now, where it produced none', async () => {
    const o = readObjective('Restas con llevadas');
    if (o.kind !== 'skill') throw new Error('unreachable');
    // 52 − 27 borrows; 58 − 23 does not.
    const { propose } = scripted([['52 − 27', '81 − 46', '58 − 23']]);
    const out = await composeExercises(o.skill, arithmetic, propose,
      { wanted: 2, maxProposals: 10 });

    expect(out.accepted.map((a) => a.exercise.expression)).toEqual(['52 − 27', '81 − 46']);
    expect(out.budgetExhausted).toBe(false);
  });
});

describe('a batch that is entirely unverifiable stops the loop', () => {
  /** The belt, for a constraint no mapping fix can make checkable. */
  const impossible: Skill = { id: 'arith.subtract', constraints: ['carries'] };

  it('costs one batch instead of the whole budget', async () => {
    const { propose, calls } = scripted([
      ['52 − 27', '81 − 46'], ['33 − 14'], ['45 − 26'], ['77 − 38'],
    ]);
    const out = await composeExercises(impossible, arithmetic, propose,
      { wanted: 10, maxProposals: 30 });

    expect(out.accepted).toHaveLength(0);
    expect(out.constraintUnverifiable).toBe(true);
    expect(out.proposalsUsed, 'it kept asking after a whole batch came back unknown').toBe(2);
    expect(calls, 'the model was asked more than once').toHaveLength(1);
  });

  it('says what to do about it, and not «try again»', async () => {
    const { propose } = scripted([['52 − 27', '81 − 46']]);
    const out = await composeExercises(impossible, arithmetic, propose,
      { wanted: 10, maxProposals: 30 });

    const said = explainOutcome(out, 10) ?? '';
    expect(said).toContain('no lo sé comprobar en esta operación');
    expect(said).toContain('Prueba a decirlo de otra manera');
    // The old sentence read as a bad day at the model, and she would pay again.
    expect(said).not.toContain('no he podido comprobar los que proponía');
  });

  it('does not fire when a batch was all duplicates rather than all unknown', async () => {
    /*
     * Nothing verified is not the same as nothing verifiable. A batch of repeats
     * judges zero exercises, and stopping there would end a run that was fine.
     */
    const { propose } = scripted([['47 × 8'], ['47 × 8'], ['68 × 7']]);
    const out = await composeExercises(carrying, arithmetic, propose,
      { wanted: 2, maxProposals: 10 });

    expect(out.constraintUnverifiable).toBeUndefined();
    expect(out.accepted).toHaveLength(2);
  });
});
