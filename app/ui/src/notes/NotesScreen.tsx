import { useEffect, useState } from 'react';
import { useHouseStyle, useNotesIndex } from '../data/notes.js';
import { useVault, useWriteToVault, useOpenInVault } from '../data/vault.js';
import { useNames } from '../data/names.js';
import { Page } from '../shell/Page.js';
import { Callout } from '../components/Callout.js';
import { ConsolidateSection } from './ConsolidateSection.js';

/**
 * Cómo trabaja ella, y lo que ha corregido de la práctica y del corpus.
 *
 * Era «Mis notas», un destino de nivel superior que mezclaba **tres ámbitos**: su
 * estilo de casa, sus correcciones a la práctica y al corpus, y lo que Rampa había
 * aprendido de cada niño. El diario lleva `scope` desde `003` y esta pantalla lo
 * ignoraba, así que lo de un alumno concreto no se podía leer donde se habla de ese
 * alumno (`020` FR-1818/FR-1819).
 *
 * Ahora es un apartado de Configuración, y lo de cada niño está dentro del niño
 * (`LearnerNotes`). **Nada cambia sobre qué se escribe, dónde ni quién lo escribe**
 * (FR-1820): el `scope` lo pone ella al capturar la nota y aquí sólo se decide dónde se
 * lee. Este fichero perdió una lista, no ganó una regla.
 *
 * El índice que se muestra abajo sigue siendo el de `003` —agrupado por receta, no por
 * ámbito— y no se filtra: es el mapa de su memoria y una vista parcial de un mapa se
 * lee como un mapa completo con huecos.
 */
export function NotesScreen() {
  const [house, setHouse] = useState('');

  /*
   * Four independent loads that used to be four bare `.then(setState)` calls in
   * one effect — so any one of them rejecting killed the other three silently
   * and the screen rendered with empty boxes she would read as "I have written
   * nothing". Four hooks, four independent outcomes.
   */
  const houseStyle = useHouseStyle();
  const notesIndex = useNotesIndex();
  const vault = useVault();
  const namesLoaded = useNames();
  const writeToVault = useWriteToVault();
  const openFolder = useOpenInVault();

  useEffect(() => { if (houseStyle.state === 'ready') setHouse(String(houseStyle.value ?? '')); },
    [houseStyle.state, houseStyle]);

  const index = notesIndex.state === 'ready' ? String(notesIndex.value ?? '') : '';
  const vaultHint = vault.state === 'ready' ? (vault.value ?? '') : '';
  const names = namesLoaded.state === 'ready' ? namesLoaded.value : {};

  const save = async () => { await writeToVault.run('memory/house.md', house); };

  return (
    <Page title="Cómo trabajo yo"
          lede="Lo que quieres que Rampa tenga en cuenta siempre, y lo que le has ido
                corrigiendo. Lo de cada alumno se lee dentro de él.">
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
        <textarea className="textarea textarea-canvas" value={house} aria-labelledby="house-h"
                  aria-describedby="house-help"
                  onChange={(e) => setHouse(e.target.value)} />
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
                <div className="card card-object stack gap2" key={i}>
                  <strong className="progress-label">{(head ?? '').replace(/^##\s*/, '')}</strong>
                  <ul className="bullets">
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

      {/*
        Dónde está su carpeta (FR-1817, T033).
        
        Ya estaba en esta pantalla como una línea al pie, y FR-1817 pide que
        Configuración la tenga — así que se queda donde estaba y llega a Configuración
        con ella, en vez de aparecer una segunda vez en otro apartado. Cambiarla es cosa
        de la puesta en marcha; lo que hace falta desde aquí es **saber cuál es**, porque
        la copia de seguridad es copiar esa carpeta.
      */}
      {vaultHint ? (
        <div className="stack gap2">
          <h2>Mi carpeta</h2>
          <p className="small">
            Todo lo tuyo está aquí: <code>{vaultHint}</code>
          </p>
          <div className="row">
            <button className="btn btn-sm" onClick={() => void openFolder.run(vaultHint)}>
              Abrir la carpeta
            </button>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
