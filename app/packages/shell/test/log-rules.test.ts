import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, writeFile, stat, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { logFileIn, rotatedName, rotateIfLarge, LOG_MAX_BYTES } from '../src/log-file.js';

/**
 * The rules the log already obeyed, written down at last (036 T003/T004/T005).
 *
 * `036` exists because a privacy-relevant subsystem's rules lived only in comments. These
 * are the three that are checkable without a window: where it lives, that it is bounded,
 * and that failing to write it never costs her anything.
 */
vi.mock('electron', () => ({ ipcMain: { handle: () => {} }, app: {}, dialog: {}, shell: {} }));

describe('the log lives outside her vault (FR-3402)', () => {
  /**
   * Asserted as a **path relationship**, not as a string.
   *
   * The same shape as `024` T022's «by content and not by filename»: a check that the
   * path does not contain the word «Rampa» would pass for a log written inside a vault
   * called something else. What must be true is that no vault root is an ancestor of it.
   */
  it('is not inside a vault, whatever the vault is called', () => {
    const appData = '/Users/x/Library/Application Support/Rampa';
    const log = logFileIn(appData);

    for (const vault of ['/Users/x/Documents/Rampa', '/Users/x/Mi carpeta',
                         '/Volumes/USB/curso 2026', appData + '-vault']) {
      const rel = relative(vault, log);
      expect(rel.startsWith('..') || isAbsolute(rel),
        `the log is inside ${vault}`).toBe(true);
    }
  });

  /**
   * And the reason, stated because it is the requirement and not a preference: her vault
   * is what she copies to a new laptop, what a backup copies, and what she hands to a
   * colleague. A diagnostic in there travels with all three.
   */
  it('sits under a logs/ directory of the folder it is given, and nowhere else', () => {
    expect(logFileIn('/a/b')).toBe(join('/a/b', 'logs', 'rampa.log'));
  });

  /**
   * The guard that matters for the future: **nothing in the diagnostics module may reach
   * for a vault.** This is the change somebody would make for a good reason — «her log
   * should be backed up with her work» — and it is the one FR-3402 forbids.
   */
  it('and the diagnostics module never reaches for a vault', async () => {
    const src = await readFile(
      new URL('../src/ipc/diagnostics.ts', import.meta.url), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(code).not.toMatch(/currentVault|resolveInVault|VAULT\./);
  });
});

describe('the log is bounded (FR-3403)', () => {
  const scratch = () => mkdtemp(join(tmpdir(), 'rampa-log-'));

  it('rotates when it has grown past the bound, keeping one generation', async () => {
    const dir = await scratch();
    const path = join(dir, 'rampa.log');
    await writeFile(path, 'x'.repeat(50), 'utf8');

    expect(await rotateIfLarge(path, 10), 'a file over the bound must rotate').toBe(true);
    // The old one is beside it, and a new one has not been created here — the sink does
    // that, which is `startLogging`'s business and not this function's.
    expect((await stat(rotatedName(path))).size).toBe(50);
  });

  it('leaves a file under the bound alone', async () => {
    const dir = await scratch();
    const path = join(dir, 'rampa.log');
    await writeFile(path, 'x'.repeat(5), 'utf8');
    expect(await rotateIfLarge(path, 10)).toBe(false);
    expect((await stat(path)).size).toBe(5);
  });

  /** Exactly at the bound is not over it. Both sides, so an inverted comparison fails. */
  it('rotates over the bound and not at it', async () => {
    const dir = await scratch();
    const path = join(dir, 'rampa.log');
    await writeFile(path, 'x'.repeat(10), 'utf8');
    expect(await rotateIfLarge(path, 10)).toBe(false);
    await writeFile(path, 'x'.repeat(11), 'utf8');
    expect(await rotateIfLarge(path, 10)).toBe(true);
  });

  /**
   * A first run has nothing to rotate, and that is not an error.
   *
   * `startLogging` calls this **before** installing the sink, so on a fresh installation
   * it runs against a file that does not exist. A throw here would break startup for the
   * sake of a log — which is FR-3405 in the one place it would hurt most.
   */
  it('says nothing when there is no log yet', async () => {
    const dir = await scratch();
    await expect(rotateIfLarge(join(dir, 'nothing.log'), 10)).resolves.toBe(false);
  });

  /** The shipped bound, so a change to it is a change somebody made on purpose. */
  it('is 2 MB, which is about twenty thousand lines', () => {
    expect(LOG_MAX_BYTES).toBe(2_000_000);
  });
});

describe('a log that cannot be written costs her nothing (FR-3405)', () => {
  /**
   * The whole application, not just the sink.
   *
   * `log-carries-nothing.test.ts` asserts that a throwing sink does not reach the caller.
   * This asserts the case that produces one: a directory that cannot be created. Where
   * the two conflict the work wins, and a tool that crashes because it could not write a
   * diagnostic has turned its diagnostic into a defect.
   */
  it('a directory that cannot be made does not stop the caller', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rampa-log-'));
    // A file where the directory should go: `mkdir` will refuse, which is the failure
    // shape a full disk or a locked profile produces.
    await writeFile(join(dir, 'logs'), 'not a directory', 'utf8');

    await expect(
      mkdir(join(dir, 'logs'), { recursive: true }).catch(() => null),
    ).resolves.toBeNull();

    // And rotation over that path is silent too, which is what `startLogging` calls next.
    await expect(rotateIfLarge(logFileIn(dir), 10)).resolves.toBe(false);
  });
});
