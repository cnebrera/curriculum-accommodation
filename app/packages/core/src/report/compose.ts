import type { ComposeOutcome, Proposal } from '../compose/loop.js';
import { explainOutcome } from '../compose/loop.js';
import { explainLevel, type Leveled } from '../compose/level.js';
import type { ExerciseLine } from '../compose/sheet.js';
import { UNVERIFIABLE_ES } from '../compose/unverifiable.js';
import { formatCost } from '../cost/index.js';

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
  /*
   * On `Proposal` since `027`: the three pipelines produce three shapes and the report
   * reads only the verdicts. Naming `ProposedExercise` here would make the report the
   * one thing that cannot describe a composed exam.
   */
  outcomes: ReadonlyArray<{ objective: string; wanted: number; outcome: ComposeOutcome<Proposal> }>;
  /**
   * Every exercise on the sheet, checked or not — not the answer key.
   *
   * Built from the sheet's `listing` rather than from its `answers`, because the
   * answers omit the unverified exercises and those are the ones she most needs
   * to see listed.
   */
  listing: readonly ExerciseLine[];
  /**
   * Objectives no verifier covers (FR-125). They lead the report, because for
   * those the honest position is not «revisa esto» but «esto es un borrador para
   * que lo revises tú, no material para dar».
   */
  unverifiedObjectives?: readonly string[];
  /**
   * Official criterio codes the anchor cited (002 FR-128).
   *
   * Cited in the administration's own vocabulary rather than only in plain Spanish —
   * which is what makes Principle VI's traceability usable by somebody who has to
   * file this. Rampa carries what she pasted and validates nothing: a code it
   * invented would be worse than none.
   */
  criteria?: readonly string[];
  /** Her label for a course id, so the report speaks her language. */
  yearLabel?: (id: string) => string;
  /**
   * What kind of material this is, **in her words** (`027` T021, US3 acceptance 2).
   *
   * The label from `material-kinds.md`, passed in. Not a `KIND_ES` map here: that would
   * be a second copy of the corpus's own `label`, which is the defect this project has
   * found more than any other and which drifts the day a PT rewords one (`021` T020's
   * lesson, cited in this task).
   */
  kindLabel?: string;
  /**
   * True when what came out is not the kind she asked for (FR-2506).
   *
   * The sentence itself is the caller's — it names both kinds and it is already written
   * where the notes are built. What the report needs is to know **not** to claim the
   * kind in its own heading.
   */
  kindMismatch?: boolean;
  /**
   * What this cost, in cents, or `null` for «no lo sé».
   *
   * `null` is a real answer: a service whose model has no published price reports no
   * cost, and a report that printed «0 céntimos» for it would be lying about the one
   * number she can check against her card.
   */
  costCents?: number | null;
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
  const unverified = input.unverifiedObjectives ?? [];

  const unchecked: string[] = [
    /*
     * FR-125 first, when it applies. Not a paragraph further down: this is the
     * sentence most likely to be softened, and «revisa el contenido» read after
     * «las cuentas están comprobadas» is a different sentence from the same words
     * read first.
     */
    ...(unverified.length > 0
      ? [`${UNVERIFIABLE_ES} Concretamente: ${unverified.map((o) => `«${o}»`).join(', ')}.`]
      : []),
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
    /*
     * What it is and what it cost, on the first line (`027` T021).
     *
     * The kind because a report that never says whether this is an exam or a worksheet
     * cannot be read six months later beside the material — and because for two of the
     * four kinds it is the only place the distinction is written in her words.
     *
     * Not claimed when the request and the output disagreed: the mismatch note says both
     * kinds and this heading would state one of them as fact.
     */
    `Material generado el ${input.composedOn}${
      input.kindLabel && !input.kindMismatch ? ` · ${input.kindLabel}` : ''}.${
      input.costCents === undefined ? ''
        : input.costCents === null
          /*
           * «No lo sé», and it says why. A running total that silently skips the calls
           * it could not price is not a running total.
           */
          ? ' No sé lo que ha costado: tu servicio no publica el precio de su modelo.'
          : ` Ha costado ${formatCost(input.costCents)}.`}`,
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

  if (input.criteria?.length) {
    md.push('## Criterios de evaluación', '');
    md.push('Lo que me diste citaba estos criterios oficiales. Los copio tal cual — no '
      + 'los compruebo contra ninguna base de datos, así que si uno está mal escrito, '
      + 'está mal escrito aquí también:', '');
    for (const c of input.criteria) md.push(`- \`${c}\``);
    md.push('');
  }

  md.push('## Qué practica cada ejercicio', '');
  if (input.listing.length === 0) {
    md.push('_No hay ningún ejercicio en la hoja._', '');
  } else {
    let current = '';
    for (const a of input.listing) {
      if (a.objective !== current) {
        current = a.objective;
        md.push(`**${a.objective}**`, '');
      }
      // The expression, not the answer: this report travels with the sheet, and
      // the answers live in their own document (T014).
      md.push(`- ${a.number}. ${a.expression}${a.verified ? '' : ' — *sin comprobar*'}`);
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
  if (unverified.length > 0) {
    md.push('No hay soluciones para ' + unverified.map((o) => `«${o}»`).join(', ')
      + ': no las he podido calcular.', '');
  }

  return { unchecked, checked, shortfalls, markdown: md.join('\n') };
}
