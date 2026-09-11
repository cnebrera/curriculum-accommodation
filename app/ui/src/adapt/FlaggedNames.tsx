import { useEffect, useState } from 'react';
import { useUnknownNames, useIgnoreWord } from '../data/names.js';

/**
 * The way out of a flagged name (021, from use).
 *
 * ## The dead end this replaces
 *
 * `name-unconfirmed` stops a run and says «dime si es un alumno y lo sustituyo por su
 * código, o márcalo como que no es un nombre». Until now there was **nowhere to say
 * either**: `names:ignore` was exposed over IPC, had a hook in the data layer, and no
 * screen called it. The only control offered was «intentarlo otra vez», which repeats
 * exactly what just failed.
 *
 * Carlos walked into it: «no entiendo este mensaje que me ha salido».
 *
 * ## Why only one of the two answers is here
 *
 * «It is not a name» is one click — the word joins the ignore list and the run can
 * proceed. «It **is** a learner» is not: it means she has written a child's name in her
 * own notes, and the fix is to replace it with his code in the text she wrote. Rampa must
 * not do that silently — `003` puts her in charge of what her notes say, and a tool that
 * rewrites a teacher's own words is a tool she stops trusting.
 *
 * So this offers the click, and for the other case it says plainly what to do and where.
 * Doing less than the error promised would be worse than saying so.
 */
export function FlaggedNames({ learner, onResolved }: {
  learner: string;
  /** She resolved everything, so the run is worth trying again. */
  onResolved: () => void;
}) {
  const unknown = useUnknownNames();
  const ignore = useIgnoreWord();
  const [words, setWords] = useState<string[] | null>(null);

  useEffect(() => {
    void unknown.run(learner).then((w) => { if (w) setWords(w); });
    // Once, for this learner. Re-running on every render would rescan the journal.
  }, [learner]);

  const dismiss = async (word: string): Promise<void> => {
    await ignore.run(word);
    const left = (words ?? []).filter((w) => w !== word);
    setWords(left);
    // Nothing left to resolve, so the run can be tried again — offered, never automatic:
    // it costs money and the decision is hers (`005` FR-520's rule, same principle).
    if (left.length === 0) onResolved();
  };

  if (words === null) return <p className="small">Un momento, que miro tus notas…</p>;

  if (words.length === 0) {
    return (
      <div className="row">
        <button className="btn btn-sm" onClick={onResolved}>Intentarlo otra vez</button>
      </div>
    );
  }

  return (
    <div className="stack gap2">
      <span className="small">
        {words.length === 1 ? 'Esta palabra parece un nombre:' : 'Estas palabras parecen nombres:'}
      </span>
      <div className="stack gap2">
        {words.map((w) => (
          <div className="row gap2" key={w}>
            <strong>{w}</strong>
            <button className="btn btn-sm" disabled={ignore.busy}
                    onClick={() => void dismiss(w)}>
              No es un nombre de alumno
            </button>
          </div>
        ))}
      </div>
      {/*
        The other half, said rather than done. Rewriting what she wrote in her own notes
        is not Rampa's to do (`003`), and pretending otherwise would be worse than being
        clear about it.
      */}
      <p className="small">
        Si <strong>sí</strong> es un alumno tuyo, cámbialo por su código en tus notas
        —&nbsp;están en tu carpeta, en <code>profiles/</code>&nbsp;— y vuelve a intentarlo.
        No te las reescribo yo: son tuyas.
      </p>
      {ignore.error ? <p className="small">{ignore.error.message}</p> : null}
    </div>
  );
}
