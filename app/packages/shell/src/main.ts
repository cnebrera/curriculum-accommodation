import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'node:path';
import { registerVaultIpc, reopenVault, startWatching, stopWatching } from './ipc/vault.js';
import { registerNamesIpc } from './ipc/names.js';
import { registerKeysIpc } from './ipc/keys.js';
import { registerCorpusIpc } from './ipc/corpus.js';
import { registerCostIpc } from './ipc/cost.js';
import { registerMemoryIpc } from './ipc/memory.js';
import { registerAdaptIpc } from './jobs/adapt.js';
import { registerIngestIpc } from './jobs/ingest.js';
import { registerPrintIpc } from './jobs/print.js';
import { registerSignoffIpc } from './jobs/signoff.js';
import { startLogging, registerDiagnosticsIpc } from './ipc/diagnostics.js';

let win: BrowserWindow | null = null;
const getWindow = () => win;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 640,
    title: 'Rampa',
    backgroundColor: '#fcfcfa',
    webPreferences: {
      // electron-vite emits main and preload into SEPARATE directories, so this
      // must climb out of out/main/. It said 'preload.js' — resolving to
      // out/main/preload.js, which never existed — so the preload silently
      // failed to load, window.rampa was undefined, and the packaged app was a
      // blank window with every IPC call dead. Invisible to typecheck, to the
      // unit suite, and to `npm run build`, which reported success.
      preload: join(import.meta.dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // External links open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' }; });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(import.meta.dirname, '../renderer/index.html'));

  win.on('closed', () => { win = null; });
  startWatching(getWindow);
}

/** Menu in Spanish: the interface speaks the teacher's language (006 FR-406). */
function buildMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Rampa', submenu: [{ role: 'about', label: 'Acerca de Rampa' }, { type: 'separator' },
      { role: 'quit', label: 'Salir' }] },
    { label: 'Editar', submenu: [
      { role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' },
      { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }] },
    { label: 'Ver', submenu: [
      { role: 'reload', label: 'Recargar' }, { role: 'resetZoom', label: 'Tamaño normal' },
      { role: 'zoomIn', label: 'Más grande' }, { role: 'zoomOut', label: 'Más pequeño' }] },
  ]));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  void app.whenReady().then(async () => {
    await startLogging();
    // Reopen the vault from the previous session BEFORE anything can ask for it
    // (T083). Without this the app only worked until its first quit.
    await reopenVault().catch(() => null);
    registerDiagnosticsIpc();
    registerVaultIpc(getWindow);
    registerNamesIpc();
    registerKeysIpc();
    registerCorpusIpc();
    registerCostIpc();
    registerMemoryIpc();
    registerAdaptIpc(getWindow);
  registerIngestIpc(getWindow);
    registerPrintIpc();
    registerSignoffIpc();
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { stopWatching(); if (process.platform !== 'darwin') app.quit(); });
}
