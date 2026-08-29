import { jobAdapted } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { handle } from '../ipc/wrap.js';

/**
 * The ONLY way the draft mark comes off (007 FR-509).
 *
 * Not a rule the model is asked to follow — an operation it cannot reach. No
 * other IPC call clears it, and no model output can produce a document without
 * it.
 *
 * That last clause used to read "because the renderer only omits the banner when
 * this has run", and it was **false**: `job:render` accepted `signedOff` as a
 * parameter, so the banner could be omitted with no sign-off at all. The print
 * path now derives it from the document via `isSignedOff()`, which is what makes
 * the sentence above true. Found by `007`'s audit — the comment had been there,
 * unchallenged, since the handler was written.
 *
 * Sign-off is per (job × learner): approving Hugo's sheet says nothing about
 * Vega's, even when both came from the same worksheet (T092b).
 */
export function registerSignoffIpc(): void {
  handle('job:signOff', async (jobId: string, learnerCode: string, role: string) => {
    const vault = currentVault();
    const path = jobAdapted(jobId, learnerCode);
    const raw = (await vault.readRaw(path)) ?? '';
    const stamp = new Date().toISOString().slice(0, 10);
    // Quoted, for the same reason the journal's is: unquoted, YAML hands back a
    // `Date`, and the next thing to validate this block would drop it.
    const block = `review:\n  signed_off: true\n  by: "${role.replace(/"/g, '')}"\n  date: "${stamp}"\n`;
    const updated = /^---\r?\n/.test(raw)
      ? raw.replace(/^---\r?\n/, `---\n${block}`)
      : `---\n${block}---\n\n${raw}`;
    await vault.writeRaw(path, updated);
    return { signedOff: true, date: stamp };
  });

  handle('job:isSignedOff', async (jobId: string, learnerCode: string) => {
    const raw = (await currentVault().readRaw(jobAdapted(jobId, learnerCode))) ?? '';
    return /signed_off:\s*true/.test(raw);
  });
}
