import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  parseEducationSystem, readObjective, levelFor, levelAll, levelWasChecked, explainLevel,
  type Objective,
} from '../src/index.js';

/**
 * The level comes from the corpus and from nowhere else (002 T012, FR-122).
 *
 * The test that matters is «never from her wording»: a level that can be talked
 * into existence by the text of an objective is a level a model can also talk
 * into existence — and the text of an objective is content (Principle IX).
 *
 * The second one is that **not knowing is an outcome, not a failure**. A year
 * with no `skills:` block is a valid year, and refusing to compose would make the
 * honest half of the corpus the reason nothing works.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

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
 * The **shipped** corpus, not a fixture — and asserted to parse.
 *
 * A regex edit to `es.md` once put `primaria-6`'s bounds inside ESO's `years:`
 * and the only symptom was the suite getting quietly smaller. A fixture would
 * not have caught it; this does.
 */
const es = parseEducationSystem(
  readFileSync(join(root, 'instructions', 'education', 'es.md'), 'utf8'),
  'instructions/education/es.md',
);
if (!es) throw new Error('instructions/education/es.md no longer parses');

/**
 * Year ids carry their system: `es:primaria-3`, not `primaria-3`. That is what a
 * profile stores, and a test that used the bare id would pass against a lookup
 * that had quietly stopped matching what the profiles hold.
 */

describe('the bounds come from the year', () => {
  it('gives a third-year two digits for a multiplication', () => {
    const l = levelFor(one('multiplicar con llevadas'), es, 'es:primaria-3');

    expect(levelWasChecked(l)).toBe(true);
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    expect(l.objective.skill.level).toEqual({ maxDigits: 2, decimals: false });
  });

  it('gives a sixth-year more, and decimals', () => {
    const l = levelFor(one('sumar'), es, 'es:primaria-6');
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    expect(l.objective.skill.level).toEqual({ maxDigits: 6, decimals: true });
  });

  it('keeps the constraint she asked for alongside the level', () => {
    // The level is a bound on the numbers; «con llevadas» is a property every
    // exercise must have. Losing either one loses what she asked for.
    const l = levelFor(one('multiplicar con llevadas'), es, 'es:primaria-5');
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    expect(l.objective.skill.constraints).toEqual(['carries']);
    expect(l.objective.skill.level?.maxDigits).toBe(3);
  });
});

describe('never from her wording', () => {
  /**
   * **The requirement, not a style point.** The year comes from the profile.
   */
  it('ignores a course named inside the objective', () => {
    const text = 'multiplicar con llevadas para un niño de sexto de primaria';

    // Profile says third year. The text says sixth. Third wins.
    const l = levelFor(one(text), es, 'es:primaria-3');
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    expect(l.objective.skill.level).toEqual({ maxDigits: 2, decimals: false });
  });

  it('does not invent a level when no course is recorded', () => {
    const l = levelFor(one('multiplicar con llevadas'), es, undefined);
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    expect(l.objective.skill.level).toBeUndefined();
    expect(l.source.kind).toBe('no-year');
  });
});

describe('not knowing is an outcome', () => {
  it('names a course it does not recognise, rather than falling back', () => {
    const l = levelFor(one('sumar'), es, 'tercero-de-lo-que-sea');
    expect(l.source).toEqual({ kind: 'year-unknown', yearId: 'tercero-de-lo-que-sea' });
    expect(levelWasChecked(l)).toBe(false);
  });

  it('distinguishes «this year has no levels» from «not for this skill»', () => {
    // Two different things she can act on: the first is the corpus being silent
    // about a whole stage; the second is silent about divisions in second year.
    const eso = levelFor(one('sumar'), es, 'es:eso-1');
    expect(eso.source.kind).toBe('year-has-no-levels');

    const divide = levelFor(one('dividir'), es, 'es:primaria-2');
    expect(divide.source.kind).toBe('skill-not-in-year');
  });

  it('says nothing about the level of a content objective', () => {
    // There are no digits to bound in «los ríos de España», and reporting an
    // unchecked level about it would be noise she learns to skip.
    const l = levelFor(one('los ríos de España'), es, 'es:primaria-3');
    expect(l.source).toEqual({ kind: 'not-a-skill' });
    expect(explainLevel(l)).toBeNull();
  });

  it('composes anyway — the level is what is missing, not the material', () => {
    const l = levelFor(one('multiplicar con llevadas'), es, 'es:eso-1');
    if (l.objective.kind !== 'skill') throw new Error('expected a skill');
    // Still a skill, still carrying, still verifiable arithmetic.
    expect(l.objective.skill.constraints).toEqual(['carries']);
  });
});

describe('what she is told', () => {
  it('says nothing when the corpus knew', () => {
    expect(explainLevel(levelFor(one('sumar'), es, 'es:primaria-3'))).toBeNull();
  });

  it('points at the field she can fill in when no course is recorded', () => {
    const said = explainLevel(levelFor(one('sumar'), es, undefined));
    expect(said).toContain('en qué curso está');
    // And it is explicit about what *was* checked, so «no comprobado» does not
    // read as «nada comprobado».
    expect(said).toContain('cuentas están comprobadas');
  });

  it('uses her label for the course, not our id', () => {
    const said = explainLevel(
      levelFor(one('sumar'), es, 'es:eso-1'),
      () => '1.º de la ESO',
    );
    expect(said).toContain('1.º de la ESO');
    expect(said).not.toContain('es:eso-1');
  });
});

describe('several objectives at once', () => {
  it('levels each one and keeps her order', () => {
    const ls = levelAll(
      ['multiplicar con llevadas', 'los ríos de España', 'dividir'].flatMap(readObjective),
      es, 'es:primaria-4',
    );

    expect(ls.map((l) => l.source.kind)).toEqual(['corpus', 'not-a-skill', 'corpus']);
  });
});
