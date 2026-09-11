import { useState } from 'react';
import { Field } from '../shell/Page.js';
import { useMarkDef } from '../data/axes-defs.js';

/**
 * The mark, beside the axes and never inside them (033 T014, FR-3101/3102).
 *
 * ## Why it is not a row in the axis grid
 *
 * It would fit visually, and that is the problem. The ten axes describe barriers that
 * travel with a child between subjects and years; this is a state with a date on which it
 * stops being true. Rendered as an eleventh cell she would read it as an eleventh
 * barrier — and the whole reason this exists is that she was recording a transition as
 * `LIN: 2` and it stayed in his record after it stopped being true.
 *
 * ## Nothing is pre-filled, ever
 *
 * The languages are typed by her. Not from the country in her notes, not from his name,
 * not from where he was schooled. A guess would be right often enough to look like a
 * feature and wrong for the Amazigh speaker, the French-schooled child and the one whose
 * family speaks Spanish at home — and what would reach his sheet is a claim about him
 * that nobody made. `no-inferred-language.test.ts` holds that line in the code.
 *
 * ## 0 is a decision, and it is dated
 *
 * «Ya sigue la clase» is her observation that the barrier is over, kept with the date she
 * made it — which is why clearing the mark and setting it to 0 are different acts. The
 * date is written at save time by the editor: a real annotation date, never derived (P44).
 */
export function VehicularMark({ value, onChange }: {
  value?: { intensity: number; languages: string[]; noted_on: string } | undefined;
  onChange: (v: { intensity: number; languages: string[]; noted_on: string } | undefined) => void;
}) {
  const def = useMarkDef();
  const [typed, setTyped] = useState('');

  // No descriptor, no control. An unlabelled 0–3 row is something she would score against
  // without knowing what she was scoring — worse than a visible gap.
  if (!def) return null;

  const today = (): string => new Date().toISOString().slice(0, 10);
  const languages = value?.languages ?? [];

  const setIntensity = (n: number): void => {
    /*
     * Pressing the level it already has **clears** the mark, the way an axis does — and
     * that is different from setting it to 0. Clearing says «I should not have marked
     * this»; 0 says «it is over», and his record needs to be able to tell them apart.
     */
    if (value?.intensity === n) { onChange(undefined); return; }
    onChange({ intensity: n, languages, noted_on: today() });
  };

  const addLanguage = (): void => {
    const l = typed.trim();
    if (!l || languages.includes(l)) return;
    onChange({ intensity: value?.intensity ?? 1, languages: [...languages, l], noted_on: today() });
    setTyped('');
  };

  return (
    <div className="stack gap2">
      <h3>{def.name}</h3>
      <p className="small muted">
        Para un alumno que está aprendiendo el idioma del aula. <strong>No es una
        dificultad de lenguaje</strong>: es una barrera que se irá, y por eso está aquí y
        no entre los ejes. Si además tiene un trastorno del lenguaje, eso va en «Entender
        el texto».
      </p>

      <div className="axis-cell">
        <div className="small muted axis-level">
          {value === undefined ? 'Sin observar' : def.levels[value.intensity]}
        </div>
        <div className="levels">
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={value?.intensity === n}
                    title={def.levels[n]} onClick={() => setIntensity(n)}>{n}</button>
          ))}
        </div>
      </div>

      {value !== undefined ? (
        <Field label="¿Qué idiomas habla?" htmlFor="veh-idioma"
               help="Los pones tú. No los deduzco de dónde viene ni de cómo se llama: acertaría a menudo, y cuando fallara sería una afirmación sobre él que no ha hecho nadie.">
          <div className="row gap2">
            {languages.map((l) => (
              <button key={l} type="button" className="btn btn-sm"
                      aria-label={`Quitar ${l}`}
                      onClick={() => onChange({
                        intensity: value.intensity,
                        languages: languages.filter((x) => x !== l),
                        noted_on: today(),
                      })}>
                {l} ×
              </button>
            ))}
          </div>
          <div className="row gap2">
            <input className="input input-sm" id="veh-idioma"
                   value={typed} onChange={(e) => setTyped(e.target.value)} />
            {/* Named: the área control on this same screen has an «Añadir» too. */}
            <button type="button" className="btn" disabled={!typed.trim()}
                    aria-label="Añadir un idioma" onClick={addLanguage}>Añadir</button>
          </div>
        </Field>
      ) : null}

      {value?.intensity === 0 ? (
        <p className="small">
          Has apuntado que ya sigue la clase en el idioma del aula. Lo dejo escrito con la
          fecha: que la barrera existió y se acabó también es parte de su historia.
        </p>
      ) : null}
    </div>
  );
}
