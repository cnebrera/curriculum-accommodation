import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
// Synchronous: the runner loads specs as CJS, so there is no top-level await.
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The accessibility gate (spec 010 T018/T019, closing backlog G7 and 006 T075).
 *
 * This project has stated a WCAG 2.2 AA target for its own interface since the
 * target was first written down, and tested it never. `contrast.test.ts` closed
 * half of that with arithmetic over the tokens. This closes the other half — the
 * one arithmetic cannot reach: a missing label, a heading level skipped, an error
 * not tied to its field, a focus order that makes no sense, a live region that
 * never announces.
 *
 * Run over every screen × both themes × default and largest text. Four passes
 * per screen, because a preference is not an excuse (FR-819).
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-a11y-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-a11y-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, vault };
}

/** Set up enough state that the real screens render, not the onboarding. */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 3, EJE: 3, DEC: 2, ATE: 2 },
    works: ['Le funciona hacer el primer ejercicio conmigo, en voz alta, antes de empezar sola'],
    avoid: ['Nada con cuenta atrás'], interests: ['dinosaurios', 'trenes'],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  // `detectStep()` asks the system rather than trusting a flag, so getting past
  // onboarding means genuinely satisfying it: a vault, a learner, and a
  // configured provider. The key below is deliberately not a key. `providers:save`
  // does not validate — validation is a separate, explicit step in the wizard —
  // so this configures the provider without a single byte leaving the machine,
  // and without adding a test-only bypass to the application.
  await page.evaluate(() =>
    window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

/**
 * An extraction on disk, so the verification screen has something to render.
 *
 * Written through the vault rather than produced by a real ingest, because a real
 * ingest needs a key — and adding a test-only path that fakes one would weaken
 * exactly the guarantees this project enforces structurally.
 */
async function seedExtraction(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await window.rampa.vault.write('material/job-a11y/ir.md',
      '---\nsource: "photos"\nextraction: {"verified": false, "pages": 1}\n---\n\n'
      + '::: {#p1-b1 .exercise data-page="1" data-source-id="b1" data-number="3"}\n'
      + '¿Qué come el búho?\n:::\n');
    await window.rampa.vault.write('material/job-a11y/extraction.json', JSON.stringify({
      source: 'photos', boundReached: false, cutPages: [], costCents: 4, verified: false,
      pages: [{ page: 1, verified: false, problems: [], attempts: 1, flags: [
        { kind: 'unreadable', message: 'Hay algo que no se ha podido leer.', blockId: 'p1-b1' },
      ] }],
    }, null, 2));
  });
}

const MODES = [
  { name: 'claro · normal',     theme: null,     text: null },
  { name: 'oscuro · normal',    theme: 'dark',   text: null },
  { name: 'claro · muy grande', theme: 'light',  text: 'xlarge' },
  { name: 'oscuro · muy grande', theme: 'dark',  text: 'xlarge' },
] as const;

async function setMode(page: Page, m: typeof MODES[number]): Promise<void> {
  await page.evaluate(({ theme, text }) => {
    const r = document.documentElement;
    if (theme) r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme');
    if (text) r.setAttribute('data-text', text); else r.removeAttribute('data-text');
  }, { theme: m.theme, text: m.text });
  await page.waitForTimeout(120);
}

/**
 * axe-core, injected into the page rather than driven through
 * `@axe-core/playwright`.
 *
 * That wrapper opens a second page to reach cross-origin frames, and Electron's
 * protocol answers `Target.createTarget: Not supported` — so the recommended
 * integration cannot run against this application at all. Injecting the library
 * is the same engine and the same ruleset; what is lost is frame traversal,
 * which costs nothing here because this window has no frames and, being an
 * offline desktop application, never will.
 */
