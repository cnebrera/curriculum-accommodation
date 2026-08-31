import { defineConfig } from '@playwright/test';

/**
 * Electron end-to-end. No browsers are installed and none are needed: Playwright
 * drives the real application through its own main process.
 *
 * Deliberately separate from the vitest suite. Vitest holds the deterministic
 * layer — offline, no key, milliseconds — and that separation is Principle II
 * made visible in the tooling. These tests launch a real window and are slower
 * by nature, so they must never be the thing a contributor skips because the
 * fast suite takes too long.
 */
/*
 * The suite launches real Electron windows — that is the point of it — and each
 * one used to appear on top of whatever the developer was doing and take the
 * keyboard with it. Fifty-seven of those, several times an hour, makes the suite
 * something you avoid running, which is the opposite of what a suite is for.
 *
 * Set here rather than in `use.launchOptions`, which only reaches browser
 * launches and not `_electron.launch`. This file is loaded by the runner and by
 * every worker, and each test spreads `process.env` into its launch — so the flag
 * arrives wherever a window is created. `main.ts` reads it and shows the window
 * inactive, with the dock icon hidden.
 */
process.env['RAMPA_TEST'] = '1';

export default defineConfig({
  testDir: './e2e',
  // Never against a stale `out/`. See e2e/build.setup.ts.
  globalSetup: './e2e/build.setup.ts',
  // A window has to appear, so serialise: parallel Electron instances fighting
  // over the same user-data directory is a flake factory.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  // A failure here is a real defect, not a flake to paper over.
  retries: 0,
});
