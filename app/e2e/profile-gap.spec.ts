import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughPrepareToAdapt } from './nav.js';

/**
 * What the profile is not telling us yet, said **before she pays** (FLU-12, P15).
 *
 * ## The finding, from a tutor's side
 *
 * The design is right and the experience is wrong. An unobserved axis is `null`,
 * not zero, and recipes keyed on it stay off — guessing a zero would silently
 * disable adaptations the learner may need (hard rule 3). But a tutor who is not a
 * PT leaves half the interview blank because he genuinely does not know the
 * answers («¿cómo te muestra lo que sabe cuando escribir no es la vía?»), few
 * recipes select, the sheet comes back looking almost like the original, and his
 * conclusion in week one is **«esta herramienta no hace nada»** rather than «mi
 * perfil está incompleto».
 *
 * The diagnosis existed. It arrived in the report, which is after the money.
 *
 * ## Why this is an end-to-end test
 *
 * `packages/core/test/core.test.ts` holds what `profileGap` computes. What only a
 * real window can show is that the notice appears **before** the run starts and
 * that saying «antes completo su perfil» spends nothing — which is the whole
 * requirement, and it is a fact about a screen.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-gap-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-gap-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  return { app, page, vault };
}

/**
 * A half-filled profile: two axes observed, eight not.
 *
 * `COG` and `ATE` at 2 means real adaptations do select, so the notice is about an
 * incomplete profile rather than about an empty one — the case a tutor is actually
 * in, and the one where «esta herramienta no hace nada» gets said.
 */
async function seed(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2, ATE: 2 }, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  // Not a key: `providers:save` does not validate, so this passes onboarding
  // without a byte leaving the machine.
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
}

/** Through the door, paste something, and stop at the verification screen. */
async function toVerify(page: Page): Promise<void> {
  await throughPrepareToAdapt(page);
  await page.locator('#text').fill('Las plantas fabrican su alimento con la luz del sol.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Comprueba que lo he leído bien' })
    .or(page.getByText('Comprueba que lo he leído bien')).first().waitFor({ timeout: 15000 });
}

test.describe('before she spends', () => {
  test('says how many adaptations there will be, and what is not observed yet', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toVerify(page);

    await page.getByRole('button', { name: 'Está bien leído, sigue' }).click();

    const gate = page.getByText('Antes de gastar: lo que sé de este alumno');
    await expect(gate).toBeVisible({ timeout: 15000 });

    const body = await page.locator('.main').innerText();
    // The number she is deciding on, and whose sheet it is.
    expect(body).toMatch(/Lucía/);
    expect(body).toMatch(/voy a aplicarle \d+ adaptaci/);
    // And why some are not applied, in the corpus's own vocabulary.
    expect(body).toMatch(/Sin observar:/);
    expect(body).toMatch(/Qué mirar en clase para completarlo/);

    // The run has not started: this is before, which is the entire point.
    expect(body).not.toContain('Trabajando');

    await page.screenshot({ path: 'test-results/profile-gap.png', fullPage: true });
    await app.close();
  });

  test('the words about what to look for come from the corpus, not from a screen', async () => {
    /*
     * Principle I. What to observe in a child is pedagogical judgement, so every
     * sentence under «Qué mirar en clase» is a level description from
     * `instructions/axes.md` — checked by comparing the two.
     */
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toVerify(page);
    await page.getByRole('button', { name: 'Está bien leído, sigue' }).click();
    await expect(page.getByText('Antes de gastar: lo que sé de este alumno')).toBeVisible({ timeout: 15000 });

    await page.getByText('Qué mirar en clase para completarlo').first().click();
    const shown = await page.locator('.main').innerText();

    const defs = await page.evaluate(() => window.rampa.corpus.axes()) as
      Array<{ key: string; name: string; levels: string[] }>;
    const decoding = defs.find((d) => d.key === 'DEC')!;
    expect(shown).toContain(decoding.name);
    expect(shown).toContain(decoding.levels[0]!);

    await app.close();
  });

  test('«antes completo su perfil» spends nothing and starts nothing', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toVerify(page);
    await page.getByRole('button', { name: 'Está bien leído, sigue' }).click();
    await expect(page.getByText('Antes de gastar: lo que sé de este alumno')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Antes completo su perfil' }).click();
    await expect(page.getByText('Antes de gastar: lo que sé de este alumno')).toBeHidden();

    // Back on the verification screen with nothing run and nothing written.
    await expect(page.getByRole('button', { name: 'Está bien leído, sigue' })).toBeVisible();
    const spent = await page.evaluate(() => window.rampa.cost.month()) as { cents: number | null };
    expect(spent.cents ?? 0, 'a notice she declined charged her').toBe(0);

    await app.close();
  });
});
