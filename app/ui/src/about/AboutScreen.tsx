import { useEffect, useState } from 'react';
import {
  useCorpusVersion, useLicences, useUpdateCheck, useUpdateDestinations,
  useLaunchCheckConsent, useSetLaunchCheckConsent, type UpdateStatusView,
} from '../data/corpus.js';
import { Loaded } from '../data/Loaded.js';
import { Page } from '../shell/Page.js';
import { Wordmark } from '../components/Logo.js';
import { Callout } from '../components/Callout.js';
import { LogSection } from './LogSection.js';

/**
 * Both licences and the corpus attribution ship here (research R8). The
 * application is Apache-2.0 and bundles CC BY-SA 4.0 content plus a SIL OFL
 * typeface; distributing it without this would be non-compliant, and a poor look
 * for a project whose argument is that the commons should stay common.
 */
export function AboutScreen() {
  const versionLoaded = useCorpusVersion();
  const licLoaded = useLicences();
  const version = versionLoaded.state === 'ready' ? versionLoaded.value : null;
  const lic = licLoaded.state === 'ready' ? licLoaded.value : null;
  /** The update check (006 T073). Null until she asks; never on mount. */
  /*
   * `UpdateStatusView` from the data layer, not restated here.
   *
   * It was restated, and `034` is what found it: adding `summary` in `core`, in the
   * provider and in the hook left this component compiling against a shape three files
   * behind — which is exactly the defect `ui/src/data/record.ts` warns about in its own
   * comment about `freshness`, one screen over.
   */
  const [update, setUpdate] = useState<UpdateStatusView | null>(null);
  const updateCheck = useUpdateCheck();
  const destinations = useUpdateDestinations();
  const consent = useLaunchCheckConsent();
  const setConsent = useSetLaunchCheckConsent();
  const checking = updateCheck.busy;

  /*
   The wordmark used to be marked up as this screen's `<h1>`, because at the
   time the screen had no other heading and its sections started at `<h2>`.
   Since T009 the page shell supplies the `<h1>`, so keeping this one gave the
   document two — which is what a screen reader reports first when it
   announces the page, and which the a11y suite catches.

   So it goes back to being what it looks like: a mark above the title, in the
   shell's banner slot. The heading is the title.
  */
  return (
    <Page title="Acerca de Rampa"
          banner={<Wordmark size={28} />}
          lede="Adapta material de aula al perfil de un alumno con discapacidad. Tú revisas y firmas siempre: esto quita el trabajo mecánico, no el criterio.">

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
          plantillas son <strong>CC BY-SA 4.0</strong>. La tipografía del material
          y del modo de alto contraste es Atkinson Hyperlegible, del Braille
          Institute, bajo <strong>SIL OFL 1.1</strong>.
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
                          void updateCheck.run().then((u) => { if (u) setUpdate(u); });
                        }}>
                  {checking ? 'Comprobando…' : '¿Hay una versión más nueva?'}
                </button>
              </div>
              <p className="small" style={{ margin: 0 }}>
                Sólo cuando lo pulses, salvo que abajo digas que puedo mirarlo al abrir.
                No envía nada tuyo: pregunta qué versión hay publicada y ya está. Y
                <strong> no descarga ni instala nada</strong>: te doy el enlace y lo
                descargas tú, mirando lo que descargas.
              </p>

              {/*
                Consent, off by default (`034` T013, research R5), and it says what
                leaves the machine **before** she turns it on rather than in a manual.

                `releases.ts` says `checkedAutomatically` «does not exist and must not be
                added» — the status of a check is not where a permission lives. So the
                permission is here, it is hers, and it is absent until she gives it.
              */}
              {/*
                `.check` and not a bare row: the class is what makes a checkbox 24×24 and
                its target 44px (`010` T017, WCAG 2.2 SC 2.5.8). Written as a plain row
                first, and `layout.spec.ts` caught it at 13×24 — the same guard that found
                the 22×22 box eight weeks after it shipped.
              */}
              <label className="check">
                <input type="checkbox"
                       checked={consent.state === 'ready' ? consent.value : false}
                       onChange={(e) => void setConsent.run(e.target.checked)
                         .then(() => consent.reload())} />
                <span className="small">
                  Puedes mirarlo al abrir, como mucho una vez por semana. Nunca en mitad
                  de un trabajo, y si falla no me dices nada.
                </span>
              </label>

              {/*
                The disclosure (FR-3204), read from the **same** declaration the code
                connects through. Two lists do not fail by the code reaching somewhere
                undeclared — they fail by a third destination being added and the screen
                still saying two.
              */}
              <details>
                <summary className="small">¿A dónde se conecta exactamente?</summary>
                <Loaded from={destinations}>
                  {(list) => (
                    <ul>
                      {list.map((d) => (
                        <li key={d.id} className="small">
                          <strong>{d.what}</strong> — <code>{d.host}</code>.<br />
                          {d.when}. Manda: {d.sends.toLowerCase()}.
                        </li>
                      ))}
                    </ul>
                  )}
                </Loaded>
              </details>

              <div role="status" aria-label="Resultado de la comprobación">
                {/*
                  The main process answers a *failed* check with a `problem`
                  field, which is why the branches below read like a full set.
                  They are not: a check that throws never reaches them, and
                  before the data layer that case rendered nothing at all — she
                  pressed the button, the spinner stopped, and no sentence
                  appeared either way.
                */}
                {updateCheck.error ? (
                  <p className="small" style={{ margin: 0 }}>{updateCheck.error.message}</p>
                ) : update ? (
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
                    {/*
                      What it changes, in her language (`034` FR-3201).

                      Without it the notice is «hay una versión nueva», which is a nag:
                      it says something is available and nothing about whether it
                      matters. The sentence this feature exists for is «arreglada la
                      regla de exámenes» — which is exactly what a teacher stranded on a
                      fix needs to read.

                      As **text**. Release notes come off a network response, and a
                      screen that rendered them as Markdown would be a screen a release
                      can style and link (Principle IX).
                    */}
                    {update.newer && update.summary ? (
                      <> {update.summary}</>
                    ) : null}
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
                notice. One of **two** `<pre>`s the design system permits since `036`:
                the other is the log's tail, for the same reason — each line is one
                record. Corrected here rather than left saying «the one», because a
                comment that has stopped being true is what `036` exists about. */}
            <pre className="licence">{lic.notice}</pre>
          </details>
        )}
      </section>

      {/*
        El registro, último y en su propio componente (`036` T011).

        Último porque es lo que se busca cuando algo ha ido mal, no lo que se lee un
        martes. Y en su propio componente porque esta pantalla ya lleva cuatro asuntos en
        230 líneas: un quinto dentro es cómo una pantalla se convierte en un fichero que
        nadie revisa.
      */}
      <section className="stack gap3">
        <LogSection />
      </section>
    </Page>
  );
}