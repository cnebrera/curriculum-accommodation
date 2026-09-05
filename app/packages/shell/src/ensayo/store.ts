import { cp, rm, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Vault, RampaError } from '@rampa/core';
import { sampleRoot } from './sample.js';
import { ensayoRoot } from './root.js';

/**
 * The rehearsal store: one new root, and zero new facts in her vault (035 T004, FR-3306).
 *
 * ## Why a second vault rather than a flag
 *
 * A rehearsal that lived in her real folder behind an `ensayo: true` would be one query
 * away from a fictional child in a real caseload, and «one query» is a code path somebody
 * writes on a Tuesday. Here the separation is a **directory**: everything that takes a
 * `Vault` — `resolveDocument`, `isSignedOff`, the renderers, the record scan — runs over
 * this one unchanged, and the only thing that decides which vault is the IPC layer.
 *
 * That is what makes SC-3303 checkable rather than trusted: hash every byte of her real
 * vault, rehearse completely, hash again. Identical, because nothing here can reach it.
 *
 * ## What is deliberately not in it
 *
 * No `.rampa/costs.json`. A would-be cost is shown in her language and written **nowhere**
 * — an empty ledger and no ledger are different facts, and the second is the true one.
 * No `memory/`: there is no correction step to write one. No credentials: they were never
 * in any vault.
 *
 * ## Discard means delete
 *
 * `discard()` removes the root entirely (FR-3308). Not «mark it finished», not «move it
 * aside»: a rehearsal she ended should leave nothing behind, and re-entering re-seeds from
 * the authored sample. `ensayo.json` exists so that closing the laptop mid-rehearsal and
 * coming back lands her where she was, not at the beginning.
 */

export interface EnsayoState {
  /** How far she got, so a restart resumes rather than restarting. */
  step: 'brought' | 'verified' | 'adapted' | 'reviewed' | 'signed' | 'printed';
  startedAt: string;
}

const STATE = '.rampa/ensayo.json';

/**
 * The rehearsal vault, seeded if it is not there yet.
 *
 * Idempotent: re-entering an unfinished rehearsal returns the same root with her work in
 * it. Starting over is `discard()` followed by this.
 */
export async function ensayoVault(startedAt: string): Promise<Vault> {
  const root = ensayoRoot();
  const vault = new Vault(root);

  if (!(await exists(join(root, STATE)))) {
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    /*
     * Copied, not linked and not read in place. She is going to sign a document and print
     * it — the rehearsal has to be writable, and the authored sample has to stay exactly
     * as it was written for the next person who opens Rampa.
     */
    await cp(sampleRoot(), root, { recursive: true, filter: (src) => !src.endsWith('manifest.yaml') });
    await writeState(root, { step: 'brought', startedAt });
  }

  return vault;
}

/** Where she got to, or `null` when there is no rehearsal in progress. */
export async function ensayoState(): Promise<EnsayoState | null> {
  try {
    return JSON.parse(await readFile(join(ensayoRoot(), STATE), 'utf8')) as EnsayoState;
  } catch {
    return null;
  }
}

export async function advance(step: EnsayoState['step']): Promise<void> {
  const state = await ensayoState();
  if (!state) throw new RampaError('vault-unreadable', 'No hay ningún ensayo abierto.');
  await writeState(ensayoRoot(), { ...state, step });
}

/**
 * She is done, or she connected a real service. The rehearsal leaves nothing behind
 * (FR-3308).
 *
 * The whole root, `force: true`, and no bookkeeping afterwards: «se acabó» is a state
 * with no file in it. A tombstone would be one more thing that has to be right.
 */
export async function discard(): Promise<void> {
  await rm(ensayoRoot(), { recursive: true, force: true });
}

const exists = async (p: string): Promise<boolean> => {
  try { await access(p); return true; } catch { return false; }
};

async function writeState(root: string, state: EnsayoState): Promise<void> {
  await mkdir(join(root, '.rampa'), { recursive: true });
  await writeFile(join(root, STATE), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
