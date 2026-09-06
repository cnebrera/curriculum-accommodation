import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intoLearner, toTab } from './nav.js';

/**
 * Two vaults, one child, no hallway (030 T014, US1, SC-2801/2802).
 *
 * ## Why two vaults and not two fixtures
 *
 * The whole feature is about a file crossing between installations that never meet. A
 * test with one vault would exercise the builder and the parser and prove nothing about
 * the part that fails in practice: that the receiving machine, which has never seen this
 * child, can read a file whose codes mean nothing to it.
 *
 * ## What the native dialog costs us
 *
 * `coordination:open` opens an OS file picker, which Playwright cannot drive. So the
 * receiving half is driven through the channel the picker feeds — the parse, the scan,
 * the link and the accept — and the picker itself is covered by its unit test. That is
 * the right half to spend an e2e on: «me ha enseñado el fichero» fails visibly, and
 * «ha escrito en mi carpeta sin preguntar» does not.
 */
const appRoot = process.cwd();

async function launch(prefix: string): Promise<{
  app: ElectronApplication; page: Page; vault: string;
}> {
  const userData = await mkdtemp(join(tmpdir(), `rampa-${prefix}-`));
  const vault = join(await mkdtemp(join(tmpdir(), `rampa-${prefix}-v-`)), 'Rampa');
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

/** A learner with a fortnight behind her: a note, a signed sheet, an axis. */
async function seedSender(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: ['Empezar con el ejemplo resuelto'], avoid: [],
    interests: [], response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  // A real name, because the packet's whole promise is about these bytes.
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));

  const on = new Date().toISOString().slice(0, 10);
  await page.evaluate(async ({ c, day }) => {
    await window.rampa.vault.write(`profiles/${c}/notes.md`,
      `---\nlearner: ${c}\n---\n\n## ${day} · arranque\nLucía no arranca sola. Con Marco al lado sí.\n`);
    const job = 'job-20260303T100000';
    await window.rampa.vault.write(`material/${job}/ir.md`,
      '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nEnunciado\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
      '---\nreview:\n  signed_off: true\n  by: "PT"\n  date: "' + day + '"\n'
      + 'adapted_on: "' + day + '"\nschool_year: "2026-2027"\nkind: "worksheet"\n'
      + 'subject: "Matemáticas"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n');
  }, { c: code, day: on });
  // Another child, so the name map has somebody the note mentions.
  const other: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((o) => window.rampa.names.set(o, 'Marco'), other);

  await page.evaluate((c) => window.rampa.record.forLearner(c), code);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

