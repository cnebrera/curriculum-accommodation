import { useEffect, useRef, useState } from 'react';
import { Callout } from '../components/Callout.js';
import { useLogPath, useLogTail, useRevealLog } from '../data/diagnostics.js';

/**
 * El registro, y cómo llega ella a él (036 US1, FR-3406…FR-3410).
 *
 * ## Su propio componente, y no más de «Acerca de»
 *
 * Esa pantalla ya lleva la versión, las licencias, el consentimiento de la comprobación y
 * los destinos declarados en 230 líneas. Un quinto asunto dentro es cómo una pantalla se
 * convierte en un fichero que nadie revisa, y `020` se pasó una especificación entera
 * deshaciendo exactamente eso en `LearnersScreen`.
 *
 * ## Lo que hace esta sección posible de tener
 *
 * El argumento de seguridad del registro es «no lleva nada de ningún alumno», y hasta
 * ahora eso era **nuestra** afirmación sobre un fichero que ella no veía. Dejarle leerlo
 * es lo que hace la promesa suya: un fichero que le pedimos que mande a ciegas es uno del
 * que tiene que fiarse; uno que puede leer es uno que comprueba. En un colegio ésa es la
 * diferencia entre lo que un DPO permite y lo que prohíbe.
 *
 * ## Texto, nunca marcado (FR-3410, Principio IX)
 *
 * Una línea del registro puede citar un fragmento de un documento — el mensaje de una
 * excepción lanzada manejando material no confiable. Así que **el registro es contenido
 * cuando se muestra**: va en un `<pre>` con el texto tal cual, y nada de aquí construye
 * HTML. Lo mismo vale para lo que llega a su portapapeles, que es el punto donde nadie
 * miraría — un portapapeles no tiene aspecto que inspeccionar.
 */
export function LogSection() {
  const path = useLogPath();
  const tail = useLogTail();
  const reveal = useRevealLog();
  const [copied, setCopied] = useState(false);

  const lines = tail.state === 'ready' ? tail.value : undefined;
  const where = path.state === 'ready' ? path.value : null;

  /*
   * Tres estados y tres frases, porque son tres hechos (research R5).
   *
   * Una caja vacía tiene la forma de un fallo de renderizado, y ésta es la pantalla que
   * ella abre cuando ya sospecha que algo va mal. `008` lo aprendió por las malas: «una
   * extracción que no se pudo leer y una que no existe renderizaban el mismo "Un
   * momento…" para siempre, que es el estado de carga mintiendo sobre una pantalla
   * muerta».
   */
  const nothing = lines !== undefined && (lines === null || lines.trim() === '');

  /*
   * Abierto **por el final**, que es donde está lo que acaba de pasar (`036` T018).
   *
   * Lo encontró mirarlo: la caja abría arriba, y ella entra en esta pantalla porque algo
   * se ha roto hace un minuto — la línea que le interesa es la última de doscientas, y
   * tenía que rascar una caja de 320px para llegar. «El registro está aquí» y «el fallo
   * está aquí» son dos cosas distintas.
   *
   * Una sola vez, cuando llega el contenido: un efecto que bajara en cada render le
   * pelearía el scroll en cuanto subiera a leer.
   */
  const box = useRef<HTMLPreElement>(null);
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || !lines || !box.current) return;
    settled.current = true;
    /*
     * Un fotograma antes, para que el layout exista.
     *
     * Puesto directo bajaba **casi** hasta el final y no hasta el final: con `pre-wrap` y
     * una fuente que puede no haber cargado todavía, el `scrollHeight` del momento del
     * efecto es menor que el definitivo. Lo vi mirándolo, y es la misma lección que
     * `a11y.spec.ts` ya tiene escrita para las transiciones: esperar al fotograma, no
     * calcular sobre uno que aún no ha maquetado.
     */
    requestAnimationFrame(() => {
      const el = box.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [lines]);

  const copy = () => {
    if (!lines) return;
    /*
     * El **mismo texto que está en pantalla**. Una sola fuente, así que el portapapeles
     * y la pantalla no pueden divergir — y copiar una versión renderizada rompería el
     * Principio IX justo donde nadie lo vería.
     */
    void navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    }).catch(() => { /* un portapapeles que se niega no es un fallo que contarle */ });
  };

  return (
    <div className="stack gap3">
      <h2>Si algo va mal</h2>
      <p className="small">
        Rampa apunta lo que hace en un fichero de texto: la hora, qué estaba haciendo y
        qué falló. <strong>No apunta nada de ningún alumno</strong> — ni su nombre, ni su
        ficha, ni nada que los reconstruya. Puedes leerlo aquí antes de mandárselo a
        nadie.
      </p>

      {nothing ? (
        <Callout intent="info" title="Todavía no hay nada apuntado">
          <p>
            Es lo normal recién instalado. Cuando algo falle, aparecerá aquí.
          </p>
        </Callout>
      ) : tail.state === 'error' ? (
        /*
         * «No he podido leerlo» y no una caja vacía: la ruta sigue en pantalla debajo,
         * así que puede ir a mirarlo ella.
         */
        <Callout intent="info" title="No he podido leer el registro">
          <p>
            El fichero está donde dice abajo. Ábrelo tú si quieres verlo — puede ser un
            permiso del sistema.
          </p>
        </Callout>
      ) : lines ? (
        <>
          {/*
            `<pre>`, que es el segundo que el sistema de diseño permite y por el mismo
            motivo que la licencia: cada línea es un registro, y un registro partido en
            dos o pegado al siguiente es un registro que dice otra cosa.
          */}
          {/*
            `tabIndex` y nombre, y los dos por el mismo motivo (`013` FR-1114, WCAG 2.1.1).
            
            Esta caja tiene scroll y **nada enfocable dentro** — es texto. Sin `tabIndex`
            un usuario de teclado no puede desplazarla: llega hasta aquí, ve doscientas
            líneas recortadas y no tiene forma de bajar. Lo cazó `axe` en la barrida de
            `a11y.spec.ts` en cuanto la sección existió, que es exactamente para lo que
            está esa barrida.
            
            Y con `aria-label`, porque una región que entra en el orden de tabulación y no
            dice qué es es una parada sin explicación. `role="region"` lo hace un punto de
            referencia que un lector de pantalla puede listar.
          */}
          <pre className="logtail" ref={box} tabIndex={0} role="region"
               aria-label="Últimas líneas del registro">{lines}</pre>
          <div className="row gap2">
            <button className="btn btn-sm" onClick={copy}>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button className="btn btn-sm" onClick={() => void reveal.run()}>
              Abrir la carpeta
            </button>
          </div>
          <p className="small muted">
            Se ven las últimas líneas. En esa carpeta está el fichero entero y, si ha
            crecido mucho, también el anterior.
          </p>
        </>
      ) : (
        <p className="small" aria-live="polite">Un momento, que lo leo…</p>
      )}

      {where ? (
        <p className="small muted">
          Está aquí: <code>{where}</code>
        </p>
      ) : null}
    </div>
  );
}
