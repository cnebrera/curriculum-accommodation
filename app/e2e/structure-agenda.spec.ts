import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * The five-minute agenda, offline (028 T015, quickstart §4, SC-2601).
 *
 * ## What this walk is for
 *
 * The feature's whole claim is that a PT can sit down at four in the afternoon, with no
 * connection and no key, and have tomorrow's strip printed before she leaves. Every part
 * of that is asserted here — including the two that are absences: **no provider call and
 * no cost entry**, on the path a teacher actually takes rather than in the source.
 *
 * `structure-costs-nothing.test.ts` guards the imports; this guards the behaviour. Both,
 * because a source check cannot see a channel added elsewhere and a behaviour check
 * cannot see an import that has not been called yet.
 *
 * The launch passes no keys at all, so a provider call would fail rather than spend —
 * which is what makes «it worked» here mean «it needed nobody».
 */
const appRoot = process.cwd();

/** A set with the words a morning is made of, and one the set cannot decide. */
const SET = JSON.stringify([
  { id: '1001', keywords: ['asamblea'] },
  { id: '1002', keywords: ['patio'] },
  { id: '1003', keywords: ['comedor'] },
  { id: '2001', keywords: ['casa'] },
  { id: '2002', keywords: ['casa'] },
]);

async function launch(opts: { withSet?: boolean } = {}): Promise<{
  app: ElectronApplication; page: Page; vault: string;
}> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-struct-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-struct-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });

  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);

  if (opts.withSet !== false) {
    const set = await mkdtemp(join(tmpdir(), 'rampa-struct-set-'));
    await writeFile(join(set, 'pictograms.es.json'), SET);
    for (const id of ['1001', '1002', '1003', '2001', '2002']) {
      await writeFile(join(set, `${id}.svg`), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    }
    const used = await page.evaluate((root) =>
      window.rampa.pictograms.use(root) as Promise<{ ok: boolean }>, set);
    expect(used.ok, 'the fixture set must be readable').toBe(true);
  }

  return { app, page, vault };
}

