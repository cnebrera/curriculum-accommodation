import { useEffect, useState } from 'react';
import { es } from '../i18n/es.js';
import { fromWire } from '../../../packages/core/src/errors.js';
import { Notice } from '../components/Notice.js';
import { ScopeQuestion } from './ScopeQuestion.js';

/**
 * Leads with the risky decisions, per checklists/review.md. The teacher reviews
 * decisions rather than re-reading prose, which is what makes the time saving
 * real — and it is where the errors that matter get caught.
 */
export function ReviewScreen({ jobId, learner, recipes }: { jobId: string; learner: string; recipes?: string[] }) {
  const [report, setReport] = useState('');
  const [checklist, setChecklist] = useState('');
  const [signedOff, setSignedOff] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photocopy, setPhotocopy] = useState<Array<{ message: string }>>([]);
  const [corrections, setCorrections] = useState<Array<{ text: string; scope: 'learner' | 'practice' | 'corpus' }>>([]);
  const [revising, setRevising] = useState(false);
  const [revision, setRevision] = useState(1);
  const [editedOutside, setEditedOutside] = useState(false);

  useEffect(() => {
    void window.rampa.vault.read(`material/${jobId}/${learner}/report.md`)
      .then((d: { content: string } | null) => setReport(d?.content ?? ''));
    void window.rampa.job.isSignedOff(jobId, learner).then(setSignedOff);
    // The checklist is corpus, not code: a teacher can correct what she is asked
    // to check without anyone touching the application.
    void window.rampa.corpus.checklist('review').then(setChecklist).catch(() => setChecklist(''));

    // She may fix two words in her own editor (T094). The vault watcher tells us,
    // and the report is rebuilt from the file rather than from what we remember.
    return window.rampa.vault.onChanged((path: string) => {
      if (path.includes(jobId) && path.endsWith('adapted.md')) setEditedOutside(true);
    });
  }, [jobId, learner]);

  const render = async (signed: boolean) => {
    setError(null);
    try {
      const r = await window.rampa.job.render(jobId, learner, signed);
      setPhotocopy(r.photocopy ?? []);
      setPdfPath(await window.rampa.job.pdf(jobId, learner, signed));
    } catch (e: unknown) {
      const { kind, message } = fromWire(e);
      setError(es.errors[kind] ?? message ?? es.errors['unknown']!);
    }
  };

  /**
   * The loop. She corrects, and the same worksheet comes back with the
   * correction applied — rather than her waiting until next week to find out
   * whether it landed. Every previous attempt is kept so she can compare.
   */
  const revise = async () => {
    setRevising(true); setError(null);
    try {
      const r = await window.rampa.job.revise(jobId, learner, corrections);
      setReport(r.report);
      setRevision(r.revision);
      setCorrections([]);
      setSignedOff(false);          // a new version is a new draft
    } catch (e: unknown) {
      const { kind, message } = fromWire(e);
      setError(es.errors[kind] ?? message ?? es.errors['unknown']!);
    } finally { setRevising(false); }
  };

  const sign = async () => {
    await window.rampa.job.signOff(jobId, learner, 'PT');
    setSignedOff(true);
    await render(true);
  };

  return (
    <div className="stack">
      <h1>{es.review.title}{revision > 1 ? ` · versión ${revision}` : ''}</h1>
      <Notice kind="warn">{es.review.lead}</Notice>

      <div className="card"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report}</pre></div>

      {photocopy.length ? (
        <Notice kind="warn" title="En fotocopia esto se pierde">
          <ul>{photocopy.map((p, i) => <li key={i}>{p.message}</li>)}</ul>
        </Notice>
      ) : null}

      {error ? <Notice kind="danger">{error}</Notice> : null}

      {checklist ? (
        <details>
          <summary>Lista de comprobación</summary>
          <div className="card"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{checklist}</pre></div>
        </details>
      ) : null}

      <ScopeQuestion learner={learner} recipes={recipes} onCaptured={(c) => setCorrections((prev) => [...prev, c])} />

      {corrections.length ? (
        <div className="card stack">
          <strong>Lo que me has corregido</strong>
          <ul style={{ margin: 0 }}>{corrections.map((c, i) => <li key={i}>{c.text}</li>)}</ul>
          <p className="small muted" style={{ margin: 0 }}>
            Ya lo he apuntado, así que la próxima ficha saldrá teniéndolo en cuenta.
            Si quieres, rehago <em>esta</em> ahora mismo.
          </p>
          <div>
            <button className="primary" disabled={revising} onClick={() => void revise()}>
              {revising ? 'Rehaciendo…' : 'Rehacer esta ficha con mis correcciones'}
            </button>
          </div>
        </div>
      ) : null}

      {editedOutside ? (
        <Notice kind="info" title="Has cambiado la ficha a mano">
          Perfecto: es tu fichero. Vuelve a generar el PDF para que salga con tus cambios.
        </Notice>
      ) : null}

      <div className="row">
        <button onClick={() => void window.rampa.job.openForEditing(jobId, learner)}>
          Corregir a mano
        </button>
        <button onClick={() => void render(signedOff)}>{es.adapt.print}</button>
        {!signedOff
          ? <button className="primary" onClick={() => void sign()}>{es.review.signOff}</button>
          : <span className="badge accent">{es.review.signedOff}</span>}
      </div>

      {pdfPath ? <p className="small muted">Guardado en <code>{pdfPath}</code></p> : null}
    </div>
  );
}
