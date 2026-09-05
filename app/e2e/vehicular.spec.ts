import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * Amina llega en febrero (033 T016, FR-3101/3102/3104, SC-3101).
 *
 * ## The case, and what «works» means for it
 *
 * A learner arrives mid-course without the classroom's language. Nobody has assessed his
 * attention or his working memory, and there is nothing wrong with either — so his profile
 * has **no observed axis at all**, and before this it selected no recipe: an adaptation
 * that adapted nothing, for the child this feature exists for.
 *
 * The walk records the mark, and asserts three things about what happens next: the profile
 * carries it as a dated observation, selection is no longer empty, and no language appears
 * anywhere that she did not type.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-veh-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-veh-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  return { app, page, vault };
}

async function seed(page: Page, vault: string): Promise<string> {
  const code: string = await page.evaluate(async (root) => {
    await window.rampa.vault.use(root);
    const c: string = await window.rampa.learners.newCode();
    // No axis observed. That is the case: he has no barrier, he has no language yet.
    await window.rampa.learners.save({
      code: c, axes: {}, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
      year: 'es:primaria-4', age: 9,
    });
    await window.rampa.names.set(c, 'Amina');
    await window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key');
    // Her note names the country, which is what a teacher writes.
    await window.rampa.vault.write(`profiles/${c}/notes.md`,
      `---\nlearner: ${c}\n---\n\n## 2026-02-10 · Llegada\nLlegó de Marruecos en febrero.\n`);
    return c;
  }, vault);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const profileOnDisk = (page: Page, code: string) => page.evaluate(async (c) => {
  const doc = await window.rampa.vault.read(`profiles/${c}/profile.yaml`) as
    { data: Record<string, unknown> } | null;
  return doc?.data ?? null;
}, code);

const openProfile = async (page: Page): Promise<void> => {
  await intoNamedLearner(page, 'Amina');
  await toTab(page, 'who');
  await page.getByText('Sigue la clase en el idioma del aula').waitFor();
};

test.describe('recording that he is still learning the classroom language', () => {
  test('the mark is its own thing, beside the axes and never inside them', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openProfile(page);

    /*
     * The sentence that keeps this and `LIN` apart, on the screen where the confusion
     * used to happen. Without it she does what she has been doing: `LIN: 2`, which writes
     * a language disorder into a record that follows him.
     */
    await expect(page.getByText(/No es una dificultad de lenguaje/)).toBeVisible();
    // …and it points at where a real language disorder goes, so the two stay apart in
    // her head as well as in the file. Scoped: «Entender el texto» is also an axis label
    // on this same screen, which is the point.
    await expect(page.getByText(/eso va en «Entender el texto»/)).toBeVisible();

    await app.close();
  });

  test('she sets it, types the language, and both reach her file with a date', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    const block = page.locator('.stack.gap2')
      .filter({ hasText: 'Sigue la clase en el idioma del aula' }).first();
    await block.getByRole('button', { name: '2', exact: true }).click();
    await page.getByLabel('¿Qué idiomas habla?').fill('árabe');
    await page.getByRole('button', { name: 'Añadir un idioma' }).click();
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    const data = (await profileOnDisk(page, code))!;
    const mark = data['vehicular'] as { intensity: number; languages: string[]; noted_on: string };
    expect(mark.intensity).toBe(2);
    expect(mark.languages).toEqual(['árabe']);
    // A real annotation date, written at save time (P44) — never derived or backfilled.
    expect(mark.noted_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // And it is a sibling of `axes`, which stays empty: he has no observed barrier.
    expect(data['axes']).toEqual({});

    await app.close();
  });

  test('and his profile stops selecting nothing (SC-3101)', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);
    const block = page.locator('.stack.gap2')
      .filter({ hasText: 'Sigue la clase en el idioma del aula' }).first();
    await block.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    /*
     * The whole point, asserted over the **real** corpus and through the surface she
     * actually sees: `job:profileGap` is «cuántas adaptaciones va a haber», the screen
     * `020` puts in front of her before she spends.
     *
     * Asked through an existing channel rather than a new one written for this test — a
     * channel that exists only to be asserted is a value written for a test.
     */
    await page.evaluate(async () => {
      await window.rampa.vault.write('material/job-v/ir.md',
        '---\nsource: "pegado"\nlang: "es"\n---\n\n'
        + '::: {#b1 .instruction}\nResuelve estas multiplicaciones.\n:::\n\n'
        + '::: {#e1 .exercise}\n1. 3 × 6 =\n:::\n');
    });

    const gap = await page.evaluate((c) =>
      window.rampa.job.profileGap('job-v', c) as Promise<{
        willApply: number;
        disabled: Array<{ recipe: string }>;
      }>, code);

    /*
     * Three, and they are the three vehicular recipes — a count rather than a list
     * because that is what this screen answers («N adaptaciones»).
     *
     * Before the mark this was **zero**: a profile with no observed axis selected
     * nothing, and «voy a hacerte 0 adaptaciones» is what she was told about the child
     * this feature exists for.
     */
    expect(gap.willApply, JSON.stringify(gap)).toBe(3);

    /*
     * And the recipes that are off are off for want of an **observation**, not for want
     * of the mark: the vehicular three are nowhere in that list.
     */
    const off = gap.disabled.map((d) => d.recipe);
    expect(off).not.toContain('apoyo-visual-instrucciones');
    expect(off).not.toContain('lenguaje-claro-transitorio');
    expect(off).not.toContain('vocabulario-clave-con-puente');
    // The decoding recipe **is** off, and correctly: he reads his own language fluently.
    expect(off).toContain('lectura-facil-es');

    await app.close();
  });

  test('nothing pre-fills a language from her note about his country', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);
    const block = page.locator('.stack.gap2')
      .filter({ hasText: 'Sigue la clase en el idioma del aula' }).first();
    await block.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    /*
     * Her note says «Llegó de Marruecos». Nothing turns that into Arabic — not the
     * screen, not the file. A guess would be right often enough to look like a feature
     * and wrong for the Amazigh speaker, the French-schooled child and the one whose
     * family speaks Spanish at home.
     */
    const mark = (await profileOnDisk(page, code))!['vehicular'] as { languages: string[] };
    expect(mark.languages).toEqual([]);
    expect(await page.locator('body').innerText()).not.toMatch(/árabe|arabe/i);

    await app.close();
  });
});
