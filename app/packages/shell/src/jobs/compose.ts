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
  parseProblemProposals, parseExamProposals, verifyProblem,
  examBelowCourse, acsInOverlay, derivedKind, kindMismatched,
  archivePrevious,
  parseFigureCorpus, parseDiagramRequests, figureQuantities, describeFigure,
  acceptGlyph, isRefusal,
  type Leveled, type ProposedExercise, type Skill, type ComposeOutcome,
  type Proposal, type ProposedProblem, type ProposedQuestion,
  type ProblemItem, type ExamQuestion, type Figure, type DiagramRequest,
  type FigureRefusal, type FigureCorpus,
  type AnswerLine, type SheetGroup, type Verifier, type AnchorPassage, type Block,
  type Notice, addCost,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { assertCorpus, loadInstruction, findYearInCorpus, materialKind,
         yearsInSchoolOrder } from '../corpus/index.js';
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

/**
 * The judgement layer, with no wire format attached (Principle I).
 *
 * Split out on 2026-09-04 (review AGE-04). `systemPrompt()` appended
 * `OUTPUT_FORMAT` — «devuelve únicamente una línea por ejercicio… sin texto
 * alrededor» — and **the same system was reused by `composeContent`**, whose user
 * message asks for the opposite: IR blocks with `data-objective` and `data-anchor`.
 *
 * A model that obeyed the system returned something `parseIR` does not understand,
 * both attempts failed, she paid for two calls of 4.000 tokens each, and the error
 * blamed her for something else entirely: «se apoyaba en cosas que no me diste.
 * Prueba a darme un poco más». The diagnosis named anchoring; the fault was format.
 */
export async function judgementLayer(): Promise<string> {
  const [rules, compose] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('compose'),
  ]);
  return `${rules}\n\n---\n\n${compose}`;
}

/** The arithmetic path: one line per exercise, and nothing else. */
export async function systemPrompt(): Promise<string> {
  return `${await judgementLayer()}${OUTPUT_FORMAT}`;
}

/**
 * The content path: the same judgement, and **no** exercise format.
 *
 * Its own function rather than a flag, so the two wire formats cannot be reached
 * from one call site by mistake — which is exactly how they came to contradict each
 * other.
 */
export async function contentSystemPrompt(): Promise<string> {
  return `${await judgementLayer()}\n\n---\n\n`
    + 'Lo que se te pide aquí es **material de estudio**, no una lista de ejercicios. '
    + 'El formato exacto de salida va en el propio mensaje.';
}

/**
 * The problems path (`027` T008, FR-2507,
 * `specs/027-examenes-y-problemas/contracts/proposal-formats.md`).
 *
 * A word problem is unparseable under `OUTPUT_FORMAT` **by construction** — which is
 * why «problemas» could be offered on screen, charged for, and never produced. So it has
 * its own format, and the one-liner is not appended to it.
 *
 * The three instructions in it are the ones the parser and the verifier depend on, and
 * they are here rather than in the corpus for the reason `OUTPUT_FORMAT`'s own comment
 * gives: this is the wire, which is mechanics. **What makes a good statement** — that the
 * statement is not the obstacle, that the context is his, that the question is really
 * asked — is judgement, and lives in `instructions/compose.md` (T022).
 */
const PROBLEM_FORMAT = '\n\n---\n\n'
  + 'Devuelve únicamente bloques con este formato exacto y nada alrededor:\n\n'
  + 'PROBLEMA\n'
  + 'ENUNCIADO: María tiene 3,50 € y compra un cuaderno que cuesta 1,20 €. '
  + '¿Cuánto le queda?\n'
  + 'OPERACIÓN: 3,50 - 1,20\n'
  + 'RESULTADO: 2,30\n\n'
  + 'Tres reglas sobre las que el programa comprueba tu propuesta, y si no se cumplen '
  + 'la descarta:\n'
  + '1. **Todos los números de OPERACIÓN tienen que aparecer en el ENUNCIADO.** Si la '
  + 'cuenta usa un número que no está en la historia, son dos problemas distintos y el '
  + 'niño se queda con la historia.\n'
  + '2. **El ENUNCIADO no puede decir el resultado.** Si lo dice, la respuesta está en '
  + 'la hoja del alumno.\n'
  + '3. **RESULTADO es sólo para comparar.** La respuesta la calcula el programa, no tú.';

