import { useEffect, useState } from 'react';
import { ProfileEditor } from './ProfileEditor.js';

export function LearnersScreen() {
  const [codes, setCodes] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null | undefined>(undefined);

  const refresh = async () => {
    setCodes(await window.rampa.learners.list());
    setNames(await window.rampa.names.all());
  };
  useEffect(() => { void refresh(); }, []);

  if (editing !== undefined) {
    return (
      <div className="stack">
        <button onClick={() => { setEditing(undefined); void refresh(); }}>← Volver</button>
        <h1>{editing ? (names[editing] ?? editing) : 'Alumno nuevo'}</h1>
        <ProfileEditor code={editing} onSaved={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Mis alumnos</h1>
      {codes.length === 0
        ? <p className="muted">Todavía no hay ninguno. Empieza por el que más trabajo te dé.</p>
        : (
          <div className="stack">
            {codes.map((c) => (
              <button key={c} className="card" style={{ textAlign: 'left' }} onClick={() => setEditing(c)}>
                <strong>{names[c] ?? c}</strong>{' '}
                <span className="badge">{c}</span>
              </button>
            ))}
          </div>
        )}
      <div><button className="primary" onClick={() => setEditing(null)}>Añadir un alumno</button></div>
    </div>
  );
}
