import { handle } from '../ipc/wrap.js';
import { loadSettings, saveSettings } from '../ipc/vault-settings.js';

/**
 * What she has dismissed, and whether she lets Rampa look (034 T011/T013, FR-3203).
 *
 * ## Off the Electron surface, like everything that only needs one path
 *
 * The settings directory is **injected once at startup**. `boundary.test.ts` refused
 * these four handlers inside `corpus/links.ts` — which is right twice over: `links.ts`
 * is «the handlers that leave the machine» and none of these do, and the bound is what
 * turned that into a move rather than an opinion. Fourth time this bound has produced
 * the better shape (`018`, `035`, `034` T006, and now this).
 *
 * ## Dismissed means dismissed, for that version
 *
 * The notice returns only for something **newer**. That is the difference between a
 * notice and a nag, and a nag in this application is worse than in most: the thing being
 * announced is a fix she may need, so a teacher who has learned to click past the update
 * banner is a teacher who will click past the one that matters.
 *
 * ## And the launch check is off until she says otherwise
 *
 * A version check is a phone-home. `releases.ts` says `checkedAutomatically` «does not
 * exist and must not be added» — the status of a check is not where a permission lives —
 * so the permission is here, absent by default, and the screen that offers it says what
 * leaves the machine before she turns it on.
 */
export function registerNoticeIpc(settingsDir: () => string): void {
  handle('updates:dismissed', async () =>
    (await loadSettings(settingsDir())).dismissedRelease ?? null);

  handle('updates:dismiss', async (version: unknown) => {
    if (typeof version !== 'string' || version.trim() === '') return false;
    const dir = settingsDir();
    await saveSettings(dir, {
      ...(await loadSettings(dir)), dismissedRelease: version.trim(),
    });
    return true;
  });

  handle('updates:consent', async () =>
    (await loadSettings(settingsDir())).checkAtLaunch === true);

  handle('updates:setConsent', async (on: unknown) => {
    const dir = settingsDir();
    await saveSettings(dir, { ...(await loadSettings(dir)), checkAtLaunch: on === true });
    return on === true;
  });
}
