import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  parseMaterialKinds, findKind, forbids, buildAdaptPrompt, buildReport, parseIR,
  type MaterialKind, type Profile,
} from '../src/index.js';

/**
 * What the material is (012 T007, FR-1001…1008).
 *
 * The headline case is the one the spec asks for by name: **the same document,
 * once as a worksheet and once as an exam, and the prompts differ.** Everything
 * else here defends the two ways that can rot — a kind that gets defaulted, and a
 * document that gets to decide its own kind.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const KINDS = parseMaterialKinds(
  readFileSync(join(repoRoot, 'instructions', 'material-kinds.md'), 'utf8'), 'material-kinds.md');

const profile = (axes: Record<string, 0 | 1 | 2 | 3> = { COG: 2 }): Profile => ({
  code: 'B01', axes, works: [], avoid: [], interests: [], response: {}, language: {},
} as Profile);

const MATERIAL = '::: {#b1 .exercise}\nCalcula 47 × 8.\n:::\n';

const promptFor = (kind: MaterialKind | null): string =>
  buildAdaptPrompt({ profile: profile(), recipes: [], material: MATERIAL, kind }).prompt;

describe('the corpus ships four kinds, and they are corpus', () => {
  it('parses all four', () => {
    expect(KINDS.map((k) => k.id).sort()).toEqual(['exam', 'problems', 'study', 'worksheet']);
  });

  it('every kind names what it forbids, which is what makes it a kind', () => {
    for (const k of KINDS) {
      expect(k.forbids.length, `${k.id} forbids nothing, so it is a label`).toBeGreaterThan(0);
      expect(k.rule.length, `${k.id} has no rule for the model`).toBeGreaterThan(40);
    }
  });

  it('labels are her words, not categories', () => {
    // «Una hoja de problemas», not `problem_set`.
    for (const k of KINDS) expect(k.label).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
    expect(findKind(KINDS, 'problems')!.label.toLowerCase()).toContain('problemas');
  });

  it('the exam forbids the demand of a question and the number of items', () => {
    const exam = findKind(KINDS, 'exam')!;
    expect(forbids(exam, 'question-demand')).toBe(true);
    expect(forbids(exam, 'item-count')).toBe(true);
  });

  it('problems forbid the quantities and the operations', () => {
    const p = findKind(KINDS, 'problems')!;
    expect(forbids(p, 'quantities')).toBe(true);
    expect(forbids(p, 'operations')).toBe(true);
  });
});

describe('parsing repairs rather than rejects', () => {
  const wrap = (body: string): string => `---\n${body}\n---\n\n# t\n`;

  it('drops a kind with no rule, and keeps the rest', () => {
    const kinds = parseMaterialKinds(wrap(
      'kinds:\n'
      + '  - id: ok\n    label: Una ficha\n    rule: >\n      No cambies nada importante, de verdad.\n'
      + '  - id: empty\n    label: Sin regla\n'));
    // A label with nothing behind it puts an option in front of her that changes
    // nothing, which is worse than not offering it.
    expect(kinds.map((k) => k.id)).toEqual(['ok']);
  });

  it('drops a duplicate id rather than letting file order decide', () => {
    const kinds = parseMaterialKinds(wrap(
      'kinds:\n'
      + '  - id: dup\n    label: Primera\n    rule: >\n      Una regla suficientemente larga para pasar.\n'
      + '  - id: dup\n    label: Segunda\n    rule: >\n      Otra regla suficientemente larga para pasar.\n'));
    expect(kinds).toHaveLength(1);
    expect(kinds[0]!.label).toBe('Primera');
  });

  it('a malformed file yields no kinds rather than throwing', () => {
    expect(parseMaterialKinds('no front matter at all')).toEqual([]);
  });

  it('an unknown id resolves to null, never to worksheet', () => {
    // FR-1003. A fallback here is the whole defect: it is how an exam became a
    // worksheet before the model saw it.
    expect(findKind(KINDS, 'examen')).toBeNull();
    expect(findKind(KINDS, undefined)).toBeNull();
    expect(findKind(KINDS, '')).toBeNull();
  });
});

describe('the same document, as a worksheet and as an exam', () => {
  /** The test the specification asks for by name (US1, Independent Test). */
  it('produces different prompts', () => {
    const asWorksheet = promptFor(findKind(KINDS, 'worksheet'));
    const asExam = promptFor(findKind(KINDS, 'exam'));

    expect(asWorksheet).not.toBe(asExam);
    expect(asExam).toMatch(/examen|prueba/i);
    expect(asWorksheet).toMatch(/ficha|ejercicios/i);
  });

  it('the exam prompt carries the constraint about this document', () => {
    const asExam = promptFor(findKind(KINDS, 'exam'));
    // `hard-rules.md` rule 5 has always said this in general. The point of `012`
    // is that it is now asserted about the document in front of the model.
    expect(asExam).toMatch(/vía de acceso/i);
    expect(asExam).toMatch(/no cambies lo que se pregunta/i);
  });

  it('the problems prompt forbids touching the numbers', () => {
    expect(promptFor(findKind(KINDS, 'problems'))).toMatch(/no cambies las cantidades/i);
  });

  it('the study prompt forbids summarising the content away', () => {
    expect(promptFor(findKind(KINDS, 'study'))).toMatch(/no resumas/i);
  });

  /**
   * The absence that matters. Every document in every vault predates `012`, and a
   * prompt that quietly asserted the worksheet rule about one of them would be
   * the original defect wearing a new coat.
   */
  it('says nothing at all when she has not said', () => {
    const silent = promptFor(null);
    expect(silent).not.toMatch(/Qué es este material/);
    expect(silent).not.toMatch(/ficha/i);
  });
});

