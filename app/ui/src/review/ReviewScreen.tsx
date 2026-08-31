import { useCallback, useEffect, useState } from 'react';
import { Page } from '../shell/Page.js';
import { useReportDataCommand, useSignedOffCommand, useRender, usePdf, useOdt, useRevise, useSignOff, useOpenForEditing } from '../data/jobs.js';
import { useChecklistCommand } from '../data/corpus.js';
import { useVaultChanged } from '../data/vault.js';
import { useNames } from '../data/names.js';
import { useStrings } from '../i18n/context.js';
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
  const [odtPath, setOdtPath] = useState<string | null>(null);
  const [photocopy, setPhotocopy] = useState<Array<{ message: string }>>([]);
  const [corrections, setCorrections] = useState<Array<{ text: string; scope: 'learner' | 'practice' | 'corpus' }>>([]);
  const [revision, setRevision] = useState(1);
  const [editedOutside, setEditedOutside] = useState(false);
  const reportDataFor = useReportDataCommand();
  const signedOffFor = useSignedOffCommand();
  const checklist_ = useChecklistCommand();
  const renderJob = useRender();
  const pdf = usePdf();
  const odt = useOdt();
  const reviseJob = useRevise();
  const signOff = useSignOff();
  const openForEditing = useOpenForEditing();
  /*
   * Whose sheet this is (005 FR-513).
   *
   * The title said «Revisa y firma» and nothing else, which was fine while one
   * worksheet meant one sheet. With three learners adapted from one worksheet,
   * three review screens differ only in their content — and the same worksheet
   * three times over is exactly the situation where a teacher signs the wrong
   * one. The name is display only, resolved locally, never written.
   */
  const names = useNames();
  const who = (names.state === 'ready' ? names.value[learner] : undefined) ?? learner;
  const revising = reviseJob.busy;
  const error = renderJob.error?.message ?? pdf.error?.message
    ?? reviseJob.error?.message ?? signOff.error?.message ?? null;

  useEffect(() => {
    void reportDataFor.run(jobId, learner).then((d) => setReportData((d ?? null) as typeof reportData));
    void signedOffFor.run(jobId, learner).then((v) => setSignedOff(Boolean(v)));
    // The checklist is corpus, not code: a teacher can correct what she is asked
    // to check without anyone touching the application.
    void checklist_.run('review').then((c) => setChecklist(String(c ?? '')));
  }, [jobId, learner]);

  // She may fix two words in her own editor (T094). The vault watcher tells us,
  // and the report is rebuilt from the file rather than from what we remember.
  useVaultChanged(useCallback((path: string) => {
    if (path.includes(jobId) && path.endsWith('adapted.md')) setEditedOutside(true);
  }, [jobId]));

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
    const r = await renderJob.run(jobId, learner);
    if (!r) return;
    setPhotocopy(r.photocopy ?? []);
    const path = await pdf.run(jobId, learner);
    if (path !== undefined) setPdfPath(path);
  };

  /**
   * The loop. She corrects, and the same worksheet comes back with the
   * correction applied — rather than her waiting until next week to find out
   * whether it landed. Every previous attempt is kept so she can compare.
   */
  const revise = async () => {
    const r = await reviseJob.run(jobId, learner, corrections);
    if (!r) return;
    setReportData((r.reportData ?? null) as typeof reportData);
    setRevision(r.revision);
    setCorrections([]);
    setSignedOff(false);          // a new version is a new draft
  };

  /*
   * Principle VII. A signature that failed and a screen that says it succeeded
   * is the worst failure this application can have: the draft mark comes off in
   * the interface and stays on the document, or the reverse. So nothing after
   * the sign-off runs unless the sign-off returned.
   */
  const sign = async () => {
    if (await signOff.run(jobId, learner, 'PT') === undefined) return;
    setSignedOff(true);
    await render();
  };

  return (
    <Page title={`${es.review.title} · ${who}${revision > 1 ? ` · versión ${revision}` : ''}`}
          banner={<DraftMark signedOff={signedOff} />}>

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
        <button className="btn" onClick={() => void openForEditing.run(jobId, learner)}>
          Corregir a mano
        </button>
        <button className="btn" onClick={() => void render()}>{es.adapt.print}</button>
        {/*
          The editable export (019 US1). Beside the PDF rather than instead of it:
          the PDF is what she photocopies, and this is what she corrects — and a
          teacher who can change the last two words does not abandon a sheet that
          is 95% right.
        */}
        <button className="btn" disabled={odt.busy} aria-busy={odt.busy}
                onClick={() => void odt.run(jobId, learner).then((p) => { if (p) setOdtPath(p); })}>
          Descargar para editar
        </button>
        {!signedOff
          ? <button className="btn btn-primary" onClick={() => void sign()}>{es.review.signOff}</button>
          : <span className="badge badge-accent">{es.review.signedOff}</span>}
      </div>

      {pdfPath ? <p className="small muted">Guardado en <code>{pdfPath}</code></p> : null}
      {odtPath ? (
        <p className="small muted">
          Para editar, en <code>{odtPath}</code>. Se abre con LibreOffice o con Word.
          {' '}Si lo cambias ahí, vuelve aquí y genera el PDF otra vez.
        </p>
      ) : null}
      {odt.error ? <Callout intent="danger">{odt.error.message}</Callout> : null}
    </Page>
  );
}
