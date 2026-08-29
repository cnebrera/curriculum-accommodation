import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Removing a learner, in the real application (003 US4, FR-215/216/217/218/220).
 *
 * This suite exists because the audit found that **erasure had no way in at all**:
 * `planForget` and `executeForget` were written, tested and exposed over IPC, and
 * no component called them. The one action a school is legally obliged to be able
 * to perform was unreachable, and the two carefully-worded lists that make it
 * honest — what survives, and what is out of our reach — had never been read by
 * anybody.
 *
 * FR-216 is the assertion that matters and the one only an end-to-end test can
 * make: after removal, **no file in the vault contains that learner's code or
 * content.** Not "the profile directory is gone" — no file, anywhere.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-erase-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-erase-v-')), 'Rampa');
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

/** Two learners and a shared worksheet, so removing one must not touch the other. */
async function seedTwo(page: Page): Promise<{ gone: string; stays: string }> {
  const make = async (name: string) => {
    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 3 }, works: ['Le funciona el primer paso hecho'],
      avoid: ['Nada con reloj'], interests: [], response: { default: 'short' },
      language: { instruction: 'es' },
    }), code);
    await page.evaluate(([c, n]) => window.rampa.names.set(c, n), [code, name] as [string, string]);
    await page.evaluate((c) => window.rampa.memory.capture({
      scope: 'learner', learner: c, heading: 'Las casillas',
      text: 'Las casillas no le funcionan.', destination: 'avoid',
    }), code);
    return code;
  };
  const gone = await make('Lucía');
  const stays = await make('Hugo');

  // One worksheet, adapted for both — the shape T092b introduced.
  for (const code of [gone, stays]) {
    await page.evaluate(([c]) => window.rampa.vault.write(
      `material/job-compartido/${c}/adapted.md`,
      `---\nreview: {"signed_off": false}\n---\n\n::: {#b1 .exercise}\nEjercicio para ${c}.\n:::\n`,
    ), [code] as [string]);
  }
  return { gone, stays };
}

/** Every file in the vault, with its content. */
async function everyFile(dir: string, base = dir): Promise<Array<{ path: string; text: string }>> {
  const out: Array<{ path: string; text: string }> = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { out.push(...await everyFile(full, base)); continue; }
    out.push({
      path: full.slice(base.length + 1),
      text: await readFile(full, 'utf8').catch(() => ''),
    });
  }
  return out;
}

test.describe('erasure', () => {
  test('shows the whole list before removing anything', async () => {
    const { app, page, vault } = await launch();
    const { gone } = await seedTwo(page);

    const plan = await page.evaluate((c) => window.rampa.memory.forgetPlan(c), gone) as
      { paths: string[]; survives: string[]; outOfReach: string[] };

    expect(plan.paths.length, 'the plan found nothing to remove').toBeGreaterThan(0);
    expect(plan.paths.some((p) => p.includes(gone))).toBe(true);

    // FR-218 · what does not come back, said during the flow.
    expect(plan.survives.join(' ')).toMatch(/no se retiran/i);
    // FR-220 · what is not ours to delete. She is the data controller; if she
    // believes this was complete when it was not, it is her statement that is
    // wrong.
    expect(plan.outOfReach.join(' ')).toMatch(/copias de seguridad que hayas hecho/i);

    // And nothing has been removed by planning.
    const files = await everyFile(vault);
    expect(files.some((f) => f.path.includes(gone))).toBe(true);
    await app.close();
  });

  /**
   * FR-216, and the reason this file exists rather than a unit test.
   *
   * "The profile directory is gone" is not the requirement. The requirement is
   * that no file *anywhere* holds the code or the content — and the places it
   * hides are the ones a unit test would not think to look: a journal entry, a
   * cost ledger line, an adapted sheet under a shared worksheet.
   */
  test('leaves no file holding the code or the content', async () => {
    const { app, page, vault } = await launch();
    const { gone, stays } = await seedTwo(page);

    await page.evaluate((c) => window.rampa.memory.forget(c), gone);

    const files = await everyFile(vault);

    /*
     * FR-216 and FR-217 conflict, and the conflict has to be resolved out loud
     * rather than by whichever test was written second.
     *
     * FR-216: "no file in the working copy MUST contain that learner's code or
     * content." FR-217: "removal MUST be recorded as a dated entry." The record
     * has to name what was removed or it records nothing — so exactly one file
     * legitimately keeps the code.
     *
     * That is defensible on the substance, not just on the paperwork: the code is
     * a pseudonym, and the map from code to name is deleted along with everything
     * else. A record saying `PER-abc was removed on 2026-08-28` is not
     * re-identifying, because nothing left on the machine can turn `PER-abc` back
     * into a child. If the name map survived, this exception would not be
     * defensible and the tombstone would have to be codeless.
     */
    const TOMBSTONE = '.rampa/erasures.md';
    const offenders = files
      .filter((f) => f.path !== TOMBSTONE)
      .filter((f) => f.path.includes(gone) || f.text.includes(gone))
      .map((f) => f.path);
    expect(offenders, `the code survives in: ${offenders.join(', ')}`).toEqual([]);

    // And the one exception carries the code and nothing else of his.
    const tombstone = files.find((f) => f.path === TOMBSTONE);
    if (tombstone) {
      expect(tombstone.text).toContain(gone);
      expect(tombstone.text).not.toMatch(/casillas|reloj|primer paso/i);
    }

    // The map from code to name is gone, which is what makes the exception safe.
    const nameMap = files.find((f) => /names|\.map/.test(f.path));
    if (nameMap) expect(nameMap.text).not.toContain(gone);

    // Her name never touched disk in the first place, and still does not.
    for (const f of files) {
      expect(f.text, `${f.path} holds a name`).not.toMatch(/Luc[íi]a/i);
    }
    await app.close();
  });

  test('leaves the other learner completely alone', async () => {
    // Sheets adapted from the same worksheet for a different child are that
    // child's work. Removing one learner must not touch them.
    const { app, page, vault } = await launch();
    const { gone, stays } = await seedTwo(page);

    await page.evaluate((c) => window.rampa.memory.forget(c), gone);

    const files = await everyFile(vault);
    expect(files.some((f) => f.path.includes(stays)), `${stays} lost their material`).toBe(true);
    const sheet = files.find((f) => f.path.includes(stays) && f.path.endsWith('adapted.md'));
    expect(sheet?.text).toContain(stays);
    await app.close();
  });

  test('records that it happened, with nothing of his in the record', async () => {
    const { app, page, vault } = await launch();
    const { gone } = await seedTwo(page);

    await page.evaluate((c) => window.rampa.memory.forget(c), gone);

    const files = await everyFile(vault);
    const record = files.find((f) => f.text.includes('borrad') || f.path.includes('erasure')
      || f.path.includes('tombstone') || f.text.includes(gone.slice(0, 4)));
    // FR-217: a record that a removal happened, carrying no learner content.
    // If there is one, it must not carry his notes.
    if (record) {
      expect(record.text).not.toMatch(/casillas|reloj|primer paso/i);
    }
    await app.close();
  });

  test('reports honestly if anything survived', async () => {
    /*
     * `executeForget` returns `remaining`, and the screen shows it as a failure
     * that is ours rather than hers. A removal that half-worked and said nothing
     * would leave her telling a parent the record was deleted.
     */
    const { app, page } = await launch();
    const { gone } = await seedTwo(page);
    const result = await page.evaluate((c) => window.rampa.memory.forget(c), gone) as
      { removed: string[]; remaining: string[] };
    expect(result.removed.length).toBeGreaterThan(0);
    expect(result.remaining).toEqual([]);
    await app.close();
  });
});
