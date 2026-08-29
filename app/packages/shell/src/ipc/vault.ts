import { app, dialog, BrowserWindow } from 'electron';
import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import { Vault, resolveInVault, RampaError, VAULT, logger } from '@rampa/core';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { handle } from './wrap.js';
import { rememberedVaultRoot, rememberVaultRoot, loadDisplay, saveDisplay } from './vault-settings.js';

/**
 * Every privileged filesystem operation crosses this boundary, which is what
 * makes "writes confined to the vault" enforceable in one place rather than a
 * rule scattered across the codebase (007 FR-508).
 *
 * The renderer has no filesystem access at all.
 */
let vault: Vault | null = null;
let watcher: FSWatcher | null = null;

export const currentVault = (): Vault => {
  if (!vault) throw new RampaError('vault-unreadable', 'Todavía no has elegido dónde guardar tus cosas.');
  return vault;
};

export const setVault = (root: string): Vault => { vault = new Vault(root); return vault; };

/**
 * Reopen the vault remembered from the previous session (T083, 006 US1-3).
 *
 * Called from main before the window is created. A missing or moved folder
 * fails safe: the app opens on the vault step of onboarding instead of
 * crashing, and nothing is created at the stale path.
 */
export async function reopenVault(): Promise<string | null> {
  const root = await rememberedVaultRoot(app.getPath('userData'));
  if (!root) return null;
  const v = setVault(root);
  await bootstrap(v);
  logger.info('vault.reopened', { root: '[vault]' });
  return root;
}

async function useVault(root: string): Promise<string> {
  const v = setVault(root);
  await bootstrap(v);
  await rememberVaultRoot(app.getPath('userData'), root);
  return v.root;
}

/** A default she can accept without making a decision (006 FR-402). */
export const defaultVaultPath = () => join(homedir(), 'Documentos', 'Rampa');

export function registerVaultIpc(getWindow: () => BrowserWindow | null): void {
  handle('vault:choose', async () => {
    const win = getWindow();
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: 'Elige dónde guardar tus cosas',
          defaultPath: defaultVaultPath(),
          properties: ['openDirectory', 'createDirectory'],
          buttonLabel: 'Usar esta carpeta',
        })
      : { canceled: true, filePaths: [] as string[] };
    if (res.canceled || !res.filePaths[0]) return null;
    return useVault(res.filePaths[0]);
  });

  handle('vault:use', async (root: string) => useVault(root));

  /** The root currently open, or null. Onboarding's resume check gates on this. */
  handle('vault:current', () => vault?.root ?? null);

  handle('vault:default', () => defaultVaultPath());

  /** Her display preferences. Never in the vault (spec 010 FR-820). */
  handle('settings:display', async () => loadDisplay(app.getPath('userData')));
  handle('settings:setDisplay', async (display: unknown) => {
    await saveDisplay(app.getPath('userData'), display as never);
    return true;
  });

  handle('vault:read', async (relPath: string) => {
    const doc = await currentVault().readDoc(relPath);
    return doc ? { content: doc.body, data: doc.data, repairs: doc.repairs, exists: doc.exists } : null;
  });

  handle('vault:write', async (relPath: string, content: string) => {
    // Refusal, not sanitisation: a path derived from content is a signal.
    resolveInVault(currentVault().root, relPath);
    await currentVault().writeRaw(relPath, content);
    return true;
  });

  handle('vault:list', async (relDir: string) => currentVault().list(relDir));
}

/** Create the folders once, so a teacher opening the vault sees a shape she can read. */
async function bootstrap(v: Vault): Promise<void> {
  for (const dir of [VAULT.profiles, VAULT.material, VAULT.output, VAULT.journal, VAULT.machine, VAULT.recipesLocal]) {
    await v.ensureDir(dir);
  }
  if (!(await v.exists(VAULT.house))) {
    await v.writeRaw(VAULT.house, [
      '# Cómo trabajo yo', '',
      'Escribe aquí lo que quieras que Rampa haga siempre igual, con tus palabras.',
      'Por ejemplo: el tamaño de letra que usas, si los exámenes llevan la puntuación',
      'a la vista, qué colores no usas nunca.', '',
      'Esto es una guía de estilo, no un diario: si crece más de dos páginas,',
      'te avisaré para resumirla.', '',
    ].join('\n'));
  }
}

/** External edits are picked up: the vault is hers, and she may edit it anywhere (006 FR-409). */
export function startWatching(getWindow: () => BrowserWindow | null): void {
  stopWatching();
  if (!vault) return;
  watcher = chokidarWatch(vault.root, {
    ignoreInitial: true,
    ignored: (p: string) => p.includes(`${VAULT.machine}`),
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
  });
  const notify = (path: string) => getWindow()?.webContents.send('vault:changed', path);
  watcher.on('add', notify).on('change', notify).on('unlink', notify);
}

export function stopWatching(): void { void watcher?.close(); watcher = null; }
