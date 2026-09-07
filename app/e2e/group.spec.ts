import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughPrepareToAdapt, SCREENS, toScreen, intoNamedLearner, toTab } from './nav.js';

/**
 * One worksheet, three learners (005 T018-T020).
 *
 * The flow is one test. The other three are the constitutional risks the plan
 * named rather than noted — and they are assertions about the **rendered
 * interface**, because both of them are about an affordance rather than an API.
 * `packages/shell/test/batch.test.ts` already covers the handlers.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-group-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-group-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 768 });
  return { app, page, vault };
}

/** Three learners with genuinely different profiles — identical ones would let a
 *  broken implementation pass by producing three copies of one sheet. */
async function seedThree(page: Page, vault: string): Promise<string[]> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const codes: string[] = [];
  const people = [
    { name: 'Lucía', axes: { COG: 3, ATE: 2 } },
    { name: 'Mateo', axes: { EJE: 3, DEC: 2 } },
    { name: 'Iván', axes: { PER: 2, MOT: 2 } },
  ];
  for (const p of people) {
    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate(([c, axes]) => window.rampa.learners.save({
      code: c as string, axes, works: [], avoid: [], interests: [],
      response: { default: 'short' }, language: { instruction: 'es' },
    }), [code, p.axes] as [string, Record<string, number>]);
    await page.evaluate(([c, n]) => window.rampa.names.set(c as string, n as string), [code, p.name]);
    codes.push(code);
  }
  // The key is deliberately not a key: `providers:save` does not validate, so
  // this gets past onboarding without a byte leaving the machine.
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return codes;
}

