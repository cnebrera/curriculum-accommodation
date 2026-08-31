import {
  jobDir, jobIR, jobAnswers, jobComposeReport, parseComposeBudget, readObjectives,
  levelFrom, explainLevel, composeExercises, explainOutcome, arithmetic, buildSheet,
  renderAnswerKey, buildComposeReport, assertObjectives, parseIR, logger, RampaError,
  parseProposals,
  loadLearner, annotateInjection, checkBounds,
  assertAnchor, readAnchor, renderAnchorForPrompt, checkAnchored, checkObjectives,
  type Leveled, type ProposedExercise, type Skill, type ComposeOutcome,
  type AnswerLine, type SheetGroup, type Verifier, type AnchorPassage, type Block,
  type Notice,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { assertCorpus, loadInstruction, findYearInCorpus } from '../corpus/index.js';
import { recordCost } from '../ipc/cost.js';

/**
 * Composition (002 T011-T016, ADR 0007).
 *
 * **Code owns the loop.** The model proposes exercises; `composeExercises` decides
 * which of them exist, and the arithmetic verifier decides what the answers are.
 * Nothing a model says about an answer is used — only compared (Principle II).
 *
 * ## What this job produces, and why it is three documents
 *
 * - `ir.md` — the child's sheet, as ordinary IR. It then goes through
 *   `runAdaptation` **unchanged** (T013): the learner's profile decides how it
 *   looks, exactly as it does for a scanned worksheet. One composition, N
 *   presentations (Principle IV).
 * - `answers.md` — the key, **for her**. A separate file rather than an attribute
 *   the renderer is trusted to strip, because a worksheet with the answers in its
 *   markup looks exactly like a worksheet.
 * - `compose-report.md` — what nobody checked, before what code did.
 *
 * ## What it refuses
 *
 * An objective it cannot verify does not become a worksheet here. Skill practice
 * is the verifiable half and it is what this phase covers; content needs an
 * anchor and its own path (Phase 4), and the honest answer for anything else is
 * that this produces a draft for a professional to verify (Phase 5).
 */

const OUTPUT_FORMAT = '\n\n---\n\n'
  + 'Devuelve únicamente una línea por ejercicio, con este formato exacto y nada más:\n'
  + '`expresión = resultado`\n\n'
  + 'Por ejemplo:\n47 × 8 = 376\n68 × 7 = 476\n\n'
  + 'Sin numerar, sin explicaciones, sin texto alrededor. El resultado es sólo para '
  + 'que el programa lo compare con el suyo.';

async function systemPrompt(): Promise<string> {
  const [rules, compose] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('compose'),
  ]);
  // The judgement layer is those two files (Principle I). Only the wire format is
  // added here, which is mechanics.
  return `${rules}\n\n---\n\n${compose}${OUTPUT_FORMAT}`;
}

export interface ComposeProgress { stage: string; detail?: string }

export interface ComposeRequest {
  learnerCode: string;
  /** Her objectives, one per line, in her words. */
  objectives: readonly string[];
  /** How many exercises per objective. The corpus decides when she does not. */
  perObjective?: number;
  title?: string;
  /**
   * What the content must rest on (FR-102): her notes, the textbook page, the
   * three sentences she would say in class.
   *
   * Required the moment any objective is content, and refused rather than warned
   * about — a warning on a screen she is moving quickly through is a warning she
   * passes, and the cost of passing it is a page of confident falsehoods.
   */
  anchor?: string;
}

export interface ComposeResult {
  jobId: string;
  /** Vault-relative path to the sheet, ready for `runAdaptation`. */
  ir: string;
  answersPath: string;
  report: string;
  reportData: { unchecked: string[]; checked: string[]; shortfalls: string[] };
  /** The key, so the review screen can show it without reading the vault. */
  answers: AnswerLine[];
  /** Objectives that are content, and need the anchor path rather than this one. */
  needsAnchor: string[];
  /** Objectives dropped because the job bound was reached. Never silent. */
  cutObjectives: string[];
  /** Everything she must see about her own anchor (Principle IX). */
  anchorNotices: Array<{ passage: string; notice: Notice }>;
  /** Reaching the anchor bound is reported, never silent. */
  anchorCut: { chars: number; passages: number };
  costCents: number;
}

