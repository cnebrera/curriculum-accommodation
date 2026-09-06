import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * «¿Me lo miras antes de firmarlo?» end to end (030 T022, US2, FR-2808…2811).
 *
 * ## The question this answers
 *
 * The persona review found it verbatim from a tutor: a draft exam for a learner she
 * shares with the PT, and she wants a second pair of eyes before she signs. Today the
 * answer is «por el pasillo, en papel», and what comes back is spoken — so it is remade
 * next term.
 *
 * ## Driven through the channels, not the dialogs
 *
 * The reply arrives through an OS file picker Playwright cannot open, so the loop is
 * driven at the channel the picker feeds. What that leaves untested is «it showed me the
 * file»; what it covers is everything that would fail silently — the fingerprint verdict,
 * what accepting writes, and what the signature says afterwards.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-2look-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-2look-v-')), 'Rampa');
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

const JOB = 'job-20260910T090000';

async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(async ({ c, job }) => {
    await window.rampa.vault.write(`material/${job}/ir.md`,
      '---\nsource: "pegado"\n---\n\n::: {#b1 .exercise}\n1. 47 × 8 =\n:::\n');
    // Unsigned on purpose: a second look is asked for **before** signing.
    await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
      '---\nadapted_on: "2026-09-10"\nschool_year: "2026-2027"\nkind: "exam"\n'
      + 'revision: 3\n---\n\n::: {#b1 .exercise}\n1. 47 × 8 =\n:::\n');
    await window.rampa.vault.write(`material/${job}/${c}/report.md`,
      '# Informe\n\nReceta: `frase-corta@1`\n');
  }, { c: code, job: JOB });
  return code;
}

