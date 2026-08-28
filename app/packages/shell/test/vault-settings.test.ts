import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadSettings, rememberVaultRoot, rememberedVaultRoot,
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
});
