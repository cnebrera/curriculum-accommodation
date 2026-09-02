import { Callout } from '../components/Callout.js';
import { useChosenSoFar, useChooseWord } from '../data/pictograms.js';
import { useState } from 'react';

/**
 * What she has chosen (025 T008, FR-2308 — finishing `024` FR-2214).
 *
 * ## Why this had to exist
 *
 * `024` gave her a way to **answer** «which drawing is casa» — the chooser appears on a
 * report that has just skipped the word. It gave her no way to see what she had
 * answered or change her mind. So her vocabulary was a file she owned, that travelled
 * in a handover, and that she could not read from inside Rampa.
 *
 * That is the same half-built shape as `profile.pictograms.overrides`, which sat in the
 * schema from August with no screen at all — and it is the fifteenth time this project
 * has found a value written by one place and reachable by nobody.
 *
 * ## Why it lists her choices and not the whole set
 *
 * 13.802 pictograms is not a thing to review. What she has decided is — usually a
 * handful of words, growing as she meets them.
 */
export function MyVocabulary({ language = 'es' }: { language?: string }) {
  const chosen = useChosenSoFar(language);
  const pick = useChooseWord();
  const [changed, setChanged] = useState<Record<string, string>>({});

  if (chosen.state !== 'ready') return null;

  if (chosen.value.length === 0) {
    return (
      <Callout intent="info" title="Todavía no has elegido ningún dibujo">
        <p>
          Cuando una palabra tenga varios dibujos posibles te lo diré al preparar la
          hoja, y podrás elegir ahí mismo. Lo que elijas aparecerá aquí.
        </p>
      </Callout>
    );
  }

  const choose = async (word: string, id: string): Promise<void> => {
    if (await pick.run({ word, id, language })) {
      setChanged((c) => ({ ...c, [word]: id }));
    }
  };

  return (
    <Callout intent="ok" title={`Tu vocabulario · ${chosen.value.length} `
      + `${chosen.value.length === 1 ? 'palabra' : 'palabras'}`}>
      <p>
        Lo que has elegido para las palabras con varios dibujos. Vale para todos tus
        alumnos, y puedes cambiarlo aquí.
      </p>
      <p className="small">
        Si cambias uno, las hojas que ya hiciste quedan marcadas como desactualizadas:
        no las reescribo por mi cuenta.
      </p>
      {chosen.value.map((choice) => {
        const current = changed[choice.word] ?? choice.chosen;
        return (
          <fieldset className="fieldset-bare" key={choice.word}>
            <legend><strong>«{choice.word}»</strong></legend>
            <div className="picto-choices">
              {choice.candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={c.id === current ? 'picto-choice picto-choice-on' : 'picto-choice'}
                  /* Both, always — the 2026-09-01 defect was a state only a screen
                     reader could perceive. */
                  aria-pressed={c.id === current}
                  onClick={() => void choose(choice.word, c.id)}
                  disabled={pick.busy}>
                  {c.image
                    ? <img src={c.image} alt={`dibujo ${c.id} para «${choice.word}»`} />
                    : <span className="picto-choice-gap">falta el dibujo · {c.id}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      {pick.error ? <p role="alert">{pick.error.message}</p> : null}
    </Callout>
  );
}
