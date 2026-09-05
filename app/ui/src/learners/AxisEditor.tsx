import { useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { nearDuplicate } from '../../../packages/core/src/vault/areas.js';

/**
 * Axes as observable classroom behaviour, from docs/axis-calibration.md — never
 * as adjectives, and never as an axis code she has to decode. "Moderada" cannot
 * be scored consistently; "pierde el hilo con más de tres cosas" can.
 */
export const AXES: Array<{ key: string; name: string; levels: [string, string, string, string] }> = [
  { key: 'PER-V', name: 'Ver la hoja', levels: [
    'Usa el material normal', 'Se cansa o pierde la línea', 'Necesita letra grande o mucho contraste', 'La vista no le sirve para leer'] },
  { key: 'PER-A', name: 'Oír la instrucción', levels: [
    'Sigue lo hablado con ruido', 'Necesita sitio delante o repetición', 'No basta con hablado: también por escrito', 'Lo hablado no le llega'] },
  { key: 'DEC', name: 'Descifrar el texto', levels: [
    'Lee con soltura', 'Lee bien pero despacio', 'Descifrar le come la comprensión', 'No accede leyendo: necesita audio'] },
  { key: 'LIN', name: 'Entender el texto', levels: [
    'Entiende lo de su edad', 'Se le escapan palabras poco frecuentes', 'Pierde frases con más de una idea', 'Necesita frases cortas y literales'] },
  { key: 'COG', name: 'Cuántas cosas a la vez', levels: [
    'Con una página normal va bien', 'Pierde el hilo en tareas de varios pasos', 'Pierde el hilo con más de tres cosas', 'Sostiene una o dos'] },
  { key: 'ATE', name: 'Cuánto rato aguanta', levels: [
    'Termina la tarea', 'Le arrastra el ruido de al lado', 'Unos minutos y hay que reconducirle', 'Trabaja a rachas cortas'] },
  { key: 'EJE', name: 'Arrancar y organizarse', levels: [
    'Se organiza solo', 'Arranca con un empujón', 'Necesita los pasos dados', 'No arranca sin el primero hecho'] },
  { key: 'MOT', name: 'Poder contestar', levels: [
    'Escribe con normalidad', 'Escribe lento o se cansa', 'A mano no es viable para respuestas largas', 'Necesita otra vía para cualquier respuesta'] },
  { key: 'REG', name: 'Saturación', levels: [
    'Le da igual el ambiente', 'Prefiere calma y previsibilidad', 'Hay cosas que le empeoran el trabajo', 'Hay cosas que le acaban la sesión'] },
  { key: 'CUR', name: 'Nivel curricular', levels: [
    'Al nivel de su curso', 'Por debajo pero dentro del curso', 'Contenidos de cursos anteriores', 'Muy alejado de su curso'] },
];

export function AxisEditor({ axes, onChange, curAreas, onCurAreasChange, knownAreas }: {
  axes: Record<string, number>;
  onChange: (axes: Record<string, number>) => void;
  /** Per-area curricular level (`032` FR-3001). Absent means she has detailed none. */
  curAreas?: Record<string, number>;
  onCurAreasChange?: (areas: Record<string, number>) => void;
  /** Subjects this vault already knows, to suggest from (FR-3007). */
  knownAreas?: readonly string[];
}) {
  const { t: es } = useStrings();
  const set = (key: string, level: number) => {
    const next = { ...axes };
    // Clicking the current level clears it: "unobserved" must stay reachable,
    // because a missing axis is not the same as zero.
    if (next[key] === level) delete next[key]; else next[key] = level;
    onChange(next);
  };

  return (
    <div className="stack">
      <p className="muted small">{es.learner.axesHelp}</p>
      <div className="axis-grid">
        {AXES.map((a) => (
          <div className="axis-cell" key={a.key}>
            <strong>{a.name}</strong>
            <div className="small muted" style={{ minHeight: '2.6em' }}>
              {axes[a.key] === undefined ? es.learner.unobserved : a.levels[axes[a.key]!]}
            </div>
            <div className="levels">
              {[0, 1, 2, 3].map((n) => (
                <button key={n} aria-pressed={axes[a.key] === n} title={a.levels[n]}
                        onClick={() => set(a.key, n)}>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {onCurAreasChange ? (
        <CurByArea areas={curAreas ?? {}} onChange={onCurAreasChange}
                   known={knownAreas ?? []} />
      ) : null}
    </div>
  );
}

/**
 * «Bien en Lengua, dos cursos en Mates» (032 T008, FR-3001/3007).
 *
 * ## Under CUR, not beside it
 *
 * It is one fact about one axis — the relationship between this child and one subject's
 * curriculum — so it lives in the same block as the general value rather than in a
 * section of its own. The general is what governs every area she has not detailed, and
 * that sentence has to be readable without leaving the screen: an area she cannot see
 * falling back is an area she thinks she set.
 *
 * ## No ceremony, on purpose
 *
 * This is the axis a tutor updates after an evaluation. If recording it costs a dialog
 * and three clicks it will not be updated, and the general value will quietly govern
 * everything again — which is the state this whole feature exists to end. SC-3004 puts a
 * teacher and a stopwatch on that claim; the design decision is here.
 */
function CurByArea({ areas, onChange, known }: {
  areas: Record<string, number>;
  onChange: (areas: Record<string, number>) => void;
  known: readonly string[];
}) {
  const [typed, setTyped] = useState('');
  const cur = AXES.find((a) => a.key === 'CUR')!;
  const entries = Object.entries(areas).sort(([a], [b]) => a.localeCompare(b, 'es'));

  /*
   * The flag, against what she already has **and** what the vault knows.
   *
   * Flagged, never merged: it offers the existing name and her spelling wins if she
   * insists. A merge she did not ask for is the tool renaming her subjects, and «Lengua»
   * silently folded into «Lenguaje musical» is not something she would ever find.
   */
  const close = typed.trim()
    ? nearDuplicate(typed.trim(), [...Object.keys(areas), ...known])
    : null;

  const add = (name: string): void => {
    const n = name.trim();
    if (!n || areas[n] !== undefined) return;
    onChange({ ...areas, [n]: 0 });
    setTyped('');
  };

  const set = (area: string, level: number): void => {
    const next = { ...areas };
    // Same rule as an axis: pressing the current level clears the pair, and a cleared
    // pair falls back to the general — which is not the same as zero.
    if (next[area] === level) delete next[area]; else next[area] = level;
    onChange(next);
  };

  return (
    <div className="stack gap2">
      <strong>Nivel curricular por área</strong>
      <p className="small muted" style={{ margin: 0 }}>
        Si no dices nada de un área, vale el nivel curricular general de arriba. Poner un
        área aquí sólo cambia esa.
      </p>

      {/*
        The same grid as the axes above, and the reason is what looking at it showed
        (T021). Stacked full-width, three areas were three tall cards — the level buttons
        stretched across the whole column and the block was longer than the ten axes it
        belongs to, which reads as a second, bigger topic rather than as one more fact
        about CUR. In the grid they are cards beside each other, the same size and shape
        as «Nivel curricular» itself.
      */}
      <div className="axis-grid">
      {entries.map(([area, level]) => (
        <div className="axis-cell" key={area}>
          {/* Plain text: a subject suggested from the record was read out of a document
              somebody else wrote (Principio IX). */}
          <strong>{area}</strong>
          <div className="small muted" style={{ minHeight: '2.6em' }}>{cur.levels[level]}</div>
          <div className="levels">
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={level === n} title={cur.levels[n]}
                      onClick={() => set(area, n)}>{n}</button>
            ))}
          </div>
          <div className="row">
            {/*
              «Quitar», not «Quitar «Conocimiento del Medio»» — found by looking at it at
              900px and `xlarge`, where the long label overflowed the grid cell and was
              **clipped mid-word**. A control whose text is cut off is a control she has
              to guess at, and a subject name is exactly the free text that will be long.
              The card's own heading sits directly above, so the visual association is
              already made; the accessible name carries the area for anyone who is not
              looking at the heading (`010` FR-812's reasoning, applied to a label).
            */}
            <button type="button" className="btn btn-ghost" aria-label={`Quitar ${area}`}
                    onClick={() => { const next = { ...areas }; delete next[area]; onChange(next); }}>
              Quitar
            </button>
          </div>
        </div>
      ))}
      </div>

      <div className="row gap2">
        <input className="input" list="rampa-areas" value={typed} placeholder="Añadir un área"
               aria-label="Añadir un área" style={{ maxWidth: '22em' }}
               onChange={(e) => setTyped(e.target.value)} />
        <datalist id="rampa-areas">
          {known.map((k) => <option key={k} value={k} />)}
        </datalist>
        <button type="button" className="btn" disabled={!typed.trim()}
                onClick={() => add(typed)}>
          Añadir
        </button>
      </div>

      {close ? (
        <p className="small">
          Ya tienes <strong>{close}</strong>. Si «{typed.trim()}» es lo mismo, usa el que
          ya tienes; si es otra área, añádela igualmente.{' '}
          <button type="button" className="btn btn-sm" onClick={() => add(close)}>
            Usar «{close}»
          </button>
        </p>
      ) : null}
    </div>
  );
}
