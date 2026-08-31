import { describe, it, expect } from 'vitest';
import { readObjective, readObjectives, atLevel } from '../src/index.js';

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
    const o = readObjective('multiplicar con llevadas');
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
    const o = readObjective(text);
    if (o.kind === 'skill') {
      expect(o.skill.id).toBe(id);
      expect(o.skill.constraints).toEqual(constraints);
    } else {
      throw new Error(`read as content: ${text}`);
    }
  });

  it('reads a bare operation as a skill with no constraint', () => {
    const o = readObjective('las tablas de multiplicar');
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
    const o = readObjective('multiplicar sin llevadas');
    expect(o.kind).toBe('skill');
    if (o.kind === 'skill') {
      expect(o.skill.constraints).not.toContain('carries');
      expect(o.skill.constraints).toEqual([]);
    }
  });

  it('does not add `decimals` for «sin decimales»', () => {
    const o = readObjective('sumar sin decimales');
    if (o.kind === 'skill') expect(o.skill.constraints).toEqual([]);
  });

  /** «sin llevadas» contains «llevadas», so the order of the checks matters. */
  it('is not fooled by the positive phrase inside the negative one', () => {
    const o = readObjective('restar sin llevadas, todavía no las hemos dado');
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
    expect(readObjective(text).kind).toBe('content');
  });

  it('an empty objective is content and not a crash', () => {
    expect(readObjective('   ').kind).toBe('content');
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
    const o = readObjective('multiplicar con llevadas para un niño de tercero');
    if (o.kind === 'skill') expect(o.skill.level).toBeUndefined();
  });

  it('takes the bounds it is given', () => {
    const o = atLevel(readObjective('multiplicar con llevadas'), { maxDigits: 2, decimals: false });
    if (o.kind === 'skill') expect(o.skill.level).toEqual({ maxDigits: 2, decimals: false });
  });

  /**
   * The corpus saying nothing is a real answer, and it must not become a level.
   * What the caller does with it is the honest part: nothing is constrained and
   * the report says the level was not checked.
   */
  it('leaves the level absent when the corpus says nothing', () => {
    const o = atLevel(readObjective('multiplicar con llevadas'), undefined);
    if (o.kind === 'skill') expect(o.skill.level).toBeUndefined();
  });

  it('does not put a level on content', () => {
    const o = atLevel(readObjective('el ciclo del agua'), { maxDigits: 2 });
    expect(o.kind).toBe('content');
    expect(o).not.toHaveProperty('skill');
  });
});
