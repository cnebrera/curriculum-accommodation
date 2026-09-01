#!/usr/bin/env node
/**
 * Screenshot every screen of the real application (013 T001/T013, FR-1113).
 *
 * Not a test. A record, for a human to look at — see ADR 0009 on why there is no
 * pixel-diff suite. The one thing this project's UI work lacked was somebody
 * opening their eyes, and this is the command that makes that cheap.
 *
 *   node scripts/screenshot.mjs ../docs/screenshots/013-after
 */
import { _electron as electron } from 'playwright';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? '../docs/screenshots/latest');
mkdirSync(out, { recursive: true });

const vault = mkdtempSync(join(tmpdir(), 'rampa-shot-v-'));
const app = await electron.launch({
  args: [join(process.cwd(), 'out', 'main', 'main.js'),
         `--user-data-dir=${mkdtempSync(join(tmpdir(), 'rampa-shot-u-'))}`],
  /*
   * Inactive, and out of the dock — see the note in packages/shell/src/main.ts.
   * Taking the record must not take the keyboard off whoever is working.
   */
  env: { ...process.env, RAMPA_TEST: '1' },
});
const page = await app.firstWindow();
// The laptop on the trolley, not the developer's monitor.
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '1-onboarding.png') });

await page.evaluate((r) => window.rampa.vault.use(r), vault);
// Never a real key. `providers:save` does not validate, so nothing leaves.
await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-solo-para-una-captura'));
const code = await page.evaluate(() => window.rampa.learners.newCode());
await page.evaluate((c) => window.rampa.learners.save({
  code: c, axes: { COG: 3, EJE: 2, ATE: 2 },
  works: ['Le funciona hacer el primer ejercicio conmigo, en voz alta'],
  avoid: ['Nada con cuenta atrás'], interests: ['dinosaurios'],
  response: { default: 'short' }, language: { instruction: 'es' },
  age: 14, year: 'es:primaria-5', stage: 'Primaria',
}), code);
await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '2-adaptar.png') });

for (const [file, label] of [
  ['3-alumnos', 'Mis alumnos'], ['4-notas', 'Mis notas'],
  ['5-servicio', 'Mi servicio de IA'], ['7-acerca', 'Acerca de'],
]) {
  await page.getByRole('button', { name: label }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `${file}.png`) });
}

/*
 * Inside a learner (`020`), which is now most of the application.
 *
 * One rail that becomes the learner's — captured because the reason the previous
 * design died was that nobody looked at it until it was built: a learner menu
 * beside the rail put 501px of chrome in front of a worksheet.
 */
await page.getByRole('button', { name: 'Mis alumnos' }).click();
await page.waitForTimeout(400);
await page.locator('.card-action').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: join(out, '6-alumno-quien-es.png'), fullPage: true });

for (const [file, label] of [
  ['6b-alumno-preparado', 'Lo que le he preparado'],
  ['6c-alumno-curricular', 'Su adaptación curricular'],
]) {
  await page.getByRole('navigation', { name: /^Apartados de/ })
    .getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `${file}.png`) });
}

/*
 * And the learner's rail at the widths where it turns into a strip. This is where
 * option A either holds or does not, and it cannot be asserted — only looked at
 * (`013` FR-1113/FR-1118, `020` SC-1805).
 */
for (const width of [560, 880, 892, 1024]) {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `alumno-w-${width}.png`) });
}
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(300);

/*
 * Back out to the caseload first: inside a learner the rail is **theirs**, so the
 * top-level controls are not on screen at all. That is option A working, and it is
 * also why this walk needs the step — the previous version of this script timed out
 * here looking for a control the rail no longer holds.
 */
await page.getByRole('button', { name: /^(← )?Mis alumnos$/ }).first().click();
await page.waitForTimeout(400);

/*
 * And the same screen at the widths the window can actually be (013 T027,
 * FR-1118).
 *
 * `minWidth` in main.ts is 560, so these are not hypothetical sizes — they are
 * the range a teacher can drag the frame across. The record needs more than one
 * of them because the narrow layout had a breakpoint, a review and a merge, and
 * the first time anybody rendered it was the day Carlos dragged the window and
 * found the navigation filling the screen.
 *
 * 880 and 892 straddle 52em — 884px, because `--text-base` is 17px, not 16 —
 * so they are the last strip and the first column, which is where a shell breaks
 * if it is going to.
 */
await page.getByRole('button', { name: 'Preparar material' }).click();
await page.waitForTimeout(400);
for (const width of [560, 700, 880, 892, 1024, 1280, 1920]) {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `w-${width}.png`) });
}
await page.setViewportSize({ width: 1366, height: 768 });

/*
 * And the two modes, because the panel work claims the mode mechanism finally
 * does something — dark is a designed palette, high contrast is the austere one
 * the default used to be. Both are claims about how it looks, so both belong in
 * the record rather than in a sentence.
 *
 * The dark shot is here because it had to be: `--ground` and `--rail-ground`
 * were added to `:root` and to no other theme, so the rail kept a pale green
 * under pale text and the navigation was unreadable. Nothing looked at it.
 */
for (const [attr, value, file] of [
  ['data-theme', 'dark', 'm-oscuro.png'],
  ['data-contrast', 'high', 'm-alto-contraste.png'],
]) {
  await page.evaluate(([a, v]) => document.documentElement.setAttribute(a, v), [attr, value]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, file) });
  await page.evaluate((a) => document.documentElement.removeAttribute(a), attr);
}

await app.close();
console.log(`Capturas en ${out}`);
