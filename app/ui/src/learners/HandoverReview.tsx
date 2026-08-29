import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout.js';

/**
 * The packet, before it goes (004 US1, T007, FR-304/305).
 *
 * `buildPacket` and `packetToMarkdown` existed and were good. What did not exist
 * was any way for her to **review** the packet, which FR-305 requires — so a
 * handover either did not happen or happened unreviewed, and the second is worse.
 *
 * The thing being managed on this screen is not completeness. It is **authority**.
 * A packet believed wholesale means the receiving teacher stops observing, and a
 * child is held inside last year's description of them — and some children change
 * precisely because last year's adaptation worked. So the limiting sentence is
 * above the claims, and removing a claim is one click while keeping it is the
 * default only because she wrote it in the first place.
 */
interface Claim { text: string; evidence: string; date: string; source?: string }
interface Draft { packet: { claims: Claim[] }; markdown: string }

const EVIDENCE: Record<string, string> = {
  observed: 'lo observé', inferred: 'lo deduje', reported: 'me lo contaron',
};

export function HandoverReview({ code, name, onDone }: {
  code: string;
  name?: string;
  onDone: () => void;
}) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(`${thisYear}-${thisYear + 1}`);
  const [summary, setSummary] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [written, setWritten] = useState<{ path: string; dropped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.rampa.memory.handoverDraft(code, year, summary)
      .then((d) => setDraft(d as Draft))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No he podido prepararlo.'));
  }, [code, year, summary]);

  if (written) {
    return (
      <div className="stack gap4">
        <Callout intent="ok" title="Listo para enviar">
          <p style={{ marginTop: 0 }}>
            Está en <code>{written.path}</code>, dentro de tu carpeta. Es un fichero de
            texto: ábrelo, léelo una última vez y adjúntalo.
          </p>
          {written.dropped > 0 ? (
            <p style={{ margin: 0 }}>
              Quité {written.dropped} cosa(s) que marcaste. No están en el documento.
            </p>
          ) : null}
        </Callout>
        <div className="row"><button className="btn" onClick={onDone}>Volver</button></div>
      </div>
    );
  }

  const keep = (draft?.packet.claims ?? []).filter((c) => !dropped.has(c.text));

  return (
    <div className="stack gap6">
      <div className="stack gap2">
        <h2>Traspaso de {name ?? code}</h2>
        <p className="lede">
          Lo que le contarías a quien lo tenga el año que viene. Tú decides qué va y
          qué no: nada sale de aquí sin que lo revises.
        </p>
      </div>

      {/*
        The limit, above the claims and before she starts editing — because it is
        also the frame she should be reviewing *within*.
      */}
      <Callout intent="decide" title="Esto no es un diagnóstico">
        Son observaciones de tu aula. Quien las reciba tiene que tratarlas como
        hipótesis y confirmarlas en las primeras semanas. Si algo ya no encaja, no
        estaba mal escrito: el niño ha cambiado. A veces precisamente porque la
        adaptación funcionó.
      </Callout>

      <div className="stack gap3">
        <label htmlFor="year"><strong>¿De qué curso?</strong></label>
        <input className="input" id="year" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>

      <div className="stack gap3">
        <label htmlFor="summary">
          <strong>Lo que le contarías tomando un café</strong>
        </label>
        <p className="small" style={{ margin: 0 }}>
          Esto es lo primero que va a leer, y suele ser lo único que se recuerda.
          Escríbelo tú: no lo saco de tus notas porque un volcado de un año de
          notas es exactamente la etiqueta que estamos evitando.
        </p>
        <textarea className="textarea" id="summary" value={summary}
                  onChange={(e) => setSummary(e.target.value)} />
      </div>

      {error ? <Callout intent="danger" title="No he podido prepararlo">{error}</Callout> : null}

      {draft ? (
        <div className="stack gap3">
          <h3>Lo que iría en el documento</h3>
          <p className="small" style={{ margin: 0 }}>
            Quita lo que ya no valga o lo que prefieras contar en persona.
            {' '}{keep.length} de {draft.packet.claims.length} van a ir.
          </p>
          <div className="stack gap2">
            {draft.packet.claims.map((c) => {
              const out = dropped.has(c.text);
              return (
                <div className="row card" key={c.text}
                     style={{ justifyContent: 'space-between', opacity: out ? 0.5 : 1 }}>
                  <div className="stack gap1">
                    <span style={{ textDecoration: out ? 'line-through' : 'none' }}>{c.text}</span>
                    <span className="meta">
                      {EVIDENCE[c.evidence] ?? c.evidence}
                      {' · '}
                      {c.date || 'sin fecha de confirmación'}
                    </span>
                  </div>
                  <button className="btn btn-sm" onClick={() => setDropped((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.text)) next.delete(c.text); else next.add(c.text);
                    return next;
                  })}>
                    {out ? 'Volver a poner' : 'Quitar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="row gap2">
        <button className="btn btn-primary btn-lg" disabled={!summary.trim() || !draft}
                onClick={() => {
                  void window.rampa.memory
                    .handoverWrite(code, year, summary, keep.map((c) => c.text))
                    .then((r) => setWritten(r as typeof written))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No he podido guardarlo.'));
                }}>
          Preparar el documento
        </button>
        <button className="btn btn-ghost" onClick={onDone}>Cancelar</button>
      </div>

      {!summary.trim() ? (
        <p className="small">
          Escribe el resumen primero. Sin él, el documento es una tabla de códigos
          y no le sirve a nadie.
        </p>
      ) : null}
    </div>
  );
}
