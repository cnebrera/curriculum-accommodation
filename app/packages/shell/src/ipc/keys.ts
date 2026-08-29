import { safeStorage, app } from 'electron';
import { PROVIDERS, providerById, providerFor } from '@rampa/providers';
import { checkKeyShape } from '@rampa/core';
import { loadServices } from './corpus.js';
import { CredentialStore, today, type Crypto } from '../credentials.js';
import { handle } from './wrap.js';

/**
 * The API key lives outside the vault, in the OS user's application data: it is
 * the teacher's credential, not part of her records, and a vault she shares or
 * hands over must not carry it.
 *
 * One key per service since `009` T034. The store itself is Electron-free and
 * tested in `packages/shell/test/credentials.test.ts`; this file is the thin
 * Electron edge — the OS keyring and the IPC surface.
 */
const crypto: Crypto = {
  available: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plain) => safeStorage.encryptString(plain),
  decrypt: (cipher) => safeStorage.decryptString(cipher),
};

let store: CredentialStore | null = null;
const credentials = (): CredentialStore =>
  (store ??= new CredentialStore(app.getPath('userData'), crypto));

/** What a job needs: the active service and its key. */
export const currentKey = async (): Promise<{ providerId?: string; key?: string }> => {
  const c = await credentials().current();
  return c ? { providerId: c.serviceId, key: c.key } : {};
};

/** The `Provider` for the active service, resolved through the catalogue. */
export async function activeProvider() {
  const c = await credentials().current();
  if (!c) return null;
  const catalogue = await loadServices();
  const entry = catalogue.find((s) => s.id === c.serviceId);
  const provider = entry ? providerFor(entry, catalogue) : providerById(c.serviceId);
  return provider ? { provider, key: c.key } : null;
}

export function registerKeysIpc(): void {
  /** Onboarding reads this, so a changed free tier is an update, not a release. */
  handle('providers:list', () =>
    PROVIDERS.map((p) => ({
      id: p.id, label: p.label, keyUrl: p.keyUrl,
      requiresPaymentCard: p.requiresPaymentCard, defaultModel: p.defaultModel,
    })));

  /**
   * Everything decidable offline, decided offline (009 T030, FR-722).
   *
   * Runs here because it needs the whole catalogue to identify a key by its
   * longest matching prefix, and handing the renderer every service's key prefix
   * just to run the check there would be a second copy of the catalogue living
   * somewhere no test reads it.
   */
  handle('providers:shapeCheck', async (serviceId: string, raw: string) => {
    const catalogue = await loadServices();
    const service = catalogue.find((s) => s.id === serviceId);
    if (!service) return { ok: false, kind: 'unknown' };
    const v = checkKeyShape(raw, service, catalogue);
    // The normalised key crosses back, so the renderer sends for validation what
    // she *meant* to paste rather than what the clipboard wrapped it in.
    return v.ok ? { ok: true, key: v.key } : { ok: false, kind: v.kind, ownerId: v.ownerId };
  });

  handle('providers:validate', async (providerId: string, key: string) => {
    const catalogue = await loadServices();
    const entry = catalogue.find((s) => s.id === providerId);
    const p = entry ? providerFor(entry, catalogue) : providerById(providerId);
    if (!p) return { ok: false, reason: 'unknown', message: 'No conozco ese servicio.' };
    return p.validateKey(key);
  });

  /**
   * Store a key. **The caller has already validated it** (FR-730, T035).
   *
   * That ordering is the whole guarantee: a failed replacement never reaches
   * this handler, so the key she had keeps working without an undo path that
   * somebody has to remember to write.
   */
  handle('providers:save', async (providerId: string, key: string) => {
    await credentials().put(providerId, key, today());
    return true;
  });

  handle('providers:current', async () => {
    const c = await credentials().current();
    return { providerId: c?.serviceId ?? null, configured: Boolean(c) };
  });

  /** The connection screen (009 T036). Never the key itself (FR-729). */
  handle('providers:connections', async () => credentials().summary());

  /** Switch to a service she has already connected. Stores nothing. */
  handle('providers:activate', async (serviceId: string) => credentials().activate(serviceId));

  handle('providers:forget', async (serviceId: string) => {
    await credentials().forget(serviceId);
    return true;
  });
}
