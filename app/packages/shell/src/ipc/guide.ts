import { type BrowserWindow } from 'electron';
import { refreshRecord } from './record.js';
import { handle } from './wrap.js';
import {
  readGuideJob, applyGuide, draftAcnsJob, askAboutGuide, helpWithAcs,
} from '../jobs/guide.js';
import type { Measure } from '@rampa/core';

/**
 * Wiring, and only wiring (017 T013, `013` FR-1111).
 *
 * ## Why there is no `guide:ingest`
 *
 * Because a guide comes in through **`job:ingest`**, unchanged, and through `008`'s
 * per-page verification gate (FR-1505/1506, T011). A second ingest path would be the
 * modality-specific pipeline Principle IV forbids — and the document where a
 * misreading matters most would be the one nobody had checked.
 *
 * So `guide:read` takes a job id that already exists and already passed the gate.
 */
export function registerGuideIpc(getWindow: () => BrowserWindow | null): void {
  handle('guide:read', async (jobId: string) =>
    readGuideJob(jobId, (p) => getWindow()?.webContents.send('job:progress', p)));

  /**
   * Write the measures **she confirmed** — not the ones that were read.
   *
   * She may have unticked one, and the version that lands is hers. That is the whole
   * point of the confirmation step, and passing the reading through here instead
   * would make the screen decorative.
   */
  handle('guide:apply', async (
    learnerCode: string, measures: Measure[], document: string, omitted?: string[],
  ) => {
    const result = await applyGuide({
      learnerCode, measures, document, ...(omitted ? { omitted } : {}),
    });
    await refreshRecord(learnerCode);
    return result;
  });

  handle('guide:acns', async (learnerCode: string) => draftAcnsJob(learnerCode));

  handle('guide:ask', async (
    jobId: string, question: string,
    history?: Array<{ question: string; answer: string }>,
  ) => askAboutGuide({ jobId, question, ...(history ? { history } : {}) }));

  handle('guide:acs', async (
    learnerCode: string, evaluationRecorded: boolean, decided: string,
  ) => helpWithAcs({ learnerCode, evaluationRecorded, decided }));
}
