import { useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { Notice } from '../components/Notice.js';
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

  if (done) return <Notice kind="info">{es.review.captured}</Notice>;

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
          <p className="small muted" style={{ margin: 0 }}>{es.review.scopeWhy}</p>
          <div className="row">
            <button aria-pressed={scope === 'learner'} className={scope === 'learner' ? 'primary' : ''}
                    onClick={() => setScope('learner')}>{es.review.scopeLearner}</button>
            <button aria-pressed={scope === 'practice'} className={scope === 'practice' ? 'primary' : ''}
                    onClick={() => setScope('practice')}>{es.review.scopePractice}</button>
            <button aria-pressed={scope === 'corpus'} className={scope === 'corpus' ? 'primary' : ''}
                    onClick={() => setScope('corpus')}>{es.review.scopeCorpus}</button>
          </div>
          {scope === 'learner' ? (
            <div className="stack">
              <strong>¿Dónde lo guardo?</strong>
              <div className="row">
                <button aria-pressed={destination === 'avoid'} className={destination === 'avoid' ? 'primary' : ''}
                        onClick={() => setDestination('avoid')}>En «lo que hay que evitar»</button>
                <button aria-pressed={destination === 'works'} className={destination === 'works' ? 'primary' : ''}
                        onClick={() => setDestination('works')}>En «lo que ya funciona»</button>
                <button aria-pressed={destination === 'note'} className={destination === 'note' ? 'primary' : ''}
                        onClick={() => setDestination('note')}>Solo como nota</button>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
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
          {captureNote.error ? <Notice kind="warn" title="No he podido apuntarlo">{captureNote.error.message}</Notice> : null}
          {nameCheck.error ? <Notice kind="warn" title="No he podido comprobarlo">{nameCheck.error.message}</Notice> : null}

          {nameWarning.length ? (
            <Notice kind="warn" title="Creo que ahí hay un nombre">
              He visto <strong>{nameWarning.join(', ')}</strong>. Esto se guarda y luego se
              envía, así que mejor sin nombres: quítalo y vuelve a darle, o dale otra vez
              para guardarlo tal cual.
            </Notice>
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
