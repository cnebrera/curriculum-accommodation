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

/**
 * What the command must produce, derived and never listed.
 *
 * La ficha recorre las seis presentaciones en los dos estados; las otras tres clases de
 * material van en la presentación base y en borrador, porque lo que añaden es *que su
 * camino del renderizador se dibuja* y no una tipografía distinta. Quince.
 */
const BASE = SHEET_PRESENTATIONS[0]!.id;
const expectedSheets = [
  ...SHEET_PRESENTATIONS.flatMap((p) =>
    ['borrador', 'firmada'].map((state) => `hoja--ficha--${p.id}--${state}`)),
  ...['examen', 'pictogramas', 'agenda'].map((k) => `hoja--${k}--${BASE}--borrador`),
];
const expected = expectedSheets.flatMap((stem) => ['pdf', 'png'].map((e) => `${stem}.${e}`));

interface Manifest {
  out: string;
  vault: string;
  sheets: { stem: string; kind: string; presentation: string; state: string;
    code: string; html: string }[];
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
    expect(manifest.sheets.map((s) => s.stem).sort(),
      'el conjunto capturado no es el que la enumeración pide')
      .toEqual([...expectedSheets].sort());

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
    expect(stdout).toContain(`Hojas: ${expectedSheets.length} · ${out}`);
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
   * FR-3603 / SC-3603: **una regla nueva en `presentationFor` produce una imagen o un
   * fallo, nunca un hueco silencioso.**
   *
   * Es la aserción anti-deriva del registro, y la que cierra lo que research R2 midió: la
   * lista de presentaciones ya se había escrito a mano una vez, en `sheet-a11y.spec.ts`, y
   * ya se había quedado obsoleta sin que nadie lo notara. Aquí no hay lista: el número de
   * presentaciones capturadas de la ficha **es** el número de miembros de la enumeración.
   */
  test('captura tantas presentaciones como la enumeración declara', () => {
    const fichas = manifest.sheets.filter((x) => x.kind === 'ficha');
    expect(new Set(fichas.map((x) => x.presentation)).size,
      'una regla de presentationFor sin foto, o una foto sin regla')
      .toBe(SHEET_PRESENTATIONS.length);
    for (const p of SHEET_PRESENTATIONS) {
      expect(fichas.map((x) => x.presentation), `"${p.id}" no tiene foto`).toContain(p.id);
    }
  });

  /**
   * FR-3602: la hoja con pictogramas **sin ningún set instalado**, que es el estado
   * normal — Rampa no trae ninguno (`023` FR-2101).
   *
   * Lo que se comprueba es que sale el **hueco nombrado** y no un fallo ni una imagen
   * rota (`018` FR-1616): un `role="img"` con su `aria-label`, que es lo que un lector de
   * pantalla dice y lo que una maestra ve como «aquí falta el dibujo» en vez de como
   * «esto se ha roto».
   *
   * Y esta hoja es la que más ha dado de sí del registro entero: en su primera pasada
   * imprimió `leer=leer;lápiz` en negrita debajo del hueco, porque el separador de
   * `data-picto` es el espacio y no el punto y coma, y `parsePicto` convierte cualquier
   * error de sintaxis en una *palabra* en vez de en un error. La fixture está arreglada;
   * el hueco del contrato es G79.
   */
  test('dibuja el hueco con nombre cuando no hay ningún set de pictogramas', async () => {
    const picto = manifest.sheets.find((x) => x.kind === 'pictogramas');
    expect(picto, 'no se capturó la hoja de pictogramas').toBeTruthy();
    const html = await readFile(picto!.html, 'utf8');
    expect(html, 'no hay hueco nombrado').toContain('picto-missing');
    expect(html, 'el hueco no se anuncia como imagen que falta').toContain('(falta la imagen)');
    // Y ninguna imagen: no hay set, así que un <img> aquí sería una ruta inventada.
    expect(html, 'una imagen de pictograma sin set instalado').not.toMatch(/<img[^>]+picto/);
    /*
     * Y ningún resto de sintaxis impreso como palabra (G79). La palabra de un par no
     * puede contener `=` ni `;`: si los contiene, es el valor entero mal partido.
     */
    for (const w of html.matchAll(/<span class="picto-word">([^<]*)<\/span>/g)) {
      expect(w[1], `«${w[1]}» no es una palabra, es un data-picto mal partido`)
        .not.toMatch(/[=;]/);
    }
  });

