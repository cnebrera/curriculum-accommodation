import { stat, rename } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Where the log lives, and what keeps it bounded (036 FR-3402/FR-3403).
 *
 * ## Extracted, unchanged, and taking what it needs as an argument
 *
 * Both functions were private inside `ipc/diagnostics.ts`, and one of them reached
 * `app.getPath` — so neither could be asserted behaviourally. That is the eighth time
 * this project's Electron-surface bound has produced the same move: inject the directory
 * and the code stops being bridge.
 *
 * **Nothing about the behaviour changed** (FR-3414). `036` writes down what the log
 * already does; a specification that quietly redesigned the thing it was written to
 * describe would be worse than none.
 */

/**
 * The default bound: 2 MB.
 *
 * A line is roughly 100 bytes, so this is ~20.000 lines — and a packaged build writes
 * `info` and above, which is tens of lines per session rather than thousands. Hundreds of
 * sessions before it rotates once, which is why the screen has no file selector
 * (clarified 2026-09-07).
 */
export const LOG_MAX_BYTES = 2_000_000;

/**
 * The log, inside a directory the caller supplies.
 *
 * The caller supplies the **application-data** directory and never a vault root, and
 * FR-3402 is why: her vault is what she copies to a new laptop, what a backup copies, and
 * what she hands to a colleague. A diagnostic in there would travel with all three. The
 * same reasoning keeps the pictogram licence acceptance out of a handover
 * (`024` FR-2219).
 */
export const logFileIn = (dir: string): string => join(dir, 'logs', 'rampa.log');

/** The one generation kept beside it. */
export const rotatedName = (path: string): string => `${path}.1`;

/**
 * Rotate if it has grown past the bound, keeping exactly one generation.
 *
 * A missing file is not an error: on a first run there is nothing to rotate, and
 * `startLogging` calls this before installing the sink.
 */
export async function rotateIfLarge(
  path: string, maxBytes: number = LOG_MAX_BYTES,
): Promise<boolean> {
  try {
    if ((await stat(path)).size <= maxBytes) return false;
  } catch { return false; }   // no log yet
  await rename(path, rotatedName(path));
  return true;
}
