import { Callout } from './Callout.js';

/**
 * 006 FR-410. A hand-edit that breaks the structure is our defect, so the tone
 * is ours too: it says what was tidied and makes clear nothing of hers was lost.
 */
export function RepairNotice({ repairs }: { repairs: Array<{ message: string }> }) {
  if (repairs.length === 0) return null;
  return (
    <Callout intent="info" title="He arreglado un par de cosas del formato">
      <ul className="bullets">
        {repairs.map((r, i) => <li key={i}>{r.message}</li>)}
      </ul>
      <p className="small">No he cambiado nada de lo que escribiste.</p>
    </Callout>
  );
}
