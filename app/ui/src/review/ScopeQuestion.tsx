import { useState } from 'react';
import { es } from '../i18n/es.js';
import { Notice } from '../components/Notice.js';

/**
 * One question, and NO DEFAULT (003 FR-201).
 *
 * "Don't split this" can mean not for this child, not in this school, or never.
 * Only she knows which, and guessing the third sends learner-specific
 * information into shared material — a privacy incident rather than a quality
 * problem. So there is no pre-selected option here, deliberately.
 */
export function ScopeQuestion({ learner, onCaptured }: {
  learner: string;
  /** Receives the correction so the caller can re-run this worksheet with it. */
  onCaptured: (correction: { text: string; scope: 'learner' | 'practice' | 'corpus' }) => void;
}) {
  const [text, setText] = useState('');
  const [scope, setScope] = useState<'learner' | 'practice' | 'corpus' | null>(null);
  const [done, setDone] = useState(false);

  const capture = async () => {
    if (!scope || !text.trim()) return;
    await window.rampa.memory.capture({
      scope, learner: scope === 'learner' ? learner : undefined,
      heading: text.trim().slice(0, 40), text: text.trim(),
    });
    const captured = { text: text.trim(), scope };
    setDone(true); setText(''); setScope(null);
    onCaptured(captured);
  };

  if (done) return <Notice kind="info">{es.review.captured}</Notice>;

  return (
    <div className="card stack">
      <div>
        <label htmlFor="correction">¿Hay algo que haya hecho mal?</label>
        <textarea id="correction" value={text} onChange={(e) => setText(e.target.value)}
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
          <div><button className="primary" disabled={!scope} onClick={() => void capture()}>Apuntar</button></div>
        </div>
      ) : null}
    </div>
  );
}
