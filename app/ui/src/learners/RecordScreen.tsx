import { useState } from 'react';
import { Page, Section } from '../shell/Page.js';
import { Loaded } from '../data/Loaded.js';
import { Badge } from '../components/Badge.js';
import { Callout } from '../components/Callout.js';
import { useRecord, useRebuildRecord, type RecordEntry } from '../data/record.js';
import { useOpenInVault } from '../data/vault.js';
import { useRender, usePdf } from '../data/jobs.js';

/**
 * Everything ever made for one learner (014 T014-T018).
 *
 * ## What this screen may not become
 *
 * It lists **work**, never the child. No axis values, no counts of how much a
 * learner needed, no progress over a person — Principle V, and this is the
 * screen where the temptation is strongest, because a per-learner history is
 * exactly the shape a progress dashboard wants to be. FR-1311 forbids the
 * summary; the absence here is deliberate rather than pending.
 *
 * ## Titles come from ingested material
 *
 * `subject` and the objectives were read out of a worksheet somebody else wrote,
 * which makes them attacker-controllable (Principle IX). They are rendered as
 * **text** — never as Markdown, never as a link target — so a subject reading
 * `[click](http://…)` is a subject with brackets in it and nothing more.
 */

const KIND: Record<string, string> = {
  worksheet: 'Ficha', exam: 'Examen', study: 'Texto de estudio',
  problems: 'Problemas', material: 'Material',
};

/** dd/mm/yyyy, because that is how she writes a date. */
function human(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : (iso || 'sin fecha');
}

