import { ipcMain, dialog, BrowserWindow } from 'electron';
import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import { Vault, resolveInVault, RampaError, VAULT } from '@rampa/core';
import { join } from 'node:path';
import { homedir } from 'node:os';

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

/** A default she can accept without making a decision (006 FR-402). */
export const defaultVaultPath = () => join(homedir(), 'Documentos', 'Rampa');

export function registerVaultIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('vault:choose', async () => {
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
    const v = setVault(res.filePaths[0]);
    await bootstrap(v);
    return v.root;
  });

  ipcMain.handle('vault:use', async (_e, root: string) => {
    const v = setVault(root);
    await bootstrap(v);
    return v.root;
  });

  ipcMain.handle('vault:default', () => defaultVaultPath());

  ipcMain.handle('vault:read', async (_e, relPath: string) => {
    const doc = await currentVault().readDoc(relPath);
    return doc ? { content: doc.body, data: doc.data, repairs: doc.repairs, exists: doc.exists } : null;
  });

  ipcMain.handle('vault:write', async (_e, relPath: string, content: string) => {
    // Refusal, not sanitisation: a path derived from content is a signal.
    resolveInVault(currentVault().root, relPath);
    await currentVault().writeRaw(relPath, content);
    return true;
  });

  ipcMain.handle('vault:list', async (_e, relDir: string) => currentVault().list(relDir));
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
