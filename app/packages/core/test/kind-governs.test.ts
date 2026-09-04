import { describe, it, expect } from 'vitest';
import { derivedKind, kindMismatched, type SheetGroup } from '../src/index.js';

/**
 * The kind is read from what was produced (027 T019, FR-2506, SC-2503, research R5).
 *
 * ## The dead code this replaces
 *
 * `groups.some((g) => /\bproblema/i.test(g.instruction))` — over `instructionFor`'s four
 * fixed sentences, «Resuelve estas sumas / restas / multiplicaciones / divisiones».
 * **None of them contains the word.** So the derivation could only ever answer `study`
 * or `worksheet`, and choosing «examen» or «problemas» produced the mismatch note every
 * single time: an automatic apology for a discrepancy that had not happened, on the two
 * kinds this feature exists to make real.
 *
 * SC-2503 asks for zero false positives over the test corpus. That is what the second
 * block below is: one case per kind, each asked for and produced, and the note silent.
 */
const exercises = (): SheetGroup => ({
  objective: 'Multiplicar con llevadas',
  instruction: 'Resuelve estas multiplicaciones.',
  accepted: [{ exercise: { expression: '47 × 8' }, answer: '376' }],
});

const problems = (): SheetGroup => ({
  of: 'problems',
  objective: 'Restas con dinero',
  instruction: 'Lee cada problema y resuélvelo.',
  problems: [{ statement: 'Tiene 3,50 € y gasta 1,20 €.', expression: '3,50 - 1,20', answer: '2.3' }],
});

const questions = (): SheetGroup => ({
  of: 'questions',
  objective: 'Restas con llevadas',
  instruction: 'Contesta a cada pregunta.',
  questions: [{ text: 'Calcula: 305 − 148', expression: '305 - 148', answer: '157' }],
});

describe('what came out, from its shape', () => {
  it('questions make it an exam', () => {
    expect(derivedKind([questions()], false)).toBe('exam');
  });

  it('problems make it a problems page', () => {
    expect(derivedKind([problems()], false)).toBe('problems');
  });

  it('content alone makes it study material', () => {
    expect(derivedKind([], true)).toBe('study');
  });

  it('bare expressions make it a worksheet', () => {
    expect(derivedKind([exercises()], false)).toBe('worksheet');
  });

  it('an exam with a text in it is still an exam', () => {
    // The sharpest one wins: a test with a reading passage is a test.
    expect(derivedKind([questions(), exercises()], true)).toBe('exam');
  });

  /**
   * The instruction line is not consulted, and that is the point.
   *
   * The old derivation read Spanish prose — ours today and the corpus's tomorrow. This
   * reads a fact the code is holding in its hands at the moment of deriving.
   */
  it('is not fooled by, or dependent on, the wording of the instruction', () => {
    const misleading: SheetGroup = { ...exercises(), instruction: 'Resuelve estos problemas.' };
    expect(derivedKind([misleading], false)).toBe('worksheet');
  });
});

describe('the note fires only on a real mismatch (SC-2503)', () => {
  it('says nothing when each kind produced its own shape', () => {
    expect(kindMismatched('exam', [questions()], false)).toBe(false);
    expect(kindMismatched('problems', [problems()], false)).toBe(false);
    expect(kindMismatched('worksheet', [exercises()], false)).toBe(false);
    expect(kindMismatched('study', [], true)).toBe(false);
  });

  it('and speaks when the request and the output genuinely disagree', () => {
    // She asked for an exam and a budget collapse left bare drill. That is worth saying,
    // and it is the only case that was ever meant to say it.
    expect(kindMismatched('exam', [exercises()], false)).toBe(true);
    expect(kindMismatched('problems', [exercises()], false)).toBe(true);
  });

  it('says nothing when she was never asked, which is every job before `021`', () => {
    expect(kindMismatched(undefined, [exercises()], false)).toBe(false);
  });
});
