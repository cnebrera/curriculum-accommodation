import { matchWord, vaultSchema, VAULT_SCHEMA_DRAWINGS, type CurrentState } from '@rampa/core';
import { currentPictogramSet } from './access.js';
import { chosenWords } from './bring.js';
import { nameWordSet } from '../ipc/names.js';
import type { Vault } from '@rampa/core';

/**
 * What «current» means for the drawing axis (031 T006/T009, research R2).
 *
 * ## The resolver **is** `matchWord`
 *
 * Not a reimplementation of the ladder, and not a stored `source` per recorded pair. The
 * question the freshness axis asks is «what drawing would this word get **now**», and
 * `matchWord` is the one function that answers it — override → vocabulary → set, names
 * never. Asking it subsumes «where did the old one come from», which is why no sheet
 * records a source and why the un-choose case falls out for free: the ladder answers
 * `undefined`, the sheet recorded an id, and they differ.
 *
 * ## Assembled once per scan, never once per sheet
 *
 * The vocabulary is one file, the override lives in a profile the caller already loads,
 * and the set is behind the existing cached path. Building this per job would turn an
 * O(jobs) record scan into O(jobs) file reads — `020` FR-1828's rule («one read of the
 * material directory, not one per learner») applied to this axis.
 */
export async function drawingLadder(args: {
  /**
   * The vault to ask for the schema version — **passed in, never `currentVault()`**.
   *
   * A first draft reached for the global one and broke `staleSheets`, which is handed a
   * vault as a parameter: a helper that takes a vault from its caller and then quietly
   * asks a different question of a different vault is a helper that works only where
   * somebody happened to open one.
   */
  vault: Vault;
  /** Her overrides for this learner, from the profile the caller already has. */
  overrides?: Readonly<Record<string, string>>;
  /** The sheet's language. One ladder per language, because `chosen` is per language. */
  language?: string;
}): Promise<Pick<CurrentState, 'drawingFor' | 'recordsDrawings'>> {
  const language = args.language ?? 'es';
  const set = await currentPictogramSet();
  const chosen = await chosenWords(language, args.vault);
  const names = await nameWordSet(args.vault);

  /*
   * Whether an empty record means «no drawings» or «this sheet predates the record».
   *
   * The vault's own schema version answers it (P50, COLA 1.17). Below the version that
   * started stamping pairs, an absent `data-picto` says nothing at all — and the axis
   * answers «no lo sé» rather than claiming a sheet is current on a fact nobody wrote
   * down (FR-2906).
   */
  const recordsDrawings = (await vaultSchema(args.vault)) >= VAULT_SCHEMA_DRAWINGS;

  if (!set) {
    /*
     * No set configured. Every word resolves to nothing now — so a sheet that recorded a
     * drawing **is** stale, which is correct and is the un-choose case at the largest
     * scale: she removed the set, and the sheets made with it no longer match what she
     * would get today.
     */
    return { drawingFor: () => undefined, recordsDrawings };
  }

  return {
    drawingFor: (word: string): string | undefined => {
      const m = matchWord(word, set, {
        language,
        ...(args.overrides ? { overrides: args.overrides } : {}),
        names,
        chosen,
      });
      return m.kind === 'matched' ? m.id : undefined;
    },
    recordsDrawings,
  };
}

