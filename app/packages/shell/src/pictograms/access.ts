import { readdir, readFile, stat } from 'node:fs/promises';
import {
  readSet, loadImages, type SetReader, type ImageReader, type PictogramSet,
} from '@rampa/core';
import { loadSettings } from '../ipc/vault-settings.js';

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
