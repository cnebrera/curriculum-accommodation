import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { checkOutput, SHEET_PRESENTATIONS } from '@rampa/core';

/**
 * The promises the record makes that a machine can hold it to (`038` T011/T012).
 *
 * ## What this is not
 *
 * It is not a check that the sheets look right. Nothing here reads a pixel, compares a
 * baseline or hashes an image — that is forbidden by `013` FR-1114 and ADR 0009, and
 * FR-3604 says it again for this feature. Whether the sheets are any good is SC-3602 and
 * it is answered by a person opening them.
 *
 * What a machine *can* say is that the record exists, is complete, costs nothing and
 * carries no child's data. All four are things that could silently stop being true.
 *
 * ## Why it drives the command instead of rebuilding it
 *
 * The obvious spec renders the sheets itself and checks those. That spec would pass
 * forever while `screenshot.mjs` wrote nothing at all — it would be a second
 * implementation of the record, asserted against instead of the record. This whole
 * feature exists because a second copy of something drifted (research R2), so the
 * subject here is the actual command, spawned as a child process, and the assertions run
 * over what it left on disk and what it printed.
 *
 * The price is that it is slow: the command takes the twenty-odd application screens
 * before it takes a sheet. That is the right price.
 */
const run = promisify(execFile);

/** What the command must produce, derived from the enumeration and never listed. */
const expected = SHEET_PRESENTATIONS.flatMap((p) =>
  ['borrador', 'firmada'].flatMap((state) =>
    ['pdf', 'png'].map((ext) => `hoja--ficha--${p.id}--${state}.${ext}`)));

interface Manifest {
  out: string;
  vault: string;
  sheets: { stem: string; code: string; html: string }[];
  net: { count: number; urls: string[] } | null;
  nina: { name: string; age: number; year: string; stage: string; school: string };
  facts: string[];
}

/**
 * One run for the whole file. It is a minute of Electron, and every assertion below is
 * about the same run — so paying for it once is not just an optimisation, it is what
 * makes «the record is internally consistent» a thing this file can say.
 */
let out: string;
let stdout: string;
let manifest: Manifest;

test.beforeAll(async () => {
  test.setTimeout(300_000);
  /*
   * Its own directory, **never the committed one**. A suite that rewrote
   * `docs/screenshots/latest` would turn every test run into a dirty working tree, and
   * the record would start changing for reasons nobody chose.
   */
  out = await mkdtemp(join(tmpdir(), 'rampa-rec-'));
  const r = await run('node', [join('scripts', 'screenshot.mjs'), out], {
    cwd: process.cwd(),
    maxBuffer: 32 * 1024 * 1024,
    /*
     * No key in the environment, and the counter installed. `RAMPA_TEST` also switches on
     * the manifest line the script prints for this file — see the note there on why that
     * is a better channel than a file inside the record.
     */
    env: {
      ...process.env, RAMPA_TEST: '1', RAMPA_HIDDEN: '1',
      ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', OPENAI_API_KEY: '',
    },
  });
  stdout = r.stdout;
  const line = stdout.split('\n').find((l) => l.startsWith('REGISTRO_JSON '));
  expect(line, 'el guion no imprimió el manifiesto: ¿se perdió RAMPA_TEST?').toBeTruthy();
  manifest = JSON.parse(line!.slice('REGISTRO_JSON '.length)) as Manifest;
});

