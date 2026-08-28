import { useEffect, useState } from 'react';
import { es } from '../i18n/es.js';
import { Notice } from '../components/Notice.js';
import { ScopeQuestion } from './ScopeQuestion.js';

/**
 * Leads with the risky decisions, per checklists/review.md. The teacher reviews
 * decisions rather than re-reading prose, which is what makes the time saving
 * real — and it is where the errors that matter get caught.
 */
export function ReviewScreen({ jobId, learner }: { jobId: string; learner: string }) {
  const [report, setReport] = useState('');
  const [signedOff, setSignedOff] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photocopy, setPhotocopy] = useState<Array<{ message: string }>>([]);

  useEffect(() => {
    void window.rampa.vault.read(`material/${jobId}/report.md`)
      .then((d: { content: string } | null) => setReport(d?.content ?? ''));
    void window.rampa.job.isSignedOff(jobId).then(setSignedOff);
  }, [jobId]);

  const render = async (signed: boolean) => {
    setError(null);
    try {
      const r = await window.rampa.job.render(jobId, learner, signed);
      setPhotocopy(r.photocopy ?? []);
      setPdfPath(await window.rampa.job.pdf(jobId, learner, signed));
    } catch (e: unknown) {
      const k = (e as { message?: string }).message ?? '';
      setError(es.errors[k] ?? k ?? es.errors['unknown']!);
    }
  };

  const sign = async () => {
    await window.rampa.job.signOff(jobId, 'PT');
    setSignedOff(true);
    await render(true);
  };

  return (
    <div className="stack">
      <h1>{es.review.title}</h1>
      <Notice kind="warn">{es.review.lead}</Notice>

      <div className="card"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report}</pre></div>

      {photocopy.length ? (
        <Notice kind="warn" title="En fotocopia esto se pierde">
          <ul>{photocopy.map((p, i) => <li key={i}>{p.message}</li>)}</ul>
        </Notice>
      ) : null}

      {error ? <Notice kind="danger">{error}</Notice> : null}

      <ScopeQuestion learner={learner} onCaptured={() => { /* captured into memory */ }} />

      <div className="row">
        <button onClick={() => void render(signedOff)}>{es.adapt.print}</button>
        {!signedOff
          ? <button className="primary" onClick={() => void sign()}>{es.review.signOff}</button>
          : <span className="badge accent">{es.review.signedOff}</span>}
      </div>

      {pdfPath ? <p className="small muted">Guardado en <code>{pdfPath}</code></p> : null}
    </div>
  );
}
