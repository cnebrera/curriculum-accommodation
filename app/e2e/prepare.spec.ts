import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  toPrepare, throughPrepareToCompose, assertPrepareAsksTheKind, KIND_WORKSHEET, KIND_EXAM,
} from './nav.js';

/**
 * What the door promised, kept by «Preparar» (016 → 020 T028).
 *
 * Was `door.spec.ts`. The door is retired and **its claims are not**: `016` FR-1402
 * through FR-1412 are restated by `020`, so every case here survived the move with its
 * assertion intact and its route rewritten. A case deleted along with the screen it
 * walked would have been this feature quietly dropping a requirement.
 *
 * The one that matters is **SC-1401**: a teacher with no material and one objective
 * gets to the compose screen without ever seeing a file picker. That sentence is the
 * whole reason `016` existed — `002` was finished code no teacher could reach, because
 * the only entry point asked for a file. It is now one click further in (through the
 * learner) and still true, which is the point of asserting it here rather than trusting
 * that moving screens around cannot break it.
 *
 * What these tests cannot cover: the composition itself needs a provider, and there is
 * no key here on purpose. So they assert the *route* is open, and `002`'s own suite
 * asserts what happens down it.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-prepare-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-prepare-v-')), 'Rampa');
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

test.describe('dentro del alumno, dos clases de trabajo', () => {
  /** SC-1401, and the reason `016` exists. */
  test('she reaches the compose screen without ever seeing a file picker', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);

    await throughPrepareToCompose(page);

    await expect(page.getByRole('heading', { name: /Hacer material para que aprenda/ }))
      .toBeVisible();
    // Not «no file dialog opened» — «nothing on the route even offered one».
    await expect(page.getByRole('button', { name: /Traer una foto/ })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    await app.close();
  });

  /**
   * FR-1401's substance, relocated: the two branches are peers and neither is
   * pre-selected (`020` FR-1812).
   *
   * `aria-pressed` is gone from these two and that is not a loosened assertion: in the
   * door they were a *selection* that had to be shown as unmade, and here they are a
   * departure — one click and you are in the branch, so there is no chosen-or-not state
   * for the attribute to carry. What is asserted instead is that neither is marked as
   * the way forward, which is the same promise in the shape the screen actually has.
   */
  test('both kinds of work are offered, and neither is chosen for her', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await toPrepare(page, { name: 'Lucía' });

    const adapt = page.locator('.door', { hasText: 'Adaptar algo que tengo' });
    const make = page.locator('.door', { hasText: 'Hacer material para que aprenda' });

    await expect(adapt).toBeVisible();
    await expect(make).toBeVisible();
    await expect(page.locator('.door-on')).toHaveCount(0);
    await expect(page.locator('.btn-primary')).toHaveCount(0);

    await app.close();
  });

  /** `013` FR-1105 · the action says what is missing rather than going grey. */
  test('it says what is still missing, and no longer asks for whom', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await toPrepare(page, { name: 'Lucía' });
    await assertPrepareAsksTheKind(page);
    await app.close();
  });

  /**
   * FR-1408 · one branch is reachable from the other without losing the learner.
   *
   * The door's version of this test asserted `.pick-on` — that backing out kept the
   * child chosen — and it is worth being exact about what replaced it, because the
   * temptation was to call the case obsolete and delete it.
   *
   * The child cannot be lost now: she is *inside* him, his name is in the rail, and
   * leaving a flow lands on his own «¿Qué necesitas?» rather than on a picker. So the
   * assertion is stronger than the old one and checks what FR-1408 was protecting.
   *
   * What is **not** claimed: that the objective she typed survives. It does not — it
   * lives in the compose screen's own state, and it did not survive the door either.
   * That test was called «an objective survives a trip back to the door» and then
   * asserted the learner; recorded here rather than quietly re-asserted, because a
   * name that overstates its assertion is how the gap lasted this long.
   */
  test('leaving one branch keeps the learner, and offers the other', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughPrepareToCompose(page);

    await page.locator('#objetivos').fill('multiplicar con llevadas');
    await page.getByRole('button', { name: /Dejarlo por ahora/ }).click();

    await expect(page.getByRole('heading', { name: /^Prepararle algo a Lucía/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /^Apartados de/ })).toBeVisible();
    await expect(page.locator('.door', { hasText: 'Adaptar algo que tengo' })).toBeVisible();

    await app.close();
  });

  /**
   * `002` FR-102 · the anchor is asked for **before** the run, not discovered by
   * it. A run that fails after she pressed the button has cost her the wait.
   */
  test('a content objective asks what to rest it on, before starting', async () => {
    const { app, page, vault } = await launch();
    await seedOne(page, vault);
    await throughPrepareToCompose(page);

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
    await toPrepare(page, { name: 'Lucía' });
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
