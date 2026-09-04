import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { examBelowCourse, acsInOverlay, parseMaterialKinds, targetYear } from '../src/index.js';

/**
 * An exam of another course is the teaching team's decision (027 T016, FR-2509, P12).
 *
 * ## What this gate is for, and what it is not
 *
 * Composing an exam at a lower course is not a change to **how** he is assessed — which
 * Rampa may make freely — it is a change to **what** he is assessed on. That is a
 * significant adaptation: decided by the teaching team on a psychopedagogical
 * assessment, and recorded as an ACS. The recording is what unlocks it.
 *
 * ## And the trigger is the request
 *
 * Decision P12, and the correction 2.11 had to make to `adapt.md`: the stop used to key
 * on «the **profile** or the request», which anchors a refusal in the child. A high CUR
 * is a reason to compose more carefully, never a reason to refuse — so this function is
 * never given the profile, which is the only kind of guarantee worth having.
 */
const ORDER = [
  'es:primaria-1', 'es:primaria-2', 'es:primaria-3',
  'es:primaria-4', 'es:primaria-5', 'es:primaria-6',
  'es:eso-1', 'es:eso-2',
];

const gate = (chosen: string | undefined, enrolled: string | undefined, acs = false) =>
  examBelowCourse({
    order: ORDER,
    target: targetYear({ ...(chosen ? { chosen } : {}), ...(enrolled ? { enrolled } : {}) }),
    ...(enrolled ? { enrolled } : {}),
    acsRegistered: acs,
  });

describe('what stops', () => {
  it('an exam asked for below his course', () => {
    expect(gate('es:primaria-3', 'es:primaria-5')).toBe(true);
  });

  it('and it stops on one course down, not only on two', () => {
    // Not a «desfase notable» threshold: one course down is already a different set of
    // criteria, and thresholds belong to how far behind he is — which is not the trigger.
    expect(gate('es:primaria-4', 'es:primaria-5')).toBe(true);
  });

  it('across stages too', () => {
    expect(gate('es:primaria-6', 'es:eso-1')).toBe(true);
  });
});

describe('what does not', () => {
  it('his own course', () => {
    expect(gate('es:primaria-5', 'es:primaria-5')).toBe(false);
  });

  it('a course above his, which is not a reduction', () => {
    expect(gate('es:eso-1', 'es:primaria-5')).toBe(false);
  });

  it('a registered ACS, which is the whole point of registering one', () => {
    expect(gate('es:primaria-3', 'es:primaria-5', true)).toBe(false);
  });

  it('nobody choosing anything: the enrolled course is the target', () => {
    expect(gate(undefined, 'es:primaria-5')).toBe(false);
  });

  it('no course on record, so there is nothing to be below', () => {
    expect(gate('es:primaria-3', undefined)).toBe(false);
  });

  /**
   * A year the corpus does not contain stops nothing.
   *
   * Refusing here would refuse on a typo in a corpus file, with a message about a
   * comparison nobody could make — and `explainLevel` already tells her the year is
   * unrecognised.
   */
  it('a year this corpus has never heard of', () => {
    expect(gate('tercero-de-lo-que-sea', 'es:primaria-5')).toBe(false);
    expect(gate('es:primaria-3', 'cuarto-de-donde-sea')).toBe(false);
  });
});

describe('what counts as a registered ACS', () => {
  it('the sentence `017` writes into the overlay', () => {
    expect(acsInOverlay('… Este documento es una **ACS**: los objetivos ya están …')).toBe(true);
  });

  /**
   * An ACNS modifies no objective, so it unlocks nothing here.
   *
   * This is the half that stops the unlock being a hole: «hay un documento» and «hay una
   * ACS» are different facts, and only the second one says a teaching team decided which
   * objectives are his.
   */
  it('and not an ACNS, and not the mere existence of an overlay', () => {
    expect(acsInOverlay('Este documento es una **ACNS**: no modifica ningún objetivo.')).toBe(false);
    expect(acsInOverlay('### Medidas\n- más tiempo')).toBe(false);
    expect(acsInOverlay(null)).toBe(false);
  });

  /**
   * And not a measure that merely **mentions** an ACS.
   *
   * This is the case the sentence's exact shape exists for, and the one a looser pattern
   * would get wrong: an ACNS whose measures say «pendiente de valorar si necesita una
   * ACS» would unlock composing exams at another course — on a document that says the
   * decision has **not** been made. Found by mutation: `/ACS/` passed every other case
   * in this file.
   */
  it('and not a measure that talks about one that does not exist yet', () => {
    expect(acsInOverlay(
      'Este documento es una **ACNS**.\n\n### Medidas\n'
      + '- Pendiente de valorar en junio si necesita una ACS.')).toBe(false);
    expect(acsInOverlay('- La familia pregunta por la ACS. Sin decidir.')).toBe(false);
  });
});

describe('the sentence she reads is corpus, not code', () => {
  const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
  const kinds = parseMaterialKinds(
    readFileSync(join(root, 'instructions', 'material-kinds.md'), 'utf8'), 'material-kinds.md');

  it('the exam kind carries the refusal', () => {
    const exam = kinds.find((k) => k.id === 'exam');
    expect(exam?.composing?.belowLevel, 'the shipped corpus lost the refusal').toBeTruthy();
  });

  it('and it names what unlocks it, so the refusal is actionable', () => {
    // A refusal she cannot act on is a wall. This one says «tráeme la ACS».
    expect(kinds.find((k) => k.id === 'exam')!.composing!.belowLevel!).toContain('ACS');
    expect(kinds.find((k) => k.id === 'exam')!.composing!.belowLevel!).toContain('equipo docente');
  });

  it('and only the exam has one, because the others exist to go lower', () => {
    // Support material below his course is exactly what a worksheet and a problems page
    // are for. A refusal there would be this gate reaching past its argument.
    for (const id of ['worksheet', 'problems', 'study']) {
      expect(kinds.find((k) => k.id === id)?.composing?.belowLevel, id).toBeUndefined();
    }
  });
});
