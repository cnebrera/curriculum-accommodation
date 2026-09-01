import { describe, it, expect } from 'vitest';
import {
  buildSheet, renderAnswerKey, ANSWER_KEY_HEADING, parseIR, renderHTML, renderLinear,
  presentationFor,
} from '../src/index.js';

/**
 * Answers never reach a child's page (021 T001, SC-1908).
 *
 * Written **before** the answer key became printable, which is the whole reason it is
 * task one. `021` makes the teacher's copy renderable and exportable — useful, because she
 * takes it to class — and that adds one specific risk: a page of answers in the photocopy
 * pile, going home with a nine-year-old.
 *
 * So this checks **both sides**, and the reason both are here is that either one failing
 * is the same accident:
 *
 * 1. **No rendering of a learner's material contains an answer.** Composed and adapted, in
 *    every modality, because `019` made «one document, N renderings» real and a rule that
 *    holds in HTML and not in the linear text is not a rule.
 * 2. **Every rendering of the key says on its face that it is not to be handed out.** A
 *    sheet of sums with the answers filled in looks exactly like a worksheet — that is the
 *    sentence `002` already wrote in `sheet.ts`, and it is why the marking has to survive
 *    every format it can be turned into.
 *
 * `buildSheet` takes the answers and does not write them; this is the check that the rest
 * of the application never undoes that.
 */

const EXERCISES = [
  { expression: '47 × 8', answer: '376' },
  { expression: '36 × 9', answer: '324' },
] as const;

const OBJECTIVE = 'Multiplicar con llevadas';

const sheet = buildSheet({
  title: 'Multiplicaciones',
  lang: 'es',
  materialKind: 'worksheet',
  objectives: [OBJECTIVE],
  groups: [{
    objective: OBJECTIVE,
    instruction: 'Resuelve estas multiplicaciones.',
    // The answer is **computed**, never taken from the model — `Accepted` exists to
    // carry that distinction, and this fixture keeps it.
    accepted: EXERCISES.map((e) => ({
      exercise: { expression: e.expression },
      answer: e.answer,
    })),
  }],
  content: [],
  composedOn: '2026-09-01',
  notes: [],
});

/** Every answer that must not appear, as it would be written. */
const FORBIDDEN = EXERCISES.map((e) => e.answer);

describe('no answer is on the learner’s page', () => {
  it('is absent from the composed document itself', () => {
    for (const answer of FORBIDDEN) {
      expect(sheet.markdown, `«${answer}» is on the sheet`).not.toContain(answer);
    }
    // Not vacuous: the exercise it belongs to *is* there.
    expect(sheet.markdown).toContain('47 × 8');
  });

  it('is absent from the printed rendering', () => {
    const html = renderHTML(parseIR(sheet.markdown), {
      presentation: presentationFor({ COG: 2 }), signedOff: false,
    });
    for (const answer of FORBIDDEN) {
      expect(html, `«${answer}» reached the HTML`).not.toContain(answer);
    }
    expect(html).toContain('47');
  });

  it('is absent from the linear rendering, for audio and for braille', () => {
    /*
     * `019`'s modalities are where a rule like this gets quietly lost: the linear
     * renderer walks the document differently, and a check that only ever looked at
     * HTML would have said nothing about the file a transcriber receives.
     */
    for (const modality of ['audio', 'braille'] as const) {
      const out = renderLinear(parseIR(sheet.markdown), {
        modality,
        // The corpus values, passed in — which is the point of `019` taking them as
        // options rather than reading the file: the behaviour is testable against a
        // list instead of against whatever shipped.
        spatialPhrases: ['une con flechas', 'rodea'],
        answerSpace: 'aquí va tu respuesta',
      });
      const text = out.blocks.map((b) => b.text).join('\n');
      for (const answer of FORBIDDEN) {
        expect(text, `«${answer}» reached the ${modality} text`).not.toContain(answer);
      }
    }
  });
});

describe('every rendering of the key says it is not to be handed out', () => {
  const key = renderAnswerKey({
    title: 'Multiplicaciones', composedOn: '2026-09-01', answers: sheet.answers,
  });

  it('carries the heading, and the heading is one shared constant', () => {
    /*
     * A constant rather than a literal in each renderer, because this string is the
     * thing standing between a page of answers and the photocopy pile — and two copies
     * of it is one copy that gets edited.
     */
    expect(key).toContain(ANSWER_KEY_HEADING);
    expect(ANSWER_KEY_HEADING.toUpperCase()).toContain('NO REPARTIR');
  });

  it('says so before the first answer, not after the last', () => {
    // She stops reading when she has found what she came for. A warning below the
    // answers is a warning she reads after printing them.
    expect(key.indexOf(ANSWER_KEY_HEADING)).toBeLessThan(key.indexOf('376'));
  });

  it('does contain the answers, so the checks above are not vacuous', () => {
    for (const answer of FORBIDDEN) expect(key).toContain(answer);
  });

  it('is a document of its own and never the learner’s', () => {
    // The two must not be confusable at a glance: the key names itself in its title.
    expect(key.split('\n')[0]!.toLowerCase()).toContain('soluciones');
    expect(sheet.markdown.toLowerCase()).not.toContain('soluciones');
  });
});
