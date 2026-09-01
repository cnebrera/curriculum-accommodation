import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseMaterialKinds, buildSheet, renderAnswerKey } from '../src/index.js';

/**
 * Rampa never says what a child's answer is worth (021 T023, FR-1913/FR-1914, SC-1905).
 *
 * `021` lets her ask Rampa to **write an exam**. That is a language model proposing the
 * questions of a graded test, and the limit is not «be careful»: it is that deciding what
 * a child's answer is worth is a decision about that child, and this application does not
 * take those.
 *
 * ## Why these are absences
 *
 * A limit like this cannot be tested by looking for the right behaviour — there is no
 * right output to compare against. It can only be tested by the wrong one being absent.
 * So this walks the corpus and the source and asserts that nothing anywhere produces a
 * mark scheme, a weighting, a pass mark or a judgement of a learner's answer.
 *
 * ## Why the corpus is checked and not only the code
 *
 * `rule` and the composing prompt are sent to the model **literally**. A sentence in
 * `compose.md` asking for «una puntuación orientativa» would produce exactly the output
 * this forbids, with no code change and no review — Principle I cuts both ways.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const instructions = join(root, '..', 'instructions');

/** A composed exam and its key, from the deterministic path. */
function examSheet() {
  const kinds = parseMaterialKinds(
    readFileSync(join(instructions, 'material-kinds.md'), 'utf8'));
  const onDocument = kinds.find((k) => k.id === 'exam')?.composing?.onDocument ?? [];
  const sheet = buildSheet({
    title: 'Prueba de multiplicaciones',
    lang: 'es',
    materialKind: 'exam',
    kindNotes: onDocument,
    objectives: ['Multiplicar con llevadas'],
    groups: [{
      objective: 'Multiplicar con llevadas',
      instruction: 'Resuelve.',
      accepted: [{ exercise: { expression: '47 × 8' }, answer: '376' }],
    }],
    content: [],
    composedOn: '2026-09-01',
    notes: [],
  });
  const key = renderAnswerKey({
    title: 'Prueba de multiplicaciones', composedOn: '2026-09-01', answers: sheet.answers,
  });
  return { sheet, key };
}

/**
 * ## Why this does not scan the corpus prose
 *
 * The first version grepped `instructions/*.md` for «2 puntos», «nota de corte» and the
 * like — and found three files. All three were **the prohibition itself**: `compose.md`
 * saying «nada de baremo… ni "esto vale 2 puntos"», and `guide.md` quoting a real
 * accommodation, «material con tipografía de 14 puntos», which is a font size.
 *
 * Tenth over-specified assertion in this project, and the most instructive: scanning the
 * text of a rule for the thing the rule forbids will always find the rule. So the check
 * is over **what Rampa produces** — deterministic output, which is the only part of this
 * that can be asserted at all — plus the presence of the prohibition in the prompt the
 * model actually reads.
 */

/** Constructions that only appear when a value is being assigned. */
const ASSIGNS_VALUE = [
  /\b\d+([.,]\d+)?\s*puntos?\b/i,
  /\bvale\s+\d/i,
  /\bbaremo\b/i,
  /\bnota\s+de\s+corte\b/i,
  /\bcalificaci[óo]n\b/i,
  /\bponderaci[óo]n\b/i,
  /\bapto\b/i,
];

describe('nothing Rampa writes assigns a value', () => {
  /*
   * The composed sheet and the answer key, which are the two documents `021` makes
   * printable — built here from the deterministic path, with an exam's own sentences on
   * the page, because that is the document where a mark scheme would be most plausible.
   */
  const exam = examSheet();

  it('is not vacuous: the sheet has exercises and the key has answers', () => {
    expect(exam.sheet.markdown).toContain('47 × 8');
    expect(exam.key).toContain('376');
  });

  it.each(ASSIGNS_VALUE.map((re) => [re.source, re] as const))(
    'the composed exam never says %s', (_label, re) => {
      expect(re.test(exam.sheet.markdown)).toBe(false);
    });

  it.each(ASSIGNS_VALUE.map((re) => [re.source, re] as const))(
    'the answer key never says %s', (_label, re) => {
      expect(re.test(exam.key)).toBe(false);
    });

  it('and its own printed sentences carry no value either', () => {
    // The exam's `on_document` lines are the one place a «vale 2 puntos» could arrive
    // from the corpus rather than from the model.
    const kinds = parseMaterialKinds(
      readFileSync(join(instructions, 'material-kinds.md'), 'utf8'));
    const onDoc = (kinds.find((k) => k.id === 'exam')?.composing?.onDocument ?? []).join(' ');
    for (const re of ASSIGNS_VALUE) expect(re.test(onDoc), re.source).toBe(false);
  });
});

describe('the prompt that writes an exam is told not to', () => {
  it('forbids it where composing is described', () => {
    /*
     * The only guarantee available for the model's own output: `007` settled that a
     * prompt instruction shares its context window with content that may contradict it,
     * so this is necessary and not sufficient. What makes it sufficient is that the
     * deterministic parts above emit nothing of the kind, and that the answer key is
     * computed rather than asked for (`002`).
     */
    const compose = readFileSync(join(instructions, 'compose.md'), 'utf8').toLowerCase();
    expect(compose).toContain('baremo');
    expect(compose).toMatch(/no\s+puedes\s+decidir|nada de baremo/);
    expect(compose, 'and no marking of a learner’s answers').toMatch(/corregir|puntuar/);
  });
});

describe('the exam kind carries its limits, and they come from the corpus', () => {
  const kinds = parseMaterialKinds(readFileSync(join(instructions, 'material-kinds.md'), 'utf8'));
  const exam = kinds.find((k) => k.id === 'exam');

  it('exists and can be asked for', () => {
    expect(exam).toBeDefined();
  });

  it('says on the document that she validates every question (FR-1911)', () => {
    const onDoc = (exam?.composing?.onDocument ?? []).join(' ').toLowerCase();
    expect(onDoc).toContain('válida');
  });

  it('says on the document that a different assessment is the team’s decision (FR-1912)', () => {
    const onDoc = (exam?.composing?.onDocument ?? []).join(' ').toLowerCase();
    expect(onDoc).toContain('equipo docente');
  });

  it('warns her before it runs, not only afterwards', () => {
    expect(exam?.composing?.before ?? '').toMatch(/válida|validas/i);
  });

  it('does not put these sentences on the other three kinds', () => {
    // A worksheet does not need to say who validates it: everything Rampa produces
    // already carries the draft mark, and a warning on everything is a warning on
    // nothing.
    for (const k of kinds.filter((k) => k.id !== 'exam')) {
      expect(k.composing?.onDocument ?? [], k.id).toEqual([]);
    }
  });
});
