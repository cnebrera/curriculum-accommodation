import { app, BrowserWindow, Menu, session, shell } from 'electron';
import { join } from 'node:path';
import { registerVaultIpc, reopenVault, startWatching, stopWatching } from './ipc/vault.js';
import { registerNamesIpc } from './ipc/names.js';
import { registerKeysIpc } from './ipc/keys.js';
import { registerCorpusIpc, setCorpusStore } from './corpus/index.js';
import { registerCoordinationIpc } from './ipc/coordination.js';
import { registerCostIpc } from './ipc/cost.js';
import { registerMemoryIpc } from './ipc/memory.js';
import { registerRecordIpc } from './ipc/record.js';
import { registerAdaptIpc } from './ipc/adapt.js';
import { registerComposeIpc } from './ipc/compose.js';
import { registerPictogramIpc } from './ipc/pictograms.js';
import { registerStructureIpc } from './ipc/structure.js';
import { registerEnsayoIpc } from './ensayo/ipc.js';
import { watchNetworkIfTesting } from './net-counter.js';
import { registerGuideIpc } from './ipc/guide.js';
import { registerConversationIpc } from './ipc/conversation.js';
import { registerIngestIpc } from './ipc/ingest.js';
import { registerPrintIpc } from './ipc/print.js';
import { registerSignoffIpc } from './ipc/signoff.js';
import { startLogging, registerDiagnosticsIpc } from './ipc/diagnostics.js';

let win: BrowserWindow | null = null;
const getWindow = () => win;

/**
 * Under test, never steal the screen.
 *
 * The e2e suite launches real windows — that is the point of it — and on a
 * developer's machine each one appears on top of whatever they were doing and
 * takes the keyboard with it. Fifty-seven of them, several times an hour, makes
 * the suite something you avoid running, which is the opposite of what a suite
 * is for.
 *
 * So: `RAMPA_TEST=1` creates the window inactive and hides the dock icon. The
 * window is still real, still painted and still measurable — `showInactive()`
 * rather than `show: false`, because a hidden window's layout is not reliably the
 * layout a teacher gets, and the layout suite exists to check exactly that.
 *
 * ## And `RAMPA_HIDDEN=1`, because inactive was not enough
 *
 * Carlos, while a suite was running: «lanza la app y no puedo usar el puto ordenador
 * porque no para de arrancar y parar la aplicación… es que así no puedo currar
 * mientras tú testeas».
 *
 * `showInactive()` does not take the keyboard, and that was the problem it was written
 * to solve. It still puts a window on the screen — a hundred of them over a run,
 * appearing and vanishing on top of whatever he is doing. Not stealing focus is not
 * the same as staying out of the way.
 *
 * `RAMPA_HIDDEN=1` never shows the window at all. Playwright drives it over CDP, which
 * does not care whether a window is on screen, so every spec that clicks and asserts
 * text works exactly the same.
 *
 * ## Including the layout suite, which is the part I expected to have to exclude
 *
 * The paragraph above says a hidden window's layout «is not reliably the layout a
 * teacher gets», so `layout.spec.ts` and `a11y.spec.ts` were going to keep running
 * visible. **Checked instead of assumed**: all fifteen of them pass hidden, including
 * the width sweep from 560px up and the largest text scale. Electron keeps compositing
 * an unshown window, and CDP reads the same metrics either way.
 *
 * So every script is quiet, and `test:e2e:visible` exists for the day one of them
 * disagrees — at which point the assumption gets tested rather than believed.
 *
 * `npm run shots` stays visible on purpose: its whole job is a picture for a human.
 */
const underTest = process.env['RAMPA_TEST'] === '1';

// The network counter, under test only (`035` SC-3302). See `net-counter.ts`.
void app.whenReady().then(() => watchNetworkIfTesting(session.defaultSession));
const hidden = process.env['RAMPA_HIDDEN'] === '1';

function createWindow(): void {
  win = new BrowserWindow({
    show: !underTest && !hidden,
    width: 1180, height: 820,
    /*
     * The floor was 900×640, which is not a size chosen for a teacher — it is
     * the width below which the layout used to fall apart, promoted to a
     * constraint on her. She wants Rampa beside her register on a 1280 laptop,
     * and 900 does not leave room for the register.
     *
     * 560 is now the floor because the layout works there (013 FR-1115, and the
     * width sweep in `e2e/layout.spec.ts` says so at every width from here up).
     * A minimum window size should be a statement about what is usable, not a
     * fence around what was never rendered.
     */
    minWidth: 560, minHeight: 480,
    title: 'Rampa',
    /*
     * The dock showed Electron's default icon (013 T030) — the framework's mark
     * on the one surface a teacher sees before she has opened anything.
     *
     * `electron-builder` picks `build/icon.png` up on its own for the packaged
     * app, so this line is for the *unpackaged* case: `npm run dev`, and the
     * Linux window manager, which reads it from the window rather than from the
     * bundle. Missing file is not fatal — Electron falls back — so a checkout
     * that has not run `npm run icon` still launches.
     */
    icon: join(import.meta.dirname, '..', '..', 'build', 'icon.png'),
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

  if (underTest || hidden) {
    // `hidden` means never on screen at all: no `show`, no `showInactive`.
    if (!hidden) win.showInactive();
    // macOS keeps a dock icon bouncing for each launch otherwise.
    if (process.platform === 'darwin') app.dock?.hide();
  }

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
    setCorpusStore(join(app.getPath('userData'), 'corpus'));
    registerCorpusIpc();
    registerCoordinationIpc();
    registerCostIpc();
    registerMemoryIpc();
    registerRecordIpc();
    registerAdaptIpc(getWindow);
    registerComposeIpc(getWindow);
    registerPictogramIpc(getWindow);
    registerStructureIpc(getWindow);
    registerEnsayoIpc();
    registerGuideIpc(getWindow);
    registerConversationIpc(getWindow);
  registerIngestIpc(getWindow);
    registerPrintIpc();
    registerSignoffIpc();
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { stopWatching(); if (process.platform !== 'darwin') app.quit(); });
}
