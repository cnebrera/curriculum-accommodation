import { resolve, sep, join } from 'node:path';
import { RampaError } from '../errors.js';

/**
 * The vault layout, per specs/006-desktop-app/data-model.md.
 *
 * Directory names are English because the constitution puts structure in
 * English; the interface is Spanish. Localising these paths was rejected: it
 * would break handover between teachers of different languages, and every
 * document and test that names a path.
 *
 * This layout is deliberately identical to the harness's local directories, so
 * the harness keeps working against the same vault.
 */
export const VAULT = {
  profiles: 'profiles',
  roster: 'profiles/roster.yaml',
  archive: 'profiles/archive',
  material: 'material',
  output: 'output',
  memory: 'memory',
  house: 'memory/house.md',
  journal: 'memory/journal',
  journalArchive: 'memory/archive',
  /**
   * Handover packets she has reviewed and is ready to send (004 FR-305).
   *
   * Inside the vault and under `output/`'s sibling rather than in it: `output/` is
   * material for a learner, and a packet is a document for a colleague.
   */
  handover: 'handover',
  recipesLocal: 'recipes-local',
  machine: '.rampa',
  names: '.rampa/names.enc',
  index: '.rampa/index.md',
  costs: '.rampa/costs.json',
  /**
   * What shapes this vault contains (P50, `032` T003).
   *
   * In `.rampa/` because it is a fact **about the format** rather than part of her
   * data — the same argument that puts `index.md` here. Absence means version 1,
   * so every vault that already exists is versioned without being touched.
   */
  version: '.rampa/vault.yaml',
} as const;

export const learnerDir = (code: string) => join(VAULT.profiles, code);
export const learnerProfile = (code: string) => join(learnerDir(code), 'profile.yaml');
export const learnerNotes = (code: string) => join(learnerDir(code), 'notes.md');
export const learnerOverlay = (code: string) => join(learnerDir(code), 'adaptations.md');
/**
 * A job is one piece of material, ingested and verified once. Adaptation is per
 * (job × learner) and the paths say so (T092b, data-model corrected 2026-08-28).
 *
 * The layout previously held one `adapted.md` per job, so adapting the same
 * worksheet for a second learner overwrote the first — and `nextRevision` would
 * have recorded learner B's sheet as "revision 2" of learner A's. One
 * extraction, N adaptations is also the load-bearing half of backlog G3.
 */
export const jobDir = (job: string) => join(VAULT.material, job);
export const jobIR = (job: string) => join(jobDir(job), 'ir.md');
export const jobSourceDir = (job: string) => join(jobDir(job), 'source');

/** Everything downstream of verification lives under the learner's code. */
/**
 * Composed material's own two documents (002 T014/T015).
 *
 * At the job level rather than under a learner, because they belong to the
 * composition: one composition, N presentations (Principle IV). The answer key in
 * particular is a **separate file** so that no path exists by which an answer can
 * reach the child's sheet.
 */
export const jobAnswers = (job: string) => join(jobDir(job), 'answers.md');
export const jobComposeReport = (job: string) => join(jobDir(job), 'compose-report.md');

/**
 * What she asked for, kept so a correction can re-run the same composition (`021` T026).
 *
 * In `.rampa/` rather than beside the material, because it is machinery and not her
 * work: a folder she is encouraged to open in Obsidian should not fill with request
 * files. And correcting composed material is **re-composing** rather than adapting — the
 * objectives, the anchor and the level have to still be there, or she would be asked to
 * type again what she already told us.
 */
export const jobComposeRequest = (job: string) =>
  join(VAULT.machine, 'requests', `${job}.json`);

export const jobLearnerDir = (job: string, code: string) => join(jobDir(job), code);
export const jobAdapted = (job: string, code: string) => join(jobLearnerDir(job, code), 'adapted.md');
export const jobAdaptedRevision = (job: string, code: string, n: number) =>
  join(jobLearnerDir(job, code), `adapted.r${n}.md`);
export const jobRejected = (job: string, code: string) =>
  join(jobLearnerDir(job, code), 'adapted.rejected.md');
export const jobReport = (job: string, code: string) => join(jobLearnerDir(job, code), 'report.md');
export const outputDir = (job: string, code: string) => join(VAULT.output, job, code);

/**
 * Resolve a path inside the vault, or refuse.
 *
 * Refusal, never sanitisation. A path that tries to leave the vault is a signal,
 * not a typo — 007 FR-508 — and quietly rewriting it into something plausible
 * would hide exactly the event we want to see.
 */
export function resolveInVault(vaultRoot: string, relPath: string): string {
  const refuse = (why: string): never => {
    throw new RampaError('vault-path-escape',
      `Refused a path outside the vault: ${relPath} (${why})`, { vaultRoot, attempted: relPath });
  };

  // Absoluteness is checked for BOTH platforms, whatever we are running on.
  // A drive letter or a UNC path is relative on POSIX, so `resolve()` would
  // happily bury `C:\\Windows\\System32` inside the vault and report success —
  // and the check would then pass on the developer's Linux machine while failing
  // to protect the teacher's Windows one. Found by cases/injection/06.
  if (/^[A-Za-z]:[\\/]/.test(relPath)) refuse('ruta absoluta de Windows');
  if (/^\\\\/.test(relPath) || relPath.startsWith('//')) refuse('ruta de red UNC');
  if (relPath.startsWith('/') || relPath.startsWith('\\')) refuse('ruta absoluta');

  // Traversal, with either separator.
  const unified = relPath.replace(/\\/g, '/');
  if (unified.split('/').includes('..')) refuse('sube por encima de la carpeta');
  if (unified.includes('\u0000')) refuse('contiene un byte nulo');

  const root = resolve(vaultRoot);
  const target = resolve(root, unified);
  if (target !== root && !target.startsWith(root + sep)) refuse('sale de la carpeta');
  return target;
}

/** True when the path stays inside the vault. Does not throw. */
export function isInVault(vaultRoot: string, relPath: string): boolean {
  try { resolveInVault(vaultRoot, relPath); return true; } catch { return false; }
}
