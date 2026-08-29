import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Ingest and the gate, in the real application (008 T025, quickstart §5).
 *
 * No provider is called and there is no test-only bypass. What is asserted here
 * is everything decidable without a key — and that turns out to include the most
 * important thing in the feature: **adaptation refuses while any page is
 * unconfirmed.**
 *
 * That gate is the project's stated defence against contaminating every output
 * with one reading error, and until this file existed it was held up by nothing.
 * Worse: the handler that set `verified` did so with a regular expression over
 * the whole document, in one call, so it could be passed by clicking once having
 * read nothing.
 */
const appRoot = process.cwd();

/**
 * The IR as it is on disk.
 *
 * `window.rampa.vault.read` returns the *body* with the front matter already
 * parsed off, so asserting on `extraction.verified` through it can never pass —
 * which is how the first version of these tests failed. What matters is the file,
 * so the file is what is read.
 */
async function irOnDisk(vault: string, job: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(join(vault, 'material', job, 'ir.md'), 'utf8');
}

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-ingest-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-ingest-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  return { app, page, vault };
}

/** A vault and a learner, so the screens behind onboarding render. */
async function seed(page: Page, vault: string): Promise<void> {
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 3, EJE: 2 }, works: ['Le funciona el primer paso hecho'],
    avoid: [], interests: [], response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
}

test.describe('ingest', () => {
  test('names the formats she actually has, in her words', async () => {
    const { app, page } = await launch();
    const accepted = await page.evaluate(() => window.rampa.ingest.accepted()) as
      { extensions: string[]; description: string };

    // HEIC is the one that matters: it is the default of the most common phone,
    // and a teacher has no idea her phone chose it.
    for (const ext of ['.jpg', '.png', '.heic', '.pdf', '.docx']) {
      expect(accepted.extensions, ext).toContain(ext);
    }
    expect(accepted.description).toContain('HEIC');
    // FR-702's rule applies here too: no jargon in what she reads.
    expect(accepted.description).not.toMatch(/mime|codec|raster|OCR/i);
    await app.close();
  });

  test('refuses a format it cannot read, saying what it can', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    const dir = await mkdtemp(join(tmpdir(), 'rampa-files-'));
    const bad = join(dir, 'apuntes.pages');
    await writeFile(bad, 'x');

    const err = await page.evaluate(async (p) => {
      try { await window.rampa.ingest.run('job-x', [p]); return null; }
      catch (e) { return (e as Error).message; }
    }, bad);

    expect(err).toBeTruthy();
    expect(err).toContain('.pages');
    // Never a dead end: the sentence says what she can bring instead.
    expect(err).toContain('HEIC');
    await app.close();
  });

  test('refuses a mixed drop rather than guessing the page order', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    const dir = await mkdtemp(join(tmpdir(), 'rampa-files-'));
    const pdf = join(dir, 'ficha.pdf');
    const jpg = join(dir, 'foto.jpg');
    await writeFile(pdf, '%PDF-1.4\n');
    await writeFile(jpg, Buffer.from([0xff, 0xd8, 0xff]));

    const err = await page.evaluate(async (paths) => {
      try { await window.rampa.ingest.run('job-x', paths); return null; }
      catch (e) { return (e as Error).message; }
    }, [pdf, jpg]);

    expect(err).toMatch(/no mezclados|en qué orden/i);
    await app.close();
  });

  test('refuses an empty drop without a stack trace', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    const err = await page.evaluate(async () => {
      try { await window.rampa.ingest.run('job-x', []); return null; }
      catch (e) { return (e as Error).message; }
    });
    expect(err).toContain('ningún fichero');
    /*
     * The raw IPC error IS wrapped — Electron adds "Error invoking remote
     * method", and the project adds its own `[rampa:kind]` prefix so the kind
     * survives the round trip. Neither may reach a teacher, and the first run of
     * this test found exactly that on screen.
     *
     * So the assertion belongs where she reads it: the screen decodes with
     * `fromWire` and shows the sentence from the Spanish error map.
     */
    const shown = await page.evaluate((raw: string) => {
      const cleaned = raw.replace(/^Error invoking remote method '[^']*':\s*/, '')
                         .replace(/^Error:\s*/, '');
      const m = /^\[rampa:([a-z-]+)\]\s*/.exec(cleaned);
      return m ? { kind: m[1], message: cleaned.slice(m[0].length) } : { kind: 'unknown', message: cleaned };
    }, err!);
    expect(shown.kind).toBe('ingest-empty');
    expect(shown.message).toBe('No has añadido ningún fichero.');
    await app.close();
  });

  test('the budget comes from the corpus, not from the code', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    const budget = await page.evaluate(() => window.rampa.ingest.budget()) as
      { attemptsPerPage: number; pagesPerJob: number; imageLongEdge: number };

    // FR-617. If these ever stop matching `instructions/ingest.md`, the numbers
    // have silently moved back into TypeScript.
    expect(budget.attemptsPerPage).toBeGreaterThanOrEqual(1);
    expect(budget.attemptsPerPage).toBeLessThanOrEqual(4);
    expect(budget.pagesPerJob).toBeGreaterThan(1);
    expect(budget.imageLongEdge).toBeGreaterThanOrEqual(1100);
    await app.close();
  });

  /**
   * FR-609. Once, and then not again — a warning that fires on every job stops
   * being read within a fortnight, and this one is about the residual the whole
   * feature documents rather than fixes.
   */
  test('warns about names in photos once, and remembers that it did', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    expect(await page.evaluate(() => window.rampa.ingest.photoWarningSeen())).toBe(false);
    await page.evaluate(() => window.rampa.ingest.acknowledgePhotoWarning());
    expect(await page.evaluate(() => window.rampa.ingest.photoWarningSeen())).toBe(true);

    // And it survives a relaunch, because it lives in the settings file outside
    // the vault.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    expect(await page.evaluate(() => window.rampa.ingest.photoWarningSeen())).toBe(true);
    await app.close();
  });

  test('the acknowledgement is not in the vault, so a handover cannot carry it', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await page.evaluate(() => window.rampa.ingest.acknowledgePhotoWarning());

    const { readdir } = await import('node:fs/promises');
    const inVault = await readdir(vault).catch(() => [] as string[]);
    for (const name of inVault) {
      expect(name).not.toMatch(/settings|credentials/);
    }
    await app.close();
  });
});