test.describe('el registro de hojas', () => {
  /**
   * FR-3604: it exits `0` whatever the sheets look like.
   *
   * `execFile` rejects on a non-zero exit, so reaching `beforeAll`'s end is already the
   * assertion — but it is worth stating, because «no falla por el contenido de una hoja»
   * is a promise of the contract and not an accident of the harness.
   */
  test('escribe el conjunto que la enumeración pide, y sale con 0', async () => {
    expect(manifest.sheets.map((s) => s.stem).length,
      'una presentación nueva sin captura, o una captura de más')
      .toBe(SHEET_PRESENTATIONS.length * 2);

    for (const name of expected) {
      const s = await stat(join(out, name)).catch(() => null);
      expect(s, `falta ${name}`).not.toBeNull();
      /*
       * Y con bytes dentro. Un fichero de cero bytes pasa cualquier comprobación de
       * existencia, y es justo lo que dejaría un `printToPDF` que falló en silencio.
       */
      expect(s!.size, `${name} está vacío`).toBeGreaterThan(1024);
    }
  });

  /**
   * Que cada fichero sea del tipo que dice ser.
   *
   * No es paranoia: el defecto de la imagen en blanco —la hoja capturada antes de que
   * cargara la fuente— produjo un PNG perfectamente válido de 1123 píxeles de nada. La
   * firma no habría cazado *ese*, y por eso está aquí acompañada de su límite escrito:
   * esta prueba dice «es un PNG», no «se ve algo».
   */
  test('escribe PDFs que son PDFs y PNGs que son PNGs', async () => {
    for (const name of expected) {
      const head = (await readFile(join(out, name))).subarray(0, 8);
      if (name.endsWith('.pdf')) expect(head.subarray(0, 5).toString('latin1'), name).toBe('%PDF-');
      else expect([...head], name).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    }
  });

  /** FR-3613: el comando dice cuántas y dónde, sin que haya que abrir el guion. */
  test('dice cuántas hojas escribió y dónde', () => {
    expect(stdout).toContain(`Hojas: ${SHEET_PRESENTATIONS.length * 2} · ${out}`);
    expect(stdout).toContain(`Capturas en ${out}`);
  });

  /**
   * FR-3612: nada sale de la máquina.
   *
   * Contado en las dos pilas, como cuenta el ensayo de `035`: las llamadas a proveedor
   * salen por el `fetch` de Node y no por la sesión de Chromium, así que un contador
   * sobre una sola estaría a cero mientras algo escapa por la otra.
   *
   * Importa aquí más que en cualquier otro sitio porque **el registro se comparte**: es
   * el artefacto que se comita y que alguien puede regenerar en una máquina cualquiera,
   * sin clave y sin haber leído nada.
   */
  test('no manda nada a ninguna parte', () => {
    expect(manifest.net, 'el contador sólo existe bajo RAMPA_TEST').not.toBeNull();
    expect(manifest.net!.urls, 'algo salió de la máquina tomando el registro').toEqual([]);
    expect(manifest.net!.count).toBe(0);
  });

  /**
   * SC-3606 / FR-3607: ningún dato de la niña en el documento capturado.
   *
   * **La puerta que importa, porque la salida de esta feature se comita.** Todo lo demás
   * que este proyecto genera se queda en el ordenador de una maestra; estas hojas van a
   * git y de ahí a cualquiera que clone el repositorio.
   *
   * Y no es un duplicado de la puerta de `jobs/print.ts:141`, aunque llame a la misma
   * función, porque **las agujas son otras**: allí salen del perfil, aquí de la fixture.
   * Si mañana alguien añade un campo al perfil y no lo añade a `learnerFacts`, la puerta
   * de arriba pasa y ésta no — que es exactamente el fallo que el comentario de
   * `checkOutput` avisa que va a pasar.
   *
   * ## La edad no está entre las agujas, y hay que decir por qué
   *
   * `checkOutput` documenta cuatro campos que no deben llegar a la hoja —«an age, a
   * course, a stage, a school»— y las dos tuberías le pasan tres: `school`, `year` y
   * `stage`. La edad no. Parece un olvido y **no lo es**: la aguja sería `"14"`, y una
   * cifra de dos dígitos es subcadena de media aritmética de primaria. Es el fallo del
   * código vacío otra vez, el que `print.ts` documenta: una guarda que salta con todo es
   * una guarda que se acaba apagando.
   *
   * Así que la edad se queda fuera aquí también, deliberadamente, y el hueco está
   * anotado en el BACKLOG en vez de cerrado con una aguja que daría falsos positivos.
   */
  test('no lleva ni el código, ni el nombre, ni el centro, ni el curso de nadie', async () => {
    const needles = [manifest.nina.school, manifest.nina.year, manifest.nina.stage];
    for (const sheet of manifest.sheets) {
      const html = await readFile(sheet.html, 'utf8');
      const r = checkOutput(html, [sheet.code], [manifest.nina.name], needles);
      expect(r.findings, `${sheet.stem}: ${r.findings.join(' · ')}`).toEqual([]);
      expect(r.ok, sheet.stem).toBe(true);
      /*
       * Y el canal de atributos, que `checkOutput` no mira: quita las etiquetas antes de
       * buscar porque «the id attribute legitimately carries block ids». Un código en un
       * `data-*` pasaría entero.
       *
       * **Sin la fuente incrustada y con frontera de palabra**, y las dos cosas se
       * midieron en este mismo fichero porque la primera versión de esta línea era un
       * `toContain` pelado y falló:
       *
       * - La hoja lleva dos `@font-face` en `data:` URI, 62.632 caracteres de base64. Un
       *   código es **una letra y dos cifras** (`vault/codes.ts:17`), y **566 de los
       *   2.600 códigos posibles —el 21,8%— aparecen como subcadena dentro de ese
       *   base64**. Una aserción de subcadena sobre la hoja entera falla una vez de cada
       *   cinco, por azar, sin que nada esté mal.
       * - Con la frontera de letra/cifra que usa `checkOutput`: **0 de 2.600**. El
       *   alfabeto base64 es casi todo alfanumérico, así que las fronteras casi no
       *   existen dentro del blob.
       *
       * O sea que la regla de `checkOutput` no es una precaución de estilo: es lo único
       * que hace que la comprobación del código funcione en una hoja que incrusta una
       * fuente. Aquí se repite sobre el marcado crudo, que es lo que ella no cubre.
       */
      const markup = html.replace(/<style[\s\S]*?<\/style>/g, ' ');
      expect(new RegExp(`(?<![\\p{L}\\p{N}])${sheet.code}(?![\\p{L}\\p{N}])`, 'u').test(markup),
        `${sheet.stem} lleva el código "${sheet.code}" en un atributo`).toBe(false);
    }
  });
});
