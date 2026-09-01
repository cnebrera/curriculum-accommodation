import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toCaseload, toTab, learnerRail, rail, TAB } from './nav.js';

/**
 * The navigation, end to end (020 T017, quickstart §2).
 *
 * The assertion that matters is the fourth one, and it is the whole reason `020` exists:
 * **the record of what has been prepared for a child is reachable without opening the
 * profile editor.** It used to be a button on the fifth card underneath the edit-profile
 * form, so seeing what you had made for a child meant going in to *edit* them.
 *
 * Everything else here is the shape that makes that true: the application opens on her
 * caseload, a learner is a place with a menu, and the menu still works from inside a
 * section.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-nav-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-nav-v-')), 'Rampa');
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

/** Two learners, so «which one am I inside?» is a question with a wrong answer. */
async function seed(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  // Onboarding is three steps and the rail only exists after all three, so a seeded
  // vault needs a stored key too — otherwise every assertion below waits on a screen
  // that is still asking to connect.
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));

  for (const name of ['Lucía', 'Marco']) {
    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 3, ATE: 2 }, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
    }), code);
    await page.evaluate((args) => {
      const [c, n] = args as [string, string];
      return window.rampa.names.set(c, n);
    }, [code, name]);
  }

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await rail(page).waitFor({ timeout: 15000 });
}

test.describe('her caseload is where she starts', () => {
  test('the application opens on her learners, not on a question about work', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    // FR-1801. The door asked «¿Qué vas a hacer?» first; she arrives thinking about a
    // child, so the children are the first thing on screen.
    await expect(page.getByRole('heading', { name: 'Mis alumnos', level: 1 })).toBeVisible();
    await app.close();
  });

  test('picking a learner puts her inside that learner', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);

    // Named, and unambiguously (FR-1806, `005` FR-513) — at the top of their own rail.
    // Which name is whichever the caseload put first: the list does not rank children
    // (`015` FR-1309).
    await expect(page.locator('.rail-who')).not.toBeEmpty();
    const menu = learnerRail(page);
    for (const label of Object.values(TAB)) {
      await expect(menu.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await app.close();
  });

  test('the record is reached without opening the profile editor', async () => {
    /*
     * **The assertion this whole specification exists for** (FR-1805).
     *
     * Before `020` the walk was: caseload → learner → the profile editor opens →
     * scroll past five cards → «Ver lo que le he preparado». The work of the tool was
     * hidden inside a form.
     */
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);
    await toTab(page, 'made');

    await expect(page.getByRole('heading', { name: /Lo que he preparado para/ })).toBeVisible();
    // And the editor's own fields are not on this screen at all, which is what «without
    // opening the editor» means when checked rather than asserted.
    await expect(page.locator('#interests')).toHaveCount(0);
    await app.close();
  });

  test('every section is reachable, and each says which one it is', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);
    const menu = learnerRail(page);

    for (const tab of ['who', 'prepare', 'made', 'curriculum'] as const) {
      await toTab(page, tab);
      // FR-1810 · the active section is marked by something that is not colour.
      await expect(menu.getByRole('button', { name: TAB[tab], exact: true }))
        .toHaveAttribute('aria-current', 'page');
      // FR-1807 · and the menu never disappears.
      await expect(menu).toBeVisible();
    }
    await app.close();
  });

  test('«Mis alumnos» from inside a learner goes back to the list', async () => {
    // FR-1809, and this shipped broken once: the rail set a `view` it already had while
    // the screen's own state survived, so the one control that must always mean «start
    // again here» was the one that looked broken.
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);
    await toTab(page, 'made');
    await toCaseload(page);

    await expect(page.getByRole('heading', { name: 'Mis alumnos', level: 1 })).toBeVisible();
    // The rail is back to being Rampa's, so there is no learner rail on screen at all —
    // which is the whole of option A: one menu, never two.
    await expect(learnerRail(page)).toHaveCount(0);
    await app.close();
  });

  test('going into a second learner does not show the first', async () => {
    /*
     * Reads the first learner's heading rather than asserting a name.
     *
     * The first draft expected «Lucía» at index 0 and the caseload showed Marco — the
     * list makes no promise about order, and `015` FR-1309 is specifically that it must
     * not rank children. A test that pins an order is a test that would fail the day
     * that requirement is honoured harder, which is the wrong way round.
     */
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);
    const first = (await page.locator('.rail-who').textContent())?.trim() ?? '';
    expect(first.length).toBeGreaterThan(0);

    await intoLearner(page, 1);
    const second = (await page.locator('.rail-who').textContent())?.trim() ?? '';
    expect(second).not.toBe(first);
    await expect(page.locator('.rail-who')).not.toContainText(first);
    await app.close();
  });

  test('every section is reachable by keyboard alone', async () => {
    // FR-1822. A menu that needs a mouse is a menu half her colleagues cannot use.
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page, 0);

    const target = learnerRail(page).getByRole('button', { name: TAB.made, exact: true });
    await target.focus();
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Lo que he preparado para/ })).toBeVisible();
    await app.close();
  });

  test('US1 removes nothing: the door is still reachable', async () => {
    /*
     * The sequencing promise, asserted rather than trusted. `020` ships in pieces and
     * the door goes at T028 — until then there must be no moment where the work cannot
     * be done, and a test is the only way that stays true while the code moves.
     */
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await page.getByRole('button', { name: 'Preparar material' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué vas a hacer?' })).toBeVisible();
    await app.close();
  });
});