/**
 * The exam path (`027` T008, FR-2503/FR-2507).
 *
 * `TEXTO` is the only field that ever reaches the sheet, and the prompt says so — a
 * model that puts the answer inside the prompt puts it on the page a child sits the exam
 * with. A question with no `OPERACIÓN` is allowed on purpose: it is carried
 * declared-unverified rather than dropped, and dropping it would leave her with only the
 * questions arithmetic can check, which is not an exam.
 */
const EXAM_FORMAT = '\n\n---\n\n'
  + 'Devuelve únicamente bloques con este formato exacto y nada alrededor:\n\n'
  + 'PREGUNTA\n'
  + 'TEXTO: Calcula: 305 − 148\n'
  + 'OPERACIÓN: 305 - 148\n'
  + 'RESULTADO: 157\n\n'
  + 'PREGUNTA\n'
  + 'TEXTO: Escribe con tus palabras cómo lo has hecho.\n'
  + 'RESULTADO: (respuesta orientativa, sólo para la hoja de la maestra)\n\n'
  + 'Reglas:\n'
  + '1. **TEXTO es lo único que ve el alumno.** No pongas la respuesta ahí, ni una '
  + 'pista de la respuesta, ni el resultado entre paréntesis.\n'
  + '2. Pon **OPERACIÓN** siempre que la pregunta sea una cuenta: es lo que permite al '
  + 'programa comprobarla y darle a la maestra una solución exacta. Si no la lleva, la '
  + 'pregunta se marca como «sin comprobar» y ella lo sabrá.\n'
  + '3. Si pones OPERACIÓN, **todos sus números tienen que estar en TEXTO**.\n'
  + '4. No pongas puntuación, baremos ni «vale 2 puntos». Eso no es tuyo ni mío.';

/** The problems path: the same judgement, its own block format. */
export async function problemSystemPrompt(): Promise<string> {
  return `${await judgementLayer()}${PROBLEM_FORMAT}`;
}

