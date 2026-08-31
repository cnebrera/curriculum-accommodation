import type { ComposeOutcome } from '../compose/loop.js';
import { explainOutcome } from '../compose/loop.js';
import { explainLevel, type Leveled } from '../compose/level.js';
import type { AnswerLine } from '../compose/sheet.js';

/**
 * The composition report (002 T015, FR-107).
 *
 * ## Why it is not `buildReport`
 *
 * The adaptation report answers «what did you change, and why» — every line
 * points at something that was there before. Composition has no before. The
 * questions a teacher has about a composed sheet are different ones: where did
 * this come from, what did you check, and what did you not.
 *
 * Bolting those onto the adaptation report would put them under a heading that
 * says «Qué he cambiado y por qué», which is false for every line of it.
 *
 * ## The order is the argument
 *
 * **What was not checked comes before what was.** A report that opens with
 * «las cuentas están comprobadas» has told her the reassuring half first, and the
 * reassuring half is the half she already assumed. She is signing for the content,
 * and the content is the part nobody has read.
 *
 * The claims we do make are narrow on purpose, and each one is true of code that
 * ran: the arithmetic is exact, the constraint held, the level was bounded where
 * the corpus knew it. Not «está bien»: nothing here can say that.
 */

export interface ComposeReportInput {
  title: string;
  composedOn: string;
  /** Her objectives, levelled — the source of the level lines. */
  leveled: readonly Leveled[];
  /** Per objective, what the loop actually managed. */
  outcomes: ReadonlyArray<{ objective: string; wanted: number; outcome: ComposeOutcome }>;
  answers: readonly AnswerLine[];
  /** Her label for a course id, so the report speaks her language. */
  yearLabel?: (id: string) => string;
}

export interface ComposeReport {
  /** What nobody has checked. Rendered first, and never empty. */
  unchecked: string[];
  /** What code did check, stated narrowly. */
  checked: string[];
  /** Objectives that produced fewer exercises than she asked for, or none. */
  shortfalls: string[];
  markdown: string;
}

export function buildComposeReport(input: ComposeReportInput): ComposeReport {
  const unchecked: string[] = [
    'Nadie ha leído estos ejercicios. Los ha propuesto un modelo de IA y yo he '
    + 'comprobado lo que se puede comprobar con una cuenta — no si le sirven a tu '
    + 'alumno, ni si están en el orden que tiene sentido.',
  ];

  const checked: string[] = [];
  const shortfalls: string[] = [];

  /*
   * The level, per objective, from `011` (FR-122). A line here means the corpus
   * knew the bounds for that year and that skill; a line above means it did not,
   * and what she can do about it.
   */
  for (const l of input.leveled) {
    const why = explainLevel(l, input.yearLabel);
    if (why) unchecked.push(why);
  }

  for (const { objective, wanted, outcome } of input.outcomes) {
    const short = explainOutcome(outcome, wanted);
    if (short) shortfalls.push(`«${objective}» — ${short}`);

    if (outcome.accepted.length > 0) {
      checked.push(
        `«${objective}»: ${outcome.accepted.length} ${outcome.accepted.length === 1
          ? 'ejercicio' : 'ejercicios'}. Las cuentas las he calculado yo, exactas, y he `
        + 'descartado los que no practicaban lo que pediste.',
      );
    }
  }

  const md: string[] = [
    `# ${input.title}`,
    '',
    `Material generado el ${input.composedOn}.`,
    '',
    /*
     * First, and in these words. It is the sentence most likely to be softened
     * into something reassuring, and softening it is what makes this feature
     * dangerous rather than useful.
     */
    '## Esto es un borrador para que lo revises tú',
    '',
  ];
  for (const u of unchecked) md.push(`- ${u}`);
  md.push('');

  if (shortfalls.length) {
    md.push('## Lo que no he podido hacer', '');
    for (const s of shortfalls) md.push(`- ${s}`);
    md.push('');
  }

  if (checked.length) {
    md.push('## Lo que sí he comprobado', '');
    for (const c of checked) md.push(`- ${c}`);
    md.push('');
  }

  md.push('## Qué practica cada ejercicio', '');
  if (input.answers.length === 0) {
    md.push('_No hay ningún ejercicio en la hoja._', '');
  } else {
    let current = '';
    for (const a of input.answers) {
      if (a.objective !== current) {
        current = a.objective;
        md.push(`**${a.objective}**`, '');
      }
      // The expression, not the answer: this report travels with the sheet, and
      // the answers live in their own document (T014).
      md.push(`- ${a.number}. ${a.expression}`);
    }
    md.push('');
  }

  md.push(
    '## Las soluciones',
    '',
    'Están en `answers.md`, en la carpeta de este material. **No las imprimas con '
    + 'la hoja del alumno.**',
    '',
  );

  return { unchecked, checked, shortfalls, markdown: md.join('\n') };
}
