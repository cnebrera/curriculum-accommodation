import { Callout } from '../components/Callout.js';
import {
  useChosenSoFar, useChooseWord, useUnchooseWord, useAffectedSheets,
} from '../data/pictograms.js';
import { useState } from 'react';
import { Icon } from '../components/Icon.js';

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
  const affected = useAffectedSheets();
  const [warning, setWarning] = useState<
    { word: string; count: number; commit: () => void } | null>(null);

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

  const apply = async (word: string, id: string): Promise<void> => {
    if (await pick.run({ word, id, language })) {
      setChanged((c) => ({ ...c, [word]: id }));
    }
    setWarning(null);
  };

  /**
   * Ask first, change second (FR-2905).
   *
   * Every word on this screen **already has** a choice — that is what makes it her
   * vocabulary — so every change here is a change to something sheets may carry. A
   * first-ever choice needs no warning and is made elsewhere: no sheet records a drawing
   * for a word she has never chosen, so the count is zero by definition.
   */
  const choose = async (word: string, id: string): Promise<void> => {
    const found = await affected.run({ word, language, next: id });
    if (!found) return;
    setWarning({ word, count: found.count, commit: () => apply(word, id) });
  };

  /**
   * The count, before she commits (FR-2905) — **in the row she pressed in**.
   *
   * From the same deriver the record runs, with this one rung set to what she is about
   * to choose, so «N hojas» is the number the record will then show by construction
   * rather than by two functions agreeing.
   *
   * It was first rendered once at the top of the section, and looking at it (T022) was
   * what killed that: her vocabulary is as long as her year, so pressing «dejar de
   * elegir» on the thirtieth word put the answer off-screen — a button that appears to
   * do nothing. An answer belongs where the question was asked.
   */
  const warningFor = (word: string) => (warning?.word === word ? (
    <Callout intent="decide" title="Antes de cambiarlo">
      {warning.count === 0
        ? `Ninguna hoja usa el dibujo de «${warning.word}», así que esto no marca nada.`
        : `${warning.count} ${warning.count === 1 ? 'hoja usa' : 'hojas usan'} el `
          + `dibujo anterior de «${warning.word}». `
          + `${warning.count === 1 ? 'Quedará marcada' : 'Quedarán marcadas'} como `
          + 'desactualizada' + (warning.count === 1 ? '' : 's') + ' en el expediente.'}
      <div className="row gap2">
        <button className="btn" onClick={() => void warning.commit()}>
          Cambiarlo igualmente
        </button>
        <button className="btn btn-ghost" onClick={() => setWarning(null)}>
          Dejarlo como está
        </button>
      </div>
    </Callout>
  ) : null);

  return (
    <Callout intent="ok" title={`Tu vocabulario · ${rows.length} `
      + `${rows.length === 1 ? 'palabra' : 'palabras'}`}>
      <p>
        Lo que has elegido para las palabras con varios dibujos. Vale para todos tus
        alumnos, y puedes cambiarlo aquí.
      </p>
      {/*
        **The sentence is true now** (`031` FR-2907, SC-2904).

        For a year this paragraph said «todavía no sé avisarte de que están
        desactualizadas» — which was itself a correction of an earlier sentence that
        claimed the opposite and was a lie. `024` FR-2218 was claimed in a doc comment,
        in this text and in her own vault file, and implemented in none of the three.

        Both sentences are gone because the thing is built: sheets record which drawing
        each word got, the record derives staleness from that, and the count below comes
        from **the same function the record runs**. Text and behaviour share one source,
        which is what makes the G35 shape unmakeable here rather than merely fixed once.
      */}
      <p className="small">
        Si cambias uno, <strong>las hojas que ya hiciste se quedan con el dibujo
        anterior</strong> — y te aviso: aparecerán marcadas en su expediente. Si quieres
        que lleven el nuevo, vuelve a prepararlas.
      </p>
      {affected.error ? <p className="small">{affected.error.message}</p> : null}
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
                  {c.id === current ? <Icon name="check" className="door-check" /> : null}
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
                        /*
                         * Un-choosing warns too (FR-2905, and the spec's un-choose case).
                         *
                         * It is the change most easily assumed harmless — «sólo estoy
                         * quitando lo que elegí» — and it is the one where every sheet
                         * that used the word becomes stale, because the ladder will then
                         * answer nothing at all.
                         */
                        const found = await affected.run({
                          word: choice.word, language, next: null,
                        });
                        if (!found) return;
                        setWarning({
                          word: choice.word,
                          count: found.count,
                          commit: async () => {
                            if (await drop.run({ word: choice.word, language })) {
                              setDropped((d) => [...d, choice.word]);
                            }
                            setWarning(null);
                          },
                        });
                      })()}>
                Dejar de elegir «{choice.word}»
              </button>
            </div>
            {warningFor(choice.word)}
          </fieldset>
        );
      })}
      {pick.error ? <p role="alert">{pick.error.message}</p> : null}
    </Callout>
  );
}
