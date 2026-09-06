import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Rampa never installs anything (034 T012, FR-3201, SC-3203).
 *
 * ## Enforced by what does not exist
 *
 * The requirement is «notify only», and a requirement satisfied by an absence is the one
 * that quietly stops being true — somebody adds `electron-updater` because it is three
 * lines and obviously convenient, and a tool in a school starts replacing itself.
 *
 * ## Why that is not merely cautious
 *
 * The installers are unsigned (`006` R14, and `COLA` P52 still owns that debt), so an
 * in-place update on macOS or Windows fails in a way that looks like the application
 * breaking. And underneath that is the argument that survives signing: a tool that
 * updates itself on a school computer is a tool that changes without anybody having
 * decided to change it — in the week before an inspection, on the morning of an exam.
 *
 * ## Lands with US1, not after it
 *
 * An absence asserted after the first release ships a notice asserts whatever shipped.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'out') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
};

describe('there is no path from a notice to an installation', () => {
  it('no auto-updater in the dependency tree, at any depth of the manifest', () => {
    for (const manifest of [
      join(repoRoot, 'app', 'package.json'),
      join(repoRoot, 'app', 'packages', 'shell', 'package.json'),
    ]) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      const deps = {
        ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}),
        ...(pkg.optionalDependencies ?? {}),
      };
      for (const name of Object.keys(deps)) {
        expect(name, manifest).not.toMatch(/electron-updater|update-electron-app|autoUpdater/i);
      }
    }
  });

  it('and nothing in the source reaches for Electron\'s own updater', () => {
    const offenders: string[] = [];
    for (const dir of [
      join(repoRoot, 'app', 'packages'), join(repoRoot, 'app', 'ui', 'src'),
    ]) {
      for (const f of walk(dir)) {
        // Tests may name it: `releases.test.ts` asserts its absence too.
        if (/\.test\.tsx?$/.test(f)) continue;
        const code = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
        if (/autoUpdater|electron-updater|quitAndInstall|checkForUpdatesAndNotify/.test(code)) {
          offenders.push(f.replace(`${repoRoot}/`, ''));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and nothing spawns a process or downloads a binary from the update path', () => {
    /*
     * The two shapes an installer arrives as. `child_process` anywhere in this
     * application would be news; in the update path it would be the feature this test
     * exists to prevent.
     */
    const offenders: string[] = [];
    for (const f of walk(join(repoRoot, 'app', 'packages'))) {
      if (/\.test\.tsx?$/.test(f)) continue;
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
      /*
       * `\b` after each extension, and it took a false positive to learn: `\.exe`
       * matched `re.exec(` in eighty-one files, so the guard fired on every regex in
       * `packages/core`. A guard that flags everything is a guard somebody deletes.
       */
      if (/child_process|execFile|\bspawn\(|\.dmg\b|\.exe\b|\.AppImage\b/.test(code)) {
        offenders.push(f.replace(`${repoRoot}/`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the release channel offers a page, and the page is opened by her browser', () => {
    /*
     * `UpdateStatus.page` is «always the releases page, never a binary URL», and the
     * link goes through `links.ts`'s rule — a declared https URL, resolved in the main
     * process, never a string from the renderer.
     */
    const releases = readFileSync(
      join(repoRoot, 'app', 'packages', 'providers', 'src', 'releases.ts'), 'utf8');
    expect(releases).toContain('releases');
    expect(releases).not.toMatch(/\.dmg|\.exe|\.AppImage|\/download\//);
  });
});
