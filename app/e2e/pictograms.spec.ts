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
 * And for a while it did it anyway. A test added here for the progress bar accepted the
 * licence and ran the real 157 MB download for eight seconds, against the reasoning two
 * paragraphs above it, downloading thousands of CC BY-NC-SA images onto every runner and
 * failing offline. A review caught the contradiction; it now drives the same code through
 * the fake transport that `BringArgs` has always accepted.
 *
 * The fetch is covered offline in `packages/shell/test/pictogram-whole-set.test.ts` and
 * `pictogram-gate.test.ts` — including what leaves her machine and that nothing is
 * requested before she accepts, which are the assertions that matter most and the ones a
 * live test could not make.
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

  test('nothing is requested before she accepts, from the real window (FR-2104)', async () => {
    /*
     * The **negative**, which is what an e2e can add here: the real main process, the
     * real settings, the real handler — and no acceptance. `pictogram-gate.test.ts`
     * proves the transport refuses; this proves the wiring reaches it.
     *
     * No network either way: a refused gate never opens a socket.
     */
    const before = await page.evaluate(async () => {
      try { await window.rampa.pictograms.checkUpdate(); return 'ok'; }
      catch (e) { return (e as Error).message; }
    });
    // `checkUpdate` answers from disk when it may not ask, so this is a value not a throw.
    expect(before).not.toMatch(/arasaac\.org/);

    const state = await page.evaluate(() => window.rampa.pictograms.state()) as {
      status: { state: string };
    };
    expect(state.status.state).toBe('unknown');
  });

  test('a download in progress survives leaving the screen (025 FR-2309)', async () => {
    /*
     * The bar and «Parar» used to be the component's own state, so navigating out of
     * Configuración and back lost both while the fetch continued — and re-enabled the
     * button, which made a second concurrent run reachable without malice.
     *
     * Asserted through `pictograms:bringing`, which is where the state now lives. With
     * nothing running it must say so rather than throwing or inventing numbers.
     */
    const idle = await page.evaluate(() => window.rampa.pictograms.bringing()) as {
      running: boolean; done: number; total: number;
    };
    expect(idle).toEqual({ running: false, done: 0, total: 0 });
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
