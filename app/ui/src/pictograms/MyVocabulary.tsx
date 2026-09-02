import { Callout } from '../components/Callout.js';
import { useChosenSoFar, useChooseWord, useUnchooseWord } from '../data/pictograms.js';
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
  const drop = useUnchooseWord();
  const [changed, setChanged] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<string[]>([]);

  if (chosen.state !== 'ready') return null;
  const rows = chosen.value.filter((c) => !dropped.includes(c.word));

  if (chosen.value.length === 0 || rows.length === 0) {
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
    <Callout intent="ok" title={`Tu vocabulario · ${rows.length} `
      + `${rows.length === 1 ? 'palabra' : 'palabras'}`}>
      <p>
        Lo que has elegido para las palabras con varios dibujos. Vale para todos tus
        alumnos, y puedes cambiarlo aquí.
      </p>
      {/*
        The truth, after an independent review found the previous sentence was a lie.
        It said «las hojas que ya hiciste quedan marcadas como desactualizadas», and
        **nothing did that**: staleness compares the fingerprint of `ir.md`, and changing
        a pictogram choice does not touch `ir.md`. `024` FR-2218 was claimed in a doc
        comment, in this sentence, and in her own vault file — implemented in none of
        the three.

        Saying what actually happens is not a smaller promise than the false one; it is
        the only one that leaves her able to act. FR-2218 is reopened as backlog G35
        with the design, because `data-picto` already records word→id per block and the
        answer is computable — it is just not written.
      */}
      <p className="small">
        Si cambias uno, <strong>las hojas que ya hiciste no cambian</strong>: se quedan
        con el dibujo anterior y todavía no sé avisarte de que están desactualizadas. Si
        quieres que lleven el nuevo, vuelve a prepararlas.
      </p>
      {rows.map((choice) => {
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
            {/*
              Undoing it (`024` `unchooseWord`, given a caller by `025`). Not a
              destructive action — the word simply goes back to being reported as
              ambiguous next time, which is `018` FR-1609's ordinary state.
            */}
            <div className="row">
              <button type="button" className="btn btn-ghost" disabled={drop.busy}
                      onClick={() => void (async () => {
                        if (await drop.run({ word: choice.word, language })) {
                          setDropped((d) => [...d, choice.word]);
                        }
                      })()}>
                Dejar de elegir «{choice.word}»
              </button>
            </div>
          </fieldset>
        );
      })}
      {pick.error ? <p role="alert">{pick.error.message}</p> : null}
    </Callout>
  );
}
