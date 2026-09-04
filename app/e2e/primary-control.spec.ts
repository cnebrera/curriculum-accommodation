import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCREENS, toScreen, TAB, intoLearner, toTab, throughDoorToAdapt } from './nav.js';

/**
 * One primary control per screen (`013` FR-1105, backlog G31, decision P35).
 *
 * ## Why this did not exist until now
 *
 * G31 says it plainly: «the reason it has not been written is worth stating: it
 * would probably fail on several existing screens, so writing it is a small piece
 * of work followed by an unknown amount.» So a live requirement of `013`, with
 * known violations on shipping screens, was defended by **somebody remembering to
 * look** — and `023` broke it within an hour of adding two buttons, caught by a
 * screenshot at 900px with `xlarge` text rather than by anything that could fail.
 *
 * Carlos's answer to P35 was «el test primero; los fallos son la lista de
 * trabajo», and the timing is the argument: `020` US2–US4 and the eleven new
 * features are about to add screens in a hurry. A rule that lives only in a
 * specification is a rule that holds until somebody is in a hurry.
 *
 * ## What is counted, and what is not
 *
 * Visible `.btn-primary` inside `.main`. Not the rail — its foot is a composed
 * block of controls that belong to the shell (`013` FR-1106) and it is not a
 * screen. Not `.btn-danger` either: it is a different semantic rather than a
 * second emphasis, and the screen where it appears (erasure) uses it *as* its one
 * strong control.
 *
 * At `xlarge` text and 900px too, because that is the width and scale where `023`
 * actually broke it: two buttons that sit side by side at 1366px stack into two
 * stacked solid blocks, and «emphasis that is everywhere is emphasis nowhere»
 * becomes visible exactly there.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-primary-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-primary-v-')), 'Rampa');
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

async function seed(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2, ATE: 2, DEC: 1, LIN: 1 }, works: [], avoid: [],
    interests: [], response: {}, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
}

/** The visible strong controls of the screen, by their label. */
async function primaries(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.main .btn-primary'))
      .filter((el) => el.offsetParent !== null && !el.hasAttribute('hidden'))
      .map((el) => (el.textContent ?? '').trim() || '(sin texto)'));
}

/** The largest text and the narrowest window this shell supports. */
async function hardest(page: Page): Promise<void> {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dataset['text'] = 'xlarge';
  });
  await page.waitForTimeout(120);
}

test.describe('one primary control per screen', () => {
  test('every destination the rail reaches', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const offenders: string[] = [];
    for (const screen of SCREENS) {
      await toScreen(page, screen);
      await page.waitForTimeout(150);
      const found = await primaries(page);
      if (found.length > 1) offenders.push(`${screen.label}: ${found.join(' + ')}`);
    }
    expect(offenders, 'emphasis that is everywhere is emphasis nowhere (FR-1105)')
      .toEqual([]);

    await app.close();
  });

  test('every section inside a learner', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page);

    const offenders: string[] = [];
    for (const tab of Object.keys(TAB) as Array<keyof typeof TAB>) {
      await toTab(page, tab);
      await page.waitForTimeout(150);
      const found = await primaries(page);
      if (found.length > 1) offenders.push(`${TAB[tab]}: ${found.join(' + ')}`);
    }
    expect(offenders).toEqual([]);

    await app.close();
  });

  test('the steps of preparing something, as far as they go without a provider', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const offenders: string[] = [];
    const check = async (where: string) => {
      await page.waitForTimeout(150);
      const found = await primaries(page);
      if (found.length > 1) offenders.push(`${where}: ${found.join(' + ')}`);
    };

    await page.getByRole('button', { name: 'Preparar material', exact: true }).click();
    await check('el door, antes de elegir');

    await throughDoorToAdapt(page);
    await check('adaptar · pegar el texto');

    await page.locator('#text').fill('Las plantas fabrican su alimento con la luz del sol.');
    await check('adaptar · con texto escrito');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByText('Comprueba que lo he leído bien').first().waitFor({ timeout: 15000 });
    await check('adaptar · comprobar la lectura');

    await page.getByRole('button', { name: 'Está bien leído, sigue' }).click();
    await page.getByText('Antes de gastar: lo que sé de este alumno').waitFor({ timeout: 15000 });
    await check('adaptar · el aviso de perfil');

    expect(offenders).toEqual([]);
    await app.close();
  });

  /**
   * The cost gate, which is the same shape as the profile notice and shares the
   * expression that steps the screen's own control down.
   *
   * It needs a genuinely expensive job to appear — `isUnusuallyExpensive` is
   * «more than 50 céntimos» until there are three priced jobs to average — so the
   * paste is large on purpose rather than by accident. Written because one
   * expression serving two gates is exactly the thing that gets edited for one and
   * broken for the other.
   */
  test('and while the cost gate is asking, which is the other question this screen asks', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await throughDoorToAdapt(page);
    // ~56 céntimos at the connected model's price list: over the threshold, which
    // is what makes the gate appear at all.
    await page.locator('#text').fill('Las plantas fabrican su alimento. '.repeat(11_500));
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByText('Comprueba que lo he leído bien').first().waitFor({ timeout: 30000 });

    await page.getByRole('button', { name: 'Está bien leído, sigue' }).click();
    await page.getByText('Antes de gastar: lo que sé de este alumno').waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Seguir igual' }).click();

    await page.getByText('Esto va a costar más de lo normal').waitFor({ timeout: 30000 });
    const found = await primaries(page);
    expect(found, 'two solid buttons while she is being asked a question')
      .toEqual(['Adelante']);

    await app.close();
  });

  /**
   * The width and the text scale where `023` actually broke it. Same walk, at the
   * size where two side-by-side buttons become two stacked solid blocks.
   */
  test('and at 900px with the largest text, which is where it broke last time', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await hardest(page);

    const offenders: string[] = [];
    for (const screen of SCREENS) {
      await toScreen(page, screen);
      await page.waitForTimeout(150);
      const found = await primaries(page);
      if (found.length > 1) offenders.push(`${screen.label}: ${found.join(' + ')}`);
    }

    await intoLearner(page);
    for (const tab of Object.keys(TAB) as Array<keyof typeof TAB>) {
      await toTab(page, tab);
      await page.waitForTimeout(150);
      const found = await primaries(page);
      if (found.length > 1) offenders.push(`alumno · ${TAB[tab]}: ${found.join(' + ')}`);
    }

    expect(offenders).toEqual([]);
    await app.close();
  });
});
