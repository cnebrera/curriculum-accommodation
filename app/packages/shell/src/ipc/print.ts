import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInVault, outputDir, jobAnswers, RampaError,
         renderAnswerKeyHTML } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { renderJob, renderPdf, openAdaptedForEditing } from '../jobs/print.js';
import { renderOdt, renderAudioReady, renderBraille } from '../jobs/export.js';

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

  /**
   * The document, for the viewer inside the application (`021` T014, FR-1905).
   *
   * Returns the **printer's own HTML**, deliberately. Rendering the document a second
   * time for the screen would be a second renderer — two implementations of what the page
   * looks like, and the one she checks would not be the one she prints.
   *
   * It writes nothing: viewing is not producing. The renderer is deterministic and calls
   * no model, so this is free to call as often as a screen wants.
   */
  handle('job:documentHtml', async (jobId: string, learnerCode: string) => {
    const { html } = await renderJob(jobId, learnerCode);
    return html;
  });

  /**
   * The teacher's copy, rendered (`021` T013, FR-1921/FR-1922).
   *
   * **Its own file, always.** `002` writes `answers.md` at the job level rather than under
   * a learner because the key belongs to the composition, and this keeps that: a
   * separate path, never the sheet's, so no rendering can put the two in one document.
   *
   * The heading comes from `ANSWER_KEY_HEADING`, one constant read by every renderer of
   * it — because that string is what stands between a page of answers and the photocopy
   * pile, and two copies of it is one copy that gets edited.
   */
  handle('job:answerKeyHtml', async (jobId: string) => {
    const raw = await currentVault().readRaw(jobAnswers(jobId));
    if (raw === null) {
      throw new RampaError('vault-unreadable',
        'Este material no tiene hoja de soluciones: no había ejercicios que yo pudiera comprobar.');
    }
    return renderAnswerKeyHTML(raw);
  });

  handle('job:render', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const { html, photocopy } = await renderJob(jobId, learnerCode);
    const htmlPath = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/sheet.html`);
    await mkdir(dirname(htmlPath), { recursive: true });
    await writeFile(htmlPath, html, 'utf8');
    return { htmlPath, photocopy };
  });

  /**
   * The one she can fix by hand (019 US1).
   *
   * Written beside the PDF rather than instead of it: the PDF is what she
   * photocopies and the ODT is what she corrects, and a teacher who can change
   * the last two words does not abandon a sheet that is 95% right.
   */
  handle('job:odt', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const bytes = await renderOdt(jobId, learnerCode);
    const path = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/sheet.odt`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    return path;
  });

  /**
   * For listening (019 US2) and for a transcriber (US3).
   *
   * Two channels rather than one with a mode, because they are two documents for
   * two different people: the audio-ready file is for the learner and says «éste no
   * te lo puedo leer en orden», and the braille-ready one is for a professional and
   * says «para el transcriptor». A mode flag would invite one wording for both.
   *
   * `announced` comes back to the renderer as well as into the file, because what
   * could not be read in order is a decision she has to know about — buried in a
   * text file she may hand to somebody else, it becomes a thing only the learner
   * discovers.
   */
  handle('job:audio', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const { text, announced } = await renderAudioReady(jobId, learnerCode);
    const path = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/para-escuchar.txt`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, 'utf8');
    return { path, announced };
  });

  handle('job:brailleReady', async (jobId: string, learnerCode: string) => {
    const vault = currentVault();
    const { text, announced } = await renderBraille(jobId, learnerCode);
    const path = resolveInVault(vault.root, `${outputDir(jobId, learnerCode)}/para-braille.txt`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, 'utf8');
    return { path, announced };
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
