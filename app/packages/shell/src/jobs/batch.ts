import { fromWire, isRampaError, type ErrorKind } from '@rampa/core';
import type { AdaptProgress, AdaptResult } from './adapt.js';

/**
 * One worksheet, several learners (005 T002-T009, FR-501…510).
 *
 * Principle IV — *one extraction, N outputs* — has been a directory layout and a
 * comment since August. `material/<job>/ir.md` is the extraction and
 * `material/<job>/<code>/adapted.md` is one adaptation per learner, a layout
 * corrected on 2026-08-28 after a defect where adapting for a second learner
 * overwrote the first. Nothing has ever called the pipeline twice for one job.
 *
 * This is the caller. It is a loop, and almost all of its substance is what
 * happens when part of it fails.
 *
 * ## Why it takes the adaptation as an argument
 *
 * `runAdaptation` reaches `currentVault()` and `activeProvider()`, both of which
 * transitively import Electron. Importing it here would make the batch's own
 * behaviour — isolation, ordering, deduplication, progress — untestable without
 * mocking three modules to assert a loop.
 *
 * Taking the function means `packages/shell/test/batch.test.ts` tests this as
 * what it is: logic, with no vault, no provider and no window. That is the
 * separation FR-1111 asks for, arriving as a testing convenience and staying
 * because it was right.
 */

export interface BatchProgress extends AdaptProgress {
  /** Whose adaptation this is. */
  learner: string;
  /** 1-based. */
  index: number;
  of: number;
}

/** The per-learner adaptation. `runAdaptation` satisfies this. */
export type AdaptOne = (
  jobId: string,
  learner: string,
  onProgress: (p: AdaptProgress) => void,
) => Promise<AdaptResult>;

/**
 * Failures that are facts about the **job**, not about a learner.
 *
 * The distinction arrived from a test rather than from design, and it is the
 * more important half of this module. FR-506 says one learner's failure must not
 * stop the others — but «este material no está verificado» is not one learner's
 * failure. It is true of the material, it will be true for every learner, and
 * turning it into three identical per-learner outcomes reports one problem three
 * times and reframes the verification gate as a per-child mishap.
 *
 * The gate in particular is the thing this project calls its defence against one
 * reading error contaminating every output. It must keep rejecting.
 */
const JOB_LEVEL: ReadonlySet<string> = new Set<ErrorKind>([
  'ir-unverified',      // the verification gate — the same for every learner
  'vault-unreadable',   // her folder, not this child
  'corpus-missing',     // a broken installation
  'input-too-large',    // the material, not the child
  'key-missing', 'key-invalid', 'key-wrong-provider', 'key-no-credit',
  'offline', 'rate-limited',
]);

export type LearnerOutcome =
  | { learner: string; ok: true; result: AdaptResult }
  | { learner: string; ok: false; kind: ErrorKind | 'unknown'; message: string };

export interface BatchOutcome {
  jobId: string;
  results: LearnerOutcome[];
}

/**
 * Adapt one job for one or more learners.
 *
 * **Never throws for a learner.** A failure is a `LearnerOutcome` with an owner,
 * because FR-507 says a failure belongs to a learner and is never a verdict on
 * the run — and because the alternative loses the two sheets that worked.
 *
 * The shape of `LearnerOutcome` is the requirement rather than a convenience: a
 * caller holding this type cannot say "the batch failed" without saying whose.
 */
export async function runBatch(
  jobId: string,
  learners: string | readonly string[],
  adaptOne: AdaptOne,
  onProgress: (p: BatchProgress) => void,
): Promise<BatchOutcome> {
  // She picked the same child twice; she did not ask to pay twice (T003).
  // `Set` also preserves insertion order, which the order-independence test
  // depends on being *stable* rather than sorted.
  const codes = [...new Set(typeof learners === 'string' ? [learners] : learners)];

  const results: LearnerOutcome[] = [];

  for (const [i, learner] of codes.entries()) {
    const index = i + 1;
    /*
     * The catch is INSIDE the loop, and that is the whole function.
     *
     * A `try` around the loop is the version that reads correctly, passes every
     * happy-path test, and loses two learners' work the first time a provider
     * times out on the second of three.
     */
    try {
      const result = await adaptOne(jobId, learner,
        (p) => onProgress({ ...p, learner, index, of: codes.length }));
      results.push({ learner, ok: true, result });
    } catch (e: unknown) {
      /*
       * Both shapes, and the order matters.
       *
       * `fromWire` alone was the first version, on the reasoning that it is what
       * the renderer uses so the decoding would match. It does not: `fromWire`
       * reads a `[rampa:kind]` prefix that `toWire` adds when an error crosses
       * IPC, and a `RampaError` thrown *in this process* has never been through
       * `toWire` — it carries `kind` as a property and a clean message. So every
       * domain error raised by `runAdaptation` decoded to `unknown` and the
       * batch reported "algo ha ido mal" for failures it knew the name of.
       *
       * Caught by the one test that asserted the `kind` rather than the count.
       */
      const { kind, message } = isRampaError(e)
        ? { kind: e.kind as ErrorKind | 'unknown', message: e.message }
        : fromWire(e);

      /*
       * A job-level failure with nothing yet produced is a failure of the run,
       * and it throws — which is what `job:adapt` has always done and what the
       * verification gate depends on.
       *
       * The «nothing yet produced» half is the part worth reading twice. If two
       * sheets already exist and the third hits `offline`, rethrowing would
       * discard two finished adaptations to report a connection drop. So the
       * rule is: preserve work when there is work, and preserve the old
       * rejection when there is none.
       */
      if (JOB_LEVEL.has(kind) && results.length === 0) throw e;

      results.push({ learner, ok: false, kind, message });
    }
  }

  return { jobId, results };
}

/** True when every learner got a sheet. Not "the batch succeeded" — see above. */
export const allSucceeded = (o: BatchOutcome): boolean => o.results.every((r) => r.ok);

/** The learners whose adaptation failed, for a message that names them. */
export const failedLearners = (o: BatchOutcome): string[] =>
  o.results.filter((r) => !r.ok).map((r) => r.learner);
