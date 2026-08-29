import { useEffect, useState } from 'react';
import { Wordmark } from '../components/Logo.js';
import { Callout } from '../components/Callout.js';

/**
 * Both licences and the corpus attribution ship here (research R8). The
 * application is Apache-2.0 and bundles CC BY-SA 4.0 content plus a SIL OFL
 * typeface; distributing it without this would be non-compliant, and a poor look
 * for a project whose argument is that the commons should stay common.
 */
export function AboutScreen() {
  const [version, setVersion] = useState<Record<string, unknown> | null>(null);
  const [lic, setLic] = useState<{ code: string; content: string; notice: string } | null>(null);
  /** The update check (006 T073). Null until she asks; never on mount. */
  const [update, setUpdate] = useState<
    { current: string; latest?: string; newer: boolean; page: string; problem?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void window.rampa.corpus.version().then(setVersion);
    void window.rampa.corpus.licences().then(setLic);
  }, []);

  return (
    <div className="stack gap6" style={{ maxWidth: 'var(--measure)' }}>
      <div className="stack gap4">
        {/*
          The wordmark is this screen's heading, so it is marked up as one. It
          was a bare <span>, which left the page with no h1 and its headings
          starting at h2 — invisible on screen, and the first thing a screen
          reader reports when it announces the document.
        */}
        <h1 style={{ margin: 0 }}><Wordmark size={28} /></h1>
        <p className="lede">
          Adapta material de aula al perfil de un alumno con discapacidad. Tú
          revisas y firmas siempre: esto quita el trabajo mecánico, no el criterio.
        </p>
      </div>

      <section className="stack gap3">
        <h2>Lo que hace, y lo que no</h2>
        <ul className="stack gap2" style={{ margin: 0, paddingLeft: '1.2em' }}>
          <li>Adapta la vía, nunca el contenido: no inventa datos ni cambia lo que enseña la ficha.</li>
          <li>No decide adaptaciones significativas. Eso es del equipo docente y del expediente.</li>
          <li>Un examen adaptado que además es más fácil es otro examen. No lo hace.</li>
          <li>Los nombres de tus alumnos no salen de este ordenador.</li>
          <li>Nada llega a un niño sin que tú lo firmes.</li>
        </ul>
      </section>

      <section className="stack gap3">
        <h2>Tus datos</h2>
        <Callout intent="info" title="Para el equipo directivo y el DPO">
          Hay un documento de una página con qué datos existen, dónde viven, qué
          sale hacia tu servicio de IA en cada paso y qué no sale nunca — incluido
          el límite honesto: si la foto de la ficha lleva el nombre escrito a mano,
          ese nombre llega al proveedor dentro de la imagen.
        </Callout>
      </section>

      <section className="stack gap3">
        <h2>Licencias</h2>
        <p className="small">
          El programa es <strong>Apache-2.0</strong>. Las recetas, instrucciones y
          plantillas son <strong>CC BY-SA 4.0</strong>. La tipografía es Atkinson
          Hyperlegible, del Braille Institute, bajo <strong>SIL OFL 1.1</strong>.
        </p>
        <p className="small">
          Código permisivo para que un centro pueda integrarlo sin revisión legal;
          contenido con ShareAlike para que lo que construya la comunidad siga
          siendo de la comunidad.
        </p>
        {version && (
          <div className="card">
            <dl className="stack gap2" style={{ margin: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <dt className="small"><strong>Reglas actualizadas</strong></dt>
                <dd className="meta" style={{ margin: 0 }}>{String(version['bundledAt'] ?? '—').slice(0, 10)}</dd>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <dt className="small"><strong>Atribución</strong></dt>
                <dd className="meta" style={{ margin: 0 }}>{String(version['attribution'] ?? '—')}</dd>
              </div>
            </dl>

            {/*
              FR-414 · one action, and it never touches tu carpeta.

              Deliberately a button and never automatic. Comprobarlo por su
              cuenta al arrancar sería una petición a internet desde un
              ordenador con datos de menores, en un horario que nadie ha
              autorizado. Así que se lo decimos antes de que pulse.
            */}
            <div className="stack gap2" style={{ marginTop: 'var(--s4)' }}>
              <div className="row gap2">
                <button className="btn btn-sm" disabled={checking} aria-busy={checking}
                        onClick={() => {
                          setChecking(true);
                          void window.rampa.corpus.checkForUpdate()
                            .then((u) => setUpdate(u as typeof update))
                            .finally(() => setChecking(false));
                        }}>
                  {checking ? 'Comprobando…' : '¿Hay una versión más nueva?'}
                </button>
              </div>
              <p className="small" style={{ margin: 0 }}>
                Sólo cuando lo pulses. Rampa no comprueba nada por su cuenta, y
                no envía nada tuyo: pregunta qué versión hay publicada y ya está.
                Las reglas de adaptación vienen dentro de la aplicación, así que
                actualizarlas es actualizarla.
              </p>

              <div role="status" aria-label="Resultado de la comprobación">
                {update ? (
                  <p className="small" style={{ margin: 0 }}>
                    {update.problem === 'not-published'
                      ? `Todavía no hay ninguna versión publicada. La tuya es la ${update.current}.`
                      : update.problem === 'offline'
                        ? 'No he podido preguntarlo ahora. Puede ser la conexión: inténtalo más tarde.'
                        : update.problem
                          ? 'No he podido saberlo. Puedes mirarlo tú en la página de descargas.'
                          : update.newer
                            ? `Hay una versión más nueva (${update.latest}). Tú tienes la ${update.current}.`
                            : `Estás al día. Tienes la ${update.current}.`}
                    {update.newer || update.problem === 'unreadable' ? (
                      <>
                        {' '}
                        <a href={update.page} target="_blank" rel="noreferrer">Ver las descargas</a>.
                        {' '}Se descarga e instala como la primera vez. Tus alumnos y tus notas
                        se quedan donde están: la actualización no toca tu carpeta.
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
        {lic?.notice && (
          <details className="card card-plain">
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Aviso de licencias completo
            </summary>
            {/* A licence is legitimately preformatted text: its line breaks are
                part of the document, and reflowing it would change a legal
                notice. This is the one <pre> the design system permits. */}
            <pre className="licence">{lic.notice}</pre>
          </details>
        )}
      </section>
    </div>
  );
}
