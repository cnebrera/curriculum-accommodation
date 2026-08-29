import { type BrowserWindow } from 'electron';
import {
  Vault, VAULT, jobDir, jobIR, jobLearnerDir, jobAdapted, jobAdaptedRevision,
  jobRejected, jobReport, parseIR, annotateInjection, checkBounds, isVerified,
  selectRecipes, loadLearner, buildReport, loadForRun, RampaError,
  stringifyFrontMatter, injectionNotices, logger, buildAdaptPrompt,
  checkStructurallyComplete, checkCompleteness, completenessNotice,
  assertProvenance, findUnaccountedBlocks, divergence, studiesFor,
  type Notice, type CompletenessIssue,
} from '@rampa/core';
import { sendRedacted } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames, unknownNamesIn } from '../ipc/names.js';
import { activeProvider } from '../ipc/keys.js';
import { allRecipes, assertCorpus, loadInstruction, findYearInCorpus } from '../ipc/corpus.js';
import { recordCost } from '../ipc/cost.js';
import { handle } from '../ipc/wrap.js';

/**
 * Orchestration. The judgement lives in the corpus, not here: this assembles
 * what the model reads and enforces the gates around it.
 *
 * The system prompt is `instructions/hard-rules.md` and `instructions/adapt.md`,
 * read from the bundle at run time. It was once a string in this file, which was
 * a live violation of Principle I — the policy governing an adaptation has to be
 * something a teacher can read and correct without touching code. The only thing
 * added here is the output format, which is mechanics rather than judgement.
 *
 * The shape is the staged pipeline of ADR 0007: code owns the control flow, the
 * model owns the content, the verifiers in the loop are code, and iteration is
 * bounded — one retry, decided here, never by the model.
 */
const OUTPUT_FORMAT =
  '\n\n---\n\nDevuelve únicamente el documento adaptado, en el mismo formato que recibes.';

async function systemPrompt(): Promise<string> {
  const [rules, adapt] = await Promise.all([
    loadInstruction('hard-rules'),
    loadInstruction('adapt'),
  ]);
  return `${rules}\n\n---\n\n${adapt}${OUTPUT_FORMAT}`;
}

export interface AdaptProgress { stage: string; detail?: string; }

/**
 * A correction the teacher made in review, fed straight back into a re-run.
 *
 * This is the loop the whole project rests on. Without it she corrects the same
 * thing every week and the cost per worksheet never falls — the time saving is a
 * curve, not a constant, and this is what bends it. Between sessions the same
 * corrections arrive through memory; within a session she wants to see the fix
 * now, on this worksheet.
 */
export interface Correction { text: string; scope: 'learner' | 'practice' | 'corpus'; }

export interface AdaptResult {
  report: string;
  /** The structures the review screen renders (spec 010 FR-826). The markdown
   *  stays for report.md, which she must be able to read without the app. */
  reportData: {
    decisions: Array<{ title: string; recipe: string; axis: string; blocks: string[] }>;
    notDone: string[];
    memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  };
  /** Everything the teacher must be shown, quoted and located (007 FR-503). */
  notices: Array<{ block: string | null; notice: Notice }>;
  costCents: number;
  revision: number;
  /** Recipe ids used, so a corpus-scope correction can be tagged (T086). */
  recipes: string[];
  /** True when the first attempt failed the checks and the retry saved it. */
  retried: boolean;
}

/** How the detected problems are handed back to the model on the one retry. */
function retryCorrections(issues: CompletenessIssue[]): Correction[] {
  const missing = issues.filter((i) => i.kind === 'missing').map((i) => i.blockId).filter(Boolean);
  const notes: string[] = [];
  if (issues.some((i) => i.kind === 'truncated')) {
    notes.push('El intento anterior se cortó. Devuelve el documento completo, con todos los bloques cerrados.');
  }
  if (missing.length) {
    notes.push(
      `Faltaban estos bloques del original: ${missing.join(', ')}. ` +
      'Inclúyelos adaptados, o decláralos con [dropped:ID] y el motivo en el bloque .report-notes.');
  }
  return notes.map((text) => ({ text, scope: 'corpus' as const }));
}

/**
 * The learner's age, year and stage, resolved against the education corpus.
 *
 * Returns an empty object when nothing is known — no age, no year, or a system
 * that no longer ships. The prompt then emits no section at all, which is the
 * point: «edad: desconocida» invites a guess where silence prompts a question.
 */
