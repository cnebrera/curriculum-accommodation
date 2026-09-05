import { handle } from './wrap.js';
import { saveStructure, type SaveStructureArgs } from '../jobs/structure.js';
import { candidatesFor } from '../pictograms/bring.js';

/**
 * The channels for structure material (028 T009, FR-2602/2605).
 *
 * ## Thin on purpose, and reusing rather than parallel
 *
 * `candidates` is `024`'s own `candidatesFor`, unchanged, and choosing writes through
 * `pictograms:chooseWord` — the channel that already exists. Which means a decision she
 * makes while building an agenda («ésta es la casa que usamos») serves her adapted
 * worksheets too, and one made on a worksheet serves the next agenda.
 *
 * A `structure:chooseWord` of its own would have been half a line of code and a second
 * vocabulary: the same word answered differently depending on which screen she was on,
 * with nothing to show her why.
 *
 * ## Nothing here can spend
 *
 * There is no provider in this file and no cost recorded, and that is asserted at source
 * level rather than promised in a comment — see `structure-costs-nothing.test.ts`. An
 * agenda is a local set, a deterministic build and a render this application already had.
 */
export function registerStructureIpc(): void {
  handle('structure:save', async (args: SaveStructureArgs) => saveStructure(args));

  /**
   * The words her set cannot decide, with their pictures.
   *
   * `024`'s function verbatim. It answers `[]` when no set is configured, which is the
   * honest answer and not an error: the builder has already turned every word into a
   * declared gap, and the screen says what is missing (FR-2612).
   */
  handle('structure:candidates', async (args: { words: string[]; language?: string }) =>
    candidatesFor(args));
}
