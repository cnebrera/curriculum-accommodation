import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * «Bien en Lengua, dos cursos en Mates», recorded in the real window
 * (032 T014, quickstart §6, FR-3001/3005/3007).
 *
 * ## Why this one types by hand
 *
 * Every assertion below could be made with `fill()`, and one of them must not be.
 *
 * The área input was first written as an `<input list>` bound to a `<datalist>` of her
 * subjects, and pressing a single real key in it **killed the renderer** — her window
 * gone mid-sentence, with whatever she had not saved. The whole offline suite passed, and
 * so would this file, because Playwright's `fill()` sets a value without dispatching key
 * events and therefore never opens the suggestion popup that crashes.
 *
 * So the typing here is `pressSequentially`, on purpose, and the window still being alive
 * afterwards is one of the things asserted. `packages/core/test/cur-only-and-untied.test.ts`
 * keeps `<datalist>` out of the source; this keeps the *symptom* covered, because the next
 * crashing control will not be a datalist.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-cur-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-cur-v-')), 'Rampa');
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

/** Marco, in 5.º de Primaria, with a roster that already names three subjects. */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { CUR: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
    age: 11, year: 'es:primaria-5', stage: 'Primaria',
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Marco'), code);
  await page.evaluate(() => window.rampa.learners.saveRoster({
    learners: [{ code: 'X1', subjects: ['Matemáticas', 'Lengua', 'Inglés'] }],
  }));
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const openProfile = async (page: Page): Promise<void> => {
  await intoNamedLearner(page, 'Marco');
  await toTab(page, 'who');
  await page.getByText('Nivel curricular por área').waitFor();
};

/**
 * Her profile's front matter, as it is on disk.
 *
 * `vault.read` returns the **parsed** document rather than the raw text — which is what
 * the channel has always done, and what a first draft of this file assumed away. Asserting
 * on `data` is the honest version anyway: what matters is that `cur_areas` is a top-level
 * key beside `axes`, which is both what makes it legible in her editor and what makes an
 * older build carry it verbatim instead of discarding her axes with it.
 */
const profileOnDisk = (page: Page, code: string) => page.evaluate(async (c) => {
  const doc = await window.rampa.vault.read(`profiles/${c}/profile.yaml`) as
    { data: Record<string, unknown> } | null;
  return doc?.data ?? null;
}, code);

test.describe('recording that he is at level in one subject and behind in another', () => {
  test('the subjects she already uses are one press each, and it reaches the file', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    // Suggested from her roster — not from a list of Spanish school subjects, which is
    // the taxonomy FR-3007 refuses.
    for (const subject of ['Matemáticas', 'Lengua', 'Inglés']) {
      await expect(page.getByRole('button', { name: subject, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Matemáticas', exact: true }).click();
    await page.getByRole('button', { name: 'Lengua', exact: true }).click();

    // Two courses behind in Mates, at level in Lengua. The level buttons are per card,
    // so each is scoped to its own group.
    const card = (name: string) => page.locator('.axis-cell').filter({ hasText: name });
    await card('Matemáticas').getByRole('button', { name: '2', exact: true }).click();
    await card('Lengua').getByRole('button', { name: '0', exact: true }).click();

    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    /*
     * Readable by eye, in her own file (FR-3005, `006` FR-410).
     *
     * Asserted on the YAML rather than on a reload of the screen: the promise this
     * project makes is that her vault is legible without this application, and a
     * round-trip through the same code that wrote it cannot show that.
     */
    const data = (await profileOnDisk(page, code))!;
    expect(data['cur_areas']).toEqual({ 'Matemáticas': 2, 'Lengua': 0 });
    // The general is untouched, and the pairs sit **beside** `axes`, never inside it.
    expect(data['axes']).toEqual({ CUR: 2 });

    await app.close();
  });

  test('typing a new área by hand does not take the window with it', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openProfile(page);

    /*
     * `pressSequentially`, not `fill` — this is the assertion that would have caught the
     * datalist crash, and `fill` is exactly why nothing did.
     */
    await page.getByLabel('Añadir un área').pressSequentially('Música', { delay: 30 });
    await page.getByRole('button', { name: 'Añadir', exact: true }).click();

    // The window is still here, and so is what she typed.
    expect(app.windows()).toHaveLength(1);
    await expect(page.locator('.axis-cell').filter({ hasText: 'Música' })).toBeVisible();

    await app.close();
  });

  test('a near-duplicate is flagged and offered — and her spelling still wins', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    await page.getByRole('button', { name: 'Matemáticas', exact: true }).click();
    await page.getByLabel('Añadir un área').pressSequentially('Mates', { delay: 30 });

    // Flagged, with the existing one named and offered.
    await expect(page.getByText(/Ya tienes/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usar «Matemáticas»' })).toBeVisible();

    /*
     * And she insists. FR-3007 says «flagged, never merged»: a merge she did not ask for
     * is the tool renaming her subjects, and «Lengua» folded silently into «Lenguaje
     * musical» is not something she would ever find.
     */
    await page.getByRole('button', { name: 'Añadir', exact: true }).click();

    /*
     * Both get a level, because a named área with no level is stored as nothing at all —
     * it falls back to the general, and there is no pair to write. That rule is what
     * stops «añadir Lengua» from quietly asserting «al nivel de su curso».
     */
    const card = (name: string) => page.locator('.axis-cell').filter({ hasText: name });
    await card('Mates').getByRole('button', { name: '3', exact: true }).click();
    await page.locator('.axis-cell').filter({ hasText: /^Matemáticas/ })
      .getByRole('button', { name: '1', exact: true }).click();

    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    const areas = (await profileOnDisk(page, code))!['cur_areas'] as Record<string, number>;
    expect(areas).toEqual({ 'Matemáticas': 1, 'Mates': 3 });

    await app.close();
  });

  test('naming an área without giving it a level records nothing about it', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    await page.getByRole('button', { name: 'Lengua', exact: true }).click();
    // The card says what governs it meanwhile, and does not show a level she never chose.
    await expect(page.locator('.axis-cell').filter({ hasText: 'Lengua' })
      .getByText('Sin decir: vale el general')).toBeVisible();

    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    /*
     * «Never zero by omission», at the editor (FR-3001).
     *
     * Defaulting a newly named área to 0 would assert «al nivel de su curso» about a
     * subject she had only just typed — the same invented fact as a `?? 0` fallback in
     * `curFor`, arriving one layer earlier where nothing downstream could tell.
     */
    expect((await profileOnDisk(page, code))!['cur_areas']).toBeUndefined();
    await app.close();
  });

  test('pressing a level she already set keeps it — the buttons do not toggle', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    await page.getByRole('button', { name: 'Lengua', exact: true }).click();
    const card = page.locator('.axis-cell').filter({ hasText: 'Lengua' });
    await card.getByRole('button', { name: '0', exact: true }).click();
    // Again — the gesture of somebody confirming what she meant.
    await card.getByRole('button', { name: '0', exact: true }).click();

    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    /*
     * The trap this replaces: the level buttons were inherited from the axes, where
     * pressing the current level clears it back to «unobserved». On an área that made
     * «Lengua: 0» — the one value US1 exists to record — the single value she could not
     * set by pressing its own button. Removing is «Quitar»; one meaning per control.
     */
    expect((await profileOnDisk(page, code))!['cur_areas']).toEqual({ 'Lengua': 0 });
    await app.close();
  });

  test('a profile she never details writes nothing, and the vault stays at version 1', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openProfile(page);

    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await page.waitForTimeout(600);

    expect((await profileOnDisk(page, code))!['cur_areas']).toBeUndefined();
    /*
     * FR-3005: the marker means «this vault holds shapes older readers do not know». A
     * save that stamped it whenever the screen sent an empty map would mark her whole
     * vault on the first save of any profile — and on a folder shared with a colleague
     * that is a warning about nothing.
     */
    const marker = await page.evaluate(async () => {
      const doc = await window.rampa.vault.read('.rampa/vault.yaml') as
        { data: Record<string, unknown>; exists?: boolean } | null;
      return doc?.data?.['schema'] ?? null;
    });
    expect(marker).toBeNull();

    await app.close();
  });
});

/**
 * The ACNS draft, per área, through the real channel (032 T015/T017, FR-3004).
 *
 * ## Why this is an e2e and not a shell unit test
 *
 * The seam is one expression — `curFor(learner.profile, subject)` in `draftAcnsJob` — and
 * replacing it with `curFor(learner.profile)` compiles, passes the whole offline suite,
 * and silently drafts every área's ACNS with the general value. `jobs/guide.ts` reaches
 * for `currentVault()`, so a unit test would have to mock the vault, the corpus and the
 * record to reach one line; the channel is right there and exercises all of it.
 */
test.describe('the ACNS draft cites the gap of the área under discussion', () => {
  const seedWork = (page: Page, code: string) => page.evaluate(async (c) => {
    await window.rampa.vault.write('material/job-1/ir.md',
      '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n');
    await window.rampa.vault.write(`material/job-1/${c}/adapted.md`,
      '---\nadapted_on: "2026-03-03"\nschool_year: "2025-2026"\nkind: "worksheet"\n'
      + '---\n\n::: {#b1 .explanation}\nHola\n:::\n');
    await window.rampa.vault.write(`material/job-1/${c}/report.md`, '# Informe\n');
  }, code);

  const draft = (page: Page, code: string, subject?: string) => page.evaluate((args) => {
    const [c, s] = args as [string, string | undefined];
    return window.rampa.guide.acns(c, s) as Promise<{ markdown: string; missing: string[] }>;
  }, [code, subject] as [string, string | undefined]);

  test('Matemáticas cites Mates, Lengua cites Lengua, and neither cites the other', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await seedWork(page, code);
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { CUR: 2 }, cur_areas: { 'Matemáticas': 2, 'Lengua': 0 },
      works: [], avoid: [], interests: [], response: { default: 'short' },
      language: { instruction: 'es' }, age: 11, year: 'es:primaria-5', stage: 'Primaria',
    }), code);

    const mates = await draft(page, code, 'Matemáticas');
    expect(mates.markdown).toContain('Tú tienes apuntado');
    expect(mates.markdown).toContain('con contenidos de cursos anteriores');
    expect(mates.markdown).not.toContain('**Lengua**');

    const lengua = await draft(page, code, 'Lengua');
    expect(lengua.markdown).toContain('al nivel de su curso');
    /*
     * The failure this replaces, in the document that gets signed: with one CUR per
     * learner, Marco's Lengua ACNS cited a two-course gap his teacher had explicitly
     * recorded as not existing in that subject.
     */
    expect(lengua.markdown).not.toContain('con contenidos de cursos anteriores');

    // And an área she never detailed says so rather than borrowing another one's number.
    const ingles = await draft(page, code, 'Inglés');
    expect(ingles.markdown).toContain('No tienes nada apuntado para **Inglés**');

    // Whatever it cites, the desfase itself stays hers.
    for (const d of [mates, lengua, ingles]) {
      expect(d.markdown).toContain('evaluación psicopedagógica');
      expect(d.missing.join(' ')).toContain('Desfase curricular');
    }

    await app.close();
  });
});
