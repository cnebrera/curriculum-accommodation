import { safeStorage } from 'electron';
import {
  redact, findProbableNames, loadLearner, loadJournal, VAULT, nameWords,
} from '@rampa/core';
import { currentVault } from './vault.js';
import { handle } from './wrap.js';

/**
 * The name map: stored encrypted, kept inside the vault, and excluded from
 * every export (006 FR-417).
 *
 * Three requirements pull against each other — she must see real names, the
 * names must be absent from anything shared, and the vault must be portable by
 * copying. Keeping ciphertext in the vault satisfies all three: a backup stays
 * complete, and a copied or shared vault leaks nothing because the recipient
 * sees an opaque file.
 *
 * The cost is that OS encryption is bound to this user on this machine, so
 * moving computers loses the mapping. That failure is benign — profiles, notes
 * and history are intact, only the code-to-name display is lost — and an
 * explicit export covers the deliberate move.
 */
type NameMap = Record<string, string>;
let cache: NameMap | null = null;

export interface EncryptionStatus {
  available: boolean;
  /** Said plainly rather than implying a protection we do not have. */
  message: string;
}

/**
 * On Linux `safeStorage` is backed by libsecret. Without a keyring, Electron
 * falls back to encryption with no real keystore behind it (research R15).
 * Writing weaker ciphertext and calling it encrypted is the failure this
 * project spent an ADR avoiding, so we probe and say so.
 */
export function encryptionStatus(): EncryptionStatus {
  const available = safeStorage.isEncryptionAvailable();
  return {
    available,
    message: available
      ? 'Los nombres se guardan cifrados en este equipo.'
      : 'En este equipo no puedo guardar los nombres de forma segura. ' +
        'Puedes seguir usando Rampa solo con los códigos, o instalar un gestor de claves del sistema.',
  };
}

async function load(): Promise<NameMap> {
  if (cache) return cache;
  const raw = await currentVault().readRaw(VAULT.names);
  if (!raw) return (cache = {});
  try {
    const buf = Buffer.from(raw, 'base64');
    cache = JSON.parse(safeStorage.decryptString(buf)) as NameMap;
  } catch {
    cache = {};   // unreadable on this machine: degrade to codes, never crash
  }
  return cache;
}

async function save(map: NameMap): Promise<void> {
  cache = map;
  if (!safeStorage.isEncryptionAvailable()) return;   // never write plaintext
  const enc = safeStorage.encryptString(JSON.stringify(map));
  await currentVault().writeRaw(VAULT.names, enc.toString('base64'));
}

export const knownNames = async (): Promise<Map<string, string>> => new Map(Object.entries(await load()));

/**
 * Her learners' names as **normalised single words** (`018` FR-1610, `023` FR-2109).
 *
 * ## The defect this closes
 *
 * `jobs/adapt.ts` built this set inline as
 * `new Set([...names.values()].map((n) => n.toLowerCase()))`, and it was wrong twice:
 *
 * 1. **Accents.** `matchWord` looks up `normalise(word)`, which folds them — «María»
 *    becomes `maria`. The set held `maría`. So the lookup missed, and **an accented
 *    name got a pictogram**: FR-1610 says a name must never be matched, and half the
 *    names in a Spanish classroom are accented.
 * 2. **Full names.** A stored name is «María Nebrera» and `matchWord` is asked about
 *    one word at a time, so neither «María» nor «Nebrera» was ever in the set — even
 *    unaccented ones missed.
 *
 * Found on 2026-09-02 while writing `023`'s word list, which needed the same set for
 * the sharper reason that its members would otherwise **leave her machine**. Ten of
 * the eleven unread fields in backlog G25 were found by writing something down; this
 * is the same shape.
 *
 * One function, so the two callers cannot disagree about what a name is.
 */
export const nameWordSet = async (): Promise<Set<string>> =>
  nameWords((await knownNames()).values());

/**
 * Words she has told us are not names (T090).
 *
 * Without this the pre-send gate would ask about the same word on every single
 * job, and a question asked every time is a question that gets clicked through
 * — which is FR-514's logic applied to names instead of to injections.
 */
const IGNORE_PATH = '.rampa/names-ignore.json';

async function ignored(): Promise<Set<string>> {
  const raw = await currentVault().readRaw(IGNORE_PATH);
  if (!raw) return new Set();
  try { return new Set((JSON.parse(raw) as string[]).map((s) => s.toLowerCase())); }
  catch { return new Set(); }
}

async function addIgnored(word: string): Promise<void> {
  const set = await ignored();
  set.add(word.toLowerCase());
  await currentVault().writeRaw(IGNORE_PATH, JSON.stringify([...set], null, 2) + '\n');
}

/**
 * Probable unknown names in text SHE wrote, minus what she has already dismissed.
 *
 * Scoped to teacher-authored segments on purpose: running the detector over the
 * corpus or the adapted material produces false positives on every mid-sentence
 * capital ("Lengua y Literatura"), and a detector that cries wolf protects
 * nothing.
 */
export async function unknownNamesIn(segments: string[]): Promise<string[]> {
  const known = await knownNames();
  const skip = await ignored();
  const found = new Set<string>();
  for (const segment of segments) {
    if (!segment?.trim()) continue;
    for (const candidate of redact(segment, known).flagged) {
      if (!skip.has(candidate.toLowerCase())) found.add(candidate);
    }
  }
  return [...found];
}

export function registerNamesIpc(): void {
  handle('names:status', () => encryptionStatus());

  handle('names:set', async (code: string, name: string) => {
    const map = await load();
    if (name.trim()) map[code] = name.trim(); else delete map[code];
    await save(map);
    return true;
  });

  /** Display only. Its result must never enter a payload. */
  handle('names:resolve', async (code: string) => (await load())[code] ?? null);

  handle('names:all', async () => await load());

  /** "No es un nombre" — remembered, so she is not asked again (T090). */
  handle('names:ignore', async (word: string) => { await addIgnored(word); return true; });

  /**
   * The words in her own text that look like names and are not known (`021`, from use).
   *
   * Exists so the screen can **offer the choice the error asks for**. `name-unconfirmed`
   * says «dime si es un alumno y lo sustituyo por su código, o márcalo como que no es un
   * nombre» — and until now there was nowhere to say either: `names:ignore` was exposed,
   * had a hook in the data layer, and no screen called it. A dead end that asked her a
   * question.
   *
   * Her notes, the overlay, the house style and **the whole journal** — deliberately a
   * superset of what a given run scans, since that one only loads the journal entries
   * matching the recipes it selected. Offering her a word that did not block this
   * particular run is a small cost; leaving her with no way to answer is the defect being
   * fixed.
   */
  handle('names:unknownFor', async (learnerCode: string) => {
    const vault = currentVault();
    const learner = await loadLearner(vault, learnerCode);
    const house = (await vault.readRaw(VAULT.house)) ?? '';
    const journal = await loadJournal(vault);
    return unknownNamesIn([
      learner.notes,
      learner.overlay ?? '',
      house,
      ...journal.map((j) => j.body),
    ]);
  });

  /** Used by the UI to warn before sending, never to rewrite (006 FR-419). */
  handle('names:check', async (text: string) => {
    const known = await knownNames();
    const r = redact(text, known);
    const skip = await ignored();
    const raw = r.flagged.length ? r.flagged : findProbableNames(text);
    return { flagged: raw.filter((n) => !skip.has(n.toLowerCase())), replaced: r.replaced };
  });
}
