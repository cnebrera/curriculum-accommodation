import { test, expect, _electron as electron } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseIR, renderHTML, presentationFor, SHEET_PRESENTATIONS } from '@rampa/core';

/**
 * La hoja que recibe el niño, contra WCAG 2.2 A y AA (037 US2, FR-3506…FR-3508).
 *
 * ## Por qué esto vive aquí y no en vitest
 *
 * `axe` necesita un DOM de verdad: evalúa estilos computados y el árbol de accesibilidad,
 * y sobre una cadena de texto no puede decir nada. `vitest` corre con `environment:
 * 'node'`.
 *
 * ## Y por qué desde una ventana oculta del proceso principal
 *
 * Tres restricciones tienen que cumplirse **a la vez**, y sólo esta forma las cumple:
 *
 * - **Un DOM con scripts**, que es lo que axe pide.
 * - **Sin instalar nada** (FR-3512). Playwright aquí no tiene navegador a propósito:
 *   conduce Electron. `npx playwright install chromium` son ~150 MB y red.
 * - **Sin tocar el `sandbox=""` del visor** (FR-3511). El visor de la aplicación no
 *   ejecuta scripts por diseño, y relajar una defensa estructural para hacer posible un
 *   test es exactamente lo que el Principio IX ordena al revés.
 *
 * Electron ya **es** un Chromium, y su proceso principal puede abrir una ventana oculta.
 * Medido antes de escribir la especificación: funciona, unos cuatro segundos, cero
 * dependencias nuevas. La tabla de las tres restricciones está en research R4.
 *
 * ## Lo que esta capa **no** cubre
 *
 * El defecto que `037` repara —una cabecera del original saliendo como párrafo— pasa este
 * nivel **limpio**: medido, cero violaciones sobre una hoja con cero cabeceras. Un
 * comprobador de conformidad no puede saber que el original tenía estructura que el render
 * tiró. Eso es `sheet-structure.test.ts`, y `037` T009 demuestra con una mutación que
 * ninguna de las dos capas sustituye a la otra.
 */
const appRoot = process.cwd();
const repoRoot = join(appRoot, '..');

const axeSource = readFileSync(
  join(appRoot, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

/** Una ficha real, fotografiada torcida, con cabecera y figura descrita en su IR. */
const fixture = () => parseIR(readFileSync(
  join(repoRoot, 'cases', '003-ingest-fixtures', '01-ecosistemas-torcida', 'ground-truth.md'),
  'utf8'));

/**
 * Las formas que toma una hoja **en papel**, derivadas y no escritas a mano (`038` T005).
 *
 * ## Lo que había aquí, y por qué era más débil de lo que parecía
 *
 * Había tres literales, con un comentario que argumentaba «tres y no treinta». El mayor
 * era `{ fontSize: '24pt', lineHeight: '2', measure: '44ch' }`, y esos tres valores son
 * alcanzables —24pt y 44ch de `PER-V:2`, la interlínea de `DEC:1`— así que leía como
 * correcto. Lo que recibe de verdad un alumno con esos dos ejes son **cuatro propiedades
 * más**: `ink: '#000'`, `paper: '#fff'`, y el espaciado de letra y de palabra que es el
 * sentido entero de `DEC`.
 *
 * O sea que este barrido corría sobre una hoja **menos adaptada que la de cualquier
 * alumno real** —a `#111` sobre blanco en vez del `#000` que produce ese eje— y nada lo
 * decía. El valor no estaba mal: estaba **rancio**, y era lo bastante plausible para que
 * nadie lo releyera.
 *
 * Ahora las presentaciones salen de `SHEET_PRESENTATIONS` y de `presentationFor`, que es
 * la única cosa que decide tipografía a partir de barreras. No hay ningún sitio donde
 * escribir un valor por segunda vez.
 *
 * Siguen siendo pocas por el motivo que el comentario anterior daba bien: sólo cuatro de
 * los diez ejes tocan la presentación. Lo que cambia es que ahora son **las que existen**
 * en vez de las que alguien escribió una vez.
 */
const PRESENTATIONS = [
  { name: 'firmada', opts: { signedOff: true } },
  ...SHEET_PRESENTATIONS.map((p) => ({
    name: p.id,
    opts: { presentation: presentationFor(p.levels) },
  })),
] as const;

test('la hoja no tiene ni una violación de WCAG 2.2 A/AA, en todas sus presentaciones', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rampa-sheet-'));
  const userData = await mkdtemp(join(tmpdir(), 'rampa-sheet-u-'));

  const files: Array<{ name: string; path: string }> = [];
  for (const p of PRESENTATIONS) {
    const path = join(dir, `${p.name.replace(/ /g, '-')}.html`);
    await writeFile(path, renderHTML(fixture(), p.opts), 'utf8');
    files.push({ name: p.name, path });
  }

  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, RAMPA_TEST: '1', ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  await app.firstWindow();

  for (const f of files) {
    const violations = await app.evaluate(async ({ BrowserWindow }, args) => {
      const [path, axe] = args as [string, string];
      /*
       * `show: false` y `sandbox: false`: una ventana que nadie ve, con scripts, **sólo
       * para esto**. No es el visor de la aplicación y no le toca nada — ése sigue con su
       * `sandbox=""` intacto, que es el requisito.
       */
      const w = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
      try {
        await w.loadFile(path);
        return await w.webContents.executeJavaScript(`(async () => {
          ${axe}
          const r = await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] },
            resultTypes: ['violations'],
          });
          return r.violations.map(v =>
            v.id + ' (' + v.impact + ') ×' + v.nodes.length + ' — ' + v.help);
        })()`) as string[];
      } finally { w.destroy(); }
    }, [f.path, axeSource]);

    expect(violations, `${f.name}:\n  ${violations.join('\n  ')}`).toEqual([]);
  }

  await app.close();
});

/**
 * Y una hoja con pictogramas sigue describiendo cada imagen (US2 escenario 2).
 *
 * Su propio caso porque la fixture de arriba no lleva ninguno, y una comprobación sobre un
 * documento sin imágenes no afirma nada sobre las imágenes. Los pictogramas son el camino
 * por el que una imagen llega a la hoja.
 */
test('una hoja con pictogramas describe cada imagen', async () => {
  const doc = parseIR(
    '---\nsource: "pegado"\n---\n\n'
    /*
     * `palabra=id`, que es el formato que `parsePicto` lee — mi primera fixture puso sólo
     * la palabra y no produjo ninguna imagen. El test estaba mal, no el renderizador.
     */
    + '::: {#a .instruction data-picto="agua=2248"}\nBebe agua\n:::\n');
  // Un PNG de 1×1 transparente: lo que importa es el `alt`, no el dibujo.
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0l'
    + 'EQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const html = renderHTML(doc, { pictogramImages: new Map([['2248', png]]) });

  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  expect(imgs.length, 'la fixture debe traer al menos un pictograma').toBeGreaterThan(0);
  for (const img of imgs) {
    expect(img, img).toMatch(/\balt="[^"]/);
    expect(img, 'una hoja enviada por correo tiene que seguir mostrando sus dibujos')
      .toMatch(/src="data:/);
  }
});
