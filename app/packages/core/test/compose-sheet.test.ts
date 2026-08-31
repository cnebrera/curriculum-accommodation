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
  lang: 'es', materialKind: 'worksheet',
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
      title: 'Dos cosas', lang: 'es', materialKind: 'worksheet',
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
      title: 'X', lang: 'es', materialKind: 'worksheet',
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
      title: 'X', lang: 'es', materialKind: 'worksheet',
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
      title: 'X', lang: 'es', materialKind: 'worksheet', objectives: ['sumar'],
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

/**
 * A composed sheet is one of the four kinds like any other (002 FR-126, 012).
 *
 * **This was a live defect, and the check that found it was not a test.** It was
 * `scripts/check-fr-coverage.sh` — written on 2026-08-31 after Carlos pointed out that
 * a specification which grows while its tasks stand still is drift nothing was
 * catching. FR-126 had been in `002`'s spec since 30 August, cited in no task, and
 * never built.
 *
 * What it cost: the front matter carried `kind: 'generated'`, so
 * `materialKind('generated')` resolved to **null**, and a composed sheet reached
 * `runAdaptation` with no kind rule governing it — the exact failure `012` exists to
 * prevent, arriving through a door nobody was watching.
 *
 * `problems` is the kind that matters most here: a composed arithmetic sheet has a
 * verified answer key, and that kind's prohibition on changing quantities and
 * operations is what stops a revision quietly invalidating it.
 */
describe('the composed sheet carries a material kind', () => {
  const built = (materialKind: string) => buildSheet({
    title: 'X', lang: 'es', materialKind, objectives: ['sumar'], composedOn: '2026-08-31',
    groups: [{
      objective: 'sumar', instruction: 'Resuelve estas sumas.',
      accepted: [{ exercise: { expression: '25 + 25' }, answer: '50' }],
    }],
  });

  it('puts one of the four in `kind`, not «generated»', () => {
    expect(built('worksheet').doc.frontMatter['kind']).toBe('worksheet');
    expect(built('problems').doc.frontMatter['kind']).toBe('problems');
  });

  it('and it resolves against the shipped corpus, which «generated» did not', async () => {
    const { parseMaterialKinds, findKind } = await import('../src/index.js');
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');

    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const kinds = parseMaterialKinds(
      readFileSync(join(root, 'instructions', 'material-kinds.md'), 'utf8'), 'material-kinds.md');

    const declared = built('problems').doc.frontMatter['kind'] as string;
    const resolved = findKind(kinds, declared);

    expect(resolved, 'a composed sheet must be governed by a kind rule').not.toBeNull();
    // And the prohibition that protects the answer key.
    expect(resolved!.forbids).toContain('quantities');
    expect(resolved!.forbids).toContain('operations');

    // The old value, for contrast: it was in `kind` and resolved to nothing.
    expect(findKind(kinds, 'generated')).toBeNull();
  });

  it('still says Rampa made it, by a field of its own', () => {
    // Two facts were sharing one field, and the one that lost was `012`'s.
    const { doc, markdown } = built('worksheet');
    expect(doc.frontMatter['generated']).toBe(true);
    expect(doc.frontMatter['source']).toBe('composed');
    expect(isGenerated(parseIR(markdown))).toBe(true);
  });

  /** A vault written before this change still has documents in it. */
  it('recognises the old spelling, so her existing material keeps working', () => {
    const old = parseIR(['---', 'kind: "generated"', '---', '',
      '::: {#b1 .exercise}', '1. 47 × 8 =', ':::'].join('\n'));
    expect(isGenerated(old)).toBe(true);
  });
});
