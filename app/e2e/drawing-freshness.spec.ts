import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoNamedLearner, toTab } from './nav.js';

/**
 * The second axis, in the real window (031 T019, quickstart §5).
 *
 * ## What this walk is actually for
 *
 * FR-2905 says the number she is warned with **is** the number of rows that then say the
 * sheet is out of date. Two derivations of «stale» that agree in a unit test can still
 * disagree in the window, because the window is where the vault, the ladder and the
 * learner's own override finally meet — and every one of those is assembled by a
 * different caller. So this asserts the count and the rows in the same run, on the same
 * vault, with the same set configured.
 *
 * ## Why there is a pictogram set on disk here
 *
 * `pictograms.affected` and the record row both ask «what drawing would this word get
 * **now**», and with no set the honest answer for every word is «none» — which makes
 * every recorded drawing stale and would let a broken ladder pass. A two-picture fixture
 * is the smallest thing that can tell *changed* from *gone*.
 *
 * Nothing is fetched: the fixture is written by this file, which is also what
 * `pictograms.spec.ts` insists on and for the same reason (FR-2107 — every fetch is the
 * result of an action she took, and a CI job is not her).
 *
 * ## What is not here
 *
 * Quickstart §5.5 — re-making a stale sheet and watching the new revision come out
 * current — needs a provider, so it belongs with the paid walks. What it would prove
 * about *this* feature is covered by §5.6 below: a sheet's axis is derived, so putting
 * the drawing back makes the September sheets current again with no run in between.
 */
const appRoot = process.cwd();

/** Two pictures, both claiming «casa» — so «changed» and «gone» are different states. */
const SET = JSON.stringify([
  { id: '1001', keywords: ['casa'] },
  { id: '1002', keywords: ['casa'] },
  { id: '2001', keywords: ['perro'] },
]);

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-fresh-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-fresh-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });

  const set = await mkdtemp(join(tmpdir(), 'rampa-fresh-set-'));
  await writeFile(join(set, 'pictograms.es.json'), SET);
  for (const id of ['1001', '1002', '2001']) {
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

  const used = await page.evaluate((root) =>
    window.rampa.pictograms.use(root) as Promise<{ ok: boolean }>, set);
  expect(used.ok, 'the fixture set must be readable').toBe(true);

  return { app, page, vault };
}

/**
 * A sheet that records the drawing each word got — which is the whole datum (FR-2901).
 *
 * `data-picto` on the block, `.rampa/vault.yaml` at version 3. Both, because either one
 * alone is a different state on purpose: pairs with no version marker is a vault whose
 * writer did not stamp them, and the axis is required to answer «no lo sé» rather than
 * «fresh» there (FR-2906).
 */
const sheet = (picto: string, signed = false): string => `---
${signed ? 'review:\n  signed_off: true\n  by: "la PT"\n  date: "2026-09-01"\n' : ''}adapted_on: "2026-09-01"
school_year: "2026-2027"
kind: "worksheet"
---

::: {#b1 .explanation data-picto="${picto}"}
La casa es grande.
:::
`;

/** Two learners, a sheet each, both drawn with `1001` — and one of them signed. */
async function seed(page: Page, vault: string): Promise<{ lucia: string; mateo: string }> {
  const codes = await page.evaluate(async (root) => {
    await window.rampa.vault.use(root);
    const made: string[] = [];
    for (const name of ['Lucía', 'Mateo']) {
      const code: string = await window.rampa.learners.newCode();
      await window.rampa.learners.save({
        code, axes: { COG: 2 }, works: [], avoid: [], interests: [],
        response: { default: 'short' }, language: { instruction: 'es' },
      });
      await window.rampa.names.set(code, name);
      made.push(code);
    }
    /*
     * A key, because `detectStep` sends a vault with no provider back to the connect
     * step and the rail never appears. Not a real one: nothing here sends anything.
     */
    await window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key');
    return made;
  }, vault) as string[];

  const [lucia, mateo] = codes as [string, string];

  await page.evaluate(async (args) => {
    const [a, b, one, two] = args as [string, string, string, string];
    // Version 3: this vault records which drawing each word got.
    await window.rampa.vault.write('.rampa/vault.yaml', '---\nschema: 3\n---\n');
    for (const [job, code, body] of [['job-a', a, one], ['job-b', b, two]] as const) {
      await window.rampa.vault.write(`material/${job}/ir.md`,
        '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nLa casa es grande.\n:::\n');
      await window.rampa.vault.write(`material/${job}/${code}/adapted.md`, body);
      await window.rampa.vault.write(`material/${job}/${code}/report.md`, '# Informe\n');
    }
  }, [lucia, mateo, sheet('casa=1001@'), sheet('casa=1001@', true)] as [string, string, string, string]);

  // «casa» has two candidates, so the ladder only answers once she has chosen.
  await page.evaluate(() =>
    window.rampa.pictograms.chooseWord({ word: 'casa', id: '1001' }));

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return { lucia, mateo };
}

/** Every byte of both sheets, so «untouched» is asserted rather than assumed. */
const onDisk = (page: Page, codes: { lucia: string; mateo: string }) => page.evaluate(async (c) => {
  const { lucia, mateo } = c as { lucia: string; mateo: string };
  return JSON.stringify({
    a: await window.rampa.vault.read(`material/job-a/${lucia}/adapted.md`),
    b: await window.rampa.vault.read(`material/job-b/${mateo}/adapted.md`),
  });
}, codes);

const drawings = (page: Page, code: string) => page.evaluate((c) =>
  window.rampa.record.forLearner(c) as Promise<Array<{
    jobId: string;
    freshness?: { drawings: { state: string; words?: string[] } };
  }>>, code);

