import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * El registro, para la pantalla que por fin lo lee (036 T006).
 *
 * ## Tres canales que existían y no llamaba nadie
 *
 * `diagnostics:path`, `diagnostics:reveal` y `diagnostics:tail` están implementados desde
 * que se escribió el logger, y **ninguna pantalla los llamaba** — así que el fallo que
 * ella reportaría se apuntaba con esmero en un fichero al que no podía llegar. Encontrado
 * barriendo los 181 canales expuestos (BACKLOG G58) y no usando la aplicación.
 *
 * Este fichero es el eslabón que faltaba, y nada más: no hay canal nuevo, no hay destino
 * nuevo, y el logger no se toca (FR-3414).
 *
 * ## No hay hook para `diagnostics:network`
 *
 * Ése es el contador de `035` y es el instrumento de un test, no algo que una pantalla
 * consulte. Un hook para él sería ofrecerle a la interfaz una cifra que sólo significa
 * algo bajo `RAMPA_TEST`.
 */

/** Dónde está el registro (FR-3406). No toca el disco: compone una ruta. */
export function useLogPath(): Loadable<string> {
  return useAsync(() => window.rampa.diagnostics.path() as Promise<string>, []);
}

/**
 * Las últimas líneas, dentro de la aplicación (FR-3407).
 *
 * Doscientas, que es lo que el canal ya ofrece por defecto: una línea son unos 100 bytes,
 * así que son ~20 KB — bastante para un fallo no atrapado y lo que pasó alrededor, poco
 * para leerlo, y **no depende del tamaño del fichero**. Leer 2 MB para mostrar 200 líneas
 * es la forma que hay que evitar justo en la máquina que ya va mal.
 *
 * `null` cuando no se pudo leer, `''` cuando no hay nada apuntado todavía — y la pantalla
 * los dice distinto, porque son dos hechos distintos y una caja vacía tiene la forma de
 * un fallo de renderizado.
 */
export function useLogTail(lines = 200): Loadable<string | null> {
  return useAsync(() => window.rampa.diagnostics.tail(lines) as Promise<string | null>,
    [lines]);
}

/**
 * Abre la carpeta que contiene el registro (FR-3408).
 *
 * La carpeta y no el fichero: abrir el fichero lanzaría el editor que esté registrado
 * para `.log`, que en un portátil de colegio es cualquier cosa. La carpeta es de donde
 * ella lo adjunta, y ahí está también la generación rotada anterior.
 */
export function useRevealLog() {
  return useCommand(() => window.rampa.diagnostics.reveal() as Promise<boolean>);
}
