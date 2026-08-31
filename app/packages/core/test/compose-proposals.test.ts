import { describe, it, expect } from 'vitest';
import {
  parseProposals, findUnaccountedBlocks, parseIR, checkObjectives, checkProvenance,
} from '../src/index.js';

/**
 * Reading a model's answer, and the hole below it (002 T011, T008's shape again).
 *
 * The parser's rule: a line it half-understands becomes **no proposal**, never a
 * guessed one. A guessed expression goes to the verifier, which then checks the
 * guess instead of what the model actually said — and reports success.
 */
describe('one proposal per line, or none', () => {
  it('reads the format it asked for', () => {
    expect(parseProposals('47 × 8 = 376\n68 × 7 = 476')).toEqual([
      { expression: '47 × 8', statedAnswer: '376' },
      { expression: '68 × 7', statedAnswer: '476' },
    ]);
  });

  it('forgives a fence, a bullet, a number and a full stop', () => {
    // Burning a retry on punctuation spends her money on formatting.
    const raw = '```\n1. 47 × 8 = 376.\n- 68 × 7 = 476\n```';
    expect(parseProposals(raw).map((p) => p.expression)).toEqual(['47 × 8', '68 × 7']);
  });

  it('keeps a decimal answer written her way', () => {
    expect(parseProposals('1,5 + 2 = 3,5')).toEqual([
      { expression: '1,5 + 2', statedAnswer: '3,5' },
    ]);
  });

  it('drops a line it cannot read rather than guessing at it', () => {
    const raw = [
      'Aquí tienes los ejercicios:',
      '47 × 8 = 376',
      'y este es más difícil',
      '68 × 7 =',
      '= 476',
    ].join('\n');
    expect(parseProposals(raw)).toEqual([{ expression: '47 × 8', statedAnswer: '376' }]);
  });

  it('returns nothing for prose, which the loop treats as a stop', () => {
    expect(parseProposals('No puedo generar ejercicios de ese nivel.')).toEqual([]);
  });
});

describe('a generated block in an adapted document still has to trace', () => {
  /**
   * **The hole this closes.** `data-objective` used to exempt a block from the
   * unaccounted check as well as from provenance — so adapting a composed sheet
   * let a model add a whole new exercise carrying an objective genuinely on her
   * list, and it was exempt from tracing to anything.
   *
   * That exercise has no verified answer: it is not in the key, because the key
   * was computed from the exercises that passed the verifier. A sheet of checked
   * arithmetic with one unchecked exercise in it is worse than an unchecked sheet,
   * because the report says the arithmetic was computed.
   */
  const composed = parseIR([
    '---', 'kind: "generated"', 'objectives: ["multiplicar con llevadas"]', '---', '',
    '::: {#g1-e1 .exercise data-objective="multiplicar con llevadas"}',
    '1. 47 × 8 =', ':::',
  ].join('\n'));

  const adaptedWithAnExtra = parseIR([
    '---', 'kind: "generated"', '---', '',
    '::: {#g1-e1 .exercise data-objective="multiplicar con llevadas"}',
    '1. 47 × 8 =', ':::', '',
    '::: {#invented .exercise data-objective="multiplicar con llevadas"}',
    '2. 93 × 6 =', ':::',
  ].join('\n'));

  it('catches the invented exercise', () => {
    const unaccounted = findUnaccountedBlocks(composed, adaptedWithAnExtra);
    expect(unaccounted.map((b) => b.id)).toEqual(['invented']);
  });

  it('and the objective check does not catch it, which is why this one must', () => {
    // The objective is real. That is what made the old exemption dangerous.
    expect(checkObjectives(adaptedWithAnExtra, ['multiplicar con llevadas'])).toEqual([]);
  });

  it('lets a block that traces to the composed one through', () => {
    const ok = parseIR([
      '---', 'kind: "generated"', '---', '',
      '::: {#b7 .exercise data-objective="multiplicar con llevadas" data-from="g1-e1"'
      + ' data-recipe="one-task-per-page@1" data-axis="ATT"}',
      '1. 47 × 8 =', ':::',
    ].join('\n'));
    expect(findUnaccountedBlocks(composed, ok)).toEqual([]);
  });

  it('still exempts a composed document\'s own blocks from provenance', () => {
    // They key to an objective; there is no source block for them to come from.
    expect(checkProvenance(composed)).toEqual([]);
  });
});