test.describe('a fortnight, from one vault to another', () => {
  let sender: { app: ElectronApplication; page: Page; vault: string };
  let receiver: { app: ElectronApplication; page: Page; vault: string };
  let code: string;
  let packet: string;

  test.beforeAll(async () => {
    sender = await launch('coord-a');
    code = await seedSender(sender.page, sender.vault);
  });

  test.afterAll(async () => {
    await sender.app.close();
    await receiver?.app.close();
  });

  test('she exports it from inside the learner, and reviews what would go', async () => {
    await intoLearner(sender.page);
    await toTab(sender.page, 'handover');
    await sender.page.getByLabel('Tu papel').fill('PT');
    // Wide enough to include the seeded fortnight.
    await sender.page.getByLabel('Desde').fill('2020-01-01');
    await sender.page.getByRole('button', { name: 'Ver qué se llevaría' }).click();
    await expect(sender.page.getByText(/nota · arranque/)).toBeVisible();
    await expect(sender.page.getByText(/material · job-/)).toBeVisible();
  });

  test('and the file it writes carries no name at all', async () => {
    await sender.page.getByRole('button', { name: 'Guardar el paquete' }).click();
    await expect(sender.page.getByText('Ahí está')).toBeVisible();

    const files: string[] = await sender.page.evaluate(() => window.rampa.vault.list('handover'));
    const file = files.find((f) => f.includes('-coord-'))!;
    expect(file).toBeDefined();
    packet = await readFile(join(sender.vault, 'handover', file), 'utf8');

    for (const name of ['Lucía', 'Lucia', 'Marco']) {
      expect(packet, `«${name}» reached the packet`).not.toContain(name);
    }
    // The subject travels as a code, and the other child became one too.
    expect(packet).toContain(code);
    expect(packet).toContain('dice ser **PT**');
  });

  test('and it says how to read it, which is the anti-anchoring the packet exists for', async () => {
    expect(packet).toContain('Esto viene de otra aula');
    expect(packet).toContain('me lo contaron');
  });

  test('the receiving vault, which has never seen this child, reads it', async () => {
    receiver = await launch('coord-b');
    await receiver.page.evaluate((root) => window.rampa.vault.use(root), receiver.vault);
    const mine: string = await receiver.page.evaluate(() => window.rampa.learners.newCode());
    await receiver.page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: {}, works: [], avoid: [], interests: [],
      response: {}, language: { instruction: 'es' },
    }), mine);

    const before: string[] = await receiver.page.evaluate(() =>
      window.rampa.vault.list('handover'));

    // Held, then linked — two explicit acts, and until the first accept nothing else
    // has happened.
    const holdPath = await receiver.page.evaluate((raw) =>
      window.rampa.coordination.hold(raw, 'de-la-tutora.md') as Promise<{ path: string }>,
      packet);
    expect(holdPath.path).toContain('handover/received/');

    await receiver.page.evaluate(({ p, c }) =>
      window.rampa.coordination.link(p, c), { p: holdPath.path, c: mine });

    const held = await receiver.page.evaluate((p) =>
      window.rampa.vault.read(p) as Promise<{ data: { linked?: string } }>, holdPath.path);
    expect(held.data.linked).toBe(mine);

    // And her own notes are still untouched: linking is not accepting.
    const notes = await receiver.page.evaluate((c) =>
      window.rampa.vault.read(`profiles/${c}/notes.md`) as Promise<{ exists: boolean } | null>,
      mine);
    expect(notes === null || notes.exists === false).toBe(true);
    expect(before).toEqual([]);
  });

  test('accepting one item writes one note, attributed and dated', async () => {
    const mine: string = (await receiver.page.evaluate(() =>
      window.rampa.learners.list() as Promise<string[]>))[0]!;

    const note = { of: 'note', date: '2026-10-03', heading: 'arranque',
      text: 'No arranca sola.' };
    await receiver.page.evaluate(({ c, item }) =>
      window.rampa.coordination.accept(c, 'tutora', 'de-la-tutora.md', item),
      { c: mine, item: note });

    const notes = await receiver.page.evaluate((c) =>
      window.rampa.vault.read(`profiles/${c}/notes.md`) as Promise<{ content: string }>, mine);
    expect(notes.content).toContain('No arranca sola.');
    // Packet, role and date on the accepted item (FR-2805).
    expect(notes.content).toContain('recibido por paquete (tutora');
    expect(notes.content).toContain('de-la-tutora.md');
    // And it says it came from another classroom, in the heading she will read later.
    expect(notes.content).toContain('de otra aula');
  });

  test('and a skipped item leaves no trace, because skipping is doing nothing', async () => {
    const mine: string = (await receiver.page.evaluate(() =>
      window.rampa.learners.list() as Promise<string[]>))[0]!;
    const notes = await receiver.page.evaluate((c) =>
      window.rampa.vault.read(`profiles/${c}/notes.md`) as Promise<{ content: string }>, mine);
    // The material line was never accepted, so nothing about it exists here.
    expect(notes.content).not.toContain('Matemáticas');
  });

  test('the profile only changes when she says so, separately', async () => {
    /*
     * Accepting a claim and changing her profile are two decisions, and the conflict
     * case exists precisely because they come apart: she may want the note and not the
     * axis. «Tu perfil dice X, el paquete dice Y» ends in a choice, never a merge.
     */
    const mine: string = (await receiver.page.evaluate(() =>
      window.rampa.learners.list() as Promise<string[]>))[0]!;

    const before = await receiver.page.evaluate((c) =>
      window.rampa.learners.load(c) as Promise<{ profile: { axes?: Record<string, number> } }>, mine);
    expect(before.profile.axes?.['COG']).toBeUndefined();

    await receiver.page.evaluate((c) =>
      window.rampa.coordination.applyDelta(c, 'COG', 2), mine);

    const after = await receiver.page.evaluate((c) =>
      window.rampa.learners.load(c) as Promise<{ profile: { axes?: Record<string, number> } }>, mine);
    expect(after.profile.axes?.['COG']).toBe(2);
  });

  test('and «bórralo todo» reaches the packet she was sent', async () => {
    /*
     * `030` T026. P38's finding was that `handover/` was invisible to erasure; this
     * feature adds a directory one level down, and the plan's walk was flat while the
     * verifier's recurses — a plan that refuses to collect what the verifier then
     * reports as residue.
     */
    const mine: string = (await receiver.page.evaluate(() =>
      window.rampa.learners.list() as Promise<string[]>))[0]!;
    const plan = await receiver.page.evaluate((c) =>
      window.rampa.memory.forgetPlan(c) as Promise<{ paths: string[] }>, mine);
    expect(plan.paths.some((p) => p.startsWith('handover/received/'))).toBe(true);
  });
});
