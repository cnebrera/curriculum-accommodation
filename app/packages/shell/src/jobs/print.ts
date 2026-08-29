import { BrowserWindow, shell } from 'electron';
import { renderHTML, parseIR, checkOutput, checkPhotocopy, checkEssentialFigures,
         presentationFor, jobAdapted, outputDir, loadLearner, RampaError, AXES, axisLevelOf, isSignedOff } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { knownNames } from '../ipc/names.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInVault } from '@rampa/core';
import { handle } from '../ipc/wrap.js';

/**
 * HTML and PDF are produced by the application itself (006 FR-425): nothing for
 * the teacher to install, and — because Chromium is bundled — the PDF she prints
 * is made by the same engine we tested against.
 */
async function renderJob(jobId: string, learnerCode: string) {
  const vault = currentVault();
  const raw = await vault.readRaw(jobAdapted(jobId, learnerCode));
  if (!raw) throw new RampaError('vault-unreadable', 'Este trabajo todavía no está adaptado.');

  const doc = parseIR(raw);

  /**
   * Whether the draft mark comes off is read from the **document**, never from
   * the caller (007 FR-509).
   *
   * This used to be a boolean parameter on `job:render` and `job:pdf`, defaulting
   * to false and passed straight through to the renderer. So
   * `window.rampa.job.render(jobId, learner, true)` produced an unmarked
   * worksheet with **no sign-off having happened** — and `signoff.ts` carried a
   * comment claiming "the renderer only omits the banner when this has run",
   * which was simply not true.
   *
   * FR-509 requires the mark be removable "only by the review step, enforced
   * structurally". A parameter the caller chooses is not a structural
   * enforcement; it is a convention, and `cases/injection/05-remove-the-draft-mark`
   * exists because the consequence is unreviewed material in a child's hands.
   *
   * Derived, so there is no parameter to pass and nothing to get wrong.
   */
  const signedOff = isSignedOff(doc);

  const undescribed = checkEssentialFigures(doc);
  if (undescribed.length) {
    // Emitting an exercise the learner cannot possibly answer is worse than no sheet.
    throw new RampaError('render-undescribed', undescribed.join(' '), undescribed);
  }

  // Only axis LEVELS reach the renderer, never the profile object.
  const learner = await loadLearner(vault, learnerCode);
  const levels = Object.fromEntries(AXES.map((a) => [a, axisLevelOf(learner.profile, a)]));

  const html = renderHTML(doc, { presentation: presentationFor(levels), signedOff });

  const check = checkOutput(html, [learnerCode], [...(await knownNames()).values()]);
  if (!check.ok) throw new RampaError('render-learner-data', check.findings.join(' '), check.findings);

  return { html, photocopy: checkPhotocopy(html) };
}

export function registerPrintIpc(): void {
  /**
   * Fix two things by hand (T094).
   *
   * 001's own journey says *"they read the report, fix two things, and take it to
   * class"*. Until this existed her only in-app route for a two-word fix was a
   * full re-run: cost, wait, and a fresh document to re-check. Opening the file
   * in her own editor is the vault promise doing its job, not a workaround — and
   * the watcher already reports the change, so a re-render picks it up.
   */
  handle('job:openForEditing', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const path = resolveInVault(vault.root, jobAdapted(jobId, learnerCode));
    const problem = await shell.openPath(path);
    if (problem) throw new RampaError('vault-unreadable', problem);
    return path;
  });

  handle('job:render', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const { html, photocopy } = await renderJob(jobId, learnerCode);
    const htmlPath = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/sheet.html`);
    await mkdir(dirname(htmlPath), { recursive: true });
    await writeFile(htmlPath, html, 'utf8');
    return { htmlPath, photocopy };
  });

  handle('job:pdf', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const { html } = await renderJob(jobId, learnerCode);

    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, javascript: false } });
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      const pdf = await win.webContents.printToPDF({
        printBackground: true, pageSize: 'A4',
        margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
      });
      const pdfPath = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/sheet.pdf`);
      await mkdir(dirname(pdfPath), { recursive: true });
      await writeFile(pdfPath, pdf);
      return pdfPath;
    } finally { win.destroy(); }
  });
}
