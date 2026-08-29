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

await page.getByRole('button', { name: 'Mis alumnos' }).click();
await page.waitForTimeout(400);
await page.locator('.card-action').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: join(out, '6-perfil.png'), fullPage: true });

await app.close();
console.log(`Capturas en ${out}`);
