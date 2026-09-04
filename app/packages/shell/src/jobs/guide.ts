import {
  jobIR, learnerOverlay, parseIR, annotateInjection, checkBounds, isVerified,
  readGuide, guideSection, appendGuideSection, draftAcns, requireRecordedWork,
  requireEvaluation, checkDeclines, parseGuideCorpus, parseAcsCorpus,
  recordFor, loadLearner, findYear, logger, RampaError,
  type Candidate, type GuideReading, type Measure, addCost,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { assertCorpus, loadInstruction, findYearInCorpus } from '../corpus/index.js';
import { recordCost } from '../ipc/cost.js';

/**
 * The guide (017 T011-T026).
 *
 * ## Three things, and the order they happen in
 *
 * 1. **Read.** The guide came in through `008`'s ingest and through its verification
 *    gate — no second path (FR-1505/1506, T011). This asks the model to point at the
 *    sentences that look like measures, and then **code decides which may be kept**.
 * 2. **Apply.** She confirms, and only then is anything written (FR-1511).
 * 3. **Draft, and ask.** The ACNS from recorded work; the conversation about one
 *    loaded document.
 *
 * ## Where the refusals live
 *
 * Not here. The clinical filter is `readGuide` and the ACS refusal is
 * `checkDeclines`, both in `core`, both over data rather than in a prompt — because a
 * prompt instruction shares its context window with a document that may contradict
 * it, and `007` settled that argument for the whole project.
 *
 * This file's job is to make sure they are **called**, and the tests that matter are
 * in `core` beside the functions.
 */

const CANDIDATE_FORMAT = '\n\n---\n\n'
  + 'Devuelve únicamente una línea por medida, con este formato exacto:\n'
  + '`sección | la medida tal como lo dice el documento`\n\n'
  + 'Por ejemplo:\nApartado 5 | Enunciados de una sola instrucción por frase.\n\n'
  + 'Incluye TODAS las frases que digan qué hacer, aunque creas que no nos toca a '
  + 'nosotros. Lo que no sea una medida, no lo incluyas. Sin explicaciones alrededor.';

async function readingPrompt(): Promise<string> {
  const [rules, guide] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('guide'),
  ]);
  return `${rules}\n\n---\n\n${guide}${CANDIDATE_FORMAT}`;
}

export interface GuideProgress { stage: string; detail?: string }

export interface GuideRead extends GuideReading {
  jobId: string;
  costCents: number | null;
  /** Everything she must see about the document itself (Principle IX). */
  notices: Array<{ block: string | null; notice: { kind: string; quote: string; message: string } }>;
}

/**
 * Read a guide that has already been ingested and verified, and **write nothing**
 * (T013).
 */
export async function readGuideJob(
  jobId: string, onProgress: (p: GuideProgress) => void,
): Promise<GuideRead> {
  await assertCorpus();
  const vault = currentVault();

  onProgress({ stage: 'Leyendo la adaptación curricular' });
  const raw = await vault.readRaw(jobIR(jobId));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro ese documento.');

  const doc = annotateInjection(parseIR(raw));
  checkBounds(doc);

  /*
   * The same gate as a worksheet, and for a stronger reason (FR-1506): this is the
   * document where a misreading matters most, and it would be the one nobody had
   * checked.
   */
  if (!isVerified(doc)) {
    throw new RampaError('ir-unverified',
      'Todavía no has comprobado que la lectura de este documento sea fiel. '
      + 'Revísala antes de que me quede con nada de él.');
  }

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }

  onProgress({ stage: 'Buscando las medidas' });
  const { stream } = sendRedacted(
    active.provider,
    {
      system: await readingPrompt(),
      messages: [{ role: 'user', content: raw }],
      maxTokens: 3000,
    },
    active.key, await knownNames(), { maxAttempts: 1 },
  );

  let answer = '';
  let costCents: number | null = 0;
  for await (const chunk of stream) {
    if (chunk.text) { answer += chunk.text; onProgress({ stage: 'Buscando las medidas', detail: `${answer.length} caracteres` }); }
    if (chunk.usage) costCents = addCost(costCents, active.provider.price(chunk.usage));
  }
  await recordCost(jobId, costCents);

  const corpus = parseGuideCorpus(await loadInstruction('guide'));
  const reading = readGuide(parseCandidates(answer), corpus, {
    declaredKind: typeof doc.frontMatter['title'] === 'string' ? doc.frontMatter['title'] : undefined,
    sectionsFound: doc.blocks.map((b) => b.content.slice(0, 120)),
  });

  logger.info('guide.read', {
    jobId, measures: reading.measures.length,
    omitted: reading.omitted.length, kind: reading.kind, costCents,
  });

  return {
    ...reading,
    jobId,
    costCents,
    notices: [
      ...doc.notices.map((n) => ({ block: null, notice: n })),
      ...doc.blocks.flatMap((b) => b.notices.map((notice) => ({ block: b.id, notice }))),
    ],
  };
}

