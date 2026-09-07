import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toCaseload, toPrepare, intoNamedLearner } from './nav.js';

/**
 * «Tenías esto a medias» (020 T026/T027, FR-1825…FR-1828).
 *
 * ## The premise, which is the whole application's premise
 *
 * She will be interrupted. `006` says so and `008` built the resume for it — but until
 * `020` the only place a half-finished reading appeared was **inside the screen that
 * brings material in**, which she reaches by starting something new. On Wednesday she
 * does not remember which child Tuesday's worksheet was for, so the marker has to be in
 * her caseload.
 *
 * ## Why the vault is written directly here
 *
 * An extraction needs a provider, money and photographs. What is under test is whether
 * work already on disk becomes reachable — navigation and files — so the disk is what is
 * seeded. The reading itself is `008`'s and is covered there.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-half-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-half-v-')), 'Rampa');
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

/** Two learners, so «whose is it?» is a real question with a wrong answer available. */
async function seed(page: Page, vault: string): Promise<Record<string, string>> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const codes: Record<string, string> = {};
  for (const name of ['Lucía', 'Mateo']) {
    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' }, year: 'es:primaria-5',
    }), code);
    await page.evaluate(([c, n]) => window.rampa.names.set(c as string, n as string), [code, name]);
    codes[name] = code;
  }
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  return codes;
}

/** A reading of three pages with one confirmed, stamped for nobody unless told. */
async function halfRead(page: Page, job: string, forLearner?: string): Promise<void> {
  await page.evaluate(async (args) => {
    const [id, who] = args as [string, string];
    const stamp = who ? `for_learner: "${who}"\n` : '';
    await window.rampa.vault.write(`material/${id}/ir.md`,
      `---\n${stamp}source: "photos"\n---\n\n::: {#p1-b1 .explanation data-page="1"}\nDos por tres\n:::\n`);
    await window.rampa.vault.write(`material/${id}/extraction.json`, JSON.stringify({
      source: 'photos', verified: false,
      // `flags` and `attempts` are not optional on `PageRecord`, and leaving them out
      // crashed the reading screen on `[...p.flags]` — a fixture writing a record no
      // ingest would ever produce, found in two minutes by looking at the console.
      pages: [{ page: 1, verified: true, problems: [], attempts: 1, flags: [] },
              { page: 2, verified: false, problems: [], attempts: 1, flags: [] },
              { page: 3, verified: false, problems: [], attempts: 1, flags: [] }],
    }) + '\n');
  }, [job, forLearner ?? ''] as [string, string]);
}

const reload = async (page: Page) => {
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
};

