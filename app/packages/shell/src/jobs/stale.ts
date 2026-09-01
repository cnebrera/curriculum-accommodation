import {
  parseIR, jobIR, jobAdapted, learnersOf, readingFingerprint, freshnessOf,
  type Vault, type ReadingFreshness,
} from '@rampa/core';

/**
 * Which sheets were made from a reading that has since changed (005 T025, FR-520).
 *
 * A read. It lists the learners this job has been adapted for — `learnersOf` derives
 * that from the directories, exactly as `005`'s data model says — parses each sheet,
 * and compares what the sheet says it was made from against the reading on disk now.
 *
 * **It writes nothing and it starts nothing.** FR-520's third clause is that a
 * correction must not re-run anything on its own, and the shape of this function is
 * where that is either true or not: it returns rows. Deciding to adapt again is hers,
 * one learner at a time, through the adaptation that already exists.
 *
 * Codes, never names. The name is joined in the renderer where the name map already
 * lives (`013` FR-1107), so no learner's name reaches this layer or any file it could
 * write.
 */

export interface SheetFreshness {
  learner: string;
  freshness: ReadingFreshness;
}

export async function staleSheets(vault: Vault, jobId: string): Promise<SheetFreshness[]> {
  const raw = await vault.readRaw(jobIR(jobId));
  // No extraction, nothing to be stale against. A job whose `ir.md` has been deleted
  // is `014`'s missing-document case and says so there; claiming every sheet is stale
  // because the file is gone would be a second, worse answer to the same question.
  if (raw === null) return [];
  const current = readingFingerprint(parseIR(raw));

  const rows: SheetFreshness[] = [];
  for (const learner of await learnersOf(vault, jobId)) {
    const sheet = await vault.readRaw(jobAdapted(jobId, learner));
    if (sheet === null) continue;
    rows.push({ learner, freshness: freshnessOf(parseIR(sheet), current) });
  }
  return rows;
}

/** Just the ones worth telling her about, in the order the directories give. */
export const notFromCurrentReading = (rows: readonly SheetFreshness[]): SheetFreshness[] =>
  rows.filter((r) => r.freshness !== 'fresh');
