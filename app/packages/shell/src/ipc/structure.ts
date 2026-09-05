import { handle } from './wrap.js';
import { saveStructure, type SaveStructureArgs } from '../jobs/structure.js';
import { runStory, type StoryArgs } from '../jobs/story.js';
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
 * ## Two of the three kinds cannot spend, and one can
 *
 * `save` builds an agenda or a sequence: a local set, a deterministic build and a render
 * this application already had. `story` drafts, which is what a social story is, and it
 * goes through `jobs/story.ts` — a separate file precisely so «the agenda cannot spend»
 * stays a property of the code rather than of this comment
 * (`structure-costs-nothing.test.ts` asserts it there).
 *
 * Which is why they are two channels rather than one with a `kind`: she should be able to
 * tell which of the three things she is about to do reaches a provider by looking at the
 * button, not by knowing what the field means.
 */
export function registerStructureIpc(
  getWindow: () => import('electron').BrowserWindow | null = () => null,
): void {
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

  /**
   * The one that spends (`028` FR-2609/2610/2611).
   *
   * Its own channel, so «esto cuesta dinero» is visible in the surface rather than hidden
   * behind a `kind` field on the save call. She should be able to tell which of the three
   * things she is about to do reaches a provider by looking at the button.
   */
  handle('structure:story', async (args: StoryArgs) =>
    runStory(args, (p) => getWindow()?.webContents.send('job:progress', p)));
}
