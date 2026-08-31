import { describe, it, expect } from 'vitest';
import {
  targetYear, explainTarget, criterioIn, criteriaIn, readAnchor, buildSheet,
  buildComposeReport,
} from '../src/index.js';

/**
 * The five requirements `002`'s spec grew and its tasks never did
 * (FR-126…FR-131, added 2026-08-30 from the SDA-IA analysis).
 *
 * ## Why this file exists at all
 *
 * `scripts/check-fr-coverage.sh` found them on 2026-08-31 — a day after they were
 * written — uncited in any task and unbuilt. `check-spec-kit.sh` could not have: it
 * catches a spec and its implementation arriving together, and a spec that **grows**
 * while its tasks stand still is two commits that both look fine.
 *
 * One of the five, FR-126, was a live defect. See `compose-sheet.test.ts`.
 */

describe('FR-129 · the level is an input, and the report says who chose it', () => {
  /**
   * The distinction the requirement turns on: for a learner with a two-year desfase,
   * his **enrolled** course is not the level his material should target — and she is
   * the one who knows which is. Using the enrolled course silently produces exactly
   * the wrong answer for the learner this product exists for, invisibly.
   */
  it('prefers her choice over everything', () => {
    const t = targetYear({ chosen: 'es:primaria-3', fromOverlay: 'es:primaria-4', enrolled: 'es:primaria-5' });
    expect(t).toEqual({ yearId: 'es:primaria-3', from: 'she-chose' });
    expect(explainTarget(t)).toContain('porque tú lo elegiste');
  });

  it('then the overlay, which is the team\'s decision and not the app\'s', () => {
    const t = targetYear({ fromOverlay: 'es:primaria-4', enrolled: 'es:primaria-5' });
    expect(t.from).toBe('overlay');
    expect(explainTarget(t)).toContain('documento de adaptaciones');
  });

  /** The one that is not a decision, and the report says so in those words. */
  it('falls back to the enrolled course and says nobody chose it', () => {
    const t = targetYear({ enrolled: 'es:primaria-5' });
    const said = explainTarget(t);

    expect(t.from).toBe('enrolled');
    expect(said).toContain('Nadie lo ha elegido');
    // And what she can do about it, which is the point of saying it.
    expect(said).toContain('dime a qué nivel lo quieres');
  });

  it('says «sin curso» rather than nothing when there is no year at all', () => {
    expect(explainTarget(targetYear({}))).toContain('sin curso');
  });
});

describe('FR-127/FR-128 · an official criterio, with its code intact', () => {
  /**
   * The SDA-IA's strongest decision and the reason these requirements exist: the
   * criterios reach the prompt with their codes intact, **never from the model**.
   */
  it('recognises the shapes an Andalusian criterio is written in', () => {
    expect(criterioIn('CE.3.4. Resuelve problemas de la vida cotidiana.')).toBe('CE.3.4');
    expect(criterioIn('Según el criterio CE.MAT.2.1 del área.')).toBe('CE.MAT.2.1');
  });

  /**
   * And nothing looser. A pattern that found codes in ordinary prose would cite an
   * invented one on a document that goes to an administration.
   */
  it('finds nothing in ordinary text', () => {
    for (const line of [
      'El alumno resuelve problemas de dos operaciones.',
      'Ver la página 3.4 del libro.',
      'CE es el código de la comunidad.',
      'Ejercicio 2.1 del tema 3.',
    ]) {
      expect(criterioIn(line), line).toBeUndefined();
    }
  });

  it('carries them from her anchor into the report, deduplicated and in order', () => {
    const { passages } = readAnchor([
      'CE.3.4. Resuelve problemas de la vida cotidiana.',
      '',
      'Un párrafo de mis apuntes, sin código.',
      '',
      'CE.3.5. Explica el proceso seguido.',
      '',
      'CE.3.4. Otra vez el mismo.',
    ].join('\n'));

    expect(criteriaIn(passages)).toEqual(['CE.3.4', 'CE.3.5']);

    const report = buildComposeReport({
      title: 'X', composedOn: '2026-08-31', leveled: [], outcomes: [], listing: [],
      criteria: criteriaIn(passages),
    });
    expect(report.markdown).toContain('## Criterios de evaluación');
    expect(report.markdown).toContain('`CE.3.4`');
    // And the honest limit: Rampa ships no criteria database and validates nothing.
    expect(report.markdown).toContain('no los compruebo contra ninguna base de datos');
  });

  it('says nothing about criteria when the anchor cited none', () => {
    const report = buildComposeReport({
      title: 'X', composedOn: '2026-08-31', leveled: [], outcomes: [], listing: [],
    });
    expect(report.markdown).not.toContain('Criterios de evaluación');
  });
});

describe('FR-130 · sessions, recorded rather than acted on', () => {
  /**
   * «A PT works in sessions and the application has no concept of one.» It still does
   * not organise anything around them — this is her unit written down where it
   * belongs, so `017`'s temporalización can say «tres sesiones» instead of only «del
   * 3 de marzo al 12 de junio».
   */
  const sheet = (sessions?: number) => buildSheet({
    title: 'X', lang: 'es', materialKind: 'worksheet', objectives: ['sumar'],
    composedOn: '2026-08-31', ...(sessions ? { sessions } : {}),
    groups: [{
      objective: 'sumar', instruction: 'Resuelve.',
      accepted: [{ exercise: { expression: '25 + 25' }, answer: '50' }],
    }],
  });

  it('records what she said', () => {
    expect(sheet(3).doc.frontMatter['sessions']).toBe(3);
  });

  it('records nothing when she said nothing, rather than guessing one', () => {
    expect(sheet().doc.frontMatter['sessions']).toBeUndefined();
  });
});
