import { Notice } from './Notice.js';

/**
 * Asks before sending, never rewrites silently (006 FR-419).
 *
 * A name the system does not know cannot be substituted, so the only honest
 * options are to ask her or to send it — and sending a child's name without
 * telling her is not an option.
 */
export function NameWarning({ flagged, onAddName, onSendAnyway }: {
  flagged: string[];
  onAddName: (name: string) => void;
  onSendAnyway: () => void;
}) {
  if (flagged.length === 0) return null;
  return (
    <Notice kind="warn" title="Creo que ahí hay un nombre">
      <p>
        He visto {flagged.length === 1 ? 'esto' : 'esto'}: <strong>{flagged.join(', ')}</strong>.
        Si es el nombre de un alumno, dímelo y lo sustituyo por su código antes de enviar nada.
      </p>
      <div className="row">
        {flagged.map((f) => (
          <button className="btn" key={f} onClick={() => onAddName(f)}>Es un alumno: {f}</button>
        ))}
        <button className="btn" onClick={() => {
          // Remembered, so the same word is not queried on every job (T090).
          for (const f of flagged) void window.rampa.names.ignore(f);
          onSendAnyway();
        }}>No es un nombre, sigue</button>
      </div>
    </Notice>
  );
}
