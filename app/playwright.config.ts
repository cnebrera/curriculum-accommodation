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
export default defineConfig({
  testDir: './e2e',
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
