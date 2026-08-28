import { jobAdapted } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { handle } from '../ipc/wrap.js';

/**
 * The ONLY way the draft mark comes off (007 FR-509).
 *
 * Not a rule the model is asked to follow — an operation it cannot reach. No
 * other IPC call clears it, and no model output can produce a document without
 * it, because the renderer only omits the banner when this has run.
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
    const block = `review:\n  signed_off: true\n  by: "${role.replace(/"/g, '')}"\n  date: ${stamp}\n`;
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
