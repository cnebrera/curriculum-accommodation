import { useState } from 'react';
import { Callout } from '../components/Callout.js';
import {
  useSecondLook, useRequestReview, useOpenReview, useAcceptReview,
  type ReviewIn,
} from '../data/coordination.js';

/**
 * «¿Me lo miras antes de firmarlo?», on the screen where she signs (`030` US2).
 *
 * ## Why it lives here and not on a screen of its own
 *
 * Because it is a step **inside** reviewing a sheet, not a separate errand: she is
 * looking at the draft, she is about to sign it, and the question is whether somebody
 * else should see it first. A destination of its own would mean leaving the document to
 * ask about the document.
 *
 * ## Corrections beside the draft, never applied for her
 *
 * They arrive as text and are shown next to the sheet they are about. Applying one runs
 * **the correction path that already exists** — `job:revise`, which produces a new
 * revision and keeps the previous (`026` FR-2402). This feature adds no third way to
 * mutate a document, and that is a rule rather than a preference: a second mutation path
 * is a second set of guarantees, and the second one is the one nobody tests.
 */
export function SecondLook({ jobId, learner, onCorrections }: {
  jobId: string;
  learner: string;
  /** Hands the corrections to the screen's own «rehacer» flow. */
  onCorrections: (texts: string[]) => void;
}) {
  const recorded = useSecondLook(jobId, learner);
  const request = useRequestReview();
  const openReview = useOpenReview();
  const acceptReview = useAcceptReview();

  const [role, setRole] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<ReviewIn | null>(null);
  const [moved, setMoved] = useState<string | null>(null);

  const already = recorded.state === 'ready' ? recorded.value : null;

  return (
    <div className="card stack">
      <strong>¿Que la mire alguien antes de firmarla?</strong>

      {already ? (
        <>
          <p className="small">
            {already.by} la miró el {already.date}, sobre la revisión {already.revision}.
          </p>
          <ul className="flush">
            {already.corrections.map((c) => <li key={c} className="small">{c}</li>)}
          </ul>
          <div>
            <button className="btn btn-sm" onClick={() => onCorrections(already.corrections)}>
              Rehacerla con lo que dijo
            </button>
          </div>
        </>
      ) : null}

      <div className="row gap2 row-bottom">
        <label className="stack gap1">
          <span className="small">Tu papel, para quien la reciba</span>
          <input className="input input-sm" value={role}
                 placeholder="PT, tutora…"
                 onChange={(e) => setRole(e.target.value)} />
        </label>
        <button className="btn btn-sm" disabled={request.busy || role.trim() === ''}
                onClick={() => void request.run(jobId, learner, role)
                  .then((r) => setSent(r?.path ?? null))}>
          Preparar la hoja para que la mire
        </button>
        <button className="btn btn-sm" disabled={openReview.busy}
                onClick={() => void openReview.run(learner).then((r) => {
                  setIncoming(r?.review ?? null);
                  setMoved(r?.moved ?? null);
                })}>
          Traer lo que me ha contestado
        </button>
      </div>

      {request.error ? <Callout intent="danger">{request.error.message}</Callout> : null}
      {openReview.error ? <Callout intent="danger">{openReview.error.message}</Callout> : null}

      {sent ? (
        <p className="small">
          Ahí está: <code>{sent}</code>. Va con su marca de borrador, como la ves tú.
        </p>
      ) : null}

      {moved ? (
        /*
         * FR-2811. Declared, and the corrections still offered — attaching them to the
         * current revision is the one outcome where she would apply somebody's judgement
         * about a paragraph that has already changed.
         */
        <Callout intent="decide" title="Ojo con la versión">{moved}</Callout>
      ) : null}

      {incoming ? (
        <>
          <p className="small">
            {incoming.role} dice, sobre la revisión {incoming.revision}:
          </p>
          <ul className="flush">
            {incoming.corrections.map((c) => <li key={c} className="small">{c}</li>)}
          </ul>
          <div className="row gap2">
            <button className="btn btn-sm" disabled={acceptReview.busy}
                    onClick={() => void acceptReview
                      .run(learner, 'respuesta.md', incoming)
                      .then(() => { setIncoming(null); recorded.reload(); })}>
              Guardarlo con la hoja
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setIncoming(null)}>
              Dejarlo
            </button>
          </div>
          <p className="small">
            Guardarlo lo escribe al lado de la hoja, para que no se vuelva a decir lo
            mismo el trimestre que viene. Rehacerla es otra decisión.
          </p>
        </>
      ) : null}
    </div>
  );
}
