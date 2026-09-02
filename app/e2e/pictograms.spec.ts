import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The licence gate, in the real window (023 T018, FR-2104/2105/2110, SC-2101).
 *
 * ## What this covers, and what it deliberately does not
 *
 * It covers **the gate**: the licence is on screen before anything, the button that
 * fetches does not exist until she has accepted, and the fetch is refused in her own
 * language if something calls it anyway.
 *
 * It does **not** perform a real fetch. Two reasons, and neither is convenience:
 *
 * 1. A test that reaches `api.arasaac.org` is a request nobody asked for, made on
 *    every run, to somebody else's server. FR-2107 says every fetch is the result of
 *    an action she took — a CI job is not her.
 * 2. It would be flaky in exactly the way that teaches a suite to be ignored.
 *
 * The fetch itself is covered offline, against a fake transport, in
 * `packages/shell/test/pictogram-fetch.test.ts` — including what leaves her machine,
 * which is the assertion that matters most and the one a live test could not make.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-picto-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-picto-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  return { app, page, vault };
}

test.describe('bringing the pictograms', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async () => { ({ app, page } = await launch()); });
  test.afterEach(async () => { await app.close(); });

  test('the corpus says who they come from, and what the licence asks', async () => {
    const state = await page.evaluate(() => window.rampa.pictograms.publishers()) as {
      publishers: Array<{ id: string; licence: string; licenceUrl: string;
        index: string; attribution: { author: string; owner: string } }>;
      accepted: unknown; expectedTotal: number;
    };

    const arasaac = state.publishers.find((p) => p.id === 'arasaac');
    expect(arasaac, 'the built corpus must reach the renderer').toBeDefined();
    expect(arasaac!.attribution.author).toBe('Sergio Palao');
    expect(arasaac!.attribution.owner).toBe('Gobierno de Aragón');
    expect(arasaac!.licence).toMatch(/BY-NC-SA/);
    expect(arasaac!.licenceUrl).toMatch(/^https:\/\//);
    expect(state.expectedTotal).toBeGreaterThan(10_000);
    // A fresh install has accepted nothing.
    expect(state.accepted).toBeNull();
  });

  test('nothing is fetched before she accepts, and she is told why', async () => {
    const refused = await page.evaluate(async () => {
      try {
        await window.rampa.pictograms.fetch();
        return 'it fetched';
      } catch (e) { return (e as Error).message; }
    });
    /*
     * Her language, not a status code (`006` FR-423). And it names the publisher, so
     * «which licence?» has an answer on the screen where the question arises.
     */
    expect(refused).toMatch(/no has aceptado/i);
    expect(refused).toMatch(/ARASAAC/);
    // The kind survives the IPC boundary, so the renderer can decide what to show
    // rather than printing a wrapped exception (`ipc/wrap.ts`, and the defect fixed
    // on 2026-09-01 when `ProviderError` was not a `RampaError`).
    expect(refused).toContain('[rampa:pictogram-not-accepted]');
    expect(refused).not.toMatch(/undefined|\bnull\b/);
  });

  test('accepting is recorded, and withdrawing it takes nothing away', async () => {
    await page.evaluate(() => window.rampa.pictograms.acceptLicence('arasaac'));
    const after = await page.evaluate(() => window.rampa.pictograms.publishers()) as {
      accepted: { publisher: string; licence: string; acceptedOn: string } | null;
    };
    expect(after.accepted?.publisher).toBe('arasaac');
    expect(after.accepted?.licence).toMatch(/BY-NC-SA/);
    expect(after.accepted?.acceptedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await page.evaluate(() => window.rampa.pictograms.withdrawLicence());
    const gone = await page.evaluate(() => window.rampa.pictograms.publishers()) as {
      accepted: unknown;
    };
    expect(gone.accepted).toBeNull();

    // And the set she may already have is untouched: withdrawal stops fetching, it
    // does not confiscate (FR-2106).
    const set = await page.evaluate(() => window.rampa.pictograms.current());
    expect(set).toBeNull();
  });

  test('opening the screen costs no request (024 FR-2209/2210)', async () => {
    /*
     * «Que no me lo vuelva a preguntar» is a requirement about silence, so the ordinary
     * case — she opens this screen — has to be answerable from disk alone.
     */
    const state = await page.evaluate(() => window.rampa.pictograms.state()) as {
      status: { state: string }; inventory: unknown; root: string;
    };
    expect(state.status.state).toBe('unknown');   // a fresh vault, nothing brought yet
    expect(state.inventory).toBeNull();
    expect(state.root).toMatch(/pictogramas$/);   // inside her Rampa folder (FR-2205)
  });

  test('progress arrives with real numbers, and stopping works (024 T012, FR-2118)', async () => {
    /*
     * The **contract**, not the screen. This drives the real download for a few
     * seconds — the only outbound request in the suite — and stops it.
     *
     * It asserts the IPC surface rather than the bar because the pictogram screen is
     * moving out of the learner's profile into Configuración (`025`), and an assertion
     * that walks a navigation about to change is an assertion that will be loosened
     * rather than fixed. The bar itself is asserted where it is stable: the component
     * test, and `025`'s own e2e once it has a home.
     *
     * The first version of this test called `fetch()` directly and then waited for a
     * progressbar — which never appeared, because the component was not mounted. That
     * is the mistake this comment exists to stop somebody repeating.
     */
    await page.evaluate(() => window.rampa.pictograms.acceptLicence('arasaac'));

    const seen: Array<{ stage: string; done?: number; total?: number }> = [];
    await page.exposeFunction('__rampaProgress', (p: unknown) => {
      seen.push(p as { stage: string; done?: number; total?: number });
    });
    await page.evaluate(() => window.rampa.job.onProgress((p: unknown) => {
      (window as unknown as { __rampaProgress: (x: unknown) => void }).__rampaProgress(p);
    }));

    const started = page.evaluate(() => window.rampa.pictograms.fetch());
    await page.waitForTimeout(8000);
    expect(await page.evaluate(() => window.rampa.pictograms.stop())).toBe(true);
    const result = await started as { stopped: boolean; brought: number };

    expect(result.stopped).toBe(true);
    // What arrived is usable, and pressing again resumes.
    expect(result.brought).toBeGreaterThan(0);

    const withNumbers = seen.filter((p) =>
      p.stage === 'Trayendo pictogramas' && typeof p.total === 'number');
    /*
     * **Numbers**, not a sentence. They used to be only inside `detail` and nothing
     * rendered them — the thirteenth field written by one place and read by nobody.
     */
    expect(withNumbers.length).toBeGreaterThan(0);
    expect(withNumbers.at(-1)!.total).toBeGreaterThan(10_000);
    expect(withNumbers.at(-1)!.done).toBeGreaterThan(0);
  });

  test('the folder path still works, with nothing downloaded (FR-2103)', async () => {
    // `018`'s promise, still true. A teacher who assembled a folder by hand — or who
    // has no internet — is not worse off for `023` existing.
    const looked = await page.evaluate(() =>
      window.rampa.pictograms.inspect('/no/existe')) as { ok: boolean; problems: unknown[] };
    expect(looked.ok).toBe(false);
    expect(looked.problems.length).toBeGreaterThan(0);
  });
});
