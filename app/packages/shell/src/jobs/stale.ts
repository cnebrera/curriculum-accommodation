import {
  parseIR, jobIR, jobAdapted, learnersOf, readingFingerprint, sheetFreshness, loadLearner,
  type DocumentFreshness,
  type Vault, type ReadingFreshness,
} from '@rampa/core';
import { drawingLadder } from '../pictograms/ladder.js';

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
  /**
   * Both axes since `031` (FR-2903).
   *
   * The verification screen asks this after she has corrected a reading, so the reading
   * axis is what she came for — but a sheet that is *also* carrying a drawing she no
   * longer uses is a sheet she is about to re-make anyway, and telling her one thing at a
   * time costs her the second trip.
   */
  freshness: DocumentFreshness;
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
    rows.push({
      learner,
      freshness: sheetFreshness(parseIR(sheet), {
        reading: current,
        ...(await ladderForLearner(vault, learner)),
      }),
    });
  }
  return rows;
}

/**
 * One ladder per learner, and cached for the walk.
 *
 * A job's sheets belong to different learners with different overrides and possibly
 * different languages, so the ladder is per learner rather than per scan here — and
 * memoised, because a job with three sheets for one learner would otherwise build it
 * three times.
 */
const ladderCache = new Map<string, Awaited<ReturnType<typeof drawingLadder>>>();

async function ladderForLearner(
  vault: Vault, learner: string,
): Promise<Awaited<ReturnType<typeof drawingLadder>>> {
  const cached = ladderCache.get(learner);
  if (cached) return cached;
  const profile = (await loadLearner(vault, learner)).profile;
  const overrides = (profile as {
    pictograms?: { overrides?: Record<string, string> };
  }).pictograms?.overrides;
  const built = await drawingLadder({
    vault,
    ...(overrides ? { overrides } : {}),
    ...(profile.language?.instruction ? { language: profile.language.instruction } : {}),
  });
  ladderCache.set(learner, built);
  return built;
}

/**
 * Just the ones worth telling her about, in the order the directories give.
 *
 * Either axis being **stale** counts, because both are reasons to look at a sheet again
 * and neither may hide the other (FR-2903).
 *
 * `unknown` counts on the **reading** axis only, and that asymmetry is deliberate. There,
 * it is actionable: she has just corrected a reading and «no sé si estas son de antes» is
 * exactly what she needs. On the drawing axis every sheet written before `031` is
 * `unknown`, so counting it would put a line on every row of every existing vault — which
 * teaches her to skip the line and takes the `stale` one down with it. That is the same
 * argument `RecordScreen` already makes about reading-unknown in the record.
 */
export const notFromCurrentReading = (rows: readonly SheetFreshness[]): SheetFreshness[] =>
  rows.filter((r) => r.freshness.reading !== 'fresh' || r.freshness.drawings.state === 'stale');
