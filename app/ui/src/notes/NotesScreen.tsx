import { useEffect, useState } from 'react';
import { Notice } from '../components/Notice.js';
import { ConsolidateSection } from './ConsolidateSection.js';

/** Her notes, over memory/house.md and memory/journal/. */
export function NotesScreen() {
  const [house, setHouse] = useState('');
  const [index, setIndex] = useState('');
  const [vaultHint, setVaultHint] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    void window.rampa.memory.house().then(setHouse);
    void window.rampa.memory.index().then(setIndex);
    void window.rampa.vault.current().then((r: string | null) => setVaultHint(r ?? ''));
    void window.rampa.names.all().then(setNames);
  }, []);

  const save = async () => { await window.rampa.vault.write('memory/house.md', house); };

  return (
    <div className="stack">
      <h1>Mis notas</h1>
      <Notice kind="info" title="Esto es tuyo">
        Están en tu carpeta, en texto plano. Puedes abrirlas con cualquier editor, o con Obsidian,
        y la copia de seguridad es copiar la carpeta. Si desinstalas Rampa, siguen ahí.
      </Notice>

      <h2>Cómo trabajo yo</h2>
      <textarea value={house} onChange={(e) => setHouse(e.target.value)} style={{ minHeight: 240 }} />
      <div className="row">
        <button className="primary" onClick={() => void save()}>Guardar</button>
        {house.length > 6000
          ? <span className="badge">Esto ya parece un diario más que una guía. ¿Lo resumimos?</span>
          : null}
      </div>

      {index.trim() && !index.includes('Todavía no hay') ? (
        <>
          <h2>Lo que he aprendido de ti</h2>
          <div className="card"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{index}</pre></div>
        </>
      ) : null}

      <ConsolidateSection names={names} />

      {vaultHint ? <p className="small muted">Tus ficheros: <code>{vaultHint}</code></p> : null}
    </div>
  );
}
