import { useEffect, useState } from 'react';
import { fromWire } from '../../../packages/core/src/errors.js';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { Pages } from '../components/Progress.js';

/**
 * Where the material comes in (008 T018, US1).
 *
 * The old screen was a textarea. That is the wrong shape for the common case: the
 * worksheet lives on a publisher's platform with no export, so what she has is a
 * photograph — and pasting text she typed herself made the verification gate
 * downstream into theatre, because she was checking her own typing.
 *
 * Formats are named in her words and read from the main process, so adding one is
 * not two edits in two languages.
 */
export interface IngestProgress { stage: string; detail?: string; page?: number; of?: number }

export interface StartedIngest {
  jobId: string;
  boundReached: boolean;
  cutPages: number[];
  flaggedNames: string[];
  pages: Array<{ page: number; problems: string[] }>;
}

interface Pending { jobId: string; pages: number; confirmed: number; source: string }

export function IngestScreen({ onIngested, onResume }: {
  onIngested: (r: StartedIngest) => void;
  /** Reopen an extraction she started and did not finish confirming. */
  onResume?: (jobId: string) => void;
}) {
  const { t: es } = useStrings();
  const [accepted, setAccepted] = useState<{ description: string } | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warned, setWarned] = useState<boolean | null>(null);
  /** T016 · 006 US4. Asked before running, never after charging. */
  const [estimate, setEstimate] = useState<
    { pages: number; formatted: string; unusual: boolean } | null>(null);
  const [costAccepted, setCostAccepted] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);

  useEffect(() => {
    void window.rampa.ingest.accepted().then((a) => setAccepted(a as { description: string }));
    // FR-609: whether she has already been told about names in photos.
    void window.rampa.ingest.photoWarningSeen().then((seen) => setWarned(Boolean(seen)));
    void window.rampa.ingest.pending().then((p) => setPending(p as Pending[]));
    return window.rampa.ingest.onProgress(setProgress);
  }, []);

  const choose = async () => {
    setError(null);
    const picked = await window.rampa.ingest.choose() as string[];
    if (!picked.length) return;
    setPaths(picked);
    setCostAccepted(false);
    // A PDF's page count is not known until it is opened, so this estimates
    // from the file count — right for photographs, a floor for a PDF. The bound
    // and the real total are both reported after the run.
    setEstimate(await window.rampa.ingest.estimate(picked.length) as typeof estimate);
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const jobId = `job-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`;
      const r = await window.rampa.ingest.run(jobId, paths) as StartedIngest;
      onIngested({ ...r, jobId });
    } catch (e: unknown) {
      /*
       * The kind survives the IPC round trip encoded in the message, and
       * decoding it is what makes the Spanish error map apply. Showing
       * `e.message` raw put **"Error invoking remote method 'ingest:run': Error:
       * [rampa:ingest-empty] …"** in front of a teacher — Electron's wrapper, the
       * project's wire prefix, and then the sentence written for her, in that
       * order. The e2e suite caught it on its first run.
       *
       * The provider's own message is preferred where there is one, because
       * "Groq no lee fotos" names her service and a generic sentence cannot.
       */
      const { kind, message } = fromWire(e);
      setError(es.errors[kind] ?? message ?? es.errors['unknown']!);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const needsWarning = warned === false && paths.some((p) => /\.(jpe?g|png|heic|heif|pdf)$/i.test(p));

  return (
    <div className="stack gap5">
      <div className="stack gap2">
        <h1>Adaptar una ficha</h1>
        <p className="lede">
          Trae la ficha como la tengas. Si está en la plataforma de la editorial y no
          se puede descargar, hazle una foto: es lo normal, no el plan B.
        </p>
      </div>

      {/*
        She will be interrupted — that is the premise of the whole application —
        and an extraction is the longest thing here that needs her attention.
        Before this existed, a job she read on Tuesday and did not finish
        confirming was unreachable: the verification screen could only be opened
        by the ingest that produced it, so closing the window lost both the work
        and what it cost.
      */}
      {pending.length && onResume ? (
        <div className="card stack gap3">
          <span className="small"><strong>Tenías esto a medias</strong></span>
          {pending.map((j) => (
            <div className="row" key={j.jobId} style={{ justifyContent: 'space-between' }}>
              <span className="small">
                {j.confirmed} de {j.pages} páginas confirmadas
                <span className="meta"> · {j.jobId}</span>
              </span>
              <button className="btn btn-sm" onClick={() => onResume(j.jobId)}>Seguir con esto</button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="stack gap3">
        <button className="btn btn-primary btn-lg" onClick={() => void choose()} disabled={running}>
          Elegir la ficha
        </button>
        {accepted ? <p className="small">{accepted.description}</p> : null}
      </div>

      {paths.length ? (
        <div className="card stack gap3">
          <span className="small"><strong>{paths.length} fichero(s)</strong></span>
          <ol className="stack gap1" style={{ margin: 0, paddingLeft: '1.4em' }}>
            {paths.map((p) => <li key={p} className="small">{p.split('/').pop()}</li>)}
          </ol>
          {paths.length > 1 ? (
            <p className="small">
              Las páginas van en este orden. Si no es el correcto, vuelve a elegirlas.
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
        FR-609 · once, before the first image of the job is sent.
        The residual is stated plainly: Rampa cannot change what is inside a
        photograph, and pretending otherwise would be the one lie that matters.
      */}
      {needsWarning ? (
        <Callout intent="decide" title="Antes de mandar las fotos">
          <p style={{ marginTop: 0 }}>
            Rampa cambia los nombres de tus alumnos por códigos en todo lo que escribes.
            Lo que no puede cambiar es lo que va <strong>dentro de una foto</strong>: si en
            la hoja hay un nombre escrito a mano, ese nombre llega a tu servicio de IA
            tal cual.
          </p>
          <p>
            Si te importa, tapa o recorta esa parte antes de seguir. Te lo digo una vez.
          </p>
          <div className="row gap2">
            <button className="btn btn-sm" onClick={() => {
              void window.rampa.ingest.acknowledgePhotoWarning().then(() => setWarned(true));
            }}>
              Entendido, seguir
            </button>
          </div>
        </Callout>
      ) : null}

      {/*
        006 US4 · an unusually expensive job is asked about, not charged.
        A teacher who drops a 20-page PDF and is billed twenty times her usual
        worksheet without being asked has been ambushed by her own tool.
      */}
      {estimate?.unusual && !costAccepted && paths.length ? (
        <Callout intent="decide" title="Esto costaría más de lo normal">
          <p style={{ marginTop: 0 }}>
            Serían unos <strong>{estimate.formatted}</strong> por {estimate.pages} página(s),
            más que tus fichas de siempre. Tú decides.
          </p>
          <div className="row gap2">
            <button className="btn btn-sm" onClick={() => setCostAccepted(true)}>Adelante</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPaths([]); setEstimate(null); }}>
              Mejor no
            </button>
          </div>
        </Callout>
      ) : null}

      {paths.length && !needsWarning && (!estimate?.unusual || costAccepted) ? (
        <div className="row gap2">
          <button className="btn btn-primary" onClick={() => void run()}
                  disabled={running} aria-busy={running}>
            {running ? 'Leyendo…' : 'Leer la ficha'}
          </button>
          {estimate && !estimate.unusual ? (
            <span className="meta">unos {estimate.formatted}</span>
          ) : null}
        </div>
      ) : null}

      {running ? (
        <div className="stack gap2" aria-live="polite">
          <Pages done={progress?.page ?? 0} total={progress?.of ?? paths.length} />
          <span className="meta">
            {progress?.stage ?? 'Empezando'}
            {progress?.detail ? ` · ${progress.detail}` : ''}
          </span>
        </div>
      ) : null}

      {error ? <Callout intent="danger" title="No he podido leerla">{error}</Callout> : null}
    </div>
  );
}
