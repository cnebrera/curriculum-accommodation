import { es } from '../i18n/es.js';

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

export function AxisEditor({ axes, onChange }: {
  axes: Record<string, number>;
  onChange: (axes: Record<string, number>) => void;
}) {
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
          <div className="axis" key={a.key}>
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
    </div>
  );
}
