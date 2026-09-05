import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab, TAB } from './nav.js';

/**
 * The ACNS, from a draft on a screen to a signed document (017 FR-1516, decision P46).
 *
 * ## Why this exists as an e2e and not only as unit tests
 *
 * Because the defect was **the wiring**, not the logic. `draftAcns` was correct and
 * tested; what was missing was everything after it: nothing saved the draft, nothing
 * rendered it, and the sign-off handler resolves documents by (job × learner) so it
 * could not reach an ACNS at all. FR-1516 promised a mark «removable only by sign-off»
 * and there was no sign-off in existence that could remove it.
 *
 * A unit test cannot fail on that. Only pressing the buttons can.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-acns-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-acns-v-')), 'Rampa');
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

/**
 * A learner with one signed adaptation — which is the whole precondition.
 *
 * `requireRecordedWork` declines to draft for a learner with nothing recorded
 * (FR-1515), and it is right to: «un borrador hecho de nada es un formulario rellenado
 * por un modelo de lenguaje». So the draft has something to be assembled *from*, and
 * no provider is involved anywhere in this file — an ACNS is ordered, never generated.
 */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2, ATE: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  // A key, so the application is past onboarding and on the caseload. Never used:
  // an ACNS is assembled from her record and reaches no provider at all.
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));

  await page.evaluate(async (c) => {
    const job = 'job-20260303T100000';
    await window.rampa.vault.write(`material/${job}/ir.md`,
      '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
      '---\nreview:\n  signed_off: true\n  by: "PT"\n  date: "2026-03-04"\n'
      + 'adapted_on: "2026-03-03"\nschool_year: "2025-2026"\nkind: "worksheet"\n'
      + 'subject: "Naturales"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/report.md`,
      '# Informe\n\nReceta: `frase-corta@1`\n');
  }, code);
  /*
   * Andalucía selected, because this file is about the document she signs and the
   * sentences it prints are hers (`029` T016). With nothing selected the same flow runs
   * in generic mode — that case is `normative.spec.ts`, where it belongs.
   */
  await page.evaluate(() => window.rampa.normative.select('es-an'));
  await page.evaluate((c) => window.rampa.record.forLearner(c), code);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

test.describe('the ACNS is a document, and the signature unmarks it', () => {
  let app: ElectronApplication;
  let page: Page;
  let code: string;

  test.beforeAll(async () => {
    let vault: string;
    ({ app, page, vault } = await launch());
    code = await seed(page, vault);
    await intoLearner(page);
    await toTab(page, 'curriculum');
    await page.getByRole('button', { name: 'Borrador de su adaptación' }).click();
    await page.getByRole('button', { name: 'Hacer el borrador' }).click();
    await expect(page.getByRole('heading', { name: 'El borrador' })).toBeVisible();
  });

  test.afterAll(async () => { await app.close(); });

  /**
   * Principle VIII. «Hacer el borrador» is a preview: she reads the gaps and the
   * sources and *then* decides. A preview that saved would put a document in her
   * folder for having looked at one.
   */
  test('drafting writes nothing to her folder', async () => {
    expect(await page.evaluate((c) => window.rampa.guide.acnsRead(c), code)).toBeNull();
  });

  test('saving it puts a marked document in her folder', async () => {
    await page.getByRole('button', { name: 'Guardarla en mi carpeta' }).click();
    await expect(page.getByText(`profiles/${code}/acns.md`)).toBeVisible();

    const stored = await page.evaluate((c) =>
      window.rampa.guide.acnsRead(c) as Promise<{ markdown: string; signed: boolean }>, code);
    expect(stored.signed).toBe(false);
    // In the **file**, because the file is what she copies into Séneca. A mark that
    // only ever lived on screen is lost in that copy-paste with nothing reviewed.
    expect(stored.markdown).toContain('BORRADOR de adaptación curricular NO significativa');
    expect(stored.markdown).toContain('Sin firmar');
  });

  test('and she can see the page she would print, with its banner', async () => {
    await page.getByRole('button', { name: 'Verla como se imprime' }).click();
    await expect(page.locator('.viewer')).toBeVisible();
    /*
     * The banner names the risk that is actually in play: it reaching the official
     * record unreviewed. Not «no entregar al alumnado» — nobody hands one of these to a
     * child.
     *
     * And it names no platform. The mark is Principle VII, which makes it a guard, and
     * `029` FR-2709 gives a corpus no field to word one through: what her normativa says
     * is inside the document, where she reads it.
     */
    await expect(page.frameLocator('.viewer iframe').locator('.draft-banner'))
      .toContainText('no lo presentes todavía');
    await page.getByRole('button', { name: 'Cerrar' }).click();
  });

  test('the signature is the only thing that takes the mark off', async () => {
    await page.getByLabel(/Quién la firma/).fill('la tutora');
    await page.getByRole('button', { name: 'Firmarla y quitarle la marca' }).click();
    await expect(page.getByText('Ya no lleva la marca de borrador')).toBeVisible();

    const stored = await page.evaluate((c) =>
      window.rampa.guide.acnsRead(c) as Promise<{ markdown: string; signed: boolean }>, code);
    expect(stored.signed).toBe(true);
    expect(stored.markdown).not.toContain('BORRADOR');
    expect(stored.markdown).toContain('Revisada y firmada** por la tutora');
    // And what the signature does not change stays: Rampa still cannot file anything.
    expect(stored.markdown).toContain('El registro es **Séneca**');
  });

  /**
   * She will press it: a term moves on and the draft is assembled from work that has
   * grown since. Overwriting a signed ACNS would destroy the only record that anybody
   * reviewed it.
   */
  test('re-saving keeps the signed one instead of overwriting it', async () => {
    await page.getByRole('button', { name: 'Guardarla otra vez' }).click();
    await expect(page.getByText(`profiles/${code}/acns.r1.md`)).toBeVisible();

    // `vault.read` hands back the parsed document, so the signature is read from the
    // front matter it was written into rather than from the prose.
    const kept = await page.evaluate((c) =>
      window.rampa.vault.read(`profiles/${c}/acns.r1.md`) as
        Promise<{ data: Record<string, unknown> } | null>, code);
    expect(kept).not.toBeNull();
    expect((kept!.data['review'] as Record<string, unknown>)['signed_off']).toBe(true);
    // And the new one is a draft again, because nobody has read it.
    const now = await page.evaluate((c) =>
      window.rampa.guide.acnsRead(c) as Promise<{ signed: boolean }>, code);
    expect(now.signed).toBe(false);
  });

  test('printing it writes a PDF where the erasure will find it', async () => {
    const path = await page.evaluate((c) => window.rampa.guide.acnsPdf(c) as Promise<string>, code);
    // Inside `profiles/<code>/`, not under `output/acns/`: the erasure deletes that
    // directory wholesale, and `output/<job>/<code>` is reached per job in `material/`
    // — «acns» is not a job, so a PDF there survived «bórralo todo».
    expect(path).toContain(`profiles/${code}`);
    expect(path).toContain('acns.pdf');
  });
});
