import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  buildComposeReport, composeExercises, arithmetic, readObjective, levelAll,
  parseEducationSystem, buildSheet, type Skill,
} from '../src/index.js';

/**
 * The composition report (002 T015).
 *
 * The order is the argument: **what nobody checked comes before what code did.**
 * A report that opens with «las cuentas están comprobadas» has told her the
 * reassuring half first, and the reassuring half is the one she already assumed.
 * She is signing for the content, and the content is the part nobody has read.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const es = parseEducationSystem(
  readFileSync(join(root, 'instructions', 'education', 'es.md'), 'utf8'), 'x');
if (!es) throw new Error('instructions/education/es.md no longer parses');

const skill: Skill = { id: 'arith.multiply', constraints: ['carries'] };

const run = async (expressions: string[], wanted: number) => {
  let sent = false;
  return composeExercises(skill, arithmetic, async () => {
    if (sent) return [];
    sent = true;
    return expressions.map((expression) => ({ expression }));
  }, { wanted, maxProposals: 20 });
};

const report = async (yearId: string | undefined, expressions: string[], wanted: number) => {
  const objective = 'multiplicar con llevadas';
  const outcome = await run(expressions, wanted);
  const leveled = levelAll([readObjective(objective)], es, yearId);
  const { listing } = buildSheet({
    title: 'X', lang: 'es', objectives: [objective], composedOn: '2026-08-31',
    groups: [{ objective, instruction: 'Resuelve.', accepted: outcome.accepted }],
  });
  return buildComposeReport({
    title: 'Multiplicar con llevadas', composedOn: '2026-08-31',
    leveled, outcomes: [{ objective, wanted, outcome }], listing,
  });
};

describe('what nobody checked, first', () => {
  it('says nobody has read the exercises, before anything reassuring', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '68 × 7'], 2);

    expect(r.unchecked[0]).toContain('Nadie ha leído estos ejercicios');
    expect(r.markdown.indexOf('borrador para que lo revises'))
      .toBeLessThan(r.markdown.indexOf('Lo que sí he comprobado'));
  });

  it('is never empty, even when everything went well', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '68 × 7'], 2);
    expect(r.unchecked.length).toBeGreaterThan(0);
    expect(r.shortfalls).toEqual([]);
  });

  it('adds the level line when the corpus could not say', async () => {
    const r = await report(undefined, ['47 × 8'], 1);
    expect(r.unchecked.join(' ')).toContain('en qué curso está');
  });

  it('does not add it when the corpus could', async () => {
    const r = await report('es:primaria-5', ['47 × 8'], 1);
    expect(r.unchecked.join(' ')).not.toContain('en qué curso está');
  });
});

describe('what it does claim, narrowly', () => {
  it('claims the arithmetic and the constraint, and not that it is right', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '68 × 7'], 2);

    expect(r.checked[0]).toContain('Las cuentas las he calculado yo, exactas');
    expect(r.checked[0]).toContain('descartado los que no practicaban');
    // Nothing anywhere says the material is good, because nothing here can.
    expect(r.markdown).not.toMatch(/está (bien|correcto)|listo para/i);
  });

  it('names the shortfall with the objective it belongs to', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '21 × 3', '4 × 2'], 3);

    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0]).toContain('«multiplicar con llevadas»');
    expect(r.shortfalls[0]).toContain('He podido hacer 1 de los 3');
  });

  it('claims nothing when nothing survived', async () => {
    const r = await report('es:primaria-5', ['21 × 3', '4 × 2'], 2);
    expect(r.checked).toEqual([]);
    expect(r.shortfalls[0]).toContain('No he podido hacer ni uno');
  });
});

describe('which objective each exercise serves', () => {
  it('lists the exercises under her objective', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '68 × 7'], 2);
    expect(r.markdown).toContain('**multiplicar con llevadas**');
    expect(r.markdown).toContain('- 1. 47 × 8');
  });

  /** The report travels with the sheet. The answers do not. */
  it('never prints an answer', async () => {
    const r = await report('es:primaria-5', ['47 × 8', '68 × 7'], 2);
    expect(r.markdown).not.toContain('376');
    expect(r.markdown).not.toContain('476');
    expect(r.markdown).toContain('No las imprimas con la hoja del alumno');
  });

  it('says so plainly when the sheet is empty', async () => {
    const r = await report('es:primaria-5', ['21 × 3'], 1);
    expect(r.markdown).toContain('No hay ningún ejercicio en la hoja');
  });
});
