import { useEffect, useState } from 'react';
import { useExtractionCommand, usePageImageCommand, useBlocksCommand,
         useCorrectAndConfirm, useUnconfirmPage } from '../data/ingest.js';
import { useStaleSheetsCommand, type StaleSheet } from '../data/jobs.js';
import { Page } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { Badge } from '../components/Badge.js';

/**
 * The gate becomes real (008 T019-T021, US2, FR-608).
 *
 * Until this screen existed the teacher "verified" text she had pasted herself,
 * which checked nothing: she was re-reading her own typing. Here she compares the
 * extraction against **the photograph of the paper**, which is the only comparison
 * that can catch a reading error — and a reading error contaminates every output
 * while reading perfectly plausibly.
 *
 * The order is fixed by FR-608 and it is not cosmetic: every `[UNREADABLE]`, then
 * every essential figure description, then every notice, and only then the prose.
 * A teacher in a 45-minute gap reads the top of a screen. What is at the top has
 * to be what only she can decide.
 */
interface Flag { kind: string; message: string; blockId?: string }
interface PageRecord {
  page: number;
  image?: string;
  verified: boolean;
  problems: string[];
  attempts: number;
  flags: Flag[];
}
interface Extraction {
  source: string;
  pages: PageRecord[];
  boundReached: boolean;
  cutPages: number[];
  costCents: number;
  verified: boolean;
}

const FLAG_ORDER = ['unreadable', 'essential-figure', 'numbering', 'note'];

