import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadSettings, rememberVaultRoot, rememberedVaultRoot, loadDisplay, saveDisplay,
} from '../src/ipc/vault-settings.js';

/**
 * T083 — the vault survives a relaunch (006 US1-3).
 *
 * The defect this pins: the vault was only ever opened from the onboarding
 * step, so the second launch of the application had no vault and every
 * vault-dependent call threw. These tests cover the electron-free persistence
 * logic; main.ts calls it before the window exists.
 */
describe('vault settings — remember and reopen', () => {
  const scratch = () => mkdtemp(join(tmpdir(), 'rampa-settings-'));

  it('first run has nothing remembered, and does not crash', async () => {
    const dir = await scratch();
    expect(await loadSettings(dir)).toEqual({});
    expect(await rememberedVaultRoot(dir)).toBeNull();
  });

  it('remembers a root and returns it while the folder exists', async () => {
    const dir = await scratch();
    const vault = join(dir, 'mi-carpeta');
    await mkdir(vault);
    await rememberVaultRoot(dir, vault);
    expect(await rememberedVaultRoot(dir)).toBe(vault);
  });

  it('fails safe when the remembered folder is gone — onboarding, never a crash', async () => {
    const dir = await scratch();
    const vault = join(dir, 'usb-que-ya-no-esta');
    await mkdir(vault);
    await rememberVaultRoot(dir, vault);
    await rm(vault, { recursive: true });
    expect(await rememberedVaultRoot(dir)).toBeNull();
  });

  it('survives a corrupt settings file as a first run', async () => {
    const dir = await scratch();
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'settings.json'), '{nope', 'utf8');
    expect(await rememberedVaultRoot(dir)).toBeNull();
  });

  /* ── Her display preferences (spec 010 T026) ─────────────────────────── */

  it('remembers her display preferences across a relaunch', async () => {
    const dir = await scratch();
    await saveDisplay(dir, { text: 'xlarge', contrast: 'high' });
    expect(await loadDisplay(dir)).toEqual({ text: 'xlarge', contrast: 'high' });
  });

  it("keeps the vault and the preferences out of each other's way", async () => {
    const dir = await scratch();
    const vault = join(dir, 'Rampa');
    await mkdir(vault);
    await rememberVaultRoot(dir, vault);
    await saveDisplay(dir, { theme: 'dark' });
    // Both survive: `saveDisplay` reads before it writes, so setting one does
    // not silently drop the other. The obvious bug in a two-key settings file.
    expect(await rememberedVaultRoot(dir)).toBe(vault);
    expect(await loadDisplay(dir)).toEqual({ theme: 'dark' });

    await rememberVaultRoot(dir, vault);
    expect(await loadDisplay(dir)).toEqual({ theme: 'dark' });
  });

  it('stores them beside the vault, never inside it (FR-820)', async () => {
    const dir = await scratch();
    const vault = join(dir, 'Rampa');
    await mkdir(vault);
    await rememberVaultRoot(dir, vault);
    await saveDisplay(dir, { text: 'large', motion: 'reduced' });

    // The vault is what she hands over, backs up and shares. Her own reading
    // preferences are hers and are not part of a learner's record — a handover
    // packet carrying "this teacher needs 200% text" would be a disclosure
    // about her, made by us, that nobody asked for.
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(vault)).toEqual([]);
  });

  it('reports no preferences rather than inventing defaults', async () => {
    // The renderer decides what "unset" means by asking the operating system
    // (FR-817). If this returned a default, that reading would never happen and
    // a teacher with the OS set to dark would still get light.
    expect(await loadDisplay(await scratch())).toBeUndefined();
  });
});
