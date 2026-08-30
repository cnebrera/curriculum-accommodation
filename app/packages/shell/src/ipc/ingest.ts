import { dialog, app, type BrowserWindow } from 'electron';
import { basename } from 'node:path';
import {
  jobIR, parseIR, formatCost, isUnusuallyExpensive, resolveInVault, irToMarkdown, VAULT,
} from '@rampa/core';
import { currentVault } from './vault.js';
import { estimateCents, currentLedger } from './cost.js';
import { handle } from './wrap.js';
import { photoWarningSeen, acknowledgePhotoWarning } from './vault-settings.js';
import { runIngest, budget, readExtraction, setPageVerified } from '../jobs/ingest.js';

/**
 * Wiring for reading a photograph, a PDF or a Word file (013 T019, FR-1111).
 *
 * Splitting here removed `electron` from `jobs/ingest.ts` entirely. The file
 * picker, the progress send and the `userData` path were its only three uses,
 * and all three are wiring — so 410 lines that know how to read a page now know
 * nothing about the window they were asked from, and the boundary test can say
 * so rather than assume it.
 */
export function registerIngestIpc(getWindow: () => BrowserWindow | null): void {
  handle('ingest:accepted', async () => {
    const { ACCEPTED_EXTENSIONS, ACCEPTED_DESCRIPTION } = await import('../ingest/read.js');
    return { extensions: ACCEPTED_EXTENSIONS, description: ACCEPTED_DESCRIPTION };
  });

  /**
   * Choose the files, in the main process.
   *
   * The renderer never sees or composes a path: it asks for a dialog and gets
   * back what the operating system says she picked. That keeps the vault's rule —
   * a path from content is rejected, not sanitised — true for this input too,
   * and it is why `ingest:run` takes paths this handler produced rather than
   * strings the renderer assembled.
   */
  handle('ingest:choose', async () => {
    const win = getWindow();
    if (!win) return [];
    const { ACCEPTED_EXTENSIONS } = await import('../ingest/read.js');
    const result = await dialog.showOpenDialog(win, {
      title: 'Elige la ficha',
      properties: ['openFile', 'multiSelections'],
      filters: [{
        name: 'Fichas',
        extensions: ACCEPTED_EXTENSIONS.map((e) => e.replace('.', '')),
      }],
    });
    return result.canceled ? [] : result.filePaths;
  });

  handle('ingest:run', async (jobId: string, paths: string[]) =>
    runIngest(jobId, paths, (p) => getWindow()?.webContents.send('ingest:progress', p)));

  handle('ingest:extraction', async (jobId: string) => readExtraction(jobId));

  /**
   * Extractions she started and has not finished confirming.
   *
   * `006`'s premise is that she will be interrupted — that is why onboarding is
   * resumable — and an extraction is the longest thing in the application that
   * needs her attention. Without this, a job she read on Tuesday and did not
   * finish confirming was unreachable: the verification screen could only be
   * opened by the ingest that produced it, so closing the window lost the work
   * and the money it cost.
   *
   * Found by writing the accessibility test for that screen and discovering
   * there was no way to reach it.
   */
  handle('ingest:pending', async () => {
    const vault = currentVault();
    const jobs = await vault.list(VAULT.material);
    const pending: Array<{ jobId: string; pages: number; confirmed: number; source: string }> = [];
    for (const jobId of jobs) {
      const record = await readExtraction(jobId);
      if (!record || record.verified) continue;
      pending.push({
        jobId,
        pages: record.pages.length,
        confirmed: record.pages.filter((p) => p.verified).length,
        source: record.source,
      });
    }
    // Most recent first: job ids carry their timestamp.
    return pending.sort((a, b) => b.jobId.localeCompare(a.jobId));
  });

  /** One page, confirmed by her. The only thing that can move the gate. */
  handle('ingest:confirmPage', async (jobId: string, page: number) =>
    setPageVerified(jobId, page, true));

  handle('ingest:unconfirmPage', async (jobId: string, page: number) =>
    setPageVerified(jobId, page, false));

  handle('ingest:budget', async () => budget());

  /**
   * What this ingest will probably cost, before it runs (T016, 006 US4).
   *
   * An image is priced by tile count, so cost here scales with page count rather
   * than with prompt length — which is why this cannot reuse `estimateCents`,
   * whose whole model is characters. The figure is deliberately crude: it exists
   * to decide whether to *ask her*, not to bill anyone.
   *
   * A teacher who drops a 20-page PDF and is charged twenty times her usual
   * worksheet without being asked has been ambushed by her own tool.
   */
  handle('ingest:estimate', async (pageCount: number) => {
    const limits = await budget();
    const pages = Math.min(Math.max(0, Math.round(pageCount)), limits.pagesPerJob);
    // ~1.1k tokens for a downscaled A4 page at the corpus bound, plus the corpus
    // prompt, plus a page of structured output.
    const perPage = estimateCents(4400) + 1;
    const cents = pages * perPage;
    return {
      pages,
      cents,
      formatted: formatCost(cents),
      unusual: isUnusuallyExpensive(cents, await currentLedger()),
    };
  });

  /**
   * The page image, as a data URI.
   *
   * Read through the vault so `resolveInVault` applies: the renderer sends a job
   * id and a page number, never a path, so this cannot be turned into a
   * read-any-file handler.
   */
  handle('ingest:pageImage', async (jobId: string, page: number) => {
    const record = await readExtraction(jobId);
    const entry = record?.pages.find((p) => p.page === page);
    if (!entry?.image) return null;
    const bytes = await currentVault().readBinary(entry.image);
    if (!bytes) return null;
    const ext = entry.image.split('.').pop()?.toLowerCase() ?? '';
    const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;
  });

  /** The extracted blocks, for the side-by-side comparison. */
  handle('ingest:blocks', async (jobId: string) => {
    const raw = await currentVault().readRaw(jobIR(jobId));
    if (!raw) return [];
    return parseIR(raw).blocks.map((b) => ({
      id: b.id,
      page: Number(b.attrs['data-page'] ?? 1),
      content: b.content,
      number: b.attrs['data-number'],
      notices: b.notices,
    }));
  });

  /**
   * Her corrections, then the confirmation — in that order and in one call
   * (T020).
   *
   * One call because two would let a confirmation land without the correction it
   * was based on: she edits, clicks confirm, the edit request fails, and the page
   * is marked verified with the model's text. The correction is hers
   * (Principle VIII), so it is written as the block content and the block records
   * that a human wrote it.
   */
  handle('ingest:correctAndConfirm', async (
    jobId: string, page: number, corrections: Array<{ id: string; content: string }>,
  ) => {
    const vault = currentVault();
    if (corrections.length) {
      const raw = await vault.readRaw(jobIR(jobId));
      if (raw) {
        const doc = parseIR(raw);
        for (const c of corrections) {
          const block = doc.blocks.find((b) => b.id === c.id);
          if (!block) continue;
          block.content = c.content;
          // Traceability: this text is hers, and a later stage must not attribute
          // it to the extraction.
          block.attrs['data-corrected-by'] = 'teacher';
          // The unreadable notice is resolved by her writing the words in.
          block.notices = block.notices.filter((n) => n.kind !== 'unreadable');
        }
        await vault.writeRaw(jobIR(jobId), irToMarkdown(doc));
      }
    }
    return setPageVerified(jobId, page, true);
  });

  /** FR-609. Once per machine, outside the vault. */
  handle('ingest:photoWarningSeen', async () => photoWarningSeen(app.getPath('userData')));
  handle('ingest:acknowledgePhotoWarning', async () => {
    await acknowledgePhotoWarning(app.getPath('userData'));
    return true;
  });
}
