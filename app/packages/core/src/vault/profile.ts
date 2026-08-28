import type { Vault } from './io.js';
import { learnerProfile, learnerNotes, learnerOverlay, VAULT } from './paths.js';
import { profileSchema, rosterSchema, validateWithRepair, type Profile, type Roster } from './schema.js';
import { stringifyFrontMatter, type Repair } from './parse.js';

export interface LoadedLearner {
  profile: Profile;
  notes: string;
  /** Instructions from the teaching team. Takes precedence over the corpus. */
  overlay: string | null;
  repairs: Repair[];
}

/**
 * A learner is a directory, not three files sharing a prefix. A teacher with
 * thirty learners across several groups needs it, and a flat vault stops
 * working in week two.
 */
export async function loadLearner(vault: Vault, code: string): Promise<LoadedLearner> {
  const repairs: Repair[] = [];

  const pDoc = await vault.readDoc(learnerProfile(code));
  repairs.push(...(pDoc?.repairs ?? []));
  const merged = { code, ...(pDoc?.data ?? {}) };
  const { value, unparsed, repairs: schemaRepairs } =
    validateWithRepair(profileSchema, merged, learnerProfile(code));
  repairs.push(...schemaRepairs);

  const nDoc = await vault.readDoc(learnerNotes(code));
  repairs.push(...(nDoc?.repairs ?? []));

  const oDoc = await vault.readDoc(learnerOverlay(code));
  repairs.push(...(oDoc?.repairs ?? []));

  const profile: Profile = { ...value, code };
  if (Object.keys(unparsed).length) profile._unparsed = unparsed;

  return {
    profile,
    notes: nDoc?.body ?? '',
    overlay: oDoc?.exists ? (oDoc.body || '').trim() || null : null,
    repairs,
  };
}

export async function saveProfile(vault: Vault, p: Profile): Promise<void> {
  const { _unparsed, notes: _n, ...rest } = p;
  const data: Record<string, unknown> = { ...rest, ...(_unparsed ?? {}) };
  await vault.writeDoc(learnerProfile(p.code), data, '');
}

/** Appends a dated note. Never rewrites what the teacher already wrote. */
export async function appendNote(vault: Vault, code: string, heading: string, text: string): Promise<void> {
  const existing = (await vault.readRaw(learnerNotes(code))) ?? '';
  const stamp = new Date().toISOString().slice(0, 10);
  const head = existing.trim().length
    ? existing.trimEnd()
    : stringifyFrontMatter({ learner: code, updated: stamp }, '').trimEnd();
  await vault.writeRaw(learnerNotes(code), `${head}\n\n## ${stamp} · ${heading}\n${text.trim()}\n`);
}

export async function loadRoster(vault: Vault): Promise<{ roster: Roster; repairs: Repair[] }> {
  const doc = await vault.readDoc(VAULT.roster);
  const { value, repairs } = validateWithRepair(rosterSchema, doc?.data ?? {}, VAULT.roster);
  return { roster: value, repairs: [...(doc?.repairs ?? []), ...repairs] };
}

export async function saveRoster(vault: Vault, roster: Roster): Promise<void> {
  await vault.writeDoc(VAULT.roster, roster as unknown as Record<string, unknown>, '');
}

/** Roster free text long enough to hold a name is worth a warning, not a refusal. */
export function rosterNameRisk(roster: Roster): string[] {
  const risky: string[] = [];
  for (const l of roster.learners) {
    for (const [k, v] of Object.entries(l)) {
      if (typeof v === 'string' && v.length > 24 && k !== 'code') {
        risky.push(`El campo "${k}" de ${l.code} es largo. Comprueba que no lleva el nombre de nadie.`);
      }
    }
  }
  return risky;
}

export async function listLearners(vault: Vault): Promise<string[]> {
  const entries = await vault.list(VAULT.profiles);
  const out: string[] = [];
  for (const e of entries) {
    if (e === 'archive' || e.includes('.')) continue;
    if (await vault.exists(learnerProfile(e))) out.push(e);
  }
  return out;
}
