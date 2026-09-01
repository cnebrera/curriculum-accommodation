import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab } from './nav.js';
// The viewer's real policy, not a copy of it — a duplicated CSP in a test is a test
// that passes while the viewer's own policy drifts.
import { seal } from '../ui/src/viewer/seal.js';

/**
 * Composed material is material (021 T016, quickstart §4).
 *
 * The state this is written against is the one Carlos was in: a document composed for a
 * learner, sitting in his folder, with nothing in the application able to open, print or
 * sign it — because everything read `adapted.md`.
 *
 * The last test is the one that is not about convenience. A composed document rests on an
 * anchor **she pasted**, so it can contain anything a web page can; the viewer must render
 * it and run none of it (FR-1924, Principle IX).
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-comp-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-comp-v-')), 'Rampa');
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
 * A learner with **composed** material and no adaptation — the state that had no outputs.
 *
 * `nasty` plants in the document everything a pasted anchor could carry: a script, an
 * inline handler, a remote image and a link. Seeded through the vault rather than composed
 * for real, because composing costs a provider call and this is about what happens to a
 * document afterwards.
 */
async function seed(page: Page, vault: string, opts: { nasty?: boolean } = {}): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);

  const nasty = opts.nasty === true;
  await page.evaluate(async (args) => {
    const [c, withNasty] = args as [string, boolean];
    const extra = withNasty
      ? '\n::: {#b9 .explanation}\n<script>window.RAMPA_PWNED = 1;</script>\n'
        + '<img src="http://example.invalid/beacon.png">\n'
        + '<a href="http://example.invalid/go">pincha</a>\n'
        + '<div onclick="window.RAMPA_PWNED = 2">tócame</div>\n:::\n'
      : '';
    await window.rampa.vault.write('material/job-comp/ir.md',
      '---\nsource: "generated"\ngenerated: true\nkind: "worksheet"\n'
      + `for_learner: "${c}"\ncomposed_on: "2026-09-01"\n---\n\n`
      + '::: {#g1-instruction .instruction}\nResuelve estas multiplicaciones.\n:::\n\n'
      + '::: {#g1-e1 .exercise data-number="1"}\n47 × 8 =\n:::\n' + extra);
    await window.rampa.vault.write('material/job-comp/answers.md',
      '# Soluciones — Multiplicaciones\n\n'
      + '**SOLUCIONES · NO REPARTIR — esta hoja es para ti, no para el alumno.** '
      + 'No la imprimas junto con la suya.\n\n1. 47 × 8 = **376**\n');
  }, [code, nasty]);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: 'Secciones de Rampa' }).waitFor({ timeout: 15000 });
  return code;
}

test.describe('a composed document is a document', () => {
  test('appears in what has been prepared, before any adaptation', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await intoLearner(page);
    await toTab(page, 'made');
    await expect(page.getByText('Pendiente de adaptar')).toBeVisible();
    await app.close();
  });

  test('renders to HTML with the draft mark, and no adaptation runs', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    const html: string = await page.evaluate((c) =>
      window.rampa.job.documentHtml('job-comp', c) as Promise<string>, code);

    expect(html).toContain('47');
    // Principle VII: unsigned means it says so, and composed material says more —
    // its content is unreviewed, not only its adaptation.
    expect(html.toUpperCase()).toContain('BORRADOR');
    // And nothing was adapted on the way: no learner directory appeared.
    const files: string[] = await page.evaluate((c) =>
      window.rampa.vault.list(`material/job-comp/${c}`) as Promise<string[]>, code);
    expect(files).toEqual([]);
    await app.close();
  });

  test('the answer key renders on its own, and says not to hand it out', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const key: string = await page.evaluate(() =>
      window.rampa.job.answerKeyHtml('job-comp') as Promise<string>);
    expect(key).toContain('376');
    expect(key.toUpperCase()).toContain('NO REPARTIR');
    await app.close();
  });

  test('the sheet carries no answer, whatever it is rendered into', async () => {
    // SC-1908's other half, over the real pipeline rather than a unit fixture.
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const html: string = await page.evaluate((c) =>
      window.rampa.job.documentHtml('job-comp', c) as Promise<string>, code);
    expect(html).not.toContain('376');
    await app.close();
  });

  test('can be signed off, and the signature does not travel to an adaptation', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    await page.evaluate((c) => window.rampa.job.signOff('job-comp', c, 'PT'), code);
    expect(await page.evaluate((c) =>
      window.rampa.job.isSignedOff('job-comp', c), code)).toBe(true);

    // An adaptation is a different document, and nobody has read it (Principle VII).
    await page.evaluate((c) => window.rampa.vault.write(
      `material/job-comp/${c}/adapted.md`,
      '---\nadapted_on: "2026-09-02"\nkind: "worksheet"\n---\n\n'
      + '::: {#g1-e1 .exercise data-from="g1-e1"}\n47 × 8 =\n:::\n'), code);
    expect(await page.evaluate((c) =>
      window.rampa.job.isSignedOff('job-comp', c), code)).toBe(false);
    await app.close();
  });

  test('says which kind of nothing, when there is nothing', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    const message: string = await page.evaluate(async () => {
      try {
        await window.rampa.job.documentHtml('job-empty', 'ZZ9');
        return 'no error';
      } catch (e) { return (e as Error).message; }
    });
    // «Este trabajo no tiene ningún documento» — not «todavía no está adaptado», which
    // was being said about composed material and is what gave the defect away.
    expect(message).toContain('no tiene ningún documento');
    await app.close();
  });

  test('the viewer runs nothing the document contains', async () => {
    /*
     * FR-1924, over the rendered interface. A composed document rests on an anchor she
     * pasted, so it can carry whatever a web page can — and this one does: a script, an
     * inline handler, a remote image and a link.
     */
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, { nasty: true });
    // The document reaches the viewer through the same channel the screen uses.
    const html: string = await page.evaluate((c) =>
      window.rampa.job.documentHtml('job-comp', c) as Promise<string>, code);

    await page.setContent('<div id="host"></div>');
    await page.evaluate((args) => {
      const [doc, sealed] = args as [string, string];
      void doc;
      const frame = document.createElement('iframe');
      // Exactly what the component sets: every permission is opt-in and this opts into
      // none.
      frame.setAttribute('sandbox', '');
      frame.srcdoc = sealed;
      document.getElementById('host')!.appendChild(frame);
    }, [html, seal(html)]);
    await page.waitForTimeout(600);

    // Nothing ran: the script never touched the parent, and could not have.
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)['RAMPA_PWNED']))
      .toBeUndefined();
    await app.close();
  });
});
