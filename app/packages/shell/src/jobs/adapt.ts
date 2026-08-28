import { type BrowserWindow } from 'electron';
import {
  Vault, VAULT, jobDir, parseIR, annotateInjection, checkBounds, isVerified,
  selectRecipes, recipeRef, loadLearner, buildReport, loadForRun, RampaError,
  stringifyFrontMatter, injectionNotices, axisLevelOf, AXES, logger,
} from '@rampa/core';
import { sendRedacted, providerById } from '@rampa/providers';
import { currentVault } from '../ipc/vault.js';
import { knownNames } from '../ipc/names.js';
import { currentKey } from '../ipc/keys.js';
import { allRecipes, loadInstruction } from '../ipc/corpus.js';
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

export async function runAdaptation(
  jobId: string, learnerCode: string, onProgress: (p: AdaptProgress) => void,
  corrections: Correction[] = [],
): Promise<{ report: string; notices: number; costCents: number; revision: number }> {
  const vault: Vault = currentVault();

  onProgress({ stage: 'Leyendo el material' });
  const raw = await vault.readRaw(`${jobDir(jobId)}/ir.md`);
  if (!raw) throw new RampaError('vault-unreadable', 'No encuentro el material de este trabajo.');

  const doc = annotateInjection(parseIR(raw));
  checkBounds(doc);

  // The verification gate: one OCR error in step one contaminates every output,
  // and she will not catch it in the finished PDF because it will read perfectly.
  if (!isVerified(doc)) {
    throw new RampaError('ir-unverified',
      'Todavía no has comprobado que la lectura del material sea fiel al original. Revísala antes de adaptar.');
  }

  onProgress({ stage: 'Leyendo el perfil y tus notas' });
  const learner = await loadLearner(vault, learnerCode);

  onProgress({ stage: 'Eligiendo las adaptaciones' });
  const lang = typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es';
  const selection = selectRecipes(await allRecipes(), learner.profile, lang);

  // Memory is never loaded wholesale: only entries for the recipes selected.
  const memory = await loadForRun(vault, selection.selected.map((r) => r.id));

  const { providerId, key } = await currentKey();
  const provider = providerId ? providerById(providerId) : undefined;
  if (!provider || !key) throw new RampaError('key-missing', 'Todavía no has conectado Rampa con tu servicio de IA.');

  onProgress({ stage: 'Adaptando', detail: `${selection.selected.length} reglas` });

  // Keep every previous attempt: a teacher comparing "before I told it" with
  // "after" is how she decides whether the correction landed, and losing the
  // earlier version to save a file would take that away.
  const revision = await nextRevision(vault, jobId);
  if (revision > 1) {
    const previous = await vault.readRaw(`${jobDir(jobId)}/adapted.md`);
    if (previous) await vault.writeRaw(`${jobDir(jobId)}/adapted.r${revision - 1}.md`, previous);
  }

  const prompt = [
    '## Perfil del alumno (barreras, no diagnóstico)',
    AXES.map((a) => `${a}: ${axisLevelOf(learner.profile, a) ?? 'sin observar'}`).join(' · '),
    learner.profile.works.length ? `\nLo que ya funciona:\n- ${learner.profile.works.join('\n- ')}` : '',
    learner.profile.avoid.length ? `\nEvitar:\n- ${learner.profile.avoid.join('\n- ')}` : '',
    learner.overlay ? `\n## Adaptaciones oficiales (mandan sobre las reglas)\n${learner.overlay}` : '',
    memory.house.trim() ? `\n## Cómo trabaja esta maestra\n${memory.house}` : '',
    memory.journal.length ? `\n## Lo aprendido antes\n${memory.journal.map((j) => j.body).join('\n---\n')}` : '',
    `\n## Reglas seleccionadas\n${selection.selected.map((r) => `### ${recipeRef(r)}\n${r.body}`).join('\n\n')}`,
    corrections.length
      ? `\n## Correcciones de la maestra sobre el intento anterior\n` +
        `Manda esto por encima de las reglas. Si contradice una regla, gana esto.\n` +
        corrections.map((c) => `- ${c.text}`).join('\n')
      : '',
    `\n## Material a adaptar\n${raw}`,
  ].filter(Boolean).join('\n');

  const known = await knownNames();
  const { stream, flagged } = sendRedacted(provider,
    { system: await systemPrompt(), messages: [{ role: 'user', content: prompt }] }, key, known);

  let out = '';
  let cents = 0;
  for await (const chunk of stream) {
    if (chunk.text) { out += chunk.text; onProgress({ stage: 'Adaptando', detail: `${out.length} caracteres` }); }
    if (chunk.usage) cents = provider.price(chunk.usage);
  }

  onProgress({ stage: 'Guardando' });
  await vault.writeRaw(`${jobDir(jobId)}/adapted.md`, out);

  const adapted = parseIR(out);
  const report = buildReport({
    adapted, selection,
    memoryApplied: memory.journal.map((j) => ({ source: j.path, effect: 'Apliqué lo aprendido antes' })),
  });
  await vault.writeRaw(`${jobDir(jobId)}/report.md`, report.markdown);
  await recordCost(jobId, cents);

  logger.info('adapt.finished', {
    jobId, revision, recipes: selection.selected.length,
    corrections: corrections.length, costCents: cents,
  });

  return {
    report: report.markdown,
    notices: injectionNotices(doc).length + doc.notices.length + flagged.length,
    costCents: cents,
    revision,
  };
}

/** Revision 1 is the first attempt; each re-run after a correction adds one. */
async function nextRevision(vault: Vault, jobId: string): Promise<number> {
  const files = await vault.list(jobDir(jobId));
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

  handle('job:revisions', async (jobId: string) => {
    const files = await currentVault().list(jobDir(jobId));
    return files.filter((f) => /^adapted(\.r\d+)?\.md$/.test(f)).sort();
  });

  handle('job:create', async (jobId: string, sourceText: string, lang = 'es') => {
    const vault = currentVault();
    const fm = { source: 'pegado', lang, kind: 'worksheet', extraction: { method: 'manual', verified: false } };
    const body = `::: {#b1 .explanation}\n${sourceText.trim()}\n:::\n`;
    await vault.writeRaw(`${jobDir(jobId)}/ir.md`, stringifyFrontMatter(fm, body));
    return jobId;
  });

  handle('job:verify', async (jobId: string) => {
    const vault = currentVault();
    const path = `${jobDir(jobId)}/ir.md`;
    const raw = (await vault.readRaw(path)) ?? '';
    await vault.writeRaw(path, raw.replace(/verified:\s*false/, 'verified: true'));
    return true;
  });

  handle('job:list', async () => currentVault().list(VAULT.material));
}
