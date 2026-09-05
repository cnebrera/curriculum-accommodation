import { BrowserWindow, shell } from 'electron';
import { renderHTML, renderODT, parseIR, checkOutput, checkPhotocopy, checkEssentialFigures,
         presentationFor, outputDir, loadLearner, RampaError, AXES, axisLevelOf, isSignedOff,
         resolveDocument, whyNoDocument,
         parsePicto, type Vault } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { knownNames } from '../ipc/names.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolveInVault } from '@rampa/core';
import { pictogramImagesFor, pictogramCredits as pictogramCreditsFor } from '../pictograms/access.js';

/**
 * HTML and PDF are produced by the application itself (006 FR-425): nothing for
 * the teacher to install, and — because Chromium is bundled — the PDF she prints
 * is made by the same engine we tested against.
 */
export async function renderJob(jobId: string, learnerCode: string, vault: Vault = currentVault()) {
  /*
   * Whichever document this job has (`021` T007).
   *
   * This read `jobAdapted` and refused otherwise, so composed material could not be
   * printed at all — she had to adapt a sheet that was already written for that child, at
   * his level, from his objectives. Principle IV says a modality is a rendering of a
   * document; there was one document with zero renderings.
   *
   * And the refusal said «todavía no está adaptado» for material that needed no
   * adaptation, which is the sentence that gave the defect away.
   */
  const found = await resolveDocument(vault, jobId, learnerCode);
  if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));
  const raw = (await vault.readRaw(found.path))!;

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

  /*
   * An essential figure with no description **no longer stops a printed sheet**
   * (decision P43, review COD-13). Deliberate loosening, and worth stating.
   *
   * The rule the corpus and `019` FR-1709 now both carry is «visual prints,
   * non-visual stops»: on paper the picture is *there*, so the exercise is
   * answerable and refusing to print it takes a usable sheet away for a
   * description that only a non-visual reader needs. Where it is genuinely
   * missing — audio, braille — the run stops, in `jobs/export.ts`.
   *
   * She is still told, on the review screen, beside the photocopy warnings: the
   * sheet is fine to hand out and the description is still worth writing.
   */
  const undescribed = checkEssentialFigures(doc);

  /*
   * Whose presentation, and whose facts to keep off the page (`021` T005).
   *
   * The resolver knows: an adaptation belongs to the learner whose directory it is in, a
   * composition to whoever it was composed for — and **a composition may name nobody**,
   * which is every job composed before `020`/`021`. Those render with the default
   * presentation rather than being refused, because refusing them would be this feature's
   * own limbo with a newer date on it.
   */
  // No narrowing needed: `of: 'none'` threw above, and an adaptation always has one.
  const who = found.learner;
  // Only axis LEVELS reach the renderer, never the profile object.
  const learner = who ? await loadLearner(vault, who) : null;
  const levels = learner
    ? Object.fromEntries(AXES.map((a) => [a, axisLevelOf(learner.profile, a)]))
    : {};

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

  /*
   * And what each source requires (review COD-08, decision P40). Which sources
   * apply is derived from the document; this is only what each one says about
   * itself, read from the publisher catalogue and from her set's own LICENSE.
   */
  const pictogramCredits = ids.length > 0 ? await pictogramCreditsFor() : undefined;

  const html = renderHTML(doc, {
    presentation: presentationFor(levels), signedOff,
    ...(pictogramImages ? { pictogramImages } : {}),
    ...(pictogramCredits ? { pictogramCredits } : {}),
  });

  /*
   * Everything about this learner that must not be on his sheet (011 T018, FR-910).
   *
   * The school is the one that matters most — `015` FR-1306 puts it in the never-sent
   * set beside the name, and a school plus a course plus a set of barriers identifies
   * a child far more sharply than a code does. The course and the stage are here for
   * the same reason: they are facts about him, and the sheet is for him.
   */
  const facts = [
    learner?.profile.school, learner?.profile.year, learner?.profile.stage,
  ].filter((f): f is string => typeof f === 'string' && f.trim() !== '');

  /*
   * The codes to look for, and **never an empty one**.
   *
   * Found by `e2e/composed.spec.ts` asking for a document with no learner: an empty
   * string is a substring of everything, so the check reported «el código "" aparece en el
   * material» and refused to render a perfectly good sheet. A guard that fires on
   * everything is a guard that gets switched off, so it is filtered here rather than
   * loosened there.
   */
  const codes = [who].filter((c): c is string => typeof c === 'string' && c.trim() !== '');

  const check = checkOutput(html, codes, [...(await knownNames()).values()], facts);
  if (!check.ok) throw new RampaError('render-learner-data', check.findings.join(' '), check.findings);

  return { html, photocopy: checkPhotocopy(html), undescribed };
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
export async function openAdaptedForEditing(
  jobId: string, learnerCode: string, vault: Vault = currentVault(),
): Promise<string> {
  const found = await resolveDocument(vault, jobId, learnerCode);
  if (found.of === 'none') throw new RampaError('vault-unreadable', whyNoDocument(found));
  const path = resolveInVault(vault.root, found.path);
  const problem = await shell.openPath(path);
  if (problem) throw new RampaError('vault-unreadable', problem);
  return path;
}