test.describe('one worksheet, several learners', () => {
  test('she can choose three, and the screen says so', async () => {
    const { app, page, vault } = await launch();
    await seedThree(page, vault);

    /*
      Through the learner since `020`: «Preparar» asks the branch and the material, and
      the child is settled by having been entered. He is the first and not the only one
      — «¿para quién más?» is step 4, and these checkboxes are still where the rest are
      added on the screen that runs it (FR-1411).
    */
    await throughPrepareToAdapt(page);
    const boxes = page.locator('.fieldset-bare input[type="checkbox"]');
    await expect(boxes).toHaveCount(3);

    // The first is pre-chosen, as it always was: the common case is one child.
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(1)).not.toBeChecked();

    await boxes.nth(1).check();
    await boxes.nth(2).check();
    for (let i = 0; i < 3; i++) await expect(boxes.nth(i)).toBeChecked();

    await app.close();
  });

  /**
   * FR-514 · one figure for the whole batch, before it runs.
   *
   * The gate for an unusual bill has been there since `006`, and by definition it only
   * speaks when the answer is «more than normal» — so the ordinary batch, which is most
   * of them, ran with no figure at all. `020` T024 is the other half: she is told what
   * three sheets will cost while three sheets are still a decision.
   *
   * Asserted as **three** rather than as a euro amount. The amount depends on the price
   * table and on her service, and pinning it would make this test a copy of `PRICES`;
   * what must not drift is that the figure covers the batch she is about to run. A sheet
   * count of one here would be the exact defect `005` FR-515 was written against,
   * arriving through the screen instead of through the gate.
   */
  test('the price she is told covers every sheet, not the first one', async () => {
    const { app, page, vault } = await launch();
    await seedThree(page, vault);
    await throughPrepareToAdapt(page);

    // No proper noun in it: «Los ríos de España» stopped the walk dead on the
    // name check, which is `007`'s notice doing its job to a test that had not
    // thought about it.
    await page.locator('#text').fill('Las plantas fabrican su alimento con la luz del sol.');
    const boxes = page.locator('.fieldset-bare input[type="checkbox"]');
    await boxes.nth(1).check();
    await boxes.nth(2).check();

    await page.getByRole('button', { name: 'Continuar' }).click();

    const said = page.getByRole('status').filter({ hasText: /hoja/ });
    await expect(said).toContainText('3 hojas');
    await expect(said).toContainText(/en total|tarifa/);

    await app.close();
  });

  /**
   * FR-1412 (`016`): a second learner must not feel like a correction to a flow
   * that started with one. Stated as: choosing more learners does not disturb
   * anything she has already entered.
   */
  test('adding a learner does not disturb what she already typed', async () => {
    const { app, page, vault } = await launch();
    await seedThree(page, vault);
    await throughPrepareToAdapt(page);

    const paste = page.locator('#text');
    await paste.fill('Un enunciado que ya había escrito antes de acordarme de Mateo.');
    await page.locator('.fieldset-bare input[type="checkbox"]').nth(1).check();

    await expect(paste).toHaveValue(/antes de acordarme de Mateo/);
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();

    await app.close();
  });

  /**
   * T018 · Principle VII, and the reason this feature was dangerous to write.
   *
   * A batch invites «firmar todo». It is one click and a claim she read three
   * worksheets. `batch.test.ts` asserts no handler takes a list of learners;
   * this asserts there is no *control* either, on any screen a batch reaches —
   * because the affordance is the risk, and it could be built entirely in the
   * renderer without any handler changing.
   */
  test('no control anywhere signs more than one document', async () => {
    const { app, page, vault } = await launch();
    await seedThree(page, vault);

    const forbidden = /firmar (todo|todas|las tres|los tres)|firmar en bloque|sign all/i;
    /*
     * `SCREENS` and `toScreen`, not a hand-rolled list: `025` moved «Acerca de» into
     * Configuración and this loop waited thirty seconds for a top-level button that no
     * longer exists. Fourth spec to hand-roll the walk and break, which is `nav.ts`'s
     * own opening note coming true.
     */
    const offending = async (where: string) => {
      const labels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .map((el) => (el.textContent ?? '').trim()));
      expect(labels.filter((l) => forbidden.test(l)),
        `${where} offers a way to sign several documents at once`).toEqual([]);
    };

    for (const screen of SCREENS) {
      await toScreen(page, screen);
      await offending(screen.label);
    }

    /*
     * And the five steps of the flow, which `SCREENS` does not reach (`020` T025).
     *
     * Worth saying plainly, because this sweep looked complete and was not: the top
     * level used to hold «Preparar material», so the loop above stopped at the door —
     * which asked three questions and offered no signing at all. The screens where a
     * batch of three actually exists were never in it. T028 removed the entry and made
     * the hole visible; the flow is where the affordance would be built, so the flow is
     * where it is checked.
     */
    await throughPrepareToAdapt(page, { at: offending, alsoNamed: ['Mateo', 'Iván'] });

    /*
     * And one step further, because mutation said the sweep stopped short.
     *
     * Planting a «Firmar todas» on the reading-check screen **survived** the walk above:
     * step 5 arrives at the paste box, and the screen that actually fires a batch of
     * three is one press later. That is the screen where such a control would be built,
     * so the sweep goes there — and the same plant now fails it.
     *
     * Where it still does not reach: the list of «Revisar y firmar» after a real run,
     * which needs a provider. `packages/shell/test/batch.test.ts` asserts no handler
     * takes a list of learners, and «the second sheet of a batch can be signed» below
     * walks that list from the vault. Said out loud rather than left to look covered.
     */
    await page.locator('#text').fill('Las plantas fabrican su alimento con la luz del sol.');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByText('Comprueba que lo he leído bien').first().waitFor({ timeout: 15000 });
    await offending('paso 5 · comprobar la lectura');

    await app.close();
  });


  /**
   * FLU-01 · the second sheet of a batch, signed.
   *
   * This is the defect the review ranked first among the flow findings, and the
   * reason no test had seen it: `group.spec.ts` checked that there is no «firmar
   * todo», and never pressed «Revisar y firmar» **twice**. One press was enough to
   * leave the adapt screen blank for the rest of the session, because `review` was a
   * `useState` nothing ever cleared — so Marco's and Iván's sheets became unreachable
   * the moment Lucía's was signed.
   *
   * Carlos's decision (P11) is what this walks: pending-to-sign is **derived from the
   * vault**, so every unsigned sheet is reachable from the learner it belongs to at
   * any time — not only from inside the run that produced it. That makes the batch
   * completable after an interruption, a restart, or a week.
   *
   * The batch is written to the vault rather than adapted for real: adapting needs a
   * provider, and what is under test is reaching and signing sheet two, which is
   * navigation and a file.
   */
  test('the second sheet of a batch can be signed, and the first stays signed', async () => {
    const { app, page, vault } = await launch();
    const codes = await seedThree(page, vault);

    const job = 'job-20260602T120000';
    await page.evaluate(async (args) => {
      const [id, ...who] = args as string[];
      await window.rampa.vault.write(`material/${id}/ir.md`,
        '---\nsource: "pegado"\nverified: true\n---\n\n::: {#b1 .explanation}\nDos por tres\n:::\n');
      for (const c of who) {
        await window.rampa.vault.write(`material/${id}/${c}/adapted.md`,
          '---\nadapted_on: "2026-06-02"\nschool_year: "2025-2026"\nkind: "worksheet"\n'
          + 'subject: "Matemáticas"\n---\n\n::: {#b1 .explanation}\nDos por tres\n:::\n');
      }
    }, [job, codes[0]!, codes[1]!]);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });

    /*
      One sheet at a time, and each one from the learner it belongs to. By name: the
      caseload is not in the order this spec seeded its learners, and the two children
      whose sheets exist are Lucía and Mateo.
    */
    for (const who of ['Lucía', 'Mateo']) {
      await intoNamedLearner(page, who);
      await toTab(page, 'made');
      await page.getByText('Un momento, que miro qué hay…').waitFor({ state: 'detached' });

      /*
       * The row says «Sin firmar» and offers to fix it — before P11 the row said «Sin
       * firmar» and offered nothing, which is the shape of a dead end.
       */
      await expect(page.getByText('Sin firmar').first()).toBeVisible();
      await page.getByRole('button', { name: 'Revisar y firmar' }).first().click();

      await page.getByRole('heading', { name: /^Revisar y firmar · / }).waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: 'Lo he mirado y lo doy por bueno' }).click();
      await expect(page.getByText('Firmado. La marca de borrador ya no aparece.'))
        .toBeVisible({ timeout: 20000 });

      /* And a way out, which this screen did not have at all (FLU-01). */
      await page.getByRole('button', { name: '← Volver a lo que le he preparado' }).click();
      await page.getByRole('heading', { name: /Lo que he preparado para/ }).waitFor();
      await page.getByText('Un momento, que miro qué hay…').waitFor({ state: 'detached' });
      await expect(page.getByText('Firmada').first()).toBeVisible();
    }

    /* Both, on disk, independently — the signature is a file and not a screen. */
    const signed = await page.evaluate(async (args) => {
      const [id, ...who] = args as string[];
      const out: boolean[] = [];
      for (const c of who) out.push(Boolean(await window.rampa.job.isSignedOff(id, c)));
      return out;
    }, [job, codes[0]!, codes[1]!]);
    expect(signed, 'signing one sheet of a batch must not leave the other unreachable')
      .toEqual([true, true]);

    await app.close();
  });

  /**
   * T019 · Principle V, and `015` FR-1310.
   *
   * This feature puts three children on one screen for the first time. A table
   * with their axis values as aligned columns is a league table of disability,
   * and it is one layout decision away — so it is asserted rather than
   * remembered.
   *
   * The check is structural: no `<table>` and no CSS grid whose rows are learners
   * may contain more than one axis strip.
   */
  test('several learners are never presented as a grid of their axes', async () => {
    const { app, page, vault } = await launch();
    await seedThree(page, vault);

    await page.getByRole('button', { name: 'Mis alumnos' }).click();
    await page.waitForTimeout(200);

    const offenders = await page.evaluate(() => {
      const out: string[] = [];
      // A table row per learner, with axes in it, is the shape to forbid.
      for (const t of Array.from(document.querySelectorAll('table'))) {
        if (t.querySelectorAll('.axis').length > 0) out.push('a table contains axis values');
      }
      // And any single row-like container holding two learners' strips.
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
        const strips = el.querySelectorAll(':scope > * > .axis-strip, :scope > .axis-strip');
        if (strips.length > 1 && getComputedStyle(el).flexDirection === 'row') {
          out.push('two learners\' axis strips sit side by side in one row');
        }
      }
      return out;
    });
    expect(offenders).toEqual([]);

    await app.close();
  });
});