const axeSource = readFileSync(
  join(appRoot, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

interface AxeViolation {
  id: string; impact: string | null; help: string;
  nodes: { target: string[] }[];
}

async function scan(page: Page, where: string): Promise<void> {
  if (!(await page.evaluate(() => 'axe' in window))) {
    await page.evaluate((src) => {
      // eslint-disable-next-line no-eval
      (0, eval)(src);
    }, axeSource);
  }
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as {
      axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> };
    }).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    });
    return result.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
  });

  const described = violations.map((v) =>
    `${v.id} (${v.impact}) — ${v.help}\n      ${v.nodes.join('\n      ')}`);
  expect(described, `axe violations on ${where}:\n  ${described.join('\n  ')}`).toEqual([]);
}

test.describe('accessibility · WCAG 2.2 AA', () => {
  test('onboarding, in every mode', async () => {
    const { app, page } = await launch();
    for (const m of MODES) {
      await setMode(page, m);
      await scan(page, `onboarding · ${m.name}`);
    }
    await app.close();
  });

  test('every screen, in every mode', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    // Navigate by the rail, which is how she does it.
    const screens = ['Adaptar una ficha', 'Mis alumnos', 'Mis notas', 'Mi servicio de IA', 'Acerca de'];
    for (const label of screens) {
      await page.getByRole('button', { name: label }).click();
      await page.waitForTimeout(200);
      for (const m of MODES) {
        await setMode(page, m);
        await scan(page, `${label} · ${m.name}`);
      }
    }
    await app.close();
  });

  /**
   * FR-809, asserted so that a well-meaning future addition trips it. An
   * accessibility toggle at first run would mean the default is the
   * inaccessible one, in an application that adapts material for learners with
   * disabilities.
   */
  test('no accessibility question is asked at first run', async () => {
    const { app, page } = await launch();
    const body = (await page.textContent('body'))?.toLowerCase() ?? '';
    for (const phrase of ['modo accesibilidad', 'accesibilidad?', 'alto contraste?']) {
      expect(body, `first run asks about "${phrase}"`).not.toContain(phrase);
    }
    await app.close();
  });

  test('the preferences are reachable and change the whole interface', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await page.getByRole('button', { name: /Cómo se ve/i }).click();
    await page.getByRole('group', { name: 'Tamaño de la letra' })
      .getByRole('button', { name: 'Muy grande' }).click();
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => document.documentElement.getAttribute('data-text')))
      .toBe('xlarge');

    // And it survives a reload, because it is persisted outside the vault.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-text')))
      .toBe('xlarge');

    await app.close();
  });

  /**
   * T020. Heading order, landmarks and live regions.
   *
   * axe tags `heading-order` and `region` as best practice rather than WCAG, so
   * the filter above deliberately excludes them and they would go unchecked.
   * They are checked here instead, because a screen whose headings jump from h1
   * to h3 is a screen a screen-reader user cannot skim, whatever the tag says.
   */
  test('headings step by one and every screen has its landmarks', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    for (const label of ['Adaptar una ficha', 'Mis alumnos', 'Mis notas', 'Mi servicio de IA', 'Acerca de']) {
      await page.getByRole('button', { name: label }).click();
      await page.waitForTimeout(200);

      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
          .filter((h) => (h as HTMLElement).offsetParent !== null || h.tagName === 'H1');
        if (heads.length === 0) out.push('no headings at all');
        if (heads[0] && heads[0].tagName !== 'H1') out.push(`starts at ${heads[0].tagName}, not H1`);
        if (document.querySelectorAll('h1').length > 1) out.push('more than one H1');
        let prev = 0;
        for (const h of heads) {
          const level = Number(h.tagName[1]);
          if (prev && level > prev + 1) {
            out.push(`${h.tagName} "${(h.textContent ?? '').slice(0, 30)}" follows H${prev}`);
          }
          prev = level;
        }
        // The two landmarks that make the window navigable: the rail and the page.
        if (!document.querySelector('nav[aria-label]')) out.push('no labelled nav landmark');
        if (!document.querySelector('main')) out.push('no main landmark');
        if (document.querySelectorAll('main').length > 1) out.push('more than one main');
        return out;
      });
      expect(problems, `${label}: document structure`).toEqual([]);
    }
    await app.close();
  });

  /**
   * T021 · SC-803, quickstart §4. Every action reachable from the keyboard, the
   * ring visible at every stop, and focus never silently lost.
   *
   * The last of those is the one a manual pass misses: focus lands on `<body>`
   * after a re-render and Tab restarts from the top of the window, which for a
   * keyboard user in the middle of a form is the whole form again.
   */
  test('the keyboard reaches everything and never loses the ring', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    const focusable = await page.evaluate(() =>
      document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length);
    expect(focusable, 'nothing focusable on the screen').toBeGreaterThan(3);

    const seen: string[] = [];
    for (let i = 0; i < focusable + 2; i++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { lost: true, ring: false, id: 'body' };
        const s = getComputedStyle(el);
        // A stop with no visible ring is a stop the user cannot see they are on.
        const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
        return {
          lost: false, ring,
          id: `${el.tagName}"${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 20)}"`,
        };
      });
      expect(stop.lost, `Tab ${i + 1} landed on <body>: focus was lost`).toBe(false);
      expect(stop.ring, `${stop.id} has no visible focus ring`).toBe(true);
      seen.push(stop.id);
    }

    // It went somewhere rather than sticking on one control.
    expect(new Set(seen).size).toBeGreaterThan(3);

    // And a state change keeps focus inside the application. Opening the
    // preferences panel re-renders the rail; the button that opened it must
    // still be where the user left their hands.
    const prefs = page.getByRole('button', { name: /Cómo se ve/i });
    await prefs.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const stillThere = await page.evaluate(() =>
      (document.activeElement?.textContent ?? '').includes('Cómo se ve'));
    expect(stillThere, 'focus was lost when the preferences panel opened').toBe(true);

    await app.close();
  });
  /**
   * T026 · the ingest and verification screens.
   *
   * Not reachable from the rail — ingest is behind a button on the adapt screen
   * and verification is behind a completed extraction — so a suite that walks the
   * rail misses both. They are the two screens most likely to fail: one is a drop
   * target with a warning, the other is a page image beside a column of editable
   * textareas.
   */
  test('the ingest and verification screens, in every mode', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await page.getByRole('button', { name: 'Adaptar una ficha' }).click();
    await page.getByRole('button', { name: /Traer una foto/ }).click();
    await page.getByRole('heading', { name: /Adaptar una ficha/ }).waitFor();
    for (const m of MODES) { await setMode(page, m); await scan(page, `ingest · ${m.name}`); }

    /*
     * And the verification screen, reached the way she reaches it.
     *
     * The first version of this test seeded an extraction, reloaded, and closed
     * the window — it passed while never rendering the screen it was named
     * after. There was no way to reach it: the verification screen could only be
     * opened by the ingest that produced it, so an extraction she did not finish
     * confirming was lost along with what it cost. Writing this test is what
     * found that, and "Seguir con esto" is what fixed it.
     */
    await seedExtraction(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Adaptar una ficha' }).click();
    await page.getByRole('button', { name: /Traer una foto/ }).click();
    await page.getByRole('button', { name: 'Seguir con esto' }).click();
    await page.getByRole('heading', { name: /Comprueba que lo he leído bien/ })
      .waitFor({ timeout: 15000 });

    for (const m of MODES) { await setMode(page, m); await scan(page, `verificación · ${m.name}`); }

    // The order FR-608 requires, asserted where it is actually rendered: the
    // unreadable flag before the prose she would otherwise start reading.
    const html = await page.innerHTML('main');
    expect(html.indexOf('no se ha podido leer'))
      .toBeLessThan(html.indexOf('Lo que he leído'));

    await app.close();
  });
});
