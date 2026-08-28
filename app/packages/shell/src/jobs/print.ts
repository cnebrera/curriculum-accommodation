import { BrowserWindow } from 'electron';
import { renderHTML, parseIR, checkOutput, checkPhotocopy, checkEssentialFigures,
         presentationFor, jobDir, outputDir, loadLearner, RampaError, AXES, axisLevelOf } from '@rampa/core';
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
async function renderJob(jobId: string, learnerCode: string, signedOff: boolean) {
  const vault = currentVault();
  const raw = await vault.readRaw(`${jobDir(jobId)}/adapted.md`);
  if (!raw) throw new RampaError('vault-unreadable', 'Este trabajo todavía no está adaptado.');

  const doc = parseIR(raw);

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
  handle('job:render', async (jobId: string, learnerCode: string, signedOff: boolean = false) => {
    const vault = currentVault();
    const { html, photocopy } = await renderJob(jobId, learnerCode, signedOff);
    const htmlPath = resolveInVault(vault.root, `${outputDir(jobId)}/sheet.html`);
    await mkdir(dirname(htmlPath), { recursive: true });
    await writeFile(htmlPath, html, 'utf8');
    return { htmlPath, photocopy };
  });

  handle('job:pdf', async (jobId: string, learnerCode: string, signedOff: boolean = false) => {
    const vault = currentVault();
    const { html } = await renderJob(jobId, learnerCode, signedOff);

    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, javascript: false } });
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      const pdf = await win.webContents.printToPDF({
        printBackground: true, pageSize: 'A4',
        margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
      });
      const pdfPath = resolveInVault(vault.root, `${outputDir(jobId)}/sheet.pdf`);
      await mkdir(dirname(pdfPath), { recursive: true });
      await writeFile(pdfPath, pdf);
      return pdfPath;
    } finally { win.destroy(); }
  });
}
