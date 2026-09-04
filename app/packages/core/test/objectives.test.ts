import { describe, it, expect } from 'vitest';
import { readObjective, readObjectives, atLevel, type Objective } from '../src/index.js';

/**
 * One objective, for the cases that are about one.
 *
 * `readObjective` returns a **list** since `027` T006 — «sumas y restas con llevadas» is
 * one line and two skills — and there is deliberately no single-objective variant in the
 * API, because that variant is what silently discarded half of her line (AGE-08). Each
 * case below names one operation, so it takes the first, and this says so once instead
 * of `[0]!` thirty times.
 */
const one = (text: string): Objective => readObjective(text)[0]!;


/**
 * Reading what she wrote (002 T006, FR-101/121/122).
 *
 * The two things that must not go wrong:
 *
 * 1. **The branch.** Content down the skill path ships unanchored facts; a skill
 *    down the content path ships exercises nobody checked. When in doubt it must
 *    fall to `content`, because that path asks a human.
 * 2. **The negation.** «Sin llevadas» is a request for the easier case on purpose,
 *    and reading it as "no constraint" hands her exercises that carry — the
 *    opposite of what she asked, on the sheet for the child not ready for it.
 */
describe('a skill is a constraint, not a topic', () => {
  it('reads «multiplicar con llevadas» as multiplication plus carrying', () => {
    const o = one('multiplicar con llevadas');
    expect(o.kind).toBe('skill');
    if (o.kind === 'skill') {
      expect(o.skill.id).toBe('arith.multiply');
      expect(o.skill.constraints).toEqual(['carries']);
    }
  });

  it.each([
    ['restar prestando', 'arith.subtract', ['borrows']],
    ['sumar llevando', 'arith.add', ['carries']],
    ['divisiones exactas', 'arith.divide', ['exact']],
    ['sumar con decimales', 'arith.add', ['decimals']],
  ])('%s', (text, id, constraints) => {
    const o = one(text);
    if (o.kind === 'skill') {
      expect(o.skill.id).toBe(id);
      expect(o.skill.constraints).toEqual(constraints);
    } else {
      throw new Error(`read as content: ${text}`);
    }
  });

  it('reads a bare operation as a skill with no constraint', () => {
    const o = one('las tablas de multiplicar');
    if (o.kind === 'skill') {
      expect(o.skill.id).toBe('arith.multiply');
      expect(o.skill.constraints).toEqual([]);
    } else {
      throw new Error('read as content');
    }
  });
});

describe('a negated constraint is not the absence of one', () => {
  /**
   * The failure this prevents: «sin llevadas» read as "no constraint" lets an
   * exercise that carries through, which is the opposite of what she asked for.
   */
  it('does not add `carries` for «sin llevadas»', () => {
    const o = one('multiplicar sin llevadas');
    expect(o.kind).toBe('skill');
    if (o.kind === 'skill') {
      expect(o.skill.constraints).not.toContain('carries');
      expect(o.skill.constraints).toEqual([]);
    }
  });

  it('does not add `decimals` for «sin decimales»', () => {
    const o = one('sumar sin decimales');
    if (o.kind === 'skill') expect(o.skill.constraints).toEqual([]);
  });

  /** «sin llevadas» contains «llevadas», so the order of the checks matters. */
  it('is not fooled by the positive phrase inside the negative one', () => {
    const o = one('restar sin llevadas, todavía no las hemos dado');
    if (o.kind === 'skill') expect(o.skill.constraints).toEqual([]);
  });
});

describe('when in doubt it is content, because content asks a human', () => {
  it.each([
    'el ciclo del agua',
    'los ríos de España',
    'que entienda la fotosíntesis',
    'trabajar la comprensión lectora',
  ])('%s is content', (text) => {
    expect(one(text).kind).toBe('content');
  });

  it('an empty objective is content and not a crash', () => {
    expect(one('   ').kind).toBe('content');
  });

  it('reads several, in her order, dropping the blanks', () => {
    const os = readObjectives(['multiplicar con llevadas', '', '  ', 'el ciclo del agua']);
    expect(os.map((o) => o.kind)).toEqual(['skill', 'content']);
    expect(os[0]!.text).toBe('multiplicar con llevadas');
  });
});