test.describe('work she did not finish finds its way back to her', () => {
  /**
   * FR-1825 · in the **caseload**, with how far it got.
   *
   * Both halves asserted: that it is on the row, and that the row says the distance. A
   * marker with no distance sends her in to find out how much is left, which is the
   * click it exists to save.
   */
  test('the learner whose reading stopped half way is marked in her caseload', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    await halfRead(page, 'job-20260907T090000', codes['Lucía']);
    await reload(page);

    const lucia = page.locator('.card-action').filter({ hasText: 'Lucía' });
    const mateo = page.locator('.card-action').filter({ hasText: 'Mateo' });

    await expect(lucia).toContainText('Se quedó algo a medias');
    await expect(lucia).toContainText('1 de 3 páginas confirmadas');
    // And nobody else is marked: the mark belongs to the child it is about.
    await expect(mateo).not.toContainText('a medias');

    await app.close();
  });

  /**
   * FR-1826 · inside him, *Preparar* offers to continue — and lands on the reading
   * check rather than on «Tráelo».
   *
   * That destination **is** the requirement: going back to bringing material would be
   * offering to spend again on pages already read and already paid for (`016` FR-1409).
   */
  test('continuing it goes to the reading, not to a provider', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    await halfRead(page, 'job-20260907T090000', codes['Lucía']);
    await reload(page);

    await toPrepare(page, { name: 'Lucía' });
    await expect(page.getByRole('heading', { name: 'Tenías esto a medias' })).toBeVisible();

    await page.getByRole('button', { name: 'Seguir con esto' }).click();

    await expect(page.getByText('Comprueba que lo he leído bien').first()).toBeVisible();
    // The step strip agrees with where she is: step 3, not step 2.
    await expect(page.getByRole('listitem').filter({ hasText: 'Comprueba la lectura' }))
      .toHaveAttribute('aria-current', 'step');
    // Nothing offered to bring the material in again.
    await expect(page.getByRole('button', { name: 'Elegir la ficha' })).toHaveCount(0);

    await app.close();
  });

  /** And it is not offered inside a learner it does not belong to. */
  test('another learner is not offered somebody else’s half-finished reading', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    await halfRead(page, 'job-20260907T090000', codes['Lucía']);
    await reload(page);

    await toPrepare(page, { name: 'Mateo' });
    await expect(page.getByRole('heading', { name: 'Tenías esto a medias' })).toHaveCount(0);

    await app.close();
  });

  /**
   * FR-1827 · the case that is **every vault that exists today**.
   *
   * `for_learner` started being written in T006, so nothing already on a teacher's disk
   * carries it. A reading a provider has already been paid for is work she entered
   * (FR-1811), so it cannot be unreachable — and it cannot be guessed at either: putting
   * one child's worksheet in another's record is the one mistake this application must
   * not make on her behalf.
   */
  test('a reading that belongs to nobody is offered, and asks whose it is', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    await halfRead(page, 'job-20260907T090000');
    await reload(page);
    await toCaseload(page);

    await expect(page.getByRole('heading', { name: /no sé de quién es/ })).toBeVisible();
    await expect(page.getByText('1 de 3 páginas confirmadas')).toBeVisible();
    // No child is marked, because none has been claimed.
    await expect(page.locator('.card-action').filter({ hasText: 'a medias' })).toHaveCount(0);

    const go = page.getByRole('button', { name: 'Seguir con esto' });
    // It will not continue until she has answered.
    await expect(go).toBeDisabled();

    await page.getByLabel('¿De quién es?').selectOption(codes['Lucía']!);
    await expect(go).toBeEnabled();
    await go.click();

    // Inside Lucía, on the reading — the same landing as continuing from inside him.
    await expect(page.getByText('Comprueba que lo he leído bien').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Apartados de Lucía' })).toBeVisible();

    await app.close();
  });

  /**
   * And the answer is kept, so she is not asked twice.
   *
   * Without the stamp, closing the window half way through would bring her back to the
   * caseload to answer a question she has already answered — and the second answer could
   * differ from the first, which is a reading moving between children by accident.
   */
  test('what she answered is written down, so the reading is his from then on', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    await halfRead(page, 'job-20260907T090000');
    await reload(page);
    await toCaseload(page);

    await page.getByLabel('¿De quién es?').selectOption(codes['Lucía']!);
    await page.getByRole('button', { name: 'Seguir con esto' }).click();
    await expect(page.getByText('Comprueba que lo he leído bien').first()).toBeVisible();

    /*
     * The file itself, because that is what survives the window closing — and read back
     * through the parser rather than as a substring, which asserts the stronger thing:
     * the line she caused to be written **parses back** as front matter. A stamp that
     * serialises and does not parse is this project's field-nobody-reads defect with an
     * extra step.
     */
    const doc = await page.evaluate(() =>
      window.rampa.vault.read('material/job-20260907T090000/ir.md')) as
        { data: Record<string, unknown> } | null;
    expect(doc?.data['for_learner']).toBe(codes['Lucía']);

    await reload(page);
    await expect(page.getByRole('heading', { name: /no sé de quién es/ })).toHaveCount(0);
    await intoNamedLearner(page, 'Lucía');
    await app.close();
  });
});
