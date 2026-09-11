import { Callout } from './Callout.js';

/**
 * Quoted and located, in plain Spanish (007 FR-503). Never removed: deletion
 * hides an attack and loses legitimate content, so she gets to decide whether
 * the text belongs on the worksheet at all.
 */
export function InjectionNotice({ notices }: {
  notices: Array<{ block: string | null; quote: string; message: string }>;
}) {
  if (notices.length === 0) return null;
  return (
    <Callout intent="danger" title="Ojo con este material">
      <div className="stack gap3">
        {notices.map((n, i) => (
          <div key={i} className="stack gap1">
            <p>{n.message}</p>
            <blockquote className="quote">{n.quote}</blockquote>
            {n.block ? <p className="small muted">En el bloque {n.block}.</p> : null}
          </div>
        ))}
      </div>
    </Callout>
  );
}
