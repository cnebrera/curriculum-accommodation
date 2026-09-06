import { join } from 'node:path';
import { logger, RampaError } from '@rampa/core';
import { corpusTransportFor, declareHosts, newestCorpusRelease } from '@rampa/providers';
import { handle } from '../ipc/wrap.js';
import { destination, updateDestinations } from '../corpus/destinations.js';
import { governingCorpus } from '../corpus/bundle.js';
import {
  fetchUpdate, acceptUpdate, declineUpdate, revertTo, readPointer, acceptedVersions,
  type OfferedUpdate,
} from '../corpus/updates.js';

/**
 * «Traer el criterio más nuevo» (034 US2/US3, FR-3205…3209).
 *
 * ## Two acts, and the second one is hers
 *
 * `corpus:updateLook` connects, brings the file list and the files, checks every hash,
 * scans them, and hands back **an offer**. Nothing governs. `corpus:updateAccept` is a
 * separate press, and it is one `rename` and a pointer.
 *
 * That split is not ceremony: the corpus is the judgement layer, and it changing under
 * her without her reading it is the thing this feature exists to prevent (FR-3206,
 * Principle I).
 *
 * ## The offer is held in memory, on purpose
 *
 * The staged files are on disk in `tmp-<runid>/`; **what is remembered between the two
 * presses is a pointer to them and nothing else**. Closing the application discards the
 * offer, which is the right default: an offer she left on the screen at half past four is
 * not a decision she made.
 */
let pending: OfferedUpdate | null = null;

export function registerCorpusUpdateIpc(storeDir: () => string): void {
  /** Where things stand: what governs, what she has, and what she has done. */
  handle('corpus:updateState', async () => {
    const governing = await governingCorpus();
    const store = storeDir();
    return {
      version: governing.version,
      source: governing.source,
      /** Set when something was passed over — incomplete, unsupported, superseded. */
      because: governing.because ?? null,
      accepted: await acceptedVersions(store),
      history: (await readPointer(store)).history,
      offered: pending
        ? {
            version: pending.manifest.version,
            summary: pending.manifest.summary,
            changed: pending.changed,
            conflicts: pending.conflicts,
            findings: pending.findings,
          }
        : null,
    };
  });

  /**
   * Look. Connects, and writes only into a staging directory it owns.
   *
   * The gate is her press: this handler is only ever reached from a button, and
   * `corpusTransportFor` refuses to mint a transport without one — there is no exported
   * transport, so a second caller cannot make a request by forgetting to ask.
   */
  handle('corpus:updateLook', async () => {
    const listing = await destination('corpus-manifest');
    const files = await destination('corpus-files');
    if (!listing || !files) {
      logger.error('corpus-update.no-destination', {});
      throw new RampaError('vault-unreadable',
        'No sé a dónde conectarme para buscar correcciones. Es un fallo mío, no tuyo.');
    }
    declareHosts((await updateDestinations()).map((d) => d.host));

    const governing = await governingCorpus();
    const transport = corpusTransportFor({ may: true });
    const release = await newestCorpusRelease({
      transport, listing: listing.url, filesBase: files.url,
      currentVersion: governing.version,
    }).catch(() => null);

    // Nothing newer, or no answer: both are «no hay nada que traer», and neither is an
    // error she has to do something about (FR-3202).
    if (!release) return { of: 'none' as const };

    const verdict = await fetchUpdate({
      transport, release, store: storeDir(), governingRoot: governing.root,
      localOverrides: await localRecipeIds(),
    });
    if (verdict.of === 'refused') return { of: 'refused' as const, say: verdict.say };
    if (verdict.of === 'none') return { of: 'none' as const };

    // A previous offer she never answered is discarded rather than left on disk.
    if (pending) await declineUpdate(pending);
    pending = verdict.update;
    return {
      of: 'offer' as const,
      version: pending.manifest.version,
      summary: pending.manifest.summary,
      changed: pending.changed,
      conflicts: pending.conflicts,
      findings: pending.findings,
    };
  });

  /** What one changed file says now, so «enseñármelo entero» is something she can do. */
  handle('corpus:updateFile', async (path: unknown) => {
    if (!pending || typeof path !== 'string') return null;
    if (!pending.manifest.files.some((f) => f.path === path)) return null;
    const { readFile } = await import('node:fs/promises');
    const next = await readFile(join(pending.staging, path), 'utf8').catch(() => null);
    const governing = await governingCorpus();
    const now = await readFile(join(governing.root, path), 'utf8').catch(() => null);
    return { path, now, next };
  });

  handle('corpus:updateAccept', async () => {
    if (!pending) return { ok: false as const };
    const done = await acceptUpdate({
      store: storeDir(), update: pending, on: new Date().toISOString().slice(0, 10),
    });
    pending = null;
    logger.info('corpus-update.accepted', { version: done.version });
    return { ok: true as const, version: done.version };
  });

  /** Declining is stable and unnagged: the staging goes and nothing was recorded. */
  handle('corpus:updateDecline', async () => {
    if (pending) await declineUpdate(pending);
    pending = null;
    return { ok: true as const };
  });

  /** Going back is as first-class as updating, and keeps every version she accepted. */
  handle('corpus:updateRevert', async (version: unknown) => {
    const to = typeof version === 'number' ? version : null;
    await revertTo({ store: storeDir(), version: to, on: new Date().toISOString().slice(0, 10) });
    return { ok: true as const };
  });
}

/**
 * Her own recipes, by id, so the offer can name which of them an update touches.
 *
 * `006` FR-415: `recipes-local/` loads after the corpus and wins by id. So «keep mine» is
 * not a merge that has to be implemented — it is what happens when nothing is done, which
 * is why it is the default and why it is free (FR-3209).
 */
async function localRecipeIds(): Promise<string[]> {
  const { loadLocalOverrides } = await import('../corpus/recipes.js');
  /*
   * Through `loadLocalOverrides` rather than by listing filenames: a recipe's id is
   * inside the file, not in its name, so `mi-receta.md` can declare `one-task-per-page`
   * — and it is the **id** that decides what her copy shadows.
   */
  try { return (await loadLocalOverrides()).map((r) => r.id); } catch { return []; }
}
