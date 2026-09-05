import { useState } from 'react';
import { Page, Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import { EnsayoFrame } from './EnsayoFrame.js';
import {
  useEnsayoReading, useEnsayoAdaptation, useWouldCost, useCheckNames, useAdvanceEnsayo,
  useSignEnsayo, useRenderEnsayo,
} from '../data/ensayo.js';

/**
 * The first night, rehearsed (035 T013-T016, FR-3301/3303/3305/3307/3311).
 *
 * ## What she is actually learning
 *
 * Not «what buttons Rampa has». Four things, in the order they will matter to her:
 *
 * 1. **What a good profile looks like** — the invented learner is her first example, and
 *    it leaves axes out rather than scoring all ten, because that is the habit.
 * 2. **That the reading has to be checked.** The sample has one authored flaw in it and
 *    finding it is the point: a flawless example teaches her that this screen is a
 *    formality, which is the one thing it must not be.
 * 3. **That the report is where the honesty is** — what was changed, what was not, and
 *    what she has to look at herself.
 * 4. **What it would have cost.** The fear the cost display exists to end, met before she
 *    has spent anything.
 *
 * ## Everything real except the two paid steps
 *
 * The reading and the adaptation are served from the authored sample. Everything else —
 * the verification screen, the name gate, the review, the signature, the print — is the
 * real code running over the rehearsal vault. She is not being shown a mock-up; she is
 * using the application with two steps pre-answered.
 */
/**
 * Markdown shown on a screen, with its marks taken off.
 *
 * The documents are Markdown because that is what is on disk and what she can edit in her
 * own editor — but `**Material de ejemplo.**` and `# Informe` printed with their asterisks
 * and hash on the very first screen she sees is Rampa showing its own syntax to somebody
 * deciding whether this is a serious tool. `031` made the same correction to a sentence
 * lifted out of a report; this is the same fix, one screen earlier.
 *
 * Presentation only: the file keeps its marks, and the printed sheet renders them properly
 * because the renderer does that job.
 */
const plain = (md: string): string => md
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/\*\*/g, '')
  .replace(/^-\s+/gm, '· ');

