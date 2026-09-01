import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughDoorToCompose } from './nav.js';

/**
 * She says what kind of material she wants (021 T025, quickstart §5).
 *
 * «Solo me ha dicho de preparar fichas» was literally true: the kind was derived from
 * whatever came out, silently, and an exam was unreachable. The interesting assertions
 * here are the two about the exam, because that is the one where Rampa is proposing the
 * questions of a graded test rather than adapting one somebody wrote.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-kind-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-kind-v-')), 'Rampa');
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

async function seedOne(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: 'Secciones de Rampa' }).waitFor({ timeout: 15000 });
}

test.describe('what kind of material she wants', () => {
  test('offers the four kinds, with nothing chosen for her', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    // Deliberately does NOT use the helper's kind step: this test is about that step.
    await page.getByRole('button', { name: 'Preparar material' }).click();
    await page.locator('.pick').first().click();
    await page.locator('.door', { hasText: 'Hacer material para que aprenda' }).click();
    await page.getByRole('button', { name: 'Empezar', exact: true }).click();
    await page.locator('#objetivos').waitFor();

    for (const label of ['Una ficha o unos ejercicios', 'Un examen o una prueba',
                         'Apuntes o un texto para estudiar', 'Una hoja de problemas']) {
      const control = page.locator('.door', { hasText: label });
      await expect(control).toBeVisible();
      // `012` FR-1001 · nothing is pre-selected. A defaulted «ficha» is how an exam gets
      // written as a worksheet before the model ever sees it.
      await expect(control).toHaveAttribute('aria-pressed', 'false');
    }
    await app.close();
  });

  test('shows her which one she chose', async () => {
    /*
     * The assertion that was missing, and Carlos found what it cost: «no me deja
     * seleccionar el que quiero que prepare». It did let him — `aria-pressed` flipped and
     * the primary control unlocked — but the CSS paints the chosen state from `door-on`,
     * which was not there. So the screen looked identical before and after the click.
     *
     * The first version of this spec checked `aria-pressed`, which is the assistive
     * channel, and nothing about the visible one. A state carried by one channel is a
     * state somebody cannot perceive (`010` FR-812) — and here *everybody* could not.
     */
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughDoorToCompose(page, { kind: 'Un examen o una prueba' });

    const exam = page.locator('.door', { hasText: 'Un examen o una prueba' });
    const worksheet = page.locator('.door', { hasText: 'Una ficha o unos ejercicios' });

    // Both channels, on the one she chose.
    await expect(exam).toHaveAttribute('aria-pressed', 'true');
    await expect(exam).toHaveClass(/door-on/);
    // And neither on the ones she did not.
    await expect(worksheet).toHaveAttribute('aria-pressed', 'false');
    await expect(worksheet).not.toHaveClass(/door-on/);

    // Choosing another moves it, rather than adding a second.
    await worksheet.click();
    await expect(worksheet).toHaveClass(/door-on/);
    await expect(exam).not.toHaveClass(/door-on/);
    await app.close();
  });

  test('will not start until she has said which', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await page.getByRole('button', { name: 'Preparar material' }).click();
    await page.locator('.pick').first().click();
    await page.locator('.door', { hasText: 'Hacer material para que aprenda' }).click();
    await page.getByRole('button', { name: 'Empezar', exact: true }).click();

    await page.locator('#objetivos').fill('multiplicar con llevadas');
    const start = page.getByRole('button', { name: 'Preparar el material' });
    // And it says what is missing rather than going grey (`013` FR-1105).
    await expect(start).toBeDisabled();
    await expect(page.getByText('Dime primero qué quieres que prepare.')).toBeVisible();

    await page.locator('.door', { hasText: 'Una ficha o unos ejercicios' }).click();
    await expect(start).toBeEnabled();
    await app.close();
  });

  test('warns her what composing an exam means, before she starts', async () => {
    /*
     * `016` FR-1405's rule, applied to **writing** rather than to adapting: the
     * constraint is stated before the run, not only in the report afterwards. Here the
     * constraint is that Rampa is proposing the questions of a graded test and she is the
     * one who validates them.
     */
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughDoorToCompose(page, { kind: 'Un examen o una prueba' });

    const exam = page.locator('.door', { hasText: 'Un examen o una prueba' });
    await expect(exam).toContainText('validas');
    // And the other three carry no such sentence: a warning on everything is a warning
    // on nothing.
    await expect(page.locator('.door', { hasText: 'Una hoja de problemas' }))
      .not.toContainText('validas');
    await app.close();
  });

  test('the kind she chose is what the request carries', async () => {
    // The refusal is structural: the handler will not compose without a kind it knows,
    // exactly as `job:create` refuses for pasted material.
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    const message: string = await page.evaluate(async () => {
      try {
        await window.rampa.job.compose('job-x', {
          learnerCode: 'ZZ9', objectives: ['multiplicar'], kind: '',
        });
        return 'no error';
      } catch (e) { return (e as Error).message; }
    });
    expect(message).toContain('Dime qué quieres que prepare');

    const unknown: string = await page.evaluate(async () => {
      try {
        await window.rampa.job.compose('job-y', {
          learnerCode: 'ZZ9', objectives: ['multiplicar'], kind: 'quiz-sorpresa',
        });
        return 'no error';
      } catch (e) { return (e as Error).message; }
    });
    // Refused rather than coerced: a value that should not exist is a signal.
    expect(unknown).toContain('Dime qué quieres que prepare');
    await app.close();
  });
});
