import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A hostile diagram, in the real window (022 T013/T014, FR-2010, SC-2002).
 *
 * ## What can be walked without money
 *
 * Composing needs a provider, so the walk that *produces* diagrams is quickstart §5 and
 * belongs to T025. What is walked here is the half that matters most and needs no key at
 * all: **a document that already carries a hostile figure block**, loaded into the viewer
 * and the print path, with the request log watched.
 *
 * That is the sharper test anyway. A composed sheet proves the happy path; a planted
 * document is what an attacker or a bad hand-edit actually produces, and the vault is
 * hand-editable by design.
 *
 * ## Asserted from the request log, not from intentions
 *
 * SC-2002 says zero fetches and zero execution. Both are observed: every request the
 * renderer makes is recorded, and the payloads try to fetch on load.
 */
const appRoot = process.cwd();

/** Every payload below tries to reach the same host, so one filter catches them all. */
const CANARY = 'canary.invalid';

const PAYLOADS: ReadonlyArray<[string, string]> = [
  ['a script that fetches', `<script>fetch("http://${CANARY}/a")</script>`],
  ['an event handler that fetches', `<rect width="8" height="8" onload="fetch('http://${CANARY}/b')"/>`],
  ['a remote image', `<image href="http://${CANARY}/c.png" width="8" height="8"/>`],
  ['a url() paint server', `<rect width="8" height="8" fill="url(http://${CANARY}/d)"/>`],
  ['a foreignObject with an iframe', `<foreignObject><iframe src="http://${CANARY}/e"/></foreignObject>`],
];

const sheet = (glyph: string): string => `---
generated: true
source: composed
kind: worksheet
title: Multiplicaciones
composed_on: "2026-09-04"
objectives:
  - Multiplicar con llevadas
---

::: {#g1-instruction .instruction data-objective="Multiplicar con llevadas"}
Resuelve estas multiplicaciones.
:::

::: {#g1-e1 .exercise data-objective="Multiplicar con llevadas"}
1. 4 × 3 =
:::

::: {#g1-e1-fig .figure data-figure="grid" data-of="g1-e1" data-rows="4" data-cols="3" data-description="Una rejilla de 4 filas por 3 columnas: 12 casillas."}
\`\`\`svg
${glyph}
\`\`\`
:::
`;

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
  await page.setViewportSize({ width: 1366, height: 900 });
  return { app, page, vault };
}

/** A vault with one composed job whose figure block carries `glyph`. */
async function seed(page: Page, vault: string, glyph: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: ['cartas'],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.evaluate((args) =>
    window.rampa.vault.write(`material/job-fig/ir.md`, args[0] as string),
  [sheet(glyph)] as [string]);
  return code;
}

test.describe('a planted hostile diagram reaches nothing', () => {
  for (const [what, glyph] of PAYLOADS) {
    test(`${what}: no request, no execution, and the sheet survives`, async () => {
      const { app, page, vault } = await launch();
      const code = await seed(page, vault, glyph);

      /*
       * Every request the renderer makes, from now on.
       *
       * Recorded rather than blocked: a blocked request is still a request, and the
       * claim FR-2010 makes is that opening a worksheet is not a signal that it was
       * opened. `webRequest` in the main process would be the belt; this is the check.
       */
      const requests: string[] = [];
      page.on('request', (r) => requests.push(r.url()));

      const html = await page.evaluate((c) =>
        window.rampa.job.documentHtml('job-fig', c) as Promise<string>, code);

      // The sheet exists, minus the diagram, with the refusal said (FR-2011).
      expect(html).toContain('4 × 3');
      expect(html).toContain('No he dibujado este diagrama');

      // Nothing live survived into the document.
      const body = html.replace(/<p class="figure-refused">[\s\S]*?<\/p>/g, '');
      for (const token of ['<script', 'onload=', 'href="http', 'url(http', '<image', '<iframe']) {
        expect(body, `${what} · ${token}`).not.toContain(token);
      }

      /*
       * The viewer, which is where the document is actually put in front of her.
       *
       * `seal()` gives the frame no script permission, no navigation and nothing remote
       * (`021` T014) — so this asserts the outer wall as well as the inner one.
       */
      await page.evaluate((h) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', '');
        frame.srcdoc = h as string;
        frame.id = 'probe';
        document.body.appendChild(frame);
      }, html);
      await page.waitForTimeout(400);

      expect(requests.filter((u) => u.includes(CANARY)), `${what} fetched something`)
        .toEqual([]);
      await app.close();
    });
  }

  /**
   * And the PDF path, which renders in its own window with `javascript: false`.
   *
   * A real file on disk, and its size asserted — «a PDF was produced» is a claim about
   * bytes, and this project has a rule about claims nobody checked.
   */
  test('the PDF is produced, with no network at all', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault, PAYLOADS[0]![1]);

    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    const path = await page.evaluate((c) =>
      window.rampa.job.pdf('job-fig', c) as Promise<string>, code);
    expect(path).toContain('.pdf');
    const size = (await stat(path)).size;
    expect(size, 'the PDF is empty').toBeGreaterThan(1000);

    expect(requests.filter((u) => u.includes(CANARY))).toEqual([]);
    await app.close();
  });

  /** A good diagram draws, in the same window, so the refusals above are not «everything». */
  test('a good diagram draws twelve cells, because the exercise says twelve', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault,
      '<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>');

    const html = await page.evaluate((c) =>
      window.rampa.job.documentHtml('job-fig', c) as Promise<string>, code);
    expect((html.match(/<g transform="translate\(/g) ?? []).length).toBe(12);
    expect(html).toContain('Una rejilla de 4 filas por 3 columnas');
    await app.close();
  });
});
