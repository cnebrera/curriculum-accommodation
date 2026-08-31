import { app, type BrowserWindow, dialog } from 'electron';
import { basename } from 'node:path';
import { readSet, pictogramVaultNote } from '@rampa/core';
import { handle } from './wrap.js';
import { currentVault } from './vault.js';
import { loadSettings, saveSettings } from './vault-settings.js';
import {
  usePictogramSettingsDir, pictogramSettingsDir, configuredRoot, fsReader,
  pictogramImagesFor,
} from '../pictograms/access.js';

/**
 * Her pictogram set (018 T014-T016).
 *
 * ## What this file does not do
 *
 * **It does not fetch anything.** There is no download, no mirror, no "get it for
 * me" behind a confirmation. ARASAAC's pictograms are CC BY-NC-SA and Rampa is
 * Apache-2.0: bundling or distributing them would hand every downstream user a
 * restriction the licence says they do not have, and a worksheet with one embedded
 * is a derivative work — so **her** sheet would become BY-NC-SA, a condition she did
 * not choose and we imposed silently.
 *
 * The same shape as the API key (`009`): the relationship with the third party is
 * hers, Rampa is the thing that uses it, and we never stand between her and terms
 * she should read.
 *
 * ## Why the reading happens here
 *
 * `readSet` in `core` takes a reader, because `core` is side-effect-free and the
 * isolation suite walks every file in it. The reader and the set access live in
 * `../pictograms/access.ts`, which needs a directory and a filesystem and **not** a
 * window — the boundary test refused this file's growth twice, and splitting was the
 * right answer both times. What is left here is the folder dialog and five handlers.
 */

export function registerPictogramIpc(getWindow: () => BrowserWindow | null): void {
  /*
   * The one Electron fact this whole feature needs, handed to the module that does
   * the reading — which is what keeps that module off the boundary list.
   */
  usePictogramSettingsDir(app.getPath('userData'));

  /**
   * Where the set is, or `null`.
   *
   * Checked against the disk on every read, so a set she moved or deleted is
   * reported rather than remembered — the same fail-safe `rememberedVaultRoot`
   * applies to the vault (FR-1616's other half).
   */
  handle('pictograms:current', async () => {
    const s = await loadSettings(pictogramSettingsDir());
    if (!s.pictogramSet) return null;
    const found = await configuredRoot();
    return { ...s.pictogramSet, missing: found?.missing ?? true };
  });

  /** She picks a folder. **No download button exists** (FR-1601). */
  handle('pictograms:choose', async () => {
    const win = getWindow();
    const result = await (win
      ? dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : dialog.showOpenDialog({ properties: ['openDirectory'] }));
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  /** Read a folder and say what is in it, without configuring anything yet. */
  handle('pictograms:inspect', async (root: string) => {
    const reading = await readSet(root, fsReader);
    return {
      ok: reading.set !== null,
      summary: reading.summary,
      problems: reading.problems,
      languages: reading.set ? [...reading.set.byLanguage.keys()] : [],
      licence: reading.set?.licence ?? null,
      folder: basename(root),
    };
  });

  /**
   * Configure it, and record in the vault that a set is in use.
   *
   * The **path** stays in application settings because it is machine-specific; the
   * **licence** goes in the vault, because a colleague who opens the folder needs
   * to know what is required of them (US1 scenario 3). Neither is the set itself:
   * nothing here copies or indexes somebody else's licensed content.
   */
  handle('pictograms:use', async (root: string) => {
    const reading = await readSet(root, fsReader);
    if (!reading.set) return { ok: false, problems: reading.problems };

    const dir = pictogramSettingsDir();
    const settings = await loadSettings(dir);
    const configuredOn = new Date().toISOString().slice(0, 10);
    await saveSettings(dir, {
      ...settings,
      pictogramSet: {
        root,
        ...(reading.set.licence ? { licence: reading.set.licence } : {}),
        summary: reading.summary,
        configuredOn,
      },
    });

    await currentVault().writeRaw('pictogramas.md', pictogramVaultNote({
      folder: basename(root),
      summary: reading.summary,
      licence: reading.set.licence,
      configuredOn,
    }));

    return { ok: true, summary: reading.summary, problems: reading.problems };
  });

  /** Ids → `data:` URIs. The logic is `loadImages`; this supplies the disk. */
  handle('pictograms:images', async (ids: string[]) =>
    Object.fromEntries(await pictogramImagesFor(ids)));
}
