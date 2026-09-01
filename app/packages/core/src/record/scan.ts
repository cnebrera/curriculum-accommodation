import { parseIR } from '../ir/parse.js';
import { isSignedOff } from '../ir/types.js';
import { readingFingerprint, freshnessOf } from '../ir/reading.js';
import { startedFor } from '../vault/document.js';
import {
  VAULT, jobDir, jobIR, jobSourceDir, jobLearnerDir, jobAdapted, jobReport, outputDir,
  jobAnswers, jobComposeReport,
} from '../vault/paths.js';
import type { Vault } from '../vault/io.js';
import { schoolYearOf, type RecordEntry, type RecordSource } from './entry.js';

/**
 * A learner's record, derived from the vault (014 T003, FR-1202).
 *
 * **Nothing is stored.** This walks the `material` directory, finds the sub-directories named
 * for this learner's code, and reads what is there. Deleting `record.md` and the
 * machine directory changes nothing about what this returns, which is SC-1203
 * and the reason the design holds: a record the application *read* would be a
 * second copy of a truth that already has one, and this project has found that
 * defect four times.
 *
 * Deterministic, offline, no model (Principle II). It is a directory listing and
 * some YAML.
 *
 * ## Why it reads every job
 *
 * O(jobs) to answer one learner's question. Accepted rather than cached: reading
 * front matter from 400 directories is milliseconds, SC-1207 says "no
 * perceptible wait", and a cache added before a measurement asks for it would be
 * the same defect wearing a performance costume. FR-1214 permits one when a
 * number demands it.
 */

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/**
 * Where the material came from.
 *
 * The IR's own front matter is the authority for the two fileless cases, because
 * `material/<job>/source/` being absent is normal rather than a fault.
 */
function sourceOf(irFrontMatter: Record<string, unknown>, sourceFiles: string[]): RecordSource {
  if (sourceFiles.length > 0) {
    return { of: 'file', paths: sourceFiles };
  }
  const declared = str(irFrontMatter['source']) ?? '';
  if (declared === 'generated' || declared === 'composed') {
    const objectives = Array.isArray(irFrontMatter['objectives'])
      ? (irFrontMatter['objectives'] as unknown[]).filter((o): o is string => typeof o === 'string')
      : [];
    return { of: 'composed', objectives, ...(str(irFrontMatter['anchor']) ? { anchor: str(irFrontMatter['anchor'])! } : {}) };
  }
  return { of: 'pasted' };
}

/** Every job in the vault, oldest id first. */
const allJobs = (vault: Vault): Promise<string[]> => vault.list(VAULT.material);

/**
 * One entry, or `null` when this job produced nothing for this learner.
 *
 * Exported because the erasure planner needs to ask the same question about a
 * single job without scanning the vault twice.
 */
