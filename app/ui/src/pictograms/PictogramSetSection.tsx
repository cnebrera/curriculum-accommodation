import { useCallback, useState } from 'react';
import { Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import { Counted } from '../components/Progress.js';
import { useJobProgress, type Progress } from '../data/jobs.js';
import {
  useCurrentSet, useChooseSet, useInspectSet, useUseSet, usePublishers,
  useAcceptLicence, useWithdrawLicence, useFetchPictograms, useSetState,
  useCheckUpdate, useDeclineUpdate, useStopBringing,
  type SetInspection, type FetchResult, type UpdateStatus,
} from '../data/pictograms.js';

/**
 * Her pictogram set: bringing it, or pointing at one (018 T015; 023 T011/T015).
 *
 * ## The download, and why it took `023` to get here
 *
 * This screen used to say «Rampa no trae los pictogramas y no los descarga» and offer
 * one button: «Decirme dónde están». Carlos, twice: «no puedo decirle al usuario que
 * se tiene que bajar algo», and then «sigue sin haber un botón para descargar los
 * pictogramas».
 *
 * He was right, and the caution was in the wrong place — I had written `018` FR-1601
 * without reading ARASAAC's terms. They publish a **public, keyless API** for exactly
 * this, and their conditions require attribution and non-commercial use rather than
 * prohibiting software from fetching. What would be redistribution is **shipping**
 * them; what this does is fetch them to her disk on her instruction.
 *
 * ## Why the licence still comes first
 *
 * FR-2104/2105, and now it is not merely informative: **it is the gate**. Nothing is
 * requested from a publisher until the acceptance is recorded, and the check is in the
 * main process rather than in this component, because a gate in a component is a gate
 * the second caller walks past.
 *
 * The three claims in it were corrected on 2026-09-01 (G28) after reading the licence
 * text instead of remembering it. Two of them said more than CC BY-NC-SA says.
 */
export function PictogramSetSection({ compact = false }: {
  /**
   * Rendered inside the profile editor rather than as its own page section.
   *
   * That is where it belongs: the set is only needed once she has decided a learner
   * uses pictograms, and the requirement and the decision are the same moment. A
   * settings page she has to find first would mean turning the family on and
   * getting nothing, with no idea why.
   */
  compact?: boolean;
} = {}) {
  const current = useCurrentSet();
  const choose = useChooseSet();
  const inspect = useInspectSet();
  const use = useUseSet();
  const publishers = usePublishers();
  const accept = useAcceptLicence();
  const withdraw = useWithdrawLicence();
  const bring = useFetchPictograms();
  const [looked, setLooked] = useState<{ root: string; result: SetInspection } | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);
  const setState = useSetState();
  const check = useCheckUpdate();
  const decline = useDeclineUpdate();
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const stop = useStopBringing();
  /*
   * Live progress (`024` T012). The main process was already sending it and **nothing
   * was listening** — 2 min 45 s of «Trayéndolos…» with no bar, which is what Carlos
   * asked about. The thirteenth field in this project written by one place and read by
   * nobody, and the one I had already ticked off.
   */
  const [at, setAt] = useState<{ done: number; total: number } | null>(null);
  useJobProgress(useCallback((p: Progress) => {
    if (p.stage === 'Trayendo pictogramas' && typeof p.total === 'number') {
      setAt({ done: p.done ?? 0, total: p.total });
    }
  }, []));

  const pick = async (): Promise<void> => {
    const root = await choose.run();
    if (!root) return;
    const result = await inspect.run(root);
    if (result) setLooked({ root, result });
  };

  const confirm = async (): Promise<void> => {
    if (!looked) return;
    if (await use.run(looked.root)) { setLooked(null); current.reload(); }
  };

  /*
   * `013` FR-1105: exactly one control per screen may carry primary weight.
   *
   * In `compact` mode this section lives inside the profile editor, whose primary is
   * «Guardar» — so the two buttons added here must not compete with it. Seen in a
   * screenshot at 900px with `xlarge` text (023 T024): «Traer los pictogramas» and
   * «Guardar» both solid, which is two primaries and therefore none.
   *
   * As its own `Section` there is no rival, and the download is the point of the
   * screen, so there it stays primary.
   */
  const strong = compact ? 'btn' : 'btn btn-primary';

  const state = publishers.state === 'ready' ? publishers.value : null;
  const publisher = state?.publishers[0] ?? null;
  const accepted = state?.accepted ?? null;

  const say = async (yes: boolean): Promise<void> => {
    if (yes && publisher) { if (await accept.run(publisher.id)) publishers.reload(); }
    if (!yes) { if (await withdraw.run()) publishers.reload(); }
  };

  const fetchThem = async (): Promise<void> => {
    setAt({ done: 0, total: state?.expectedTotal ?? 0 });
    const got = await bring.run();
    setAt(null);
    if (got) { setResult(got); setUpdate(null); current.reload(); setState.reload(); }
  };

  const look = async (): Promise<void> => {
    const found = await check.run();
    if (found) setUpdate(found);
  };

  const notNow = async (highWater: string): Promise<void> => {
    if (await decline.run(highWater)) { setUpdate(null); setState.reload(); }
  };

  const have = setState.state === 'ready' ? setState.value : null;
  const status = update ?? have?.status ?? { state: 'unknown' as const };

  const body = (
    <Loaded from={current} busyLabel="Mirando si ya tienes un juego de pictogramas">
        {(set) => (
          <>
            {set && !set.missing ? (
              <Callout intent="ok" title="Tienes un juego configurado">
                <p>{set.summary}</p>
                <p className="small">Desde el {set.configuredOn}.</p>
              </Callout>
            ) : null}

            {set?.missing ? (
              /*
               * FR-1616's other half, said in her language. The sheets she already
               * made still work: where the drawing was, the word appears with a
               * marked gap — so this is a thing to fix, not a thing that broke.
               */
              <Callout intent="decide" title="No encuentro la carpeta de pictogramas">
                <p>
                  Estaba en <code>{set.root}</code> y ya no está ahí. Puede que la
                  hayas movido.
                </p>
                <p>
                  Las hojas que ya hiciste se siguen viendo: donde iba el dibujo
                  aparece la palabra y un hueco marcado. Vuelve a decirme dónde está
                  y se arreglan solas.
                </p>
              </Callout>
            ) : null}

            {/*
              The licence, before the picker. Not after — she is entitled to know
              that her own sheets inherit the licence before she builds a term of
              them on it.
            */}
            <Callout intent="decide" title="Lo que tienes que saber antes">
              <p>
                Los pictogramas de <strong>{publisher?.label ?? 'ARASAAC'}</strong> son
                propiedad del <strong>{publisher?.attribution.owner ?? 'Gobierno de Aragón'}</strong>,
                los hizo <strong>{publisher?.attribution.author ?? 'Sergio Palao'}</strong>, y
                tienen licencia <strong>{publisher?.licence ?? 'CC BY-NC-SA'}</strong>. Rampa
                los trae de <code>{(publisher?.site ?? 'https://arasaac.org').replace(/^https?:\/\//, '')}</code>{' '}
                cuando tú se lo pidas, y nunca por su cuenta. La licencia la aceptas tú.
              </p>
              {/*
                Corrected 2026-09-01, after reading the licence text instead of
                remembering it. Two of these three claimed more than CC BY-NC-SA says,
                and a sentence about licences on a teacher's screen gets read as fact.

                1 · «No comercial» was stated as a flat prohibition. The licence defines
                    it as «not primarily intended for or directed towards commercial
                    advantage or monetary compensation» — which is exactly what a
                    classroom is not. Her use was never the problem; **bundling them into
                    an Apache-2.0 repository** is, because that licence permits commercial
                    use and somebody could sell the result.

                2 · «Una hoja con un pictograma es obra derivada, así que hereda la misma
                    licencia» was the worse one. §3(b) applies ShareAlike to the **adapted
                    material**, not to the whole work containing it. Told a PT flatly, it
                    reads as «everything you make with this becomes restricted», which is
                    not what the licence says and is a reason not to use a legitimate
                    resource.

                Still marked for a legal read — Carlos asked for one and I am not a
                lawyer. What is written here now stays inside what the text says.
              */}
              <ul className="bullets">
                <li>
                  Son para uso <strong>educativo y sin ánimo de lucro</strong>, que es
                  para lo que ARASAAC los publica. Tu clase entra de lleno; venderlos, no.
                </li>
                <li>
                  Toda hoja que lleve un pictograma lleva la atribución. La pongo yo y
                  no se puede quitar: si se cayera, la hoja infractora sería la tuya.
                </li>
                <li>
                  Si <strong>modificas</strong> un pictograma, lo que salga de ahí va con
                  la misma licencia. Usarlo tal cual dentro de una ficha tuya no convierte
                  tu ficha en suya.
                </li>
                {/*
                  FR-2110, **corrected by `024`** — and found by looking at the screen
                  rather than by any test.

                  This said «salen palabras de tu ordenador, una por consulta», which
                  was true of `023` and is now false: `024` deleted the word-by-word
                  path, so what leaves is a language and a list of numbers. Leaving it
                  would have been an overstatement in the text her acceptance rests on,
                  which is the same class of mistake as backlog G28 — and this time in
                  the direction of claiming Rampa sends *more* than it does.
                */}
                <li>
                  Al traerlos, de tu ordenador <strong>no sale ninguna palabra</strong>:
                  le pido a {(publisher?.site ?? 'arasaac.org').replace(/^https?:\/\//, '')}{' '}
                  su lista completa y luego los dibujos por su número. Nunca el nombre de
                  un alumno, ni su código, ni su perfil, ni nada que identifique tu
                  ordenador.
                </li>
              </ul>
              {publisher?.licenceUrl ? (
                <p className="small">
                  El texto completo de la licencia: <code>{publisher.licenceUrl}</code>
                </p>
              ) : null}

              {/*
                **The gate** (FR-2104). Refusing is a real answer and stays a real
                answer: the folder picker below works either way, which is FR-2103 and
                also what happens if ARASAAC ever closes the API.
              */}
              {accepted ? (
                <Actions
                  note={`Aceptada el ${accepted.acceptedOn}. Lo que ya tienes en el disco es tuyo.`}>
                  <button className="btn btn-ghost" onClick={() => void say(false)}
                          disabled={withdraw.busy}>
                    Retirar mi aceptación
                  </button>
                </Actions>
              ) : (
                <Actions
                  primary={publisher ? (
                    <button className={strong} onClick={() => void say(true)}
                            disabled={accept.busy}>
                      Acepto la licencia
                    </button>
                  ) : undefined}
                  note={publisher
                    ? 'Hasta que la aceptes no pido nada a nadie.'
                    : 'No tengo de dónde traerlos. Puedes usar una carpeta que ya tengas.'} />
              )}
            </Callout>

            {/*
              **The button** (`024` FR-2201, T015).

              One press, no textarea. `023` had a box where she typed «casa, perro,
              comer» and Carlos said twice that this was the wrong thing to ask for —
              she does not know which words the next worksheet will contain. The whole
              catalogue is 13.802 pictograms, one indexed request and ~55 MB at the size
              the corpus asks for, all measured rather than guessed.

              And once it is complete this asks her for **nothing** (FR-2209): «que no
              me lo vuelva a preguntar salvo que haya una actualización».
            */}
            {accepted && publisher ? (
              <>
                {status.state === 'complete' && have?.inventory ? (
                  <Callout intent="ok" title="Ya los tienes">
                    <p>
                      {have.inventory.images.toLocaleString('es-ES')} dibujos de{' '}
                      {publisher.label}, desde el {have.inventory.broughtOn}. No hace
                      falta que bajes nada más.
                    </p>
                    <Actions note={check.busy ? 'Mirando…' : undefined}>
                      <button className="btn btn-ghost" onClick={() => void look()}
                              disabled={check.busy}>
                        ¿Hay pictogramas nuevos?
                      </button>
                    </Actions>
                  </Callout>
                ) : null}

                {status.state === 'update' ? (
                  <Callout intent="decide" title={`Hay ${status.added.toLocaleString('es-ES')} pictogramas nuevos`}>
                    <p>
                      {publisher.label} ha añadido dibujos desde que los bajaste. Sólo
                      pido los que faltan.
                    </p>
                    <Actions
                      primary={
                        <button className={strong} onClick={() => void fetchThem()}
                                disabled={bring.busy}>
                          {bring.busy ? 'Trayéndolos…' : 'Traer los nuevos'}
                        </button>
                      }>
                      <button className="btn btn-ghost"
                              onClick={() => void notNow(status.highWater)}
                              disabled={decline.busy}>
                        Ahora no
                      </button>
                    </Actions>
                  </Callout>
                ) : null}

                {status.state !== 'complete' && status.state !== 'update' ? (
                  <Field
                    help={status.state === 'incomplete'
                      ? `Te faltan ${status.missing.toLocaleString('es-ES')}. Sigo por `
                        + 'donde iba y no vuelvo a pedir los que ya tienes.'
                      /*
                        Both numbers from the corpus, and «55 MB» was hardcoded here
                        until a real download said 157. Two copies of one truth is the
                        defect this project has found six times, and this copy was the
                        one that would have told her the wrong thing.
                      */
                      : `Son unos ${state?.expectedTotal.toLocaleString('es-ES') ?? ''} `
                        + `dibujos y ocupan unos ${state?.expectedMegabytes ?? '?'} MB. `
                        + 'Se guardan con tus cosas de Rampa, así que tu copia de '
                        + 'seguridad los lleva. Puedes cerrar la ventana: sigo por donde '
                        + 'iba cuando vuelvas.'}>
                    <Actions
                      primary={
                        <button className={strong} onClick={() => void fetchThem()}
                                disabled={bring.busy}>
                          {bring.busy ? 'Trayéndolos…'
                            : status.state === 'incomplete' ? 'Seguir bajándolos'
                            : 'Traer los pictogramas'}
                        </button>
                      }
                      note={bring.error?.message} />
                  </Field>
                ) : null}
              </>
            ) : null}

            {/*
              The bar and the way out, together (`024` T012, FR-2118).

              `Counted` and not a spinner because the total is genuinely known — 13.802
              before the first image — so a real fraction is not a guess. And «Parar»
              because `fetchWholeSet` has accepted an `AbortSignal` since it was
              written and **nothing ever passed one**: «a fetch MUST be interruptible»
              was satisfied in the core and unreachable from here.
            */}
            {bring.busy && at ? (
              <Field help="Puedes parar cuando quieras: lo que ya ha llegado sirve, y si
                           vuelves a darle sigo por donde iba.">
                <Counted done={at.done} total={at.total} one="Dibujo" many="dibujos" />
                <Actions>
                  <button className="btn btn-ghost" onClick={() => void stop.run()}
                          disabled={stop.busy}>
                    Parar
                  </button>
                </Actions>
              </Field>
            ) : null}

            {result ? (
              <Callout intent={result.failed > 0 || result.stopped ? 'decide' : 'ok'}
                       title="Lo que he traído">
                {result.lines.map((l, i) => <p key={i}>{l}</p>)}
                <p className="small">Están en <code>{result.root}</code>.</p>
              </Callout>
            ) : null}

            {looked ? (
              <Callout intent={looked.result.ok ? 'ok' : 'danger'}
                       title={`He mirado la carpeta «${looked.result.folder}»`}>
                <p>{looked.result.summary}</p>
                {looked.result.problems.map((p, i) => <p key={i}>{p.message}</p>)}
                {looked.result.licence ? (
                  <p className="small">La carpeta trae su propio fichero de licencia.</p>
                ) : null}
                <Actions
                  primary={looked.result.ok ? (
                    <button className={strong} onClick={() => void confirm()}>
                      Usar este juego
                    </button>
                  ) : undefined}
                  note={looked.result.ok
                    ? undefined
                    : 'Con esta carpeta no puedo trabajar. Mira lo que pone arriba.'}>
                  <button className="btn btn-ghost" onClick={() => setLooked(null)}>
                    Dejarlo
                  </button>
                </Actions>
              </Callout>
            ) : (
              <Field
                help="Elige la carpeta donde los tengas. No la copio ni la modifico: la leo de donde esté.">
                <div className="row">
                  <button className="btn" onClick={() => void pick()} disabled={choose.busy}>
                    {set && !set.missing ? 'Cambiar de carpeta' : 'Decirme dónde están'}
                  </button>
                </div>
              </Field>
            )}
          </>
        )}
    </Loaded>
  );

  if (compact) {
    return (
      <div className="stack gap3">
        <h4>El juego de pictogramas</h4>
        {body}
      </div>
    );
  }

  return (
    <Section
      title="Pictogramas"
      lede="Para los alumnos que los usan. Ni se activan solos ni se los pongo a nadie por su perfil.">
      {body}
    </Section>
  );
}
