import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toPrepare, KIND_WORKSHEET, KIND_EXAM, throughPrepareToAdapt } from './nav.js';

/**
 * «Qué es este material» (012 T016, quickstart §6).
 *
 * The finding this specification exists for: `job:create` wrote
 * `kind: 'worksheet'` for **every** document anybody ever brought, so an exam became
 * a worksheet before the model saw it — silently, and the hard rule about preserving
 * the criterion had nothing telling it which documents it governed.
 *
 * So the assertions are about the question being **asked**, never pre-answered, and
 * about the answer surviving into the interface's own words.
 *
 * What this cannot check is SC-1001 — the same exam adapted twice, once as each kind,
 * with no assessed criterion changed. That needs a key and a teacher's judgement, and
 * it is recorded as unmet rather than approximated.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-material-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-material-v-')), 'Rampa');
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

async function seed(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2, ATE: 2 }, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
}

test.describe('she says what the material is', () => {
  /** FR-1001/1403 — and «nothing pre-selected» is the whole finding. */
  test('the four kinds are offered and none is chosen for her', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await toPrepare(page, { name: 'Lucía' });
    await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();

    /*
     * Document-wide now, and the scoping comment that used to live here is worth
     * keeping as history: the door asked «¿qué vas a hacer?» and «¿y qué es?» on one
     * screen, and the adapt door's own description says «Una ficha, un examen, unos
     * apuntes, una hoja de problemas» — so a locator for a kind matched the branch as
     * well, and Playwright's strict mode caught the same ambiguity a teacher met as a
     * moment of hesitation.
     *
     * `020` made them two screens, so the branch is not on this one and the ambiguity
     * is gone by construction rather than by a careful locator.
     */
    for (const kind of [KIND_WORKSHEET, KIND_EXAM, 'Apuntes o un texto para estudiar',
      'Una hoja de problemas']) {
      const control = page.locator('.door', { hasText: kind });
      await expect(control, kind).toBeVisible();
      await expect(control, `${kind} must not be pre-selected`)
        .toHaveAttribute('aria-pressed', 'false');
    }

    // And the action says what is missing rather than going grey with no reason.
    await expect(page.getByText('Dime qué es este material.')).toBeVisible();

    await app.close();
  });

  /** FR-1402 — the interface stops calling everything «una ficha». */
  test('nothing in the rail or the flow calls everything a ficha', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    // «Adaptar material» was the rail's word for all four kinds. `020` T028 took the
    // whole entry out of the top level, so neither name is there to check any more —
    // what is checked is that no name came back in its place.
    await expect(page.getByRole('button', { name: 'Adaptar material' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Preparar material' })).toHaveCount(0);

    await toPrepare(page, { name: 'Lucía' });
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    expect(heading).not.toMatch(/ficha/i);

    // And the step that does ask names all four rather than one of them.
    await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();
    const step = await page.getByRole('heading', { level: 1 }).textContent();
    expect(step).not.toMatch(/ficha/i);

    await app.close();
  });

  /**
   * FR-1405 — what an exam commits us to, **before** the run.
   *
   * On the primary action's own row rather than in a callout above the form: a
   * callout at the top is read once and then becomes furniture, and this sentence has
   * to be adjacent to the commitment.
   */
  test('choosing exam says what will not change, on the button she is about to press', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await toPrepare(page, { name: 'Lucía' });
    await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();
    await page.locator('.door', { hasText: KIND_EXAM }).click();

    const note = page.locator('.actions-note');
    await expect(note).toContainText(/examen/i);
    await expect(note).toContainText(/no.*lo que se pregunta|otro examen/i);

    await app.close();
  });

  /** FR-1404 — the word she chose survives into the screens that follow. */
  test('the kind she chose is not asked again on the next screen', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await throughPrepareToAdapt(page, { kind: KIND_EXAM });

    // `016`'s contract rule 1: no screen re-asks what the intent already holds.
    const kindFieldset = page.locator('fieldset', { hasText: '¿Qué es?' });
    await expect(kindFieldset).toBeHidden();

    await app.close();
  });

  /**
   * FR-1003 — the handler refuses an unasked kind rather than coercing it.
   *
   * Driven through the real channel, because the defect this replaced was in the
   * handler and not on a screen: a renderer that forgot to pass a kind used to get
   * `worksheet` written for it.
   */
  test('creating a job with no kind is refused, not defaulted', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const outcome = await page.evaluate(async () => {
      try {
        await window.rampa.job.create('e2e-no-kind', 'Un texto cualquiera.', '', 'es');
        return 'accepted';
      } catch (e) {
        return String((e as Error).message);
      }
    });

    expect(outcome).not.toBe('accepted');
    expect(outcome).toMatch(/ficha|examen|apuntes|problemas/i);

    // And nothing was written for it.
    const exists = await page.evaluate(() =>
      window.rampa.job.list().then((l) => (l as string[]).includes('e2e-no-kind')));
    expect(exists).toBe(false);

    await app.close();
  });

  /** And an unrecognised one is refused too — a signal, not a typo to sanitise. */
  test('an unknown kind is refused rather than coerced', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const outcome = await page.evaluate(async () => {
      try {
        await window.rampa.job.create('e2e-bad-kind', 'Texto.', 'examen-de-mates', 'es');
        return 'accepted';
      } catch (e) {
        return String((e as Error).message);
      }
    });

    expect(outcome).not.toBe('accepted');

    await app.close();
  });
});
