import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Persistence of the vault location (006 FR-401, US1-3 — T083).
 *
 * Before this existed, the vault was only ever opened from the onboarding step,
 * so the application broke on its second launch: every vault-dependent call
 * threw. The chosen root is remembered in the OS application-data directory —
 * never inside the vault itself, because the vault must stay portable and a
 * settings file naming an absolute path is machine-specific by nature.
 *
 * Electron-free on purpose: the caller passes the settings directory, so this
 * logic is testable in the offline suite.
 */
export interface AppSettings {
  vaultRoot?: string;
}

const settingsPath = (dir: string) => join(dir, 'settings.json');

export async function loadSettings(dir: string): Promise<AppSettings> {
  try {
    return JSON.parse(await readFile(settingsPath(dir), 'utf8')) as AppSettings;
  } catch {
    return {}; // first run, or an unreadable file: both mean "no vault yet"
  }
}

export async function saveSettings(dir: string, s: AppSettings): Promise<void> {
  await mkdir(dirname(settingsPath(dir)), { recursive: true });
  await writeFile(settingsPath(dir), JSON.stringify(s, null, 2) + '\n', 'utf8');
}

/**
 * The remembered root, but only if it still exists and is a directory.
 *
 * A vault on a network drive that disappeared, or a folder the teacher moved,
 * must fail safe into the vault step of onboarding — never crash, and never
 * silently create an empty vault at a stale path (006 Edge Cases).
 */
export async function rememberedVaultRoot(dir: string): Promise<string | null> {
  const { vaultRoot } = await loadSettings(dir);
  if (!vaultRoot) return null;
  try {
    return (await stat(vaultRoot)).isDirectory() ? vaultRoot : null;
  } catch {
    return null;
  }
}

export async function rememberVaultRoot(dir: string, root: string): Promise<void> {
  const current = await loadSettings(dir);
  await saveSettings(dir, { ...current, vaultRoot: root });
}
