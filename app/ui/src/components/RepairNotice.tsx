import { Notice } from './Notice.js';

/**
 * 006 FR-410. A hand-edit that breaks the structure is our defect, so the tone
 * is ours too: it says what was tidied and makes clear nothing of hers was lost.
 */
export function RepairNotice({ repairs }: { repairs: Array<{ message: string }> }) {
  if (repairs.length === 0) return null;
  return (
    <Notice kind="info" title="He arreglado un par de cosas del formato">
      <ul style={{ margin: '8px 0 0', paddingLeft: '1.2em' }}>
        {repairs.map((r, i) => <li key={i}>{r.message}</li>)}
      </ul>
      <p className="small" style={{ margin: '10px 0 0' }}>No he cambiado nada de lo que escribiste.</p>
    </Notice>
  );
}
