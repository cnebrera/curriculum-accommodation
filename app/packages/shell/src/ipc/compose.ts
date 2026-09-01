import { type BrowserWindow } from 'electron';
import { jobAnswers, jobComposeReport, RampaError } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';
import { runCompose, type ComposeRequest } from '../jobs/compose.js';
import { refreshRecord } from './record.js';
import { materialKind } from '../corpus/index.js';

/**
 * Wiring, and only wiring (016 T003, `013` FR-1111).
 *
 * `runCompose` decides everything about how material is composed and imports no
 * `electron`; this file decides which channel names exist. The boundary test
 * counts the files that know they are inside Electron, and the price of leaving
 * the framework is exactly that number.
 *
 * ## Why composing does not adapt
 *
 * `job:compose` writes an ordinary `ir.md` and stops. The renderer then calls
 * `job:adapt` with the same job id, which is the existing channel doing the
 * existing thing — one composition, N presentations (Principle IV).
 *
 * Doing both in one handler would have been fewer round trips and would have taken
 * the decision point away from her. `002`'s composition report says what nothing
 * could check, and research R2 put that **before** the adaptation deliberately: it
 * is the moment she decides whether to keep spending.
 */
export function registerComposeIpc(getWindow: () => BrowserWindow | null): void {
  handle('job:compose', async (jobId: string, request: ComposeRequest) => {
    /*
     * The kind is **required and never defaulted** (`021` FR-1907, `012` FR-1001).
     *
     * The same refusal `job:create` makes for pasted material, for the same reason: a
     * defaulted «ficha» is how an exam gets treated as a worksheet, silently, before the
     * model sees it. Refused rather than coerced — a value that should not exist is a
     * signal, and rewriting it into something plausible hides the event worth seeing.
     */
    if (!request.kind || !(await materialKind(request.kind))) {
      throw new RampaError('material-kind-missing',
        'Dime qué quieres que prepare: una ficha, un examen, apuntes o problemas.');
    }
    const result = await runCompose(jobId, request,
      (p) => getWindow()?.webContents.send('job:progress', p));
    /*
     * T006 · the record follows the work (`014` FR-1215).
     *
     * A composed job that never reaches a learner's record is work she cannot find
     * again — and «esto lo hice el año pasado con este alumno» is the reason `014`
     * exists. Note the record derives its entry from `adapted.md`, so this call is
     * what makes the *material* discoverable while the adaptation is still pending.
     */
    await refreshRecord(request.learnerCode);
    return result;
  });

  /**
   * The key and the report, read back for the summary screen.
   *
   * Read from the vault rather than kept from the call, so the summary survives a
   * restart and so «open the folder and look» and «look in Rampa» cannot disagree.
   * `006`'s whole premise is that the vault is the truth.
   */
  handle('job:composeDocs', async (jobId: string) => {
    const vault = currentVault();
    const [answers, report] = await Promise.all([
      vault.readRaw(jobAnswers(jobId)),
      vault.readRaw(jobComposeReport(jobId)),
    ]);
    return { answers, report };
  });
}