describe('the report says under which rule it happened', () => {
  const adapted = (body: string) => parseIR(`---\nkind: "exam"\n---\n\n${body}`);

  it('names the kind and what it forbade', () => {
    const report = buildReport({
      adapted: adapted('::: {#b1 .assessment data-recipe="exam-access-not-difficulty@1" data-axis="COG" data-from="b1"}\nx\n:::\n'),
      kind: findKind(KINDS, 'exam'),
    });
    expect(report.markdown).toMatch(/Lo he tratado como: un examen/i);
    expect(report.markdown).toMatch(/lo que pregunta cada pregunta/);
    expect(report.markdown).toMatch(/cuántas preguntas se evalúan/);
  });

  it('says nothing about the kind when there is none', () => {
    const report = buildReport({ adapted: adapted('::: {#b1 .exercise}\nx\n:::\n'), kind: null });
    expect(report.markdown).not.toMatch(/Lo he tratado como/);
    expect(report.kindDisagreement).toBeNull();
  });
});

describe('when the document disagrees with her, she is told and nothing changes', () => {
  const withAssessment = parseIR(
    '---\nkind: "worksheet"\n---\n\n::: {#b1 .assessment}\n¿Cuánto es 47 × 8?\n:::\n');

  /**
   * FR-1005 and Principle IX. Ingested material is attacker-controllable, so this
   * check runs in **one direction only**: a document may raise a question and may
   * never answer one.
   */
  it('reports assessment blocks in a stated worksheet', () => {
    const report = buildReport({ adapted: withAssessment, kind: findKind(KINDS, 'worksheet') });
    expect(report.kindDisagreement).toMatch(/forma de pregunta de examen/);
    // And it says what it did: adapted as told.
    expect(report.kindDisagreement).toMatch(/como me dijiste/);
    // And offers her the fix rather than applying it.
    expect(report.kindDisagreement).toMatch(/dímelo/);
  });

  it('does not treat it as an exam on the strength of its own blocks', () => {
    const report = buildReport({ adapted: withAssessment, kind: findKind(KINDS, 'worksheet') });
    // The rule reported is still hers.
    expect(report.markdown).toMatch(/Lo he tratado como: una ficha/i);
    expect(report.markdown).not.toMatch(/Lo he tratado como: un examen/i);
  });

  it('says nothing when she called it an exam and it looks like one', () => {
    const report = buildReport({
      adapted: parseIR('---\nkind: "exam"\n---\n\n::: {#b1 .assessment}\n¿Cuánto?\n:::\n'),
      kind: findKind(KINDS, 'exam'),
    });
    expect(report.kindDisagreement).toBeNull();
  });

  /** A worksheet ending in a question is ordinary, not a finding. */
  it('does not nag about a worksheet with no assessment blocks', () => {
    const report = buildReport({
      adapted: parseIR('---\nkind: "worksheet"\n---\n\n::: {#b1 .exercise}\nCalcula\n:::\n'),
      kind: findKind(KINDS, 'worksheet'),
    });
    expect(report.kindDisagreement).toBeNull();
  });
});

describe('signposting an exam is half of signposting a worksheet (018/019 era)', () => {
  /**
   * `signpost-the-page` is scoped to `instruction`, so it fires on an exam paper —
   * the selection baseline shows it, beside `exam-access-not-difficulty`.
   *
   * That is correct for the count and the numbering: «son seis preguntas» changes
   * nothing that is asked. It is **not** correct for «empieza por la 1», which
   * changes how the paper is taken, or for progress boxes, which are a mark
   * somebody has to interpret and which `012`'s own checklist calls scaffolding.
   *
   * The recipe is prose for a model, so this asserts the prose says so — the same
   * way `012`'s hard rules are asserted rather than assumed.
   */
  it('the recipe tells the model which half does not apply', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const flat = readFileSync(join(root, 'recipes', 'core', 'signpost-the-page.md'), 'utf8')
      .replace(/\s+/g, ' ');

    expect(flat).toContain('In an exam, only half of this');
    expect(flat).toContain('No «empieza por la 1»');
    expect(flat).toContain('No progress boxes');
    // And it says what is still allowed, so the model does not conclude «skip it».
    expect(flat).toContain('saying how many questions there are');
  });
});