export function VerifyScreen({ jobId, onVerified }: { jobId: string; onVerified: () => void }) {
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [blocks, setBlocks] = useState<Array<{ id: string; page: number; content: string; number?: string }>>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [stale, setStale] = useState<StaleSheet[]>([]);
  const extractionFor = useExtractionCommand();
  const staleSheetsFor = useStaleSheetsCommand();
  const pageImage = usePageImageCommand();
  const blocksFor = useBlocksCommand();
  const confirmPage = useCorrectAndConfirm();
  const unconfirm = useUnconfirmPage();
  const failure = extractionFor.error ?? blocksFor.error ?? confirmPage.error ?? unconfirm.error ?? null;

  const refresh = async () => {
    const e = await extractionFor.run(jobId) as Extraction | null | undefined;
    if (e === undefined) return;   // failed; the message is on screen
    setExtraction(e);
    if (!e) return;
    for (const p of e.pages) {
      if (!p.image || images[p.page]) continue;
      const dataUri = await pageImage.run(jobId, p.page);
      if (dataUri) setImages((prev) => ({ ...prev, [p.page]: dataUri }));
    }
    const b = await blocksFor.run(jobId);
    if (b) setBlocks(b as typeof blocks);
    /*
     * FR-520 · which sheets were made from the reading as it was before.
     *
     * Asked on every refresh rather than only after a correction, because she can
     * reach this screen from `ingest:pending` days later and the question is the
     * same one. A job with no sheets yet — the common case, right after an ingest —
     * answers with an empty list and nothing appears.
     */
    const s = await staleSheetsFor.run(jobId);
    if (s) setStale(s);
  };

  useEffect(() => { void refresh(); }, [jobId]);

  /* Failure first: an extraction that could not be read and one that does not
     exist rendered the same «Un momento…» for ever, which is the loading state
     lying about a dead screen. */
  if (failure) return <Callout intent="danger">{failure.message}</Callout>;
  if (!extraction) return <p className="small" aria-live="polite">Un momento…</p>;

  const readable = extraction.pages.filter((p) => p.problems.length === 0);
  const failed = extraction.pages.filter((p) => p.problems.length > 0);

  return (
    <Page variant="wide"
          title="Comprueba que lo he leído bien"
          lede="Mira la foto al lado de lo que he leído. Si aquí hay un error, se cuela en todo lo demás y luego no se nota, porque la ficha se lee perfectamente.">

      {/*
        FR-612 · the page bound, said out loud. A teacher who dropped a 60-page
        PDF and got 20 pages back with no explanation has been lied to by
        omission, and she finds out when the worksheet stops mid-exercise.
      */}
      {extraction.boundReached ? (
        <Callout intent="decide" title="No he leído toda la ficha">
          He leído {extraction.pages.length} páginas y he dejado fuera{' '}
          {extraction.cutPages.length}: la {extraction.cutPages.join(', la ')}.
          Es demasiado para una sola vez. Divídelo y haz otra tanda con el resto.
        </Callout>
      ) : null}

      {failed.length ? (
        <Callout intent="danger" title={`${failed.length} página(s) no he podido leerlas`}>
          <ul className="stack gap2" style={{ margin: 0 }}>
            {failed.map((p) => (
              <li key={p.page}>
                <strong>Página {p.page}:</strong> {p.problems.join(' ')}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {/*
        FR-520 · the sheets already made from the reading she has just changed.
        Named, because «2 fichas afectadas» is a number she cannot act on and a
        name is a child she can picture. Nothing here re-runs anything: the third
        clause of FR-520 is that a correction spends no money on a decision she
        did not make, so this points at the adaptation she already knows how to
        start and stops talking.
      */}
      {stale.some((s) => s.freshness === 'stale') ? (
        <Callout intent="decide" title="Hay fichas hechas con la lectura de antes">
          Has cambiado lo que yo había leído, así que estas fichas se hicieron con la
          versión anterior:{' '}
          <strong>{stale.filter((s) => s.freshness === 'stale').map((s) => s.name).join(', ')}</strong>.
          No he vuelto a hacer nada por mi cuenta. Si esas fichas ya están impresas y el
          cambio les afecta, vuelve a adaptarlas cuando termines aquí.
        </Callout>
      ) : null}

      {/*
        The honest third state. A sheet made before Rampa started recording which
        reading it came from cannot be called current and cannot be called old, and
        saying either would be inventing an answer about a document in her folder.
      */}
      {stale.some((s) => s.freshness === 'unknown') ? (
        <Callout intent="info" title="De estas fichas no sé con qué lectura se hicieron">
          Son de antes de que empezara a anotarlo:{' '}
          <strong>{stale.filter((s) => s.freshness === 'unknown').map((s) => s.name).join(', ')}</strong>.
          Si las hiciste antes de corregir esta lectura, conviene volver a adaptarlas.
        </Callout>
      ) : null}

      {readable.map((p) => {
        const pageBlocks = blocks.filter((b) => b.page === p.page);
        const flags = [...p.flags].sort(
          (a, b) => FLAG_ORDER.indexOf(a.kind) - FLAG_ORDER.indexOf(b.kind));

        return (
          <section className="stack gap4" key={p.page}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Página {p.page}</h2>
              {p.verified ? <Badge tone="ok">Confirmada</Badge> : <Badge tone="draft">Sin confirmar</Badge>}
            </div>

            {/* The risky items first, before any prose. */}
            {flags.length ? (
              <div className="stack gap2">
                {flags.map((f, i) => (
                  <Callout key={i}
                           intent={f.kind === 'unreadable' ? 'danger'
                             : f.kind === 'essential-figure' ? 'decide' : 'info'}
                           title={f.kind === 'unreadable' ? 'No se ha podido leer'
                             : f.kind === 'essential-figure' ? 'Imagen imprescindible'
                             : f.kind === 'numbering' ? 'Mira la numeración' : 'Nota'}>
                    {f.message}
                  </Callout>
                ))}
              </div>
            ) : null}

            <div className="verify-pair">
              <div className="stack gap2">
                <span className="small"><strong>Lo que fotografiaste</strong></span>
                {images[p.page] ? (
                  <img className="page-image" src={images[p.page]}
                       alt={`Página ${p.page}, tal como la fotografiaste`} />
                ) : (
                  <p className="small muted">No hay imagen de esta página.</p>
                )}
              </div>

              <div className="stack gap2">
                <span className="small"><strong>Lo que he leído</strong></span>
                <div className="stack gap3">
                  {pageBlocks.map((b) => (
                    <div className="stack gap1" key={b.id}>
                      {b.number ? <span className="meta">Ejercicio {b.number}</span> : null}
                      {/*
                        T020 · her edit lands in the IR and is hers, not the
                        model's. Editable in place rather than behind a button:
                        a correction that needs a click to become possible is a
                        correction she does not make.
                      */}
                      <textarea className="textarea verify-block"
                                aria-label={`Texto leído${b.number ? ` del ejercicio ${b.number}` : ''}`}
                                value={edited[b.id] ?? b.content}
                                onChange={(e) => setEdited((prev) => ({ ...prev, [b.id]: e.target.value }))} />
                    </div>
                  ))}
                  {pageBlocks.length === 0 ? <p className="small muted">Sin bloques.</p> : null}
                </div>
              </div>
            </div>

            <div className="row gap2">
              {p.verified ? (
                <button className="btn btn-sm" onClick={() => {
                  void unconfirm.run(jobId, p.page).then(refresh);
                }}>
                  Quitar la confirmación
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => {
                  const mine = pageBlocks
                    .filter((b) => edited[b.id] !== undefined && edited[b.id] !== b.content)
                    .map((b) => ({ id: b.id, content: edited[b.id]! }));
                  void confirmPage.run(jobId, p.page, mine).then(refresh);
                }}>
                  Está bien leída
                </button>
              )}
            </div>
          </section>
        );
      })}

      {/*
        FR-608 · the gate. Adaptation refuses until every page is confirmed, and
        this button says so rather than being mysteriously disabled.
      */}
      <div className="card card-plain stack gap3">
        {extraction.verified ? (
          <>
            <Callout intent="ok" title="Todo confirmado">
              Ya puedes adaptar esta ficha para tus alumnos.
            </Callout>
            <div className="row">
              <button className="btn btn-primary btn-lg" onClick={onVerified}>
                Adaptar para un alumno
              </button>
            </div>
          </>
        ) : (
          <p className="small" style={{ margin: 0 }}>
            Falta confirmar{' '}
            {readable.filter((p) => !p.verified).length + failed.length} página(s).
            Hasta entonces no puedo adaptar: un error aquí se cuela en todas las hojas.
          </p>
        )}
      </div>
    </Page>
  );
}