describe('the level never comes from her wording', () => {
  /**
   * FR-122, and the reason `atLevel` is a separate step.
   *
   * She writes «para un niño de tercero» all the time. If that set the level, a
   * level could be talked into existence by the text of an objective — and the
   * year comes from the profile and the bounds from the corpus precisely so it
   * cannot.
   */
  it('ignores a year mentioned in the text', () => {
    const o = one('multiplicar con llevadas para un niño de tercero');
    if (o.kind === 'skill') expect(o.skill.level).toBeUndefined();
  });

  it('takes the bounds it is given', () => {
    const o = atLevel(one('multiplicar con llevadas'), { maxDigits: 2, decimals: false });
    if (o.kind === 'skill') expect(o.skill.level).toEqual({ maxDigits: 2, decimals: false });
  });

  /**
   * The corpus saying nothing is a real answer, and it must not become a level.
   * What the caller does with it is the honest part: nothing is constrained and
   * the report says the level was not checked.
   */
  it('leaves the level absent when the corpus says nothing', () => {
    const o = atLevel(one('multiplicar con llevadas'), undefined);
    if (o.kind === 'skill') expect(o.skill.level).toBeUndefined();
  });

  it('does not put a level on content', () => {
    const o = atLevel(one('el ciclo del agua'), { maxDigits: 2 });
    expect(o.kind).toBe('content');
    expect(o).not.toHaveProperty('skill');
  });
});

/**
 * A line that names two operations is two skills (027 T006, FR-2508, SC-2504).
 *
 * The failure this replaces was invisible from both sides. `OPERATIONS.find()` took the
 * first match, so «sumas y restas con llevadas» became addition-with-carrying alone:
 * every subtraction the model proposed came back `does-not-exercise`, and if the ten
 * sums she asked for got filled then `budgetExhausted` was false, `explainOutcome`
 * returned `null`, and **nothing told her half her objective had been discarded**. The
 * report even said «he descartado los que no practicaban lo que pediste», which was
 * false for the subtractions: they practised exactly what she asked for.
 */
describe('an objective that names two operations', () => {
  it('yields one skill per operation', () => {
    const os = readObjective('sumas y restas con llevadas');
    expect(os).toHaveLength(2);
    expect(os.map((o) => (o.kind === 'skill' ? o.skill.id : o.kind)))
      .toEqual(['arith.add', 'arith.subtract']);
  });

  it('resolves the constraint for each operation, not once for the line', () => {
    // «Llevadas» is carrying in an addition and borrowing in a subtraction — the mapping
    // 0.4 fixed, now applied per skill instead of per line.
    const os = readObjective('sumas y restas con llevadas');
    expect(os.map((o) => (o.kind === 'skill' ? o.skill.constraints : [])))
      .toEqual([['carries'], ['borrows']]);
  });

  it('keeps her order, because the sheet is read top to bottom', () => {
    const os = readObjective('restas y sumas');
    expect(os.map((o) => (o.kind === 'skill' ? o.skill.id : '')))
      .toEqual(['arith.subtract', 'arith.add']);
  });

  it('keeps her line verbatim on every skill it produced', () => {
    // Not «…— sumas»: `data-objective` has to match what she wrote or `checkObjectives`
    // rejects the block. The split is ours; the objective is hers.
    for (const o of readObjective('multiplicar y dividir')) {
      expect(o.text).toBe('multiplicar y dividir');
    }
  });

  it('still reads a single operation as one skill', () => {
    expect(readObjective('multiplicar con llevadas')).toHaveLength(1);
  });

  it('and a line with no operation is still one content objective', () => {
    const os = readObjective('los ríos de España');
    expect(os).toHaveLength(1);
    expect(os[0]!.kind).toBe('content');
  });

  it('reaches `readObjectives` flattened, so the sheet gets a group for each', () => {
    const os = readObjectives(['sumas y restas', 'el ciclo del agua']);
    expect(os).toHaveLength(3);
    expect(os.filter((o) => o.kind === 'skill')).toHaveLength(2);
  });
});
