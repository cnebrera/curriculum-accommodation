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

const IMPORTS_ELECTRON = /^\s*import\s([^;]*)\bfrom\s+['"]electron['"]/m;

/**
 * **A type-only import is not a dependency**, and counting it as one made this test
 * grow for the wrong reason.
 *
 * `import { type BrowserWindow } from 'electron'` is erased at compile time: there is
 * no runtime import, and migrating the file costs renaming one type. Three of the
 * four `ipc/` files that «import electron» import nothing but that type — the
 * `BrowserWindow` they take comes from their caller.
 *
 * Found on 2026-08-31 after the line bound failed **three times in one day** for
 * `002`, `018` and `017`, each time on a file whose actual Electron cost was zero.
 * Raising a number three times is a signal about the number, not about the code.
 *
 * So the two are counted separately: the value importers are the surface ADR 0008
 * wants a migration to be able to quote, and the type-only ones are named — because
 * they still *couple* to the framework conceptually — and excluded from the budget.
 */
const isTypeOnly = (clause: string): boolean => {
  const inner = /\{([^}]*)\}/.exec(clause)?.[1];
  // `import electron from` or `import * as electron` is a value import.
  if (!inner || /^\s*type\s/.test(clause) === false && !/\{/.test(clause)) return false;
  if (/^\s*import\s+type\s/.test(`import ${clause}`)) return true;
  const bindings = inner.split(',').map((b) => b.trim()).filter(Boolean);
  return bindings.length > 0 && bindings.every((b) => /^type\s/.test(b));
};

async function electronImportersSplit(dir: string): Promise<{ value: string[]; typeOnly: string[] }> {
  const files = await walk(join(appRoot, dir));
  const value: string[] = [];
  const typeOnly: string[] = [];
  for (const f of files) {
    const m = IMPORTS_ELECTRON.exec(await readFile(f, 'utf8'));
    if (!m) continue;
    (isTypeOnly(m[1] ?? '') ? typeOnly : value).push(relative(appRoot, f));
  }
  return { value: value.sort(), typeOnly: typeOnly.sort() };
}

/** Every file naming electron at all, type-only or not. */
async function electronImporters(dir: string): Promise<string[]> {
  const { value, typeOnly } = await electronImportersSplit(dir);
  return [...value, ...typeOnly].sort();
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
    'packages/shell/src/ensayo/root.ts',     // app.getPath('userData') — where the rehearsal root lives (`035`)
    'packages/shell/src/ipc/adapt.ts',       // BrowserWindow (type only), for the progress send
    'packages/shell/src/ipc/compose.ts',     // BrowserWindow (type only) — 016 T003
    'packages/shell/src/ipc/conversation.ts', // BrowserWindow (type only) — 026 T015
    'packages/shell/src/ipc/diagnostics.ts', // app.getPath, shell.showItemInFolder
    'packages/shell/src/ipc/guide.ts',       // BrowserWindow (type only) — 017 T013
    'packages/shell/src/ipc/ingest.ts',      // app.getPath, progress (its dialog moved to pick.ts)
    'packages/shell/src/ipc/keys.ts',        // safeStorage — the encrypted key store
    'packages/shell/src/ipc/names.ts',       // safeStorage — the encrypted name map
    'packages/shell/src/ipc/pick.ts',        // dialog.showOpenDialog — the one file picker (`029`)
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
  /**
   * The three `ipc/` files that take a `BrowserWindow` **as a type** and nothing else.
   *
   * Listed rather than invisible: they still couple to the framework conceptually, and
   * a reader should be able to see which files would need a signature change. They are
   * excluded from the line budget because their runtime cost is nil.
   */
  /**
   * Lines of code: no blanks, no comments.
   *
   * Deliberately crude — it does not parse, it strips. A `/*` inside a string literal
   * would fool it, and there are none in these twelve files. The alternative is a parser
   * in a boundary test, which is more machinery than the question deserves.
   */
  const countCode = (src: string): number => {
    let inBlock = false;
    let n = 0;
    for (const raw of src.split('\n')) {
      const line = raw.trim();
      if (inBlock) { if (line.includes('*/')) inBlock = false; continue; }
      if (line === '') continue;
      if (line.startsWith('//')) continue;
      if (line.startsWith('/*')) { if (!line.includes('*/')) inBlock = true; continue; }
      n += 1;
    }
    return n;
  };

  it('names the files whose electron import is type-only', async () => {
    const { typeOnly } = await electronImportersSplit(join('packages', 'shell'));
    expect(typeOnly).toEqual([
      'packages/shell/src/ipc/adapt.ts',
      'packages/shell/src/ipc/compose.ts',
      // `026` T015: the conversation sends progress into the window and nothing else,
      // which is what «type only» means here — no `app`, no `dialog`, no `shell`.
      'packages/shell/src/ipc/conversation.ts',
      'packages/shell/src/ipc/guide.ts',
    ]);
  });

  it('the Electron-specific surface is a few hundred lines, not a few thousand', async () => {
    const { value: files } = await electronImportersSplit(join('packages', 'shell'));
    let lines = 0;
    for (const f of files) {
      const src = await readFile(join(appRoot, f), 'utf8');
      lines += countCode(src);
    }
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
     *
     * **Then it failed a third time, and the third time was the number's fault.**
     * `017`'s `ipc/guide.ts` imports `{ type BrowserWindow }` and nothing else — an
     * import erased at compile time, whose migration cost is renaming one type. Two
     * of the files already counted were the same. So the budget now measures **value
     * importers only**, which is what ADR 0008 wanted a migration to be able to
     * quote, and the type-only ones are named in the test above.
     *
     * The number went *down* as a result — 1,685 counting everything, 1,431 counting
     * only what a migration would have to rewrite — which is the tell that the metric
     * was wrong rather than the code.
     *
     * **And a fourth time, on 2026-09-01, and again the number's fault.** `021` routed
     * five readers through `resolveDocument` and documented why in each — so the budget
     * went up by ten lines of **prose**. A metric that counts comments makes explaining
     * a change cost the same as making one, in a repository whose whole review culture is
     * that the comment carries the reasoning. And it is not what ADR 0008 wants quoted:
     * a migration rewrites code and *carries* comments.
     *
     * So it counts code — blank lines and comment lines excluded — and the number went
     * down again, from 1,460 to what it is now. Same tell as the third time.
     *
     * **Raised to 975 on 2026-09-05, and this time the number was right.** Three features
     * landed in one stretch — `028`'s structure channels, `035`'s rehearsal channels and
     * `035`'s network counter — and each added a registration line and an import to
     * `main.ts`. That is five lines of pure wiring, which is precisely the growth the
     * second paragraph above says this bound exists to permit.
     *
     * It refused two attempts first, and both moves were kept because both were right:
     * `035`'s rehearsal store had a hundred lines behind one `app.getPath` call, which
     * became `ensayo/root.ts`; and the «install the counter under test» decision was ten
     * lines of reasoning in `main.ts`, which became `watchNetworkIfTesting` beside the
     * counter. What is left in `main.ts` is *that* something is registered, which is what
     * `main.ts` is for.
     *
     * **Raised to 981 on 2026-09-06, by five lines.** `029` needed a file dialog for a
     * normativa somebody sent her, and putting it in `corpus/normative.ts` would have put
     * that file's 260 lines of loading, hashing, resolving and scanning on this surface.
     * The bound refused it and was right; the Electron-specific part is fifteen lines.
     *
     * It refused the extraction too, at 982 — and the second refusal is the one that
     * produced the better answer. `ipc/ingest.ts` had written the same dialog first, for
     * worksheets. Extracting one and leaving the other would have been two
     * implementations of the one rule that matters here, that **the renderer never
     * composes a path**; a rule with two implementations is a rule with one place to
     * forget it. So `ipc/pick.ts` has two callers, `ingest.ts` gave its dialog up, and
     * the whole import flow of a feature cost five lines on this surface.
     *
     * **Raised to 999 on 2026-09-06, by fourteen lines**, for `030`'s packet door. Eight
     * channels in `preload.ts` and one registration in `main.ts`, and the count is the
     * design rather than sprawl: opening, holding, linking, accepting and applying a
     * delta are **separate acts on purpose** — the door is per-item, and collapsing two
     * of them into one channel to save a line here would collapse two of her decisions.
     *
     * `ipc/coordination.ts` itself is not on the list above and that is the tell that
     * this is the permitted shape: 300 lines of packet handling that import no Electron
     * at all, because the file dialog is `ipc/pick.ts`'s and the vault is
     * `ipc/vault.ts`'s. What grew is the bridge, which is what the bridge is for.
     *
     * 25, not 100. A bound raised to a round number stops being a measurement.
     */
    expect(lines).toBeLessThan(999);
  });
});
