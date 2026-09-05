import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab, toScreen } from './nav.js';

/**
 * Two territories, one request, two documents (029 T016/T019, SC-2701/2702/2703).
 *
 * ## Why this has to be an e2e
 *
 * Because the defect `029` fixes was **the wiring**, and the defect `029` nearly
 * shipped was too. The selection lives in the vault, the corpora live in the bundle,
 * the resolution happens in the main process and the sentence comes out inside a
 * document — and the first version of the two IPC handlers took an Electron event
 * argument that `handle()` had already stripped, so `select('es-an')` arrived as a
 * deselection and **every document came out generic** while every unit test passed.
 *
 * The shell tests mock `ipcMain.handle` to a no-op, so nothing below this level could
 * have seen it. Only launching the application can.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-norm-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-norm-v-')), 'Rampa');
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

/** A learner with one signed adaptation, so there is something to draft from. */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.evaluate(async (c) => {
    const job = 'job-20260303T100000';
    await window.rampa.vault.write(`material/${job}/ir.md`,
      '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
      '---\nreview:\n  signed_off: true\n  by: "PT"\n  date: "2026-03-04"\n'
      + 'adapted_on: "2026-03-03"\nschool_year: "2025-2026"\nkind: "worksheet"\n---\n\n'
      + '::: {#b1 .explanation}\nHola\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/report.md`,
      '# Informe\n\nReceta: `frase-corta@1`\n');
  }, code);
  await page.evaluate((c) => window.rampa.record.forLearner(c), code);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

/** Draft, and hand back what the document actually says. */
async function draft(page: Page, code: string): Promise<string> {
  await intoLearner(page);
  await toTab(page, 'curriculum');
  await page.getByRole('button', { name: 'Borrador de su adaptación' }).click();
  await page.getByRole('button', { name: 'Hacer el borrador' }).click();
  await expect(page.getByRole('heading', { name: 'El borrador' })).toBeVisible();
  // «Guardarla otra vez» once one exists: the label changes and the walk must not
  // quietly stop testing the second save.
  await page.getByRole('button', { name: /^Guardarla (en mi carpeta|otra vez)$/ }).click();
  // Wait for the confirmation, not for a duration: the read below races the write
  // otherwise, and a sleep here would be the loosened walk `nav.ts` warns about.
  await expect(page.getByText(`profiles/${code}/acns.md`)).toBeVisible();
  const stored = await page.evaluate((c) =>
    window.rampa.guide.acnsRead(c) as Promise<{ markdown: string }>, code);
  return stored.markdown;
}

test.describe('she says where she teaches', () => {
  let app: ElectronApplication;
  let page: Page;
  let code: string;

  test.beforeAll(async () => {
    let vault: string;
    ({ app, page, vault } = await launch());
    code = await seed(page, vault);
  });

  test.afterAll(async () => { await app.close(); });

  test('nothing is pre-selected, and «ninguna» is offered as a real answer', async () => {
    /*
     * A default would be this feature's own failure repeated: Andalucía was the default
     * for a year by being the only thing there. So the pane opens with nothing chosen and
     * says what generic mode gives her, rather than apologising for it.
     */
    await toScreen(page, { label: 'Normativa', under: 'Configuración' });
    await expect(page.getByRole('heading', { name: 'Normativa', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Es lo que tienes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usar Andalucía' })).toBeVisible();
  });

  test('and each corpus says where it came from and who has disagreed with it', async () => {
    // «Madrid, subido por ti, sin revisar» and «Madrid, incluido con Rampa» are two very
    // different things to be about to draft an official document under.
    await expect(page.getByText(/incluida con Rampa/)).toBeVisible();
    await expect(page.getByText(/sin revisar por ninguna docente/)).toBeVisible();
  });

  test('with nothing selected the document names no territory at all', async () => {
    const md = await draft(page, code);
    for (const word of ['Séneca', 'ACNS', 'ACS', 'DIAC', 'Andalucía']) {
      expect(md, `${word} reached a generic document`).not.toContain(word);
    }
    // And it is a product rather than an apology: it says what is hers to verify.
    expect(md).toContain('borrador genérico');
    expect(md).toContain('orientador');
  });

  test('selecting Andalucía changes the next draft, and it says which corpus it followed', async () => {
    await toScreen(page, { label: 'Normativa', under: 'Configuración' });
    await page.getByRole('button', { name: 'Usar Andalucía' }).click();
    await expect(page.getByRole('button', { name: 'Es la que tienes' })).toBeVisible();

    const md = await draft(page, code);
    expect(md).toContain('BORRADOR de adaptación curricular NO significativa (ACNS)');
    expect(md).toContain('El registro es **Séneca**');
    // FR-2705/2706, in the document rather than on the screen — because the document is
    // what she copies into the register.
    expect(md).toContain('Siguiendo el corpus normativo: **Andalucía**');
    expect(md).toContain('sin revisar por ninguna docente');
  });

  test('and the learner screen speaks in her words too, not only the document', async () => {
    await intoLearner(page);
    await toTab(page, 'curriculum');
    await expect(page.getByText(/Adaptación curricular no significativa \(ACNS\)/)).toBeVisible();
    await expect(page.getByText(/el registro es Séneca/)).toBeVisible();
  });

  test('deselecting goes back to generic, and the document with it', async () => {
    /*
     * FR-2711's ordinary half: she can change her mind, and nothing is stuck. The
     * missing-corpus half is a unit test — a file disappearing from the bundle is not
     * something a running application can be asked to arrange.
     */
    await toScreen(page, { label: 'Normativa', under: 'Configuración' });
    await page.getByRole('button', { name: 'Quitar la que tengo' }).click();
    await expect(page.getByRole('button', { name: 'Es lo que tienes' })).toBeVisible();

    const md = await draft(page, code);
    expect(md).not.toContain('Séneca');
    expect(md).toContain('borrador genérico');
  });

  test('and a learner set to «ninguna» stays generic while the vault has one selected', async () => {
    // The child schooled across territories, whose documents must claim neither.
    await toScreen(page, { label: 'Normativa', under: 'Configuración' });
    await page.getByRole('button', { name: 'Usar Andalucía' }).click();
    await page.evaluate(async (c) => {
      const loaded = await window.rampa.learners.load(c) as { profile: Record<string, unknown> };
      await window.rampa.learners.save({ ...loaded.profile, normative_corpus: 'none' });
    }, code);

    const md = await draft(page, code);
    expect(md).not.toContain('Séneca');
    expect(md).toContain('borrador genérico');
  });
});
