import { useEffect, useState } from 'react';
import { Page } from '../shell/Page.js';
import { useAcceptedFormats, usePhotoWarningSeen, usePendingIngest, useIngestProgress,
         useChooseFiles, useIngestEstimate, useRunIngest, useAcknowledgePhotoWarning,
         type PendingIngest } from '../data/ingest.js';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { Counted } from '../components/Progress.js';
import { Icon } from '../components/Icon.js';

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

/*
 * `Pending` was declared here and again in `LearnersScreen` the day the caseload needed
 * it (`020` T026). Two records describing one row is the drift this repository keeps
 * finding, so it lives in the data layer as `PendingIngest` and this screen reads that.
 */

export function IngestScreen({ onIngested, onResume, onAlreadyText, forLearner }: {
  onIngested: (r: StartedIngest) => void;
  /** Reopen an extraction she started and did not finish confirming. */
  onResume?: (jobId: string) => void;
  /**
   * «Ya lo tengo en texto», when this screen is a step of a flow (`020` T028).
   *
   * The door used to reach the adapt screen directly, and that screen has the paste
   * box. `020` put this screen in front of it as step 2, so until this existed
   * **pasting text was unreachable** — the flow's own checkpoint says «the door is gone
   * and nothing it did was lost», and that was not true.
   *
   * Optional because outside a flow this screen is still reached on its own, where
   * there is no next step to hand her to.
   */
  onAlreadyText?: () => void;
  /**
   * Whose flow this is, stamped into `ir.md` at creation (`020` T006, FR-1828).
   *
   * Not for display — no step of this screen says a name — but so that an extraction
   * she starts and abandons still knows who it was for. Without it, half-finished work
   * belongs to nobody the moment she closes the window, and «tenías esto a medias»
   * cannot say inside whose profile to show it.
   */
  forLearner?: string;
}) {
  const { t: es } = useStrings();
  const [paths, setPaths] = useState<string[]>([]);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  /** T016 · 006 US4. Asked before running, never after charging. */
  const [estimate, setEstimate] = useState<
    { pages: number; formatted: string; unusual: boolean } | null>(null);
  const [costAccepted, setCostAccepted] = useState(false);

  useIngestProgress(setProgress);

  const acceptedLoaded = useAcceptedFormats();
  // FR-609: whether she has already been told about names in photos.
  const warnedLoaded = usePhotoWarningSeen();
  const pendingLoaded = usePendingIngest();
  const accepted = acceptedLoaded.state === 'ready'
    ? acceptedLoaded.value as { description: string } : null;
  const pending: PendingIngest[] = pendingLoaded.state === 'ready' ? pendingLoaded.value : [];

  const chooseFiles = useChooseFiles();
  const ingestEstimate = useIngestEstimate();
  const runIngest = useRunIngest();
  const acknowledge = useAcknowledgePhotoWarning();
  const running = runIngest.busy;
  /*
   * Decoded once, in the data layer (FR-1109). This screen carried the longest
   * comment in the codebase about why it had to call `fromWire` itself — and
   * that comment was correct, which is exactly why every screen that did NOT
   * carry it went unnoticed. It is now true of all of them, stated in one file.
   */
  const error = runIngest.error?.message ?? chooseFiles.error?.message ?? null;

  // Local, because acknowledging the warning must take effect immediately rather
  // than after a re-read of a value she just changed.
  const warned = acknowledged || (warnedLoaded.state === 'ready' ? Boolean(warnedLoaded.value) : null);

  const choose = async () => {
    const picked = await chooseFiles.run();
    if (!picked?.length) return;
    setPaths(picked);
    setCostAccepted(false);
    // A PDF's page count is not known until it is opened, so this estimates
    // from the file count — right for photographs, a floor for a PDF. The bound
    // and the real total are both reported after the run.
    const est = await ingestEstimate.run(picked.length);
    if (est !== undefined) setEstimate(est as typeof estimate);
  };

  const run = async () => {
    const jobId = `job-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`;
    const r = await runIngest.run(jobId, paths, forLearner) as StartedIngest | undefined;
    setProgress(null);
    if (r) onIngested({ ...r, jobId });
  };

  const needsWarning = warned === false && paths.some((p) => /\.(jpe?g|png|heic|heif|pdf)$/i.test(p));

  /*
   * «Adaptar material» was this screen's title too, and FR-1402 covers it: the
   * interface must stop using one word for several things. This screen is about
   * one thing — getting the material in — so it says that.
   */
  return (
    <Page title="Traer el material"
          lede="Trae la ficha como la tengas. Si está en la plataforma de la editorial y no se puede descargar, hazle una foto: es lo normal, no el plan B.">

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
            <div className="row row-split" key={j.jobId}>
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
        <button className="btn btn-primary" onClick={() => void choose()} disabled={running}>
          <Icon name="folder" /> Elegir la ficha
        </button>
        {accepted ? <p className="small">{accepted.description}</p> : null}
        {/*
          Secondary, and deliberately below: the photograph is the common case and this
          screen exists because the textarea was the wrong shape for it. But «wrong
          default» is not «no way through», and a teacher who already has the text
          should not have to photograph her own screen to get past step 2.
        */}
        {onAlreadyText ? (
          <div className="row">
            <button className="btn btn-sm" onClick={onAlreadyText}>
              Ya lo tengo en texto, lo pego
            </button>
          </div>
        ) : null}
      </div>

      {paths.length ? (
        <div className="card stack gap3">
          <span className="small"><strong>{paths.length} fichero(s)</strong></span>
          <ol className="bullets">
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
          <p>
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
              void acknowledge.run().then(() => setAcknowledged(true));
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
          <p>
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
          <Counted done={progress?.page ?? 0} total={progress?.of ?? paths.length}
                   one="Página" many="páginas" />
          <span className="meta">
            {progress?.stage ?? 'Empezando'}
            {progress?.detail ? ` · ${progress.detail}` : ''}
          </span>
        </div>
      ) : null}

      {error ? <Callout intent="danger" title="No he podido leerla">{error}</Callout> : null}
    </Page>
  );
}
