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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/**
 * The one invented child in the record, and the list of what must never reach a sheet.
 *
 * She is `age: 14` in `es:primaria-5` — four years of divergence, which is the case the
 * whole product exists for and therefore the fixture worth photographing. She has a
 * school too, because `015` FR-1305 added one and `checkOutput`'s own note says it: «a
 * school plus a course plus a set of barriers identifies a child far more sharply than a
 * code does».
 *
 * **One fixture for both halves of the record**, application screens and sheets, because
 * the second half's gate is `checkOutput` over the captured document — and a check whose
 * needles are a name and an age the learner does not have is a check that cannot fail.
 * Keeping the identity here makes the needle list and the fixture the same object.
 */
const NINA = {
  name: 'Lucía',
  age: 14,
  year: 'es:primaria-5',
  stage: 'Primaria',
  school: 'CEIP Ejemplo de Rampa',
};
/** What a finding looks like: every value of hers that a sheet must not carry. */
const facts = [String(NINA.age), NINA.year, NINA.stage, NINA.school];

// The laptop on the trolley, not the developer's monitor.
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '1-onboarding.png') });

await page.evaluate((r) => window.rampa.vault.use(r), vault);
// Never a real key. `providers:save` does not validate, so nothing leaves.
await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-solo-para-una-captura'));
const code = await page.evaluate(() => window.rampa.learners.newCode());
await page.evaluate(([c, n]) => window.rampa.learners.save({
  code: c, axes: { COG: 3, EJE: 2, ATE: 2 },
  works: ['Le funciona hacer el primer ejercicio conmigo, en voz alta'],
  avoid: ['Nada con cuenta atrás'], interests: ['dinosaurios'],
  response: { default: 'short' }, language: { instruction: 'es' },
  age: n.age, year: n.year, stage: n.stage, school: n.school,
}), [code, NINA]);
await page.evaluate(([c, n]) => window.rampa.names.set(c, n.name), [code, NINA]);
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);
/*
 * The application opens on the caseload (FR-1801), and the rail holds exactly two
 * top-level entries (`020` FR-1802): «Mis alumnos» and «Configuración». The five-entry
 * walk this script used to take photographed a rail that no longer exists — the other
 * three destinations moved inside the learner and inside Configuración, so the walk
 * follows them there.
 */
await page.screenshot({ path: join(out, '2-mis-alumnos.png') });

await page.getByRole('button', { name: 'Configuración' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: join(out, '3-configuracion.png') });
for (const [file, label] of [
  ['4-servicio', 'Mi servicio de IA'], ['5-acerca', 'Acerca de y licencias'],
]) {
  await page.getByRole('navigation', { name: 'Apartados de Configuración' })
    .getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `${file}.png`) });
}
await page.getByRole('button', { name: '← Mis alumnos' }).click();
await page.waitForTimeout(400);

/*
 * Inside a learner (`020`), which is now most of the application.
 *
 * One rail that becomes the learner's — captured because the reason the previous
 * design died was that nobody looked at it until it was built: a learner menu
 * beside the rail put 501px of chrome in front of a worksheet.
 */
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
 *
 * The sweep runs over the caseload: «Preparar material» stopped being a top-level
 * destination in `020` T028 — preparing happens inside the learner now, and the
 * learner's own sweep above already covers that shell.
 */
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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * La hoja (`038`).
 *
 * Hasta aquí el registro fotografiaba veinte pantallas de la aplicación y **ninguna
 * hoja**, así que la única regla de este repositorio que no es un test —«look at it»,
 * la que ADR 0009 y `013` FR-1114 dejaron en lugar de un pixel-diff— no cubría el único
 * artefacto que sale del edificio. Se descubrió imprimiendo el primer PDF de un modelo
 * real: llevaba tres defectos que ningún test podía ver.
 *
 * Se conduce la aplicación por IPC y no se llama al renderizador: `screenshot.mjs` es
 * ESM corrido por node y el `main` de `@rampa/core` es TypeScript, así que importarlo es
 * imposible — y conducir la aplicación hace verdadero por construcción que lo capturado
 * sea lo que `job:pdf` produce para una maestra (research R1).
 *
 * No compara nada, no falla por el contenido de una hoja y no se convierte en un
 * pixel-diff. Eso último está prohibido y es deliberado (FR-3604).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const presentations = await page.evaluate(() => window.rampa.diagnostics.sheetPresentations());
if (!presentations) throw new Error('Sin RAMPA_TEST no hay presentaciones que enumerar.');

/** La hoja escrita a mano y revisada que `035` ya trae. Nada generado (FR-3606). */
const sample = readFileSync(
  join(process.cwd(), 'corpus', 'sample', 'ensayo', 'material', 'ensayo-1', 'E00', 'adapted.md'),
  'utf8');

const sheets = [];