/** The exam path: the same judgement, its own block format. */
export async function examSystemPrompt(): Promise<string> {
  return `${await judgementLayer()}${EXAM_FORMAT}`;
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
  costCents: number | null;
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

  /*
   * **An exam below his course stops here** (`027` T016, FR-2509, decision P12).
   *
   * Before the provider is resolved, like the anchor gate and for the same reason:
   * nothing is sent and nothing is charged. She gets a sentence she can act on — bring
   * the ACS, or ask for support material instead — rather than a bill and a document she
   * must not use.
   *
   * The trigger is **the request**: which course the material is aimed at. Not his CUR,
   * not his desfase, not anything about him — that is the correction 2.11 had to make to
   * `adapt.md`, and this gate is written so the profile is not even in scope.
   */
  if (request.kind === 'exam') {
    const gated = examBelowCourse({
      order: await yearsInSchoolOrder(),
      target,
      ...(learner.profile.year ? { enrolled: learner.profile.year } : {}),
      acsRegistered: acsInOverlay(learner.overlay),
    });
    if (gated) {
      const examKind = await materialKind('exam');
      throw new RampaError('compose-exam-other-course',
        examKind?.composing?.belowLevel
        /*
         * The corpus sentence, and a refusal if the corpus lost it.
         *
         * Not a hardcoded Spanish fallback: a sentence in code beside a sentence in the
         * corpus is the drift this project has found more often than any other kind of
         * bug, and this one carries an argument about Spanish special education that a
         * PT must be able to correct. A missing corpus file is an installation problem
         * and `assertCorpus` already says so.
         */
        ?? 'No encuentro las reglas de los tipos de material. Es un problema de la '
           + 'instalación, no tuyo: vuelve a instalar Rampa.');
    }
  }

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }
  const { provider, key } = active;
  const system = await systemPrompt();
  const known = await knownNames();

  const wanted = clampWanted(request.perObjective ?? limits.exercisesPerObjective);
  let costCents: number | null = 0;

  /*
   * The diagram corpus (`022` T006/T010).
   *
   * Read at compose time, never at render time: its judgement is baked into the stamped
   * block, which is what makes a composed document renderable anywhere, for ever
   * (FR-2004). Its fallback draws **nothing**, so a corpus that fails to load loses the
   * feature rather than drawing with bounds nobody declared.
   */
  const figures = parseFigureCorpus(await loadInstruction('figures'));
  const diagramRequests: DiagramRequest[] = [];
  const figureRefusals: FigureRefusal[] = [];

  const groups: SheetGroup[] = [];
  const unverifiedObjectives: string[] = [];
  /*
   * Typed on `Proposal` and not on `ProposedExercise`, because the three pipelines put
   * three shapes in here and the only thing the report needs from any of them is the
   * verdicts (`explainOutcome`).
   */
  const outcomes: Array<{ objective: string; wanted: number; outcome: ComposeOutcome<Proposal> }> = [];

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
          provider, key, known, system, shape: EXERCISE_SHAPE,
          skill, objective: text, level: l, need, soFar: [],
          interests: learner.profile.interests ?? [],
          yearLabel: yearId ? yearLabel(yearId) : undefined,
          onProgress: (detail) => onProgress({ stage: 'Preparando los ejercicios', detail }),
        });
        costCents = addCost(costCents, cents);
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

    const budget = { wanted, maxProposals: limits.proposalsPerObjective };
    const ask = <T extends Proposal>(
      shape: Parameters<typeof propose<T>>[0]['shape'], withSystem: string, stage: string,
    ) => async (s: Skill, soFar: readonly T[], need: number): Promise<readonly T[]> => {
      const { proposed, cents, raw } = await propose<T>({
        provider, key, known, system: withSystem, shape,
        /*
         * Diagrams ride the **exercise** path only.
         *
         * A composed problem already tells its own story and a study text has no verified
         * quantity to draw from — so neither gets the invitation, and neither can produce
         * a figure request that would point at nothing.
         */
        ...(shape.noun === EXERCISE_SHAPE.noun ? { figures } : {}),
        skill: s, objective: text, level: l, need, soFar,
        interests: learner.profile.interests ?? [],
        yearLabel: yearId ? yearLabel(yearId) : undefined,
        onProgress: (detail) => onProgress({ stage, detail }),
      });
      costCents = addCost(costCents, cents);
      /*
       * The diagram requests, out of the **same** response (T010, FR-2001).
       *
       * No new provider call: they are extra lines the model may add after the exercises,
       * so a sheet with diagrams costs what a sheet without them costs. Collected across
       * batches and matched to accepted exercises afterwards — a request pointing at a
       * proposal the verifier rejected points at nothing.
       */
      if (figures.kinds.length > 0) {
        diagramRequests.push(...parseDiagramRequests(raw, figures));
      }
      return proposed;
    };

    /*
     * **The kind selects the pipeline** (`027` T018, `021` FR-1909).
     *
     * Until now it selected the footnotes: whichever kind she chose, this loop produced
     * a list of bare operations, and the report apologised that «lo que ha salido se
     * parece más a una ficha». She was asked how many questions she wanted, charged, and
     * handed a sheet of sums.
     *
     * `study` is deliberately **not** here. A study text needs an anchor, and the anchor
     * gate keys on the objective being content — so a skill objective under «apuntes»
     * still produces exercises, and T019's structural check now reports that as the real
     * mismatch it is. Routing it to the content path instead would demand an anchor she
     * was never asked for, which is a decision for a spec and not for this line.
     */
    if (request.kind === 'problems') {
      const outcome = await composeExercises<ProposedProblem>(
        skill, verifier,
        ask<ProposedProblem>(PROBLEM_SHAPE, await problemSystemPrompt(),
          'Preparando los problemas'),
        budget, verifyProblem,
      );
      outcomes.push({ objective: text, wanted, outcome });
      if (outcome.accepted.length > 0) {
        groups.push({
          of: 'problems', objective: text, instruction: PROBLEM_INSTRUCTION,
          problems: outcome.accepted.map((a): ProblemItem => ({
            statement: a.exercise.statement,
            /*
             * `a.answer` is what `solve` computed, never `statedAnswer`. The loop's
             * `Accepted.answer` has meant that since `002` and this keeps it: the model's
             * `RESULTADO` was compared and then discarded.
             */
            ...(a.exercise.expression ? { expression: a.exercise.expression } : {}),
            answer: a.answer,
          })),
        });
      }
      if (explainOutcome(outcome, wanted)) {
        logger.warn('compose.short', { objective: text, accepted: outcome.accepted.length });
      }
      continue;
    }

    if (request.kind === 'exam') {
      const outcome = await composeExercises<ProposedQuestion>(
        skill, verifier,
        ask<ProposedQuestion>(QUESTION_SHAPE, await examSystemPrompt(),
          'Preparando las preguntas'),
        budget, judgeQuestion,
      );
      outcomes.push({ objective: text, wanted, outcome });
      if (outcome.accepted.length > 0) {
        groups.push({
          of: 'questions', objective: text, instruction: EXAM_INSTRUCTION,
          questions: outcome.accepted.map((a): ExamQuestion => {
            const computed = a.exercise.expression !== undefined && a.answer !== '';
            return {
              text: a.exercise.text,
              ...(computed
                ? { expression: a.exercise.expression!, answer: a.answer }
                /*
                 * The model's draft, and **only** where nothing computed an answer. For
                 * a computable question the computed answer wins and the draft is
                 * dropped — carrying both would be one careless `??` away from the key
                 * showing the model's number.
                 */
                : a.exercise.statedAnswer ? { draftAnswer: a.exercise.statedAnswer } : {}),
            };
          }),
        });
      }
      if (explainOutcome(outcome, wanted)) {
        logger.warn('compose.short', { objective: text, accepted: outcome.accepted.length });
      }
      continue;
    }

    const outcome = await composeExercises(
      skill, verifier,
      ask<ProposedExercise>(EXERCISE_SHAPE, system, 'Preparando los ejercicios'),
      budget,
    );

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
      provider, key, known,
      /*
       * **Its own system** (review AGE-04). This used to pass `system`, which
       * carries `OUTPUT_FORMAT` — «una línea por ejercicio… sin texto alrededor» —
       * while the user message below asks for IR blocks. Two contradictory formats
       * in one call, two failed attempts, and an error message that blamed her
       * anchor.
       */
      system: await contentSystemPrompt(),
      objectives: contentObjectives, allObjectives: kept,
      passages: anchor.passages,
      interests: learner.profile.interests ?? [],
      yearLabel: yearId ? yearLabel(yearId) : undefined,
      canDo: found?.year.can,
      onProgress: (detail) => onProgress({ stage: 'Escribiendo el texto', detail }),
    });
    costCents = addCost(costCents, written.cents);
    content = written.blocks;
  }

  /*
   * The diagrams, matched to the exercises that survived verification
   * (`022` T008, FR-2001/2002/2003).
   *
   * After the loop, because a request pointing at a proposal the verifier rejected points
   * at nothing — and because the answer, which several kinds need, is only known once the
   * exercise was accepted. Every quantity here comes from `figureQuantities`, which reads
   * the expression and the **computed** answer; the model's numbers reach nothing.
   */
  const drawn = new Map<string, Figure>();
  for (const group of groups) {
    // An unverified group stamps nothing (FR-2003): the same branch that keeps its
    // answers out of the key. A confident picture beside unchecked arithmetic lends it a
    // credibility it has not earned.
    if (group.of !== undefined || group.unverified) continue;
    for (const item of group.accepted) {
      const request = diagramRequests.find((r) => same(r.expression, item.exercise.expression));
      if (!request) continue;

      const quantities = figureQuantities({
        corpus: figures, kindId: request.kind,
        expression: item.exercise.expression, answer: item.answer,
      });
      if (isRefusal(quantities)) { figureRefusals.push(quantities); continue; }

      const glyph = acceptGlyph(item.exercise.expression, request.glyph);
      if (isRefusal(glyph)) {
        /*
         * The glyph is refused and the figure is **still drawn**, plain.
         *
         * The alternative — no diagram because its decoration failed the wall — would
         * lose a correct picture over a theme, and the theme is the part that matters
         * least. She is told, so the model's markup is not silently discarded either.
         */
        figureRefusals.push(glyph);
      }

      /*
       * The stated numbers, where they disagree (FR-2002).
       *
       * Said rather than silently corrected: «la cantidad la corregí yo» is a sentence
       * she can act on, and a silent correction is a model whose mistakes she never
       * learns about.
       */
      const drawnNumbers = numbersIn(quantities);
      const disagreeing = (request.statedNumbers ?? [])
        .filter((n) => !drawnNumbers.includes(n));
      if (disagreeing.length > 0) {
        figureRefusals.push({
          of: item.exercise.expression, reason: 'quantities-drifted',
          detail: `Para «${item.exercise.expression}» pedía un dibujo con `
            + `${disagreeing.join(', ')}. Lo he dibujado con las cantidades del `
            + 'ejercicio, que son las que he comprobado.',
        });
      }

      drawn.set(item.exercise.expression, {
        of: item.exercise.expression,
        quantities,
        ...(request.theme && (learner.profile.interests ?? []).length > 0
          ? { theme: request.theme } : {}),
        ...(!isRefusal(glyph) && glyph.glyph ? { glyph: glyph.glyph } : {}),
        description: describeFigure(figures, quantities,
          request.theme && (learner.profile.interests ?? []).length > 0
            ? request.theme : undefined),
      });
    }
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
  const derived = derivedKind(groups, content.length > 0);

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
  // One decision, in one place (`027` FR-2506): «different» has to mean the same thing
  // in the derivation and in the note, or the note is an apology every time — which is
  // exactly what it was.
  const kindMismatch = kindMismatched(request.kind, groups, content.length > 0);

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
    /*
     * What happened to each diagram, quoted and located (`022` T012, FR-2011/2015).
     *
     * In the notes, which become the report — a refusal she cannot see is a refusal that
     * teaches her nothing about the material she is about to sign.
     */
    ...figureRefusals.map((r) => r.detail),
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
    ...(drawn.size > 0 ? { figures: drawn } : {}),
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
    /*
     * `sheet.key`, not `sheet.answers` (`027` T007/T013).
     *
     * `answers` is the **computed** subset. Writing it here would leave an exam key
     * silent on every question arithmetic could not check — six of ten on an ordinary
     * test — which is a key she completes by hand or stops reading. `key` carries both,
     * in sheet order, with the unchecked ones led by their own label.
     */
    title, composedOn, answers: sheet.key,
    ...(unverifiedObjectives.length ? { unverifiedObjectives } : {}),
  }));

  const criteria = criteriaIn(anchor.passages);

  const report = buildComposeReport({
    title, composedOn, leveled, outcomes, listing: sheet.listing, yearLabel,
    /*
     * The kind in her words, and what it cost (`027` T021).
     *
     * `kindEntry.label` from the corpus — never a map here, which is `021` T020's
     * lesson. The mismatch flag so the heading does not claim a kind the notes are
     * about to say did not come out.
     */
    ...(kindEntry?.label ? { kindLabel: kindEntry.label } : {}),
    ...(kindMismatch ? { kindMismatch } : {}),
    costCents,
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
async function propose<T extends Proposal>(args: {
  provider: Parameters<typeof sendRedacted>[0];
  key: string;
  known: ReadonlyMap<string, string>;
  system: string;
  skill: Skill;
  objective: string;
  level: Leveled;
  need: number;
  soFar: readonly T[];
  interests: readonly string[];
  yearLabel?: string;
  /**
   * The diagram corpus, when this path may ask for diagrams (`022` T010/T016).
   *
   * Absent for the paths that may not: a study text has no verified quantity to draw
   * from, and a problem's picture is not in this feature's scope. Absence is what stops
   * the invitation being sent, so a path that must not offer diagrams cannot.
   */
  figures?: FigureCorpus;
  /**
   * What the model is being asked for, and how to read what comes back
   * (`027` T009/T013).
   *
   * One prompt builder for the three shapes rather than three, so the two sentences
   * that must not vary — the level bound («esto no se negocia») and the interests rule
   * («úsalo en el contexto, no en la dificultad», FR-2511) — are written once. Three
   * builders would be three places for the second one to soften, and softening it is
   * how a child's interest turns into his difficulty.
   */
  shape: {
    /** «ejercicio(s)», «problema(s)», «pregunta(s)». */
    noun: string;
    parse: (raw: string) => T[];
    /** How to show one that already exists, so it is not repeated. */
    show: (proposal: T) => string;
  };
  onProgress: (detail: string) => void;
}): Promise<{ proposed: T[]; cents: number | null; raw: string }> {
  const lines: string[] = [
    `Objetivo, con las palabras de la maestra: «${args.objective}».`,
    `Necesito ${args.need} ${args.shape.noun}.`,
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

  /*
   * The diagram invitation, and **only** from recorded interests (`022` T016, FR-2005/2006).
   *
   * With interests: the corpus invites a theme drawn from them — words and simple shapes,
   * never somebody's artwork. With none: the corpus asks for plain figures and does not
   * mention theming at all. Themed at random would be **inventing a fact about a child**,
   * which is the same refusal `011` makes about ages and courses.
   *
   * Both sentences are corpus, and so is the request format. What is code is which of the
   * two is sent, which is a fact about her vault rather than a judgement.
   */
  if (args.figures && args.figures.requestFormat) {
    lines.push(args.figures.requestFormat);
    const theming = args.interests.length > 0
      ? args.figures.themeWhenKnown.replace('{interests}', args.interests.join(', '))
      : args.figures.themeWhenUnknown;
    if (theming) lines.push(theming);
  }

  if (args.soFar.length) {
    lines.push('Ya tengo estos, no los repitas:',
      args.soFar.map(args.shape.show).join('\n'));
  }

  const { stream } = sendRedacted(
    args.provider,
    { system: args.system, messages: [{ role: 'user', content: lines.join('\n\n') }], maxTokens: 1500 },
    args.key, args.known, { maxAttempts: 1 },
  );

  let raw = '';
  let cents: number | null = 0;
  for await (const chunk of stream) {
    if (chunk.text) { raw += chunk.text; args.onProgress(`${raw.length} caracteres`); }
    if (chunk.usage) cents = addCost(cents, args.provider.price(chunk.usage));
  }

  /*
   * The raw text comes back too, since `022`.
   *
   * The diagram requests are lines in the **same** response — the request rides the
   * existing propose loop rather than costing a second call (T010) — so the caller needs
   * the text to parse them out of. Returned rather than parsed here, because this
   * function knows nothing about figures and should not start to.
   */
  return { proposed: args.shape.parse(raw), cents, raw };
}

/** The three shapes, named once so a call site cannot invent a fourth. */
const EXERCISE_SHAPE = {
  noun: 'ejercicio(s)',
  parse: parseProposals,
  show: (e: ProposedExercise) => e.expression,
};

const PROBLEM_SHAPE = {
  noun: 'problema(s)',
  parse: parseProblemProposals,
  /*
   * The statement, not the operation. «No repitas 3,50 - 1,20» invites the same story
   * with different numbers, which is the repetition that matters least; what makes a
   * problems page feel like one problem eight times is the story.
   */
  show: (p: ProposedProblem) => p.statement,
};

const QUESTION_SHAPE = {
  noun: 'pregunta(s)',
  parse: parseExamProposals,
  show: (q: ProposedQuestion) => q.text,
};

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
}): Promise<{ blocks: Block[]; cents: number | null }> {
  let cents: number | null = 0;

  const ask = async (extra: string[]): Promise<{ raw: string; truncated: boolean }> => {
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
    let truncated = false;
    for await (const chunk of stream) {
      if (chunk.text) { raw += chunk.text; args.onProgress(`${raw.length} caracteres`); }
      if (chunk.usage) cents = addCost(cents, args.provider.price(chunk.usage));
      if (chunk.truncated) truncated = true;
    }
    return { raw, truncated };
  };

  const CONTENT_FORMAT = 'Devuelve sólo bloques en el formato del documento intermedio, '
    + 'cada uno con `data-objective` y `data-anchor`:\n'
    + '::: {#c1 .explanation data-objective="…" data-anchor="a1"}\ntexto\n:::';

  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { raw, truncated } = await ask(
      attempt === 1 ? [CONTENT_FORMAT] : [CONTENT_FORMAT, ...problems]);
    const parsed = parseIR(stripFence(raw));

    const objectiveIssues = checkObjectives(parsed, args.allObjectives);
    const anchorIssues = checkAnchored(parsed, args.passages);
    problems = [
      ...objectiveIssues.map((i) => i.message),
      ...anchorIssues.map((i) => i.message),
    ];

    /*
     * Cut off at the ceiling is **not** an acceptable answer here (review AGE-07).
     *
     * `material-kinds.md` says the `study` kind's own failure mode is «teaching
     * less without it showing», and a text stopped at 4.000 tokens is exactly
     * that — generated by us. It passes both checks above: a cut mid-way through
     * an objective leaves blocks that still carry a valid `data-objective` and
     * `data-anchor`, and `checkObjectives` never asks whether every objective she
     * asked for actually got blocks. So the net is finer than it looks and this is
     * the only thing that can see it.
     *
     * Reported as a problem rather than thrown, so the second attempt runs — and
     * if that one is cut too, the error below says what happened.
     */
    if (truncated) {
      problems.push('El texto se cortó porque llegó al límite de longitud. '
        + 'No te doy un texto a medias: pide menos de una vez, o divídelo en dos.');
      logger.warn('compose.content-truncated', { attempt, chars: raw.length });
    }

    if (problems.length === 0 && parsed.blocks.length > 0) {
      // Annotated like any other material: her anchor's text is now inside blocks
      // written by a model, and Principle IX does not stop applying at that point.
      return { blocks: annotateInjection(parsed).blocks, cents };
    }

    logger.warn('compose.content-rejected', { attempt, problems: problems.length });
  }

  /*
   * And the error names what actually happened.
   *
   * It said «las dos se apoyaba en cosas que no me diste» unconditionally, so a run
   * that failed on **format** — which was the normal case while the content path
   * inherited the exercise system prompt (AGE-04) — told her to give more anchor
   * text. A wrong diagnosis costs her the next attempt as well.
   */
  const cutOff = problems.some((p) => p.includes('límite de longitud'));
  throw new RampaError('ir-no-provenance',
    cutOff
      ? 'He escrito el texto dos veces y las dos se me ha cortado por longitud. No te '
        + 'doy un texto a medias: pídeme menos de una vez, o divídelo en dos partes.'
      : 'He escrito el texto dos veces y las dos se apoyaba en cosas que no me diste. '
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

/**
 * The instruction line above each shape (`027` T009/T013).
 *
 * In code beside `instructionFor` and for its reason: one sentence of mechanics. What
 * makes a *good* instruction for a learner is a recipe's job, and the adaptation pass
 * applies it.
 */
const PROBLEM_INSTRUCTION = 'Lee cada problema y resuélvelo.';
const EXAM_INSTRUCTION = 'Contesta a cada pregunta.';

/**
 * A bare calculation dressed as a question that declared no operation (`027` T013).
 *
 * The declared-unverified path is honest and it is also a door: a model can dodge every
 * check by simply omitting `OPERACIÓN`, and «305 − 148» with no operation would sail
 * through as «nothing could check this». It could have been checked, so it is refused —
 * and refusing it costs one proposal, where letting it through costs a wrong key.
 *
 * Deliberately narrow: it fires only when the prompt **is** an operation between two
 * numbers. «¿Cuántas patas tienen 3 perros?» is not, and asking the model to express it
 * would be asking it for the semantics R2 refuses to encode.
 */
const BARE_CALCULATION = /(?:^|[:\s])-?\d+(?:[.,]\d+)?\s*[+\-−×x*÷/:]\s*-?\d+(?:[.,]\d+)?\s*[?.]?\s*$/;

/**
 * How an exam question is judged (`027` T013, FR-2503/FR-2504).
 *
 * With an operation: exactly as a problem — operands present in the text the learner
 * reads, answer computed, level and constraints checked.
 *
 * Without one: **accepted and declared unverified**, which is research R3's position and
 * a departure from the skill path. The argument is that an exam of ten questions where
 * six ask for an explanation is an ordinary exam, and rejecting those would hand her the
 * four that arithmetic can check and call it a test. `answer: ''` is what the
 * unverifiable path already uses for «nothing computed this», and the sheet turns it
 * into `data-unverified` per item rather than a silent gap.
 */
const judgeQuestion = (
  verifier: Verifier, skill: Skill, q: ProposedQuestion,
): ReturnType<typeof verifyProblem> => {
  if (!q.expression?.trim()) {
    if (BARE_CALCULATION.test(q.text)) {
      return { ok: false, reason: 'malformed',
        because: `«${q.text}» es una cuenta y no ha declarado la operación, así que no `
          + 'la puedo comprobar. La descarto.' };
    }
    return { ok: true, answer: '' };
  }
  return verifyProblem(verifier, skill, {
    statement: q.text,
    expression: q.expression,
    ...(q.statedAnswer ? { statedAnswer: q.statedAnswer } : {}),
  });
};

/**
 * Two expressions are the same exercise (`022` T008).
 *
 * Keyed by expression rather than by position, because a recipe that splits a page
 * renumbers it and `47 × 8` survives that — the answer key learned this in `002`.
 * Normalised the same way the loop's dedupe is, so `47 × 8` and `47×8` match.
 */
const same = (a: string, b: string): boolean =>
  a.replace(/\s+/g, '').replace(',', '.').toLowerCase()
  === b.replace(/\s+/g, '').replace(',', '.').toLowerCase();

/** Every number the drawing will actually show, so a disagreement can be named. */
const numbersIn = (q: Figure['quantities']): number[] =>
  q.kind === 'grid' ? [q.rows, q.cols, q.rows * q.cols]
    : q.kind === 'groups' ? [q.groups, q.perGroup, q.groups * q.perGroup]
      : q.kind === 'number-line' ? [q.start, q.jumps, q.end]
        : [...q.parts, q.whole];

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

  /*
   * Keep what was there, like an adaptation's revisions (FR-1918) — and through the
   * **same** mechanism since `026` T003. This had its own `nextComposedRevision`; the
   * adaptation had `nextRevision`; the difference between them was the file stem.
   */
  await archivePrevious(vault, { dir: jobDir(jobId), stem: 'ir' });

  /*
   * Her correction reaches the model as part of what she is asking for, and it is
   * **her text**: `007`'s rule holds, so it goes through the same name check as her
   * notes before anything is sent (`runCompose` does that).
   */
  const asked = [...request.objectives, ...corrections.filter((c) => c.trim())];

  return runCompose(jobId, { ...request, objectives: asked }, onProgress);
}