export function EnsayoScreen({ startedAt, onLeave }: {
  startedAt: string;
  onLeave: () => void;
}) {
  const reading = useEnsayoReading(startedAt);
  const adaptation = useEnsayoAdaptation(startedAt);
  const wouldCost = useWouldCost();
  const checkNames = useCheckNames();
  const advance = useAdvanceEnsayo();
  const sign = useSignEnsayo();
  const render = useRenderEnsayo();
  const [signed, setSigned] = useState(false);
  const [printed, setPrinted] = useState(false);

  const [step, setStep] = useState<'reading' | 'adapted'>('reading');
  const [note, setNote] = useState('');
  const [nameFound, setNameFound] = useState<string[] | null>(null);

  /**
   * The name gate, before the (simulated) adaptation — and the second half said out loud.
   *
   * The real detector, over what she typed. On a real run this is what stops the request;
   * here there is no request to stop, and saying so is the point: she learns that Rampa
   * asks **before** sending, not that Rampa sometimes asks.
   */
  const goOn = async (force = false): Promise<void> => {
    /*
     * `force` is what «seguir de todas formas» means, and it has to be a parameter.
     *
     * The first version cleared the warning and called this again — which re-ran the
     * detector over the same note, found the same name and put the warning straight back.
     * The button looked like it did nothing. It is the exact shape of a confirmation that
     * cannot be confirmed, and the e2e walk is what found it: clicking through the flow
     * is not something a unit test does.
     */
    if (!force && note.trim()) {
      const found = await checkNames.run(note);
      if (found && found.found.length > 0) { setNameFound(found.found); return; }
    }
    setNameFound(null);
    await advance.run('adapted');
    setStep('adapted');
  };

  return (
    <EnsayoFrame onLeave={onLeave}>
      <Page
        title="Un ejemplo, de principio a fin"
        lede="Te enseño lo que hago con una hoja inventada y un alumno que no existe. No hace falta que conectes nada.">

        {step === 'reading' ? (
          <>
            {/*
              Real and simulated, told apart in her language (T023, FR-3309).

              The rehearsal must never claim more than the product — and never **less**.
              Two of the steps are pre-answered because they would cost money; the rest of
              what she is about to use works exactly like this with no key at all, and a
              teacher who leaves thinking the whole thing needs a subscription has been
              told less than the truth.
            */}
            <Callout intent="info" title="Qué es de verdad y qué está simulado aquí">
              <p>
                <strong>Simulados</strong>: leer la foto y adaptar la hoja. Son los dos
                pasos que le pido a la IA, así que aquí te los traigo escritos. Con tu
                clave, en esos dos sitios trabajaría la IA de verdad.
              </p>
              <p>
                <strong>De verdad, y sin clave</strong>: todo lo demás. Los perfiles, el
                expediente, comprobar la lectura, el aviso de nombres, firmar, imprimir,
                y las agendas y secuencias con pictogramas. Eso ya te funciona hoy aunque
                no conectes nada.
              </p>
            </Callout>

            <Section title="Esto es lo que he leído de la foto"
                     lede="Antes de adaptar nada, comprueba que lo he leído bien. Aquí es donde se arreglan las cosas, no en la hoja del niño.">
              <Loaded from={reading}>
                {(value) => (
                  <>
                    {/*
                      The flaw, pointed at without being solved for her. Telling her which
                      line is wrong would teach her that Rampa knows — and if Rampa knew,
                      this screen would not need to exist. What it says is what to look
                      for.
                    */}
                    <Callout intent="decide" title="Mira una cosa">
                      <p>
                        En esta hoja hay <strong>algo que he leído mal</strong>. Léela
                        entera y compárala con la foto: es exactamente lo que tendrás que
                        hacer cuando traigas una tuya, y es rápido.
                      </p>
                    </Callout>
                    {/*
                      Her text, block by block — never the stored file. Looking at it is
                      what caught the first version showing `--- source: photos ---` and
                      `::: {#b1 .instruction}`: on the first screen of her first night,
                      that teaches her that what Rampa makes is a soup of syntax.
                    */}
                    <div className="material" lang="es">
                      {(value?.blocks ?? []).map((b) => (
                        <p key={b.id} style={{ margin: '0 0 .6em' }}>{plain(b.text)}</p>
                      ))}
                    </div>
                  </>
                )}
              </Loaded>
            </Section>

            <Section title="¿Le apuntas algo?"
                     lede="Lo que escribas aquí lo tendría en cuenta al adaptar. Pruébalo: escribe una nota con el nombre de un compañero.">
              <Field canvas htmlFor="nota" label="Una nota sobre él">
                <textarea className="input" id="nota" rows={3} value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Por ejemplo: se distrae si se sienta al lado de Mateo" />
              </Field>

              {nameFound ? (
                /*
                 * FR-3311. The gate she will meet on her first real note, met here where
                 * it costs nothing — **and** the half that is only true in a rehearsal:
                 * nothing was sent, because there is nowhere to send it.
                 */
                <Callout intent="decide" title="Hay un posible nombre en lo que has escrito">
                  <p>
                    <strong>{nameFound.join(', ')}</strong>. En un pase de verdad me habría
                    parado aquí: te preguntaría si es un alumno para sustituirlo por su
                    código antes de mandar nada.
                  </p>
                  <p className="small">
                    Ahora mismo no he mandado nada a ninguna parte, y no porque me haya
                    parado: es que en el ensayo no hay a dónde mandarlo.
                  </p>
                  <div className="row gap2">
                    <button className="btn" onClick={() => void goOn(true)}>
                      Seguir de todas formas
                    </button>
                    <button className="btn btn-ghost" onClick={() => setNameFound(null)}>
                      Lo cambio
                    </button>
                  </div>
                </Callout>
              ) : null}
            </Section>

            <Actions
              primary={
                <button className="btn btn-primary" onClick={() => void goOn()}>
                  Adaptarla para él
                </button>
              }
              note="En un pase de verdad, esto es lo que costaría dinero." />
          </>
        ) : (
          <>
            <Callout intent="info" title="Este paso estaba simulado">
              <p>
                La hoja de abajo te la traigo escrita: es lo que la IA habría contestado.
                Con tu clave, aquí es donde habría trabajado de verdad — y lo que viene
                después (revisarla, firmarla, imprimirla) es lo mismo en los dos casos.
              </p>
            </Callout>

            <Section title="Así se la he adaptado"
                     lede="Ésta es la hoja que le darías. Fíjate en que dice que es un ejemplo: eso lo lleva el documento, así que también sale impreso.">
              <Loaded from={adaptation}>
                {(value) => (
                  <div className="material" lang="es">
                    {(value?.blocks ?? []).map((b) => (
                      <p key={b.id} style={{ margin: '0 0 .6em' }}>{plain(b.text)}</p>
                    ))}
                  </div>
                )}
              </Loaded>
            </Section>

            <Section title="Y por qué he hecho cada cosa"
                     lede="Esto es lo que de verdad tienes que leer: qué he cambiado, qué no he tocado, y qué tienes que mirar tú.">
              <Loaded from={adaptation}>
                {(value) => (
                  <div className="material" lang="es">{plain(value?.report ?? '')}</div>
                )}
              </Loaded>
            </Section>

            {/*
              FR-3303, in `006` FR-403's register: what it **would** have cost, before she
              has spent anything. The fear the cost display exists to end, met while the
              answer is «nada todavía».
            */}
            {/*
              The last two steps, and both are the real ones (T014).
              
              She signs and she prints, through the existing sign-off and the existing
              renderer pointed at the rehearsal root. The mark comes off the sheet because
              a person read it — and the printed page still says «material de ejemplo»,
              because the **document** says so and no renderer had to be told.
            */}
            <Section title="Lo último: firmarla e imprimirla"
                     lede="En Rampa una firma quiere decir que alguien la ha leído. Aquí es la misma firma de verdad, sobre la hoja de ejemplo.">
              <div className="row gap2" style={{ flexWrap: 'wrap' }}>
                <button className="btn" disabled={sign.busy || signed}
                        onClick={() => void sign.run(startedAt, 'la PT').then((r) => {
                          if (r) setSigned(true);
                        })}>
                  {signed ? 'Firmada' : 'Firmar la hoja'}
                </button>
                <button className="btn" disabled={render.busy}
                        onClick={() => void render.run(startedAt).then((r) => {
                          if (r) setPrinted(true);
                        })}>
                  Prepararla para imprimir
                </button>
              </div>
              {signed ? (
                <p className="small">
                  Ya no dice «borrador»: la marca sale del documento, y la quita una firma
                  y nada más. En un pase de verdad sería exactamente esto.
                </p>
              ) : null}
              {printed ? (
                <p className="small">
                  Hecha. Sigue diciendo <strong>«material de ejemplo»</strong> en la hoja,
                  porque eso lo lleva el documento — no la pantalla que lo imprimió.
                </p>
              ) : null}
            </Section>

            <Loaded from={wouldCost}>
              {(cost) => (
                <Callout intent="info" title="Lo que habría costado">
                  <p>
                    Si esto hubiera sido un pase de verdad, habría costado{' '}
                    <strong>unos {cost.readCents + cost.adaptCents} céntimos</strong>: unos{' '}
                    {cost.readCents} por leer la foto y unos {cost.adaptCents} por
                    adaptarla. Es una estimación con los precios de hoy —{' '}
                    <strong>no te he cobrado nada</strong> y esto no aparece en tu gasto
                    del mes.
                  </p>
                </Callout>
              )}
            </Loaded>
          </>
        )}
      </Page>
    </EnsayoFrame>
  );
}
