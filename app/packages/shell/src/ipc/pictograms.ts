import { app, type BrowserWindow, dialog } from 'electron';
import { basename } from 'node:path';
import { readSet } from '@rampa/core';
import {
  publisherState, acceptLicence, withdrawLicence, bringPictograms, configureSet,
  setState, checkUpdate, declineUpdate, candidatesFor, chooseWord, unchooseWord,
  stopBringing,
} from '../pictograms/bring.js';
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
 * ## What this file does, and the line it holds (023)
 *
 * It **fetches, at her request, after she has accepted the licence** — and it never
 * bundles or redistributes. `018` FR-1601 forbade both and `023` FR-2101 narrows it
 * to the half that is actually true: shipping CC BY-NC-SA files inside an Apache-2.0
 * application would hand every downstream user a restriction our licence says they do
 * not have. A copy travelling from ARASAAC's server to her disk on her instruction is
 * what every browser ever written does.
 *
 * The same shape as the API key (`009`): the relationship with the third party is
 * hers, Rampa is the thing that uses it, and we never stand between her and terms
 * she should read.
 *
 * ## The claim that used to be here and was wrong
 *
 * «A worksheet with a pictogram embedded is a derivative work, so **her** sheet
 * becomes BY-NC-SA.» It is not. Under CC BY-NC-SA 4.0 §3(b) ShareAlike attaches to
 * **Adapted Material** — a modified pictogram — and a worksheet that includes one
 * unmodified is a collection. Corrected on screen under backlog G28 and left standing
 * in the code until now.
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

  /** Who they can come from, and whether she has accepted (FR-2104/2105). */
  handle('pictograms:publishers', () => publisherState());

  /** **The gate.** Nothing is fetched until this is recorded (FR-2104). */
  handle('pictograms:acceptLicence', (publisherId: string) => acceptLicence(publisherId));

  /** Stops further fetching, deletes nothing already hers (FR-2106). */
  handle('pictograms:withdrawLicence', () => withdrawLicence());

  /**
   * What she has, answered **from disk** (`024` FR-2209/2210).
   *
   * Opening the screen a hundred times reaches nobody. «Que no me lo vuelva a
   * preguntar» is a requirement about silence, and silence means no request.
   */
  handle('pictograms:state', () => setState());

  /** **The button.** No word list (`024` FR-2201). Guards in `bringPictograms`. */
  handle('pictograms:fetch', (args: { language?: string } = {}) =>
    bringPictograms({
      ...args,
      /*
       * `done` and `total` as numbers, not only inside `detail`. They used to be a
       * sentence, and `PictogramSetSection` never listened — 2 min 45 s of
       * «Trayéndolos…» and no bar. Carlos asked for one, which is how the thirteenth
       * unread field was found.
       */
      onProgress: (p) => getWindow()?.webContents.send('job:progress', p),
    }));

  /** She pressed «Parar» (`024` FR-2118). Stopping is not a failure. */
  handle('pictograms:stop', () => stopBringing());

  /** One request, and only because she asked (`024` FR-2211). */
  handle('pictograms:checkUpdate', () => checkUpdate());

  /** She said no. Not offered again until the index moves further (FR-2212). */
  handle('pictograms:declineUpdate', (highWater: string) => declineUpdate(highWater));

  /** She picks a folder — still, and on purpose (FR-2103). */
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
    await configureSet(root, reading);
    return { ok: true, summary: reading.summary, problems: reading.problems };
  });

  /**
   * The words her set cannot decide, with their pictures (`024` FR-2217).
   *
   * An id is not something a person can choose between, so this returns `data:` URIs.
   */
  handle('pictograms:candidates', (args: { words: string[]; language?: string }) =>
    candidatesFor(args));

  /**
   * She picks one. Once, for every learner (`024` FR-2214).
   *
   * `chooseWord` and not `choose`: `pictograms:choose` is the **folder picker**, and
   * registering this as `choose` threw «Attempted to register a second handler» and
   * took the whole application down at startup. Found by the e2e, because a channel
   * name is a string and no compiler was ever going to see it — hence
   * `ipc-channels.test.ts`, added the same minute.
   */
  handle('pictograms:chooseWord',
    (args: { word: string; id: string; language?: string }) => chooseWord(args));

  handle('pictograms:unchooseWord', (args: { word: string; language?: string }) =>
    unchooseWord(args));

  /** Ids → `data:` URIs. The logic is `loadImages`; this supplies the disk. */
  handle('pictograms:images', async (ids: string[]) =>
    Object.fromEntries(await pictogramImagesFor(ids)));
}
