import { useState } from 'react';
import { Section, Field, Actions } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Loaded } from '../data/Loaded.js';
import {
  useCurrentSet, useChooseSet, useInspectSet, useUseSet, type SetInspection,
} from '../data/pictograms.js';

/**
 * Pointing Rampa at a pictogram set (018 T015, FR-1601/1602).
 *
 * ## What is deliberately not on this screen
 *
 * **A download button.** Not hidden, not behind a confirmation, not "we can fetch
 * it for you". ARASAAC's pictograms are CC BY-NC-SA and Rampa is Apache-2.0:
 * distributing them would hand every downstream user a restriction our licence says
 * they do not have. So this screen tells her what to fetch and from where, and she
 * goes and gets it — the same shape as `009`'s API key, where the relationship with
 * the third party is hers and we never stand between her and terms she should read.
 *
 * ## Why the licence text comes before the folder picker
 *
 * FR-1602, and the sharp half of it: **a sheet containing a pictogram is a
 * derivative work**, so her own adapted material inherits BY-NC-SA. That is a
 * condition on her work, and she is entitled to know it before she configures
 * anything rather than after she has built a term's worth of sheets on it.
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
  const [looked, setLooked] = useState<{ root: string; result: SetInspection } | null>(null);

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
                Rampa <strong>no trae los pictogramas y no los descarga</strong>. Los
                de ARASAAC son propiedad del Gobierno de Aragón, los hizo Sergio
                Palao, y tienen licencia <strong>CC BY-NC-SA</strong>. Los descargas
                tú de <code>arasaac.org</code> y aceptas esa licencia directamente.
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
              </ul>
            </Callout>

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
                    <button className="btn btn-primary" onClick={() => void confirm()}>
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
