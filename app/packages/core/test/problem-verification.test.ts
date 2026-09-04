import { describe, it, expect } from 'vitest';
import {
  extractQuantities, verifyProblem, arithmetic,
  parseProblemProposals, parseExamProposals,
  type Skill,
} from '../src/index.js';

/**
 * A problem is checked against the statement the child reads (027 T002, FR-2501/2502).
 *
 * Written before the pipeline that uses it, per the tasks' own sequencing: a pipeline
 * built against parsers that do not exist yet is a pipeline that gets a lenient parser
 * retrofitted under schedule pressure — and a lenient parser here verifies a guess.
 *
 * ## The case this file exists for
 *
 * The third one down. A model whose declared operands are perfectly consistent with its
 * own wrong answer, but **absent from the statement**, must be rejected: verifying the
 * model's separate declaration is verifying the liar with his own declaration, and it is
 * the failure the cheap implementation of this feature would have shipped.
 */
const MONEY: Skill = { id: 'arith.subtract', constraints: [] };
const P = (statement: string, expression?: string, statedAnswer?: string) => ({
  statement,
  ...(expression ? { expression } : {}),
  ...(statedAnswer ? { statedAnswer } : {}),
});

const STATEMENT = 'María tiene 3,50 € y compra un cuaderno que cuesta 1,20 €. ¿Cuánto le queda?';

describe('the numbers come from the statement, not from the model', () => {
  it('reads Spanish decimals as values', () => {
    expect(extractQuantities(STATEMENT)).toEqual(['3.5', '1.2']);
  });

  it('reads a dot as a thousands group when that is what it is', () => {
    // «1.250 alumnos» is one thousand two hundred and fifty, and a check that read it
    // as 1,25 would refuse every operand drawn from it.
    expect(extractQuantities('El colegio tiene 1.250 alumnos y 84 profesores'))
      .toEqual(['1250', '84']);
  });

  it('and as a decimal point when it is one, because a model writes both', () => {
    expect(extractQuantities('Pesa 3.5 kilos')).toEqual(['3.5']);
  });

  it('takes the same number written two ways as the same value', () => {
    expect(extractQuantities('3,50')).toEqual(extractQuantities('3.50'));
  });
});

