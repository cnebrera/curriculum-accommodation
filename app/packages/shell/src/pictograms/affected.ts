import {
  affectedByDrawingChange, loadLearner, logger, RampaError, VAULT,
} from '@rampa/core';
import { currentVault } from '../ipc/vault.js';

/**
 * The count behind `pictograms:affected` (031 T015, FR-2905).
 *
 * ## Why it is here and not in the handler
 *
 * `boundary.test.ts` caught the first draft: with this in `ipc/pictograms.ts` the
 * Electron surface hit 956 lines against a 950 bound. That bound has now made three
 * different features move logic out of a wiring file instead of being raised — a bound
 * that only moves up is a bound; a bound that makes somebody look twice is a design
 * review. What belongs in `ipc/` is a folder dialog and handlers.
 *
 * ## Same deriver, prospective state
 *
 * The count comes from asking the question the record will ask, with one rung set to
 * what she is about to choose. That is what makes «the count equals what the record then
 * shows» a property of the design rather than of two functions agreeing.
 */
export async function countAffected(args: unknown): Promise<{
  count: number;
  /** By learner **code**, never a name (`013` FR-1107). */
  byLearner: Array<{ learner: string; jobs: string[] }>;
}> {
  const a = (args ?? {}) as {
    word?: string; language?: string; next?: string | null; learner?: string;
  };
  const word = String(a.word ?? '').trim();
  if (!word) return { count: 0, byLearner: [] };

  /*
   * `next` on the same id allowlist as everywhere else (Principle IX). A value that
   * should not exist is a signal, so it is refused rather than coerced into something
   * plausible — `007` FR-508's rule for paths, applied to an id from a screen.
   */
  const next = typeof a.next === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(a.next)
    ? a.next : undefined;
  if (typeof a.next === 'string' && next === undefined) {
    throw new RampaError('pictogram-language',
      'Ese identificador de dibujo no tiene una forma que yo acepte.');
  }

  const vault = currentVault();

  /*
   * What still outranks the change, per learner.
   *
   * A global vocabulary change cannot touch a sheet whose word is pinned by that
   * learner's override — that rung wins — so the walk asks, per learner, whether the
   * override still decides. For an **override** change there is nothing above it, so
   * nothing is pinned and the map stays empty.
   */
  const pinned = new Map<string, string | undefined>();
  if (a.learner === undefined) {
    for (const code of await vault.list(VAULT.profiles)) {
      if (!/^[A-Za-z0-9]{2,8}$/.test(code)) continue;
      try {
        const learner = await loadLearner(vault, code);
        pinned.set(code, (learner.profile as {
          pictograms?: { overrides?: Record<string, string> };
        }).pictograms?.overrides?.[word]);
      } catch { /* not a learner directory */ }
    }
  }

  const found = await affectedByDrawingChange({
    vault, word, next,
    ...(a.learner ? { learner: a.learner } : {}),
    ...(a.learner === undefined ? { pinnedFor: (code: string) => pinned.get(code) } : {}),
  });

  logger.info('pictograms.affected', { count: found.sheets });
  return {
    count: found.sheets,
    byLearner: found.learners.map((learner) => ({ learner, jobs: [] })),
  };
}
