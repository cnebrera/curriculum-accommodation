import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toScreen } from './nav.js';

/**
 * El registro, y cómo llega ella a él (036 US1/US2).
 *
 * ## La sección que importa es §3
 *
 * El argumento de seguridad del registro es «no lleva nada de ningún alumno», y hasta
 * `036` eso era **nuestra** afirmación sobre un fichero que ella no podía ver. Así que
 * aquí hay dos clases de caso: que llegue al fichero (US1), y que lo que hay dentro
 * aguante mirarlo (US2). El segundo se afirma **sobre el fichero** y no sobre la
 * pantalla: lo que tiene que ser verdad es que nada se escribió, y una pantalla que lo
 * filtrara esconderá el defecto en vez de demostrar su ausencia.
 */
const appRoot = process.cwd();
const PANE = { label: 'Acerca de y licencias', under: 'Configuración' } as const;

async function launch(): Promise<{
  app: ElectronApplication; page: Page; vault: string; userData: string;
}> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-log-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-log-v-')), 'Rampa');
  await mkdir(vault, { recursive: true });
  const app = await electron.launch({
    args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, RAMPA_TEST: '1', ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.setViewportSize({ width: 1366, height: 900 });
  return { app, page, vault, userData };
}

async function seed(page: Page, vault: string, name = 'Lucía'): Promise<string> {
  await page.evaluate((root) => window.rampa.vault.use(root), vault);
  const code: string = await page.evaluate(() => window.rampa.learners.newCode());
  await page.evaluate((c) => window.rampa.learners.save({
    code: c, axes: { COG: 3, ATE: 2 }, works: [], avoid: [], interests: [],
    response: { default: 'short' }, language: { instruction: 'es' }, year: 'es:primaria-5',
  }), code);
  await page.evaluate(([c, n]) => window.rampa.names.set(c as string, n as string), [code, name]);
  await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  return code;
}

const logAt = (userData: string) => join(userData, 'logs', 'rampa.log');

test.describe('llega al registro sin salir de la aplicación', () => {
  /** SC-3401 · FR-3406/3407/3408/3409 — quickstart §1. */
  test('la sección dice dónde está, lo enseña, y deja copiarlo y abrir la carpeta', async () => {
    const { app, page, vault, userData } = await launch();
    await seed(page, vault);
    await toScreen(page, PANE);

    await expect(page.getByRole('heading', { name: 'Si algo va mal' })).toBeVisible();
    // La ruta, tal cual — y por tanto la de este `userData` y no otra.
    await expect(page.locator('code', { hasText: 'rampa.log' })).toBeVisible();
    await expect(page.getByText(logAt(userData), { exact: false })).toBeVisible();

    // Las líneas. `app.started` se escribe al arrancar, así que hay algo que leer.
    await expect(page.locator('.logtail')).toContainText('app.started');

    await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir la carpeta' })).toBeVisible();

    // Y dice que en esa carpeta está el entero y el anterior (FR-3408).
    await expect(page.getByText(/también el anterior/)).toBeVisible();

    await app.close();
  });

  /**
   * Abierto por el final, que es donde está lo que acaba de pasar (T018).
   *
   * Lo encontró mirarlo: la caja abría arriba, y ella entra aquí porque algo se ha roto
   * hace un minuto — la línea que le interesa es la última de doscientas. Afirmado como
   * «está abajo» y no como un número de píxeles: lo que importa es que no tenga que
   * rascar, no cuánto mide la caja.
   */
  test('la caja de líneas se abre por el final y no por el principio', async () => {
    const { app, page, vault, userData } = await launch();
    await seed(page, vault);

    // Doscientas líneas largas, para que la caja tenga de sobra que desplazar.
    const many = Array.from({ length: 300 }, (_, i) =>
      `2026-09-07T10:00:0${i % 10}.000Z INFO  adapt.done {"code":"C${i}","n":${i}}`);
    await writeFile(logAt(userData), many.join('\n') + '\nULTIMA-LINEA\n', 'utf8');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
    await toScreen(page, PANE);

    const at = await page.locator('.logtail').evaluate((el) => ({
      top: el.scrollTop, max: el.scrollHeight - el.clientHeight,
    }));
    expect(at.max, 'la caja no tiene nada que desplazar, así que esto no prueba nada')
      .toBeGreaterThan(50);
    // Al final, con holgura de un par de líneas por si el reflow ajusta.
    expect(at.top).toBeGreaterThan(at.max - 40);

    await app.close();
  });

  /**
   * Research R5 · tres estados y tres frases.
   *
   * Una caja vacía tiene la forma de un fallo de renderizado, y ésta es la pantalla que
   * ella abre cuando ya sospecha que algo va mal.
   */
  test('«no he podido leerlo» no es lo mismo que «no hay nada»', async () => {
    const { app, page, vault, userData } = await launch();
    await seed(page, vault);

    // Ilegible: el fichero existe y no se puede leer.
    await chmod(logAt(userData), 0o000);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
    await toScreen(page, PANE);

    /*
     * Cualquiera de las dos frases honestas sirve —«no he podido leerlo» o «no hay nada»
     * dependiendo de cómo falle el sistema de ficheros— pero **la ruta tiene que seguir
     * ahí**, que es lo que le permite ir a mirarlo ella. Lo que no puede pasar es una
     * caja vacía sin explicación.
     */
    await expect(page.getByText(/No he podido leer el registro|Todavía no hay nada apuntado/))
      .toBeVisible();
    await expect(page.locator('code', { hasText: 'rampa.log' })).toBeVisible();
    await expect(page.locator('.logtail')).toHaveCount(0);

    await chmod(logAt(userData), 0o644);
    await app.close();
  });

  /**
   * SC-3404 · abrir esto no llega a nadie, contado en **las dos pilas**.
   *
   * Una llamada a un proveedor sale por el `fetch` de Node y un oyente sobre la sesión de
   * Chromium estaría a cero mientras algo se escapa.
   */
  test('abrirlo, copiarlo y abrir la carpeta no producen ni una petición', async () => {
    const { app, page, vault } = await launch();
    await seed(page, vault);
    await toScreen(page, PANE);
    await expect(page.locator('.logtail')).toBeVisible();

    await page.getByRole('button', { name: 'Copiar' }).click();
    // «Abrir la carpeta» se pulsa: pide al sistema operativo, no a la red.
    await page.getByRole('button', { name: 'Abrir la carpeta' }).click();

    const net = await page.evaluate(() =>
      window.rampa.diagnostics.network() as Promise<{ count: number; urls: string[] } | null>);
    expect(net, 'el contador sólo se instala bajo RAMPA_TEST').not.toBeNull();
    expect(net!.urls, 'algo salió de la máquina al abrir el registro').toEqual([]);
    expect(net!.count).toBe(0);

    await app.close();
  });
});

test.describe('lo que va a mandar aguanta que lo mire', () => {
  /**
   * **SC-3402, sobre una sesión real y sobre el fichero.**
   *
   * Ésta es la afirmación de la que dependen las demás. Se lee el fichero del disco y no
   * la pantalla: lo que tiene que ser verdad es que **nada se escribió**, y una pantalla
   * que filtrara esconderá el defecto en vez de demostrar su ausencia.
   *
   * La sesión hace trabajo de verdad con el nombre puesto — guarda el perfil, lo nombra,
   * escribe en el vault, abre pantallas — y todo eso pasa por llamantes que registran.
   * Si el nombre aparece, **el arreglo no está en `036`**: está en el llamante que
   * escribe lo que no debe.
   */
  test('el nombre del alumno no está en el fichero, ni un fragmento de su material', async () => {
    const { app, page, vault, userData } = await launch();
    const code = await seed(page, vault, 'Lucía');

    // Trabajo real con su nombre en juego: guardar el perfil, escribir su material,
    // recorrer sus pantallas.
    await page.evaluate(async (args) => {
      const [c] = args as [string];
      await window.rampa.learners.save({
        code: c, axes: { COG: 3, ATE: 2, LEC: 1 }, works: ['dinosaurios'], avoid: [],
        interests: ['dinosaurios'], response: { default: 'short' },
        language: { instruction: 'es' }, year: 'es:primaria-5',
      });
      await window.rampa.vault.write(`material/job-log-1/ir.md`,
        '---\nsource: "pegado"\n---\n\n::: {#b1 .explanation}\nLos dinosaurios herbívoros\n:::\n');
    }, [code]);
    await toScreen(page, PANE);
    await expect(page.locator('.logtail')).toBeVisible();

    const raw = await readFile(logAt(userData), 'utf8');

    expect(raw, 'el nombre del alumno está en el registro').not.toContain('Lucía');
    expect(raw, 'un fragmento de su material está en el registro')
      .not.toContain('dinosaurios herbívoros');
    // El código sí puede estar: es el pseudónimo, y es lo único que le permite a una
    // línea decir de qué trabajo habla (research R1).
    expect(raw.length, 'el registro está vacío, así que esto no prueba nada')
      .toBeGreaterThan(50);

    await app.close();
  });

  /**
   * FR-3410 · Principio IX — una línea que lleva algo con forma de marcado es **texto**.
   *
   * Se siembra en el propio fichero: provocar una línea así de verdad exigiría una
   * excepción con material dentro, y lo que se afirma aquí es la pantalla. Que el
   * *escritor* no lleve material lo afirma el caso de arriba.
   */
  test('una línea con forma de marcado aparece como caracteres', async () => {
    const { app, page, vault, userData } = await launch();
    await seed(page, vault);

    const line = '2026-09-07T10:00:00.000Z WARN  x {"detail":'
      + '"<script>alert(1)</script> **negrita** [enlace](http://x)"}';
    await writeFile(logAt(userData), line + '\n', 'utf8');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
    await toScreen(page, PANE);

    const pre = page.locator('.logtail');
    // Los caracteres están…
    await expect(pre).toContainText('<script>alert(1)</script>');
    await expect(pre).toContainText('**negrita**');
    // …y nada se convirtió en un elemento ni en un enlace.
    await expect(pre.locator('script')).toHaveCount(0);
    await expect(pre.locator('strong')).toHaveCount(0);
    await expect(pre.locator('a')).toHaveCount(0);

    await app.close();
  });
});

test.describe('un registro que no se puede escribir no le cuesta nada', () => {
  /**
   * SC-3403 · FR-3405 — quickstart §7.
   *
   * Donde los dos chocan gana el trabajo. Una herramienta que se cae porque no pudo
   * escribir un diagnóstico ha convertido su diagnóstico en un defecto.
   *
   * El directorio se hace inescribible **antes** de arrancar, que es el caso real: un
   * perfil bloqueado, un disco lleno, una carpeta que el colegio montó de sólo lectura.
   */
  test('con el directorio de logs inescribible, todo funciona y no dice nada', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'rampa-log-ro-'));
    const vault = join(await mkdtemp(join(tmpdir(), 'rampa-log-ro-v-')), 'Rampa');
    await mkdir(vault, { recursive: true });
    // Un fichero donde va el directorio: `mkdir` se niega, que es la forma que tiene
    // este fallo cuando llega de verdad.
    await writeFile(join(userData, 'logs'), 'no soy un directorio', 'utf8');

    const app = await electron.launch({
      args: [join(appRoot, 'out', 'main', 'main.js'), `--user-data-dir=${userData}`],
      env: { ...process.env, RAMPA_TEST: '1', ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '' },
    });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.setViewportSize({ width: 1366, height: 900 });

    // Arranca, y el trabajo se hace: un alumno, su nombre, su material en el vault.
    const code = await seed(page, vault);
    await page.evaluate(async (args) => {
      const [c] = args as [string];
      await window.rampa.vault.write(`profiles/${c}/notas.md`, '# nada\n');
    }, [code]);

    // Y en ninguna pantalla hay una palabra sobre el registro.
    const said = (await page.locator('main').textContent()) ?? '';
    for (const word of [/no he podido escribir/i, /registro/i, /\blog\b/i]) {
      expect(said, `la aplicación se queja del registro: ${word}`).not.toMatch(word);
    }

    // La sección se abre y dice lo suyo sin romperse.
    await toScreen(page, PANE);
    await expect(page.getByRole('heading', { name: 'Si algo va mal' })).toBeVisible();

    await app.close();
  });
});
