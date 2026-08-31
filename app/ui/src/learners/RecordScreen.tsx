import { useState } from 'react';
import { Page, Section } from '../shell/Page.js';
import { Loaded } from '../data/Loaded.js';
import { Badge } from '../components/Badge.js';
import { Callout } from '../components/Callout.js';
import { useRecord, useRebuildRecord, type RecordEntry } from '../data/record.js';
import { useOpenInVault } from '../data/vault.js';

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

function Entry({ entry, onOpen, onReuse }: {
  entry: RecordEntry;
  onOpen: (path: string) => void;
  /** «Hazlo otra vez para otro alumno» (016 T018, FR-1409). */
  onReuse?: (jobId: string, kind: string) => void;
}) {
  const gone = (path: string): boolean => entry.missing.includes(path);
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

      <div className="row gap2" style={{ flexWrap: 'wrap' }}>
        {entry.documents.adapted ? (
          <button className="btn btn-sm" disabled={gone(entry.documents.adapted)}
                  onClick={() => onOpen(entry.documents.adapted!)}>
            Lo adaptado
          </button>
        ) : null}

        {/* The key, for a composed job. Hers, and never on his sheet (`002` T014). */}
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
          {entry.source.of === 'pasted' ? 'El texto que pegué' : 'Lo que leyó Rampa'}
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
        {onReuse && !gone(entry.documents.ir) ? (
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

export function RecordScreen({ code, name, onBack, onReuse }: {
  code: string;
  name?: string;
  onBack: () => void;
  /**
   * Reuse this job for somebody else (T018).
   *
   * Optional so the screen still works where nothing can route out of it — which
   * is the case inside the handover flow, and would otherwise mean a button that
   * does nothing.
   */
  onReuse?: (jobId: string, kind: string) => void;
}) {
  const record = useRecord(code);
  const open = useOpenInVault();
  const rebuild = useRebuildRecord();
  const [rebuiltTo, setRebuiltTo] = useState<string | null>(null);

  return (
    <Page title={`Lo que he preparado para ${name ?? code}`}
          lede="Todo lo que ha salido de aquí para este alumno, y de qué salió.">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        ← Volver a mis alumnos
      </button>

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
                           {...(onReuse ? { onReuse } : {})} />
                  ))}
                </Section>
              ))}

              {open.error ? <Callout intent="danger">{open.error.message}</Callout> : null}

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
