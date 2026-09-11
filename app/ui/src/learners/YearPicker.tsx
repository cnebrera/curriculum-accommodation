import { useEducationSystems } from '../data/corpus.js';
import { Field } from '../shell/Page.js';
import { useSystemChoice } from '../data/education-choice.js';
import { stalenessOf, stalenessNotice }
  from '../../../packages/core/src/education/lookup.js';

/**
 * One choice, filling three fields (011 T012, US1).
 *
 * She picks **5.º de Primaria** — the thing she says without thinking — and the
 * stage and the age come with it. She never types a number unless the child is
 * not the usual age for that year, which is exactly the case where it matters and
 * the only one worth her attention.
 *
 * Both stay editable afterwards and neither is corrected. A fourteen-year-old in
 * 5.º de Primaria is not an error: it is a repetition, a late arrival, or an ACI,
 * and all three are true things about a real child.
 */
export interface EducationYear {
  id: string; label: string; typicalAge: number | null;
}
export interface EducationStage {
  id: string; label: string; note?: string; years: EducationYear[];
}
export interface EducationSystem {
  id: string; label: string; stages: EducationStage[]; reviewedByTeacher: boolean;
  /** The day somebody read the education authority's pages (011 FR-908). */
  lastChecked?: string;
}

export interface Who { age?: number; year?: string; stage?: string }

export function YearPicker({ value, onChange }: {
  value: Who;
  onChange: (who: Who) => void;
}) {
  const loaded = useEducationSystems();
  /**
   * Which system her vault uses (011 T011).
   *
   * **Asked, never inferred.** Not from the OS language, not from a locale, not from
   * a timezone: a teacher in Barcelona whose laptop is in English is not teaching an
   * English curriculum, and a wrong guess here puts the wrong course list in front of
   * her with no explanation.
   *
   * And **not asked when there is nothing to ask.** With one system shipped, a
   * question with one answer is friction four times a day. The chooser appears from
   * the second system — which is exactly what T020's extension point is for, and what
   * makes «asked, never inferred» a behaviour rather than a promise.
   */
  const [chosenId, setChosenId] = useSystemChoice();

  /*
   * No `Loaded` wrapper here, and that is the deliberate exception. This is one
   * field inside a form: a loading sentence or an error callout appearing in the
   * middle of the profile editor would push everything below it up and down
   * while she is typing. The corpus ships inside the application, so the only
   * way this fails is a broken install — which every other screen will also be
   * reporting.
   */
  if (loaded.state !== 'ready') return null;
  const systems = loaded.value as EducationSystem[];
  const system = systems.find((s) => s.id === chosenId) ?? systems[0];
  if (!system) return null;

  /*
   * Marked, never withdrawn (T021, FR-908).
   *
   * A stale provider entry is hidden. Hiding the only education system leaves her
   * unable to record a course at all — and a slightly out-of-date list of Spanish
   * school years is far better than no list. So the sentence appears beside the
   * choice and the choice stays.
   */
  const staleness = stalenessOf(system.lastChecked, new Date().toISOString().slice(0, 10));
  const stale = stalenessNotice(staleness, system.label);

  const allYears = system.stages.flatMap((s) => s.years.map((y) => ({ stage: s, year: y })));
  const found = allYears.find((f) => f.year.id === value.year);

  const pickYear = (yearId: string) => {
    const picked = allYears.find((f) => f.year.id === yearId);
    if (!picked) { onChange({ ...value, year: undefined, stage: undefined }); return; }
    onChange({
      // The stage is stored as a label so the YAML stays readable without this
      // application, which is the promise the vault makes about her data.
      year: picked.year.id,
      stage: picked.stage.label,
      /*
       * The age comes with the year, and only when she has not set one. Filling
       * over a number she typed would be the application correcting her about a
       * child she has in front of her.
       *
       * A year with no typical age fills nothing: educación especial and adult
       * education say nothing about age, and a plausible guess there gets used.
       */
      age: value.age ?? picked.year.typicalAge ?? undefined,
    });
  };

  return (
    <div className="stack gap4">
      {/*
        The system, from the second one onward. One option is not a question.
      */}
      {systems.length > 1 ? (
        <Field label="¿Qué sistema educativo?" htmlFor="system"
               help="Se queda guardado: te lo pregunto una vez, no cada vez.">
          <select className="select" id="system" value={system.id}
                  onChange={(e) => setChosenId(e.target.value)}>
            {systems.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      ) : null}

      {stale ? <p className="small" role="status">{stale}</p> : null}

      {/*
        Fields, so the measure applies (`013` FR-1102, `041` T020). Written as bare
        `<label><strong>` + control, this select took the whole column: 1040px of
        «5.º de Primaria», which is the exact 1000px input ADR 0009 named.
      */}
      <Field label="¿En qué curso está?" htmlFor="year"
             {...(found?.stage.note ? { help: found.stage.note } : {})}>
        <select className="select" id="year" value={value.year ?? ''}
                onChange={(e) => pickYear(e.target.value)}>
          <option value="">— sin especificar —</option>
          {system.stages.map((stage) => (
            <optgroup key={stage.id} label={stage.label}>
              {stage.years.map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="¿Cuántos años tiene?" htmlFor="age"
             help={found && found.year.typicalAge === null
               ? 'En esta etapa el curso no dice nada de la edad, así que apúntala tú si la sabes.'
               : 'Sale sola del curso. Cámbiala si no es la que toca — pasa a menudo y no es un error.'}>
        <div className="row gap2 row-top">
          <input className="input input-xs" id="age" type="number" min={3} max={99}
                 value={value.age ?? ''}
                 onChange={(e) => onChange({
                   ...value,
                   age: e.target.value ? Number(e.target.value) : undefined,
                 })} />
          {found && found.year.typicalAge !== null && value.age !== undefined
            && Math.abs(value.age - found.year.typicalAge) >= 2 ? (
            /*
             * Said out loud, and said as information rather than as a warning.
             * This is not a mistake to fix — it is the case the whole feature
             * exists for, and the sentence tells her what the application will do
             * about it rather than implying she got something wrong.
             */
            <span className="small">
              {value.age > found.year.typicalAge
                ? `Le lleva ${value.age - found.year.typicalAge} años a lo habitual de ese curso.`
                : `Le faltan ${found.year.typicalAge - value.age} años para lo habitual de ese curso.`}
              {' '}Lo tendré en cuenta: le hablaré como a su edad, aunque el contenido
              sea el del curso.
            </span>
          ) : null}
        </div>
      </Field>
    </div>
  );
}
