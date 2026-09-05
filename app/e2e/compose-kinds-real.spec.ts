import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughDoorToCompose } from './nav.js';

/**
 * The two kinds that were a storefront (027 T017/T023, quickstart §5).
 *
 * ## What can be walked without money, and what cannot
 *
 * Composing anything needs a provider, so the full walk — six problems, ten questions,
 * a key with computed answers — is quickstart §7 and needs a real key. It is **not**
 * simulated here: a fake provider that returned canned blocks would assert that the
 * parser parses what the test wrote, which is a tautology, and it would say nothing
 * about the two things that actually go wrong.
 *
 * What **is** walked here is everything that happens before the first token is sent, and
 * it happens to be where this feature's sharpest requirement lives: **the exam gate**
 * (FR-2509). It fires before the provider is resolved, so a run that must not happen can
 * be proved not to happen — with no key, no network and no cost.
 *
 * Plus the quantity question, whose unit comes from the corpus per kind (FR-2505): the
 * one visible promise of «the kind governs what is produced» that a screen can carry.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-kinds-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-kinds-v-')), 'Rampa');
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

/** A learner enrolled in 5.º de Primaria, with no ACS. */
async function seed(page: Page, vault: string, overlay?: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, year: 'es:primaria-5', axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  if (overlay !== undefined) {
    await page.evaluate(
      (args) => window.rampa.vault.write(`profiles/${args[0]}/adaptations.md`, args[1]),
      [code, overlay] as [string, string]);
  }
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

/** What `job:compose` did, as its error kind — or `'ok'` if it got past everything. */
const compose = async (page: Page, request: Record<string, unknown>): Promise<string> =>
  page.evaluate(async (req) => {
    try {
      await window.rampa.job.compose(`job-${Date.now()}`, req);
      return 'ok';
    } catch (e) {
      return String((e as Error).message);
    }
  }, request);

test.describe('an exam of another course is the teaching team’s decision', () => {
  /**
   * FR-2509, walked end to end and **with nothing spent**.
   *
   * The gate is in front of `activeProvider()`, so this run reaches it, throws, and
   * never resolves a key — which is why the assertion below can be made at all with a
   * fake key in the settings.
   */
  test('composing one below his course stops, and says what unlocks it', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);

    const said = await compose(page, {
      learnerCode: code, kind: 'exam', perObjective: 10,
      objectives: ['restas con llevadas'], targetYear: 'es:primaria-3',
    });

    // The corpus sentence, not a code fallback: it carries the argument a PT must be
    // able to correct, and it names the way past it.
    expect(said).toContain('equipo docente');
    expect(said).toContain('Su adaptación curricular');
    await app.close();
  });

  test('a registered ACS lets it through, which is the point of registering one', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault,
      '## Adaptaciones\n\nDe: el DIAC de marzo · leído el 2026-03-03.\n\n'
      + 'Este documento es una **ACS**: los objetivos ya están modificados por el equipo '
      + 'docente.\n\n### Medidas\n\n- más tiempo\n');

    const said = await compose(page, {
      learnerCode: code, kind: 'exam', perObjective: 10,
      objectives: ['restas con llevadas'], targetYear: 'es:primaria-3',
    });

    /*
     * It gets past the gate and stops at whatever is next. Asserted as «a **different**
     * refusal» rather than as success: composing for real costs money, and what this test
     * is about is which door closed.
     *
     * What comes next is deliberately not pinned. The seed stores a fake key, so the run
     * reaches the provider and fails there — and *which* provider failure depends on the
     * network at that moment («offline», a 401, a timeout). Pinning one of them made this
     * flaky: it passed alone and failed in the full suite, which is how a suite learns to
     * be ignored. The claim this test makes is about the gate, and the gate is asserted.
     */
    expect(said).not.toContain('equipo docente');
    expect(said).not.toContain('Su adaptación curricular');
    expect(said, 'it should not have composed for real').not.toBe('ok');
    await app.close();
  });

  test('and his own course was never gated at all', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    const said = await compose(page, {
      learnerCode: code, kind: 'exam', perObjective: 10,
      objectives: ['restas con llevadas'],
    });
    expect(said).not.toContain('equipo docente');
    await app.close();
  });

  /**
   * And the other three kinds are not gated, because going lower is what they are for.
   *
   * A worksheet at a lower course is support material — the ordinary, correct thing for
   * the learner this application exists for. A gate there would be this feature reaching
   * past its own argument.
   */
  test('support material below his course is not gated', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    for (const kind of ['worksheet', 'problems']) {
      const said = await compose(page, {
        learnerCode: code, kind, perObjective: 6,
        objectives: ['restas con llevadas'], targetYear: 'es:primaria-3',
      });
      expect(said, kind).not.toContain('equipo docente');
    }
    await app.close();
  });
});

test.describe('the quantity question counts the unit of the kind she chose', () => {
  /** FR-2505's visible half: «cuántas preguntas» and not «cuántos ejercicios». */
  test('the label changes with the kind, from the corpus', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    // The centralised walk, so a navigation change fixes every spec at once — which is
    // the whole reason `nav.ts` exists.
    await throughDoorToCompose(page);

    /*
     * The walk above already chose «una ficha», so that one is asserted without
     * clicking it again — clicking a chosen door unchooses it, and the first draft of
     * this test spent its thirty seconds waiting for a field it had just hidden.
     */
    await expect(page.getByLabel('Cuántos ejercicios de cada cosa')).toBeVisible();

    for (const [kind, label] of [
      ['Un examen o una prueba', 'Cuántas preguntas de cada cosa'],
      ['Una hoja de problemas', 'Cuántos problemas de cada cosa'],
    ] as const) {
      await page.locator('.door', { hasText: kind }).click();
      await expect(page.getByLabel(label), kind).toBeVisible();
    }

    // «Apuntes» counts nothing: a text has no unit, and the absence is a decision
    // (`021` FR-1927, `of: none` written explicitly in the corpus rather than the block
    // being missing — absence would mean nobody decided).
    await page.locator('.door', { hasText: 'Apuntes o un texto para estudiar' }).click();
    await expect(page.getByLabel('Cuántas preguntas de cada cosa')).toHaveCount(0);
    await expect(page.getByLabel('Cuántos ejercicios de cada cosa')).toHaveCount(0);
    await app.close();
  });
});

/**
 * What this file deliberately does not do, said out loud.
 *
 * No composition runs here. The walk that produces six problems and ten questions needs
 * a provider and a key (quickstart §7), and simulating one would assert that the parser
 * parses the fixture — which proves nothing about a model's output and nothing about the
 * two failure modes this feature is against. It stays a task for a person with a key,
 * and `027` T025 says so rather than leaving it to be assumed covered.
 */
