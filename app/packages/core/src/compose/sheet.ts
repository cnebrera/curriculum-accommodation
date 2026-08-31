import type { Block, IRDocument } from '../ir/types.js';
import { irToMarkdown } from '../ingest/to-ir.js';
import type { Accepted } from './loop.js';

/**
 * The composed sheet, and the answer key that does not live on it
 * (002 T013/T014/T016, FR-105/106).
 *
 * ## Two documents, and the separation is the requirement
 *
 * The child's sheet is IR, and goes through the adaptation machinery unchanged —
 * that is T013, and it is why composition produces a *job* rather than a finished
 * page: one composition, N presentations (Principle IV). The learner's profile
 * decides how it looks; it does not decide what is asked.
 *
 * The answer key is a **separate document for her**. Not an attribute, not a
 * hidden block, not a `data-answer` the renderer is trusted to strip: a different
 * file. An answer that exists anywhere in the child's document is an answer one
 * bug away from being on his sheet, and the bug would be invisible — a worksheet
 * with the answers in the markup looks exactly like a worksheet.
 *
 * `buildSheet` therefore takes the answers and *does not write them*, and the
 * test asserts that over the serialised document rather than over this comment.
 *
 * ## The key is keyed to the expression, not to the number
 *
 * Exercise 3 on the composed sheet may be exercise 2 on the adapted one — a
 * recipe that splits a page or drops nothing can still renumber. `47 × 8 = 376`
 * survives that; «3. 376» does not, and a key that has silently slid by one is
 * worse than no key at all, because she will trust it.
 */

/** One group of exercises: what she asked for, and what survived verification. */
export interface SheetGroup {
  /** Her objective, verbatim and in her words. It is what `data-objective` holds. */
  objective: string;
  /** The instruction line above the exercises, in her language. */
  instruction: string;
  accepted: readonly Accepted[];
}

export interface SheetInput {
  title: string;
  lang: string;
  /** Her objectives, verbatim, in her order — including any that produced nothing. */
  objectives: readonly string[];
  /** What the content rests on, for a content composition (FR-102). */
  anchor?: string;
  /**
   * Whose level this was pitched at (FR-122).
   *
   * Recorded because the level is per learner and the sheet is a file: a composed
   * sheet adapted for a second learner is legal and ordinary, and this is the only
   * thing that says the bounds were somebody else's.
   */
  composedFor?: { code: string; yearId?: string };
  groups: readonly SheetGroup[];
  /**
   * The date, passed in. Never computed here: when something happened is a fact
   * about the process (Principle II), and a pure function that reads the clock is
   * a function whose output cannot be asserted.
   */
  composedOn: string;
  /**
   * Things the model must be told and she must be shown: a level that could not
   * be checked, an objective that produced nothing. They land in `report-notes`,
   * which is never learner-facing.
   */
  notes?: readonly string[];
}

export interface AnswerLine {
  objective: string;
  /** Position on the composed sheet, for reading down the page. */
  number: number;
  expression: string;
  /** Computed by code. Never the model's claim. */
  answer: string;
}

export interface ComposedSheet {
  doc: IRDocument;
  /** The IR as it is written to `ir.md`. */
  markdown: string;
  answers: AnswerLine[];
}

export function buildSheet(input: SheetInput): ComposedSheet {
  const blocks: Block[] = [];
  const answers: AnswerLine[] = [];
  let n = 0;
  let line = 1;

  const push = (b: Omit<Block, 'line' | 'notices'>): void => {
    blocks.push({ ...b, line, notices: [] });
    line += 3;
  };

  for (const [g, group] of input.groups.entries()) {
    if (group.accepted.length === 0) continue;

    push({
      id: `g${g + 1}-instruction`,
      classes: ['instruction'],
      attrs: { 'data-objective': group.objective },
      content: group.instruction,
    });

    for (const item of group.accepted) {
      n += 1;
      push({
        id: `g${g + 1}-e${n}`,
        classes: ['exercise'],
        attrs: { 'data-objective': group.objective },
        /*
         * The trailing `=` and nothing after it. The exercise is the question;
         * the answer is in the other document.
         */
        content: `${n}. ${item.exercise.expression} =`,
      });
      answers.push({
        objective: group.objective,
        number: n,
        expression: item.exercise.expression,
        answer: item.answer,
      });
    }
  }

  if (input.notes && input.notes.length > 0) {
    push({
      id: 'report-notes',
      classes: ['report-notes'],
      attrs: {},
      content: input.notes.join('\n'),
    });
  }

  const doc: IRDocument = {
    frontMatter: {
      /*
       * `kind: generated` is what the rest of the pipeline branches on: the
       * provenance check keys blocks to objectives rather than to source blocks,
       * and the adaptation gate knows there was no extraction to verify.
       */
      kind: 'generated',
      /*
       * What the record reads to classify this job (`014` `sourceOf`). It looks
       * for `source: composed` and the objectives beside it — written here so the
       * history says «generado a partir de: multiplicar con llevadas» rather than
       * «pegado».
       */
      source: 'composed',
      title: input.title,
      lang: input.lang,
      objectives: [...input.objectives],
      composed_on: input.composedOn,
      ...(input.anchor ? { anchor: input.anchor } : {}),
      ...(input.composedFor ? { composed_for: input.composedFor.code } : {}),
      ...(input.composedFor?.yearId ? { level_from: input.composedFor.yearId } : {}),
      /**
       * Louder than elsewhere (Principle VII, T016).
       *
       * Every other document in Rampa is a draft because its *adaptation* has not
       * been reviewed. This one is a draft because its **content** has not been:
       * nobody has read these exercises. The flag is in the front matter so the
       * renderer and the checklist read the same fact rather than each deciding
       * it.
       */
      draft: true,
      content_unreviewed: true,
    },
    blocks,
    notices: [],
  };

  return { doc, markdown: irToMarkdown(doc), answers };
}

/**
 * The answer key, as a document for her (T014).
 *
 * Says whose answers these are in the first two lines, because the one thing that
 * must not happen is this page going into the photocopier with the other one — and
 * because «las he calculado yo, no el modelo» is the fact that makes the sheet
 * worth trusting. It is also the only claim in Rampa's output that is about our
 * own correctness, so it is stated plainly and it is true: the arithmetic is
 * computed offline by code that never sees a model.
 */
export function renderAnswerKey(input: {
  title: string;
  composedOn: string;
  answers: readonly AnswerLine[];
}): string {
  const lines: string[] = [
    `# Soluciones — ${input.title}`,
    '',
    '**Esta hoja es para ti, no para el alumno.** No la imprimas junto con la suya.',
    '',
    'Las cuentas las he calculado yo, no el modelo de IA: son exactas. Lo que sí '
    + 'tienes que revisar es si los ejercicios le sirven.',
    '',
    `Generado el ${input.composedOn}.`,
  ];

  let current = '';
  for (const a of input.answers) {
    if (a.objective !== current) {
      current = a.objective;
      lines.push('', `## ${a.objective}`, '');
    }
    lines.push(`${a.number}. ${a.expression} = **${a.answer}**`);
  }

  if (input.answers.length === 0) {
    lines.push('', 'No he podido generar ningún ejercicio comprobable.');
  }

  return lines.join('\n') + '\n';
}
