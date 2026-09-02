import { useState } from 'react';
import { Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useCurrentSet, useChooseSet, useInspectSet, useUseSet, usePublishers,
  useAcceptLicence, useWithdrawLicence, useFetchPictograms,
  type SetInspection, type FetchResult,
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
  const [words, setWords] = useState('');
  const [result, setResult] = useState<FetchResult | null>(null);

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
    const asked = words.split(/[\s,;\n]+/).filter(Boolean);
    if (asked.length === 0) return;
    const got = await bring.run(asked);
    if (got) { setResult(got); setWords(''); current.reload(); }
  };

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
                  FR-2110. She is entitled to know what leaves before it leaves, and
                  «una palabra por consulta» is the whole guarantee: `wordListOf`
                  removes the names Rampa knows, and the request carries nothing else —
                  no code, no perfil, no identificador.
                */}
                <li>
                  Al traerlos <strong>salen palabras de tu ordenador</strong>, una por
                  consulta, a {(publisher?.site ?? 'arasaac.org').replace(/^https?:\/\//, '')}.
                  Nunca el nombre de un alumno, ni su código, ni su perfil, ni nada que
                  identifique tu ordenador.
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
              **The button** (FR-2111, T015). Beside the folder picker, never instead
              of it.

              Words rather than «traerlo todo»: ARASAAC holds some fourteen thousand
              pictograms, and fetching all of them would be hundreds of megabytes of
              vocabulary no learner of hers will meet, in a download she has to
              babysit. The words of the material in front of her are the ones that
              make a sheet work.
            */}
            {accepted && publisher ? (
              <Field label="Traer pictogramas" htmlFor="picto-words"
                     help={`Escribe las palabras que necesitas, separadas por comas. Pido `
                       + `una por una, hasta ${state?.wordsPerFetch ?? 0} de golpe, y no `
                       + `vuelvo a pedir las que ya tengas.`}>
                {/* `htmlFor`/`id` paired: a label pointing at nothing is worse
                    than no label, because axe passes it and a screen reader does not. */}
                <textarea id="picto-words" className="input" rows={3} value={words}
                          placeholder="casa, perro, comer, colegio, agua"
                          onChange={(e) => setWords(e.target.value)} />
                <Actions
                  primary={
                    <button className={strong} onClick={() => void fetchThem()}
                            disabled={bring.busy || words.trim() === ''}>
                      {bring.busy ? 'Trayéndolos…' : 'Traer los pictogramas'}
                    </button>
                  }
                  note={bring.error?.message} />
              </Field>
            ) : null}

            {result ? (
              <Callout intent={result.outcome.found.length > 0 ? 'ok' : 'decide'}
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
