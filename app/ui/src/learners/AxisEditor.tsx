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
  /**
   * Areas she has named but not levelled yet — **added without a value invented**.
   *
   * The first version defaulted a new área to 0 and let the level buttons toggle, the way
   * the axes do. Two things were wrong with that, and an e2e walk found both: adding
   * «Lengua» silently asserted «al nivel de su curso» about a subject she had only just
   * named, and then pressing 0 to *confirm* it cleared the pair again — so the one value
   * US1 exists to record was the one value she could not set by pressing its button.
   *
   * Now a new área has no level until she gives it one, the card says what governs it
   * meanwhile, and removing is «Quitar» — one meaning per control.
   */
  const [pending, setPending] = useState<string[]>([]);
  const cur = AXES.find((a) => a.key === 'CUR')!;
  const named = [...new Set([...Object.keys(areas), ...pending])]
    .sort((a, b) => a.localeCompare(b, 'es'));

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
    if (!n || areas[n] !== undefined || pending.includes(n)) return;
    setPending((p) => [...p, n]);
    setTyped('');
  };

  /*
   * Pressing a level sets it. It does not toggle: «Quitar» is how a pair goes away, and a
   * control with two meanings is a control she has to experiment with.
   */
  const set = (area: string, level: number): void => {
    onChange({ ...areas, [area]: level });
    setPending((p) => p.filter((a) => a !== area));
  };

  const remove = (area: string): void => {
    const next = { ...areas };
    delete next[area];
    onChange(next);
    setPending((p) => p.filter((a) => a !== area));
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
      {named.map((area) => {
        const level = areas[area];
        return (
        <div className="axis-cell" key={area}>
          {/* Plain text: a subject suggested from the record was read out of a document
              somebody else wrote (Principio IX). */}
          <strong>{area}</strong>
          <div className="small muted" style={{ minHeight: '2.6em' }}>
            {level === undefined
              /* What governs it until she says. Never «0» standing in for «no lo sé». */
              ? 'Sin decir: vale el general'
              : cur.levels[level]}
          </div>
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
                    onClick={() => remove(area)}>
              Quitar
            </button>
          </div>
        </div>
        );
      })}
      </div>

      {/*
        Buttons, **not** a `<datalist>` — and this is a crash, not a preference.
        
        The first version linked this input to a `<datalist>` of her subjects. Typing a
        single real key into it killed the renderer: her window vanishes mid-sentence,
        with whatever she had not saved. It survived every test that used Playwright's
        `fill()`, which sets the value without a key event — so it took pressing a key by
        hand, in the built application, to see it. There is no `<datalist>` anywhere in
        this application now.
        
        It is also the better control for this. Most of the time the área she wants is one
        she already has, and one press beats typing it correctly; a name she does not have
        yet is a plain input with nothing hidden behind it.
      */}
      {known.filter((k) => !named.includes(k)).length ? (
        <div className="row gap2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="small muted">De las que ya usas:</span>
          {known.filter((k) => !named.includes(k)).map((k) => (
            <button type="button" className="btn btn-sm" key={k} onClick={() => add(k)}>
              {k}
            </button>
          ))}
        </div>
      ) : null}

      <div className="row gap2">
        {/*
          The input and the button need **different** names, which is a thing I got wrong
          twice in a row. First they were both «Añadir» — indistinguishable from `033`'s
          language control on the same screen. Then both became «Añadir un área», which is
          worse: two controls with one name, one a textbox and one a button, in the same
          group. Typing and adding are two acts and they say so.
        */}
        <input className="input" value={typed} placeholder="…o escribe otra"
               aria-label="Escribe un área nueva" style={{ maxWidth: '22em' }}
               onChange={(e) => setTyped(e.target.value)} />
        {/*
          Named, because it is not the only «Añadir» on this screen: `033`'s language
          control has one too. Two buttons with the same accessible name on one page is a
          list of identical rows for anybody navigating by control.
        */}
        <button type="button" className="btn" disabled={!typed.trim()}
                aria-label="Añadir un área" onClick={() => add(typed)}>
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
