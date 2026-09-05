import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The conversation, in the real window (026 T021/T027).
 *
 * ## What can be walked without money, and what cannot
 *
 * A turn needs a provider, so «hazlo más corto» end to end is quickstart §7 and belongs
 * to T031. What is walked here is everything the turn machinery guarantees **around** the
 * provider call — and that happens to be where every one of this feature's requirements
 * lives:
 *
 * - the revision list, restore, and the signature that does not move (US3);
 * - the second-turn refusal;
 * - a turn text carrying a name, stopped before anything is sent;
 * - and the vault untouched when the turn cannot run.
 *
 * The last one is the sharpest. «Complete or absent» (FR-2409) is a claim about what is
 * on disk after a failure, and a failure is exactly what a test with no provider can
 * produce on demand.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-conv-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-conv-v-')), 'Rampa');
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

const sheet = (n: number, signed = false): string => `---
${signed ? 'review:\n  signed_off: true\n  by: "la PT"\n  date: "2026-09-05"\n' : ''}extraction:
  verified: true
adapted_on: "2026-09-05"
school_year: "2026-2027"
kind: "worksheet"
---

::: {#b1 .instruction}
Resuelve estas multiplicaciones.
:::

::: {#e1 .exercise}
1. ${n} × 3 =
:::
`;

/** A learner with an adapted sheet that already has three revisions. */
async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);

  await page.evaluate(async (args) => {
    const [c, one, two, three] = args as [string, string, string, string];
    await window.rampa.vault.write('material/job-1/ir.md',
      '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n');
    await window.rampa.vault.write(`material/job-1/${c}/adapted.r1.md`, one);
    await window.rampa.vault.write(`material/job-1/${c}/adapted.r2.md`, two);
    await window.rampa.vault.write(`material/job-1/${c}/adapted.md`, three);
  }, [code, sheet(4, true), sheet(5), sheet(6)] as [string, string, string, string]);

  return code;
}

const list = (page: Page, code: string) => page.evaluate((c) =>
  window.rampa.conversation.list('job-1', c) as Promise<{
    turns: unknown[];
    revisions: Array<{ n: number; signed: boolean; current: boolean }>;
  }>, code);

const turn = (page: Page, code: string, text: string) => page.evaluate((args) => {
  const [c, t] = args as [string, string];
  return window.rampa.conversation.turn('job-1', c, t)
    .then(() => 'ok')
    .catch((e: Error) => String(e.message));
}, [code, text] as [string, string]);

test.describe('the revisions she already has', () => {
  test('are listed, with the signed one named and the working one marked', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    const { revisions } = await list(page, code);
    expect(revisions.map((r) => r.n)).toEqual([1, 2, 3]);
    expect(revisions.find((r) => r.current)!.n).toBe(3);
    // She signed the first and then changed it twice: both facts survive.
    expect(revisions.filter((r) => r.signed).map((r) => r.n)).toEqual([1]);
    await app.close();
  });

  test('restoring archives the current one, so the way back is never one-way', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    const { nowCurrent } = await page.evaluate((c) =>
      window.rampa.conversation.restore('job-1', c, 1) as Promise<{ nowCurrent: number }>, code);

    // Four revisions now, not two: «volver a la uno» did not cost her the three.
    const { revisions } = await list(page, code);
    expect(revisions.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    expect(nowCurrent).toBe(4);
    // And restoring the signed one restores a signed document — the signature travelled
    // with the content, because that is where it lives.
    expect(revisions.find((r) => r.current)!.signed).toBe(true);
    expect(revisions.find((r) => r.n === 1)!.signed).toBe(true);
    await app.close();
  });

  test('and a revision she tidied away by hand is answered, not crashed on', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const said = await page.evaluate((c) =>
      window.rampa.conversation.restore('job-1', c, 9)
        .then(() => 'ok').catch((e: Error) => String(e.message)), code);
    // The channel's own sentence names the number, which is what makes it actionable:
    // «la 9» tells her which one she tidied away.
    expect(said).toContain('Ya no encuentro la versión 9');
    expect(said).toContain('la que tenías abierta no la he tocado');
    await app.close();
  });

  test('the record names the signed revision even when a later one is working', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const entries = await page.evaluate((c) =>
      window.rampa.record.forLearner(c) as Promise<Array<{
        jobId: string; signedOff: boolean; signedRevision?: number; revision: number;
      }>>, code);
    const entry = entries.find((e) => e.jobId === 'job-1')!;
    expect(entry.signedOff).toBe(false);
    expect(entry.signedRevision).toBe(1);
    await app.close();
  });
});

test.describe('a turn that cannot run leaves the vault exactly as it was', () => {
  /** Every byte of the document family, so «untouched» is asserted and not assumed. */
  const snapshot = (page: Page, code: string) => page.evaluate(async (c) => {
    const files = ['adapted.md', 'adapted.r1.md', 'adapted.r2.md'];
    const out: Record<string, unknown> = {};
    for (const f of files) {
      out[f] = await window.rampa.vault.read(`material/job-1/${c}/${f}`);
    }
    return JSON.stringify(out);
  }, code);

  test('a name in her turn text stops it before anything is sent', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const before = await snapshot(page, code);

    const said = await turn(page, code, 'ponle a Lucía más espacio para contestar');

    // `006` FR-419: her turn text is a channel she writes into, like her notes.
    expect(said).toContain('posible nombre');
    expect(said).toContain('No he enviado nada');
    expect(await snapshot(page, code)).toBe(before);
    await app.close();
  });

  test('and with no provider connected, nothing is written either', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const before = await snapshot(page, code);

    const said = await turn(page, code, 'quita el último ejercicio');

    expect(said).not.toBe('ok');
    /*
     * FR-2409, asserted where it matters: the gates run on a candidate in memory, so a
     * turn that never got an answer leaves the working revision byte-identical. That is
     * a property of the order of operations, not of a cleanup path — and a cleanup path
     * is a thing that has to run.
     */
    expect(await snapshot(page, code)).toBe(before);
    const { revisions } = await list(page, code);
    expect(revisions.map((r) => r.n)).toEqual([1, 2, 3]);
    await app.close();
  });

  test('and an empty turn asks her what to change rather than spending', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    expect(await turn(page, code, '   ')).toContain('Dime qué quieres que cambie');
    await app.close();
  });
});
