import { useState } from 'react';
import { Page, Section } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useCorpusUpdateState, useLookForCorpus, useCorpusFile, useAcceptCorpus,
  useDeclineCorpus, useRevertCorpus, type LookResult,
} from '../data/corpus-update.js';

/**
 * «El criterio pedagógico» — traerlo, leerlo, aceptarlo, volver atrás (`034` FR-3206…3209).
 *
 * ## Por qué esto es una pantalla y no un botón que actualiza
 *
 * Las recetas y las instrucciones **son** el criterio con el que Rampa adapta. Si eso
 * cambia debajo de ella sin que lo lea, la herramienta hace algo distinto de lo que hacía
 * ayer y nadie se lo ha dicho — que es exactamente lo que esta feature existe para
 * evitar. Así que: se enseña qué trae, se puede leer **entero** el fichero que cambia, y
 * aceptar es otra pulsación.
 *
 * ## Y volver atrás está igual de a la vista
 *
 * Una corrección puede estar mal. Cada versión que acepta se conserva, y volver es un
 * puntero — no una reinstalación, no una pérdida. Si volver pareciera un rescate de
 * emergencia y actualizar pareciera lo normal, aceptaría cosas por no saber si podría
 * deshacerlas.
 */
export function CorpusSection() {
  const state = useCorpusUpdateState();
  const look = useLookForCorpus();
  const accept = useAcceptCorpus();
  const decline = useDeclineCorpus();
  const revert = useRevertCorpus();
  const file = useCorpusFile();

  const [found, setFound] = useState<LookResult | null>(null);
  const [reading, setReading] = useState<{ path: string; now: string | null; next: string | null } | null>(null);

  const offer = found?.of === 'offer' ? found : null;

  return (
    <Page
      title="El criterio pedagógico"
      lede="Las recetas y las instrucciones con las que adapto. Vienen con Rampa, y cuando
            se corrige algo te lo traigo y lo lees antes de que lo use.">
      <Loaded from={state}>
        {(now) => (
          <>
            <Section title="Lo que estás usando">
              <p className="small">
                {now.version > 0
                  ? `Versión ${now.version}, ${now.source === 'bundled' ? 'la que vino con Rampa' : 'traída por ti'}.`
                  : 'La que vino con Rampa, de antes de que esto se numerara.'}
              </p>
              {/*
                Why it is this one, when something was passed over. A screen that could
                not say this would leave her looking at «versión 3» after accepting 4.
              */}
              {now.because === 'incomplete' ? (
                <Callout intent="decide" title="Una que aceptaste está a medias">
                  Se quedó incompleta al traerla, así que no la estoy usando: estoy con la
                  que vino con Rampa. Vuelve a traerla cuando quieras.
                </Callout>
              ) : now.because === 'unsupported' ? (
                <Callout intent="decide" title="Una que aceptaste es para una Rampa más nueva">
                  No la puedo leer sin arriesgarme a entenderla a medias, así que estoy con
                  la que vino con Rampa. Actualiza Rampa y volverá a valer.
                </Callout>
              ) : now.because === 'superseded-by-bundled' ? (
                <Callout intent="info" title="La que vino con esta Rampa es más nueva">
                  Tenías una traída de antes; esta versión de Rampa trae criterio más nuevo,
                  así que uso el suyo. Lo tuyo sigue guardado.
                </Callout>
              ) : null}
            </Section>

            <Section title="Traer el criterio más nuevo"
                     lede="Se conecta al repositorio del proyecto y me traigo lo que haya.
                           No se aplica nada hasta que lo leas y digas que sí.">
              <div className="row">
                <button className="btn" disabled={look.busy}
                        onClick={() => void look.run().then((r) => setFound(r ?? null))}>
                  {look.busy ? 'Mirando…' : 'Buscar correcciones'}
                </button>
              </div>
              {look.error ? <Callout intent="danger">{look.error.message}</Callout> : null}
              {found?.of === 'none' ? (
                <p className="small">No hay nada nuevo. Estás con lo último.</p>
              ) : null}
              {found?.of === 'refused' ? (
                <Callout intent="danger" title="No la he traído">{found.say}</Callout>
              ) : null}
            </Section>

            {offer ? (
              <Section title={`Versión ${offer.version}`}
                       lede="Esto es lo que dice que cambia. Puedes leer entero cualquier
                             fichero antes de decidir.">
                <p>{offer.summary}</p>

                {offer.findings.length ? (
                  /*
                   * Now that nothing is signed, this **is** the defence rather than
                   * defence in depth — so it is shown quoted and located, and nothing is
                   * removed or auto-skipped.
                   */
                  <Callout intent="decide" title="Léelo antes de aceptarla">
                    <p className="small">
                      He encontrado texto que parece hablarle al programa en vez de a ti.
                      No lo he quitado del fichero y no lo voy a obedecer, pero míralo.
                    </p>
                    <ul>
                      {offer.findings.map((f) => (
                        <li key={`${f.file}:${f.line}`} className="small">
                          <code>{f.file}</code>, línea {f.line}: <code>{f.quote}</code>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                ) : null}

                {offer.conflicts.length ? (
                  <Callout intent="info" title="Hay recetas tuyas que tocan esto">
                    <p className="small">
                      {offer.conflicts.join(', ')}. <strong>Las tuyas siguen ganando</strong>:
                      lo que tienes en tu carpeta se carga después y manda por encima de
                      esto. No tienes que hacer nada.
                    </p>
                  </Callout>
                ) : null}

                <p className="small">
                  {offer.changed.length === 0
                    ? 'No cambia ningún fichero de los que usas.'
                    : `Cambia ${offer.changed.length} ${offer.changed.length === 1 ? 'fichero' : 'ficheros'}:`}
                </p>
                <ul>
                  {offer.changed.map((path) => (
                    <li key={path} className="small">
                      <code>{path}</code>{' '}
                      <button className="btn btn-sm btn-ghost" disabled={file.busy}
                              onClick={() => void file.run(path).then((r) => setReading(r ?? null))}>
                        Leerlo
                      </button>
                    </li>
                  ))}
                </ul>

                {reading ? (
                  <details open>
                    <summary className="small"><code>{reading.path}</code></summary>
                    <p className="small"><strong>Lo que dice ahora:</strong></p>
                    <pre className="small" style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {reading.now ?? '(no lo tenías)'}
                    </pre>
                    <p className="small"><strong>Lo que diría:</strong></p>
                    <pre className="small" style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {reading.next ?? '(vacío)'}
                    </pre>
                  </details>
                ) : null}

                <div className="row gap2">
                  <button className="btn" disabled={accept.busy}
                          onClick={() => void accept.run().then(() => {
                            setFound(null); setReading(null); state.reload();
                          })}>
                    Usar esta versión
                  </button>
                  <button className="btn btn-ghost" disabled={decline.busy}
                          onClick={() => void decline.run().then(() => {
                            setFound(null); setReading(null);
                          })}>
                    Dejarlo como está
                  </button>
                </div>
                <p className="small">
                  Lo que ya has firmado no se toca: esto vale para lo que hagas a partir de
                  ahora, y cada informe dice con qué versión se hizo.
                </p>
              </Section>
            ) : null}

            {now.accepted.length ? (
              <Section title="Volver atrás"
                       lede="Cada versión que has aceptado se queda guardada. Volver es un
                             cambio de puntero, no una reinstalación.">
                <div className="row gap2" style={{ flexWrap: 'wrap' }}>
                  {now.accepted.map((v) => (
                    <button key={v} className="btn btn-sm" disabled={revert.busy || now.version === v}
                            onClick={() => void revert.run(v).then(() => state.reload())}>
                      {now.version === v ? `Versión ${v} (la que usas)` : `Volver a la ${v}`}
                    </button>
                  ))}
                  <button className="btn btn-sm" disabled={revert.busy || now.source === 'bundled'}
                          onClick={() => void revert.run(null).then(() => state.reload())}>
                    Volver a la que vino con Rampa
                  </button>
                </div>
              </Section>
            ) : null}
          </>
        )}
      </Loaded>
    </Page>
  );
}
