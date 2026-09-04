import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab } from './nav.js';

/**
 * One choice, in the real window (011 T019, quickstart §6).
 *
 * The claim under test: **she says the year once and never types an age.** She picks
 * «5.º de Primaria» — the thing she says without thinking — and the stage and the age
 * come with it.
 *
 * And the two directions that matter more than the happy path:
 *
 * - **Changing the age must leave the year alone.** A fourteen-year-old in 5.º de
 *   Primaria is the case this whole feature exists for, and an application that
 *   «corrected» the year would be arguing with her about a child she has in front of
 *   her.
 * - **A year with no typical age fills nothing.** Educación especial and adult
 *   education say nothing about age, and a plausible guess there gets used.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-learner-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-learner-v-')), 'Rampa');
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

/** Past onboarding, and into the profile editor for a new learner. */
async function newProfile(page: Page, vault: string): Promise<void> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });

  await page.getByRole('button', { name: 'Mis alumnos' }).click();
  await page.getByRole('button', { name: /Añadir un alumno|Añadir alumno/ }).first().click();
  await page.locator('#year').waitFor();
}

test.describe('one choice fills three fields', () => {
  test('picking a year fills the stage and the age', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    await page.locator('#year').selectOption({ label: '5.º de Primaria' });

    // The age came with the year. She typed nothing.
    await expect(page.locator('#age')).toHaveValue('10');

    await app.close();
  });

  /** The case the whole feature exists for. */
  test('changing the age leaves the year alone, and says what it will do', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    await page.locator('#year').selectOption({ label: '5.º de Primaria' });
    await page.locator('#age').fill('14');

    // The year is untouched: no correction, no reset.
    await expect(page.locator('#year')).toHaveValue('es:primaria-5');

    /*
     * And it is stated as information rather than as a warning. Two years is the
     * threshold on purpose — a sentence that fires on most learners stops being read,
     * taking the case that mattered with it.
     */
    await expect(page.getByText(/le lleva 4 años a lo habitual/i)).toBeVisible();
    await expect(page.getByText(/le hablaré como a su edad/i)).toBeVisible();

    await app.close();
  });

  test('one year of difference says nothing at all', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    await page.locator('#year').selectOption({ label: '5.º de Primaria' });
    await page.locator('#age').fill('11');

    await expect(page.getByText(/le lleva|le faltan/i)).toHaveCount(0);

    await app.close();
  });

  /** Educación especial says nothing about age, and a guess there gets used. */
  test('a year with no typical age fills nothing and says why', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    // By value, not by a label regex: `selectOption` takes a string label, and the
    // stage and the year both read «Educación especial».
    await page.locator('#year').selectOption('es:especial');

    await expect(page.locator('#age')).toHaveValue('');
    await expect(page.getByText(/el curso no dice nada de la edad/i)).toBeVisible();

    await app.close();
  });

  /**
   * FR-901 · asked, never inferred — and not asked when there is nothing to ask.
   *
   * One system ships, so the chooser is absent: a question with one answer is friction
   * four times a day. What must never happen is the system being *guessed* from the OS
   * language, and the absence of any locale-derived default is what this asserts.
   */
  test('the system is not asked when only one ships, and never inferred', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    await expect(page.locator('#system')).toHaveCount(0);

    // The course list is Spanish because one Spanish file ships, not because the
    // machine's language was consulted.
    await expect(page.locator('#year option', { hasText: '5.º de Primaria' })).toHaveCount(1);

    await app.close();
  });

  /** The stage is stored as a label, so the YAML reads without this application. */
  test('the vault stays readable: a stage label, not an id', async () => {
    const { app, page, vault } = await launch();
    await newProfile(page, vault);

    await page.locator('#year').selectOption({ label: '5.º de Primaria' });
    await page.getByRole('button', { name: /Guardar/ }).click();
    await page.getByText('Guardado').waitFor();

    /*
     * The learner that has a year, not `codes[0]`.
     *
     * Getting past onboarding needs one learner to exist, so the vault already holds
     * a seeded profile with no course — and asserting over the first code found was
     * asserting over that one. The test failed for its own reason rather than for the
     * application's, which is the shape of green-for-the-wrong-reason this suite is
     * meant to avoid.
     */
    const saved = await page.evaluate(async () => {
      const codes = (await window.rampa.learners.list()) as string[];
      for (const code of codes) {
        const loaded = await window.rampa.learners.load(code) as {
          profile: { year?: string; stage?: string; age?: number };
        };
        if (loaded.profile.year) return loaded.profile;
      }
      return {} as { year?: string; stage?: string; age?: number };
    });

    expect(saved.year).toBe('es:primaria-5');
    expect(saved.stage).toBe('Primaria');
    expect(saved.age).toBe(10);

    await app.close();
  });
});


/**
 * When a preference was noted (`004` FR-303 as amended, decision P44).
 *
 * `buildPacket` stamped `date: today()` on every `works` and `avoid` entry — **two
 * lines below** the comment in the same function explaining why exactly that would
 * be a fabrication. So a preference she noted in October reached the receiving
 * teacher dated today, on the one field whose entire job is to say how old the
 * claim is.
 *
 * The fix has to be dated **where it is written**, and the interesting half is what
 * it must *not* do: a line already in the vault with no date keeps none, because
 * «no consta» is a fact the receiving teacher needs and a plausible date is not.
 */
test.describe('a preference carries the day it was written', () => {
  test('stamps a new line and leaves an old one alone', async () => {
    const { app, page, vault } = await launch();
    await page.evaluate((root) => window.rampa.vault.use(root), vault);

    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    // A profile as it would already be in her vault: a preference, and no date for
    // it, which is every preference written before this existed.
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 2 }, works: ['Le funciona el primer paso hecho'],
      avoid: [], interests: [], response: {}, language: { instruction: 'es' },
    }), code);

    await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });

    await intoLearner(page);
    await toTab(page, 'who');

    // She adds one, keeping the one that was there.
    const works = page.locator('#works');
    await works.fill('Le funciona el primer paso hecho\nLe ayuda leerlo en voz alta');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('Guardado').waitFor({ timeout: 15000 });

    /*
     * The parsed front matter rather than the raw text: what matters is the *map*,
     * `noted_on`, and reading it as a structure means the assertion does not depend
     * on how the YAML writer happens to wrap a long line.
     */
    const noted = await page.evaluate((c) =>
      window.rampa.vault.read(`profiles/${c}/profile.yaml`), code) as
      { data: { noted_on?: Record<string, string> } } | null;
    const map = noted?.data.noted_on ?? {};
    const today = new Date().toISOString().slice(0, 10);

    // The line she just wrote is dated today.
    expect(map['Le ayuda leerlo en voz alta']).toBe(today);
    /*
     * And the one that was already in the vault with no date **still has none**.
     * Inventing one is the fabrication this whole item is about, and it would be
     * the easy thing to do here — stamp everything on every save.
     */
    expect(map).not.toHaveProperty('Le funciona el primer paso hecho');

    await app.close();
  });
});
