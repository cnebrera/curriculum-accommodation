import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toScreen, intoLearner, toTab, toCaseload } from './nav.js';

/**
 * Los pictogramas tienen su sitio, y ese sitio no es la hoja de un alumno (025).
 *
 * ## Lo que este fichero cierra
 *
 * `025` movió el juego de dibujos, su licencia, la descarga y el vocabulario de ella a
 * Configuración, porque **ninguna de las cuatro cosas es de un niño**. Cuatro requisitos
 * se quedaron sin afirmar en su día y son los cuatro que se rompen sin ruido al mover
 * algo: que todo lo que `023` y `024` construyeron se alcanza sin abrir un alumno
 * (SC-2302), que `axe` no encuentra nada nuevo a ningún ancho (SC-2306), que sacar el
 * juego **no** lo convirtió en un interruptor global (FR-2313), y que abrir Configuración
 * no pide nada a la red (FR-2315).
 *
 * ## `RAMPA_TEST` aquí y no en la línea de órdenes
 *
 * El contador de red de `035` sólo se instala bajo esa variable, y el requisito de esta
 * pantalla es **silencio**: abrirla cien veces no llega a nadie. Un test que lo afirmara
 * sin el contador estaría afirmando que no ve peticiones, que no es lo mismo.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-pict-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-pict-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, RAMPA_TEST: '1', ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  return { app, page, vault };
}

async function seed(page: Page, vault: string): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 3, ATE: 3, LEC: 3 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' }, year: 'es:primaria-5',
  }), code);
  await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const PANE = { label: 'Pictogramas', under: 'Configuración' } as const;

test.describe('todo lo del juego de dibujos se alcanza sin abrir un alumno', () => {
  /**
   * SC-2302 · los controles de `023` y `024`, desde Configuración.
   *
   * Enumerados y no contados: lo que importa es **cuáles**, porque el que falte será el
   * que se quedó dentro de la hoja de un alumno. La licencia primero, porque es la puerta
   * — sin aceptarla no se trae nada (FR-2104).
   */
  test('la licencia, la descarga y su vocabulario están todos ahí', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toScreen(page, PANE);

    // La puerta de la licencia, con su texto y a dónde apunta.
    await expect(page.getByRole('button', { name: 'Acepto la licencia' })).toBeVisible();
    await expect(page.getByText(/CC BY-NC-SA/)).toBeVisible();

    // Usar un juego que ya tenga en el disco, sin descargar nada — el camino de `018`,
    // que no depende de la licencia porque no trae nada.
    await expect(page.getByRole('button', { name: 'Decirme dónde están' })).toBeVisible();

    /*
     * Y su vocabulario (`024` FR-2214), que es lo que sólo un informe podía alcanzar
     * antes de `025` T008: las palabras que ella eligió, revisables.
     *
     * Con el juego sin traer todavía dice que no ha elegido ninguno, y **eso es la
     * afirmación**: la sección está en pantalla y contesta, en vez de aparecer sólo
     * cuando hay algo que enseñar. Una sección que se esconde vacía es una sección que
     * ella no sabe que existe.
     */
    await expect(page.getByText(/Todavía no has elegido ningún dibujo/)).toBeVisible();

    // Nada de esto está dentro del alumno, que es la mitad negativa de SC-2302.
    await intoLearner(page);
    await toTab(page, 'who');
    await expect(page.getByRole('button', { name: 'Acepto la licencia' })).toHaveCount(0);
    await expect(page.getByText(/CC BY-NC-SA/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Traer los pictogramas/ })).toHaveCount(0);

    await app.close();
  });

  /**
   * FR-2313 · sacar el juego de la hoja del alumno **no** lo hizo un interruptor global.
   *
   * `018` FR-1605 es la regla más afilada del Principio V en este proyecto: ningún eje
   * enciende pictogramas, porque esta familia **añade** a la página y un niño con la hoja
   * cubierta de dibujos mientras treinta compañeros tienen una lisa está señalado por la
   * herramienta que existe para incluirlo. `packages/core/test/pictograms-not-automatic.test.ts`
   * lo afirma sobre el código; esto lo afirma sobre las pantallas, que es donde `025`
   * podía haberlo roto: el juego es de su instalación, y encenderlo sigue siendo de cada
   * niño, uno por uno.
   *
   * El alumno se siembra con COG, ATE y LEC en 3 a propósito — el perfil más cargado que
   * el modelo admite. Si algún eje fuese a encenderlo, este es el que lo haría.
   */
  test('el juego es de su Rampa; encenderlo sigue siendo de cada niño', async () => {
    const { app, page, vault } = await launch();
    const code = await seed(page, vault);
    await toScreen(page, PANE);

    // Ni un control en Configuración que encienda pictogramas para nadie.
    await expect(page.getByRole('checkbox', { name: /Usa pictogramas/ })).toHaveCount(0);
    await expect(page.getByText(/para todos|todos los alumnos/i)).toHaveCount(0);

    // Y el perfil más cargado que hay sigue con ellos apagados.
    const profile = await page.evaluate((c) =>
      window.rampa.learners.load(c) as Promise<Record<string, unknown>>, code);
    expect(JSON.stringify(profile)).not.toMatch(/"enabled"\s*:\s*true/);

    await intoLearner(page);
    await toTab(page, 'who');
    const on = page.getByRole('checkbox', { name: /Usa pictogramas/ });
    await expect(on).toBeVisible();
    await expect(on, 'ningún eje lo enciende, ni el perfil más cargado').not.toBeChecked();

    await app.close();
  });

  /**
   * FR-2314 · el raíl perdió una entrada y ella sigue aterrizando donde aterrizaba.
   *
   * `ui/test/route.test.ts` afirma que `startRoute()` es la portada; esto lo afirma
   * después de **usar** Configuración, que es el caso que un cambio de raíl rompe: salir
   * de un apartado y quedarse dentro de Configuración en vez de volver a su clase.
   */
  test('salir de Configuración la devuelve a su clase', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toScreen(page, PANE);
    await toCaseload(page);
    await expect(page.getByRole('heading', { name: 'Mis alumnos', level: 1 })).toBeVisible();
    await app.close();
  });

  /**
   * FR-2315 · abrir Configuración no pide **nada**.
   *
   * «Que no me lo vuelva a preguntar» es un requisito sobre el silencio, y silencio
   * significa cero peticiones — contadas en las dos pilas, porque una llamada a un
   * proveedor sale por el `fetch` de Node y un contador sobre la sesión de Chromium
   * estaría a cero mientras algo se escapa por la otra.
   *
   * Se abre el apartado **tres veces**, no una: lo que `024` FR-2209 promete es que
   * abrirla cien veces no llega a nadie, y una sola visita no distingue «no pide nada»
   * de «lo pide una vez y lo cachea».
   */
  test('abrirlo tres veces no llega a nadie', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);

    for (let i = 0; i < 3; i++) {
      await toScreen(page, PANE);
      await toCaseload(page);
    }
    await toScreen(page, PANE);
    await expect(page.getByText(/CC BY-NC-SA/)).toBeVisible();

    const net = await page.evaluate(() =>
      window.rampa.diagnostics.network() as Promise<{ count: number; urls: string[] } | null>);
    expect(net, 'el contador sólo se instala bajo RAMPA_TEST').not.toBeNull();
    expect(net!.urls, 'algo salió de la máquina al abrir Configuración').toEqual([]);
    expect(net!.count).toBe(0);

    await app.close();
  });

  /**
   * `013` FR-1105 y `010` FR-824 · el aviso deja de pedir una decisión ya tomada.
   *
   * El badge `decide` dice «Necesita tu decisión», y una vez aceptada la licencia aquí no
   * queda ninguna: lo que sigue en pantalla es la regla de atribución y lo que el
   * ShareAlike le hace a sus propias hojas, que **necesita saber** y no puede cambiar. Un
   * «necesita tu decisión» permanente sobre una pregunta cerrada es el badge perdiendo su
   * significado para las que sí están pendientes.
   *
   * Lo encontró mirarlo (T019), y es la misma corrección que `020` hizo en la portada con
   * «esta carpeta la ha tocado una versión más nueva». Segunda vez, así que la regla
   * merece decirse: `decide` es para una pregunta que la espera, no para un asunto que
   * sea serio.
   */
  test('el aviso de la licencia deja de pedir una decisión cuando ya la ha tomado', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toScreen(page, PANE);

    // Antes: la decisión es suya y está pendiente.
    await expect(page.getByText('Necesita tu decisión')).toBeVisible();
    await expect(page.getByText('Lo que tienes que saber antes')).toBeVisible();

    await page.getByRole('button', { name: 'Acepto la licencia' }).click();

    // Después: la licencia sigue entera en pantalla — no se esconde, porque la
    // atribución y el ShareAlike siguen valiendo — pero ya no le pide nada.
    await expect(page.getByText(/CC BY-NC-SA/)).toBeVisible();
    await expect(page.getByText(/Toda hoja que lleve un pictograma lleva la atribución/))
      .toBeVisible();
    await expect(page.getByText('Necesita tu decisión')).toHaveCount(0);
    await expect(page.getByText('Lo que tienes que saber antes')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retirar mi aceptación' })).toBeVisible();

    await app.close();
  });

  /*
   * SC-2306 —`axe` a cada ancho— **no está aquí**: vive en `a11y.spec.ts`, que es donde
   * está el `scan()` que inyecta axe-core en la página.
   *
   * Y esa inyección tiene su motivo escrito allí: `@axe-core/playwright` abre una segunda
   * página para alcanzar marcos de otro origen, y el protocolo de Electron contesta
   * `Target.createTarget: Not supported`, así que la integración recomendada no puede
   * correr contra esta aplicación. Copiar aquí el arranque de axe habría sido una segunda
   * copia de esa integración con el motivo escrito sólo en una de las dos.
   */
});