  /**
   * FR-3610: el borrador lleva su banner y su marca de agua, y la firmada ninguna cosa.
   *
   * Principio VII por los dos lados. El registro obtiene la firmada por
   * `window.rampa.job.signOff` —la firma de la aplicación, nunca una opción suya— así que
   * lo que se fotografía es la diferencia real y no una maqueta de ella. Y es la primera
   * vez que existe un papel donde mirarla, que es lo que `010` SC-807 pedía.
   *
   * De paso es lo que hace segura la promesa de determinismo: una hoja firmada **no lleva
   * fecha en la página** (research R4), así que dos ejecuciones coinciden.
   */
  test('el borrador se anuncia y la firmada no lleva ninguna marca', async () => {
    const pairs = manifest.sheets.filter((x) => x.kind === 'ficha');
    const borradores = pairs.filter((x) => x.state === 'borrador');
    const firmadas = pairs.filter((x) => x.state === 'firmada');
    expect(borradores.length).toBe(SHEET_PRESENTATIONS.length);
    expect(firmadas.length).toBe(SHEET_PRESENTATIONS.length);

    for (const b of borradores) {
      const html = await readFile(b.html, 'utf8');
      expect(html, `${b.stem} no lleva banner`).toContain('class="draft-banner"');
      expect(html, `${b.stem} no lleva marca de agua por página`).toContain('main::before');
      expect(html, `${b.stem} no dice BORRADOR`).toContain('BORRADOR');
    }
    for (const f of firmadas) {
      const html = await readFile(f.html, 'utf8');
      expect(html, `${f.stem} lleva banner estando firmada`).not.toContain('class="draft-banner"');
      expect(html, `${f.stem} lleva marca de agua estando firmada`).not.toContain('main::before');
    }
  });

  /**
   * FR-3614: **dos pasadas sobre las mismas entradas coinciden.**
   *
   * Cuesta un minuto más de Electron y hay que pagarlo, porque esta es la aserción que
   * corrigió research R4 y arregló un defecto que llevaba dos intentos abierto.
   *
   * ## Lo que se midió, y en qué se equivocaba R4
   *
   * R4 decía que nada en el renderizador interpola un reloj, una ruta ni un valor
   * aleatorio. Sobre el renderizador es verdad. Sobre lo que sale al disco, no:
   *
   * - **Las imágenes coinciden byte a byte, 15 de 15.** Ahí sí.
   * - **Las páginas no, 15 de 15.** Mismo tamaño exacto y difieren en el byte 262:
   *   `/CreationDate` y `/ModDate`, que las pone el escritor de PDF de Chromium y que
   *   Rampa no controla. Así que la promesa se acota aquí: idénticas **salvo esos dos
   *   sellos**, y el contrato lo dice en vez de prometer una igualdad que no se cumple.
   *
   * ## Y el defecto que esta comparación destapó, que es la razón de escribirla
   *
   * La primera medición dio **4 imágenes de 15 distintas**, y no por un reloj: salían
   * **en blanco**, 19 KB en vez de 136 KB, con el banner, los bordes, las cajas y los
   * topos dibujados y ni una palabra. Es el defecto de la fuente otra vez, el que ya se
   * había «arreglado» esperando a `document.fonts.ready` — y esa espera no bastaba,
   * porque un conjunto de fuentes al que nadie ha pedido nada todavía ya está asentado y
   * la promesa resolvía antes de que empezara la carga.
   *
   * Un arreglo que parecía funcionar, midiéndolo fallaba 4 de cada 15, y **lo único que
   * podía verlo era comparar dos pasadas**. Por eso este test no es una formalidad sobre
   * el determinismo: es el que sujeta la imagen.
   */
  test('dos pasadas producen el mismo registro', async () => {
    test.setTimeout(300_000);
    const out2 = await mkdtemp(join(tmpdir(), 'rampa-rec2-'));
    await run('node', [join('scripts', 'screenshot.mjs'), out2], {
      cwd: process.cwd(),
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env, RAMPA_TEST: '1', RAMPA_HIDDEN: '1',
        ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', OPENAI_API_KEY: '',
      },
    });

    /** Los dos sellos que pone Chromium, fuera. Todo lo demás tiene que coincidir. */
    const withoutStamps = (b: Buffer): string =>
      b.toString('latin1').replace(/\/(?:Creation|Mod)Date \(D:[^)]*\)/g, '/Fecha ()');

    for (const stem of expectedSheets) {
      const [a, b] = await Promise.all([
        readFile(join(out, `${stem}.png`)), readFile(join(out2, `${stem}.png`))]);
      expect(b.equals(a), `${stem}.png cambia entre pasadas`).toBe(true);

      /*
       * Y un suelo de tamaño, que es un cable trampa calibrado sobre el fallo medido y
       * no un umbral de calidad. Las quince imágenes buenas van de 84.834 a 136.557
       * bytes; las cuatro en blanco iban de 15.858 a 19.718. 50.000 está 2,5 veces por
       * encima de la peor en blanco y 1,7 por debajo de la más pequeña de verdad.
       *
       * Hace falta *además* de la comparación porque una hoja en blanco de forma
       * consistente coincidiría consigo misma: dos pasadas iguales y las dos vacías.
       */
      expect(a.length, `${stem}.png son ${a.length} bytes — ¿está en blanco?`)
        .toBeGreaterThan(50_000);

      const [pa, pb] = await Promise.all([
        readFile(join(out, `${stem}.pdf`)), readFile(join(out2, `${stem}.pdf`))]);
      expect(pa.length, `${stem}.pdf cambia de tamaño entre pasadas`).toBe(pb.length);
      expect(withoutStamps(pb), `${stem}.pdf cambia en algo que no es su fecha`)
        .toBe(withoutStamps(pa));
    }
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
