import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The first night, and the two invariants that make it safe (035 T001/T002/T017).
 *
 * ## The walk
 *
 * No provider, no key. Rampa offers «probar con un ejemplo» **beside** connecting — two
 * doors, neither pre-chosen — and from there she meets an invented learner, reads the
 * sheet Rampa read, finds the one authored flaw, types a note with a classmate's name and
 * watches the gate fire, sees the adaptation and its report, and is told what it would
 * have cost. Every screen carries the mark.
 *
 * ## And the two things that must be true afterwards
 *
 * **Her real vault does not change by a byte** (SC-3303). Hashed before, hashed after —
 * not «no rehearsal files appeared», but *nothing changed at all*. The rehearsal lives in
 * `userData/ensayo/`, which is why that can be true rather than carefully maintained.
 *
 * **Nothing is spent, and nothing is recorded** (SC-3302). The month badge does not move
 * and no ledger exists in the rehearsal root: an empty ledger and no ledger are different
 * facts, and the second is the one a rehearsal should produce.
 */
const appRoot = process.cwd();

async function launch(): Promise<{
  app: ElectronApplication; page: Page; vault: string; userData: string;
}> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-ens-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-ens-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  return { app, page, vault, userData };
}

/**
 * Every byte under a directory, as one hash.
 *
 * Paths and contents both: a file renamed with identical bytes is a change, and «her
 * folder is untouched» is a claim about the folder rather than about its contents.
 */
async function hashTree(root: string): Promise<string> {
  const h = createHash('sha256');
  const walk = async (dir: string, prefix: string): Promise<void> => {
    let entries: string[];
    try { entries = (await readdir(dir)).sort(); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e);
      const rel = `${prefix}${e}`;
      if ((await stat(p)).isDirectory()) { h.update(`D:${rel}\n`); await walk(p, `${rel}/`); }
      else { h.update(`F:${rel}\n`); h.update(await readFile(p)); }
    }
  };
  await walk(root, '');
  return h.digest('hex');
}

const exists = async (p: string): Promise<boolean> => {
  try { await stat(p); return true; } catch { return false; }
};

