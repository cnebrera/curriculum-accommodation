import {
  buildStructure, loadLearner, jobDir, jobIR,
  type BuildArgs, type Match, type StructureItem, type StructureKind, type Vault,
} from '@rampa/core';
import { currentVault } from '../ipc/vault.js';
import { currentPictogramSet } from '../pictograms/access.js';
import { chosenWords } from '../pictograms/bring.js';
import { nameWordSet } from '../ipc/names.js';

/**
 * Saving an agenda, a sequence or a story (028 T008, FR-2602/2604).
 *
 * ## What this function is allowed to do
 *
 * Load the four things `matchWord` needs, call the builder, write the IR. Nothing else:
 * no provider, no cost, no clock beyond the date it is handed. The judgement about which
 * drawing a word gets lives in `matchWord`, and the judgement about what an agenda *is*
 * lives in the corpus — this is the plumbing between them.
 *
 * ## Why the four rungs are assembled here and not inside the builder
 *
 * `packages/core` is side-effect-free by design and the isolation suite walks it: her
 * vocabulary is a file, her overrides are in a profile, the set is behind a cached path,
 * and the name list is in the encrypted store the shell owns. Reading them is this side
 * of the boundary; deciding with them is the other side.
 */

export interface SaveStructureArgs {
  /**
   * The job id, allocated by the caller — the same shape `job:compose` uses.
   *
   * A first draft derived it from the date and the kind, which collides the second time
   * she builds an agenda in a day: the two would share a directory and the later one
   * would overwrite the earlier. Reading a clock here to avoid that would put a clock in
   * a function whose output is otherwise a fact about its arguments.
   */
  jobId: string;
  learnerCode: string;
  kind: StructureKind;
  title?: string;
  items: readonly StructureItem[];
  language?: string;
  /** The date, from the caller. `core` never reads a clock and neither does this. */
  created: string;
}

export interface SavedStructure {
  jobId: string;
  /** Vault-relative path to the document, ready for `resolveDocument`. */
  path: string;
  /** Words that got no drawing, so the screen can offer the chooser (FR-2606). */
  gaps: Match[];
}

export async function saveStructure(
  args: SaveStructureArgs, vault: Vault = currentVault(),
): Promise<SavedStructure> {
  const language = args.language ?? 'es';
  const learner = await loadLearner(vault, args.learnerCode);

  /*
   * The same four rungs `jobs/adapt.ts` supplies, from the same helpers.
   *
   * Not «similar to»: the *same*, so a word she chose while building an agenda is chosen
   * for her worksheets and a word she overrode for this child stays overridden here. A
   * second assembly of these arguments would be the fork the builder's own test forbids,
   * moved one layer up where no test was looking.
   */
  const set = await currentPictogramSet();
  const overrides = learner.profile.pictograms?.overrides ?? {};
  const chosen = await chosenWords(language, vault);
  const names = await nameWordSet(vault);

  /*
   * No set, no drawings — and **not** a refusal.
   *
   * She may have written the whole day out before noticing there is no pictogram folder
   * configured, and losing that to an error dialog would be losing her work to a setup
   * problem. Every word becomes a declared gap, the strip prints as words, and the screen
   * says what is missing (FR-2612).
   */
  const built = buildStructure({
    kind: args.kind,
    ...(args.title ? { title: args.title } : {}),
    items: args.items,
    language,
    set: set ?? { root: '', byLanguage: new Map(), images: new Set(), from: new Map(), popularity: new Map() },
    forLearner: args.learnerCode,
    created: args.created,
    overrides,
    chosen,
    names,
  } satisfies BuildArgs);

  await vault.ensureDir(jobDir(args.jobId));
  await vault.writeRaw(jobIR(args.jobId), built.markdown);

  return { jobId: args.jobId, path: jobIR(args.jobId), gaps: built.gaps };
}
