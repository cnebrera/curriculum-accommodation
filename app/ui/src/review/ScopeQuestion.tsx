import { useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { useNameCheck } from '../data/names.js';
import { useCaptureNote } from '../data/notes.js';

/**
 * One question, and NO DEFAULT (003 FR-201).
 *
 * "Don't split this" can mean not for this child, not in this school, or never.
 * Only she knows which, and guessing the third sends learner-specific
 * information into shared material — a privacy incident rather than a quality
 * problem. So there is no pre-selected option here, deliberately.
 */
type Scope = 'learner' | 'practice' | 'corpus';
type Destination = 'note' | 'avoid' | 'works';

export function ScopeQuestion({ learner, recipes, onCaptured }: {
  learner: string;
  /**
   * The recipes this run selected. Tagging a corpus-scope entry with them is
   * what makes it loadable again (T086) — the journal is filtered by recipe
   * intersection, so an untagged entry is never read a second time.
   */
  recipes?: string[];
  /** Receives the correction so the caller can re-run this worksheet with it. */
  onCaptured: (correction: { text: string; scope: Scope }) => void;
}) {
  const { t: es } = useStrings();
  const [text, setText] = useState('');
  const [scope, setScope] = useState<Scope | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [done, setDone] = useState(false);
  const [nameWarning, setNameWarning] = useState<string[]>([]);
  const nameCheck = useNameCheck();
  const captureNote = useCaptureNote();

  const capture = async () => {
    if (!scope || !text.trim()) return;
    if (scope === 'learner' && !destination) return;

    // Memory stays name-free at the source (T090): what she writes here is
    // stored and later sent, so it is checked before it is written, not after.
    const check = await nameCheck.run(text);
    if (!check) return;  // the failure is already on screen, in her language
    if (check.flagged.length && !nameWarning.length) { setNameWarning(check.flagged); return; }

    await captureNote.run({
      scope,
      learner: scope === 'learner' ? learner : undefined,
      destination: scope === 'learner' ? destination! : undefined,
      recipes: scope === 'corpus' ? (recipes ?? []) : undefined,
      heading: text.trim().slice(0, 40), text: text.trim(),
    });
    const captured = { text: text.trim(), scope };
    setDone(true); setText(''); setScope(null); setDestination(null); setNameWarning([]);
    onCaptured(captured);
  };

  if (done) return <Callout intent="info">{es.review.captured}</Callout>;

  return (
    <div className="card stack">
      <div>
        <label htmlFor="correction">¿Hay algo que haya hecho mal?</label>
        <textarea className="textarea" id="correction" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Escríbelo con tus palabras. Por ejemplo: las casillas se las cuenta como tareas." />
      </div>
      {text.trim() ? (
        <div className="stack">
          <strong>{es.review.scopeQuestion}</strong>
          <p className="small muted">{es.review.scopeWhy}</p>
          {/*
            `.segmented`, which already paints `[aria-pressed="true"]`.

            These carried `className={… ? 'primary' : ''}` — and **`.primary` has not
            existed since the v2 rewrite renamed it to `.btn .btn-primary`**. So the
            chosen scope was marked in the accessibility tree and nowhere on the screen:
            she picked one of three and all three looked the same.

            It survived because `styles.test.tsx` reads static `className="…"` only, so
            every conditional class — which is exactly where a selected state lives — was
            invisible to it. Fixed there too.
          */}
          <div className="segmented">
            <button aria-pressed={scope === 'learner'}
                    onClick={() => setScope('learner')}>{es.review.scopeLearner}</button>
            <button aria-pressed={scope === 'practice'}
                    onClick={() => setScope('practice')}>{es.review.scopePractice}</button>
            <button aria-pressed={scope === 'corpus'}
                    onClick={() => setScope('corpus')}>{es.review.scopeCorpus}</button>
          </div>
          {scope === 'learner' ? (
            <div className="stack">
              <strong>¿Dónde lo guardo?</strong>
              <div className="segmented">
                <button aria-pressed={destination === 'avoid'}
                        onClick={() => setDestination('avoid')}>En «lo que hay que evitar»</button>
                <button aria-pressed={destination === 'works'}
                        onClick={() => setDestination('works')}>En «lo que ya funciona»</button>
                <button aria-pressed={destination === 'note'}
                        onClick={() => setDestination('note')}>Solo como nota</button>
              </div>
              <p className="small muted">
                Lo que va al perfil cambia las adaptaciones de la próxima ficha. Una nota
                se queda como historia por si luego decides fijarla.
              </p>
            </div>
          ) : null}

          {/*
            The failure, in her language, where she is looking. `useCommand`
            decoded it; showing it is still the component's job, and before the
            data layer existed this branch did not exist either — a note that
            failed to save simply did not save, silently, and she found out the
            next time she adapted a worksheet and the correction was not there.
          */}
          {captureNote.error ? <Callout intent="danger" title="No he podido apuntarlo">{captureNote.error.message}</Callout> : null}
          {nameCheck.error ? <Callout intent="danger" title="No he podido comprobarlo">{nameCheck.error.message}</Callout> : null}

          {nameWarning.length ? (
            <Callout intent="danger" title="Creo que ahí hay un nombre">
              He visto <strong>{nameWarning.join(', ')}</strong>. Esto se guarda y luego se
              envía, así que mejor sin nombres: quítalo y vuelve a darle, o dale otra vez
              para guardarlo tal cual.
            </Callout>
          ) : null}

          <div>
            <button className="btn btn-primary"
                    disabled={!scope || (scope === 'learner' && !destination) || captureNote.busy}
                    aria-busy={captureNote.busy}
                    onClick={() => void capture()}>Apuntar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