describe('what survives, and on whose authority', () => {
  it('accepts a consistent problem and computes the answer itself', () => {
    const v = verifyProblem(arithmetic, MONEY, P(STATEMENT, '3,50 - 1,20', '2,30'));
    expect(v.ok).toBe(true);
    // Computed, not taken: the model said «2,30» and this is `2.3` because `solve`
    // produced it.
    expect(v.ok && v.answer).toBe('2.3');
  });

  it('rejects a wrong stated answer instead of correcting it', () => {
    const v = verifyProblem(arithmetic, MONEY, P(STATEMENT, '3,50 - 1,20', '2,20'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('wrong-answer');
  });

  /**
   * The whole feature, in one case.
   *
   * `3,50 - 1,10 = 2,40` is internally perfect: the operation parses, the arithmetic is
   * right, the stated answer agrees. And `1,10` is **not in the statement**, so the
   * story and the arithmetic are two different problems — and the child gets the story.
   */
  it('rejects an operand that is nowhere in the statement, however consistent', () => {
    const v = verifyProblem(arithmetic, MONEY, P(STATEMENT, '3,50 - 1,10', '2,40'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.because).toContain('no está en el enunciado');
    expect(!v.ok && v.because).toContain('1.1');
  });

  it('rejects a statement that already says the result', () => {
    // An answer in the statement is an answer on the learner's page.
    const told = 'Tenía 3,50 € y se gastó 1,20 €. Le quedan 2,30 €. ¿Cuánto le queda?';
    const v = verifyProblem(arithmetic, MONEY, P(told, '3,50 - 1,20', '2,30'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.because).toContain('ya dice el resultado');
  });

  /**
   * And the false positive that check would have caused if written naively.
   *
   * «Tenía 10 y se comió 5» answers 5 — which is right there in the statement, as an
   * operand. Refusing it would reject half of all subtractions, systematically, and burn
   * her budget on correct problems.
   */
  it('accepts an answer that coincides with one of its own operands', () => {
    const v = verifyProblem(arithmetic, MONEY,
      P('Tenía 10 caramelos y se comió 5. ¿Cuántos le quedan?', '10 - 5', '5'));
    expect(v.ok, !v.ok ? v.because : '').toBe(true);
  });

  it('cannot decide a «why» question, and says so rather than guessing', () => {
    const v = verifyProblem(arithmetic, MONEY,
      P('¿Por qué crees que le queda menos dinero que antes?'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('unknown');
  });

  it('refuses an operation with no statement at all', () => {
    const v = verifyProblem(arithmetic, MONEY, P('   ', '3 - 1', '2'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('malformed');
  });

  it('still applies the skill and the level, unchanged', () => {
    // A sum offered for a subtraction request is rejected by `exercises`, not by
    // anything new here — this feature adds a check, it does not replace one.
    const v = verifyProblem(arithmetic, MONEY, P(STATEMENT, '3,50 + 1,20', '4,70'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('does-not-exercise');
  });

  it('and the level bound, so a problem cannot outgrow his course', () => {
    const small: Skill = { id: 'arith.subtract', constraints: [], level: { maxDigits: 2 } };
    const v = verifyProblem(arithmetic, small,
      P('Había 1250 libros y se prestaron 340. ¿Cuántos quedan?', '1250 - 340', '910'));
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('does-not-exercise');
  });
});

describe('the parsers: parse or drop, never guess', () => {
  const BLOCK = 'PROBLEMA\nENUNCIADO: María tiene 3,50 € y compra un cuaderno de 1,20 €.\n'
    + '¿Cuánto le queda?\nOPERACIÓN: 3,50 - 1,20\nRESULTADO: 2,30\n';

  it('reads a problem block, statement and all', () => {
    const [p] = parseProblemProposals(BLOCK);
    expect(p!.statement).toContain('¿Cuánto le queda?');
    expect(p!.expression).toBe('3,50 - 1,20');
    expect(p!.statedAnswer).toBe('2,30');
  });

  it('tolerates a fence and numbering, which is what a retry would cost her', () => {
    const fenced = '```\n1) PROBLEMA\nENUNCIADO: Tiene 4 € y gasta 1 €.\nOPERACIÓN: 4 - 1\n'
      + 'RESULTADO: 3.\n```';
    const [p] = parseProblemProposals(fenced);
    expect(p!.expression).toBe('4 - 1');
    expect(p!.statedAnswer).toBe('3');
  });

  it('drops a block with no statement rather than inventing one', () => {
    expect(parseProblemProposals('PROBLEMA\nOPERACIÓN: 4 - 1\nRESULTADO: 3\n')).toEqual([]);
  });

  it('keeps a problem with no operation, so the verifier can say «unknown»', () => {
    const [p] = parseProblemProposals('PROBLEMA\nENUNCIADO: ¿Por qué le queda menos?\n');
    expect(p!.statement).toBe('¿Por qué le queda menos?');
    expect(p!.expression).toBeUndefined();
  });

  it('reads several blocks and ignores prose between them', () => {
    const many = 'Aquí van:\n\nPROBLEMA\nENUNCIADO: Uno. Tiene 5 y gasta 2.\nOPERACIÓN: 5 - 2\n\n'
      + 'PROBLEMA\nENUNCIADO: Dos. Tiene 8 y gasta 3.\nOPERACIÓN: 8 - 3\n';
    expect(parseProblemProposals(many)).toHaveLength(2);
  });

  it('reads exam questions, and the prompt is the only learner-facing field', () => {
    const raw = 'PREGUNTA\nTEXTO: Calcula: 305 − 148\nOPERACIÓN: 305 - 148\nRESULTADO: 157\n\n'
      + 'PREGUNTA\nTEXTO: Escribe una oración con «península».\nRESULTADO: (orientativa)\n';
    const qs = parseExamProposals(raw);
    expect(qs).toHaveLength(2);
    expect(qs[0]!.text).toBe('Calcula: 305 − 148');
    expect(qs[0]!.expression).toBe('305 - 148');
    // A question with no operation is kept: it is the declared-unverified case, not junk.
    expect(qs[1]!.expression).toBeUndefined();
    expect(qs[1]!.statedAnswer).toBe('(orientativa)');
  });

  it('drops an exam block with no prompt', () => {
    expect(parseExamProposals('PREGUNTA\nOPERACIÓN: 2 + 2\nRESULTADO: 4\n')).toEqual([]);
  });

  it('does not read a problem block as a question, or the other way round', () => {
    expect(parseExamProposals('PROBLEMA\nENUNCIADO: Tiene 5.\n')).toEqual([]);
    expect(parseProblemProposals('PREGUNTA\nTEXTO: Calcula 2 + 2\n')).toEqual([]);
  });
});