function Entry({ entry, onOpen, onReuse, onReview, onPrint, printing }: {
  entry: RecordEntry;
  onOpen: (path: string) => void;
  /**
   * Print it again (FLU-04).
   *
   * `documents.rendered: string[]` has been declared, typed and populated by
   * `entryFor` since `014` — and **read by nothing**: the enésima instance of the
   * defect this repository catalogues as «a field written, typed and read by
   * nothing» (G36). The consequence is one of the commonest tasks of the year:
   * the photocopy was lost, and reprinting the sheet she already signed was
   * impossible. The only «Guardar como PDF» lives on the review screen, which
   * before `0.1` could only be reached during a fresh adaptation.
   *
   * Worse, `es.errors.offline` promises «puedes leer tus notas y volver a
   * imprimir» — interface text lying about what the application can do.
   */
  onPrint?: (jobId: string, learner: string) => void;
  printing?: boolean;
  /** «Hazlo otra vez para otro alumno» (016 T018, FR-1409). */
  onReuse?: (jobId: string, kind: string) => void;
  /**
   * «Revisar y firmar», for any draft still waiting (P11, FLU-01).
   *
   * Carlos's answer to P11 in two halves, and this is the durable one: pending-to-sign
   * is **derived from the vault** — an adapted sheet whose front matter carries no
   * signature — so it survives closing the application, and the row that says «Sin
   * firmar» is the row that offers to fix it. Before this, the only door to the review
   * was a run that had just finished, which meant a batch interrupted at sheet one
   * could never be completed.
   */
  onReview?: (jobId: string, learner: string) => void;
}) {
  const gone = (path: string): boolean => entry.missing.includes(path);
  /*
   * The newest print, if she has one. `rendered` lists everything under
   * `output/<job>/<code>/` — `sheet.html`, `sheet.pdf`, an ODT, a braille-ready
   * text — so the PDF is picked by extension rather than by position.
   */
  const rendered = [...entry.documents.rendered].sort().reverse()
    .find((path) => path.toLowerCase().endsWith('.pdf'));
  /* Pulled out of the JSX because a closure loses the narrowing on a
     discriminated union, and `!` inside a handler is how a real null gets in. */
  const brought = entry.source.of === 'file' ? entry.source.paths[0] : undefined;

  return (
    <div className="card stack gap3">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stack" style={{ gap: 2 }}>
          <strong>{human(entry.date)} · {KIND[entry.kind] ?? 'Material'}</strong>
          {/* Text, never markup — see the note above. */}
          {entry.subject ? <span className="small">{entry.subject}</span> : null}
        </span>
        {/*
          A composed job she has not adapted yet is not «sin firmar» — there is
          nothing to sign. Three states, said in three ways, rather than a binary
          that files one of them under the wrong word.
        */}
        <Badge>
          {entry.pending ? 'Pendiente de adaptar'
            : entry.signedOff ? 'Firmada' : 'Sin firmar'}
        </Badge>
      </div>

      {entry.revision > 1 ? (
        <span className="small">
          Versión {entry.revision} — hay {entry.revision - 1}{' '}
          {entry.revision === 2 ? 'anterior' : 'anteriores'}
        </span>
      ) : null}

      {/*
        FR-520, the durable half. The callout on the verification screen is seen
        once, on the day she corrects; «¿cuál de estas fichas es de antes de que lo
        arreglara?» is a question she asks a week later, here, with the folder open
        in front of her. Only when it is not current: a line on every fresh row
        would be forty reassurances nobody reads.

        **`unknown` says nothing here, deliberately.** On the verification screen it
        is actionable — she has just corrected a reading, and «no sé si estas son de
        antes» is precisely what she needs. In the record there is no correction to
        relate it to, and every sheet made before this shipped is `unknown`: it would
        put a line on every row of an existing vault, which teaches her to skip the
        line and takes the `stale` one down with it.
      */}
      {/*
        **Both axes, independently** (`031` FR-2903).

        Two sentences and never one merged «desactualizada»: «se hizo con una lectura que
        cambió» and «lleva un dibujo que ya no usas» are different facts with different
        remedies — re-verify the reading, or re-make the sheet — and a single word is
        exactly where one would hide the other. That is how `024` FR-2218 stayed
        «satisfied by a comment» for a year.
      */}
      {entry.freshness?.reading === 'stale' ? (
        <span className="small">
          Se hizo con una lectura que has cambiado después. Vuelve a adaptarla si el
          cambio le afecta.
        </span>
      ) : null}

      {entry.freshness?.drawings.state === 'stale' ? (
        <span className="small">
          {/*
            Named, because «está antigua» is not something she can act on.

            One `one`, not a ternary per word. The first draft branched three times and
            one of the branches read `? 'usas' : 'usas'` — the same string on both sides,
            because in Spanish the verb agrees with *her*, not with the drawings. A
            condition whose two arms are identical is G36 in one line: a value computed,
            typed and read by nothing.
          */}
          Lleva {entry.freshness.drawings.words.length === 1 ? 'un dibujo' : 'dibujos'} que
          ya no usas: <strong>{entry.freshness.drawings.words.join(', ')}</strong>. Vuelve
          a prepararla si quieres que {entry.freshness.drawings.words.length === 1
            ? 'salga con el de ahora'
            : 'salgan con los de ahora'}.
        </span>
      ) : null}

      <div className="row gap2" style={{ flexWrap: 'wrap' }}>
        {/*
          First in the row, because on an unsigned sheet it is the thing she came for.
          Not `btn-primary`: a list of eight rows would then hold eight primary
          controls, and `013` FR-1101 says one per screen — the «Sin firmar» badge
          above is what marks which rows are waiting.
        */}
        {onReview && entry.documents.adapted && !gone(entry.documents.adapted) ? (
          <button className="btn btn-sm"
                  onClick={() => onReview(entry.jobId, entry.learner)}>
            {entry.signedOff ? 'Verla otra vez' : 'Revisar y firmar'}
          </button>
        ) : null}

        {entry.documents.adapted ? (
          <button className="btn btn-sm" disabled={gone(entry.documents.adapted)}
                  onClick={() => onOpen(entry.documents.adapted!)}>
            Lo adaptado
          </button>
        ) : null}

        {/* The key, for a composed job. Hers, and never on his sheet (`002` T014). */}
        {/*
          The PDF she already has, if there is one — opening it costs nothing and
          works with no network, which is what the offline sentence promises. When
          there is none, printing it is still offline (Chromium renders locally),
          so the two are the same control with the honest label for each case.
        */}
        {rendered ? (
          <button className="btn btn-sm" disabled={gone(rendered)} onClick={() => onOpen(rendered)}>
            El PDF
          </button>
        ) : null}
        {onPrint && entry.documents.adapted && !gone(entry.documents.adapted) ? (
          <button className="btn btn-sm" disabled={printing} aria-busy={printing}
                  onClick={() => onPrint(entry.jobId, entry.learner)}>
            {rendered ? 'Volver a imprimirlo' : 'Guardar como PDF'}
          </button>
        ) : null}

        {entry.documents.answers ? (
          <button className="btn btn-sm" onClick={() => onOpen(entry.documents.answers!)}>
            Las soluciones
          </button>
        ) : null}

        {/*
          What she gave it, which is not always a file. A pasted job has no
          `source/` directory because there was never one — not because anything
          went missing, which is what an empty "original" panel would imply.
        */}
        {brought ? (
          <button className="btn btn-sm" disabled={gone(brought)}
                  onClick={() => onOpen(brought)}>
            Lo que traje
          </button>
        ) : null}

        <button className="btn btn-sm" disabled={gone(entry.documents.ir)}
                onClick={() => onOpen(entry.documents.ir)}>
          {/*
            Three answers, because the document is a different thing in each case. «Lo que
            leyó Rampa» is false for material Rampa made: nobody read anything, and a
            button that mislabels what it opens is a button she stops trusting.
          */}
          {entry.source.of === 'pasted' ? 'El texto que pegué'
            : entry.source.of === 'structure' ? 'Lo que hice'
            : 'Lo que leyó Rampa'}
        </button>

        {entry.documents.report ? (
          <button className="btn btn-sm" onClick={() => onOpen(entry.documents.report!)}>
            El informe
          </button>
        ) : null}

        {entry.documents.composeReport ? (
          <button className="btn btn-sm" onClick={() => onOpen(entry.documents.composeReport!)}>
            Cómo lo generé
          </button>
        ) : null}

        {/*
          T018 · «adaptar el examen del año pasado para el niño de este año» is a
          real task, and this is the whole of it. The extraction is reused — no
          provider call for the reading (FR-1409, SC-1405), which is also why it is
          a button here rather than a re-upload there.
        */}
        {/*
          Not offered for structure material (`028`): the button reuses the **extraction**
          so another learner's sheet can be adapted from it, and an agenda is never
          adapted. Offering it would promise a flow that has nothing to do.
        */}
        {onReuse && entry.source.of !== 'structure' && !gone(entry.documents.ir) ? (
          <button className="btn btn-sm"
                  onClick={() => onReuse(entry.jobId, entry.kind)}>
            Hacerlo otra vez para otro alumno
          </button>
        ) : null}
      </div>

      {entry.source.of === 'composed' ? (
        <p className="small" style={{ margin: 0 }}>
          Lo pedí así: {entry.source.objectives.join('; ')}
          {entry.source.anchor ? ` · ${entry.source.anchor}` : ''}
        </p>
      ) : entry.source.of === 'structure' ? (
        <p className="small" style={{ margin: 0 }}>
          {entry.source.kind === 'secuencia' ? 'Una secuencia de pasos'
            : entry.source.kind === 'historia' ? 'Una historia social'
            : 'Una agenda'} que hiciste tú. No se adapta: se imprime.
        </p>
      ) : null}

      {/*
        FR-1206. The row stays and says what is gone, rather than disappearing to
        keep the list tidy — which is the opposite of what she opens it for.
      */}
      {entry.missing.length ? (
        <p className="small" role="status" style={{ margin: 0 }}>
          {entry.missing.length === 1 ? 'Un documento ya no está' : `${entry.missing.length} documentos ya no están`}
          {' '}en la carpeta. Puede que los movieras o los borraras tú.
        </p>
      ) : null}
    </div>
  );
}

