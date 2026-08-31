import { useId } from 'react';
import { UNSET, type RosterFilter } from '../../../packages/core/src/roster/filter.js';

/**
 * Finding a learner in a caseload of thirty (015 T012/T013).
 *
 * ## What this component is not
 *
 * It is not a header for a table, because there is no table. The columns a table
 * would offer are the nine axis values, and a grid of children sortable by their
 * barriers is a league table of disability (Principle V). There is no sort
 * control here and there is nowhere for one to go: `filterRoster` takes no
 * ordering, so the interface has nothing to ask for.
 *
 * ## Only what exists
 *
 * The dropdowns are built from the caseload's own values. A primary-school
 * teacher offered «4.º de la ESO» reads past it four times a day, and a filter
 * that lists options matching nobody is a filter that has to be tried to be
 * ruled out.
 *
 * ## «Sin curso» is an option, not an absence
 *
 * A learner with no course is the one she added in a hurry because he needed
 * something tomorrow. Silently excluding him from a filtered view is how the
 * child with the least recorded becomes the child she cannot find.
 */

export interface Facets {
  years: string[];
  stages: string[];
  schools: string[];
  hasUnset: { year: boolean; stage: boolean; school: boolean };
}

export function RosterFilters({
  query, onQuery, filter, onFilter, facets, schoolYears, matched, total, label,
}: {
  query: string;
  onQuery: (q: string) => void;
  filter: RosterFilter;
  onFilter: (f: RosterFilter) => void;
  facets: Facets;
  schoolYears: string[];
  matched: number;
  total: number;
  /** How to show a course id in her words. */
  label: (yearId: string) => string;
}) {
  const searchId = useId();
  const active = Object.values(filter).some((v) => v !== undefined) || query.trim() !== '';

  /** One select. `''` means "not filtering" — see `UNSET` for the other absence. */
  const select = (
    key: keyof RosterFilter,
    caption: string,
    values: string[],
    hasUnset: boolean,
    show: (v: string) => string = (v) => v,
  ) => {
    if (values.length === 0 && !hasUnset) return null;
    return (
      <label className="roster-filter">
        <span className="small">{caption}</span>
        <select className="select" value={filter[key] ?? ''}
                onChange={(e) => onFilter({ ...filter, [key]: e.target.value || undefined })}>
          <option value="">Todos</option>
          {values.map((v) => <option key={v} value={v}>{show(v)}</option>)}
          {hasUnset ? <option value={UNSET}>— sin especificar —</option> : null}
        </select>
      </label>
    );
  };

  return (
    <div className="roster-bar stack gap3">
      <div className="field" style={{ maxWidth: '22rem' }}>
        <label htmlFor={searchId}><strong>Buscar</strong></label>
        <input className="input" id={searchId} type="search" value={query}
               placeholder="Su nombre, o el código de la hoja"
               onChange={(e) => onQuery(e.target.value)} />
        {/* The code is what is printed on the sheet, so it is what she has in
            her hand when she is looking for the child it belongs to. */}
        <p className="field-help">Vale el nombre o el código.</p>
      </div>

      <div className="roster-filters">
        {select('year', 'Curso', facets.years, facets.hasUnset.year, label)}
        {select('stage', 'Etapa', facets.stages, facets.hasUnset.stage)}
        {select('school', 'Colegio', facets.schools, facets.hasUnset.school)}
        {/* From the work, not the profile: a learner who changed course must
            still be findable under last year's work (015 FR / `014`). */}
        {schoolYears.length
          ? select('schoolYear', 'Trabajé con él en', schoolYears, true)
          : null}
      </div>

      {/*
        Visibly applied, and clearable in one action (FR-1303). A caseload that
        looks half-empty with no visible reason is a caseload she concludes we
        lost.
      */}
      {active ? (
        <div className="row gap3" role="status">
          <span className="small">
            {matched === total
              ? `${total} ${total === 1 ? 'alumno' : 'alumnos'}`
              : `${matched} de ${total}`}
          </span>
          <button className="btn btn-ghost btn-sm"
                  onClick={() => { onQuery(''); onFilter({}); }}>
            Quitar los filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * What to say when nothing matches (FR-1304).
 *
 * It names the filter responsible rather than saying «sin resultados», because
 * she set three of them and the useful information is which one to loosen.
 */
export function whyNothingMatched(filter: RosterFilter, query: string): string {
  const named: string[] = [];
  if (query.trim()) named.push(`la búsqueda «${query.trim()}»`);
  if (filter.year !== undefined) named.push('el curso');
  if (filter.stage !== undefined) named.push('la etapa');
  if (filter.school !== undefined) named.push('el colegio');
  if (filter.schoolYear !== undefined) named.push('el curso escolar');

  if (named.length === 0) return 'No hay ningún alumno todavía.';
  if (named.length === 1) return `Ningún alumno cumple ${named[0]}. Prueba a quitarlo.`;
  return `Ningún alumno cumple ${named.slice(0, -1).join(', ')} y ${named.at(-1)}. `
    + 'Prueba a quitar uno.';
}
