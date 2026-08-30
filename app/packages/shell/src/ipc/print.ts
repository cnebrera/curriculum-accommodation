import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInVault, outputDir } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { renderJob, renderPdf, openAdaptedForEditing } from '../jobs/print.js';

/**
 * Wiring for what she prints (013 T019, FR-1111).
 *
 * `jobs/print.ts` keeps its `electron` import and that is the honest outcome: the
 * offscreen BrowserWindow that turns HTML into a PDF **is** the argument ADR 0008
 * chose Electron on, after its two other arguments were found to be overstated.
 * It is the one place where the dependency is load-bearing rather than
 * incidental, and `boundary.test.ts` counts it rather than pretending otherwise.
 */
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
  handle('job:openForEditing', async (jobId: string, learnerCode: string) =>
    openAdaptedForEditing(jobId, learnerCode));

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
    const pdf = await renderPdf(html);
    const pdfPath = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/sheet.pdf`);
    await mkdir(dirname(pdfPath), { recursive: true });
    await writeFile(pdfPath, pdf);
    return pdfPath;
  });
}
