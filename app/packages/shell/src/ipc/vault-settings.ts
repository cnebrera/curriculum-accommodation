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
  /**
   * Her display preferences (spec 010 T026). Here rather than in the vault
   * because they are hers but they are not her professional record: a handover
   * packet or a vault backup must not carry them (FR-820).
   */
  /**
   * She has been told that a name visible in a photograph reaches her provider
   * (008 FR-609). Here rather than in the vault: it is a fact about this teacher
   * on this machine, and a handover packet must not carry it. Not per-learner
   * either — the warning is about her workflow, not about a child.
   */
  photoNameWarningAcknowledged?: boolean;
  /**
   * Where her pictogram set is (018 T014; a fetched set lands here too, `023`).
   *
   * Here and **not in the vault**, for the same reason `vaultRoot` is: it is an
   * absolute path on this machine, and a vault has to stay portable. What goes in
   * the vault is a note saying a set is in use and under which licence — so a
   * colleague who opens the folder learns what is required without inheriting a
   * path that does not exist on their laptop (US1 scenario 3).
   *
   * The set itself is never copied here and never indexed here: a cached index
   * would be a plaintext copy of somebody else's licensed content living inside
   * our vault.
   */
  pictogramSet?: {
    root: string;
    /** What the set's own LICENSE file said, when it had one. Shown, never parsed. */
    licence?: string;
    /** «1.243 imágenes · 980 palabras en español», as read at configuration time. */
    summary?: string;
    configuredOn: string;
  };
  /**
   * The pictogram licence she accepted, and when (023 T009, FR-2104).
   *
   * **Nothing may be fetched until this exists**, which is the whole basis on which
   * the download is legitimate: Rampa is a user agent acting on her instruction under
   * terms she has read, not a program that copies somebody else's licensed work onto
   * a teacher's computer.
   *
   * Here rather than in the vault, like the path above and for the same reason —
   * except this one is also personal in a way a path is not: it records an agreement
   * *she* made. A handover packet must not carry a colleague's acceptance, and a
   * vault restored onto a new laptop must ask again.
   *
   * `licence` and `publisher` are recorded as accepted, not looked up later: the text
   * at ARASAAC can change and Rampa cannot detect that. What she agreed to is what
   * this says she agreed to.
   */
  pictogramLicence?: {
    publisher: string;
    licence: string;
    acceptedOn: string;
  };
  display?: {
    theme?: 'light' | 'dark' | 'system';
    text?: 'normal' | 'large' | 'xlarge';
    contrast?: 'normal' | 'high';
    motion?: 'normal' | 'reduced';
  };
  /**
   * The newest release notice she dismissed (`034` FR-3203).
   *
   * Here and not in the vault: which notice she dismissed on **this machine** is a fact
   * about this installation, and a vault carrying it would dismiss the notice on her
   * colleague's laptop too — the same reasoning that keeps the pictogram licence
   * acceptance out of a handover packet.
   *
   * The notice returns only for something **newer**, which is the difference between a
   * notice and a nag: a nag is one that comes back for the same news.
   */
  dismissedRelease?: string;
  /**
   * Whether she has said Rampa may look for updates at launch (`034` research R5).
   *
   * **Absent means no**, and that is the requirement rather than a default. A version
   * check is a phone-home, and an outbound request on launch from a machine handling
   * children's data is exactly what a school's DPO objects to — so it exists only
   * because she turned it on, having read what it sends.
   */
  checkAtLaunch?: boolean;
  /** When the last launch check ran, so «as much as weekly» is a fact and not a hope. */
  lastLaunchCheck?: string;
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

export async function loadDisplay(dir: string): Promise<AppSettings['display']> {
  return (await loadSettings(dir)).display;
}

export async function saveDisplay(dir: string, display: AppSettings['display']): Promise<void> {
  const current = await loadSettings(dir);
  await saveSettings(dir, { ...current, display });
}

export async function photoWarningSeen(dir: string): Promise<boolean> {
  return (await loadSettings(dir)).photoNameWarningAcknowledged === true;
}

export async function acknowledgePhotoWarning(dir: string): Promise<void> {
  const current = await loadSettings(dir);
  await saveSettings(dir, { ...current, photoNameWarningAcknowledged: true });
}
