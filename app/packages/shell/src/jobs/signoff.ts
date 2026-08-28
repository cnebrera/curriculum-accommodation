import { ipcMain } from 'electron';
import { jobDir } from '@rampa/core';
import { currentVault } from '../ipc/vault.js';

/**
 * The ONLY way the draft mark comes off (007 FR-509).
 *
 * Not a rule the model is asked to follow — an operation it cannot reach. No
 * other IPC call clears it, and no model output can produce a document without
 * it, because the renderer only omits the banner when this has run.
 */
export function registerSignoffIpc(): void {
  ipcMain.handle('job:signOff', async (_e, jobId: string, role: string) => {
    const vault = currentVault();
    const path = `${jobDir(jobId)}/adapted.md`;
    const raw = (await vault.readRaw(path)) ?? '';
    const stamp = new Date().toISOString().slice(0, 10);
    const block = `review:\n  signed_off: true\n  by: "${role.replace(/"/g, '')}"\n  date: ${stamp}\n`;
    const updated = /^---\r?\n/.test(raw)
      ? raw.replace(/^---\r?\n/, `---\n${block}`)
      : `---\n${block}---\n\n${raw}`;
    await vault.writeRaw(path, updated);
    return { signedOff: true, date: stamp };
  });

  ipcMain.handle('job:isSignedOff', async (_e, jobId: string) => {
    const raw = (await currentVault().readRaw(`${jobDir(jobId)}/adapted.md`)) ?? '';
    return /signed_off:\s*true/.test(raw);
  });
}
