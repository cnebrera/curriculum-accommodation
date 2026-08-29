import { useEffect, useState } from 'react';

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
}

export interface Who { age?: number; year?: string; stage?: string }

export function YearPicker({ value, onChange }: {
  value: Who;
  onChange: (who: Who) => void;
}) {
  const [systems, setSystems] = useState<EducationSystem[] | null>(null);

  useEffect(() => {
    void window.rampa.corpus.educationSystems()
      .then((s) => setSystems(s as EducationSystem[]));
  }, []);

  if (!systems) return null;
  // One system per vault, chosen at first run. Until there is a second, this is
  // simply the one that shipped.
  const system = systems[0];
  if (!system) return null;

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
      <div className="stack gap2">
        <label htmlFor="year"><strong>¿En qué curso está?</strong></label>
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
        {found?.stage.note ? <p className="small">{found.stage.note}</p> : null}
      </div>

      <div className="stack gap2">
        <label htmlFor="age"><strong>¿Cuántos años tiene?</strong></label>
        <div className="row gap2">
          <input className="input" id="age" type="number" min={3} max={99}
                 style={{ maxWidth: '7rem' }}
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
        <p className="small">
          {found && found.year.typicalAge === null
            ? 'En esta etapa el curso no dice nada de la edad, así que apúntala tú si la sabes.'
            : 'Sale sola del curso. Cámbiala si no es la que toca — pasa a menudo y no es un error.'}
        </p>
      </div>
    </div>
  );
}
