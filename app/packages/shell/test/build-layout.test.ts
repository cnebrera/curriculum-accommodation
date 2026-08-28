import { describe, it, expect } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const repoRoot = join(appRoot, '..');

/**
 * The built layout must match what `main.ts` loads (found 2026-08-28).
 *
 * The renderer's `outDir` was relative to the renderer `root` and resolved to
 * the **repository** root, two levels above where `main.ts` looks for it. So
 * `npm run build` reported success, `npm run dev` worked because it serves from
 * the Vite dev server, and the packaged application would have opened a blank
 * window. It also explains a stray `out/renderer` that was once committed.
 *
 * Nothing in a typecheck or a unit test could see it: the defect lived between
 * the bundler's configuration and one string in the main process. This test is
 * the seam.
 */
describe('the packaged app can find its own renderer', () => {
  const built = async (p: string) => {
    try { return (await stat(join(appRoot, p))).isFile(); } catch { return false; }
  };

  it('main.ts loads the renderer from a path the build actually writes', async () => {
    const main = await readFile(join(appRoot, 'packages', 'shell', 'src', 'main.ts'), 'utf8');
    const match = /loadFile\(join\(import\.meta\.dirname,\s*'([^']+)'\)\)/.exec(main);
    expect(match, 'main.ts must load the renderer with a literal relative path').not.toBeNull();

    // main.js is emitted into out/main/, so the path is relative to that.
    const expected = join('out', 'main', match![1]!);
    expect(
      await built(expected),
      `main.ts loads "${match![1]}" (=> app/${expected}) and the build did not put it there. ` +
      'Run `npm run build` first; if it is still missing, the renderer outDir is wrong.',
    ).toBe(true);
  });

  it('nothing is written outside app/', async () => {
    // The old configuration wrote the renderer to the repository root. A build
    // that escapes its own package is how a stray directory ends up committed.
    let escaped = false;
    try { escaped = (await stat(join(repoRoot, 'out'))).isDirectory(); } catch { /* good */ }
    expect(escaped, 'the build wrote out/ at the repository root').toBe(false);
  });

  /**
   * The preload path must resolve to a file, not merely name one.
   *
   * The first version of this test checked that `out/preload/preload.js` existed
   * AND that main.ts contained a preload line — and passed while the two were
   * different paths. main.ts said `'preload.js'`, resolving to
   * `out/main/preload.js`, which the build never writes: the preload silently
   * failed to load, `window.rampa` was undefined, and the whole application was
   * a blank window. Found by launching it, which is the only thing that could.
   */
  /**
   * T003 — a bundled typeface without its licence is a distribution defect.
   *
   * Atkinson Hyperlegible is SIL OFL 1.1, which permits bundling provided the
   * licence travels with it. This project already fails the build when the
   * corpus ships without CC BY-SA; a font is the same obligation.
   */
  it('the bundled typeface ships with its licence', async () => {
    const fonts = join('ui', 'src', 'assets', 'fonts');
    for (const f of ['AtkinsonHyperlegible-Regular.woff2', 'AtkinsonHyperlegible-Bold.woff2']) {
      expect(await built(join(fonts, f)), `${f} is missing`).toBe(true);
    }
    expect(
      await built(join(fonts, 'OFL.txt')),
      'the typeface is bundled without SIL OFL 1.1 — that is not distributable',
    ).toBe(true);

    const ofl = await readFile(join(appRoot, fonts, 'OFL.txt'), 'utf8');
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE/i);
    expect(ofl).toMatch(/Braille Institute/i);
  });

  it('the stylesheet references the faces it bundles', async () => {
    const css = await readFile(join(appRoot, 'ui', 'src', 'styles', 'tokens.css'), 'utf8');
    const faces = [...css.matchAll(/url\("([^"]+\.woff2)"\)/g)].map((m) => m[1]!);
    expect(faces.length, 'no @font-face src found in tokens.css').toBe(2);
    for (const rel of faces) {
      // The url is relative to the stylesheet, which lives in ui/src/styles.
      const resolved = join('ui', 'src', 'styles', rel);
      expect(await built(resolved), `tokens.css points at ${rel}, which is not there`).toBe(true);
    }
  });

  it('the preload path in main.ts resolves to the file the build emits', async () => {
    const main = await readFile(join(appRoot, 'packages', 'shell', 'src', 'main.ts'), 'utf8');
    const match = /preload:\s*join\(import\.meta\.dirname,\s*([^)]+)\)/.exec(main);
    expect(match, 'main.ts must build the preload path with join()').not.toBeNull();

    const segments = match![1]!.split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    const resolved = join('out', 'main', ...segments);

    expect(
      await built(resolved),
      `main.ts resolves its preload to app/${resolved}, and the build did not write it there. ` +
      'A missing preload means window.rampa is undefined and every IPC call is dead.',
    ).toBe(true);
  });
});
