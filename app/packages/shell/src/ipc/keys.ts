import { ipcMain, safeStorage } from 'electron';
import { app } from 'electron';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { PROVIDERS, providerById } from '@rampa/providers';

/**
 * The API key lives outside the vault, in the OS user's application data: it is
 * the teacher's credential, not part of her records, and a vault she shares or
 * hands over must not carry it.
 */
const keyFile = () => join(app.getPath('userData'), 'credentials.enc');

interface Keys { providerId?: string; key?: string; }
let cache: Keys | null = null;

async function load(): Promise<Keys> {
  if (cache) return cache;
  try {
    const raw = await readFile(keyFile());
    cache = JSON.parse(safeStorage.decryptString(raw)) as Keys;
  } catch { cache = {}; }
  return cache;
}

async function save(k: Keys): Promise<void> {
  cache = k;
  await mkdir(dirname(keyFile()), { recursive: true });
  if (!safeStorage.isEncryptionAvailable()) return;
  await writeFile(keyFile(), safeStorage.encryptString(JSON.stringify(k)));
}

export const currentKey = async (): Promise<Keys> => load();

export function registerKeysIpc(): void {
  /** Onboarding reads this, so a changed free tier is an update, not a release. */
  ipcMain.handle('providers:list', () =>
    PROVIDERS.map((p) => ({
      id: p.id, label: p.label, keyUrl: p.keyUrl,
      requiresPaymentCard: p.requiresPaymentCard, defaultModel: p.defaultModel,
    })));

  ipcMain.handle('providers:validate', async (_e, providerId: string, key: string) => {
    const p = providerById(providerId);
    if (!p) return { ok: false, reason: 'unknown', message: 'No conozco ese servicio.' };
    return p.validateKey(key);
  });

  ipcMain.handle('providers:save', async (_e, providerId: string, key: string) => {
    await save({ providerId, key });
    return true;
  });

  ipcMain.handle('providers:current', async () => {
    const k = await load();
    return { providerId: k.providerId ?? null, configured: Boolean(k.key) };
  });
}
