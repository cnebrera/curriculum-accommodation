import { ipcMain } from 'electron';
import {
  VAULT, loadJournal, writeIndex, houseStyleOverflowing, appendNote, loadLearner,
  saveProfile, buildPacket, packetToMarkdown, toShareable, planForget, executeForget,
  tombstone, listLearners, loadRoster, saveRoster, rosterNameRisk, generateCode, validateCode,
} from '@rampa/core';
import { currentVault } from './vault.js';

/**
 * Memory: the teacher routes every item (Principle VIII).
 *
 * Only she knows whether a correction is about this child, about how she works,
 * or about the recipe. There is no default and no inference here — routing a
 * learner-specific note into shared material is a privacy incident, not a
 * quality problem.
 */
export function registerMemoryIpc(): void {
  ipcMain.handle('memory:capture', async (_e, payload: {
    scope: 'learner' | 'practice' | 'corpus';
    learner?: string; recipes?: string[]; heading: string; text: string;
  }) => {
    const vault = currentVault();
    const stamp = new Date().toISOString().slice(0, 10);

    if (payload.scope === 'learner') {
      if (!payload.learner) throw new Error('Falta el alumno.');
      await appendNote(vault, payload.learner, payload.heading, payload.text);
      return { written: `profiles/${payload.learner}/notes.md` };
    }

    if (payload.scope === 'practice') {
      const existing = (await vault.readRaw(VAULT.house)) ?? '# Cómo trabajo yo\n';
      await vault.writeRaw(VAULT.house, `${existing.trimEnd()}\n\n- ${payload.text.trim()}\n`);
      return { written: VAULT.house, overflowing: houseStyleOverflowing(existing) };
    }

    // Corpus scope: pattern, never passage.
    const slug = payload.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const path = `${VAULT.journal}/${stamp}-${slug || 'nota'}.md`;
    await vault.writeRaw(path, [
      '---', `date: ${stamp}`, `recipes: [${(payload.recipes ?? []).join(', ')}]`,
      'scope: corpus', 'status: open', '---', '',
      `## Qué pasó`, '', payload.text.trim(), '',
    ].join('\n'));
    await writeIndex(vault, await loadJournal(vault));
    return { written: path };
  });

  ipcMain.handle('memory:index', async () => {
    const vault = currentVault();
    await writeIndex(vault, await loadJournal(vault));
    return (await vault.readRaw(VAULT.index)) ?? '';
  });

  ipcMain.handle('memory:house', async () => (await currentVault().readRaw(VAULT.house)) ?? '');

  ipcMain.handle('memory:handover', async (_e, code: string, year: string, summary: string, shareable: boolean) => {
    const learner = await loadLearner(currentVault(), code);
    const packet = buildPacket(learner, year, summary);
    return packetToMarkdown(shareable ? toShareable(packet) : packet);
  });

  /** Lists everything before removing anything (003 FR-215). */
  ipcMain.handle('memory:forgetPlan', async (_e, code: string) => planForget(currentVault(), code));

  ipcMain.handle('memory:forget', async (_e, code: string) => {
    const vault = currentVault();
    const plan = await planForget(vault, code);
    const result = await executeForget(vault, plan);
    const log = (await vault.readRaw('.rampa/erasures.md')) ?? '# Datos eliminados\n\n';
    await vault.writeRaw('.rampa/erasures.md', log + tombstone(code));
    return result;
  });

  ipcMain.handle('learners:list', async () => listLearners(currentVault()));
  ipcMain.handle('learners:roster', async () => loadRoster(currentVault()));
  ipcMain.handle('learners:saveRoster', async (_e, roster) => { await saveRoster(currentVault(), roster); return true; });
  ipcMain.handle('learners:load', async (_e, code: string) => loadLearner(currentVault(), code));
  ipcMain.handle('learners:save', async (_e, profile) => { await saveProfile(currentVault(), profile); return true; });
  ipcMain.handle('learners:newCode', async () => generateCode(await listLearners(currentVault())));
  ipcMain.handle('learners:validateCode', (_e, code: string) => validateCode(code));
  ipcMain.handle('learners:nameRisk', async () => rosterNameRisk((await loadRoster(currentVault())).roster));
}
