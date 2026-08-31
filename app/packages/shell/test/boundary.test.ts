import { describe, it, expect } from 'vitest';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';

/**
 * The Electron boundary (013 T020/T021, FR-1112, SC-1104).
 *
 * [ADR 0008](../../../docs/decisions/0008-electron-not-tauri.md) chose Electron
 * **against** the numbers. Tauri is smaller and lighter; two of that ADR's three
 * arguments were later found to be overstated and corrected in the file itself.
 * One survived: Chromium's `printToPDF` turns the same HTML the screen shows
 * into a print-quality document, and Tauri has no programmatic equivalent.
 *
 * A decision made on one argument should keep its exit affordable, and the price
 * of leaving is exactly how much of this application knows it is inside
 * Electron. Today that holds by habit. This test is what makes it hold at all —
 * and T021 asks for the number, so the number is asserted rather than described.
 *
 * If the surface grows, this test fails and somebody has to decide whether the
 * growth was worth it. That is the whole mechanism.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try { entries = await readdir(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'out' || e === 'dist') continue;
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const IMPORTS_ELECTRON = /^\s*import\s[^;]*\bfrom\s+['"]electron['"]/m;

async function electronImporters(dir: string): Promise<string[]> {
  const files = await walk(join(appRoot, dir));
  const hits: string[] = [];
  for (const f of files) {
    if (IMPORTS_ELECTRON.test(await readFile(f, 'utf8'))) hits.push(relative(appRoot, f));
  }
  return hits.sort();
}

describe('nothing outside packages/shell knows it is running in Electron', () => {
  it('finds files at all', async () => {
    // A walk that silently found nothing would make every assertion below pass.
    expect((await walk(join(appRoot, 'packages', 'shell', 'src'))).length).toBeGreaterThan(10);
    expect((await walk(join(appRoot, 'ui', 'src'))).length).toBeGreaterThan(10);
  });

  it('the core is portable', async () => {
    expect(await electronImporters(join('packages', 'core'))).toEqual([]);
  });

  it('the providers are portable', async () => {
    expect(await electronImporters(join('packages', 'providers'))).toEqual([]);
  });

  /**
   * The renderer is a web page. It reaches the main process through the preload
   * bridge and `window.rampa`, which is the whole reason `contextIsolation` and
   * the data layer of `013` exist. An `import ... from 'electron'` here would
   * either fail at build time or, worse, work — and a renderer that can call
   * Electron directly is a renderer where the sandbox is decorative.
   */
  it('the renderer is a web page', async () => {
    expect(await electronImporters('ui')).toEqual([]);
  });
});

describe('inside packages/shell, the surface is small and named', () => {
  /**
   * T021 · the measurement.
   *
   * Not "keep it small" as an aspiration — the list, so that adding to it is a
   * deliberate act with a failing test attached. Each entry says what it is for,
   * because "why does this file need Electron?" is the question a migration
   * would ask on day one.
   */
  const EXPECTED = [
    'packages/shell/src/corpus/bundle.ts',   // app.isPackaged / getAppPath — where the bundle is
    'packages/shell/src/corpus/links.ts',    // shell.openExternal, app.getVersion — the outbound surface
    'packages/shell/src/ipc/adapt.ts',       // BrowserWindow, for the progress send
    'packages/shell/src/ipc/compose.ts',     // BrowserWindow, for the progress send (016 T003)
    'packages/shell/src/ipc/diagnostics.ts', // app.getPath, shell.showItemInFolder
    'packages/shell/src/ipc/ingest.ts',      // dialog.showOpenDialog, app.getPath, progress
    'packages/shell/src/ipc/keys.ts',        // safeStorage — the encrypted key store
    'packages/shell/src/ipc/names.ts',       // safeStorage — the encrypted name map
    'packages/shell/src/ipc/pictograms.ts',  // dialog.showOpenDialog, app.getPath (018 T014)
    'packages/shell/src/ipc/vault.ts',       // dialog.showOpenDialog, the watcher
    'packages/shell/src/ipc/wrap.ts',        // ipcMain.handle — the channel itself
    'packages/shell/src/jobs/print.ts',      // BrowserWindow.printToPDF — ADR 0008's one surviving argument
    'packages/shell/src/main.ts',            // the process
    'packages/shell/src/preload.ts',         // the bridge
  ];

  it('is exactly this list of files', async () => {
    expect(await electronImporters(join('packages', 'shell'))).toEqual(EXPECTED);
  });

  /**
   * FR-1111, asserted rather than asked for. `jobs/` is orchestration: it decides
   * how a worksheet is read and adapted, and before 013 T019 it also registered
   * its own IPC channels and imported `electron` to send progress into a window.
   *
   * The one exception is `print.ts`, and it is the exception on purpose — see the
   * note above. If a second file in `jobs/` ever needs Electron, that is a
   * finding about the split, not a line to add here.
   */
  it('orchestration does not know about windows, except where the PDF is made', async () => {
    const inJobs = (await electronImporters(join('packages', 'shell', 'src', 'jobs')));
    expect(inJobs).toEqual(['packages/shell/src/jobs/print.ts']);
  });

  /**
   * The other half of FR-1111: a job may not open an IPC channel. `handle()` is
   * the only way one is opened, so importing it is the tell.
   */
  it('no job registers its own IPC', async () => {
    const files = await walk(join(appRoot, 'packages', 'shell', 'src', 'jobs'));
    const offenders: string[] = [];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      if (/from\s+['"][^'"]*wrap\.js['"]/.test(src)) offenders.push(relative(appRoot, f));
    }
    expect(offenders, 'wiring belongs in ipc/, orchestration in jobs/').toEqual([]);
  });

  /**
   * The number ADR 0008 wants a migration to be able to quote. Deliberately
   * bounded from above and not from below: the point is that it does not creep.
   */
  it('the Electron-specific surface is a few hundred lines, not a few thousand', async () => {
    const files = await electronImporters(join('packages', 'shell'));
    let lines = 0;
    for (const f of files) lines += (await readFile(join(appRoot, f), 'utf8')).split('\n').length;
    /*
     * Recorded 2026-08-30 at 1,010 lines across 12 files, of a ~2,000-line shell
     * package and a ~15,000-line application. **Raised once**, on 2026-08-31, when
     * `016` added `ipc/compose.ts` — and this test doing its job is what made that
     * a decision rather than a drift.
     *
     * It was worth it: the alternative was putting the compose channels into
     * `ipc/adapt.ts`, and one file owning the wiring for two different jobs is the
     * fusion `013` T019 split apart. Growing by one small file of pure wiring is
     * the shape of growth this bound is meant to permit; growing because
     * orchestration crept back in is the shape it is meant to catch.
     *
     * **Raised again on the same day** for `018`'s `ipc/pictograms.ts` — and it
     * refused the first two attempts to pass, which is the whole value of it:
     *
     * 1. The file arrived at 200 lines carrying 70 lines of Spanish prose for a
     *    vault note and the id→data-URI logic. Both moved into `core`
     *    (`pictograms/note.ts`, `pictograms/images.ts`), where they are testable
     *    and do not need to know what a window is.
     * 2. It grew again when the adapt and print jobs needed set access. That moved
     *    to `packages/shell/src/pictograms/access.ts`, which takes the settings
     *    directory as an argument — so the module that does the reading is off the
     *    Electron surface entirely, and the one fact it needs is injected once at
     *    startup.
     *
     * What is left here is a folder dialog and five handlers, which is what an
     * `ipc/` file is for. A bound that only ever moves up is a bound; a bound that
     * makes somebody look twice is a design review.
     */
    expect(lines).toBeLessThan(1620);
  });
});