const affected = (page: Page, next: string | null) => page.evaluate((n) =>
  window.rampa.pictograms.affected({ word: 'casa', next: n as string | null }) as Promise<{
    count: number; sheets: unknown[];
  }>, next);

test.describe('changing a drawing, and the sheets that already used it', () => {
  test('the number she is warned with is the number of rows that then say so', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);
    const before = await onDisk(page, codes);

    /*
     * Both sheets are current, and current is a claim this vault is entitled to make:
     * it is at version 3, so an absent pair would have meant «no pictograms» rather
     * than «unknown».
     */
    for (const code of [codes.lucia, codes.mateo]) {
      expect((await drawings(page, code))[0]!.freshness!.drawings.state).toBe('fresh');
    }

    // What she is told **before** deciding (FR-2905).
    const warned = await affected(page, '1002');
    expect(warned.count).toBe(2);

    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'casa', id: '1002' }));

    // …and what the record then says, on the same vault, in the same run.
    let stale = 0;
    for (const code of [codes.lucia, codes.mateo]) {
      const d = (await drawings(page, code))[0]!.freshness!.drawings;
      if (d.state === 'stale') { stale += 1; expect(d.words).toEqual(['casa']); }
    }
    expect(stale, 'the count she was shown is the count she then sees').toBe(warned.count);

    /*
     * And the sheets themselves are untouched — byte for byte, signature included.
     *
     * This is the point of deriving the axis instead of stamping a flag: a change of
     * mind about a drawing must not edit a document a teacher signed, and the only way
     * to be sure of that is to compare the bytes.
     */
    expect(await onDisk(page, codes)).toBe(before);

    await app.close();
  });

  test('she reads it in the row, named, with the reading axis untouched', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'casa', id: '1002' }));

    await intoNamedLearner(page, 'Lucía');
    await toTab(page, 'made');
    await page.getByRole('heading', { name: /Lo que he preparado para/ }).waitFor();
    await page.getByText('Un momento, que miro qué hay…').waitFor({ state: 'detached' });

    const body = await page.locator('.main').innerText();
    // The word, because «está antigua» is not something she can act on (FR-2903).
    expect(body).toContain('ya no usas: casa');
    /*
     * And **not** the reading sentence. Two axes, two sentences: `ir.md` has not
     * changed, so claiming it did would be the merged «desactualizada» that FR-2903
     * exists to forbid.
     */
    expect(body).not.toContain('lectura que has cambiado');

    // FR-1113: a screen nobody has looked at is a screen nobody has finished.
    await page.screenshot({ path: 'test-results/drawing-freshness.png', fullPage: true });
    await app.close();
  });

  test('un-choosing is the same question, and answers it the same way', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);

    // `next: null` is «dejar de elegir» — no id at all, rather than a different one.
    expect((await affected(page, null)).count).toBe(2);

    await page.evaluate(() => window.rampa.pictograms.unchooseWord({ word: 'casa' }));

    const d = (await drawings(page, codes.lucia))[0]!.freshness!.drawings;
    expect(d.state).toBe('stale');
    expect(d.words).toEqual(['casa']);
    await app.close();
  });

  test('and putting it back makes them current again, with no run in between', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);

    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'casa', id: '1002' }));
    expect((await drawings(page, codes.lucia))[0]!.freshness!.drawings.state).toBe('stale');

    await page.evaluate(() =>
      window.rampa.pictograms.chooseWord({ word: 'casa', id: '1001' }));
    /*
     * Derived, not stamped. A flag written into the sheet when she changed her mind
     * would still be there now, and she would be told to re-make two sheets that are
     * identical to what Rampa would produce today.
     */
    expect((await drawings(page, codes.lucia))[0]!.freshness!.drawings.state).toBe('fresh');

    await app.close();
  });

  test('the same sheet with no pairs is «al día» at v3 and «no lo sé» at v1', async () => {
    const { app, page, vault } = await launch();
    const codes = await seed(page, vault);

    /*
     * A sheet with **no** `data-picto` at all — which is the case FR-2906 is about.
     *
     * A first draft of this test lowered the marker under a sheet that *did* record its
     * pairs and expected «no lo sé». That was wrong, and usefully so: recorded pairs are
     * comparable whatever the marker says, and refusing to read them would be throwing
     * away the fact rather than reporting it. The version only decides what an
     * **absence** means — «this sheet used no pictograms», or «nobody wrote it down».
     */
    await page.evaluate(async (c) => {
      const code = c as string;
      await window.rampa.vault.write('material/job-c/ir.md',
        '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nSin dibujos.\n:::\n');
      await window.rampa.vault.write(`material/job-c/${code}/adapted.md`,
        '---\nadapted_on: "2026-09-01"\nschool_year: "2026-2027"\nkind: "worksheet"\n'
        + '---\n\n::: {#b1 .explanation}\nSin dibujos.\n:::\n');
    }, codes.lucia);

    const jobC = async (): Promise<string> => {
      const rows = await drawings(page, codes.lucia);
      return rows.find((r) => r.jobId === 'job-c')!.freshness!.drawings.state;
    };

    // At 3, the writer stamped pairs — so no pairs means it used no pictograms.
    expect(await jobC()).toBe('fresh');

    // At 1, the same absence says nothing at all, and «al día» would be a claim about
    // a fact nobody wrote down.
    await page.evaluate(() =>
      window.rampa.vault.write('.rampa/vault.yaml', '---\nschema: 1\n---\n'));
    expect(await jobC()).toBe('unknown');

    await app.close();
  });
});
