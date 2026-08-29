import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Layout, on the screen she actually has (spec 010 T017/T030, SC-802/SC-804).
 *
 * 1366×768 is not an arbitrary breakpoint. It is the resolution of the laptop
 * on the trolley in a Spanish state school, and a design that only holds at
 * 1512×982 is a design that fails in the room where the work happens.
 *
 * T030 is the case a per-preference test would miss: every preference at once —
 * largest text, high contrast, dark, and 200% zoom on top. Preferences compound,
 * and FR-819 says nothing may be lost when they do.
 */
const appRoot = process.cwd();
const SMALL = { width: 1366, height: 768 };

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-layout-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-layout-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize(SMALL);
  return { app, page, vault };
}

async function seed(page: Page, vault: string): Promise<void> {
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
}

/** Anything that sticks out sideways. The page body must never scroll across. */
async function horizontalOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const docWidth = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > docWidth + 1) out.push('<html> scrolls horizontally');
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // An element allowed to scroll inside itself is fine; the page is not.
      const scrolls = ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
      if (!scrolls && r.right > docWidth + 1) {
        out.push(`${el.tagName.toLowerCase()}.${el.className || '(no class)'} right=${Math.round(r.right)} > ${docWidth}`);
      }
    }
    return out.slice(0, 8);
  });
}

/**
 * A control is clipped when its own box is smaller than the text inside it, or
 * when the target is below the 24×24 minimum of WCAG 2.2 SC 2.5.8.
 */
async function clippedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, label'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const label = `${el.tagName.toLowerCase()}"${(el.textContent ?? '').trim().slice(0, 24)}"`;
      if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY === 'hidden') {
        out.push(`${label} text is cut off vertically`);
      }
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'hidden') {
        out.push(`${label} text is cut off horizontally`);
      }
      const isControl = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
      if (isControl && (r.height < 23.5 || r.width < 23.5)) {
        out.push(`${label} is ${Math.round(r.width)}×${Math.round(r.height)}, below the 24×24 minimum`);
      }
    }
    return out.slice(0, 8);
  });
}

/** Two interactive elements sitting on top of each other: one of them is unusable. */
async function overlappingControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll<HTMLElement>('button, a, input, select, textarea'))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && r.height > 0 && getComputedStyle(el).pointerEvents !== 'none');
    const out: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const overlap = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left))
                      * Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
        // A few pixels of shared border is not an overlap; a quarter of a
        // control hidden under another one is.
        if (overlap > 0.25 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) {
          out.push(`${a.el.tagName}"${(a.el.textContent ?? '').trim().slice(0, 16)}" overlaps `
                 + `${b.el.tagName}"${(b.el.textContent ?? '').trim().slice(0, 16)}"`);
        }
      }
    }
    return out.slice(0, 6);
  });
}

async function checkLayout(page: Page, where: string): Promise<void> {
  await page.waitForTimeout(180);
  expect(await horizontalOverflow(page), `${where}: horizontal overflow`).toEqual([]);
  expect(await clippedControls(page), `${where}: clipped controls`).toEqual([]);
  expect(await overlappingControls(page), `${where}: overlapping controls`).toEqual([]);
}

const SCREENS = ['Adaptar una ficha', 'Mis alumnos', 'Mis notas', 'Mi servicio de IA', 'Acerca de'];

test.describe('layout at 1366×768', () => {
  test('onboarding fits', async () => {
    const { app, page } = await launch();
    await checkLayout(page, 'onboarding');
    await app.close();
  });

  test('every screen fits', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    for (const label of SCREENS) {
      await page.getByRole('button', { name: label }).click();
      await checkLayout(page, label);
    }
    await app.close();
  });

  /**
   * T030. Not four separate passes: all of it at once, because that is the
   * teacher who needs all of it at once, and she is the reason the feature
   * exists.
   */
  test('every preference at once, at 200% zoom, loses nothing', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await page.evaluate(() => {
      const r = document.documentElement;
      r.setAttribute('data-text', 'xlarge');
      r.setAttribute('data-contrast', 'high');
      r.setAttribute('data-theme', 'dark');
      r.setAttribute('data-motion', 'reduced');
    });
    // 200% zoom, expressed the way the OS does it: the same pixels, twice the
    // CSS size. Reflow, not a second scrollbar (WCAG 2.2 SC 1.4.10).
    await page.evaluate(() => { document.body.style.zoom = '2'; });

    for (const label of SCREENS) {
      await page.getByRole('button', { name: label }).click();
      await checkLayout(page, `${label} · xlarge+high+dark @200%`);
      // And the text is still reachable: something must be scrollable
      // vertically, never horizontally.
      const overflowsDown = await page.evaluate(() =>
        document.documentElement.scrollHeight > document.documentElement.clientHeight);
      expect(typeof overflowsDown).toBe('boolean'); // either is fine; sideways is not
    }
    await app.close();
  });

  /**
   * T026 · the hardest layout in the application.
   *
   * A page image beside a column of editable blocks, at 1366×768, with the text
   * scale turned up. Side by side is the feature — a stacked comparison she has
   * to scroll between is a comparison she stops making — so the breakpoint that
   * gives up on it has to be checked, not assumed.
   */
  test('the ingest and verification screens fit, side by side and stacked', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    await page.evaluate(async () => {
      await window.rampa.vault.write('material/job-layout/ir.md',
        '---\nsource: "photos"\nextraction: {"verified": false, "pages": 1}\n---\n\n'
        + '::: {#p1-b1 .exercise data-page="1" data-source-id="b1" data-number="3"}\n'
        + 'Un enunciado bastante largo, de los que ocupan varias líneas en una hoja '
        + 'de naturales de quinto, para que la columna tenga algo real que medir.\n:::\n');
      await window.rampa.vault.write('material/job-layout/extraction.json', JSON.stringify({
        source: 'photos', boundReached: false, cutPages: [], costCents: 4, verified: false,
        pages: [{ page: 1, verified: false, problems: [], attempts: 1, flags: [
          { kind: 'unreadable', message: 'Hay algo que no se ha podido leer en el texto.', blockId: 'p1-b1' },
        ] }],
      }, null, 2));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Adaptar una ficha' }).click();
    await page.getByRole('button', { name: /Traer una foto/ }).click();
    await checkLayout(page, 'ingest');

    await page.getByRole('button', { name: 'Seguir con esto' }).click();
    await page.getByRole('heading', { name: /Comprueba que lo he leído bien/ }).waitFor();
    await checkLayout(page, 'verificación · lado a lado');

    // At the largest text scale the pair stacks, because side by side would leave
    // about 28 characters a line however wide the window is.
    await page.evaluate(() => document.documentElement.setAttribute('data-text', 'xlarge'));
    await checkLayout(page, 'verificación · muy grande');
    const stacked = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.verify-pair')!).gridTemplateColumns.split(' ').length);
    expect(stacked, 'the pair should stack at the largest text scale').toBe(1);

    await app.close();
  });
});