async function whoIsThis(profile: { age?: number; year?: string; stage?: string }): Promise<{
  age?: number; year?: string; stage?: string;
  yearInfo?: { typicalAge: number | null; can?: string; studies?: string };
  divergence?: { years: number; notable: boolean } | null;
}> {
  if (profile.age === undefined && !profile.year) return {};

  const found = profile.year ? await findYearInCorpus(profile.year) : null;
  return {
    age: profile.age,
    // Her label, from the corpus where it is still there, and what the profile
    // recorded where it is not — a system withdrawn from the corpus must not
    // blank a learner's year.
    year: found?.year.label ?? profile.year,
    stage: found?.stage.label ?? profile.stage,
    yearInfo: found
      ? { typicalAge: found.year.typicalAge, can: found.year.can, studies: studiesFor(found) }
      : undefined,
    divergence: found ? divergence(profile.age, found.year) : null,
  };
}

export async function runAdaptation(
  jobId: string, learnerCode: string, onProgress: (p: AdaptProgress) => void,
  corrections: Correction[] = [],
): Promise<AdaptResult> {
  const vault: Vault = currentVault();

  onProgress({ stage: 'Leyendo el material' });
  const raw = await vault.readRaw(jobIR(jobId));
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro el material de este trabajo.');

  const doc = annotateInjection(parseIR(raw));
  checkBounds(doc);

  // The verification gate: one reading error in step one contaminates every
  // output, and she will not catch it in the finished PDF because it will read
  // perfectly plausibly.
  if (!isVerified(doc)) {
    throw new RampaError('ir-unverified',
      'Todavía no has comprobado que la lectura del material sea fiel al original. Revísala antes de adaptar.');
  }

  onProgress({ stage: 'Leyendo el perfil y tus notas' });
  const learner = await loadLearner(vault, learnerCode);

  onProgress({ stage: 'Eligiendo las adaptaciones' });
  // No recipes means no guards. Adapting anyway would produce plausible output
  // with the curriculum unprotected, which is worse than not adapting.
  await assertCorpus();
  const lang = typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es';
  const selection = selectRecipes(await allRecipes(), learner.profile, lang);

  // Memory is never loaded wholesale: only entries for the recipes selected.
  const memory = await loadForRun(vault, selection.selected.map((r) => r.id));

  /**
   * The active service, resolved through the catalogue (009 T027).
   *
   * This used to be `providerById(providerId)`, which knows only the two
   * hand-written adapters. The moment `009` let her connect Groq, Mistral,
   * DeepSeek or OpenAI, adapting would have thrown "todavía no has conectado
   * Rampa con tu servicio de IA" — with the key sitting right there, connected,
   * a green tick on the connection screen. She would have had no way to tell
   * that the failure was ours.
   */
  const active = await activeProvider();
  if (!active) throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');
  const { provider, key } = active;

  onProgress({ stage: 'Adaptando', detail: `${selection.selected.length} reglas` });

  // Keep every previous attempt: a teacher comparing "before I told it" with
  // "after" is how she decides whether the correction landed, and losing the
  // earlier version to save a file would take that away.
  await vault.ensureDir(jobLearnerDir(jobId, learnerCode));
  const revision = await nextRevision(vault, jobId, learnerCode);
  if (revision > 1) {
    const previous = await vault.readRaw(jobAdapted(jobId, learnerCode));
    if (previous) await vault.writeRaw(jobAdaptedRevision(jobId, learnerCode, revision - 1), previous);
  }

  const system = await systemPrompt();
  const known = await knownNames();

  /**
   * Ask before sending, on every channel she writes into (T090, 006 FR-419).
   *
   * The old check covered only the pasted worksheet, so a name typed into her
   * notes, her house style or a correction was flagged *after* the request had
   * already started streaming — the ask happened once the sending was done.
   * Only teacher-authored text is scanned: running this over the corpus or the
   * material produces a false positive on every mid-sentence capital.
   */
  const unknown = await unknownNamesIn([
    learner.notes,
    learner.overlay ?? '',
    memory.house,
    ...memory.journal.map((j) => j.body),
    ...corrections.map((c) => c.text),
  ]);
  if (unknown.length) {
    throw new RampaError('name-unconfirmed',
      `Hay un posible nombre en tus notas: ${unknown.join(', ')}. ` +
      'No he enviado nada. Dime si es un alumno y lo sustituyo por su código, o márcalo como que no es un nombre.',
      unknown);
  }

  const attempt = async (extra: Correction[]): Promise<{ out: string; cents: number; flagged: string[] }> => {
    const { prompt, notesOmitted } = buildAdaptPrompt({
      profile: learner.profile,
      // Who he is (011). Resolved here against the education corpus so the prompt
      // builder stays free of any knowledge about school systems.
      ...(await whoIsThis(learner.profile)),
      notes: learner.notes,
      overlay: learner.overlay,
      house: memory.house,
      journal: memory.journal.map((j) => ({ path: j.path, body: j.body })),
      recipes: selection.selected,
      corrections: [...corrections, ...extra],
      material: raw,
    });
    if (notesOmitted > 0) {
      logger.info('adapt.notes-bounded', { jobId, omittedSections: notesOmitted });
    }

    const { stream, flagged } = sendRedacted(provider,
      { system, messages: [{ role: 'user', content: prompt }] }, key, known);

    let out = '';
    let cents = 0;
    for await (const chunk of stream) {
      if (chunk.text) { out += chunk.text; onProgress({ stage: 'Adaptando', detail: `${out.length} caracteres` }); }
      if (chunk.usage) cents = provider.price(chunk.usage);
    }
    return { out, cents, flagged };
  };

  // ── The deterministic gate (007 FR-512, FR-516, FR-517; ADR 0007) ─────────
  let result = await attempt([]);
  let totalCents = result.cents;
  let issues = [...checkStructurallyComplete(result.out), ...checkCompleteness(doc, parseIR(result.out))];
  let retried = false;

  if (issues.length) {
    logger.warn('adapt.output-rejected', { jobId, attempt: 1, issues: issues.length });
    onProgress({ stage: 'Revisando el resultado', detail: 'faltaba algo, lo vuelvo a pedir' });
    retried = true;
    const second = await attempt(retryCorrections(issues));
    totalCents += second.cents;
    const secondIssues = [
      ...checkStructurallyComplete(second.out),
      ...checkCompleteness(doc, parseIR(second.out)),
    ];
    if (secondIssues.length) {
      // Keep the evidence, leave her last good sheet untouched, and say what
      // happened in her language. Cost of both attempts is still recorded: it
      // was spent.
      await vault.writeRaw(jobRejected(jobId, learnerCode), second.out);
      await recordCost(jobId, totalCents);
      logger.error('adapt.output-rejected-final', { jobId, issues: secondIssues.length });
      throw new RampaError('output-incomplete', completenessNotice(secondIssues).message, secondIssues);
    }
    result = { ...second, cents: totalCents };
    issues = [];
  }

  const adapted = parseIR(result.out);

  // Additions without provenance, and content that derives from nothing in the
  // original: the traceability rule doubling as the injection detector.
  assertProvenance(adapted);
  const unaccounted = findUnaccountedBlocks(doc, adapted);
  if (unaccounted.length) {
    throw new RampaError('ir-no-provenance',
      `Aparecieron ${unaccounted.length} bloque(s) que no vienen de nada del material original.`,
      unaccounted.map((b) => b.id));
  }

  onProgress({ stage: 'Guardando' });
  await vault.writeRaw(jobAdapted(jobId, learnerCode), result.out);

  const report = buildReport({
    adapted, selection,
    /*
     * What was **loaded**, not what to report (003 FR-210).
     *
     * This used to pass `effect: 'Apliqué lo aprendido antes'` for every entry
     * that intersected the run — so an entry that matched a recipe id and changed
     * nothing read exactly like a correction that did. `buildReport` now takes
     * what was available and keeps only what the model declared using, so a line
     * in that section means her correction had an effect.
     *
     * One entry per recipe it is tagged with: the recipe is what she recognises,
     * where a path like `memory/journal/2026-03-01-casillas.md` would make her
     * open a file to find out what the report meant.
     */
    memoryAvailable: memory.journal.flatMap((j) =>
      j.recipes.map((recipe) => ({ recipe, source: j.path }))),
  });
  await vault.writeRaw(jobReport(jobId, learnerCode), report.markdown);
  await recordCost(jobId, totalCents);

  logger.info('adapt.finished', {
    jobId, revision, recipes: selection.selected.length,
    corrections: corrections.length, costCents: totalCents, retried,
  });

  // Every notice reaches her: computed and discarded was the defect (T089).
  const notices: AdaptResult['notices'] = [
    ...doc.notices.map((n) => ({ block: null, notice: n })),
    ...injectionNotices(doc).map(({ block, notice }) => ({ block: block.id, notice })),
    ...result.flagged.map((name) => ({
      block: null,
      notice: {
        kind: 'unreadable' as const,
        quote: name,
        message: `He enviado "${name}" tal cual porque no sé si es el nombre de alguien. ` +
          'Si lo es, dímelo y lo sustituyo por su código a partir de ahora.',
      },
    })),
  ];

  return {
    report: report.markdown,
    reportData: {
      decisions: report.decisions,
      notDone: report.notDone,
      // What the model declared using AND the run actually loaded — verified in
      // `buildReport`, not trusted here.
      memoryApplied: report.memoryApplied,
    },
    notices,
    costCents: totalCents,
    revision,
    recipes: selection.selected.map((r) => r.id),
    retried,
  };
}

