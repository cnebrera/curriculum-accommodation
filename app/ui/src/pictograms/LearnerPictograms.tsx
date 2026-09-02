import { Callout } from '../components/Callout.js';
import { useCurrentSet } from '../data/pictograms.js';

/**
 * Pictograms, on a learner's page (025 T011, FR-2302/2303).
 *
 * ## What this is instead of
 *
 * A licence, four bullets of terms, a licence URL, an acceptance, a withdrawal, a
 * 157 MB download, a progress bar, a stop button, a folder picker and an update check —
 * all of which `023` and `024` put inside the profile **form**. Carlos: «sería mucho
 * más limpio que ensuciar con tantas cosas la hoja del alumno.»
 *
 * He is right, and the test answers itself: **none of that is about a child.** Iker's
 * profile should say Iker uses pictograms. It has no business carrying the Gobierno de
 * Aragón's licence terms.
 *
 * It is also `020`'s principle, which this project already learned once: the learner's
 * page had become a hub with six cards under a form, and Carlos said «no lo estás
 * pensando bien». Two specifications later I did it again, larger.
 *
 * ## Why the hint is here and not a tooltip
 *
 * FR-2302. A PT knows what a pictogram is; a tutor covering a class in March may not,
 * and this is a switch with a consequence for a child. `024`'s cost badge learned the
 * same lesson the hard way — «tu propia cuenta de IA» lived in a `title` attribute,
 * invisible on a touchpad and to a screen reader, and Carlos read the bare figure as a
 * commercial plan.
 *
 * ## Why the pointer only appears when the set is missing
 *
 * `018` put the whole thing in the form for a real reason: «turning the family on and
 * getting nothing, with no idea why». That failure is what this line prevents. When the
 * set is there, saying so would be one more line about something that is fine — and the
 * point of this component is that there are three lines and not thirty.
 */
export function LearnerPictograms({ enabled, scope, onEnabled, onScope, onConfigure }: {
  enabled: boolean;
  scope: string;
  onEnabled: (on: boolean) => void;
  onScope: (scope: string) => void;
  /** Takes her to Configuración ▸ Pictogramas, and back afterwards (FR-2304). */
  onConfigure: () => void;
}) {
  const current = useCurrentSet();
  const missing = current.state === 'ready' && (!current.value || current.value.missing);

  return (
    <fieldset className="fieldset-bare">
      <legend><h3>Pictogramas</h3></legend>
      <label className="check" htmlFor="pictos-on">
        <input type="checkbox" id="pictos-on" checked={enabled}
               onChange={(e) => onEnabled(e.target.checked)} />
        <span>Usa pictogramas</span>
      </label>
      {/*
        What a pictogram is, and when it helps — in two sentences, for whoever opens
        this in March. The «cuándo no» reasoning lives in `instructions/pictograms.md`
        where a PT can correct it; this is the reminder, not the rule.
      */}
      <p className="field-help">
        Son dibujos con un significado fijo, como los de su agenda o su panel de
        comunicación. Sólo si <strong>ya los usa</strong>: si lee, aunque sea despacio,
        le añaden trabajo.
      </p>

      {enabled ? (
        <>
          <div className="field">
            <label htmlFor="pictos-scope">Dónde</label>
            <select className="select" id="pictos-scope" value={scope}
                    onChange={(e) => onScope(e.target.value)}>
              <option value="vocabulary">Sólo en el vocabulario clave</option>
              <option value="instructions">Sólo en lo que hay que hacer</option>
              <option value="all">En todo</option>
            </select>
            <p className="field-help">
              «En todo» es para quien lee con pictogramas como vía principal. Es el caso
              menos frecuente.
            </p>
          </div>

          {/*
            The one line about the set, and only when it is the thing stopping her
            (FR-2303). One way to fix it, not two.
          */}
          {missing ? (
            <Callout intent="decide" title="No tienes el juego de pictogramas">
              <p>
                Lo has activado para este alumno, pero todavía no tengo los dibujos, así
                que sus hojas saldrán con la palabra y un hueco marcado donde iría cada
                uno.
              </p>
              <p className="small">
                Se trae una vez y vale para todos tus alumnos.
              </p>
              <div className="row">
                <button type="button" className="btn" onClick={onConfigure}>
                  Traer los pictogramas →
                </button>
              </div>
            </Callout>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
