import { Callout } from '../components/Callout.js';

/**
 * The report, as a designed reading experience (spec 010 FR-826, T011).
 *
 * This replaces a `<pre>` block containing the markdown, which was the single
 * least finished thing in the application and sat on the screen where the
 * teacher's professional judgement is the product. She reviews about fifteen
 * decisions instead of re-reading twelve pages — that is what makes the time
 * saving real (001 US2), and a wall of monospace does not deliver it.
 *
 * Built from `buildReport()`'s structures, not from its markdown. The markdown
 * still goes to `report.md` in her vault, because she must be able to read it
 * without this application.
 *
 * **Everything here renders as text, never as markup.** The content is model
 * output derived from third-party material, and 007's reasoning applies to a
 * rendered view exactly as it applies to a prompt. React escapes by default;
 * this comment exists so nobody later reaches for `dangerouslySetInnerHTML` to
 * "support bold in the report".
 */
export interface Decision { title: string; recipe: string; axis: string; blocks: string[] }
export interface ReportNotice { block: string | null; notice: { kind: string; quote: string; message: string } }

export function ReportView({ decisions, notDone, notices, memoryApplied }: {
  decisions: Decision[];
  notDone: string[];
  notices?: ReportNotice[];
  memoryApplied?: Array<{ source: string; effect: string }>;
}) {
  const flagged = notDone.filter((n) => n.startsWith('Necesita que lo decidas tú'));
  const rest = notDone.filter((n) => !n.startsWith('Necesita que lo decidas tú'));

  return (
    <div className="stack gap5">
      {/* What was not done leads, always. It is the section she needs. */}
      {flagged.length > 0 && (
        <Callout intent="decide" title={`Esto lo decides tú — ${flagged.length} ${flagged.length === 1 ? 'cosa' : 'cosas'}`}>
          <div className="stack gap2">
            {flagged.map((n, i) => <p key={i}>{n.replace(/^Necesita que lo decidas tú:\s*/, '')}</p>)}
          </div>
        </Callout>
      )}

      {rest.length > 0 && (
        <Callout intent="decide" title="Lo que NO he hecho">
          <div className="stack gap2">{rest.map((n, i) => <p key={i}>{n}</p>)}</div>
        </Callout>
      )}

      {notices && notices.length > 0 && (
        <Callout intent="danger" title="Ojo con este material">
          <div className="stack gap3">
            {notices.map((n, i) => (
              <div key={i} className="stack gap1">
                <p>{n.notice.message}</p>
                <blockquote className="quote">{n.notice.quote}</blockquote>
                {n.block && <span className="meta">en el bloque {n.block}</span>}
              </div>
            ))}
          </div>
        </Callout>
      )}

      {decisions.length > 0 ? (
        <section className="stack gap2">
          <h2>Qué he cambiado y por qué</h2>
          <div>
            {decisions.map((d) => (
              <div className="decision" key={`${d.recipe}|${d.axis}`}>
                <h4>{d.title}</h4>
                <p className="why">
                  {d.blocks.length === 1
                    ? 'Un bloque'
                    : `${d.blocks.length} bloques`}: {d.blocks.join(', ')}
                </p>
                <div className="row gap2">
                  <span className="tag">{d.recipe}</span>
                  <span className="tag">{d.axis}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <Callout intent="info" title="No he cambiado nada">
          Revisa si el perfil tiene ejes sin observar: sin barreras registradas no
          hay reglas que aplicar.
        </Callout>
      )}

      {memoryApplied && memoryApplied.length > 0 && (
        <section className="stack gap2">
          <h3>Lo que he aplicado de lo que me enseñaste</h3>
          <div>
            {memoryApplied.map((m, i) => (
              <div className="decision" key={i}>
                <h4>{m.effect}</h4>
                <span className="meta">{m.source}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
