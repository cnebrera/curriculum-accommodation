import { recordFor, writeRecord, learnerDir, type RecordEntry } from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';

/**
 * The learner's record (014 T012).
 *
 * `forLearner` **writes nothing**, not even `record.md`. A screen that wrote a
 * file every time it was opened would put a synced vault into conflict from
 * being looked at, and this project assumes a vault on OneDrive or Drive
 * (FR-1215). `rebuild` is the only writer here, called on the events that change
 * the work rather than on a read.
 *
 * No name crosses this boundary in either direction. `record:search` takes codes;
 * a search *by* name resolves in the renderer and filters to codes before
 * calling, so a name never reaches a log the first time somebody debugs this
 * (FR-1207/1208).
 */
export function registerRecordIpc(): void {
  handle('record:forLearner', async (code: string): Promise<RecordEntry[]> =>
    recordFor(currentVault(), code));

  handle('record:rebuild', async (code: string): Promise<string> => {
    const vault = currentVault();
    return writeRecord(vault, code, await recordFor(vault, code));
  });

  /**
   * Search, over the record's own fields and over the material's text.
   *
   * `text` is matched against what she can see — title, subject, objectives —
   * and against the adapted document itself, which is where «esto lo hice el año
   * pasado» actually lives.
   */
  handle('record:search', async (q: unknown): Promise<RecordEntry[]> => {
    const query = (q ?? {}) as { learner?: string; schoolYear?: string; kind?: string; text?: string };
    const vault = currentVault();
    if (!query.learner) return [];

    const entries = await recordFor(vault, query.learner);
    const needle = (query.text ?? '').trim().toLowerCase();

    const matches = await Promise.all(entries.map(async (e) => {
      if (query.schoolYear && e.schoolYear !== query.schoolYear) return null;
      if (query.kind && e.kind !== query.kind) return null;
      if (!needle) return e;

      const fields = [e.subject ?? '', ...(e.objectives ?? []), e.kind, e.jobId].join(' ').toLowerCase();
      if (fields.includes(needle)) return e;

      /*
       * The material's own text, read only when the cheap fields miss. For a
       * composed job not yet adapted there is no sheet, so the searchable text is
       * the composed `ir.md` — which is what «esto lo hice el año pasado» is
       * actually looking for.
       */
      const raw = (await vault.readRaw(e.documents.adapted ?? e.documents.ir)) ?? '';
      return raw.toLowerCase().includes(needle) ? e : null;
    }));

    return matches.filter((e): e is RecordEntry => e !== null);
  });
}

/**
 * Regenerate one learner's record after their work changed.
 *
 * Called from the job paths rather than from a screen — FR-1215's list of events
 * is "a job completing, a sign-off, an erasure", and none of them is a render.
 * Failure is swallowed on purpose: `record.md` is a convenience for her, and a
 * sheet that adapted correctly must not be reported as failed because a
 * courtesy file could not be written to a syncing folder.
 */
export async function refreshRecord(code: string): Promise<void> {
  try {
    const vault = currentVault();
    await writeRecord(vault, code, await recordFor(vault, code));
  } catch { /* see above */ }
}

export const recordPathFor = (code: string): string => `${learnerDir(code)}/record.md`;
