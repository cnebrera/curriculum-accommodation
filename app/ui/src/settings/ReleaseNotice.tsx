import { Callout } from '../components/Callout.js';
import { useReleaseNotice, useDismissRelease } from '../data/corpus.js';

/**
 * Lo que encontró la comprobación al abrir, y cómo se calla (034 FR-3201/FR-3203).
 *
 * ## Por qué existe una pantalla para esto
 *
 * Su pulsación en «Acerca de» se contesta en la pantalla desde la que pulsó. La
 * comprobación al arrancar **no tiene pantalla**, así que lo que encuentre tiene que
 * aparecer en algún sitio por donde ella pase — y entonces tiene que poder callarse, o es
 * una lata.
 *
 * `034` lo dice como entidad: «Release notice: version, summary, link, **dismissed-state**».
 * Los dos canales del descarte existían y **no los llamaba nada**, así que FR-3203 era un
 * requisito con almacenamiento, manejador, línea de preload y ningún lector.
 *
 * ## Aquí, y no en un diálogo
 *
 * El escenario del spec dice que el aviso «nombra la versión, resume qué cambia, enlaza
 * la descarga — **y no hace nada más**». Un modal al abrir hace algo más: interrumpe. Así
 * que es una línea en la portada, con el mismo precedente que «esta carpeta la ha tocado
 * una versión más nueva» (`032` FR-3008): un hecho sobre su instalación, en la pantalla
 * de inicio, `info` y no `decide` — no hay nada que ella tenga que decidir, y esta
 * aplicación no puede descargar ni instalar nada por su cuenta (FR-3201).
 *
 * ## Y el descarte es por versión
 *
 * Vuelve para algo **más nuevo**. Es la diferencia entre un aviso y una lata, y la lata
 * es peor aquí que en la mayoría de aplicaciones: lo que se anuncia es un arreglo que
 * puede necesitar, así que una maestra que ha aprendido a pasar de este cartel es una
 * maestra que pasará del que importa.
 */
export function ReleaseNotice() {
  const notice = useReleaseNotice();
  const dismiss = useDismissRelease();

  if (notice.state !== 'ready' || !notice.value?.newer) return null;
  const it = notice.value;

  return (
    <Callout intent="info" title={`Hay una versión más nueva (${it.latest ?? '—'})`}>
      <p>
        Tú tienes la {it.current}.
        {/*
          Qué cambia, en su idioma (FR-3201) — y como **texto**, nunca como Markdown: las
          notas de una release vienen de una respuesta de red, y una pantalla que las
          renderizara sería una pantalla que una release puede maquetar y enlazar
          (Principio IX).
        */}
        {it.summary ? <> {it.summary}</> : null}
      </p>
      <p className="small">
        Se descarga e instala como la primera vez. Tus alumnos y tus notas se quedan donde
        están: la actualización no toca tu carpeta.
      </p>
      <div className="row gap2">
        <a className="btn btn-sm" href={it.page} target="_blank" rel="noreferrer">
          Ver las descargas
        </a>
        <button className="btn btn-sm btn-ghost"
                onClick={() => {
                  const v = it.latest;
                  if (v) void dismiss.run(v).then(() => notice.reload());
                }}>
          No me lo recuerdes más
        </button>
      </div>
    </Callout>
  );
}
