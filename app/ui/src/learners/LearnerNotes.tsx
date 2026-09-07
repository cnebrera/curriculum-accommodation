import { Section } from '../shell/Page.js';
import { Loaded } from '../data/Loaded.js';
import { useLearnerNotes } from '../data/notes.js';

/**
 * Lo que Rampa ha aprendido de este alumno, donde se habla de él (020 T035, FR-1818).
 *
 * ## Por qué no estaba aquí
 *
 * El diario lleva `scope` y `learner` desde `003`, y la pantalla que lo leía mezclaba
 * los tres ámbitos en una lista bajo «Mis notas». Así que **lo que Rampa había
 * aprendido de un niño no se podía leer en el sitio donde se habla de ese niño**, que es
 * el diagnóstico de `020` otra vez: el dato estaba bien guardado y mal colocado.
 *
 * ## Lo que esta pantalla no hace
 *
 * No escribe, no borra y no cambia de ámbito nada (FR-1820, Principio VIII). Sus notas
 * son suyas y están en texto plano en su carpeta; la respuesta de `003` a «quiero
 * cambiar una» es que la abra. Un botón de borrar aquí sería esta aplicación decidiendo
 * qué se olvida de un alumno, que es exactamente lo que el Principio VIII prohíbe.
 */
export function LearnerNotes({ code, name }: { code: string; name?: string }) {
  const notes = useLearnerNotes(code);

  return (
    <Section title={`Lo que he aprendido de ${name ?? 'él'}`}
             lede="Lo que has ido corrigiendo cuando le preparaba algo. Lo apuntas tú; yo
                   sólo lo recuerdo.">
      <Loaded from={notes} busyLabel="Buscando lo que has apuntado de él">
        {(rows) => rows.length === 0 ? (
          /*
            Dicho, y no un hueco: un espacio en blanco donde van sus notas se lee como
            «se me han perdido». Y sin invitación a escribir aquí, porque el diario se
            escribe corrigiendo una hoja y no rellenando un formulario (`003` FR-201).
          */
          <p className="small muted">
            Todavía no has apuntado nada suyo. Se apunta cuando corriges algo de lo que
            te preparo, no aquí.
          </p>
        ) : (
          <div className="stack gap3">
            {rows.map((n) => (
              <div className="card stack gap2" key={n.path}>
                <span className="small">
                  {/*
                    La fecha delante, porque una nota sin cuándo no se puede pesar contra
                    lo que ella ve hoy en clase.
                  */}
                  <strong>{n.date ?? 'sin fecha'}</strong>
                  {statusWord(n.status)
                    ? <span className="meta"> · {statusWord(n.status)}</span> : null}
                  {n.recipes.length ? <span className="meta"> · {n.recipes.join(', ')}</span> : null}
                </span>
                <div className="material" lang="es">{n.body.trim()}</div>
              </div>
            ))}
          </div>
        )}
      </Loaded>
    </Section>
  );
}

/**
 * El estado de una nota, en sus palabras — y `open` no dice nada.
 *
 * Se veía «open» en una pantalla en español, que es un enum interno asomando: el
 * esquema del diario tiene `open | promoted | archived` y esta pantalla lo imprimía en
 * crudo. Lo encontró mirarlo.
 *
 * Enumerado y no un formateo genérico, con una razón por valor. Y `open` —el caso
 * común, «lo apunté y ahí está»— no imprime nada: una etiqueta en todas las filas es
 * mobiliario, y «sin promover» le daría a cada observación suya el aire de estar a
 * medias cuando está exactamente como ella la dejó.
 *
 * Precedente en `ConsolidateSection`, que hace lo mismo con su propio `because`.
 */
function statusWord(status?: string): string | null {
  if (status === 'promoted') return 'ya es una regla';
  if (status === 'archived') return 'archivada';
  return null;
}
