import { Notice } from './Notice.js';

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
    <Notice kind="warn" title="Ojo con este material">
      {notices.map((n, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <p style={{ margin: 0 }}>{n.message}</p>
          <blockquote>{n.quote}</blockquote>
          {n.block ? <p className="small muted" style={{ margin: '4px 0 0' }}>En el bloque {n.block}.</p> : null}
        </div>
      ))}
    </Notice>
  );
}
