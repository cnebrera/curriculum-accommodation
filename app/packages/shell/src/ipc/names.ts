import { safeStorage } from 'electron';
import { redact, findProbableNames, VAULT } from '@rampa/core';
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

  /** Used by the UI to warn before sending, never to rewrite (006 FR-419). */
  handle('names:check', async (text: string) => {
    const known = await knownNames();
    const r = redact(text, known);
    return { flagged: r.flagged.length ? r.flagged : findProbableNames(text), replaced: r.replaced };
  });
}
