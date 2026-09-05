import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * The sequence that reprints, and the erasure that reaches it (028 T021, quickstart §5).
 *
 * ## Two claims, and the second is why this file is not only about reprinting
 *
 * She prints the routine in October and pins it above the sink. In March a child loses it
 * and she reprints: **the same sheet**, because that child learned the routine from that
 * strip and a step that has quietly acquired a different picture is a new material handed
 * over as an old one. `structure-reprint.test.ts` proves the property; this walks it
 * through the window, where the vocabulary, the file and the render finally meet.
 *
 * And then she erases the learner. An agenda has no directory named after the child — it
 * is `material/<job>/ir.md` with his code in the front matter — so «borrar todo lo suyo»
 * walked past it and told her everything was gone. That is asserted here rather than only
 * in the planner's own test, because what she is promised is a screen saying «no queda
 * nada», and what makes the promise true is the whole path.
 */
const appRoot = process.cwd();

const SET = JSON.stringify([
  { id: '1001', keywords: ['grifo'] },
  { id: '1002', keywords: ['jabón'] },
  { id: '2001', keywords: ['secar'] },
  { id: '2002', keywords: ['secar'] },
]);

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-seq-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-seq-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const set = await mkdtemp(join(tmpdir(), 'rampa-seq-set-'));
  await writeFile(join(set, 'pictograms.es.json'), SET);
  for (const id of ['1001', '1002', '2001', '2002']) {
    await writeFile(join(set, `${id}.svg`), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  }

  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  await page.evaluate((root) => window.rampa.pictograms.use(root), set);
  return { app, page, vault };
}

async function seed(page: Page, vault: string): Promise<string> {
  const code: string = await page.evaluate(async (root) => {
    await window.rampa.vault.use(root);
    const c: string = await window.rampa.learners.newCode();
    await window.rampa.learners.save({
      code: c, axes: { COG: 3 }, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
    });
    await window.rampa.names.set(c, 'Iván');
    await window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key');
    // «secar» has two candidates, so she chooses one — the rung a saved strip records.
    await window.rampa.pictograms.chooseWord({ word: 'secar', id: '2001' });
    return c;
  }, vault);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const makeSequence = async (page: Page): Promise<void> => {
  await intoNamedLearner(page, 'Iván');
  await toTab(page, 'structure');
  await page.getByRole('button', { name: /Los pasos de una rutina/ }).click();
  await page.locator('#titulo').fill('Lavarse las manos');
  await page.locator('#momentos').fill('grifo\njabón\nsecar');
  await page.getByRole('button', { name: 'Hacerla', exact: true }).click();
  await page.getByRole('heading', { name: 'Hecha' }).waitFor();
};

const sheetHtml = (page: Page, learner: string) => page.evaluate(async (who) => {
  const jobs = await window.rampa.vault.list('material') as string[];
  return window.rampa.job.documentHtml(jobs[0]!, who) as Promise<string>;
}, learner);

test.describe('a sequence saved in October reprints in March', () => {
  test('the steps are numbered, and the numbers are their positions', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await makeSequence(page);

    const html = await sheetHtml(page, code);
    expect(html).toContain('secuencia-step');
    expect(html).toContain('data-number="1"');
    expect(html).toContain('data-number="3"');
    await app.close();
  });

  test('and changing her vocabulary afterwards does not change the saved one', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await makeSequence(page);
    const october = await sheetHtml(page, code);

    /*
     * January: she decides a different picture is the right «secar». Her call, and it
     * applies to everything she makes afterwards. The strip above the sink is not
     * afterwards — a child has been reading it since October.
     */
    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'secar', id: '2002' }));

    expect(await sheetHtml(page, code)).toBe(october);
    await app.close();
  });

  test('but the record says the strip carries a drawing she no longer uses', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await makeSequence(page);
    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'secar', id: '2002' }));

    /*
     * The counterpart that makes «the file does not change» honest rather than merely
     * safe (`031`'s second axis): she is **told**, and the file is not edited under her.
     */
    const rows = await page.evaluate((c) => window.rampa.record.forLearner(c) as
      Promise<Array<{ freshness?: { drawings: { state: string; words?: string[] } } }>>, code);
    const drawings = rows[0]!.freshness!.drawings;
    expect(drawings.state).toBe('stale');
    expect(drawings.words).toEqual(['secar']);

    await app.close();
  });
});

test.describe('erasing the learner takes the strip with him', () => {
  test('a sequence with no adaptations is on the list before she confirms', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await makeSequence(page);

    /*
     * The gap this closes: a structure job has no directory named after the child, so the
     * planner walked past it and the screen said «he borrado todo lo suyo» with a file
     * carrying his code still in her folder. `003` FR-215 asks for the list to be complete
     * **before** she confirms, which is what makes it a plan rather than an apology.
     */
    const plan = await page.evaluate((c) =>
      window.rampa.memory.forgetPlan(c) as Promise<{ paths: string[] }>, code);
    expect(plan.paths.some((p) => p.startsWith('material/'))).toBe(true);

    await page.evaluate((c) => window.rampa.memory.forget(c), code);

    // And nothing of his is left, which is the claim the screen makes.
    const left = await page.evaluate(() => window.rampa.vault.list('material') as Promise<string[]>);
    expect(left).toEqual([]);

    await app.close();
  });
});
