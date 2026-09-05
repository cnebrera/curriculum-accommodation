import { app, dialog, shell, BrowserWindow } from 'electron';
import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import { Vault, resolveInVault, RampaError, VAULT, logger, vaultIsNewer, vaultSchema } from '@rampa/core';
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
  /**
   * Open a document from the vault in her own editor (014 T014).
   *
   * The path comes from the renderer, so it goes through `resolveInVault`, which
   * **refuses** rather than sanitises (007 FR-508) — a path trying to leave the
   * vault is a signal, not a typo, and quietly rewriting it into something
   * plausible would hide exactly the event worth seeing.
   *
   * This is the generalisation of `job:openForEditing`, which could only open an
   * adapted document. A record row offers the source and the read text as well,
   * and those are equally hers.
   */
  handle('vault:open', async (relPath: string) => {
    const vault = currentVault();
    const abs = resolveInVault(vault.root, relPath);
    const problem = await shell.openPath(abs);
    if (problem) throw new RampaError('vault-unreadable', problem);
    return abs;
  });
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

  /**
   * Was this vault written by a newer build than this one? (`032` FR-3008, P50.)
   *
   * The case that motivated the marker: a PT and a tutor sharing a vault over OneDrive
   * with different versions installed. The older application reads shapes it does not
   * know — per-area CUR today, whatever comes next tomorrow — and shows less than the
   * folder contains, **with nothing on screen to say so**.
   *
   * `vaultIsNewer` existed from the day the marker was built and nothing called it: a
   * function written, typed and read by nobody, which is this repository's most-found
   * defect. This is its reader.
   *
   * It reports; it never refuses. Her work is in there, and `014` already survives files
   * it cannot fully parse.
   */
  handle('vault:isNewer', async () => vaultIsNewer(await vaultSchema(currentVault())));

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
