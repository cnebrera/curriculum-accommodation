import type { Vault } from '../vault/io.js';
import { VAULT, learnerDir, jobDir, jobIR, jobLearnerDir, outputDir } from '../vault/paths.js';
import { startedFor } from '../vault/document.js';
import { parseFrontMatter } from '../vault/parse.js';
import { learnersOf } from '../record/scan.js';
import { loadRoster, saveRoster } from '../vault/profile.js';
import { rm } from 'node:fs/promises';
import { resolveInVault } from '../vault/paths.js';

/**
 * Erasure (003 FR-215…220).
 *
 * The project claims privacy as a strength, and until this existed learner data
 * accumulated with no stated end. "It is all local" is not an answer to a right
 * of erasure: it is still processing, and the teacher is still holding it.
 */
/**
 * Something removed from **inside** a file rather than by deleting the file.
 *
 * Two of the five residues three reviewers found independently are of this shape:
 * her name for him in `.rampa/names.enc`, and his row in `profiles/roster.yaml`.
 * Deleting either file would take every other learner with it, so they are edits —
 * which is why they were missed by a plan that only ever collected paths.
 *
 * `of` is for the code that performs it and `where` for the plan that shows it; the
 * sentence she reads is the interface's (repository rule 7).
 */
export interface ForgetEntry {
  of: 'name' | 'roster';
  where: string;
}

/**
 * What this package cannot reach, supplied by whoever can.
 *
 * Her name for him lives encrypted under an OS key that only the shell holds, and
 * `packages/core` must not touch Electron — Principle II, asserted by
 * `npm run test:isolation`. So erasure **declares** the need and the shell satisfies
 * it.
 *
 * **Required rather than optional**, and that is the load-bearing part. This is the
 * most serious thing the review found: after «he borrado todo lo de Lucía» her real
 * name survived in the encrypted map, and the e2e that was supposed to catch it
 * asserted — over base64 ciphertext — that the code did not appear in the file. It
 * never could. An optional hook is one a caller can omit, and omission is exactly
 * how that happened; a required parameter cannot be forgotten by anybody.
 */
export interface NameStore {
  /** Remove this learner's entry. Idempotent: no entry is success, not an error. */
  forget: (code: string) => Promise<void>;
  /** Still there? The only honest way to check a file this package cannot read. */
  knows: (code: string) => Promise<boolean>;
}

export interface ForgetPlan {
  code: string;
  paths: string[];
  /** Removed from inside a file — see `ForgetEntry`. Always includes her name. */
  entries: ForgetEntry[];
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
    /*
     * His, without a directory named after him (`028` T020, and older than `028`).
     *
     * The loop asked one question — «is there a `material/<job>/<code>/`?» — which is
     * right for an **adapted** sheet and wrong for everything Rampa wrote *for* a learner
     * without adapting it: a structure document (an agenda, a sequence, a story) and a
     * composed sheet she has not adapted yet. Both carry the code in `ir.md`'s front
     * matter and neither has a directory, so neither was planned for deletion.
     *
     * The consequence is the one `003` FR-215 exists to prevent: she pressed «borrar todo
     * lo suyo», was told it was all gone, and a file with that child's code stayed in her
     * folder. The composed half of it has been true since `016` T006 made unadapted
     * compositions appear in the record — which is to say, since they started being his.
     */
    const irRaw = await vault.readRaw(jobIR(job));
    const startedForHim = irRaw !== null
      && startedFor(parseFrontMatter(irRaw, jobIR(job)).data) === code;

