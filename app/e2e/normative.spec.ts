import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
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

/**
 * Bringing one she was given (029 T020/T022/T023/T026, FR-2707/2708/2709).
 *
 * ## What this can drive and what it cannot
 *
 * The native file dialog is not something Playwright can open, so `normative:choose` —
 * the half that reads the file and shows it — is exercised by its unit tests and by
 * looking at the screen. What is driven here is everything **after** she has the file:
 * the refusal, the override, what the override writes down, and what the guards do with
 * the thing activated.
 *
 * That is the right half to spend an e2e on. «It showed me the file» fails visibly;
 * «it activated a policy file without asking» does not.
 */
const hostile = readFileSync(
  join(appRoot, '..', 'cases', 'injection', '12-normativa-de-un-foro', 'normativa.md'),
  'utf8');

test.describe('a normativa somebody sent her', () => {
  let app: ElectronApplication;
  let page: Page;
  let code: string;
  let vault: string;

  test.beforeAll(async () => {
    ({ app, page, vault } = await launch());
    code = await seed(page, vault);
  });

  test.afterAll(async () => { await app.close(); });

  test('activating it is refused, and the refusal says what was found', async () => {
    /*
     * `007` FR-514's non-blocking rule deliberately does **not** apply. A notice on a
     * worksheet must not block a job she is paying for; activating a file that enters
     * prompts as policy is exactly the moment to stop.
     */
    const said = await page.evaluate(async (raw) => {
      try { await window.rampa.normative.activate(raw); return 'ok'; }
      catch (e) { return (e as Error).message; }
    }, hostile);

    expect(said).not.toBe('ok');
    expect(said).toContain('las reglas duras');
    expect(said).toContain('No lo he quitado del fichero');
  });

  test('and nothing was written, because a refusal that half-imports is not a refusal', async () => {
    const files = await page.evaluate(() => window.rampa.vault.list('normative'));
    expect(files).not.toContain('es-xx.md');
  });

  test('the override is hers, and it is written down with what she overrode', async () => {
    const done = await page.evaluate((raw) =>
      window.rampa.normative.activate(raw, true) as Promise<{ ok: boolean; findings: number }>,
      hostile);
    expect(done.ok).toBe(true);
    expect(done.findings).toBeGreaterThan(0);

    // SC-2704: an activation with findings and no recorded override is a test failure.
    /*
     * The front matter, because that is where the log lives: `vault:read` parses it, so
     * the body it hands back is her own annotations and never the record.
     */
    const log = await page.evaluate(() =>
      window.rampa.vault.read('normative/selection.md') as Promise<{ data: {
        activations?: Array<{ corpus: string; overridden: boolean; content_sha256: string; findings: number }>;
      } }>);
    const activation = log.data.activations?.find((a) => a.corpus === 'es-xx');
    expect(activation).toBeDefined();
    expect(activation!.overridden).toBe(true);
    expect(activation!.findings).toBeGreaterThan(0);
    expect(activation!.content_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('and with it in force, the draft is the same document it always was', async () => {
    /*
     * FR-2709, at the level she would meet it. The file declares `draft_mark: off`,
     * `exam_rules.allow_easier`, `redaction: disabled` and a `decline` of its own —
     * every one of them a field the contract does not have, carried in `unknown` where
     * nothing reads it.
     */
    await page.evaluate(() => window.rampa.normative.select('es-xx'));
    await intoLearner(page);
    await toTab(page, 'curriculum');
    await page.getByRole('button', { name: 'Borrador de su adaptación' }).click();
    await page.getByRole('button', { name: /^(Hacer el borrador|Volver a hacerlo)$/ }).click();
    await expect(page.getByRole('heading', { name: 'El borrador' })).toBeVisible();
    await page.getByRole('button', { name: /^Guardarla (en mi carpeta|otra vez)$/ }).click();
    await expect(page.getByText(`profiles/${code}/acns.md`)).toBeVisible();

    const stored = await page.evaluate((c) =>
      window.rampa.guide.acnsRead(c) as Promise<{ markdown: string }>, code);
    expect(stored.markdown).toContain('BORRADOR');
    // And the provenance says where the file came from, not what the file claims.
    expect(stored.markdown).toContain('subido por ti');
  });

  test('editing it afterwards says «modificado por ti», which is visibility not punishment', async () => {
    await page.evaluate(async () => {
      // Appended through the vault, the way her editor would: the hash is over the file
      // on disk, so anything that changes it must show up as «modificado».
      const doc = await window.rampa.vault.read('normative/es-xx.md') as { content: string };
      await window.rampa.vault.write('normative/es-xx.md',
        `---\nid: es-xx\nlabel: Comunidad de ejemplo\n---\n${doc.content}\n\nUna línea mía.\n`);
    });
    const resolved = await page.evaluate(() =>
      window.rampa.normative.resolve() as Promise<{ provenanceLine: string }>);
    expect(resolved.provenanceLine).toContain('modificado después');
  });
});
