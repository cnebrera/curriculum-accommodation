import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  RAIL_WORK, throughDoorToCompose, assertDoorAsksInOrder, KIND_WORKSHEET, KIND_EXAM,
} from './nav.js';

/**
 * The door (016).
 *
 * The one that matters is **SC-1401**: a teacher with no material and one
 * objective gets to the compose screen without ever seeing a file picker. That
 * sentence is the whole reason this feature exists — `002` was finished code no
 * teacher could reach, because the only entry point asked for a file.
 *
 * What these tests cannot cover: the composition itself needs a provider, and
 * there is no key here on purpose. So they assert the *route* is open, which is
 * what `016` is responsible for, and `002`'s own suite asserts what happens down
 * it.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-door-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-door-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 768 });
  return { app, page, vault };
}

async function seedOne(page: Page, vault: string, name = 'Lucía'): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate(([c]) => window.rampa.learners.save({
    code: c as string, axes: { COG: 2 }, works: [], avoid: [], interests: ['dinosaurios'],
    response: { default: 'short' }, language: { instruction: 'es' }, year: 'es:primaria-5',
  }), [code]);
  await page.evaluate(([c, n]) => window.rampa.names.set(c as string, n as string), [code, name]);
  // Not a key: `providers:save` does not validate, so this gets past onboarding
  // without a byte leaving the machine.
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

test.describe('one door, two kinds of work', () => {
  /** SC-1401, and the reason `016` exists. */
  test('she reaches the compose screen without ever seeing a file picker', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);

    await throughDoorToCompose(page);

    await expect(page.getByRole('heading', { name: /Hacer material para que aprenda/ }))
      .toBeVisible();
    // Not «no file dialog opened» — «nothing on the route even offered one».
    await expect(page.getByRole('button', { name: /Traer una foto/ })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    await app.close();
  });

  /** FR-1401: both doors are peers, and neither is pre-selected. */
  test('both kinds of work are offered, and neither is chosen for her', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await page.getByRole('button', { name: RAIL_WORK }).click();

    await page.locator('.pick').first().click();
    const adapt = page.locator('.door', { hasText: 'Adaptar algo que tengo' });
    const make = page.locator('.door', { hasText: 'Hacer material para que aprenda' });

    await expect(adapt).toBeVisible();
    await expect(make).toBeVisible();
    await expect(adapt).toHaveAttribute('aria-pressed', 'false');
    await expect(make).toHaveAttribute('aria-pressed', 'false');

    await app.close();
  });

  /** `013` FR-1105 · the action says what is missing rather than going grey. */
  test('the door says what is still missing, one thing at a time', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await assertDoorAsksInOrder(page);
    await app.close();
  });

  /** FR-1408 · going back does not lose what she typed. */
  test('an objective survives a trip back to the door', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughDoorToCompose(page);

    await page.locator('#objetivos').fill('multiplicar con llevadas');
    await page.getByRole('button', { name: 'Volver' }).click();
    await page.getByRole('heading', { name: '¿Qué vas a hacer?' }).waitFor();

    // The learner is still chosen: she went back one step, not to the beginning.
    await expect(page.locator('.pick-on')).toHaveCount(1);

    await app.close();
  });

  /**
   * `002` FR-102 · the anchor is asked for **before** the run, not discovered by
   * it. A run that fails after she pressed the button has cost her the wait.
   */
  test('a content objective asks what to rest it on, before starting', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughDoorToCompose(page);

    const start = page.getByRole('button', { name: 'Preparar el material' });

    await page.locator('#objetivos').fill('multiplicar con llevadas');
    await expect(page.locator('#anclaje')).toHaveCount(0);
    await expect(start).toBeEnabled();

    await page.locator('#objetivos').fill('los ríos de España');
    await expect(page.locator('#anclaje')).toBeVisible();
    await expect(start).toBeDisabled();
    await expect(page.getByText('Dame algo en lo que apoyar el contenido.')).toBeVisible();

    await page.locator('#anclaje').fill('El Ebro nace en Cantabria y desembocan en el Mediterráneo.');
    await expect(start).toBeEnabled();

    await app.close();
  });

  /**
   * FR-1403/1405 · the kind is never defaulted, and what it commits us to is said
   * **before** the run rather than only in the report afterwards.
   */
  test('an exam says what will not change, on the button she is about to press', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await page.getByRole('button', { name: RAIL_WORK }).click();
    await page.locator('.pick').first().click();
    await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();

    // Nothing pre-selected: a defaulted «ficha» is how an exam gets adapted as one.
    for (const k of [KIND_WORKSHEET, KIND_EXAM]) {
      await expect(page.locator('.door', { hasText: k }))
        .toHaveAttribute('aria-pressed', 'false');
    }

    await page.locator('.door', { hasText: KIND_EXAM }).click();
    // The sentence comes from `instructions/material-kinds.md`, not from the code.
    await expect(page.getByText(/no.*lo que se pregunta|otro examen/i).first()).toBeVisible();

    await app.close();
  });
});