    if (await vault.exists(jobLearnerDir(job, code)) || startedForHim) {
      if (await vault.exists(jobLearnerDir(job, code))) {
        paths.push(jobLearnerDir(job, code));
        paths.push(outputDir(job, code));
      }

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

  /*
   * The journal **and its archive** (COD-19).
   *
   * `memory:archive` moves an entry to `memory/archive/` keeping its front matter,
   * `learner: <code>` included — and this loop only ever read `memory/journal`. The
   * consequence was not even a silent one: `verifyForgotten` walks all of `memory/`,
   * so the archived entry turned up in `remaining` *after* the deletion and the
   * screen said «he borrado casi todo… es un fallo mío, dímelo y lo arreglo», with
   * nothing she could do about it. `003` FR-215 says list everything **before**
   * confirming, not discover it afterwards.
   */
  for (const dir of [VAULT.journal, VAULT.journalArchive]) {
    for (const f of await vault.list(dir)) {
      const p = `${dir}/${f}`;
      const raw = await vault.readRaw(p);
      if (raw && new RegExp(`learner:\\s*${code}\\b`).test(raw)) paths.push(p);
    }
  }

  /*
   * The handover packets (COD-07).
   *
   * `handover/<code>-<year>.md` carries the code in its filename and the child's
   * barriers in its body, and neither the plan nor the honest-claim check looked at
   * the directory at all — so a learner with a packet kept a whole file of his own
   * while the screen said «he borrado todo lo de X» without qualification. `003`
   * has an explicit edge case for it: «the packet is deleted too».
   *
   * By content and not only by filename: she may have renamed the file, and the
   * verifier greps content, so a plan that matched only the prefix would leave the
   * screen reporting a residue it had refused to collect.
   */
  const word = new RegExp(`(?<![A-Za-z0-9])${code}(?![A-Za-z0-9])`);
  for (const f of await vault.list(VAULT.handover)) {
    const p = `${VAULT.handover}/${f}`;
    if (f.startsWith(`${code}-`)) { paths.push(p); continue; }
    const raw = await vault.readRaw(p);
    if (raw && word.test(raw)) paths.push(p);
  }

  /*
   * The composition requests (COD-18).
   *
   * `.rampa/requests/<job>.json` keeps the whole `ComposeRequest`: `learnerCode` in
   * clear, plus `objectives` and `anchor`, which are free text where she may well
   * have described the child. When erasure removed the job directory — she was its
   * only reader — the request outlived it with his code in it. `014` FR-1214 says
   * what lives in `.rampa/` must be rebuildable cache; a request nobody deletes,
   * carrying a code and her own words, is not that.
   *
   * Matched on the parsed `learnerCode` rather than on the raw text: a request for
   * another child that happens to quote this code in an objective is not this
   * child's file to delete.
   */
  const requestsDir = `${VAULT.machine}/requests`;
  for (const f of await vault.list(requestsDir)) {
    const p = `${requestsDir}/${f}`;
    const raw = await vault.readRaw(p);
    if (!raw) continue;
    try {
      const req = JSON.parse(raw) as { learnerCode?: unknown };
      if (req.learnerCode === code) paths.push(p);
    } catch {
      // Not JSON, so not a request this application wrote. Left alone rather than
      // deleted on a filename: erasure must not remove what it cannot read.
    }
  }

  /*
   * And the two that are edits rather than deletions (COD-03).
   *
   * Her name is always declared, because the plan has to say it whether or not this
   * package can see it — see `NameStore`. The roster row is checked, because a plan
   * that lists a row she does not have would be a plan she cannot trust.
   */
  const { roster } = await loadRoster(vault);
  const entries: ForgetEntry[] = [
    { of: 'name', where: VAULT.names },
    ...(roster.learners.some((l) => l.code === code)
      ? [{ of: 'roster' as const, where: VAULT.roster }] : []),
  ];

  return {
    code,
    paths: [...new Set(paths)],
    entries,
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

/**
 * Removes only after the plan has been shown and confirmed.
 *
 * `names` is required, not optional — see `NameStore`. The two edits go last, after
 * the files: if the deletion throws halfway, a learner whose files are gone and whose
 * name is still known is recoverable, and one whose name is gone and whose files
 * remain is a folder nobody can identify.
 */
export async function executeForget(
  vault: Vault, plan: ForgetPlan, names: NameStore,
): Promise<{ removed: string[]; remaining: string[] }> {
  const removed: string[] = [];
  for (const p of plan.paths) {
    await rm(resolveInVault(vault.root, p), { recursive: true, force: true });
    removed.push(p);
  }

  for (const entry of plan.entries) {
    if (entry.of === 'name') {
      await names.forget(plan.code);
      removed.push(entry.where);
    } else {
      /*
       * The row goes, rather than being marked `status: 'forgotten'`.
       *
       * That enum value existed and nothing in the repository ever wrote it — the
       * project's signature defect, in the erasure path of all places. And it could
       * not be used even if somebody wanted to: a tombstoned row still holds the
       * code, so `verifyForgotten` would report it as a residue for ever. Erasure
       * means the row is gone; the dated line in `.rampa/erasures.md` is where the
       * fact that it happened is kept, with nothing of his in it (FR-217).
       */
      const { roster } = await loadRoster(vault);
      const kept = roster.learners.filter((l) => l.code !== plan.code);
      if (kept.length !== roster.learners.length) {
        await saveRoster(vault, { ...roster, learners: kept });
        removed.push(entry.where);
      }
    }
  }

  const remaining = await verifyForgotten(vault, plan.code, names);
  return { removed, remaining };
}

/**
 * The audit line erasure itself requires (`003` FR-217).
 *
 * A dated record that a learner's data was deleted, with the code and nothing else —
 * which is the one place the code is allowed to survive, because a right of erasure
 * you cannot evidence having honoured is not much of a right. Exempted **by name**
 * rather than by skipping `.rampa/` wholesale, which is what hid the composition
 * requests.
 */
const AUDIT_LOG = `${VAULT.machine}/erasures.md`;

/**
 * Search the whole vault for the code, so the claim can be made honestly.
 *
 * ## What changed, and why it was the most serious finding in the review
 *
 * This function's entire job is to make «he borrado todo lo de X» a true sentence,
 * and it was **structurally unable to see three of the five places the code
 * survived**: it walked four directories, and `handover/` and `.rampa/` were not
 * among them. Worse, one residue was invisible in principle rather than by
 * omission — her real name in `.rampa/names.enc` is ciphertext, so no text search
 * over that file can ever find anything, and the e2e that was supposed to cover it
 * asserted exactly that and passed on nothing.
 *
 * So: six directories, the audit line exempted by name, and the encrypted map asked
 * rather than read.
 */
export async function verifyForgotten(
  vault: Vault, code: string, names: NameStore,
): Promise<string[]> {
  const hits: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await vault.list(dir)) {
      const p = `${dir}/${entry}`;
      if (p === AUDIT_LOG) continue;
      if (entry.includes('.')) {
        const raw = await vault.readRaw(p);
        if (raw && new RegExp(`(?<![A-Za-z0-9])${code}(?![A-Za-z0-9])`).test(raw)) hits.push(p);
      } else await walk(p);
    }
  };
  for (const top of [
    VAULT.profiles, VAULT.material, VAULT.output, VAULT.memory,
    VAULT.handover, VAULT.machine,
  ]) await walk(top);

  /*
   * And the one a search cannot answer. Asked of the store that holds the key,
   * because `(?<![A-Za-z0-9])E38(?![A-Za-z0-9])` over base64 is a check that always
   * passes and proves nothing — which is how the most personal datum in the system
   * survived erasure with a green test beside it.
   */
  if (await names.knows(code)) hits.push(VAULT.names);

  return hits;
}

/** A dated line with no learner content in it. */
export const tombstone = (code: string) =>
  `- ${new Date().toISOString().slice(0, 10)} · ${code} · datos eliminados a petición\n`;
