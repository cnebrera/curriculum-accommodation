import { useState } from 'react';
import { Callout } from '../components/Callout.js';
import { useCurrentSet } from '../data/pictograms.js';
import { Icon } from '../components/Icon.js';

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
export function LearnerPictograms({
  enabled, scope, overrides, onEnabled, onScope, onOverrides, onConfigure,
}: {
  enabled: boolean;
  scope: string;
  /**
   * «For this child, this word uses this drawing» (`018` FR-1612, decision P48).
   *
   * The first rung of the four-step precedence in `match.ts` — name → override →
   * vocabulary → the set's single answer — and the exception `024` FR-2215 keeps
   * deliberately. It was **«carried rather than surfaced»**: `ProfileEditor`
   * parked it in `_pictoOverrides` with no control to edit it, and `ChooseWord`
   * writes only to the global vocabulary. So a MUST of `018` was satisfiable only
   * by editing YAML by hand, and G30 — which recorded exactly that, «the override
   * is a field only a developer can set» — was closed «by `024`», which built the
   * vocabulary chooser and not this.
   */
  overrides: Record<string, string>;
  onEnabled: (on: boolean) => void;
  onScope: (scope: string) => void;
  onOverrides: (next: Record<string, string>) => void;
  /** Takes her to Configuración ▸ Pictogramas, and back afterwards (FR-2304). */
  onConfigure: () => void;
}) {
  const current = useCurrentSet();
  const missing = current.state === 'ready' && (!current.value || current.value.missing);
  const [word, setWord] = useState('');
  const [id, setId] = useState('');

  const add = (): void => {
    const w = word.trim().toLowerCase();
    const picture = id.trim();
    if (!w || !picture) return;
    onOverrides({ ...overrides, [w]: picture });
    setWord('');
    setId('');
  };

  const remove = (w: string): void => {
    const next = { ...overrides };
    delete next[w];
    onOverrides(next);
  };

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
          {/*
            The per-child exception (FR-1612, P48).

            Deliberately small and deliberately last: it is the rung she will use
            twice a year, for the word her school has its own picture for. The
            vault file stays the other editor — this is a control, not a
            replacement for it.

            An id and not a picture-picker, and that is honest rather than lazy:
            choosing between drawings is what `ChooseWord` is for, and it works
            over the words a report just flagged. This answers a different
            question — «my school uses *this* one for «recreo»» — where she
            already knows which.
          */}
          {!missing ? (
          <details className="field">
            <summary>
              Dibujos suyos para palabras concretas
              {Object.keys(overrides).length ? ` (${Object.keys(overrides).length})` : ''}
            </summary>
            <p className="field-help">
              Para cuando en su clase una palabra tiene <em>su</em> dibujo: manda
              sobre el vocabulario y sobre el juego, sólo para él.
            </p>

            {Object.keys(overrides).length ? (
              <ul className="pick-list" role="list">
                {Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b))
                  .map(([w, picture]) => (
                  <li key={w} className="row row-split">
                    <span className="small"><strong>{w}</strong> <Icon name="chevron-right" /> <code>{picture}</code></span>
                    <button type="button" className="btn btn-sm" onClick={() => remove(w)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="row gap2">
              <input className="input" aria-label="Palabra" placeholder="palabra"
                     value={word} onChange={(e) => setWord(e.target.value)} />
              <input className="input" aria-label="Número del dibujo" placeholder="nº del dibujo"
                     value={id} onChange={(e) => setId(e.target.value)} />
              <button type="button" className="btn btn-sm"
                      disabled={!word.trim() || !id.trim()} onClick={add}>
                Añadir
              </button>
            </div>
            <p className="field-help">
              El número está en el nombre del fichero, en la carpeta del juego.
            </p>
          </details>
          ) : null}

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
                  Traer los pictogramas <Icon name="chevron-right" />
                </button>
              </div>
            </Callout>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