export function RecordScreen({ code, name, onBack, onReuse, onReview }: {
  code: string;
  name?: string;
  /**
   * Optional since `020`: inside a learner, the way back is their own heading, and a
   * second «← Volver a mis alumnos» under the title would be two controls doing one
   * job — with the screen's own one further from the eye than the shell's.
   */
  onBack?: () => void;
  /**
   * Reuse this job for somebody else (T018).
   *
   * Optional so the screen still works where nothing can route out of it — which
   * is the case inside the handover flow, and would otherwise mean a button that
   * does nothing.
   */
  onReuse?: (jobId: string, kind: string) => void;
  /**
   * Into the review of one sheet (P11).
   *
   * Optional for the same reason `onReuse` is: inside the handover flow nothing can
   * route out of this screen, and a button that does nothing is worse than an absence.
   */
  onReview?: (jobId: string, learner: string) => void;
}) {
  const record = useRecord(code);
  const open = useOpenInVault();
  const rebuild = useRebuildRecord();
  const [rebuiltTo, setRebuiltTo] = useState<string | null>(null);
  /*
   * Printing, from here (FLU-04). Both calls are local: `job:render` writes the
   * HTML and `job:pdf` is Chromium's own `printToPDF`, so «volver a imprimir»
   * genuinely works with no network — which is what the offline message has been
   * promising all along.
   */
  const renderJob = useRender();
  const pdf = usePdf();
  const [printedTo, setPrintedTo] = useState<string | null>(null);
  const [printingWhich, setPrintingWhich] = useState<string | null>(null);

  const print = (jobId: string, learner: string): void => {
    const which = `${jobId}-${learner}`;
    setPrintingWhich(which);
    setPrintedTo(null);
    void renderJob.run(jobId, learner)
      .then((r) => (r ? pdf.run(jobId, learner) : undefined))
      .then((path) => { if (path) setPrintedTo(path); })
      .finally(() => setPrintingWhich(null));
  };

  return (
    <Page title={`Lo que he preparado para ${name ?? code}`}
          lede="Todo lo que ha salido de aquí para este alumno, y de qué salió.">
      {onBack ? (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
          ← Volver a mis alumnos
        </button>
      ) : null}

      <Loaded
        from={record}
        busyLabel="Un momento, que miro qué hay…"
        empty={{
          title: 'Todavía no has preparado nada para este alumno',
          body: 'En cuanto adaptes una ficha aparecerá aquí, con lo que trajiste y lo que salió.',
        }}
      >
        {(entries) => {
          const years = [...new Set(entries.map((e) => e.schoolYear))];
          return (
            <>
              {years.map((year) => (
                <Section key={year || 'sin'} title={year || 'Sin curso escolar'}>
                  {entries.filter((e) => e.schoolYear === year).map((e) => (
                    <Entry key={`${e.jobId}-${e.learner}`} entry={e}
                           onOpen={(path) => void open.run(path)}
                           onPrint={print}
                           printing={printingWhich === `${e.jobId}-${e.learner}`}
                           {...(onReuse ? { onReuse } : {})}
                           {...(onReview ? { onReview } : {})} />
                  ))}
                </Section>
              ))}

              {open.error ? <Callout intent="danger">{open.error.message}</Callout> : null}
              {renderJob.error ? <Callout intent="danger">{renderJob.error.message}</Callout> : null}
              {pdf.error ? <Callout intent="danger">{pdf.error.message}</Callout> : null}
              {printedTo ? (
                <p className="small muted" role="status">Guardado en <code>{printedTo}</code></p>
              ) : null}

              {/*
                `record.md` is written for her, in her folder, and Rampa never
                reads it back. So a stale one is harmless and this button is a
                convenience rather than a repair — which is why it says what it
                does rather than «arreglar».
              */}
              <Section title="En tu carpeta">
                <p className="field-help">
                  Esto mismo está en <code>profiles/{code}/record.md</code>, en texto plano,
                  para que lo veas en Obsidian o en cualquier editor. Rampa lo escribe y no
                  lo vuelve a leer: si lo borras, se rehace.
                </p>
                <div className="row gap2">
                  <button className="btn btn-sm" disabled={rebuild.busy} aria-busy={rebuild.busy}
                          onClick={() => void rebuild.run(code).then((p) => { if (p) setRebuiltTo(p); })}>
                    Volver a escribirlo
                  </button>
                  {rebuiltTo ? <span className="small" role="status">Escrito en {rebuiltTo}</span> : null}
                </div>
                {rebuild.error ? <Callout intent="danger">{rebuild.error.message}</Callout> : null}
              </Section>
            </>
          );
        }}
      </Loaded>
    </Page>
  );
}