test.describe('a draft goes out, corrections come back', () => {
  let app: ElectronApplication;
  let page: Page;
  let code: string;
  let print: string;

  test.beforeAll(async () => {
    let vault: string;
    ({ app, page, vault } = await launch());
    code = await seed(page, vault);
  });

  test.afterAll(async () => { await app.close(); });

  test('the draft travels with its mark, because the mark is in the document', async () => {
    const out = await page.evaluate(({ c, job }) =>
      window.rampa.coordination.reviewRequest(job, c, 'tutora') as
        Promise<{ path: string; revision: number; fingerprint: string }>,
      { c: code, job: JOB });

    expect(out.revision).toBe(3);
    print = out.fingerprint;

    const packet = await page.evaluate((p) =>
      window.rampa.vault.read(p) as Promise<{ content: string }>, out.path);
    // `007` FR-509: the mark is derived from the document and never passed in, so what
    // her colleague opens carries it for the same reason her own screen does.
    expect(packet.content).toContain('revisión 3');
    expect(packet.content).toContain('47 × 8');
    // And no name, like every packet.
    expect(packet.content).not.toContain('Lucía');
  });

  test('and a signed sheet is refused, because that is a different conversation', async () => {
    const other = 'job-firmado';
    await page.evaluate(async ({ c, job }) => {
      await window.rampa.vault.write(`material/${job}/ir.md`, '---\n---\n\ntexto\n');
      await window.rampa.vault.write(`material/${job}/${c}/adapted.md`,
        '---\nreview:\n  signed_off: true\n  by: "PT"\n  date: "2026-09-01"\n---\n\ntexto\n');
    }, { c: code, job: other });

    const said = await page.evaluate(async ({ c, job }) => {
      try { await window.rampa.coordination.reviewRequest(job, c, 'tutora'); return 'ok'; }
      catch (e) { return (e as Error).message; }
    }, { c: code, job: other });

    expect(said).not.toBe('ok');
    expect(said).toContain('ya está firmada');
  });

  test('the colleague replies with corrections, and no copy of the sheet comes back', async () => {
    /*
     * A returned copy would be a second document with the same name and a different
     * history, and whichever of the two she opened next would be the one she believed.
     */
    const out = await page.evaluate(({ job, fp }) =>
      window.rampa.coordination.reviewReply(job, 3, fp, 'PT', [
        'Los enunciados, de una sola instrucción.',
        'Más espacio para contestar.',
      ]) as Promise<{ path: string }>, { job: JOB, fp: print });

    const packet = await page.evaluate((p) =>
      window.rampa.vault.read(p) as Promise<{ content: string; data: Record<string, unknown> }>,
      out.path);
    expect(packet.content).toContain('Los enunciados, de una sola instrucción.');
    expect(packet.content).not.toContain('47 × 8');
  });

  test('opening the reply says the corrections still match the sheet', async () => {
    /*
     * The «same» half of FR-2811, and it needs asserting as much as the mismatch: a
     * verdict that only ever fires is a verdict she learns to ignore.
     *
     * The reply is read back out of her own `handover/` and handed to `reviewOpen` the
     * way the picker would — the picker itself cannot be driven from here.
     */
    const said = await page.evaluate(async (c) => {
      const files = await window.rampa.vault.list('handover') as string[];
      const f = files.find((x) => x.startsWith('respuesta-'))!;
      const doc = await window.rampa.vault.read(`handover/${f}`) as {
        data: Record<string, unknown>; content: string;
      };
      const front = Object.entries(doc.data)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
      const raw = `---\n${front}\n---\n\n${doc.content}\n`;
      return window.rampa.coordination.reviewOpen(raw, c) as Promise<{
        refusal: string | null;
        review: { revision: number; corrections: string[]; role: string } | null;
        moved: string | null;
      }>;
    }, code);

    expect(said.refusal).toBeNull();
    expect(said.review?.revision).toBe(3);
    expect(said.review?.role).toBe('PT');
    expect(said.review?.corrections).toContain('Más espacio para contestar.');
    // The sheet has not moved, so nothing is said about versions.
    expect(said.moved).toBeNull();
  });

  test('accepting it writes what was said beside the sheet, so it is not remade', async () => {
    const review = {
      job: JOB, revision: 3, corrections: ['Los enunciados, de una sola instrucción.'],
      role: 'PT', date: '2026-09-11', fingerprint: print,
    };
    await page.evaluate(({ c, r }) =>
      window.rampa.coordination.reviewAccept(c, 'respuesta.md', r), { c: code, r: review });

    const stored = await page.evaluate(({ c, job }) =>
      window.rampa.coordination.secondLook(job, c) as Promise<{
        by: string; revision: number; corrections: string[];
      } | null>, { c: code, job: JOB });

    expect(stored?.by).toBe('PT');
    expect(stored?.revision).toBe(3);
    expect(stored?.corrections).toContain('Los enunciados, de una sola instrucción.');
  });

  test('and signing records it beside the signature — two facts, one signer', async () => {
    await page.evaluate(({ c, job }) =>
      window.rampa.job.signOff(job, c, 'la tutora'), { c: code, job: JOB });

    const doc = await page.evaluate(({ c, job }) =>
      window.rampa.vault.read(`material/${job}/${c}/adapted.md`) as
        Promise<{ data: { review?: Record<string, unknown> } }>, { c: code, job: JOB });

    const review = doc.data.review!;
    expect(review['by']).toBe('la tutora');
    const look = review['second_look'] as Record<string, unknown>;
    expect(look['by']).toBe('PT');
    expect(look['revision']).toBe(3);
  });

  test('and a sheet signed with nobody else looking simply has no such key', async () => {
    /*
     * The control case, and it is the requirement rather than a nicety (FR-2810): a gate
     * would turn «¿me lo miras?» into an obligation, and the teacher who has nobody to
     * ask would be the one it stopped.
     */
    const solo = 'job-sin-mirada';
    await page.evaluate(async ({ c, job }) => {
      await window.rampa.vault.write(`material/${job}/ir.md`, '---\n---\n\ntexto\n');
      await window.rampa.vault.write(`material/${job}/${c}/adapted.md`, '---\n---\n\ntexto\n');
      await window.rampa.job.signOff(job, c, 'la tutora');
    }, { c: code, job: solo });

    const doc = await page.evaluate(({ c, job }) =>
      window.rampa.vault.read(`material/${job}/${c}/adapted.md`) as
        Promise<{ data: { review?: Record<string, unknown> } }>, { c: code, job: solo });

    expect(doc.data.review!['signed_off']).toBe(true);
    expect(doc.data.review!['second_look']).toBeUndefined();
  });

  test('a review about a revision she has replaced is declared, not applied', async () => {
    /*
     * FR-2811. She re-ran the adaptation while her colleague was reading it, so the
     * corrections are about a sheet that no longer exists.
     */
    await page.evaluate(({ c, job }) => window.rampa.vault.write(
      `material/${job}/${c}/adapted.md`,
      '---\nrevision: 4\n---\n\n::: {#b1 .exercise}\n1. 48 × 8 =\n:::\n'),
      { c: code, job: JOB });

    const packetRaw = await page.evaluate(async () => {
      const files = await window.rampa.vault.list('handover') as string[];
      return files.find((f) => f.startsWith('respuesta-'))!;
    });

    const said = await page.evaluate(async ({ c, f }) => {
      const doc = await window.rampa.vault.read(`handover/${f}`) as {
        data: Record<string, unknown>; content: string;
      };
      // Rebuild the file the way the picker would hand it over.
      const front = Object.entries(doc.data)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
      const raw = `---\n${front}\n---\n\n${doc.content}\n`;
      return window.rampa.coordination.reviewOpen(raw, c) as Promise<{ moved: string | null }>;
    }, { c: code, f: packetRaw });

    expect(said.moved).toContain('revisión 3');
    expect(said.moved).toContain('la 4');
    expect(said.moved).toContain('no las voy a aplicar');
  });
});
