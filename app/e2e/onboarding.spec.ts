import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The application actually running (T040).
 *
 * Everything else in this repository is typechecked and unit-tested; until this
 * file existed, **no line of it had ever executed inside Electron**. The first
 * thing this suite found was that the packaged app could not locate its own
 * renderer, which no typecheck could see.
 *
 * No provider is called. There is deliberately no test-only backdoor that swaps
 * in a stub model: adding a path that bypasses the real one would weaken exactly
 * the guarantees this project enforces structurally. So this drives the journey
 * up to the point where a key is needed, and asserts that the absence of a key
 * is reported in her language rather than as a stack trace.
 */
// Playwright runs from app/. Not import.meta: the runner loads specs as CJS.
const appRoot = process.cwd();

async function launch(userData: string, vault: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: {
      ...process.env,
      // A vault the test owns, so nothing touches a real one.
      RAMPA_TEST_VAULT: vault,
      // Belt and braces: no key anywhere near this run.
      ANTHROPIC_API_KEY: '',
      GOOGLE_API_KEY: '',
    },
  });
}

const scratch = () => mkdtemp(join(tmpdir(), 'rampa-e2e-'));

test.describe('the first ten minutes', () => {
  test('the window opens and shows the first step, not a blank page', async () => {
    const app = await launch(await scratch(), await scratch());
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // The defect this catches: a renderer built to the wrong directory loads as
    // an empty document, and every other assertion below would pass vacuously.
    const body = await page.textContent('body');
    expect(body?.trim().length ?? 0).toBeGreaterThan(20);

    await expect(page.getByRole('heading', { name: /Vamos a dejarlo listo/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /¿Dónde guardo tus cosas\?/i })).toBeVisible();

    // No project jargon in front of her (006 FR-406).
    for (const word of ['IR', 'corpus', 'vault', 'axis', 'prompt', 'token']) {
      expect(body).not.toContain(word);
    }
    await app.close();
  });

  test('a chosen vault is created, remembered, and reopened on relaunch (T083)', async () => {
    const userData = await scratch();
    const vaultRoot = join(await scratch(), 'Rampa');
    await mkdir(vaultRoot, { recursive: true });

    const app = await launch(userData, vaultRoot);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Use the real IPC surface rather than clicking a native folder dialog,
    // which Playwright cannot drive. This is the same call the button makes.
    const used = await page.evaluate((root) => window.rampa.vault.use(root), vaultRoot);
    expect(used).toBe(vaultRoot);

    // Bootstrap made a vault a teacher can read (006 US3).
    const entries = await readdir(vaultRoot);
    for (const expected of ['profiles', 'material', 'output', 'memory']) {
      expect(entries).toContain(expected);
    }
    const house = await readFile(join(vaultRoot, 'memory', 'house.md'), 'utf8');
    expect(house).toContain('Cómo trabajo yo');

    await app.close();

    // The defect T083 fixed: nothing reopened the vault, so the second launch
    // was a broken onboarding with every vault call throwing.
    const again = await launch(userData, vaultRoot);
    const page2 = await again.firstWindow();
    await page2.waitForLoadState('domcontentloaded');
    const current = await page2.evaluate(() => window.rampa.vault.current());
    expect(current, 'the vault must be reopened from the previous session').toBe(vaultRoot);
    await again.close();
  });

  test('a learner is created without a name ever reaching disk', async () => {
    const userData = await scratch();
    const vaultRoot = join(await scratch(), 'Rampa');
    await mkdir(vaultRoot, { recursive: true });

    const app = await launch(userData, vaultRoot);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((root) => window.rampa.vault.use(root), vaultRoot);

    const code = await page.evaluate(() => window.rampa.learners.newCode());
    expect(code, 'codes are generated, never initials (006 FR-421)').toMatch(/^[A-Z][2-9]{2}$/);

    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 3, EJE: 3 },
      works: ['Primer ejercicio hecho como ejemplo'], avoid: ['Nada con reloj'],
      interests: ['dinosaurios'], response: { default: 'short' }, language: { instruction: 'es' },
    }), code);
    await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);

    // The promise the application exists to keep: the profile on disk is
    // barriers, and her name is not in it (006 US2, FR-417).
    const profile = await readFile(join(vaultRoot, 'profiles', code, 'profile.yaml'), 'utf8');
    expect(profile).toContain('COG: 3');
    expect(profile).toContain('dinosaurios');
    expect(profile).not.toContain('Lucía');

    // The interface still shows her the name she typed (FR-420).
    expect(await page.evaluate((c) => window.rampa.names.resolve(c), code)).toBe('Lucía');

    await app.close();
  });

  test('adapting without a key fails in her language, not with a stack trace', async () => {
    const userData = await scratch();
    const vaultRoot = join(await scratch(), 'Rampa');
    await mkdir(vaultRoot, { recursive: true });

    const app = await launch(userData, vaultRoot);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((root) => window.rampa.vault.use(root), vaultRoot);

    const code = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 3 }, works: [], avoid: [],
      interests: [], response: {}, language: { instruction: 'es' },
    }), code);

    await page.evaluate(() => window.rampa.job.create('e2e-job', 'Las plantas fabrican su alimento.', 'es'));

    // The verification gate holds before anything else (001 FR-006).
    const beforeVerify = await page.evaluate((c) =>
      window.rampa.job.adapt('e2e-job', c).then(() => null, (e: Error) => e.message), code);
    expect(beforeVerify).toContain('[rampa:ir-unverified]');

    await page.evaluate(() => window.rampa.job.verify('e2e-job'));
    const afterVerify = await page.evaluate((c) =>
      window.rampa.job.adapt('e2e-job', c).then(() => null, (e: Error) => e.message), code);

    // 006 FR-423: a typed domain error the interface can translate, never a code.
    expect(afterVerify).toContain('[rampa:key-missing]');
    expect(afterVerify).not.toMatch(/at .*\.js:\d+/);

    await app.close();
  });

  test('everything except adapting works with no network at all', async () => {
    const userData = await scratch();
    const vaultRoot = join(await scratch(), 'Rampa');
    await mkdir(vaultRoot, { recursive: true });

    const app = await launch(userData, vaultRoot);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((root) => window.rampa.vault.use(root), vaultRoot);

    // 006 FR-424. None of this may need a provider.
    const house = await page.evaluate(() => window.rampa.memory.house());
    expect(house).toContain('Cómo trabajo yo');

    const recipes = await page.evaluate(() => window.rampa.corpus.recipes());
    expect(recipes.length, 'the bundled corpus must load from the packaged app').toBeGreaterThan(5);

    const instruction = await page.evaluate(() => window.rampa.corpus.instruction('hard-rules'));
    expect(instruction, 'the judgement layer is read from the bundle, not compiled in')
      .toContain('Adapt the route, never the content');

    const proposals = await page.evaluate(() => window.rampa.memory.consolidate());
    expect(proposals.learnerThemes).toEqual([]);

    await app.close();
  });
});
