import { describe, it, expect } from 'vitest';
import {
  composeUnverified, verifierFor, arithmetic, buildSheet, renderAnswerKey,
  buildComposeReport, UNVERIFIABLE_ES, parseIR,
  type Skill, type SheetGroup,
} from '../src/index.js';

/**
 * Where nothing can be checked (002 T021, FR-125).
 *
 * Most of what a teacher will ask for has no verifier and never will. For those
 * this feature produces **a draft for a professional to verify, not material to
 * hand out** — and the failure mode is not that the draft exists, it is her
 * believing it was checked.
 *
 * So the assertions here are about the *difference* being visible: a separate
 * group, `data-unverified` on the blocks, no answer in the key, and the sentence
 * leading the report rather than appearing in it.
 */
const tildes: Skill = { id: 'lengua.tildes', constraints: [] };

describe('which skills have a verifier', () => {
  it('arithmetic does', () => {
    expect(verifierFor({ id: 'arith.multiply', constraints: [] }, [arithmetic])).toBe(arithmetic);
  });

  it('and the honest answer for everything else is none', () => {
    expect(verifierFor(tildes, [arithmetic])).toBeNull();
  });
});

describe('one ask, no verdict, no retry', () => {
  /**
   * Deliberately not the compose loop. That loop is propose → verify → retry, and
   * there is nothing to retry *for* here — a second batch is not closer to correct
   * than the first, because nobody is measuring.
   */
  it('asks once', async () => {
    let calls = 0;
    const out = await composeUnverified(async (n) => {
      calls += 1;
      return Array.from({ length: n }, (_, i) => ({ expression: `ejercicio ${i + 1}` }));
    }, 3);

    expect(calls).toBe(1);
    expect(out.exercises).toHaveLength(3);
  });

  it('drops the duplicates a model offers', async () => {
    const out = await composeUnverified(
      async () => [{ expression: 'Pon la tilde: cantó' }, { expression: 'pon la tilde:  cantó' }],
      5);
    expect(out.exercises).toHaveLength(1);
  });

  /** The one field that could be mistaken for a checked answer is dropped here. */
  it('throws away the answer the model claimed', async () => {
    const out = await composeUnverified(
      async () => [{ expression: 'Pon la tilde: canto', statedAnswer: 'cantó' }], 1);

    expect(out.exercises[0]).toEqual({ expression: 'Pon la tilde: canto' });
    expect(Object.keys(out.exercises[0]!)).not.toContain('statedAnswer');
  });

  it('says when the model gave nothing', async () => {
    const out = await composeUnverified(async () => [], 3);
    expect(out.empty).toBe(true);
    expect(out.exercises).toEqual([]);
  });
});

describe('the difference is visible on every surface', () => {
  const group = (unverified: boolean): SheetGroup => ({
    objective: unverified ? 'poner bien las tildes' : 'multiplicar con llevadas',
    instruction: 'Resuelve.',
    ...(unverified ? { unverified: true } : {}),
    accepted: unverified
      ? [{ exercise: { expression: 'Pon la tilde: canto' }, answer: '' }]
      : [{ exercise: { expression: '47 × 8' }, answer: '376' }],
  });

  const both = () => buildSheet({
    title: 'Dos cosas', lang: 'es', materialKind: 'worksheet',
    objectives: ['multiplicar con llevadas', 'poner bien las tildes'],
    groups: [group(false), group(true)],
    composedOn: '2026-08-31',
  });

  it('marks the unchecked blocks in the document', () => {
    const { doc } = both();
    const marked = doc.blocks.filter((b) => b.attrs['data-unverified'] === '1');
    expect(marked).toHaveLength(1);
    expect(marked[0]!.content).toContain('Pon la tilde');
  });

  it('records the unchecked objectives in the front matter', () => {
    // One fact, read by the report, the key and the checklist — rather than three.
    expect(both().doc.frontMatter['unverified_objectives'])
      .toEqual(['poner bien las tildes']);
    expect(parseIR(both().markdown).frontMatter['unverified_objectives'])
      .toEqual(['poner bien las tildes']);
  });

  /** **The one that matters.** */
  it('puts no answer for them in the key', () => {
    const { answers, listing } = both();
    expect(answers.map((a) => a.expression)).toEqual(['47 × 8']);
    // And they are still on the sheet, and still listed.
    expect(listing.map((l) => l.verified)).toEqual([true, false]);
  });

  it('names them in the key rather than silently skipping them', () => {
    // A key that silently covers one of two objectives reads as complete, and the
    // one it skipped is the one she needed to look at.
    const key = renderAnswerKey({
      title: 'Dos cosas', composedOn: '2026-08-31', answers: both().answers,
      unverifiedObjectives: ['poner bien las tildes'],
    });
    expect(key).toContain('## Sin soluciones');
    expect(key).toContain('poner bien las tildes');
    expect(key).toContain('peor que ninguno');
  });

  it('leads the report with the sentence, unsoftened', () => {
    const report = buildComposeReport({
      title: 'Dos cosas', composedOn: '2026-08-31', leveled: [], outcomes: [],
      listing: both().listing, unverifiedObjectives: ['poner bien las tildes'],
    });

    expect(report.unchecked[0]).toContain('no material para dar');
    expect(report.unchecked[0]).toContain(UNVERIFIABLE_ES.slice(0, 40));
    // Named, so «esto» is not a whole sheet she has to guess about.
    expect(report.unchecked[0]).toContain('«poner bien las tildes»');
  });

  it('marks them in the report\'s list of what each exercise practises', () => {
    const report = buildComposeReport({
      title: 'Dos cosas', composedOn: '2026-08-31', leveled: [], outcomes: [],
      listing: both().listing, unverifiedObjectives: ['poner bien las tildes'],
    });
    expect(report.markdown).toContain('2. Pon la tilde: canto — *sin comprobar*');
    expect(report.markdown).toContain('- 1. 47 × 8\n');
  });

  it('says nothing about it when everything was checkable', () => {
    const report = buildComposeReport({
      title: 'X', composedOn: '2026-08-31', leveled: [], outcomes: [],
      listing: buildSheet({
        title: 'X', lang: 'es', materialKind: 'worksheet', objectives: ['multiplicar con llevadas'],
        groups: [group(false)], composedOn: '2026-08-31',
      }).listing,
    });
    expect(report.markdown).not.toContain('sin comprobar');
    expect(report.markdown).not.toContain('Sin soluciones');
  });
});