export async function runCompose(
  jobId: string,
  request: ComposeRequest,
  onProgress: (p: ComposeProgress) => void,
): Promise<ComposeResult> {
  await assertCorpus();
  const vault = currentVault();
  const limits = parseComposeBudget(await loadInstruction('compose'));

  onProgress({ stage: 'Leyendo lo que quieres que aprenda' });

  /*
   * Her objectives are teacher-authored text, so the name check runs over them
   * before anything is sent — the same rule as her notes and her corrections
   * (006 FR-419). «Que Juan aprenda a multiplicar» is the ordinary way to write
   * this down.
   */
  const unknown = await unknownNamesIn(request.objectives.map(String));
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en lo que has escrito: ${unknown.join(', ')}. `
      + 'No he enviado nada. Dime si es un alumno y lo sustituyo por su código, o '
      + 'márcalo como que no es un nombre.',
      unknown);
  }

  const asked = request.objectives.map((o) => o.trim()).filter(Boolean);
  /*
   * The bound is reported, never silently applied (the same rule as `008`'s page
   * bound). A teacher who types eight objectives and gets six back with no
   * explanation has been lied to by omission.
   */
  const cutObjectives = asked.slice(limits.objectivesPerJob);
  const kept = asked.slice(0, limits.objectivesPerJob);
  if (cutObjectives.length) {
    logger.warn('compose.objectives-bound', { asked: asked.length, used: kept.length });
  }
  if (kept.length === 0) {
    throw new RampaError('compose-no-objective', 'Dime primero qué quieres que aprenda.');
  }

  const learner = await loadLearner(vault, request.learnerCode);
  const yearId = learner.profile.year;
  const found = yearId ? await findYearInCorpus(yearId) : null;
  const yearLabel = (id: string): string => (found && id === yearId ? found.year.label : id);

  const objectives = readObjectives(kept);
  const leveled = objectives.map((o) => levelFrom(o, found, yearId));

  /*
   * Content down the skill path would ship unanchored facts, so it does not go
   * down it. Named back to her rather than dropped: «los ríos de España» is a
   * perfectly good objective and it needs the other route.
   */
  const needsAnchor = leveled
    .filter((l) => l.objective.kind === 'content')
    .map((l) => l.objective.text);

  const skills = leveled.filter((l) => l.objective.kind === 'skill');

  /*
   * The anchor gate (T017), and it is a **refusal**.
   *
   * It fires the moment one objective is content, before the provider is even
   * resolved, so nothing is sent and nothing is charged. She gets the objectives
   * back that caused it, because «necesito un anclaje» about an unnamed objective
   * is a message she cannot act on when she typed four.
   */
  const anchorRaw = needsAnchor.length > 0 ? assertAnchor(request.anchor) : '';
  const anchor = anchorRaw
    ? readAnchor(anchorRaw, {
        maxChars: limits.anchorMaxChars, maxPassages: limits.anchorMaxPassages,
      })
    : { passages: [] as AnchorPassage[], notices: [], charsCut: 0, passagesCut: 0 };

  if (anchor.charsCut > 0 || anchor.passagesCut > 0) {
    logger.warn('compose.anchor-bound', {
      charsCut: anchor.charsCut, passagesCut: anchor.passagesCut,
    });
  }

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }
  const { provider, key } = active;
  const system = await systemPrompt();
  const known = await knownNames();

  const wanted = clampWanted(request.perObjective ?? limits.exercisesPerObjective);
  let costCents = 0;

  const groups: SheetGroup[] = [];
  const outcomes: Array<{ objective: string; wanted: number; outcome: ComposeOutcome }> = [];

  for (const [i, l] of skills.entries()) {
    if (l.objective.kind !== 'skill') continue;
    const { skill, text } = l.objective;

    onProgress({
      stage: 'Preparando los ejercicios',
      detail: skills.length > 1 ? `${i + 1} de ${skills.length}: ${text}` : text,
    });

    const verifier = verifierFor(skill);
    if (!verifier) {
      /*
       * A skill nobody can check does not quietly become a worksheet. FR-125's
       * path is Phase 5 and it says so in her words; until it exists, refusing is
       * the honest behaviour and it is the one that cannot ship unchecked
       * arithmetic.
       */
      logger.warn('compose.no-verifier', { skill: skill.id });
      needsAnchor.push(text);
      continue;
    }

    const outcome = await composeExercises(skill, verifier, async (s, soFar, need) => {
      const { proposed, cents } = await propose({
        provider, key, known, system,
        skill: s, objective: text, level: l, need, soFar,
        interests: learner.profile.interests ?? [],
        yearLabel: yearId ? yearLabel(yearId) : undefined,
        onProgress: (detail) => onProgress({ stage: 'Preparando los ejercicios', detail }),
      });
      costCents += cents;
      return proposed;
    }, { wanted, maxProposals: limits.proposalsPerObjective });

    outcomes.push({ objective: text, wanted, outcome });
    if (outcome.accepted.length > 0) {
      groups.push({ objective: text, instruction: instructionFor(skill), accepted: outcome.accepted });
    }
    const short = explainOutcome(outcome, wanted);
    if (short) logger.warn('compose.short', { objective: text, accepted: outcome.accepted.length });
  }

  /*
   * Content, once there is an anchor to rest it on (T017-T019).
   *
   * After the exercises rather than before, and that is a cost decision: the
   * verifiable half is the half that can fail cheaply and be told about. If the
   * skill objectives produced nothing at all, this still runs — she asked for a
   * text and a text does not depend on the multiplications.
   */
  const contentObjectives = leveled
    .filter((l) => l.objective.kind === 'content')
    .map((l) => l.objective.text);

  let content: Block[] = [];
  if (contentObjectives.length > 0 && anchor.passages.length > 0) {
    onProgress({ stage: 'Escribiendo el texto', detail: contentObjectives.join(' · ') });
    const written = await composeContent({
      provider, key, known, system,
      objectives: contentObjectives, allObjectives: kept,
      passages: anchor.passages,
      interests: learner.profile.interests ?? [],
      yearLabel: yearId ? yearLabel(yearId) : undefined,
      canDo: found?.year.can,
      onProgress: (detail) => onProgress({ stage: 'Escribiendo el texto', detail }),
    });
    costCents += written.cents;
    content = written.blocks;
  }

  onProgress({ stage: 'Guardando' });

  /*
   * The date is stamped here, from the process, never from the model (Principle
   * II) — and it is the same stamp `014`'s record reads.
   */
  const composedOn = new Date().toISOString().slice(0, 10);
  const title = (request.title ?? kept[0] ?? 'Material generado').trim();

  const notes = [
    ...leveled.map((l) => explainLevel(l, yearLabel)).filter((s): s is string => s !== null),
    ...outcomes.map(({ objective, wanted: w, outcome }) => {
      const short = explainOutcome(outcome, w);
      return short ? `«${objective}»: ${short}` : null;
    }).filter((s): s is string => s !== null),
  ];

  const sheet = buildSheet({
    title, lang: 'es', objectives: kept, groups, content, composedOn, notes,
    ...(anchorRaw ? { anchor: anchorSummary(anchorRaw) } : {}),
    composedFor: { code: request.learnerCode, ...(yearId ? { yearId } : {}) },
  });

  /*
   * The same gate the render applies (T008): every block traces to an objective
   * **she** wrote. It cannot fail here — the blocks were built from her list — and
   * that is the point of asserting it: if a future change starts inventing a
   * group, this is where it stops rather than at a teacher's printer.
   */
  assertObjectives(sheet.doc, kept);
  // And the same two checks every ingested document passes, over our own output:
  // there is no reason to trust this file more than a scanned one.
  checkBounds(annotateInjection(parseIR(sheet.markdown)));

  await vault.ensureDir(jobDir(jobId));
  await vault.writeRaw(jobIR(jobId), sheet.markdown);
  await vault.writeRaw(jobAnswers(jobId), renderAnswerKey({ title, composedOn, answers: sheet.answers }));

  const report = buildComposeReport({
    title, composedOn, leveled, outcomes, answers: sheet.answers, yearLabel,
  });
  await vault.writeRaw(jobComposeReport(jobId), report.markdown);
  await recordCost(jobId, costCents);

  logger.info('compose.finished', {
    jobId, objectives: kept.length, exercises: sheet.answers.length,
    rejected: outcomes.reduce((n, o) => n + o.outcome.rejected.length, 0),
    costCents,
  });

  return {
    jobId,
    ir: jobIR(jobId),
    answersPath: jobAnswers(jobId),
    report: report.markdown,
    reportData: { unchecked: report.unchecked, checked: report.checked, shortfalls: report.shortfalls },
    answers: sheet.answers,
    needsAnchor,
    cutObjectives,
    anchorNotices: anchor.notices,
    anchorCut: { chars: anchor.charsCut, passages: anchor.passagesCut },
    costCents,
  };
}

/**
 * One call to the model, parsed into proposals.
 *
 * The level is stated as an instruction and **not negotiated**: the corpus decided
 * it (FR-122). A model told «máximo dos cifras» that returns four-digit
 * multiplications has them rejected by the verifier, which is the belt to this
 * brace.
 */
async function propose(args: {
  provider: Parameters<typeof sendRedacted>[0];
  key: string;
  known: ReadonlyMap<string, string>;
  system: string;
  skill: Skill;
  objective: string;
  level: Leveled;
  need: number;
  soFar: readonly ProposedExercise[];
  interests: readonly string[];
  yearLabel?: string;
  onProgress: (detail: string) => void;
}): Promise<{ proposed: ProposedExercise[]; cents: number }> {
  const lines: string[] = [
    `Objetivo, con las palabras de la maestra: «${args.objective}».`,
    `Necesito ${args.need} ejercicio(s).`,
  ];

  if (args.level.source.kind === 'corpus' && args.skill.level) {
    const { maxDigits, decimals } = args.skill.level;
    const bounds: string[] = [];
    if (maxDigits !== undefined) bounds.push(`máximo ${maxDigits} cifras por operando`);
    if (decimals === false) bounds.push('sin decimales');
    if (decimals === true) bounds.push('los decimales están dentro de su curso');
    lines.push(`Nivel de su curso${args.yearLabel ? ` (${args.yearLabel})` : ''}: `
      + `${bounds.join(', ')}. Esto no se negocia.`);
  } else {
    // Silence rather than a guess. «Nivel: desconocido» invites the model to
    // choose one, and choosing one is the substitution FR-122 forbids.
    lines.push('No te doy nivel de curso. No inventes uno: usa números corrientes.');
  }

  if (args.interests.length) {
    lines.push(`Le interesan: ${args.interests.join(', ')}. Úsalo en el contexto, no `
      + 'en la dificultad.');
  }

  if (args.soFar.length) {
    lines.push('Ya tengo estos, no los repitas:',
      args.soFar.map((e) => e.expression).join('\n'));
  }

  const { stream } = sendRedacted(
    args.provider,
    { system: args.system, messages: [{ role: 'user', content: lines.join('\n\n') }], maxTokens: 1500 },
    args.key, args.known, { maxAttempts: 1 },
  );

  let raw = '';
  let cents = 0;
  for await (const chunk of stream) {
    if (chunk.text) { raw += chunk.text; args.onProgress(`${raw.length} caracteres`); }
    if (chunk.usage) cents += args.provider.price(chunk.usage);
  }

  return { proposed: parseProposals(raw), cents };
}

/**
 * Content, written by the model and checked by us (T017-T019).
 *
 * Two checks, and neither is negotiable: every block traces to an objective **she**
 * wrote (T008) and every claim rests on a passage of the anchor **she** gave
 * (T019). One bounded retry, decided here, with the issues fed back — the same
 * shape as the adaptation's completeness gate, and for the same reason: a second
 * attempt often fixes a format mistake, and a third costs her money to produce the
 * same answer.
 *
 * If it still fails, nothing is written to the sheet. Not «the blocks that
 * passed»: a text missing the third of its four paragraphs is a text that reads as
 * complete and teaches two thirds of the objective.
 */
async function composeContent(args: {
  provider: Parameters<typeof sendRedacted>[0];
  key: string;
  known: ReadonlyMap<string, string>;
  system: string;
  /** The content objectives, which is what this call is for. */
  objectives: readonly string[];
  /** Her whole list, because the objective check is against all of it. */
  allObjectives: readonly string[];
  passages: readonly AnchorPassage[];
  interests: readonly string[];
  yearLabel?: string;
  canDo?: string;
  onProgress: (detail: string) => void;
}): Promise<{ blocks: Block[]; cents: number }> {
  let cents = 0;

  const ask = async (extra: string[]): Promise<{ raw: string }> => {
    const lines: string[] = [
      'Escribe material sobre esto, con las palabras de la maestra:',
      args.objectives.map((o) => `- ${o}`).join('\n'),
      '',
      'Todo lo que afirmes tiene que apoyarse en esto, y sólo en esto. Cada bloque '
      + 'dice en qué trozo se apoya con `data-anchor="a2"`. Si algo que hace falta no '
      + 'está aquí, no lo inventes: dilo en un bloque `.report-notes`.',
      '',
      renderAnchorForPrompt(args.passages),
    ];
    if (args.yearLabel) lines.push('', `Es para ${args.yearLabel}.`);
    if (args.canDo) lines.push(`A esa edad: ${args.canDo}`);
    if (args.interests.length) {
      lines.push(`Le interesan: ${args.interests.join(', ')}. Úsalo en los ejemplos.`);
    }
    if (extra.length) lines.push('', 'El intento anterior tenía estos problemas:',
      extra.map((e) => `- ${e}`).join('\n'));

    const { stream } = sendRedacted(
      args.provider,
      { system: args.system, messages: [{ role: 'user', content: lines.join('\n') }], maxTokens: 4000 },
      args.key, args.known, { maxAttempts: 1 },
    );

    let raw = '';
    for await (const chunk of stream) {
      if (chunk.text) { raw += chunk.text; args.onProgress(`${raw.length} caracteres`); }
      if (chunk.usage) cents += args.provider.price(chunk.usage);
    }
    return { raw };
  };

  const CONTENT_FORMAT = 'Devuelve sólo bloques en el formato del documento intermedio, '
    + 'cada uno con `data-objective` y `data-anchor`:\n'
    + '::: {#c1 .explanation data-objective="…" data-anchor="a1"}\ntexto\n:::';

  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { raw } = await ask(attempt === 1 ? [CONTENT_FORMAT] : [CONTENT_FORMAT, ...problems]);
    const parsed = parseIR(stripFence(raw));

    const objectiveIssues = checkObjectives(parsed, args.allObjectives);
    const anchorIssues = checkAnchored(parsed, args.passages);
    problems = [
      ...objectiveIssues.map((i) => i.message),
      ...anchorIssues.map((i) => i.message),
    ];

    if (problems.length === 0 && parsed.blocks.length > 0) {
      // Annotated like any other material: her anchor's text is now inside blocks
      // written by a model, and Principle IX does not stop applying at that point.
      return { blocks: annotateInjection(parsed).blocks, cents };
    }

    logger.warn('compose.content-rejected', { attempt, problems: problems.length });
  }

  throw new RampaError('ir-no-provenance',
    'He escrito el texto dos veces y las dos se apoyaba en cosas que no me diste. '
    + 'No te lo doy. Prueba a darme un poco más de lo que quieres que use.',
    problems);
}

/**
 * What the document records as its anchor.
 *
 * The **whole** anchor would put a chapter of somebody's textbook into the
 * material she keeps — and `007` already refuses to store copyrighted source
 * material. So the document records that there was one and what it began with,
 * enough for her to recognise it, and her original paste is hers.
 */
function anchorSummary(raw: string): string {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length > 240 ? `${oneLine.slice(0, 239)}…` : oneLine;
}

/** A model that wraps IR in a fence has made a punctuation mistake, not an error. */
function stripFence(raw: string): string {
  return /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
}

/** Which verifier covers this skill, or none — and none is an answer (FR-125). */
function verifierFor(skill: Skill): Verifier | null {
  return arithmetic.handles(skill.id) ? arithmetic : null;
}

/**
 * The instruction line above a group.
 *
 * In code because it is one sentence of mechanics rather than judgement, and
 * because a model asked to write the rubric writes a rubric that sometimes
 * restates the exercise. What makes a *good* instruction for a learner is a
 * recipe's job, and the adaptation pass applies it.
 */
function instructionFor(skill: Skill): string {
  const verb: Record<string, string> = {
    'arith.add': 'Resuelve estas sumas.',
    'arith.subtract': 'Resuelve estas restas.',
    'arith.multiply': 'Resuelve estas multiplicaciones.',
    'arith.divide': 'Resuelve estas divisiones.',
  };
  return verb[skill.id] ?? 'Resuelve estos ejercicios.';
}

/** A sheet, not a term's worksheets. Bounded in code because it bounds her money. */
const clampWanted = (n: number): number =>
  Math.min(40, Math.max(1, Math.round(Number.isFinite(n) ? n : 10)));
