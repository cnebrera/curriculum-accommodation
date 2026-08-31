import type { Vault } from '../vault/io.js';
import { VAULT, learnerDir, jobDir, jobLearnerDir, outputDir } from '../vault/paths.js';
import { learnersOf } from '../record/scan.js';
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
  /**
   * Shared material kept because somebody else still uses it (014 FR-1211).
   *
   * `survives` says the general rule; this says which jobs, and how many other
   * learners are the reason. **Counts, not codes**: naming another child inside
   * a dialogue about erasing this one is exposure that buys nothing, and she can
   * see who from their own records.
   */
  sharedKept: Array<{ job: string; alsoUsedBy: number }>;
}

export async function planForget(vault: Vault, code: string): Promise<ForgetPlan> {
  const paths: string[] = [];
  if (await vault.exists(learnerDir(code))) paths.push(learnerDir(code));

  const sharedKept: ForgetPlan['sharedKept'] = [];

  for (const job of await vault.list(VAULT.material)) {
    // Adaptations live under the learner's code (T092b), so removing a learner
    // removes their sheets and leaves any other learner's sheets for the same
    // worksheet untouched.
    if (await vault.exists(jobLearnerDir(job, code))) {
      paths.push(jobLearnerDir(job, code));
      paths.push(outputDir(job, code));

      /*
       * Does anybody else still read this source?
       *
       * `learnersOf` asks whether an `adapted.md` is actually there, rather than
       * whether a directory with the right name is. A directory left behind by a
       * crash is not a reader, and treating it as one would keep a photograph of
       * a worksheet in her folder for ever with nobody able to say why.
       *
       * The other direction is worse and is what makes this the subtle part of
       * `014`: removing a source another learner still uses destroys that
       * child's material, and she would find out the next time she opened it.
       */
      const others = (await learnersOf(vault, job)).filter((l) => l !== code);
      if (others.length === 0) paths.push(jobDir(job));
      else sharedKept.push({ job, alsoUsedBy: others.length });
    }
  }

  for (const f of await vault.list(VAULT.journal)) {
    const p = `${VAULT.journal}/${f}`;
    const raw = await vault.readRaw(p);
    if (raw && new RegExp(`learner:\\s*${code}\\b`).test(raw)) paths.push(p);
  }

  return {
    code,
    paths: [...new Set(paths)],
    sharedKept,
    survives: [
      'Las mejoras a las recetas que ya enviaste a la comunidad no se retiran: no contienen nada de este alumno, por construcción.',
      'Las fichas adaptadas para otros alumnos a partir del mismo material se quedan como están.',
      // 015 FR-1307. It is inside profile.yaml, so `learnerDir` already takes it —
      // but a plan that lists what goes must name the fields she would worry
      // about, and «el colegio» is one a school's DPO will ask about by name.
      /*
       * `018` T006 adds «los pictogramas»: it lives in profile.yaml so `learnerDir`
       * already takes it, and a plan that lists what goes must name the fields she
       * would worry about. This one is a **recorded decision about how a child is
       * seen**, which is closer to the reason erasure exists than a course is.
       */
      'Se va todo lo del alumno: su perfil, su edad, su curso, su colegio, si usaba '
      + 'pictogramas, tus notas sobre él y sus fichas adaptadas.',
      ...(sharedKept.length ? [
        `${sharedKept.length} ${sharedKept.length === 1 ? 'material se queda' : 'materiales se quedan'} `
        + 'en tu carpeta porque otros alumnos tuyos también lo usan. Lo suyo de este alumno sí se borra.',
      ] : []),
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
