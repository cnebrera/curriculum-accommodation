import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout.js';
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
      <Callout intent="info" title="Esto es tuyo">
        Están en tu carpeta, en texto plano. Puedes abrirlas con cualquier editor, o con Obsidian,
        y la copia de seguridad es copiar la carpeta. Si desinstalas Rampa, siguen ahí.
      </Callout>

      <div className="stack gap2">
        <h2 id="house-h">Cómo trabajo yo</h2>
        <p className="small" id="house-help">
          Lo que quieras que Rampa tenga en cuenta siempre: cómo pones los enunciados,
          qué formato usas en clase, lo que ya sabes que no funciona. Se escribe en
          <code> memory/house.md</code>, en tu carpeta.
        </p>
        {/*
          The heading is the field's name, so it is the field's label. Without
          this the textarea had no accessible name at all — a critical axe
          violation, and for a screen-reader user simply an unnamed box.
        */}
        <textarea className="textarea" value={house} aria-labelledby="house-h"
                  aria-describedby="house-help"
                  onChange={(e) => setHouse(e.target.value)} style={{ minHeight: 240 }} />
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void save()}>Guardar</button>
        {house.length > 6000
          ? <span className="badge">Esto ya parece un diario más que una guía. ¿Lo resumimos?</span>
          : null}
      </div>

      {index.trim() && !index.includes('Todavía no hay') ? (
        <>
          <h2>Lo que he aprendido de ti</h2>
          <div className="stack gap3">
            {index.split(/\n(?=## )/).filter((s) => s.startsWith('## ')).map((sec, i) => {
              const [head, ...items] = sec.split('\n');
              return (
                <div className="card" key={i}>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{(head ?? '').replace(/^##\s*/, '')}</strong>
                  <ul className="stack gap1" style={{ margin: 'var(--s2) 0 0', paddingLeft: '1.1em' }}>
                    {items.filter((l) => l.trim().startsWith('-')).map((l, j) => (
                      <li className="small" key={j}>{l.replace(/^\s*-\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <ConsolidateSection names={names} />

      {vaultHint ? <p className="small muted">Tus ficheros: <code>{vaultHint}</code></p> : null}
    </div>
  );
}
