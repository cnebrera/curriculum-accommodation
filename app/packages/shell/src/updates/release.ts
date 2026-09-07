import { logger } from '@rampa/core';
import { checkForUpdate } from '@rampa/providers';
import { destination, updateDestinations } from '../corpus/destinations.js';

/**
 * «¿Hay una versión más nueva?» — the application's own version (034 FR-3201).
 *
 * ## Off the Electron surface, taking the version as an argument
 *
 * It lived in `corpus/links.ts`, and the Electron-surface bound refused it there —
 * **eighth time** that bound has produced the better shape, and the seventh by the same
 * move: the one thing this needs from the framework is `app.getVersion()`, so the caller
 * says it and the reasoning lives somewhere a test can reach without a window.
 *
 * ## Two things start it, which is why it is a function
 *
 * Her press in «Acerca de», and the launch check she consented to. `034` T024 promised
 * «exactly one place a check can start from» and this was a handler body — which is how
 * the launch check ended up wired to nothing, and then briefly to the **wrong check**.
 */
/**
 * Is there a newer **application** version, and what does it change (FR-3201)?
 *
 * A function because two things start this check — her press in «Acerca de» and the
 * launch check she consented to — and `034` T024 promised «exactly one place a check can
 * start from». It was a handler body, which is how the launch check ended up wired to
 * nothing and then, an hour later, wired to the **wrong check**: I pointed it at the
 * corpus channel. The consent she gives sits next to «¿Hay una versión más nueva?» and
 * its words are «puedes mirarlo al abrir», so what runs at launch is this.
 *
 * The corpus channel has no launch check and wants none: FR-3206 makes an update
 * something she is **shown** before accepting, and there is nothing to show until she
 * asks. «Declining is stable and unnagged» is that channel's version of this promise.
 */
export async function appVersionCheck(current: string): Promise<{
  current: string; newer: boolean; page: string; problem?: string; latest?: string;
  summary?: string;
}> {
    /*
     * The endpoint comes from the **declared destinations** (`034` T007/T009), not from
     * a constant here. The disclosure screen and the code that connects read one list,
     * because two lists do not fail by the code reaching somewhere undeclared — they
     * fail by a third destination being added and the screen still saying two.
     */
    const declared = await destination('release-check');
    if (!declared) {
      logger.error('updates.no-release-destination', {});
      return { current: current, newer: false, page: '', problem: 'unreadable' };
    }
    const page = await destination('releases-page');
    const status = await checkForUpdate(current, { api: declared.url });
    return page ? { ...status, page: page.url } : status;
}
