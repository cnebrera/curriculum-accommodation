import { useState } from 'react';
import { Callout } from '../components/Callout.js';
import { useCandidates, useChooseWord, type WordChoice } from '../data/pictograms.js';

/**
 * The word with four pictures (024 T018, FR-2214/2216/2217).
 *
 * ## Why this screen is the difference between a feature and 55 MB
 *
 * `018` FR-1609 gives an ambiguous word **no** pictogram, and it is right: the child
 * reads the picture, she reads the text, and a wrong pictogram is worse than none —
 * she may never notice. But the first real fetch against ARASAAC returned 26 pictograms
 * for three words, so «most words» means «almost every word». Without somewhere to
 * answer, downloading the catalogue produces worksheets with nothing on them.
 *
 * `018` promised her the override in FR-1612 and `profile.pictograms.overrides` has
 * been in the schema since August — **carried by the profile editor and surfaced by
 * nobody.** This is that field finally having a screen, moved to where it belongs:
 * chosen once, used for every learner.
 *
 * ## Pictures, not ids
 *
 * FR-2217, and it is not a nicety. The candidates for «casa» are `6964`, `2483`,
 * `11251` and `28926`. Nobody can choose between those. The whole reason this feature
 * exists is that a pictogram is a picture the child already recognises, so the only
 * possible way to pick one is to look at it.
 *
 * ## And it stays optional
 *
 * FR-2216. If she does not choose, the sheet renders without that pictogram and says
 * so. This adds a way to answer the question; it does not answer it for her, and the
 * popularity order is a fact about downloads rather than a recommendation.
 */
export function ChooseWord({ words, language = 'es', onChosen }: {
  /** The ambiguous words to offer. Usually the ones a report just listed. */
  words: string[];
  language?: string;
  onChosen?: () => void;
}) {
  const candidates = useCandidates(words, language);
  const pick = useChooseWord();
  const [done, setDone] = useState<Record<string, string>>({});

  if (candidates.state !== 'ready' || candidates.value.length === 0) return null;

  const choose = async (choice: WordChoice, id: string): Promise<void> => {
    if (await pick.run({ word: choice.word, id, language })) {
      setDone((d) => ({ ...d, [choice.word]: id }));
      onChosen?.();
    }
  };

  /*
   * `title` and `lede` props were added here for a «what you have chosen» variant and
   * then `025` shipped `MyVocabulary` instead. No caller ever passed either, so they
   * were dead props — invisible to `props-are-read.test.ts`, which cannot see a prop
   * read *inside* a component. Removed.
   */
  return (
    <Callout intent="decide" title="Palabras con varios dibujos">
      <p>
        Estas palabras tienen más de un dibujo posible, así que <strong>no he puesto
        ninguno</strong>. Elige tú cuál usas: lo eliges una vez y vale para todos tus
        alumnos.
      </p>
      <p className="small">
        Si no eliges, la hoja sale sin ese dibujo y te lo digo. Un dibujo equivocado es
        peor que ninguno.
      </p>
      {candidates.value.map((choice) => {
        const current = done[choice.word] ?? choice.chosen;
        return (
          <fieldset className="fieldset-bare" key={choice.word}>
            <legend>
              <strong>«{choice.word}»</strong>
              {current ? <span className="badge badge-accent">elegido</span> : null}
            </legend>
            <div className="picto-choices">
              {choice.candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={c.id === current ? 'picto-choice picto-choice-on' : 'picto-choice'}
                  /*
                   * `aria-pressed` **and** a class. The defect on 2026-09-01 was a
                   * selected state that existed only in the accessibility tree —
                   * Carlos: «no me deja seleccionar». It did; it just never said so.
                   */
                  aria-pressed={c.id === current}
                  onClick={() => void choose(choice, c.id)}
                  disabled={pick.busy}>
                  {c.image
                    ? <img src={c.image} alt={`dibujo ${c.id} para «${choice.word}»`} />
                    /* The image has not arrived yet — `018` FR-1616's named gap, here
                       rather than on a worksheet. She can still see which id it is. */
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
