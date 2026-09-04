import { describe, it, expect } from 'vitest';
import {
  buildSheet, renderAnswerKey, renderHTML, renderLinear, renderODT,
  presentationFor, ANSWER_KEY_HEADING, UNCHECKED_ENTRY_ES,
} from '../src/index.js';

/**
 * A composed exam carries no answer, in any modality (027 T001, SC-2502, FR-2503).
 *
 * ## Why this is task one
 *
 * Its failure mode is an answer printed on the page a child sits an exam with. And a
 * check written after the feature works is a check written to fit what already happens
 * — `021` T001's lesson, on a sharper document.
 *
 * ## Why it is asserted over the rendered output and not over the IR
 *
 * Because the IR is where the answer is *not written*, and that has been true since
 * `002`. What is new here is three renderers and a support layer: an `alt`, an
 * `aria-label`, a data attribute, an ODT style name, a linear announcement. Any of those
 * can carry a string the IR does not show, and «not in the IR» would pass while the page
 * says 157.
 *
 * ## And the same for problems
 *
 * A statement that contains its own computed answer has the answer on his page just as
 * surely — which is why `verifyProblem` rejects it and why it is asserted here too.
 */
const OBJECTIVE = 'Restas con llevadas';

/*
 * The linear options, with the answer-space sentence **from the corpus** rather than a
 * literal — `019` put that phrasing in `instructions/audio.md` because which Spanish
 * wording carries «there is a box here» is a judgement a PT can correct. Passed in as a
 * fixture so this file tests the renderer and not the shipped file.
 */
const LINEAR = {
  modality: 'audio' as const,
  spatialPhrases: [] as string[],
  answerSpace: 'Aquí hay un hueco para contestar.',
};

/** Two computable questions and one that nothing can check. */
const exam = buildSheet({
  title: 'Prueba del tema 4',
  lang: 'es',
  materialKind: 'exam',
  objectives: [OBJECTIVE],
  composedOn: '2026-09-04',
  groups: [{
    of: 'questions',
    objective: OBJECTIVE,
    instruction: 'Contesta a cada pregunta.',
    questions: [
      { text: 'Calcula: 305 − 148', expression: '305 - 148', answer: '157' },
      { text: 'Calcula: 812 − 267', expression: '812 - 267', answer: '545' },
      {
        text: 'Explica cómo lo has hecho.',
        // Reaches the key, labelled unchecked, and nothing else. Ever.
        draftAnswer: 'Se toma prestada una decena.',
      },
    ],
  }],
});

const problems = buildSheet({
  title: 'Problemas de dinero',
  lang: 'es',
  materialKind: 'problems',
  objectives: [OBJECTIVE],
  composedOn: '2026-09-04',
  groups: [{
    of: 'problems',
    objective: OBJECTIVE,
    instruction: 'Resuelve cada problema.',
    problems: [{
      statement: 'María tiene 3,50 € y compra un cuaderno que cuesta 1,20 €. ¿Cuánto le queda?',
      expression: '3,50 - 1,20',
      answer: '2.3',
    }],
  }],
});

/** Every string that must not appear on a learner's page, from either document. */
const ANSWERS = ['157', '545', '2,3', '2.3', 'Se toma prestada una decena'];

const renderings = (sheet: ReturnType<typeof buildSheet>): Array<[string, string]> => [
  ['HTML', renderHTML(sheet.doc, { presentation: presentationFor({}) })],
  ['ODT', new TextDecoder().decode(renderODT(sheet.doc))],
  ['linear', renderLinear(sheet.doc, LINEAR)
    .blocks.map((b) => `${b.text} ${b.because ?? ''}`).join('\n')],
];