/**
 * `sección | medida`, one per line.
 *
 * A line without the separator is **not** a candidate. The alternative — treating the
 * whole line as a measure with no citation — would produce measures she cannot check
 * against the document in her hand, and FR-1519's requirement applies to extraction
 * as much as to an answer.
 */
export function parseCandidates(raw: string): Candidate[] {
  const body = /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
  const out: Candidate[] = [];
  for (const line of body.split(/\r?\n/)) {
    const clean = line.trim().replace(/^[-*•]\s*/, '');
    const at = clean.indexOf('|');
    if (at <= 0) continue;
    const source = clean.slice(0, at).trim();
    const text = clean.slice(at + 1).trim();
    if (source && text) out.push({ text, source });
  }
  return out;
}

/**
 * Write the confirmed measures to her overlay (T015, FR-1511).
 *
 * Nothing before this point has written anything. And the measures come from **her
 * confirmation**, not from the reading: she may have unticked one, and the version
 * that gets written is hers.
 */
export async function applyGuide(args: {
  learnerCode: string;
  measures: readonly Measure[];
  document: string;
  omitted?: readonly string[];
  /**
   * What `readGuideJob` worked out this document was (decision P12).
   *
   * It was computed, shown on the screen once («esto parece una adaptación
   * significativa») and **never written down** — so the one fact that unblocks
   * adapting to a modified level never reached the file the model reads.
   */
  kind?: 'acns' | 'acs';
}): Promise<{ path: string; written: number }> {
  const vault = currentVault();

  /*
   * Her own words about the document, checked for a name like every other channel
   * she types into (`009`, `006` FR-419). A shared class document is likelier to
   * contain another child's name than a worksheet is (spec edge case, T018).
   */
  const unknown = await unknownNamesIn([args.document, ...args.measures.map((m) => m.text)]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en lo que voy a guardar: ${unknown.join(', ')}. `
      + 'No he guardado nada. Dime si es un alumno y lo sustituyo por su código.',
      unknown);
  }

  const path = learnerOverlay(args.learnerCode);
  const existing = await vault.readRaw(path);
  const section = guideSection({
    measures: args.measures,
    document: args.document,
    // From the process, never from a model (Principle II).
    on: new Date().toISOString().slice(0, 10),
    ...(args.omitted ? { omitted: args.omitted } : {}),
    ...(args.kind ? { kind: args.kind } : {}),
  });

  await vault.writeRaw(path, appendGuideSection(existing, section.markdown));
  logger.info('guide.applied', { measures: section.written });
  return { path, written: section.written };
}

/** The ACNS draft (T019-T022). Assembled, never generated. */
export async function draftAcnsJob(learnerCode: string): Promise<{
  markdown: string; missing: string[]; sources: string[];
}> {
  const vault = currentVault();
  const record = await recordFor(vault, learnerCode);

  const refusal = requireRecordedWork(record);
  if (refusal) throw new RampaError('guide-no-work', refusal);

  const learner = await loadLearner(vault, learnerCode);
  const found = learner.profile.year ? await findYearInCorpus(learner.profile.year) : null;
  const corpus = parseGuideCorpus(await loadInstruction('guide'));

  /*
   * The recipes each report records, read here because `core` does not read files —
   * and supplied rather than stubbed, which is what `AcnsInput.recipesByJob` exists
   * for.
   */
  const recipesByJob: Record<string, string[]> = {};
  for (const entry of record) {
    const reportPath = entry.documents.report;
    if (!reportPath) continue;
    const report = await vault.readRaw(reportPath);
    if (!report) continue;
    const ids = [...report.matchAll(/Receta:\s*`([^`@]+)/g)].map((m) => m[1]!.trim());
    if (ids.length) recipesByJob[entry.jobId] = [...new Set(ids)];
  }

  return draftAcns({
    learnerCode,
    ...(found ? { year: found.year.label, stage: found.stage.label } : {}),
    record,
    overlay: learner.overlay,
    sections: corpus.acnsSections,
    recipesByJob,
    on: new Date().toISOString().slice(0, 10),
  });
}

/**
 * One question about one loaded document (T023/T024, US3).
 *
 * **The exchange reaches nothing.** No vault write, no adaptation, no profile change,
 * and no second document — the untrusted surface is exactly one guide rather than a
 * growing context (research R4). What is kept is what she selects, written by a
 * separate call she makes afterwards (FR-1521, Principle VIII).
 *
 * And `checkDeclines` runs over the answer **before it is returned**, so an answer
 * proposing which objectives to remove is never shown (FR-1520).
 */
export async function askAboutGuide(args: {
  jobId: string;
  question: string;
  /** Previous turns, so «y eso?» means something. Bounded by the caller. */
  history?: ReadonlyArray<{ question: string; answer: string }>;
}): Promise<{ answer: string; declined: boolean; costCents: number | null }> {
  await assertCorpus();
  const vault = currentVault();

  const raw = await vault.readRaw(jobIR(args.jobId));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro ese documento.');

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }

  const unknown = await unknownNamesIn([args.question]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en tu pregunta: ${unknown.join(', ')}. No he enviado nada.`,
      unknown);
  }

  const [rules, guide, acsRules] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('guide'),
    loadInstruction('acs'),
  ]);

  const turns = (args.history ?? [])
    .map((t) => `Pregunta: ${t.question}\nRespuesta: ${t.answer}`).join('\n\n');

  const { stream } = sendRedacted(
    active.provider,
    {
      system: `${rules}\n\n---\n\n${guide}\n\n---\n\n${acsRules}\n\n---\n\n`
        + 'Responde sólo sobre el documento que te dan. Cada respuesta dice en qué '
        + 'parte del documento se apoya. Si el documento no lo dice, di «eso no lo '
        + 'dice» — no lo saques de tu propio conocimiento.',
      messages: [{
        role: 'user',
        content: `Documento:\n\n${raw}\n\n---\n\n${turns ? `${turns}\n\n---\n\n` : ''}`
          + `Pregunta: ${args.question}`,
      }],
      maxTokens: 1500,
    },
    active.key, await knownNames(), { maxAttempts: 1 },
  );

  let answer = '';
  let costCents: number | null = 0;
  for await (const chunk of stream) {
    if (chunk.text) answer += chunk.text;
    if (chunk.usage) costCents = addCost(costCents, active.provider.price(chunk.usage));
  }
  await recordCost(args.jobId, costCents);

  const verdict = checkDeclines(answer, parseAcsCorpus(acsRules));
  if (!verdict.ok) {
    logger.warn('guide.declined', { matched: verdict.matched.slice(0, 40) });
    return { answer: verdict.say, declined: true, costCents };
  }

  return { answer, declined: false, costCents };
}

