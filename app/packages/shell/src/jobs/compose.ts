import {
  jobDir, jobIR, jobAnswers, jobComposeReport, jobComposeRequest, parseComposeBudget,
  readObjectives, type Vault,
  levelFrom, explainLevel, targetYear, explainTarget, composeExercises, explainOutcome,
  arithmetic, buildSheet,
  renderAnswerKey, buildComposeReport, assertObjectives, parseIR, logger, RampaError,
  parseProposals,
  loadLearner, annotateInjection, checkBounds,
  assertAnchor, readAnchor, renderAnchorForPrompt, checkAnchored, checkObjectives, criteriaIn,
  composeUnverified, verifierFor, UNVERIFIABLE_ES,
  type Leveled, type ProposedExercise, type Skill, type ComposeOutcome,
  type AnswerLine, type SheetGroup, type Verifier, type AnchorPassage, type Block,
  type Notice,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { assertCorpus, loadInstruction, findYearInCorpus, materialKind } from '../corpus/index.js';
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
  /**
   * How many **sessions** this material is for (FR-130).
   *
   * «A PT works in sessions and the application has no concept of one.» It still does
   * not organise anything around them — this records what she said, so the material
   * and later the ACNS's temporalización can say «esto es para tres sesiones» instead
   * of the application inventing a unit she does not use.
   */
  sessions?: number;
  /**
   * How long one of those sessions is (`021` FR-1926).
   *
   * Carlos's correction to my proposal of asking one number: «ambas cosas, sesiones y
   * minutos por sesión». Both are facts she holds with **certainty** — they are her
   * timetable — which is what makes them worth asking. What Rampa estimates from them is
   * how much material fits, and FR-1928 makes that an estimate rather than a promise:
   * how long a particular child takes over a page is the one thing here nobody knows.
   */
  minutesPerSession?: number;
  title?: string;
  /**
   * The year the material targets (FR-129).
   *
   * **Hers to choose.** For a learner with a two-year desfase his enrolled course is
   * not the level his material should target, and she is the one who knows which is.
   * Absent, the enrolled course is used **and the report says nobody chose it**.
   */
  targetYear?: string;
  /**
   * What the content must rest on (FR-102): her notes, the textbook page, the
   * three sentences she would say in class.
   *
   * Required the moment any objective is content, and refused rather than warned
   * about — a warning on a screen she is moving quickly through is a warning she
   * passes, and the cost of passing it is a page of confident falsehoods.
   */
  anchor?: string;
  /**
   * What kind of material she wants (`021` FR-1907).
   *
   * **Hers, and never defaulted** (`012` FR-1001). Before `021` this was derived from
   * whatever came out, silently, and `exam` was unreachable — «solo me ha dicho de
   * preparar fichas».
   *
   * Optional in the type only so a caller written before this still compiles; the
   * handler refuses a request without one, exactly as `job:create` does.
   */
  kind?: string;
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
  /**
   * Objectives no verifier covers (FR-125): produced, and produced as a draft.
   *
   * On the result rather than only in the report, because T021 asks for the
   * sentence **on the screen where she gets it** — and a screen that has to parse
   * the report's markdown to find out is a screen that will stop doing it.
   */
  unverifiedObjectives: string[];
  /** The sentence itself, so no surface writes its own version of it. */
  unverifiedNotice: string | null;
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

  /*
   * FR-129 · which year the material targets, and **who decided**.
   *
   * Her choice, then a year her overlay states, then the enrolled course — and the
   * report names which, because «composing at a stated level is a different act from
   * quietly lowering someone else's worksheet, and the difference is who decided».
   */
  const target = targetYear({
    ...(request.targetYear ? { chosen: request.targetYear } : {}),
    ...(yearInOverlay(learner.overlay) ? { fromOverlay: yearInOverlay(learner.overlay)! } : {}),
    ...(learner.profile.year ? { enrolled: learner.profile.year } : {}),
  });
  const yearId = target.yearId;
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
  const unverifiedObjectives: string[] = [];
  const outcomes: Array<{ objective: string; wanted: number; outcome: ComposeOutcome }> = [];

  for (const [i, l] of skills.entries()) {
    if (l.objective.kind !== 'skill') continue;
    const { skill, text } = l.objective;

    onProgress({
      stage: 'Preparando los ejercicios',
      detail: skills.length > 1 ? `${i + 1} de ${skills.length}: ${text}` : text,
    });

    const verifier = verifierFor(skill, VERIFIERS);
    if (!verifier) {
      /*
       * Nothing can check this one (FR-125, T021).
       *
       * Refusing would be tidier and wrong: a draft she edits in ten minutes is
       * worth having. What must not happen is her believing it was checked — so
       * it is a separate group, its blocks carry `data-unverified`, **no answer of
       * its exercises reaches the key**, and the sentence leads the report and the
       * screen.
       */
      logger.warn('compose.no-verifier', { skill: skill.id });
      unverifiedObjectives.push(text);

      const drafted = await composeUnverified(async (need) => {
        const { proposed, cents } = await propose({
          provider, key, known, system,
          skill, objective: text, level: l, need, soFar: [],
          interests: learner.profile.interests ?? [],
          yearLabel: yearId ? yearLabel(yearId) : undefined,
          onProgress: (detail) => onProgress({ stage: 'Preparando los ejercicios', detail }),
        });
        costCents += cents;
        return proposed;
      }, wanted);

      if (drafted.exercises.length > 0) {
        groups.push({
          objective: text, instruction: instructionFor(skill), unverified: true,
          /*
           * `answer: ''` and not the model's stated one. `Accepted.answer` means
           * «computed by code», and there was no computation — an empty string is
           * the only honest value, and the group's `unverified` flag keeps it out
           * of the key entirely.
           */
          accepted: drafted.exercises.map((exercise) => ({ exercise, answer: '' })),
        });
      }
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
      ...(request.sessions || request.minutesPerSession
        ? { plan: {
            ...(request.sessions ? { sessions: request.sessions } : {}),
            ...(request.minutesPerSession ? { minutesPerSession: request.minutesPerSession } : {}),
          } }
        : {}),
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

  /*
   * What came out, if she had not said. Kept as the **fallback** (`021` FR-1907):
   * material composed before she was asked has no `kind` in its request, and a vault has
   * documents in it.
   */
  const derived = content.length > 0 && groups.length === 0
    ? 'study'
    : groups.some((g) => /\bproblema/i.test(g.instruction)) ? 'problems' : 'worksheet';

  /*
   * **What she asked for wins** (`021` FR-1923).
   *
   * `012` FR-1001: the kind is hers and is never Rampa's decision. Relabelling it to
   * match the content would take that decision away; relabelling to match the request
   * would falsify the *what* (FR-1910). So the kind is recorded as she said it, the
   * report says what actually came out, and a later adaptation runs under the rules she
   * chose — which in the mismatching case are the stricter ones. Conservative in the safe
   * direction: it protects more, never less.
   */
  // `chosenKind`, not `materialKind`: that name is the corpus lookup imported above, and
  // a local shadowing it made the call site read as a string being invoked. Fifth name
  // collision in this codebase, and the only one so far inside a single file.
  const chosenKind = request.kind ?? derived;
  const kindMismatch = request.kind !== undefined && request.kind !== derived;

  /*
   * Both kinds, looked up — because their Spanish names live in the corpus.
   *
   * A `KIND_ES` map here would be a second copy of `material-kinds.md`'s `label`, which
   * is the defect this project has found more than any other, and it would drift the day
   * a PT rewords one.
   */
  const kindEntry = await materialKind(chosenKind);
  const derivedEntry = kindMismatch ? await materialKind(derived) : null;
  const askedKind = kindEntry?.label ?? chosenKind;
  const cameOutKind = derivedEntry?.label ?? derived;

  const notes = [
    // FR-129 · the level, and who chose it. First, because it governs everything else.
    explainTarget(target, yearId ? yearLabel : undefined),
    /*
     * What she asked for versus what came out (`021` FR-1910).
     *
     * Said rather than fixed: the kind stays as she chose it (FR-1923), because
     * relabelling to match the content would take a decision that is hers and
     * relabelling to match the request would falsify the *what*. So it is a sentence in
     * the report, which is where a disagreement between her and the material belongs.
     */
    /*
     * What was assumed from her plan, said as an assumption (`021` FR-1928).
     *
     * She knows how many sessions she has and how long they are — that is her timetable.
     * **Nobody knows how long this particular child takes over a page**, and that is the
     * number Rampa would have to know to promise the material fits. So it says what it
     * aimed at and whose judgement the rest is.
     *
     * First among the notes for the same reason the level is: it governs how much of
     * everything else there is.
     */
    ...(request.sessions && request.minutesPerSession
      ? [`Lo he preparado apuntando a ${request.sessions} `
         + `${request.sessions === 1 ? 'sesión' : 'sesiones'} de `
         + `${request.minutesPerSession} minutos. **Es una estimación mía, no una promesa**: `
         + 'cuánto tarda este alumno en una página lo sabes tú y no yo. Si te sobra o te '
         + 'falta, dímelo y lo ajusto.']
      : []),
    ...(kindMismatch
      ? [`Me pediste «${askedKind}» y lo que ha salido se parece más a «${cameOutKind}». Lo he `
         + 'dejado como lo pediste: el tipo lo decides tú, y de él dependen las reglas '
         + 'con las que lo adapte después. Si no es lo que querías, dímelo y lo hago otra vez.']
      : []),
    ...(unverifiedObjectives.length
      ? [`${UNVERIFIABLE_ES} Concretamente: ${unverifiedObjectives.map((o) => `«${o}»`).join(', ')}.`]
      : []),
    ...leveled.map((l) => explainLevel(l, yearLabel)).filter((s): s is string => s !== null),
    ...outcomes.map(({ objective, wanted: w, outcome }) => {
      const short = explainOutcome(outcome, w);
      return short ? `«${objective}»: ${short}` : null;
    }).filter((s): s is string => s !== null),
  ];

  /*
   * What kind of material this is (`002` FR-126, `012`).
   *
   * **Derived from what was composed, and never defaulted.** Exercises with a
   * verified answer key are `problems` when they are word problems and `worksheet`
   * when they are bare operations; a composed text is `study`. The kind matters most
   * for `problems`, whose prohibition on changing quantities and operations is what
   * stops a later revision quietly invalidating the answer key.
   *
   * It was `kind: 'generated'` until 2026-08-31, which is not one of the four — so
   * `materialKind()` resolved it to `null` and a composed sheet reached adaptation
   * with **no kind rule governing it at all**.
   */

  const sheet = buildSheet({
    title, lang: 'es', materialKind: chosenKind, objectives: kept, groups, content, composedOn, notes,
    // The kind's own sentences, printed (`021` T022). Corpus, never a literal here.
    ...(kindEntry?.composing?.onDocument.length
      ? { kindNotes: kindEntry.composing.onDocument } : {}),
    ...(request.sessions && request.sessions > 0
      ? { sessions: Math.min(20, Math.round(request.sessions)) } : {}),
    ...(request.minutesPerSession && request.minutesPerSession > 0
      ? { minutesPerSession: Math.min(240, Math.round(request.minutesPerSession)) } : {}),
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
  await vault.writeRaw(jobAnswers(jobId), renderAnswerKey({
    title, composedOn, answers: sheet.answers,
    ...(unverifiedObjectives.length ? { unverifiedObjectives } : {}),
  }));

  const criteria = criteriaIn(anchor.passages);

  const report = buildComposeReport({
    title, composedOn, leveled, outcomes, listing: sheet.listing, yearLabel,
    ...(criteria.length ? { criteria } : {}),
    ...(unverifiedObjectives.length ? { unverifiedObjectives } : {}),
  });
  await vault.writeRaw(jobComposeReport(jobId), report.markdown);

  /*
   * What was asked for, kept so a correction can re-run it (`021` T026).
   *
   * In `.rampa/` rather than the vault proper: it is machinery, not her material, and a
   * folder she is encouraged to open should not fill with request files. Correcting
   * composed material is **re-composing**, not adapting (research R3) — so the objectives,
   * the anchor and the level have to still be there, and asking her to type them again
   * would be asking her to reconstruct what she already told us.
   */
  await vault.writeRaw(jobComposeRequest(jobId),
    JSON.stringify(request, null, 2) + '\n');
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
    unverifiedObjectives,
    unverifiedNotice: unverifiedObjectives.length > 0 ? UNVERIFIABLE_ES : null,
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
  /**
   * Her plan, so the length of the text answers to it (`021` FR-1927/FR-1928).
   *
   * For a study text there is nothing to count, so this **is** how she says how much she
   * wants — «tres sesiones de veinte minutos». The model is told to aim at it and told
   * that overshooting is worse than undershooting, because a text she has to cut in half
   * in front of the child is worse than one she can extend by talking.
   */
  plan?: { sessions?: number; minutesPerSession?: number };
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
    /*
     * How much text, in her units. For this kind it replaces «cuántos ejercicios»
     * entirely — a text has nothing to count (FR-1927).
     */
    const { sessions, minutesPerSession } = args.plan ?? {};
    if (sessions && minutesPerSession) {
      lines.push('', `Es para ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'} de `
        + `${minutesPerSession} minutos de estudio. Ajusta la extensión a eso. Si dudas, `
        + 'quédate corto: un texto que hay que cortar por la mitad delante del alumno es '
        + 'peor que uno que la maestra alarga hablando.');
    } else if (minutesPerSession) {
      lines.push('', `Es para unos ${minutesPerSession} minutos de estudio. Ajusta la `
        + 'extensión a eso, y si dudas quédate corto.');
    }
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

/**
 * A year id her overlay states (FR-129's middle case).
 *
 * Deliberately narrow: it looks for a year id in the form the corpus uses
 * (`es:primaria-3`), which is what she or `017`'s guide extraction would have written.
 * It does **not** try to read «va por tercero» out of prose — inferring a curricular
 * level from a sentence in a document is precisely the judgement FR-129 says is not
 * the application's to make.
 */
export function yearInOverlay(overlay: string | null): string | undefined {
  return /\b([a-z]{2}:[a-z]+-[a-z0-9]+)\b/.exec(overlay ?? '')?.[1];
}

/**
 * Which verifiers exist.
 *
 * A list rather than a chain of `if`s, so adding the second one is one line here
 * and a `contracts/verifiable-skills.md` read — and so `verifierFor` returning
 * `null` stays the single place the unverifiable path begins.
 */
const VERIFIERS = [arithmetic];

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

/**
 * Correcting composed material (021 T026-T029, FR-1916…FR-1920).
 *
 * ## Why this is not `job:revise`
 *
 * `job:revise` runs `runAdaptation` with her corrections. Pointing it at a composed job
 * would ask a model to **adapt** the sheet — producing an adaptation, which is not what
 * she asked for, and leaving `answers.md` describing exercises that no longer exist. One
 * word, «revise», was hiding two different operations (research R3).
 *
 * Correcting a composition means **composing again**, with what she said added to the
 * request. So the answer key is regenerated and **re-verified in the same step** by the
 * deterministic verifiers, before she is shown anything (FR-1919): a stale key is worse
 * than no key, because she marks against it in class.
 *
 * ## What is kept
 *
 * The previous version, like an adaptation's revisions (FR-1918). And **not** the
 * signature: a signature is about a document, and this is a different document (FR-1920).
 */
export async function correctComposition(
  jobId: string,
  corrections: readonly string[],
  onProgress: (p: ComposeProgress) => void,
): Promise<ComposeResult> {
  const vault = currentVault();

  const stored = await vault.readRaw(jobComposeRequest(jobId));
  if (stored === null) {
    /*
     * Composed before `021`, so nothing recorded what was asked for. Refused rather than
     * guessed: reconstructing objectives from the sheet would be inventing what she
     * wanted, and re-composing from an invented request is how a correction produces
     * material about something else.
     */
    throw new RampaError('compose-no-objective',
      'Este material lo hice antes de que guardara lo que me pediste, así que no puedo '
      + 'rehacerlo con un cambio. Dime otra vez qué quieres que aprenda y lo preparo.');
  }

  let request: ComposeRequest;
  try { request = JSON.parse(stored) as ComposeRequest; }
  catch {
    throw new RampaError('compose-no-objective',
      'No he podido leer lo que me pediste la primera vez. Dime otra vez qué quieres '
      + 'que aprenda y lo preparo.');
  }

  // Keep what was there, like an adaptation's revisions (FR-1918).
  const previous = await vault.readRaw(jobIR(jobId));
  if (previous !== null) {
    const n = await nextComposedRevision(vault, jobId);
    await vault.writeRaw(`${jobDir(jobId)}/ir.r${n}.md`, previous);
  }

  /*
   * Her correction reaches the model as part of what she is asking for, and it is
   * **her text**: `007`'s rule holds, so it goes through the same name check as her
   * notes before anything is sent (`runCompose` does that).
   */
  const asked = [...request.objectives, ...corrections.filter((c) => c.trim())];

  return runCompose(jobId, { ...request, objectives: asked }, onProgress);
}

/** The next `ir.rN.md`, so a correction never overwrites what she had. */
async function nextComposedRevision(vault: Vault, jobId: string): Promise<number> {
  const files: string[] = await vault.list(jobDir(jobId));
  const used = files
    .map((f) => /^ir\.r(\d+)\.md$/.exec(f)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}