test.describe('the rehearsal, with nothing connected', () => {
  test('is offered beside connecting, and neither is pre-chosen', async () => {
    const { app, page } = await launch();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    /*
     * `016`'s no-default rule at the hardest step of the product. The teacher who arrived
     * with a key in her hand is never routed through fiction, and the one who arrived at
     * half past nine with no account has somewhere to go.
     */
    await expect(page.getByRole('button', { name: 'Probar con un ejemplo' })).toBeVisible();
    await expect(page.getByText(/¿Prefieres verlo antes de decidir\?/)).toBeVisible();
    // The connect step is exactly where it was: an offer beside it, never instead of it.
    await expect(page.getByRole('heading', { name: /conect/i }).first()).toBeVisible();

    await app.close();
  });

  test('the whole journey, marked at every moment, with nothing sent', async () => {
    const { app, page, userData } = await launch();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click();

    // The mark, before anything else: it is a standing fact about where she is.
    await expect(page.getByText(/Estás en un ensayo/)).toBeVisible();
    await expect(page.getByText(/el alumno no existe/)).toBeVisible();

    // The reading, with the invitation to look at it rather than the answer.
    await expect(page.getByRole('heading', { name: /Esto es lo que he leído/ })).toBeVisible();
    await expect(page.getByText(/algo que he leído mal/)).toBeVisible();
    // …and the flaw itself is there to be found: «x» where the photo has «×».
    expect(await page.locator('.material').first().innerText()).toContain('5 x 4');

    /*
     * The name gate, offline. The real detector, and the sentence that is only true here:
     * nothing was sent, and not because Rampa stopped — because there is nowhere to send.
     */
    await page.locator('#nota').fill('se distrae si se sienta al lado de Mateo');
    await page.getByRole('button', { name: 'Adaptarla para él' }).click();
    await expect(page.getByText(/Hay un posible nombre/)).toBeVisible();
    await expect(page.getByText(/no hay a dónde mandarlo/)).toBeVisible();

    await page.getByRole('button', { name: 'Seguir de todas formas' }).click();

    // The adaptation, its report, and the sheet saying what it is — in the document.
    await expect(page.getByRole('heading', { name: /Así se la he adaptado/ })).toBeVisible();
    // The whole page: the rehearsal renders inside `EnsayoFrame` rather than in the
    // shell's `.main`, so scoping to that class would be asserting on the wrong tree.
    const body = await page.locator('body').innerText();
    expect(body).toContain('Material de ejemplo');
    expect(body).toContain('No la imprimas para nadie');
    // The report is the honest half: what changed, what did not, what she must check.
    expect(body).toContain('Lo que NO he cambiado');
    expect(body).toContain('explicit-steps@1');

    /*
     * FR-3303: what it **would** have cost, before she has spent anything — and said as an
     * estimate, in the register `006` FR-403 established.
     */
    await expect(page.getByText(/Lo que habría costado/)).toBeVisible();
    await expect(page.getByText(/no te he cobrado nada/i)).toBeVisible();

    // Nothing in any ledger: not an empty one — none.
    expect(await exists(join(userData, 'ensayo', '.rampa', 'costs.json'))).toBe(false);
    const month = await page.evaluate(() =>
      window.rampa.cost.month() as Promise<{ cents: number; jobs: number }>);
    expect(month.jobs).toBe(0);

    await app.close();
  });

  test('and her real vault does not change by a byte (SC-3303)', async () => {
    const { app, page, vault, userData } = await launch();

    /*
     * Seeded first, so «unchanged» is a claim about a folder with something in it. An
     * empty directory that stays empty proves nothing.
     */
    await page.evaluate(async () => {
      const c: string = await window.rampa.learners.newCode();
      await window.rampa.learners.save({
        code: c, axes: { COG: 2 }, works: ['Empezar con él'], avoid: [], interests: [],
        response: { default: 'short' }, language: { instruction: 'es' },
      });
      await window.rampa.vault.write('material/job-1/ir.md',
        '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n');
    });

    const before = await hashTree(vault);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click();
    await expect(page.getByText(/Estás en un ensayo/)).toBeVisible();
    await page.locator('#nota').fill('una nota cualquiera');
    await page.getByRole('button', { name: 'Adaptarla para él' }).click();
    await expect(page.getByRole('heading', { name: /Así se la he adaptado/ })).toBeVisible();

    /*
     * Byte for byte. Not «no ensayo files appeared» — *nothing changed at all*, which is
     * what makes the separation inspectable rather than trusted. It holds because the
     * rehearsal is a different root, not because rehearsal code is careful.
     */
    expect(await hashTree(vault)).toBe(before);
    // And the rehearsal did happen: its root exists, with the sample in it.
    expect(await exists(join(userData, 'ensayo', 'material', 'ensayo-1', 'ir.md'))).toBe(true);

    await app.close();
  });

  test('leaving it takes the whole root with it (FR-3308)', async () => {
    const { app, page, userData } = await launch();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Probar con un ejemplo' }).click();
    await expect(page.getByText(/Estás en un ensayo/)).toBeVisible();
    expect(await exists(join(userData, 'ensayo'))).toBe(true);

    await page.getByRole('button', { name: 'Salir del ensayo' }).click();

    /*
     * The whole directory, not a «finished» flag. A rehearsal she ended should leave
     * nothing behind — and a tombstone would be one more thing that has to be right.
     */
    await expect(page.getByText(/Estás en un ensayo/)).toBeHidden();
    /*
     * Polled: the screen leaves as soon as the state clears, and removing the directory is
     * the main process finishing its own work a moment later. Asserting the filesystem the
     * instant the UI changes tests the order of two unrelated things.
     */
    await expect.poll(() => exists(join(userData, 'ensayo')), { timeout: 5000 }).toBe(false);

    await app.close();
  });
});
