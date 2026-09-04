import { readdir, readFile, stat } from 'node:fs/promises';
import {
  readSet, loadImages, parsePictogramFetchCorpus,
  type SetReader, type ImageReader, type PictogramSet, type Attribution,
} from '@rampa/core';
import { loadSettings } from '../ipc/vault-settings.js';
import { loadInstruction } from '../corpus/index.js';

/**
 * Reading her pictogram set, with **no knowledge of Electron** (018).
 *
 * Split out of `ipc/pictograms.ts` when the boundary test refused the growth for
 * the second time in one day — and refusing was right. Two of the three things in
 * that file needed a window (a folder dialog); this third one needs a directory
 * path and a filesystem, and `jobs/adapt.ts` and `jobs/print.ts` both want it.
 *
 * The settings directory is **injected once at startup** rather than read from
 * `app.getPath` here, which is the whole reason this file can exist outside the
 * Electron surface.
 */

let settingsDir = '';

/** Called once by `registerPictogramIpc`. */
export const usePictogramSettingsDir = (dir: string): void => { settingsDir = dir; };

/** The real filesystem, read-only by construction. */
export const fsReader: SetReader = {
  list: async (dir) => {
    try { return await readdir(dir); } catch { return []; }
  },
  readText: async (path) => {
    try { return await readFile(path, 'utf8'); } catch { return null; }
  },
};

/** Bytes, for `loadImages`. Only from the folder she chose. */
export const imageReader: ImageReader = {
  list: fsReader.list,
  readBytes: async (path) => {
    try { return await readFile(path); } catch { return null; }
  },
};

export const pictogramSettingsDir = (): string => settingsDir;

/** Where she put it, and whether it is still there. */
export async function configuredRoot(): Promise<{ root: string; missing: boolean } | null> {
  const s = await loadSettings(settingsDir);
  const root = s.pictogramSet?.root;
  if (!root) return null;
  try {
    return { root, missing: !(await stat(root)).isDirectory() };
  } catch {
    return { root, missing: true };
  }
}

/**
 * The configured set, read fresh, or `null`.
 *
 * `null` covers «no set configured» and «the folder is gone» with one value, and
 * the caller treats both the same way: her decision stands and the sheet says the
 * pictograms are missing. A moved folder is not an error state to recover from — it
 * is Tuesday.
 */
export async function currentPictogramSet(): Promise<PictogramSet | null> {
  const found = await configuredRoot();
  if (!found || found.missing) return null;
  const { set } = await readSet(found.root, fsReader);
  return set;
}

/**
 * Ids → `data:` URIs, for the render path as well as for the renderer.
 *
 * One implementation rather than two: `jobs/print.ts` needs exactly this, and two
 * copies of «where her set is and how an id becomes bytes» is the
 * two-copies-of-one-truth defect this project keeps finding.
 *
 * Returns an **empty map** when no set is configured. Not a throw: a document that
 * asks for pictograms she no longer has still has to print (FR-1616).
 */
export async function pictogramImagesFor(ids: readonly string[]): Promise<Map<string, string>> {
  const found = await configuredRoot();
  if (!found || found.missing) return new Map();
  return loadImages(found.root, ids, imageReader, (bytes) => Buffer.from(bytes).toString('base64'));
}


/**
 * What each pictogram source says about itself (review COD-08, decision P40).
 *
 * ## The defect this replaced
 *
 * `attributionFor(doc, attribution = ARASAAC_ATTRIBUTION)` accepted an alternative
 * credit and **both call sites called it with no second argument**, so the
 * parameter was dead and the constant was the only thing that ever printed. A
 * teacher with a set that is not ARASAAC's — the case `018` FR-1604 exists to
 * support, a folder she assembled with its own LICENSE, which `readSet` reads and
 * shows her and never passed to the render — printed «Autor pictogramas: Sergio
 * Palao · Origen: ARASAAC · Licencia: CC BY-NC-SA» on every sheet. A **false**
 * attribution, which is legally worse than a missing one.
 *
 * ## Where the words come from
 *
 * Two places, neither of them code. The publisher catalogue in
 * `instructions/pictograms.md` carries `attribution.author`, `attribution.owner`,
 * `attribution.source` and `licence` per publisher — `023` already required them,
 * and refuses a publisher that omits them. And the set she assembled herself is
 * keyed as `''`, «the configured one», which is what a pictogram recorded before
 * publishers existed resolves to.
 *
 * A set with a LICENSE file and no catalogue entry gets the honest line rather
 * than a guess: `attributionFor` names the source it cannot describe. That branch
 * is the one the old code could not have.
 */
export async function pictogramCredits(): Promise<Map<string, Attribution>> {
  const credits = new Map<string, Attribution>();

  try {
    const corpus = parsePictogramFetchCorpus(await loadInstruction('pictograms'));
    for (const p of corpus.publishers) {
      credits.set(p.id, {
        author: p.attribution.author,
        // Owner and site together, because «ARASAAC» alone does not say whose it
        // is and the licence requires naming the origin.
        source: p.attribution.source || `${p.attribution.owner}${p.site ? ` (${p.site})` : ''}`,
        licence: p.licence,
      });
    }
  } catch {
    /*
     * A corpus that cannot be parsed must not take the render down: FR-1603 says
     * the line cannot be removed, and `attributionFor` prints the honest «the set
     * you have configured» line for a source it has no credit for. Silence here
     * is a worse sheet, not a broken one.
     */
  }

  /*
   * And her own set, for the ids that record no publisher — every id in every
   * vault that predates this. Only when the LICENSE file gives us something to
   * say: an empty credit would print three empty fields, which reads as a bug.
   */
  const set = await currentPictogramSet();
  const licence = set?.licence?.trim();
  if (licence) {
    credits.set('', {
      author: 'el juego que tienes puesto',
      source: set!.root,
      // First non-empty line: a LICENSE file's first line is its name («CC
      // BY-NC-SA 4.0»), and the whole text on a worksheet foot is not a credit.
      licence: licence.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? 'ver LICENSE',
    });
  }

  return credits;
}