/**
 * The gate (FR-608) — the reason this feature exists.
 *
 * Driven through the IPC rather than the screen, because reaching the screen
 * needs a completed extraction and a completed extraction needs a key. What is
 * asserted is the mechanism the screen calls, which is where the guarantee lives.
 */
test.describe('the verification gate', () => {
  const irWithTwoPages = `---
source: "photos"
extraction: {"verified": false, "pages": 2}
---

::: {#p1-b1 .explanation data-page="1" data-source-id="b1"}
Los ecosistemas
:::

::: {#p2-b1 .exercise data-page="2" data-source-id="b1" data-number="3"}
¿Qué come el búho?
:::
`;

  const extraction = {
    source: 'photos',
    pages: [
      { page: 1, verified: false, problems: [], attempts: 1, flags: [] },
      { page: 2, verified: false, problems: [], attempts: 1, flags: [] },
    ],
    boundReached: false, cutPages: [], costCents: 4, verified: false,
  };

  async function seedJob(page: Page): Promise<void> {
    await page.evaluate(async ({ ir, ex }) => {
      await window.rampa.vault.write('material/job-t/ir.md', ir);
      await window.rampa.vault.write('material/job-t/extraction.json', JSON.stringify(ex, null, 2));
    }, { ir: irWithTwoPages, ex: extraction });
  }

  test('confirming one page of two does not open the gate', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    const after = await page.evaluate(() => window.rampa.ingest.confirmPage('job-t', 1)) as
      { verified: boolean; pages: Array<{ page: number; verified: boolean }> };

    expect(after.pages.find((p) => p.page === 1)!.verified).toBe(true);
    expect(after.pages.find((p) => p.page === 2)!.verified).toBe(false);
    // The whole point: one click is not confirmation of two pages.
    expect(after.verified).toBe(false);
    await app.close();
  });

  test('confirming every page opens it, and un-confirming one closes it again', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    await page.evaluate(() => window.rampa.ingest.confirmPage('job-t', 1));
    let state = await page.evaluate(() => window.rampa.ingest.confirmPage('job-t', 2)) as
      { verified: boolean };
    expect(state.verified).toBe(true);

    state = await page.evaluate(() => window.rampa.ingest.unconfirmPage('job-t', 2)) as
      { verified: boolean };
    expect(state.verified).toBe(false);
    await app.close();
  });

  test('a page with unresolved problems can never count as confirmed', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await page.evaluate(async ({ ir, ex }) => {
      await window.rampa.vault.write('material/job-p/ir.md', ir);
      await window.rampa.vault.write('material/job-p/extraction.json', JSON.stringify({
        ...ex,
        pages: [{ page: 1, verified: false, problems: ['La foto no se puede leer.'], attempts: 1, flags: [] }],
      }, null, 2));
    }, { ir: irWithTwoPages, ex: extraction });

    // She cannot confirm an extraction that does not exist.
    const state = await page.evaluate(() => window.rampa.ingest.confirmPage('job-p', 1)) as
      { verified: boolean };
    expect(state.verified).toBe(false);
    await app.close();
  });

  test('the IR flag follows the gate, because that is what adaptation reads', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    await page.evaluate(() => window.rampa.ingest.confirmPage('job-t', 1));
    await page.evaluate(() => window.rampa.ingest.confirmPage('job-t', 2));

    expect(await irOnDisk(vault, 'job-t')).toMatch(/"verified":\s*true/);
    await app.close();
  });

  /**
   * The assertion the gate exists for.
   *
   * `job:verify` used to flip the flag for any document with one call. It now
   * refuses anything that came from a file, so ingested material can only be
   * verified page by page.
   */
  test('the one-click verify refuses material that came from a file', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    const err = await page.evaluate(async () => {
      try { await window.rampa.job.verify('job-t'); return null; }
      catch (e) { return (e as Error).message; }
    });
    expect(err).toMatch(/página a página/);

    expect(await irOnDisk(vault, 'job-t')).toMatch(/"verified":\s*false/);
    await app.close();
  });

  test('her correction lands in the IR and is recorded as hers', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    await page.evaluate(() => window.rampa.ingest.correctAndConfirm('job-t', 2,
      [{ id: 'p2-b1', content: '¿Qué come la lechuza?' }]));

    const ir = await irOnDisk(vault, 'job-t');
    expect(ir).toContain('¿Qué come la lechuza?');
    // Principle VIII: her text, attributed to her, so no later stage credits the
    // extraction with words she wrote.
    expect(ir).toContain('data-corrected-by="teacher"');
    // And the printed number survived her edit.
    expect(ir).toContain('data-number="3"');
    await app.close();
  });

  test('the extracted blocks are readable page by page for the comparison', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await seedJob(page);

    const blocks = await page.evaluate(() => window.rampa.ingest.blocks('job-t')) as
      Array<{ id: string; page: number; content: string; number?: string }>;

    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.page)).toEqual([1, 2]);
    expect(blocks[1]!.number).toBe('3');
    await app.close();
  });
});
