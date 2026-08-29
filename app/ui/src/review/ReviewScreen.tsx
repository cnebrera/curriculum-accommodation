import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { fromWire } from '../../../packages/core/src/errors.js';
import { Callout } from '../components/Callout.js';
import { ReportView, type Decision } from './ReportView.js';
import { DraftMark } from '../components/DraftMark.js';
import { ScopeQuestion } from './ScopeQuestion.js';

/**
 * Leads with the risky decisions, per checklists/review.md. The teacher reviews
 * decisions rather than re-reading prose, which is what makes the time saving
 * real — and it is where the errors that matter get caught.
 */
export function ReviewScreen({ jobId, learner, recipes }: { jobId: string; learner: string; recipes?: string[] }) {
  const { t: es } = useStrings();
  const [reportData, setReportData] = useState<{
    decisions: Decision[]; notDone: string[];
    memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  } | null>(null);
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
    void window.rampa.job.reportData(jobId, learner)
      .then(setReportData)
      .catch(() => setReportData(null));
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

  /**
   * Print. Whether the draft mark is on it is **not** this screen's decision
   * (007 FR-509) — the main process reads it from the document.
   *
   * It used to take a `signed` boolean and pass it through, which meant the
   * renderer could ask for an unmarked worksheet with no sign-off having
   * happened. Removed rather than left ignored, so nobody reads this call and
   * believes it still decides anything.
   */
  const render = async () => {
    setError(null);
    try {
      const r = await window.rampa.job.render(jobId, learner);
      setPhotocopy(r.photocopy ?? []);
      setPdfPath(await window.rampa.job.pdf(jobId, learner));
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
      setReportData(r.reportData ?? null);
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
    await render();
  };

  return (
    <div className="stack">
      <DraftMark signedOff={signedOff} />
      <h1>{es.review.title}{revision > 1 ? ` · versión ${revision}` : ''}</h1>

      {reportData
        ? <ReportView {...reportData} />
        : <Callout intent="info">Cargando el informe…</Callout>}

      {photocopy.length ? (
        <Callout intent="decide" title="En fotocopia esto se pierde">
          <ul>{photocopy.map((p, i) => <li key={i}>{p.message}</li>)}</ul>
        </Callout>
      ) : null}

      {error ? <Callout intent="danger">{error}</Callout> : null}

      {checklist ? (
        <details className="card card-plain">
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
            Lista de comprobación
          </summary>
          <div className="stack gap2" style={{ marginTop: 'var(--s3)' }}>
            {checklist.split('\n').filter((l) => l.trim().startsWith('- [')).map((l, i) => (
              <label className="check" key={i}>
                <input type="checkbox" />
                <span className="lbl">{l.replace(/^\s*- \[[ xX]\]\s*/, '')}</span>
              </label>
            ))}
          </div>
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
            <button className="btn btn-primary" disabled={revising} onClick={() => void revise()}>
              {revising ? 'Rehaciendo…' : 'Rehacer esta ficha con mis correcciones'}
            </button>
          </div>
        </div>
      ) : null}

      {editedOutside ? (
        <Callout intent="info" title="Has cambiado la ficha a mano">
          Perfecto: es tu fichero. Vuelve a generar el PDF para que salga con tus cambios.
        </Callout>
      ) : null}

      <div className="row">
        <button className="btn" onClick={() => void window.rampa.job.openForEditing(jobId, learner)}>
          Corregir a mano
        </button>
        <button className="btn" onClick={() => void render()}>{es.adapt.print}</button>
        {!signedOff
          ? <button className="btn btn-primary" onClick={() => void sign()}>{es.review.signOff}</button>
          : <span className="badge badge-accent">{es.review.signedOff}</span>}
      </div>

      {pdfPath ? <p className="small muted">Guardado en <code>{pdfPath}</code></p> : null}
    </div>
  );
}
