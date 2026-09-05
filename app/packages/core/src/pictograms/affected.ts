import { parseIR } from '../ir/parse.js';
import { parsePicto } from './apply.js';
import { learnersOf } from '../record/scan.js';
import type { Vault } from '../vault/io.js';
import { VAULT, jobDir, jobLearnerDir } from '../vault/paths.js';

/**
 * How many sheets a choice would make stale — **before** she makes it
 * (031 T014, FR-2905, research R3).
 *
 * ## The same deriver, run against tomorrow
 *
 * Not a second implementation of «is this stale». The count comes from asking the
 * question the record will ask, with the ladder's answer for one word replaced by what
 * she is about to choose. That is what makes FR-2905's «the count MUST equal what the
 * record then shows» a property of the design rather than of two functions staying in
 * agreement — and two functions computing one number is exactly how a promise gets
 * broken by a later edit to one of them.
 *
 * ## Unknown sheets are not counted
 *
 * A sheet whose drawings were never recorded will be reported `unknown` by the record,
 * not `stale`. Counting it here would be a promise the record then breaks (SC-2902), so
 * the walk skips any sheet whose pairs do not name the word — which covers the unknown
 * case and the irrelevant case at once, and needs no schema question.
 *
 * ## Scope follows the kind of change
 *
 * An **override** belongs to one learner, so it can only affect that learner's sheets. A
 * **vocabulary** change is global — but it cannot touch a sheet whose word was pinned by
 * an override, because that rung wins. The caller says which by passing `learner`, and
 * the resolver it supplies is the one that already knows about the rungs.
 */

export interface AffectedCount {
  /** How many sheets carry the old drawing for this word. */
  sheets: number;
  /** Which learners they belong to, so a sentence can be about people. */
  learners: string[];
}

export async function affectedByDrawingChange(args: {
  vault: Vault;
  /** The word whose choice is changing, as she typed it. */
  word: string;
  /**
   * What the word would resolve to **after** the change: an id, or `undefined` when she
   * is un-choosing. Compared against what each sheet recorded.
   */
  next: string | undefined;
  /**
   * Only this learner's sheets, for an override. Absent means every learner — a
   * vocabulary change.
   */
  learner?: string;
  /**
   * Would this word still be pinned for that learner by something that outranks the
   * change? Supplied by the caller, which owns the ladder.
   *
   * This is what keeps a global change off override-pinned sheets: the caller answers
   * «for this learner, is the override still what wins?», and where it is, the sheet is
   * not affected however the vocabulary moved.
   */
  pinnedFor?: (learner: string) => string | undefined;
}): Promise<AffectedCount> {
  const word = normaliseWord(args.word);
  const learners = new Set<string>();
  let sheets = 0;

  for (const job of await args.vault.list(VAULT.material)) {
    if (!(await args.vault.exists(jobDir(job)))) continue;
    /*
     * `learnersOf`, not `list(jobDir(job))` — the record's own enumerator.
     *
     * The first draft listed the job directory and treated every entry as a learner
     * code, which includes `ir.md`; the walk then read `material/job-a/ir.md/adapted.md`
     * and the e2e came back with `ENOTDIR` rather than a wrong number. Two enumerations
     * of «which learners does this job have» is the same defect as two definitions of
     * «stale», one directory up: this counts what the record shows, so it has to walk
     * what the record walks.
     */
    for (const code of await learnersOf(args.vault, job)) {
      if (args.learner !== undefined && code !== args.learner) continue;
      const path = `${jobLearnerDir(job, code)}/adapted.md`;
      const raw = await args.vault.readRaw(path);
      if (raw === null) continue;

      /*
       * Short-circuit before parsing: a sheet with no `data-picto` at all cannot name
       * the word, and a walk of `material/` is the one place in this feature where the
       * cost is proportional to her whole folder.
       */
      if (!raw.includes('data-picto')) continue;

      const recorded = recordedFor(raw, word);
      if (recorded === undefined) continue;   // unknown or irrelevant: not counted

      // Still pinned by something that outranks this change ⇒ untouched.
      if (args.pinnedFor?.(code) !== undefined) continue;

      if (recorded !== args.next) { sheets += 1; learners.add(code); }
    }
  }

  return { sheets, learners: [...learners].sort() };
}

/** The id this sheet recorded for that word, or `undefined` if it recorded none. */
function recordedFor(raw: string, word: string): string | undefined {
  for (const b of parseIR(raw).blocks) {
    for (const pair of parsePicto(b.attrs['data-picto'])) {
      if (normaliseWord(pair.word) === word) return pair.id;
    }
  }
  return undefined;
}

/**
 * The same folding `matchWord`'s lookup does: lower case, accents away.
 *
 * Written here rather than imported from `match.ts` because that module's `normalise` is
 * private, and exporting it to share three lines would widen a module's surface for a
 * detail. If a third caller ever needs it, that is the moment to move it.
 */
const normaliseWord = (w: string): string =>
  w.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