export async function entryFor(vault: Vault, jobId: string, learner: string): Promise<RecordEntry | null> {
  const adaptedPath = jobAdapted(jobId, learner);
  const adaptedRaw = await vault.readRaw(adaptedPath);

  const irPath = jobIR(jobId);
  const irRaw = await vault.readRaw(irPath);
  const irFm = irRaw ? parseIR(irRaw).frontMatter : {};

  /*
   * A composed job is hers before it is adapted (`016` T006).
   *
   * Until composing existed, a job became a learner's only by being adapted for
   * her — every job arrived by being ingested and belonged to nobody until then.
   * A composed job is different: she asked for it for this child, and `ir.md`
   * records `composed_for`. Without this branch she would compose, be
   * interrupted, and find nothing in the record — the opposite of «todo lo que se
   * genere se queda ligado al alumno».
   */
  /*
   * `startedFor` rather than reading `composed_for` directly (`021` T004).
   *
   * Found by `e2e/composed.spec.ts`: a job stamped with the current spelling
   * (`for_learner`) **vanished from her record**, because this line knew only the older
   * one. Which is precisely the failure `021` research R2 predicted from having two names
   * for one fact — it just arrived from the other direction, in a reader nobody had
   * thought to update.
   */
  const composedForThisLearner = startedFor(irFm) === learner;
  if (adaptedRaw === null && !composedForThisLearner) return null;

  const adapted = adaptedRaw !== null ? parseIR(adaptedRaw) : null;
  const fm = adapted?.frontMatter ?? irFm;

  const sourceFiles = (await vault.list(jobSourceDir(jobId)))
    .map((f) => `${jobSourceDir(jobId)}/${f}`);

  const learnerFiles = await vault.list(jobLearnerDir(jobId, learner));
  const revisions = learnerFiles
    .filter((f) => /^adapted\.r\d+\.md$/.test(f))
    .sort((a, b) => Number(/\d+/.exec(a)![0]) - Number(/\d+/.exec(b)![0]))
    .map((f) => `${jobLearnerDir(jobId, learner)}/${f}`);

  const rendered = (await vault.list(outputDir(jobId, learner)))
    .map((f) => `${outputDir(jobId, learner)}/${f}`);

  const reportPath = jobReport(jobId, learner);
  const hasReport = await vault.exists(reportPath);

  const hasAnswers = await vault.exists(jobAnswers(jobId));
  const hasComposeReport = await vault.exists(jobComposeReport(jobId));

  const documents = {
    ir: irPath,
    ...(adaptedRaw !== null ? { adapted: adaptedPath } : {}),
    ...(hasReport ? { report: reportPath } : {}),
    // The key and the composition report belong to the job, not to a learner:
    // one composition, N presentations (Principle IV).
    ...(hasAnswers ? { answers: jobAnswers(jobId) } : {}),
    ...(hasComposeReport ? { composeReport: jobComposeReport(jobId) } : {}),
    revisions,
    rendered,
  };

  /*
   * What is on the list and not on the disk (FR-1206). She may have deleted a
   * PDF in Finder, or moved a folder; the row stays and says so rather than
   * disappearing.
   */
  const missing: string[] = [];
  for (const p of [irPath, ...(sourceFiles), ...revisions]) {
    if (!(await vault.exists(p))) missing.push(p);
  }

  /*
   * The date is stamped by the shell when the adaptation is written, never read
   * from the model's output. When has to be a fact (Principle II), and a model
   * asked for today's date will confidently produce one.
   *
   * A document written before that stamp existed falls back to the file's own
   * modification time, so FR-1204 holds for vaults that predate this feature.
   */
  const date = str(fm['adapted_on'])
    // A composed job stamps `composed_on`; an adapted one stamps `adapted_on`.
    ?? str(irFm['composed_on'])
    ?? (await vault.modifiedAt(adaptedRaw !== null ? adaptedPath : irPath))
    ?? '';

  /*
   * Whether this sheet was made from the reading on disk now (005 T026, FR-520).
   *
   * Here rather than in a second implementation beside it: this function already has
   * both parsed documents in hand, and two derivations of one answer are two
   * derivations that can disagree about whether a sheet is stale. The verification
   * screen and this row read the same function.
   */
  const freshness = adapted !== null && irRaw !== null
    ? freshnessOf(adapted, readingFingerprint(parseIR(irRaw)))
    : undefined;

  return {
    jobId,
    learner,
    date,
    schoolYear: str(fm['school_year']) ?? schoolYearOf(date),
    kind: str(fm['kind']) ?? 'material',
    ...(str(fm['subject']) ? { subject: str(fm['subject'])! } : {}),
    // No sheet, no signature. `isSignedOff` over the IR would read a flag from a
    // document nobody signs.
    signedOff: adapted !== null && isSignedOff(adapted),
    ...(adaptedRaw === null ? { pending: true } : {}),
    ...(freshness ? { freshness } : {}),
    revision: revisions.length + 1,
    source: sourceOf(irFm, sourceFiles),
    documents,
    missing,
  };
}

/**
 * Everything ever made for one learner, newest first.
 *
 * A job that was **ingested** and never adapted for anybody appears in no record:
 * it belongs to nobody yet. A job that was **composed** for her does appear, marked
 * `pending`, because it was hers from the moment she asked for it (`016` T006).
 */
export async function recordFor(vault: Vault, learner: string): Promise<RecordEntry[]> {
  const entries: RecordEntry[] = [];
  for (const jobId of await allJobs(vault)) {
    // A file dropped into `material/` by a sync client is not a job.
    if (!(await vault.exists(jobDir(jobId)))) continue;
    const entry = await entryFor(vault, jobId, learner);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/**
 * Which learners a job has been adapted for.
 *
 * Directory listing rather than a stored list — the batch is derived, exactly as
 * `005`'s data model says. Used by erasure to decide whether a shared source
 * still has a reader.
 */
export async function learnersOf(vault: Vault, jobId: string): Promise<string[]> {
  const entries = await vault.list(jobDir(jobId));
  const out: string[] = [];
  for (const e of entries) {
    if (e === 'source' || e.includes('.')) continue;
    if (await vault.exists(jobAdapted(jobId, e))) out.push(e);
  }
  return out;
}
