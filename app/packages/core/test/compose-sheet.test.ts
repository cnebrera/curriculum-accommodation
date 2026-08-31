import { describe, it, expect } from 'vitest';
import {
  buildSheet, renderAnswerKey, parseIR, checkObjectives, isGenerated,
  type SheetGroup,
} from '../src/index.js';

/**
 * The composed sheet, and the answer key that is not on it (002 T013/T014/T016).
 *
 * The assertion that carries the requirement is «the answer is nowhere in the
 * child's document». Not in a `data-answer`, not in a hidden block, not in a
 * comment the renderer is trusted to strip — an answer that exists anywhere in
 * that document is one bug away from being on his sheet, and the bug would be
 * invisible: a worksheet with the answers in the markup looks exactly like a
 * worksheet.
 */
const group = (objective: string, pairs: Array<[string, string]>): SheetGroup => ({
  objective,
  instruction: 'Resuelve estas multiplicaciones.',
  accepted: pairs.map(([expression, answer]) => ({ exercise: { expression }, answer })),
});

const sheet = () => buildSheet({
  title: 'Multiplicar con llevadas',
  lang: 'es',
  objectives: ['multiplicar con llevadas'],
  groups: [group('multiplicar con llevadas', [['47 × 8', '376'], ['68 × 7', '476']])],
  composedOn: '2026-08-31',
});

describe('the answer key is not on the child\'s sheet', () => {
  /** **The one that matters.** */
  it('writes no answer anywhere in the document', () => {
    const { markdown, answers } = sheet();

    expect(answers.map((a) => a.answer)).toEqual(['376', '476']);
    for (const a of answers) expect(markdown).not.toContain(a.answer);
  });

  it('has no attribute that could carry one', () => {
    const { doc } = sheet();
    for (const b of doc.blocks) {
      expect(Object.keys(b.attrs)).not.toContain('data-answer');
      expect(Object.keys(b.attrs)).not.toContain('data-solution');
    }
  });

  it('leaves the question open — the equals sign and nothing after it', () => {
    const { doc } = sheet();
    const first = doc.blocks.find((b) => b.classes.includes('exercise'));
    expect(first?.content).toBe('1. 47 × 8 =');
  });
});

describe('the key is keyed to the expression', () => {
  /**
   * Exercise 3 on the composed sheet may be exercise 2 on the adapted one. A key
   * that has silently slid by one is worse than no key, because she will trust it.
   */
  it('carries the expression beside the number', () => {
    const key = renderAnswerKey({
      title: 'Multiplicar', composedOn: '2026-08-31', answers: sheet().answers,
    });
    expect(key).toContain('1. 47 × 8 = **376**');
    expect(key).toContain('2. 68 × 7 = **476**');
  });

  it('says whose sheet it is, first', () => {
    const key = renderAnswerKey({
      title: 'Multiplicar', composedOn: '2026-08-31', answers: sheet().answers,
    });
    expect(key).toContain('para ti, no para el alumno');
    // And the one claim we make about our own correctness, which is true.
    expect(key).toContain('las he calculado yo, no el modelo');
  });

  it('does not pretend to have a key when nothing was composed', () => {
    const key = renderAnswerKey({ title: 'X', composedOn: '2026-08-31', answers: [] });
    expect(key).toContain('No he podido generar ningún ejercicio comprobable');
  });

  it('groups the answers by the objective she wrote', () => {
    const { answers } = buildSheet({
      title: 'Dos cosas', lang: 'es',
      objectives: ['multiplicar con llevadas', 'restar prestando'],
      groups: [
        group('multiplicar con llevadas', [['47 × 8', '376']]),
        group('restar prestando', [['52 - 27', '25']]),
      ],
      composedOn: '2026-08-31',
    });
    const key = renderAnswerKey({ title: 'Dos cosas', composedOn: '2026-08-31', answers });

    expect(key).toContain('## multiplicar con llevadas');
    expect(key).toContain('## restar prestando');
    // Numbering runs down the whole sheet, because that is how she reads it.
    expect(answers.map((a) => a.number)).toEqual([1, 2]);
  });
});

describe('it is a document the rest of the pipeline accepts', () => {
  it('round-trips through the IR parser', () => {
    const parsed = parseIR(sheet().markdown);
    expect(isGenerated(parsed)).toBe(true);
    expect(parsed.blocks).toHaveLength(3);
  });

  it('every block traces to an objective she wrote', () => {
    const parsed = parseIR(sheet().markdown);
    expect(checkObjectives(parsed, ['multiplicar con llevadas'])).toEqual([]);
  });

  /** The check is not a formality: a group we did not ask for must fail it. */
  it('fails the objective check if a block claims something she did not ask', () => {
    const { markdown } = buildSheet({
      title: 'X', lang: 'es',
      objectives: ['multiplicar con llevadas'],
      groups: [group('dividir entre dos cifras', [['144 ÷ 12', '12']])],
      composedOn: '2026-08-31',
    });
    const issues = checkObjectives(parseIR(markdown), ['multiplicar con llevadas']);
    expect(issues.some((i) => i.reason === 'unknown-objective')).toBe(true);
  });

  it('says the content is unreviewed, not merely the adaptation', () => {
    // Principle VII is louder here: nobody has read these exercises.
    const { doc } = sheet();
    expect(doc.frontMatter['content_unreviewed']).toBe(true);
    expect(doc.frontMatter['draft']).toBe(true);
  });

  it('records the objectives she asked for, even one that produced nothing', () => {
    const { doc } = buildSheet({
      title: 'X', lang: 'es',
      objectives: ['multiplicar con llevadas', 'los ríos de España'],
      groups: [group('multiplicar con llevadas', [['47 × 8', '376']])],
      composedOn: '2026-08-31',
    });
    // Her list is the record of what she asked, not of what we managed.
    expect(doc.frontMatter['objectives'])
      .toEqual(['multiplicar con llevadas', 'los ríos de España']);
  });

  it('carries what she must be told into report-notes, never onto the page', () => {
    const { doc } = buildSheet({
      title: 'X', lang: 'es', objectives: ['sumar'],
      groups: [group('sumar', [['25 + 25', '50']])],
      composedOn: '2026-08-31',
      notes: ['No me consta en qué curso está.'],
    });
    const notes = doc.blocks.find((b) => b.classes.includes('report-notes'));
    expect(notes?.content).toContain('No me consta en qué curso está.');
    // And it is the only block without an objective, which is what makes it legal.
    expect(notes?.attrs['data-objective']).toBeUndefined();
  });
});
