import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * «Visual prints, non-visual stops» (`019` FR-1709 as amended, decision P43).
 *
 * ## Three statements of one rule, none of which agreed
 *
 * `019` FR-1709 said an undescribed figure «MUST be announced as undescribed», for
 * all of them, and `render/linear.ts` did exactly that — so an exercise whose
 * answer **is** the diagram reached a learner who cannot see it, as a sentence
 * telling him there is a picture he will not get.
 *
 * `instructions/render.md` said the opposite in its own non-visual section: «an
 * essential figure with no long description blocks the render».
 *
 * And the code did neither for the ODT, which had **no check at all** while the PDF
 * of the same sheet threw on it — a deviation between two modalities of one
 * document, which is what Principle IV forbids appearing «as an omission».
 *
 * ## Why this is an end-to-end test
 *
 * The stop lives in `jobs/export.ts`, which reaches the vault and the settings, so
 * the offline suite cannot see it. And the interesting assertion is precisely that
 * **four outputs of one document behave in two different ways on purpose** — which
 * is only checkable by asking for all four.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-fig-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-fig-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, vault };
}

/** One learner and one adapted sheet whose figure is essential and undescribed. */
async function seed(page: Page, vault: string, role: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
  }), code);

  await page.evaluate(async (args) => {
    const [c, r] = args as [string, string];
    await window.rampa.vault.write('material/job-fig/ir.md',
      '---\nsource: "pegado"\nverified: true\nkind: "worksheet"\n---\n\n'
      + '::: {#b1 .instruction}\nMira el dibujo y contesta.\n:::\n');
    await window.rampa.vault.write(`material/job-fig/${c}/adapted.md`,
      '---\nadapted_on: "2026-09-04"\nschool_year: "2025-2026"\nkind: "worksheet"\n---\n\n'
      + '::: {#b1 .instruction data-from="b1" data-recipe="chunk-the-prose@1"}\n'
      + 'Mira el dibujo y contesta.\n:::\n\n'
      + `::: {#f1 .figure data-role="${r}" data-from="b1" data-recipe="chunk-the-prose@1"}\n`
      + '(un diagrama del ciclo del agua)\n:::\n');
  }, [code, role]);

  return code;
}

const ask = (page: Page, channel: 'pdf' | 'odt' | 'audio' | 'brailleReady', code: string) =>
  page.evaluate(async (args) => {
    const [ch, c] = args as [string, string];
    const api = (window.rampa.job as unknown as Record<string, (a: string, b: string) => Promise<unknown>>);
    try { return { ok: true, value: await api[ch]!('job-fig', c) }; }
    catch (e) { return { ok: false, message: (e as Error).message }; }
  }, [channel, code]);

test.describe('an essential figure with no description', () => {
  test('still prints, because on paper the picture is there', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, 'essential');

    /*
     * A deliberate loosening: the PDF used to throw. Refusing to print takes a
     * usable sheet away for a description that only a non-visual reader needs —
     * and the sheet she is holding has the diagram on it.
     */
    const pdf = await ask(page, 'pdf', code);
    expect(pdf.ok, `the PDF refused: ${pdf.message}`).toBe(true);

    await app.close();
  });

  test('exports to ODT, and says what is missing — which it never did', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, 'essential');

    const odt = await ask(page, 'odt', code);
    expect(odt.ok, `the ODT refused: ${odt.message}`).toBe(true);
    const result = odt.value as { path: string; undescribed: string[] };
    expect(result.path).toMatch(/sheet\.odt$/);
    // The check this output did not have at all, as a notice rather than a block.
    expect(result.undescribed.join(' ')).toContain('f1');
    expect(result.undescribed.join(' ')).toMatch(/imprescindible/);

    await app.close();
  });

  test('stops the audio, because there the picture is not there at all', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, 'essential');

    const audio = await ask(page, 'audio', code);
    expect(audio.ok, 'audio was produced for an exercise with no answer in it').toBe(false);
    expect(audio.message).toContain('[rampa:render-undescribed]');
    // And it says which figure, and why it is different from paper.
    expect(audio.message).toContain('f1');
    expect(audio.message).toMatch(/En papel sí sale/);

    await app.close();
  });

  test('stops the braille too, for the same reason', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, 'essential');

    const braille = await ask(page, 'brailleReady', code);
    expect(braille.ok).toBe(false);
    expect(braille.message).toContain('[rampa:render-undescribed]');

    await app.close();
  });

  test('and an informative figure stops nothing at all', async () => {
    /*
     * The other half of the amended rule. An informative figure adds something,
     * so its absence is a loss rather than a hole where the answer was — it is
     * announced and every modality goes out.
     */
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, 'informative');

    for (const channel of ['pdf', 'odt', 'audio', 'brailleReady'] as const) {
      const r = await ask(page, channel, code);
      expect(r.ok, `${channel} refused an informative figure: ${r.message}`).toBe(true);
    }

    await app.close();
  });
});
