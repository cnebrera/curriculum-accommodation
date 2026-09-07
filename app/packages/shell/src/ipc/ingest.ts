import { app, type BrowserWindow } from 'electron';
import { basename } from 'node:path';
import {
  jobIR, parseIR, parseFrontMatter, startedFor, formatCost, isUnusuallyExpensive,
  resolveInVault, irToMarkdown, VAULT, type Vault,
} from '@rampa/core';
import { currentVault } from './vault.js';
import { estimateCents, currentLedger } from './cost.js';
import { handle } from './wrap.js';
import { pickFiles } from './pick.js';
import { activeProvider } from './keys.js';
import { photoWarningSeen, acknowledgePhotoWarning } from './vault-settings.js';
import { runIngest, budget, readExtraction, setPageVerified, pendingIngests,
         claimIngest } from '../jobs/ingest.js';

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
   *
   * The dialog itself moved to `ipc/pick.ts` in `029`, which needed the same fifteen
   * lines for a normativa file. Two callers, one dialog: a rule with two
   * implementations is a rule with one place to forget it.
   */
  handle('ingest:choose', async () => {
    const { ACCEPTED_EXTENSIONS } = await import('../ingest/read.js');
    return pickFiles({
      title: 'Elige la ficha', filterName: 'Fichas', many: true,
      extensions: ACCEPTED_EXTENSIONS.map((e) => e.replace('.', '')),
    });
  });

  handle('ingest:run', async (jobId: string, paths: string[], forLearner?: string) =>
    runIngest(jobId, paths,
      (p) => getWindow()?.webContents.send('ingest:progress', p), forLearner));

  handle('ingest:extraction', async (jobId: string) => readExtraction(jobId));

  /**
   * Whose this half-finished job is, said by her (`020` T027, FR-1827).
   *
   * Every job in every vault that exists today is unowned — `for_learner` started being
   * written in `020` T006 — so this is not a migration path for an edge case, it is how
   * her current work becomes reachable at all.
   *
   * It **only fills a blank**. A job already stamped for one child is not re-pointed at
   * another from here: that would be a way to move a reading between learners, which is
   * not a question this screen is asking, and the answer would silently move whatever
   * has already been adapted under the first one.
   */
  handle('ingest:claim', async (jobId: string, learner: string) =>
    claimIngest(currentVault(), jobId, learner));

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
  handle('ingest:pending', async () => pendingIngests(currentVault()));

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
    //
    // `null` when her service's model has no published price (2026-09-01): the screen
    // then warns about the *pages*, which it knows, and says nothing about the money,
    // which it does not. Better than the euros it used to quote from Anthropic's list
    // whichever service she had connected.
    const active = await activeProvider();
    const perPage = active ? estimateCents(4400, active.provider.defaultModel) : null;
    const cents = perPage === null ? null : pages * (perPage + 1);
    return {
      pages,
      cents,
      formatted: cents === null ? null : formatCost(cents),
      unusual: cents === null ? false : isUnusuallyExpensive(cents, await currentLedger()),
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