async function seed(page: Page, vault: string): Promise<string> {
  const code: string = await page.evaluate(async (root) => {
    await window.rampa.vault.use(root);
    const c: string = await window.rampa.learners.newCode();
    await window.rampa.learners.save({
      code: c, axes: { COG: 3, ATE: 2 }, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
      age: 8, year: 'es:primaria-2', stage: 'Primaria',
    });
    await window.rampa.names.set(c, 'Iván');
    // A key so the shell does not send her to the connect step. Never a real one, and
    // nothing in this walk sends anything.
    await window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key');
    return c;
  }, vault);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const openStructure = async (page: Page): Promise<void> => {
  await intoNamedLearner(page, 'Iván');
  await toTab(page, 'structure');
  await page.getByRole('heading', { name: /El día y las rutinas/ }).waitFor();
};

/** What the month's ledger says. Zero jobs is the assertion, not zero cents. */
const spent = (page: Page) => page.evaluate(() =>
  window.rampa.cost.month() as Promise<{ cents: number; jobs: number }>);

test.describe('the agenda, built where a PT builds it', () => {
  test('four moments in, a strip out — no provider, no cost, no fact about the child', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    const before = await spent(page);

    await openStructure(page);
    await page.locator('#titulo').fill('Los lunes por la mañana');
    await page.locator('#momentos').fill('asamblea\npatio\ncomedor\ncasa');
    await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
    await page.getByRole('heading', { name: 'Hecha' }).waitFor();

    /*
     * «casa» has two candidates, so it is a declared gap — named, never guessed. A
     * plausible-but-wrong picture on the strip a child reads to know what happens next is
     * worse than a blank.
     */
    await expect(page.getByText(/Estas van sin dibujo/)).toBeVisible();
    // The word, in the callout — scoped, because it is also in the box she typed it in.
    await expect(page.getByText(/casa\. La tira las lleva/)).toBeVisible();

    /*
     * Nothing was spent, on the path she takes. The source-level check in
     * `structure-costs-nothing.test.ts` guards the imports; this guards the behaviour,
     * because a channel added elsewhere would pass that one.
     */
    const after = await spent(page);
    expect(after.cents).toBe(before.cents);
    // And no job entered the ledger at all — «cero céntimos» would also be true of a
    // provider call that failed, which is not the claim.
    expect(after.jobs).toBe(before.jobs);

    // And it is on disk, as an IR document with the pairs it resolved.
    const written = await page.evaluate(async () => {
      const jobs = await window.rampa.vault.list('material') as string[];
      const doc = await window.rampa.vault.read(`material/${jobs[0]}/ir.md`) as
        { data: Record<string, unknown>; content: string } | null;
      return doc;
    });
    expect(written!.data['source']).toBe('structure');
    expect(written!.data['structure']).toBe('agenda');
    expect(written!.data['for_learner']).toBe(code);

    await app.close();
  });

  test('the record calls it an agenda, not a composition with no objectives', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openStructure(page);
    await page.locator('#momentos').fill('asamblea\npatio');
    await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
    await page.getByRole('heading', { name: 'Hecha' }).waitFor();

    await toTab(page, 'made');
    await page.getByText('Un momento, que miro qué hay…').waitFor({ state: 'detached' });

    const body = await page.locator('.main').innerText();
    expect(body).toContain('Una agenda');
    // Not «lo pedí así: » with an empty list, which is what folding it into `composed`
    // would have printed — a row describing the wrong kind of work.
    expect(body).not.toContain('Lo pedí así');

    await app.close();
  });

  test('the printed strip carries the credit and nothing about the child', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await openStructure(page);
    await page.locator('#momentos').fill('asamblea\npatio\ncomedor');
    await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
    await page.getByRole('heading', { name: 'Hecha' }).waitFor();

    const html = await page.evaluate(async (learner) => {
      const jobs = await window.rampa.vault.list('material') as string[];
      const doc = await window.rampa.job.documentHtml(jobs[0]!, learner) as string;
      return doc;
    }, code);

    // The attribution is derived and has no setting: a drawing without its credit is the
    // infringing page, and it is in a child's backpack.
    expect(html).toContain('picto-credit');
    // Her words are on the page beside the drawings (FR-2607).
    expect(html).toContain('asamblea');
    expect(html).toContain('agenda-moment');
    /*
     * And nothing about the child. The renderer takes an IR and no profile, so there is
     * no path — asserted anyway, because this is the document that leaves the building.
     */
    expect(html).not.toContain(code);
    expect(html).not.toContain('Iván');

    await app.close();
  });

  test('with no set configured the door still works, and says what is missing', async () => {
    const { app, page, vault } = await launch({ withSet: false });
    const code = await seed(page, vault);
    await openStructure(page);

    /*
     * FR-2612: not hidden and not broken. She may have written the whole day out before
     * noticing, and losing that to an error dialog would be losing her work to a setup
     * problem. One pointer, one place to fix it.
     */
    await expect(page.getByText('Todavía no tienes dibujos')).toBeVisible();
    await expect(page.getByText(/Configuración ▸ Pictogramas/)).toBeVisible();

    await page.locator('#momentos').fill('asamblea\npatio');
    await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
    await page.getByRole('heading', { name: 'Hecha' }).waitFor();

    // A strip of words is a real material. The drawings are what is missing, not the page.
    const html = await page.evaluate(async (learner) => {
      const jobs = await window.rampa.vault.list('material') as string[];
      const doc = await window.rampa.job.documentHtml(jobs[0]!, learner) as string;
      return doc;
    }, code);
    expect(html).toContain('asamblea');
    expect(html).toContain('agenda-moment');

    await app.close();
  });

  test('and the honesty line is on the screen, not in a help page', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await openStructure(page);
    /*
     * FR-2613. Not a disclaimer: the difference between a material and a therapy. Rampa
     * prints strips; whether this child needs a communication system, and which one, is
     * decided by people with an assessment in front of them.
     */
    await expect(page.getByText(/no un sistema de comunicación/)).toBeVisible();
    await app.close();
  });
});
