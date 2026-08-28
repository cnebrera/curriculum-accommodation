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
  recipesLocal: 'recipes-local',
  machine: '.rampa',
  names: '.rampa/names.enc',
  index: '.rampa/index.md',
  costs: '.rampa/costs.json',
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
