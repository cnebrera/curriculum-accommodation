import { useCallback, useEffect, useState } from 'react';
import { Page } from '../shell/Page.js';
import { useReportDataCommand, useSignedOffCommand, useRender, usePdf, useOdt, useRevise, useSignOff, useOpenForEditing, useAudioReady, useBrailleReady, type LinearExport } from '../data/jobs.js';
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
export function ReviewScreen({ jobId, learner, recipes, back }: {
  jobId: string;
  learner: string;
  recipes?: string[];
  /**
   * The way out (FLU-01, P11).
   *
   * There was none. This screen had no `onBack` and no `onDone`, so the only exit was
   * the rail — and the state that put her here was never cleared, which left the
   * adapt screen rendering *nothing* for the rest of the session. Sheets 2..N of a
   * batch could not be signed at all: exactly the scenario `020` US2 describes as
   * «she signs them one at a time».
   *
   * The label comes from the caller because the destination does: the batch she came
   * from, or the record she opened this out of.
   */
  back?: { label: string; go: () => void };
}) {
  const { t: es } = useStrings();
  const [reportData, setReportData] = useState<{
    decisions: Decision[]; notDone: string[];
    memoryApplied: Array<{ recipe: string; source: string; effect: string }>;
  } | null>(null);
  const [checklist, setChecklist] = useState('');
  const [signedOff, setSignedOff] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [odtPath, setOdtPath] = useState<string | null>(null);
  /**
   * Essential figures with no description (review COD-13, decision P43).
   *
   * She is told and the sheet still goes out. «Visual prints, non-visual stops»:
   * on paper the picture is there, so refusing to print takes a usable sheet away
   * for a description only a non-visual reader needs — and the same document
   * refuses in audio and braille, where the picture genuinely is not there.
   */
  const [undescribed, setUndescribed] = useState<string[]>([]);
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
  /** The other two modalities (019 US2/US3). Same adaptation, no re-run. */
  const audio = useAudioReady();
  const braille = useBrailleReady();
  const [linear, setLinear] = useState<{ what: 'audio' | 'braille'; result: LinearExport } | null>(null);
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
  /**
   * What made this sheet (`005` FR-520's neighbour, and `ScopeQuestion`'s input).
   *
   * A review opened from the record has no recipes to hand — the run happened last
   * month and nothing carried them. They are in the report this screen loads anyway,
   * one per decision, so they are derived rather than asked for. Derived second: a
   * caller that knows stays authoritative.
   */
  const applied = recipes?.length
    ? recipes
    : [...new Set((reportData?.decisions ?? []).map((d) => d.recipe).filter(Boolean))];
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
    setUndescribed(r.undescribed ?? []);
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

      {/*
        Above everything, and a ghost rather than a primary: the primary control on this
        screen is the signature (`013` FR-1101). Same shape as the record's own «← Volver
        a mis alumnos», for the same reason.
      */}
      {back ? (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={back.go}>
          {back.label}
        </button>
      ) : null}

      {reportData
        ? <ReportView {...reportData} />
        : <Callout intent="info">Cargando el informe…</Callout>}

      {/*
        Said, not refused (decision P43). The sheet prints; audio and braille of the
        same document do not, and that is where the description is load-bearing.
      */}
      {undescribed.length ? (
        <Callout intent="decide" title="Una figura imprescindible no tiene descripción">
          <ul>{undescribed.map((u, i) => <li key={i}>{u}</li>)}</ul>
          <p className="small" style={{ margin: 0 }}>
            En papel sale igual: la imagen se ve. Pero para escuchar o para braille
            no puedo darte esta hoja hasta que la describas, porque ahí el dibujo no
            está y el ejercicio se queda sin respuesta dentro.
          </p>
        </Callout>
      ) : null}

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

      <ScopeQuestion learner={learner} recipes={applied} onCaptured={(c) => setCorrections((prev) => [...prev, c])} />

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
                onClick={() => void odt.run(jobId, learner).then((r) => {
                  if (!r) return;
                  setOdtPath(r.path);
                  setUndescribed(r.undescribed);
                })}>
          Descargar para editar
        </button>
        {/*
          The heard and the touched modalities (019 US2/US3). Beside the others
          because that is Principle IV's claim doing its job: one adaptation, N
          outputs, and no re-run to add one.
        */}
        <button className="btn" disabled={audio.busy} aria-busy={audio.busy}
                onClick={() => void audio.run(jobId, learner)
                  .then((r) => { if (r) setLinear({ what: 'audio', result: r }); })}>
          Para escuchar
        </button>
        <button className="btn" disabled={braille.busy} aria-busy={braille.busy}
                onClick={() => void braille.run(jobId, learner)
                  .then((r) => { if (r) setLinear({ what: 'braille', result: r }); })}>
          Para braille
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
      {audio.error ? <Callout intent="danger">{audio.error.message}</Callout> : null}
      {braille.error ? <Callout intent="danger">{braille.error.message}</Callout> : null}

      {linear ? (
        <Callout
          intent={linear.result.announced.length ? 'decide' : 'ok'}
          title={linear.what === 'audio'
            ? 'Listo para escuchar'
            : 'Listo para quien lo transcriba'}>
          <p>
            En <code>{linear.result.path}</code>.{' '}
            {linear.what === 'audio'
              ? 'Es texto en orden de lectura: lo abre cualquier lector de pantalla. No es audio: Rampa no lleva motor de voz.'
              : 'Es texto lineal para quien transcriba o para una impresora braille con su software. No es braille, y Rampa no sabe si el resultado sirve.'}
          </p>
          {/*
            What could not be read in order. Shown here rather than only inside the
            file, because it is a decision she has to know about — and a silent skip
            is a learner finishing an exercise of eleven questions believing it had
            ten.
          */}
          {linear.result.announced.length ? (
            <>
              <p>
                <strong>
                  {linear.result.announced.length === 1
                    ? 'Hay un bloque que no se puede leer en orden'
                    : `Hay ${linear.result.announced.length} bloques que no se pueden leer en orden`}
                </strong>
                {' '}— van anunciados, no inventados ni saltados:
              </p>
              <ul className="bullets">
                {linear.result.announced.map((a) => <li key={a.id}>{a.because}</li>)}
              </ul>
            </>
          ) : null}
        </Callout>
      ) : null}
    </Page>
  );
}
