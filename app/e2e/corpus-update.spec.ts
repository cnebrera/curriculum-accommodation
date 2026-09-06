import { test, expect, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toScreen } from './nav.js';

/**
 * El criterio pedagógico, en la pantalla (034 T018/T021, FR-3205…3209).
 *
 * ## Qué puede probar esto y qué no
 *
 * No hay release `corpus-v<n>` publicada, y este suite no sale a la red. Así que lo que
 * se recorre es todo **menos** la descarga real: que la pantalla dice con qué criterio
 * está trabajando, que buscar correcciones sin nada que traer es una frase y no un fallo,
 * que la vuelta atrás no aparece cuando no hay nada a lo que volver, y que el paso de
 * configuración inicial no bloquea a nadie.
 *
 * La descarga, la verificación de hashes, el escaneo y la publicación atómica están
 * probadas en `packages/shell/test/corpus-update-store.test.ts` sobre un transporte
 * inyectado — que es donde se pueden probar los casos que importan (un fichero que no
 * cuadra, un formato futuro, una descarga a medias) sin depender de que exista una
 * release.
 */
const appRoot = process.cwd();

async function launch(): Promise<{ app: ElectronApplication; page: Page; vault: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'rampa-corpus-'));
  const vault = join(await mkdtemp(join(tmpdir(), 'rampa-corpus-v-')), 'Rampa');
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

test.describe('el criterio pedagógico', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    let vault: string;
    ({ app, page, vault } = await launch());
    await page.evaluate((root) => window.rampa.vault.use(root), vault);
    await page.evaluate(() => window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
    const code: string = await page.evaluate(() => window.rampa.learners.newCode());
    await page.evaluate((c) => window.rampa.learners.save({
      code: c, axes: { COG: 2 }, works: [], avoid: [], interests: [],
      response: {}, language: { instruction: 'es' },
    }), code);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  });

  test.afterAll(async () => { await app.close(); });

  test('el paso de configuración ofrece traerlo y no obliga a nadie', async () => {
    /*
     * Decisión de Carlos: «que se lo baje al instalar… no metas más pasos». Va dentro del
     * paso que ya existe, y Rampa ya lleva un criterio dentro — así que esto es «traerte
     * lo más nuevo» y nunca «sin esto no funciono». Un centro con la red filtrada tiene
     * una herramienta que funciona el primer día.
     */
    const fresh = await launch();
    await expect(fresh.page.getByRole('button', { name: 'Traer el criterio más nuevo' }))
      .toBeVisible();
    // Y el control fuerte del paso sigue siendo la carpeta, que es lo que pregunta.
    await expect(fresh.page.getByRole('button', { name: 'Usar esta carpeta' })).toBeVisible();
    await fresh.app.close();
  });

  test('dice con qué criterio está trabajando, y de dónde salió', async () => {
    await toScreen(page, { label: 'El criterio pedagógico', under: 'Configuración' });
    await expect(page.getByRole('heading', { name: 'El criterio pedagógico', level: 1 }))
      .toBeVisible();
    // El corpus incluido declara su versión, así que el informe puede citarla.
    await expect(page.getByText(/Versión 1, la que vino con Rampa/)).toBeVisible();
  });

  /*
   * **Aquí no se pulsa «Buscar correcciones», y es a propósito.**
   *
   * Lo pulsé, y el suite salió a `api.github.com` de verdad. Un conjunto de tests que
   * llama a casa es exactamente lo que este proyecto rechaza en cualquier otro sitio: en
   * CI es una petición desde una máquina que nadie ha autorizado, y en local es una
   * prueba que pasa o falla según la red.
   *
   * El comportamiento sin red —que una comprobación es silencio y no un fallo— está
   * probado donde se puede probar de verdad, con un transporte inyectado que **rompe el
   * test si alguien lo llama**: `packages/shell/test/corpus-update-store.test.ts` y
   * `packages/shell/test/updates-offline.test.ts`. Eso es más fuerte que mirar una
   * pantalla y no ver un error, porque afirma que no hubo petición en vez de que no se
   * notó.
   */

  test('y nada ha cambiado: el estado es el de una instalación limpia', async () => {
    const state = await page.evaluate(() =>
      window.rampa.corpusUpdate.state() as Promise<{
        version: number; source: string; accepted: number[]; offered: unknown;
      }>);
    expect(state.source).toBe('bundled');
    expect(state.version).toBe(1);
    expect(state.accepted).toEqual([]);
    expect(state.offered).toBeNull();
  });

  test('y no ofrece volver atrás cuando no hay nada a lo que volver', async () => {
    /*
     * Un botón «volver a la versión anterior» sin versión anterior es un botón que
     * enseña que la pantalla no sabe en qué estado está.
     */
    await expect(page.getByRole('heading', { name: 'Volver atrás' })).toHaveCount(0);
  });

  test('el informe de un trabajo cita la versión del criterio', async () => {
    /*
     * FR-3207, Principio VI. «Lo revisé y estaba bien» deja de ser contestable en cuanto
     * cambia una receta, así que un informe de enero tiene que seguir diciendo con qué
     * criterio se hizo.
     */
    const said = await page.evaluate(() =>
      window.rampa.corpus.version() as Promise<Record<string, unknown>>);
    expect(said['version']).toBe(1);
    expect(said['formatVersion']).toBe(1);
  });
});
