import { type BrowserWindow } from 'electron';
import { refreshRecord } from './record.js';
import { handle } from './wrap.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  readGuideJob, applyGuide, draftAcnsJob, askAboutGuide, helpWithAcs,
  saveAcnsDraft, readAcns, signOffAcns,
} from '../jobs/guide.js';
import { currentVault } from './vault.js';
import { renderPdf } from '../jobs/print.js';
import { learnerAcnsPdf, renderAcnsHTML, resolveInVault, RampaError,
         type Measure } from '@rampa/core';

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
    kind?: 'acns' | 'acs',
  ) => {
    const result = await applyGuide({
      learnerCode, measures, document,
      ...(omitted ? { omitted } : {}),
      ...(kind ? { kind } : {}),
    });
    await refreshRecord(learnerCode);
    return result;
  });

  /**
   * The draft, on screen only. Kept because it writes nothing.
   *
   * `020`'s screen shows the gaps and the sources before she decides to keep it, and a
   * preview that saved would put a document in her vault for having looked.
   */
  /*
   * `subject` since `032` (FR-3004): an ACNS is per área in the regulation, and the
   * curricular level she has recorded for Matemáticas is not the one for Lengua.
   * Optional — without it the draft uses the general value and says that it did.
   */
  handle('guide:acns', async (learnerCode: string, subject?: string) =>
    draftAcnsJob(learnerCode, subject));

  /** The same draft, as a document in the vault (FR-1516, P46). */
  handle('guide:acnsSave', async (learnerCode: string) => saveAcnsDraft(learnerCode));

  handle('guide:acnsRead', async (learnerCode: string) => readAcns(learnerCode));

  /**
   * The rendered page — the mark comes from the document, and there is no parameter
   * for it. See `renderAcnsHTML`: a `signedOff` argument is exactly how an unmarked
   * sheet was once producible with no sign-off at all.
   */
  handle('guide:acnsHtml', async (learnerCode: string) => {
    const found = await readAcns(learnerCode);
    if (!found) {
      throw new RampaError('vault-unreadable',
        'Todavía no hay ACNS guardada para este alumno. Haz el borrador primero.');
    }
    return renderAcnsHTML(found.markdown);
  });

  handle('guide:acnsPdf', async (learnerCode: string) => {
    const vault = currentVault();
    const found = await readAcns(learnerCode);
    if (!found) {
      throw new RampaError('vault-unreadable',
        'Todavía no hay ACNS guardada para este alumno. Haz el borrador primero.');
    }
    const pdf = await renderPdf(renderAcnsHTML(found.markdown));
    const path = resolveInVault(vault.root, learnerAcnsPdf(learnerCode));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, pdf);
    return path;
  });

  /**
   * The signature (FR-1516). One document, one signature, and the role recorded —
   * an ACNS is coordinated by the tutor, and who signed it is part of the document.
   */
  handle('guide:acnsSignOff', async (learnerCode: string, role: string) =>
    signOffAcns(learnerCode, role));

  handle('guide:ask', async (
    jobId: string, question: string,
    history?: Array<{ question: string; answer: string }>,
  ) => askAboutGuide({ jobId, question, ...(history ? { history } : {}) }));

  handle('guide:acs', async (
    learnerCode: string, evaluationRecorded: boolean, decided: string,
  ) => helpWithAcs({ learnerCode, evaluationRecorded, decided }));
}
