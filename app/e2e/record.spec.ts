import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab } from './nav.js';

/**
 * The learner's record, end to end (014 T014-T018).
 *
 * The interesting assertions are the two absences: no axis values anywhere on
 * this screen (Principle V — a per-learner history is exactly the shape a
 * progress dashboard wants to be), and the record surviving the deletion of
 * `record.md` (SC-1203, the whole design).
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-rec-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-rec-v-')), 'Rampa');
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

/** A learner with three pieces of work across two school years. */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 3, ATE: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));

  const jobs: Array<[string, string, string, string, boolean, string]> = [
    ['job-20260512T101500', '2026-05-12', '2025-2026', 'worksheet', false, 'photos'],
    ['job-20260228T090000', '2026-02-28', '2025-2026', 'exam', true, 'pegado'],
    ['job-20251110T160000', '2025-11-10', '2025-2026', 'worksheet', true, 'photos'],
  ];
  for (const j of jobs) {
    await page.evaluate(async (args) => {
      const [job, date, year, kind, signed, src, c] = args as [string, string, string, string, boolean, string, string];
      await window.rampa.vault.write(`material/${job}/ir.md`,
        `---\nsource: "${src}"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n`);
      if (src === 'photos') await window.rampa.vault.write(`material/${job}/source/pagina-1.txt`, 'foto');
      const review = signed ? 'review:\n  signed_off: true\n  by: "PT"\n  date: "2026-05-13"\n' : '';
      await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
        `---\n${review}adapted_on: "${date}"\nschool_year: "${year}"\nkind: "${kind}"\n`
        + `subject: "Naturales"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n`);
      await window.rampa.vault.write(`material/${job}/${c}/report.md`, '# Informe\n');
      // A print she already has, for the reprint row (FLU-04).
      if (signed) await window.rampa.vault.write(`output/${job}/${c}/sheet.pdf`, '%PDF-1.4\n');
    }, [...j, code]);
  }

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

async function openRecord(page: Page): Promise<void> {
  /*
   * Through the learner's own menu since `020`.
   *
   * It used to be: caseload → learner → **«Ver lo que le he preparado», a button on
   * the fifth card underneath the edit-profile form**. That walk is the defect `020`
   * was opened for, and this helper is where it stops being possible to write it.
   */
  await intoLearner(page);
  await toTab(page, 'made');
  await page.getByRole('heading', { name: /Lo que he preparado para/ }).waitFor();
  // The scan reads every job directory, so wait for it rather than for a timeout.
  await page.getByText('Un momento, que miro qué hay…').waitFor({ state: 'detached' });
}

test.describe('everything ever made for one learner', () => {
  test('three pieces of work, newest first, with their state', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openRecord(page);

    const body = await page.locator('.main').innerText();
    expect(body).toContain('12/05/2026');
    expect(body).toContain('28/02/2026');
    expect(body).toContain('10/11/2025');
    expect(body).toContain('Examen');
    expect(body).toContain('Sin firmar');
    expect(body).toContain('Firmada');
    // Newest first.
    expect(body.indexOf('12/05/2026')).toBeLessThan(body.indexOf('10/11/2025'));

    // FR-1113: a screen nobody has looked at is a screen nobody has finished.
    await page.screenshot({ path: 'test-results/record.png', fullPage: true });

    await app.close();
  });

  test('every row offers what she gave it and what Rampa read', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openRecord(page);

    // A photographed job: both.
    await expect(page.getByRole('button', { name: 'Lo que traje' }).first()).toBeVisible();
    // A pasted job says they are one document rather than showing an empty panel.
    await expect(page.getByRole('button', { name: /El texto que pegué/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lo adaptado' }).first()).toBeVisible();

    await app.close();
  });

  /**
   * Principle V. A per-learner history is the shape a progress dashboard wants
   * to be, and this is the screen where that temptation is strongest.
   */
  test('shows work, never the child', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openRecord(page);

    const axes = await page.locator('.main .axis, .main .axis-strip').count();
    expect(axes, 'the record is showing the learner rather than the work').toBe(0);

    const body = await page.locator('.main').innerText();
    // No count of how much a learner needed.
    expect(body).not.toMatch(/\b\d+\s+(adaptaciones|barreras|apoyos)\b/i);

    await app.close();
  });

  /**
   * SC-1203, and the whole design: the record is derived. Deleting the file she
   * can read changes nothing about what the application knows.
   */
  test('survives deleting record.md', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openRecord(page);

    const before = await page.locator('.main').innerText();

    await page.evaluate((c) => window.rampa.record.rebuild(c), code);
    await page.evaluate(async (c) => {
      // Emptied the way she would, from outside the application.
      await window.rampa.vault.write(`profiles/${c}/record.md`, '');
    }, code);

    // The rail resets the screen, which is what "Mis alumnos" has to mean.
    await openRecord(page);
    expect(await page.locator('.main').innerText()).toBe(before);

    await app.close();
  });
});


/**
 * Reprinting a sheet from last month (FLU-04).
 *
 * `documents.rendered: string[]` has been declared, typed and populated by
 * `entryFor` since `014` — and **read by nothing**. The enésima instance of the
 * defect this repository catalogues as «a field written, typed and read by
 * nothing» (G36), and the consequence is one of the commonest tasks of the school
 * year: the photocopy was lost, and reprinting the sheet she already signed was
 * impossible. The only «Guardar como PDF» lived on the review screen, which before
 * `0.1` could not be reached for a job from last month at all.
 *
 * And `es.errors.offline` promises «puedes leer tus notas y volver a imprimir» —
 * interface text that was lying about what the application could do.
 */
test.describe('printing it again', () => {
  test('the row offers the PDF she already has', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openRecord(page);

    await expect(page.getByRole('button', { name: 'El PDF' }).first()).toBeVisible();
    await app.close();
  });

  test('and offers to print one where there is none', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openRecord(page);

    // The unsigned row of the seed has no `output/` directory, so its label is
    // the honest one: there is nothing to reopen, and printing is still offline.
    await expect(page.getByRole('button', { name: 'Guardar como PDF' }).first()).toBeVisible();
    await app.close();
  });

  test('reprinting writes a PDF, with no network at all', async () => {
    /*
     * The assertion the offline promise needs: `job:render` writes HTML and
     * `job:pdf` is Chromium's own `printToPDF`, both local. So this test runs with
     * no key and no connection and still produces a file.
     */
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openRecord(page);

    await page.getByRole('button', { name: 'Volver a imprimirlo' }).first().click();
    await expect(page.getByText(/Guardado en/)).toBeVisible({ timeout: 30000 });

    const files = await page.evaluate((c) =>
      window.rampa.vault.list(`output/job-20260228T090000/${c}`), code) as string[];
    expect(files, 'no PDF was written').toContain('sheet.pdf');

    await app.close();
  });
});