/**
 * Helping her write the ACS (T025/T026, US4).
 *
 * She states which objectives the team decided to modify. Rampa helps her express
 * them and **never proposes the list** — and refuses outright where no evaluación
 * psicopedagógica is recorded, without drafting around it (FR-1524).
 */
export async function helpWithAcs(args: {
  learnerCode: string;
  /** Recorded as existing. Rampa never asserts it and never summarises it. */
  evaluationRecorded: boolean;
  /** Her list, hers alone. */
  decided: string;
}): Promise<{ answer: string; declined: boolean; costCents: number | null }> {
  const blocked = requireEvaluation(args.evaluationRecorded);
  if (blocked) throw new RampaError('guide-no-evaluation', blocked);

  const active = await activeProvider();
  if (!active) {
    throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  }

  const unknown = await unknownNamesIn([args.decided]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en lo que has escrito: ${unknown.join(', ')}. No he enviado nada.`,
      unknown);
  }

  const [rules, acsRules] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('acs'),
  ]);

  const { stream } = sendRedacted(
    active.provider,
    {
      system: `${rules}\n\n---\n\n${acsRules}`,
      messages: [{
        role: 'user',
        content: 'El equipo docente ya ha decidido qué se modifica. Ayúdame a '
          + 'redactarlo:\n\n' + args.decided,
      }],
      maxTokens: 2000,
    },
    active.key, await knownNames(), { maxAttempts: 1 },
  );

  let answer = '';
  let costCents: number | null = 0;
  for await (const chunk of stream) {
    if (chunk.text) answer += chunk.text;
    if (chunk.usage) costCents = addCost(costCents, active.provider.price(chunk.usage));
  }
  await recordCost(`acs-${args.learnerCode}`, costCents);

  const verdict = checkDeclines(answer, parseAcsCorpus(acsRules));
  if (!verdict.ok) {
    logger.warn('acs.declined', { matched: verdict.matched.slice(0, 40) });
    return { answer: verdict.say, declined: true, costCents };
  }

  /*
   * Who signs it, appended by us and not asked of the model (FR-1502, T026). The
   * regulation names three roles, and a draft that named the wrong author is a draft
   * somebody files under the wrong signature.
   */
  return {
    answer: `${answer}\n\n---\n\n${ACS_FOOTER}`,
    declined: false,
    costCents,
  };
}

export const ACS_FOOTER = [
  '**Esto es un borrador y no está presentado.** El registro es Séneca.',
  '',
  'Según la normativa, en una adaptación curricular significativa:',
  '',
  '- La **redacta el profesorado especialista en educación especial** (PT).',
  '- **Colabora** el profesorado del área.',
  '- **Asesora** el equipo o departamento de orientación.',
  '',
  'Y requiere una **evaluación psicopedagógica previa**. Sin ella es nula de',
  'procedimiento, por mucho que el documento parezca completo.',
].join('\n');