/** Revision 1 is the first attempt; each re-run after a correction adds one. */
async function nextRevision(vault: Vault, jobId: string, learnerCode: string): Promise<number> {
  const files = await vault.list(jobLearnerDir(jobId, learnerCode));
  const revisions = files
    .map((f) => /^adapted\.r(\d+)\.md$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  const existing = files.includes('adapted.md') ? 1 : 0;
  return Math.max(existing, ...revisions, 0) + 1;
}

export function registerAdaptIpc(getWindow: () => BrowserWindow | null): void {
  handle('job:adapt', async (jobId: string, learnerCode: string) =>
    runAdaptation(jobId, learnerCode, (p) => getWindow()?.webContents.send('job:progress', p)));

  /**
   * Re-run this worksheet with what she just corrected. The correction is also
   * captured into memory by the review screen, so it applies to the NEXT
   * worksheet too — this handler is what makes it apply to the one in front of
   * her right now.
   */
  handle('job:revise', async (jobId: string, learnerCode: string, corrections: Correction[]) =>
    runAdaptation(jobId, learnerCode,
      (p) => getWindow()?.webContents.send('job:progress', p), corrections));

  handle('job:revisions', async (jobId: string, learnerCode: string) => {
    const files = await currentVault().list(jobLearnerDir(jobId, learnerCode));
    return files.filter((f) => /^adapted(\.r\d+)?\.md$/.test(f)).sort();
  });

  handle('job:create', async (jobId: string, sourceText: string, lang = 'es') => {
    const vault = currentVault();
    const fm = { source: 'pegado', lang, kind: 'worksheet', extraction: { method: 'manual', verified: false } };
    const body = `::: {#b1 .explanation}\n${sourceText.trim()}\n:::\n`;
    await vault.writeRaw(jobIR(jobId), stringifyFrontMatter(fm, body));
    return jobId;
  });

  /**
   * The verification gate, for a **pasted** document only.
   *
   * This used to flip `verified: false` to `true` with a regular expression over
   * the whole document, whatever the document was — so the gate the project
   * calls "its defence against contaminating every output with one reading
   * error" could be passed with one click, having read nothing.
   *
   * For ingested material the gate is per page and derived, in
   * `jobs/ingest.ts` (008 T021, FR-608). For pasted text there is nothing to
   * compare against — she wrote it — so one confirmation is the honest gate, and
   * this handler refuses anything that came from a file.
   */
  handle('job:verify', async (jobId: string) => {
    const vault = currentVault();
    const path = jobIR(jobId);
    const raw = (await vault.readRaw(path)) ?? '';
    const doc = parseIR(raw);
    const source = String(doc.frontMatter['source'] ?? '');
    if (source && source !== 'pegado' && source !== 'pasted') {
      throw new RampaError('ir-unverified',
        'Este material viene de un fichero, así que hay que confirmarlo página a página.');
    }
    await vault.writeRaw(path, raw.replace(/verified:\s*false/, 'verified: true'));
    return true;
  });

  handle('job:list', async () => currentVault().list(VAULT.material));

  /**
   * The report as structures, for the review screen (spec 010 FR-826).
   * Rebuilt from the adapted document rather than parsed back out of the
   * markdown — the markdown is a rendering, not a source.
   */
  handle('job:reportData', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const raw = await vault.readRaw(jobAdapted(jobId, learnerCode));
    if (!raw) return null;
    const report = buildReport({ adapted: parseIR(raw) });
    return { decisions: report.decisions, notDone: report.notDone, memoryApplied: [] };
  });

  /** Which learners this job has already been adapted for (T092b). */
  handle('job:learners', async (jobId: string) => {
    const entries = await currentVault().list(jobDir(jobId));
    return entries.filter((e) => !e.includes('.') && e !== 'source');
  });
}
