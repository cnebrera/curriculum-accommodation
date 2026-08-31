import { type BrowserWindow } from 'electron';
import { parseIR, stringifyFrontMatter, buildReport, VAULT, RampaError } from '@rampa/core';
import { jobIR, jobAdapted, jobDir, jobLearnerDir } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { runAdaptation, type Correction } from '../jobs/adapt.js';
import { runBatch } from '../jobs/batch.js';
import { refreshRecord } from './record.js';
import { materialKind } from '../corpus/index.js';

/**
 * Wiring, and only wiring (013 T019, FR-1111).
 *
 * `jobs/adapt.ts` was 423 lines of which the last 75 were `ipcMain` handlers, so
 * the file that decides how a worksheet is adapted also decided which channel
 * names exist and imported `electron` to do it. Two jobs, one file, and the
 * Electron dependency reaching into the layer that has the least business
 * knowing what a window is.
 *
 * Orchestration now lives in `jobs/`, imports no `electron`, and takes an
 * `onProgress` callback it does not know is an IPC send. That is what makes the
 * boundary test in `packages/shell/test/boundary.test.ts` worth having: the
 * exit ADR 0008 kept affordable is affordable in proportion to how little of
 * this application knows it is running inside Electron.
 */
export function registerAdaptIpc(getWindow: () => BrowserWindow | null): void {
  /**
   * One worksheet, one or several learners (005 FR-501).
   *
   * A bare string is still accepted and returns a `BatchOutcome` of one. Not
   * politeness to old callers — there are none outside this repository — but so
   * the e2e suite keeps driving the application unchanged *through* this change
   * and can therefore catch a regression in it.
   */
  handle('job:adapt', async (jobId: string, learners: string | string[]) => {
    const outcome = await runBatch(jobId, learners, runAdaptation,
      (p) => getWindow()?.webContents.send('job:progress', p));
    // A job completing is one of FR-1215's three events. Only the learners who
    // actually got a sheet: a failure changed nothing to record.
    for (const r of outcome.results) if (r.ok) await refreshRecord(r.learner);
    return outcome;
  });

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

  /**
   * Create a job from pasted text (012 T009, FR-1003).
   *
   * `kind` is **required and never defaulted.** This handler used to write
   * `kind: 'worksheet'` unconditionally, for every document anybody ever brought
   * — so an exam became a worksheet before the model saw it, silently, and the
   * hard rule about preserving the criterion had nothing telling it which
   * documents it governed.
   *
   * An unrecognised kind is refused rather than coerced, the same argument as
   * `resolveInVault`: a value that should not exist is a signal, and rewriting it
   * into something plausible hides the event worth seeing.
   */
  handle('job:create', async (jobId: string, sourceText: string, kind: string, lang = 'es') => {
    const vault = currentVault();
    if (!kind || !(await materialKind(kind))) {
      throw new RampaError('material-kind-missing',
        'No sé qué es este material. Dime si es una ficha, un examen, apuntes o problemas.');
    }
    const fm = { source: 'pegado', lang, kind, extraction: { method: 'manual', verified: false } };
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
