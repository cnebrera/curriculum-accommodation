import type { Vault } from '../vault/io.js';
import { VAULT, learnerDir, jobDir, outputDir } from '../vault/paths.js';
import { rm } from 'node:fs/promises';
import { resolveInVault } from '../vault/paths.js';

/**
 * Erasure (003 FR-215…220).
 *
 * The project claims privacy as a strength, and until this existed learner data
 * accumulated with no stated end. "It is all local" is not an answer to a right
 * of erasure: it is still processing, and the teacher is still holding it.
 */
export interface ForgetPlan {
  code: string;
  paths: string[];
  /** Said plainly rather than left for her to wonder about. */
  survives: string[];
  outOfReach: string[];
}

export async function planForget(vault: Vault, code: string): Promise<ForgetPlan> {
  const paths: string[] = [];
  if (await vault.exists(learnerDir(code))) paths.push(learnerDir(code));

  for (const job of await vault.list(VAULT.material)) {
    const ir = `${jobDir(job)}/ir.md`;
    const raw = await vault.readRaw(ir);
    if (raw && raw.includes(code)) { paths.push(jobDir(job)); paths.push(outputDir(job)); }
  }

  for (const f of await vault.list(VAULT.journal)) {
    const p = `${VAULT.journal}/${f}`;
    const raw = await vault.readRaw(p);
    if (raw && new RegExp(`learner:\\s*${code}\\b`).test(raw)) paths.push(p);
  }

  return {
    code,
    paths: [...new Set(paths)],
    survives: [
      'Las mejoras a las recetas que ya enviaste a la comunidad no se retiran: no contienen nada de este alumno, por construcción.',
    ],
    outOfReach: [
      'Las copias de seguridad que hayas hecho tú están fuera de mi alcance. Ésas tienes que borrarlas tú.',
    ],
  };
}

/** Removes only after the plan has been shown and confirmed. */
export async function executeForget(vault: Vault, plan: ForgetPlan): Promise<{ removed: string[]; remaining: string[] }> {
  const removed: string[] = [];
  for (const p of plan.paths) {
    await rm(resolveInVault(vault.root, p), { recursive: true, force: true });
    removed.push(p);
  }
  const remaining = await verifyForgotten(vault, plan.code);
  return { removed, remaining };
}

/** Search the whole vault for the code, so the claim can be made honestly. */
export async function verifyForgotten(vault: Vault, code: string): Promise<string[]> {
  const hits: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await vault.list(dir)) {
      if (dir === VAULT.machine) continue;
      const p = `${dir}/${entry}`;
      if (entry.includes('.')) {
        const raw = await vault.readRaw(p);
        if (raw && new RegExp(`(?<![A-Za-z0-9])${code}(?![A-Za-z0-9])`).test(raw)) hits.push(p);
      } else await walk(p);
    }
  };
  for (const top of [VAULT.profiles, VAULT.material, VAULT.output, VAULT.memory]) await walk(top);
  return hits;
}

/** A dated line with no learner content in it. */
export const tombstone = (code: string) =>
  `- ${new Date().toISOString().slice(0, 10)} · ${code} · datos eliminados a petición\n`;
