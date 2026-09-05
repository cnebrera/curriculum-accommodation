import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * The social story, in the real window (028 T027, FR-2609/2610/2611).
 *
 * ## What can be walked without money, and what cannot
 *
 * Drafting needs a provider, so «escribe una historia sobre el comedor» end to end is the
 * paid walk and it is not here. What **is** walked is everything the shape guarantees
 * around the provider call — and that is where every one of this story's requirements
 * lives:
 *
 * - the cost is on screen **before** she decides, not in a ledger afterwards;
 * - her situation text and anything she pasted are two boxes, because one is an
 *   instruction and the other is a document somebody else wrote;
 * - the invented-details warning is there before she asks, not only in the report;
 * - and with no provider connected, nothing is written and nothing is spent.
 *
 * The last one is the sharpest and it is the one a test with no key can make on demand.
 */
const appRoot = process.cwd();

/**
 * The key is always saved at launch, and removed **after** arriving when a test needs it
 * gone.
 *
 * Not a convenience: `detectStep` sends a vault with no provider to the connect step, so
 * an application that starts keyless never shows the learner's menu at all and the walk
 * cannot reach the screen under test. Removing it once she is there is also the honest
 * order of events — she connected a service in September and withdrew the key in March.
 */
async function launch(): Promise<{
  app: ElectronApplication; page: Page; vault: string; code: string;
}> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-story-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-story-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);

  const code: string = await page.evaluate(async () => {
    const c: string = await window.rampa.learners.newCode();
    await window.rampa.learners.save({
      code: c, axes: { COG: 3 }, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
    });
    await window.rampa.names.set(c, 'Iván');
    await window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key');
    return c;
  });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return { app, page, vault, code };
}

/** She withdrew the key. The two local kinds must go on working. */
const withdrawKey = (page: Page) => page.evaluate(() =>
  window.rampa.providers.forget('anthropic'));

const openStory = async (page: Page): Promise<void> => {
  await intoNamedLearner(page, 'Iván');
  await toTab(page, 'structure');
  await page.getByRole('button', { name: /Una historia social/ }).click();
  await page.getByRole('heading', { name: 'De qué va' }).waitFor();
};

test.describe('before she asks for a story', () => {
  test('the screen says this is the one that costs money, and that it is a draft', async () => {
    const { app, page } = await launch();
    await openStory(page);

    /*
     * `006` FR-403: what it costs, **before** the decision. The other two kinds say
     * nothing about cost because there is nothing to say — they spend nothing, and a
     * warning on all three would teach her to ignore the one that matters.
     */
    await expect(page.getByText('Ésta cuesta dinero')).toBeVisible();
    // And the anti-anchoring line arrives before she asks, not only in the report: it is
    // what stops a plausible text being read as a description of a real morning.
    await expect(page.getByText(/me los invento yo/)).toBeVisible();
    await expect(page.getByText(/sin firmar/)).toBeVisible();

    await app.close();
  });

  test('her words and what she pasted are two boxes, on purpose', async () => {
    const { app, page } = await launch();
    await openStory(page);

    /*
     * Principle IX, where it is easiest to get wrong: a social story is *about* a
     * situation somebody described, so the description looks like an instruction. One box
     * would make the distinction impossible to keep — she would paste the family's note
     * in the middle of her own sentence, and it would arrive as an instruction.
     */
    await expect(page.locator('#situacion')).toBeVisible();
    await expect(page.locator('#adjunto')).toBeVisible();
    await expect(page.getByText(/nunca como instrucciones para mí/)).toBeVisible();

    await app.close();
  });

  test('and the button will not fire without a situation', async () => {
    const { app, page } = await launch();
    await openStory(page);
    await expect(page.getByRole('button', { name: 'Escribir el borrador' })).toBeDisabled();
    await page.locator('#situacion').fill('El lunes empieza a quedarse al comedor.');
    await expect(page.getByRole('button', { name: 'Escribir el borrador' })).toBeEnabled();
    await app.close();
  });
});

test.describe('with no service connected', () => {
  test('it says so, writes nothing and spends nothing', async () => {
    const { app, page, code } = await launch();
    await openStory(page);
    await withdrawKey(page);

    const before = await page.evaluate(() =>
      window.rampa.cost.month() as Promise<{ cents: number; jobs: number }>);

    const said = await page.evaluate((c) => window.rampa.structure.story({
      jobId: 'job-x', learnerCode: c, situation: 'El lunes empieza el comedor.',
      created: '2026-09-07',
    }).then(() => 'ok').catch((e: Error) => e.message), code);

    /*
     * Named, and it says which of the three kinds still works — «la agenda y las
     * secuencias las hago yo sola». A refusal that only says «no puedo» leaves her
     * thinking the whole screen is broken.
     */
    expect(said).not.toBe('ok');
    expect(said).toContain('servicio de IA');
    expect(said).toContain('secuencias');

    // Nothing on disk, and nothing in the ledger.
    const jobs = await page.evaluate(() =>
      window.rampa.vault.list('material') as Promise<string[]>);
    expect(jobs).toEqual([]);
    const after = await page.evaluate(() =>
      window.rampa.cost.month() as Promise<{ cents: number; jobs: number }>);
    expect(after.jobs).toBe(before.jobs);

    await app.close();
  });

  test('and the other two kinds still work, which is the point of saying which', async () => {
    const { app, page } = await launch();
    await intoNamedLearner(page, 'Iván');
    await toTab(page, 'structure');
    await withdrawKey(page);
    await page.locator('#momentos').fill('asamblea\npatio');
    await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
    await page.getByRole('heading', { name: 'Hecha' }).waitFor();
    await app.close();
  });
});
