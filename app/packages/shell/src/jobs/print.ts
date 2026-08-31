import { BrowserWindow, shell } from 'electron';
import { renderHTML, renderODT, parseIR, checkOutput, checkPhotocopy, checkEssentialFigures,
         presentationFor, jobAdapted, outputDir, loadLearner, RampaError, AXES, axisLevelOf, isSignedOff,
         parsePicto } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { knownNames } from '../ipc/names.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInVault } from '@rampa/core';
import { pictogramImagesFor } from '../pictograms/access.js';

/**
 * HTML and PDF are produced by the application itself (006 FR-425): nothing for
 * the teacher to install, and — because Chromium is bundled — the PDF she prints
 * is made by the same engine we tested against.
 */
export async function renderJob(jobId: string, learnerCode: string) {
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

  /*
   * The pictograms this document actually asked for (018 T020).
   *
   * Read from the document rather than from the profile: what is on the sheet was
   * decided when it was adapted, and re-deciding it at print time would let a sheet
   * gain or lose pictures between the review she signed and the page she printed.
   *
   * An id whose file is gone is simply absent from the map, and the renderer draws a
   * named gap (FR-1616) — a moved set must not fail a render.
   */
  const ids = [...new Set(doc.blocks.flatMap((b) => parsePicto(b.attrs['data-picto']).map((p) => p.id)))];
  const pictogramImages = ids.length > 0 ? await pictogramImagesFor(ids) : undefined;

  const html = renderHTML(doc, {
    presentation: presentationFor(levels), signedOff,
    ...(pictogramImages ? { pictogramImages } : {}),
  });

  const check = checkOutput(html, [learnerCode], [...(await knownNames()).values()]);
  if (!check.ok) throw new RampaError('render-learner-data', check.findings.join(' '), check.findings);

  return { html, photocopy: checkPhotocopy(html) };
}

/**
 * HTML to PDF, which is the reason this application is Electron.
 *
 * ADR 0008 chose Electron over Tauri **against** the numbers on bundle size and
 * memory, on one argument: Chromium's `printToPDF` produces a print-quality
 * document from the same HTML the screen shows, and Tauri has no programmatic
 * equivalent. Two of that ADR's three arguments were later found to be
 * overstated and were corrected in the file. This is the one that survived.
 *
 * So it stays in `jobs/` with its `electron` import, and the boundary test
 * counts it rather than pretending it is not there. Everything else in this
 * package that touches Electron is wiring; this is the dependency itself.
 */
export async function renderPdf(html: string): Promise<Buffer> {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, javascript: false } });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await win.webContents.printToPDF({
      printBackground: true, pageSize: 'A4',
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });
  } finally { win.destroy(); }
}

/** Open the adapted document in her own editor (T094). */
export async function openAdaptedForEditing(jobId: string, learnerCode: string): Promise<string> {
  const vault = currentVault();
  const path = resolveInVault(vault.root, jobAdapted(jobId, learnerCode));
  const problem = await shell.openPath(path);
  if (problem) throw new RampaError('vault-unreadable', problem);
  return path;
}