describe('the exam a child sits', () => {
  it('has no answer in any rendering, in text or in any support layer', () => {
    for (const [modality, out] of renderings(exam)) {
      for (const answer of ANSWERS) {
        expect(out, `«${answer}» reached the ${modality} of an exam`).not.toContain(answer);
      }
    }
  });

  it('has the questions, numbered, so the absence above is not an empty page', () => {
    // The trap this closes: «contains no answers» passes trivially for a blank sheet.
    for (const [modality, out] of renderings(exam)) {
      expect(out, `the ${modality} lost the questions`).toContain('305');
      expect(out, `the ${modality} lost the questions`).toContain('Explica cómo lo has hecho');
    }
  });

  it('gives somewhere to write, in every modality that has a page', () => {
    /*
     * Asserted on the **element**, not on the class name.
     *
     * `toContain('answer-space')` passes on the stylesheet, which is emitted whether or
     * not any block asked for space — the second time in two days this project has
     * written a test that a CSS rule satisfies. Mutation caught it: removing the
     * attribute the renderer reads left the suite green.
     */
    const html = renderings(exam)[0]![1];
    expect((html.match(/<div class="answer-space">/g) ?? []).length).toBe(3);
    expect(html).toContain('Respuesta:');

    /*
     * One ruled paragraph per question, not two — a five-question exam with two ran onto
     * a second page whose only content was a stray rule, and a ten-question one would
     * have been four pages of air. Found by printing it (T024), which is why the count
     * is asserted rather than «at least one».
     */
    const odt = renderings(exam)[1]![1];
    expect((odt.match(/text:style-name="RespuestaLinea"/g) ?? []).length).toBe(3);
    expect(odt).toContain('>Respuesta:<');
  });

  it('and the linear reading says there is somewhere to write rather than drawing it', () => {
    // Lines on a page mean nothing read aloud; what the listener needs is to be told.
    const linear = renderLinear(exam.doc, LINEAR);
    expect(linear.blocks.filter((b) => b.text === LINEAR.answerSpace)).toHaveLength(3);
  });

  it('marks the question nothing checked, on the page, per item', () => {
    // FR-2504 is per item on purpose: a sheet «unverified somewhere» teaches her to
    // distrust all of it, and then she checks none of it.
    const q = exam.doc.blocks.filter((b) => b.classes.includes('assessment'));
    expect(q).toHaveLength(3);
    expect(q.filter((b) => b.attrs['data-unverified'] === '1')).toHaveLength(1);
    expect(q[2]!.attrs['data-unverified']).toBe('1');
  });

  it('records the objective as unverified in the front matter, not only per block', () => {
    expect(exam.doc.frontMatter['unverified_objectives']).toEqual([OBJECTIVE]);
  });

  /**
   * On the page, beside the draft mark, **naming the numbers** (FR-2504).
   *
   * Per item because a sheet that says «hay preguntas sin comprobar» teaches her to
   * distrust all ten — and a teacher who distrusts all ten checks none of them. It also
   * has to be printed: whoever picks this up next did not see the screen she saw.
   */
  it('names on the page which items nobody checked, and only those', () => {
    for (const [modality, out] of renderings(exam)) {
      /*
       * «la 3», not «3» — and with several, «la 4 y la 5» rather than «4, 5», which in
       * Spanish reads as four point five. Found by printing the page.
       */
      expect(out, `the ${modality} does not say which items are unchecked`)
        .toContain('Ojo: la 3 no la ha comprobado nadie');
    }
    // Right after the draft banner and before the questions, not at the foot of the page.
    const html = renderings(exam)[0]![1];
    expect(html.indexOf('no la ha comprobado nadie')).toBeLessThan(html.indexOf('305'));
  });

  it('lists several in Spanish, not as a decimal number', () => {
    // «Ojo: 4, 5 no las ha comprobado nadie» opens by saying four point five. On the one
    // sheet whose job is to be trusted about which items were checked.
    const two = buildSheet({
      title: 'Prueba', lang: 'es', materialKind: 'exam', objectives: [OBJECTIVE],
      composedOn: '2026-09-04',
      groups: [{
        of: 'questions', objective: OBJECTIVE, instruction: 'Contesta.',
        questions: [
          { text: 'Calcula: 305 − 148', expression: '305 - 148', answer: '157' },
          { text: 'Explica cómo.' },
          { text: 'Inventa una.' },
        ],
      }],
    });
    const html = renderHTML(two.doc, { presentation: presentationFor({}) });
    expect(html).toContain('Ojo: la 2 y la 3 no las ha comprobado nadie');
    expect(html).not.toContain('Ojo: 2, 3');
  });

  it('and says nothing at all when everything was checked', () => {
    const clean = buildSheet({
      title: 'Prueba', lang: 'es', materialKind: 'exam', objectives: [OBJECTIVE],
      composedOn: '2026-09-04',
      groups: [{
        of: 'questions', objective: OBJECTIVE, instruction: 'Contesta.',
        questions: [{ text: 'Calcula: 305 − 148', expression: '305 - 148', answer: '157' }],
      }],
    });
    expect(renderHTML(clean.doc, { presentation: presentationFor({}) }))
      .not.toContain('no la ha comprobado nadie');
    expect(clean.doc.frontMatter['unverified_objectives']).toBeUndefined();
  });
});

describe('the problem statements', () => {
  it('carry no computed answer, and no operation either', () => {
    for (const [modality, out] of renderings(problems)) {
      expect(out, `the answer reached the ${modality}`).not.toContain('2,3');
      expect(out, `the answer reached the ${modality}`).not.toContain('2.3');
      // The operation is a fact about how it was checked, and it belongs beside the
      // answer in the other document — printed under the statement it is a solved problem.
      expect(out, `the operation reached the ${modality}`).not.toMatch(/3,50\s*-\s*1,20/);
    }
  });

  it('and give him somewhere to work them out', () => {
    // Decided by printing the page (T024): three stories crammed at the top of an empty
    // sheet is a page that sends him to a notebook and back, and that transition is
    // where he is lost.
    const html = renderings(problems)[0]![1];
    expect((html.match(/<div class="answer-space">/g) ?? []).length).toBe(1);
  });

  it('but keep the statement, quantities included, because he needs them', () => {
    for (const [, out] of renderings(problems)) {
      expect(out).toContain('3,50');
      expect(out).toContain('1,20');
    }
  });
});

describe('the key, which is where the answers live', () => {
  const key = renderAnswerKey({
    title: 'Prueba del tema 4', composedOn: '2026-09-04', answers: exam.key,
  });

  it('says on its face that it is not to be handed out', () => {
    expect(key).toContain(ANSWER_KEY_HEADING);
  });

  it('carries the computed answers', () => {
    expect(key).toContain('157');
    expect(key).toContain('545');
  });

  /**
   * Research R3's position, and its label doing the work.
   *
   * This departs from the skill path, where a model's stated answer is dropped outright
   * («a proposed result presented as a solution is worse than none»). It is defensible
   * only because the label is per entry and leads the line — so the assertion is that
   * the label comes **before** the draft, not merely that both exist.
   */
  it('carries an unchecked draft only behind its own label, and led by it', () => {
    expect(key).toContain(UNCHECKED_ENTRY_ES);
    expect(key).toContain('Se toma prestada una decena');
    expect(key.indexOf(UNCHECKED_ENTRY_ES)).toBeLessThan(key.indexOf('Se toma prestada'));
  });

  it('keeps the entries in sheet order, so she marks down the page', () => {
    const at = (s: string) => key.indexOf(s);
    expect(at('157')).toBeLessThan(at('545'));
    expect(at('545')).toBeLessThan(at('Se toma prestada'));
  });
});
