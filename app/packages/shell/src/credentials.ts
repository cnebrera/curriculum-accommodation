/**
 * The credential store (009 T034/T035, data-model §"Credential store").
 *
 * One key per service, so switching does not destroy the one she had. Outside
 * the vault, because a credential is not part of her professional record and a
 * vault she hands over at the end of June must not carry it (FR-725).
 *
 * Electron-free by construction: `safeStorage` is injected. That is not
 * decoration — it is what makes the migration, the isolation between services
 * and the non-destructive replacement testable in the offline suite, which is
 * where the failure that matters lives. A store that loses a working key on a
 * failed switch is a store that locks a teacher out mid-lesson.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export interface StoredKey { key: string; verifiedAt: string }

export interface Credentials {
  /** The service a job uses. Exactly one. */
  active?: string;
  keys: Record<string, StoredKey>;
}

/** The shape `006` shipped. Read once, rewritten, never written again. */
interface LegacyCredentials { providerId?: string; key?: string }

export interface Crypto {
  available(): boolean;
  encrypt(plain: string): Buffer;
  decrypt(cipher: Buffer): string;
}

const EMPTY: Credentials = { keys: {} };

export class CredentialStore {
  private cache: Credentials | null = null;

  constructor(private readonly dir: string, private readonly crypto: Crypto) {}

  private get file(): string { return join(this.dir, 'credentials.enc'); }

  /**
   * Read, migrating the old single-key shape on the way through.
   *
   * Nobody has a real installation yet, so this is the cheapest this migration
   * will ever be (research R5). It is still written to survive being wrong:
   * an unreadable file reads as "no keys" rather than throwing, because the
   * alternative is an application that cannot start.
   */
  async load(): Promise<Credentials> {
    if (this.cache) return this.cache;
    let raw: Buffer;
    try { raw = await readFile(this.file); } catch { return (this.cache = { ...EMPTY }); }

    let text: string;
    try { text = this.crypto.decrypt(raw); } catch { return (this.cache = { ...EMPTY }); }

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return (this.cache = { ...EMPTY }); }
    if (!parsed || typeof parsed !== 'object') return (this.cache = { ...EMPTY });

    const obj = parsed as Credentials & LegacyCredentials;

    // The new shape.
    if (obj.keys && typeof obj.keys === 'object') {
      const keys: Record<string, StoredKey> = {};
      for (const [id, v] of Object.entries(obj.keys)) {
        if (v && typeof v === 'object' && typeof (v as StoredKey).key === 'string') {
          keys[id] = { key: (v as StoredKey).key, verifiedAt: (v as StoredKey).verifiedAt ?? '' };
        }
      }
      const active = obj.active && keys[obj.active] ? obj.active : Object.keys(keys)[0];
      return (this.cache = { ...(active ? { active } : {}), keys });
    }

    // The old shape: move it under `keys[providerId]` and keep it working.
    if (typeof obj.providerId === 'string' && typeof obj.key === 'string' && obj.key) {
      const migrated: Credentials = {
        active: obj.providerId,
        // No verification date exists for a key stored before this field did.
        // Empty rather than today's date: claiming we checked it this morning
        // would be a fabrication on the one screen that reports that fact.
        keys: { [obj.providerId]: { key: obj.key, verifiedAt: '' } },
      };
      this.cache = migrated;
      await this.write(migrated);
      return migrated;
    }

    return (this.cache = { ...EMPTY });
  }

  private async write(c: Credentials): Promise<void> {
    this.cache = c;
    await mkdir(dirname(this.file), { recursive: true });
    // No encryption available (a Linux box with no keyring) means the key lives
    // only in memory for this session. Writing it in the clear would be worse
    // than asking for it again tomorrow.
    if (!this.crypto.available()) return;
    await writeFile(this.file, this.crypto.encrypt(JSON.stringify(c)));
  }

  /**
   * Store a key that has already been validated, and make it active.
   *
   * **Validation precedes storage, always** (FR-730). This method does not
   * validate and must never be called before validation succeeds: that ordering
   * is what makes "a failed replacement leaves the old one working" true by
   * construction rather than by an undo path that someone has to remember to
   * write.
   */
  async put(serviceId: string, key: string, verifiedAt: string): Promise<void> {
    const current = await this.load();
    await this.write({
      active: serviceId,
      keys: { ...current.keys, [serviceId]: { key, verifiedAt } },
    });
  }

  /** Switch to a service she has already connected. Never stores a key. */
  async activate(serviceId: string): Promise<boolean> {
    const current = await this.load();
    if (!current.keys[serviceId]) return false;
    await this.write({ ...current, active: serviceId });
    return true;
  }

  async forget(serviceId: string): Promise<void> {
    const current = await this.load();
    const keys = { ...current.keys };
    delete keys[serviceId];
    const active = current.active === serviceId ? Object.keys(keys)[0] : current.active;
    await this.write({ ...(active ? { active } : {}), keys });
  }

  /** The active service and its key, for a job. */
  async current(): Promise<{ serviceId: string; key: string } | null> {
    const c = await this.load();
    const id = c.active;
    const entry = id ? c.keys[id] : undefined;
    return id && entry ? { serviceId: id, key: entry.key } : null;
  }

  /**
   * What the connection screen may see.
   *
   * The key itself is never in here (FR-729). A screen that receives a
   * credential in order to display four asterisks is a screen that has the
   * credential, and there is no reason for it to.
   */
  async summary(): Promise<{ active: string | null; connected: Array<{ serviceId: string; verifiedAt: string }> }> {
    const c = await this.load();
    return {
      active: c.active ?? null,
      connected: Object.entries(c.keys).map(([serviceId, v]) => ({ serviceId, verifiedAt: v.verifiedAt })),
    };
  }
}

/** Today, as `yyyy-mm-dd`. Injected in tests so a date never depends on the clock. */
export const today = (now = new Date()): string => now.toISOString().slice(0, 10);