for (const p of presentations) {
  /*
   * Un alumno por presentación, con **los ejes** y nada más. La presentación sale de
   * `presentationFor` dentro de `jobs/print.ts`, que es el único sitio que decide
   * tipografía a partir de barreras — aquí no se escribe ni un valor.
   */
  const code = await page.evaluate(() => window.rampa.learners.newCode());
  /*
   * **La misma niña seis veces**, no seis alumnos: mismo nombre, misma edad, mismo curso
   * y mismo centro, y sólo cambian los ejes. Es lo que el registro quiere mostrar —una
   * hoja y sus presentaciones— y además es lo que hace que la puerta de `038` T012 pueda
   * fallar: `checkOutput` busca su nombre, su edad, su curso, su etapa y su centro en el
   * documento capturado, y un alumno sin nada de eso no da ningún hallazgo posible.
   */
  await page.evaluate(([c, levels, n]) => window.rampa.learners.save({
    code: c, axes: levels, works: [], avoid: [], interests: [],
    response: {}, language: { instruction: 'es' },
    age: n.age, year: n.year, stage: n.stage, school: n.school,
  }), [code, p.levels, NINA]);
  await page.evaluate(([c, n]) => window.rampa.names.set(c, n.name), [code, NINA]);

  const job = `hoja-${p.id}`;
  await page.evaluate(([j, c, body]) =>
    window.rampa.vault.write(`material/${j}/${c}/adapted.md`, body), [job, code, sample]);

  for (const state of ['borrador', 'firmada']) {
    if (state === 'firmada') {
      await page.evaluate(([j, c]) => window.rampa.job.signOff(j, c, 'PT'), [job, code]);
    }
    const pdf = await page.evaluate(([j, c]) =>
      window.rampa.job.pdf(j, c), [job, code]);
    const { htmlPath } = await page.evaluate(([j, c]) =>
      window.rampa.job.render(j, c), [job, code]);
    const stem = `hoja--ficha--${p.id}--${state}`;
    writeFileSync(join(out, `${stem}.pdf`), readFileSync(pdf));

    /*
     * Y la primera página como imagen, que no es redundante: los tres defectos que
     * motivaron esta feature —el número dos veces, el bloque de código y la fuente
     * equivocada— se veían **en la página uno**, así que una imagen los caza a todos
     * desde un listado de directorio. La página es lo que zanja la paginación, que la
     * imagen no puede mostrar y que es lo que engañó a todo el mundo.
     *
     * Ventana propia, sin scripts y sin tocar el `sandbox` del visor (`037` FR-3511):
     * aquí no hace falta ejecutar nada dentro, así que puede ser más estricta que el
     * arnés de axe.
     */
    const png = await app.evaluate(async ({ BrowserWindow }, file) => {
      // 794×1123 es A4 a 96 ppp: la proporción del papel, no la de un monitor.
      const w = new BrowserWindow({ show: false, width: 794, height: 1123 });
      try {
        await w.loadFile(file);
        /*
         * Esperar a las fuentes, y no es una precaución: sin esto la imagen sale
         * **sin una letra**.
         *
         * La hoja incrusta Atkinson Hyperlegible como `data:` URI con
         * `font-display: block`, que es una decisión tomada y buena — «a brief blank
         * beats a flash of Verdana and then a reflow, on a face chosen for
         * legibility». El precio es que existe una ventana en la que la hoja está en
         * blanco, y `capturePage()` disparaba dentro de ella: se veían el banner, los
         * bordes y las cajas, y ni una palabra.
         *
         * Lo encontró el registro mirándose a sí mismo, que es exactamente para lo que
         * está.
         */
        await w.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
        return (await w.webContents.capturePage()).toPNG().toString('base64');
      } finally { w.destroy(); }
    }, htmlPath);
    writeFileSync(join(out, `${stem}.png`), Buffer.from(png, 'base64'));
    sheets.push({ stem, code, html: htmlPath });
  }
}

/*
 * Cuánto salió de la máquina, preguntado **antes de cerrar** porque el contador vive
 * dentro de la aplicación. Debe ser cero: el registro se toma sin clave y sin red
 * (FR-3612), y `providers:save` no valida, así que nada sale por guardar una falsa.
 */
const net = await page.evaluate(() => window.rampa.diagnostics.network());
await app.close();

console.log(`Capturas en ${out}`);
console.log(`Hojas: ${sheets.length} · ${out}`);
console.log(`Red: ${net ? net.count : '?'} peticiones`);

/*
 * Y una línea que sólo un test lee.
 *
 * Lo que `e2e/shots-record.spec.ts` necesita comprobar no está en el registro: el
 * documento que produjo cada captura es un temporal, y el contador de red vive dentro de
 * una aplicación que ya se cerró. Sacarlo por aquí evita las dos alternativas malas —
 * escribir un manifiesto dentro de `docs/screenshots/`, que ensucia el registro con rutas
 * temporales que cambian en cada ejecución, o que el test reimplemente el guion, que es
 * exactamente la deriva que esta feature existe para cerrar.
 *
 * Va bajo `RAMPA_TEST` y no en la salida normal porque no es para nadie: quien corre el
 * comando ya tiene las tres líneas de arriba (FR-3613).
 */
if (process.env['RAMPA_TEST'] === '1') {
  console.log(`REGISTRO_JSON ${JSON.stringify({ out, vault, sheets, net, nina: NINA, facts })}`);
}
