import { useState } from 'react';
import { Page, Section, Actions } from '../shell/Page.js';
import { ProfileEditor } from './ProfileEditor.js';
import { ForgetLearner } from './ForgetLearner.js';
import { HandoverReview } from './HandoverReview.js';
import { RecordScreen } from './RecordScreen.js';
import { AxisStrip } from './AxisStrip.js';
import { Badge } from '../components/Badge.js';
import { Callout } from '../components/Callout.js';
import { useStrings } from '../i18n/context.js';
import { useLearners, type LearnerRow } from '../data/learners.js';
import { RosterFilters, whyNothingMatched } from './RosterFilters.js';
import { filterRoster, searchRoster, facetsOf, groupRoster, type RosterFilter }
  from '../../../packages/core/src/roster/filter.js';
import { useEducationSystems } from '../data/corpus.js';
import { useCaseloadFacts } from '../data/record.js';
import { Loaded } from '../data/Loaded.js';

/**
 * Her caseload (spec 010 T015).
 *
 * A learner is a row with their barriers visible, not a name and a chevron: the
 * axis strip is the fastest way for her to remember who this is, and it is the
 * thing she is actually looking for when she opens this screen.
 */
/**
 * One learner, as a row.
 *
 * Extracted so the list view and the grouped view render the identical card. Two
 * copies would drift, and the way they would drift on this screen is one of them
 * growing a column — which is how a caseload becomes a table (Principle V).
 */
function LearnerCard({ row, made, year, onOpen }: {
  row: LearnerRow;
  /** How much she has prepared for him. Her work, never a measure of him. */
  made?: number;
  /** His course, in her words. */
  year?: string;
  onOpen: (code: string) => void;
}) {
  return (
    <button className="card card-action stack gap2" onClick={() => onOpen(row.code)}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="row gap2" style={{ alignItems: 'baseline' }}>
          {/*
            «Sin nombre todavía» rather than the code repeated.

            The row used to fall back to the code for the name, so a learner with no name
            set read as «S1  S1» — an identifier sitting where a child's name goes. Carlos
            read the seeded caseload as being *called* S1 to S7, which is a reasonable
            reading of what the screen said.
          */}
          <strong>{row.name || <span className="muted">Sin nombre todavía</span>}</strong>
          <Badge>{row.code}</Badge>
        </span>
        <span className="small">
          {made === undefined ? '' : made === 0 ? 'Nada preparado todavía'
            : `${made} ${made === 1 ? 'cosa preparada' : 'cosas preparadas'}`}
        </span>
      </div>
      {/*
        What she needs to **choose**, not what describes him.

        This card carried the axis strip — `015`'s decision, with a real argument: «a
        learner is a row with their barriers visible, not a name and a chevron». Carlos,
        using it with a real caseload, disagreed: «me sigues metiendo las cajas de ver la
        hoja, seguir instrucciones… no me aporta nada… prefiero cosas que me ayuden a
        filtrar. Ya veré ese detalle cuando entre en el alumno».

        He is right about what this screen is *for*. It is where she picks a child, and
        picking needs course, age and how much she has done — the same facts the filters
        work on. The barriers are what she reads once she is inside him, which is one
        click away and is where FR-1312 requires them to read as «what helps this child».

        Retired knowingly rather than quietly: `015` FR-1312 asks that the strip read
        correctly «in every view it appears in», and does not require this to be one.
      */}
      <span className="small muted">
        {[year, row.age ? `${row.age} años` : null, row.school]
          .filter(Boolean).join(' · ') || 'Sin curso todavía'}
      </span>
    </button>
  );
}

export function LearnersScreen({ onOpen, onNew }: {
  /**
   * She picked a learner (020 T010). The caseload's whole job.
   *
   * It used to hold four sub-views of its own — the profile editor, the record, the
   * handover and erasure — in local state, which is how the editor became the centre
   * of the learner and the record ended up as a card underneath a form. Routing belongs
   * to whoever owns the route; this screen owns the list.
   */
  onOpen: (code: string) => void;
  /** «Añadir un alumno» — a learner who does not exist yet has no place to enter. */
  onNew: () => void;
}) {
  const { t: es } = useStrings();
  /*
   * One hook, and the join lives in it (013 FR-1107). This screen used to list
   * the codes, fetch the name map, load every profile and zip the three by hand
   * — with a `loading` flag it set and cleared itself, a bespoke skeleton, and
   * no error branch at all. `learners:list` rejecting left it loading for ever.
   */
  const roster = useLearners();
  const learners: LearnerRow[] = roster.state === 'ready' ? roster.value : [];
  const refresh = roster.reload;


  /*
   * Finding a learner among thirty (015).
   *
   * Both live here rather than in the filter bar so the list and the bar cannot
   * disagree about what is applied — the two-copies-of-one-truth defect, which
   * on this screen would show as a caseload that looks filtered and is not.
   */
  /** Her name for the child, for a screen title. The code is what reaches disk. */
  const nameOf = (code: string): string | undefined =>
    learners.find((l) => l.code === code)?.name;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RosterFilter>({});
  const [grouped, setGrouped] = useState(false);

  /*
   * Filter, then search. Order matters for the count she is shown: «3 de 30»
   * should mean three of her caseload, not three of whatever the last dropdown
   * left behind.
   */
  const visible = searchRoster(
    filterRoster(learners, filter, (code) => workedIn[code] ?? []), query) as LearnerRow[];
  const facets = facetsOf(learners);

  /* Which school years she has worked in, and with whom (014, via the data
     layer — a screen never calls `window.rampa`, 013 FR-1107). */
  const facts = useCaseloadFacts(learners.map((l) => l.code));
  /** Years only, for the filter, which is what it has always taken. */
  const workedIn: Record<string, string[]> =
    Object.fromEntries(Object.entries(facts).map(([code, f]) => [code, f.years]));

  const schoolYears = [...new Set(Object.values(workedIn).flat())].sort().reverse();

  /** Courses in her words. Falls back to the id, which is at least stable. */
  const systems = useEducationSystems();
  const yearLabel = (id: string): string => {
    if (systems.state !== 'ready') return id;
    for (const sys of systems.value as Array<{ stages: Array<{ years: Array<{ id: string; label: string }> }> }>) {
      for (const st of sys.stages) {
        const y = st.years.find((yy) => yy.id === id);
        if (y) return y.label;
      }
    }
    return id;
  };

  return (
    <Page title={es.nav.learners}
          lede={learners.length > 0
            ? `${learners.length} ${learners.length === 1 ? 'alumno' : 'alumnos'}. Los nombres solo los ves tú: en los ficheros va un código.`
            : 'Los nombres solo los ves tú: en los ficheros va un código.'}>
      <Loaded
        from={roster}
        busyLabel="Un momento, que busco tus alumnos…"
        empty={{
          title: 'Todavía no hay ningún alumno',
          body: 'Empieza por el que más trabajo te dé. No hace falta ningún diagnóstico: con lo que ves en clase es suficiente.',
          action: <button className="btn btn-primary" onClick={onNew}>Añadir un alumno</button>,
        }}
      >
        {(rows) => (
          <>
            {/*
              From four, not from six.

              Carlos: «la lista de alumnos sigue sin tener filtros». They were there —
              behind a threshold of six, and he was testing with two. A control that
              exists and cannot be seen is a control that does not exist, and the number
              was chosen by me guessing where scanning gets hard rather than by watching
              anybody.
            */}
            {rows.length >= 4 ? (
              <RosterFilters
                query={query} onQuery={setQuery}
                filter={filter} onFilter={setFilter}
                facets={facets}
                schoolYears={schoolYears}
                matched={visible.length} total={rows.length}
                label={yearLabel}
              />
            ) : null}

            {visible.length === 0 ? (
              /* Names the filter responsible rather than saying «sin
                 resultados» — she set three, and the useful information is
                 which one to loosen (FR-1304). */
              <Callout intent="info" title="Aquí no hay nadie">
                <p>{whyNothingMatched(filter, query)}</p>
                <div className="row">
                  <button className="btn btn-sm" onClick={() => { setQuery(''); setFilter({}); }}>
                    Quitar los filtros
                  </button>
                </div>
              </Callout>
            ) : grouped ? (
              /*
                 Grouped, never ranked (FR-1310). Groups answer «para quién
                 preparo mañana», which is the actual question, and carry no
                 ordering between children. Within a group the order is the
                 caseload's own and encodes nothing.
              */
              <>
                {groupRoster(visible, yearLabel).map(([heading, members]) => (
                  <Section key={heading} title={heading}>
                    {(members as LearnerRow[]).map((l) => (
                      <LearnerCard key={l.code} row={l} onOpen={onOpen}
                                   {...(facts[l.code] ? { made: facts[l.code]!.made } : {})}
                                   {...(l.year ? { year: yearLabel(l.year) } : {})} />
                    ))}
                  </Section>
                ))}
              </>
            ) : (
              <div className="stack gap3">
                {visible.map((l) => (
                  <LearnerCard key={l.code} row={l} onOpen={onOpen}
                               {...(facts[l.code] ? { made: facts[l.code]!.made } : {})}
                               {...(l.year ? { year: yearLabel(l.year) } : {})} />
                ))}
              </div>
            )}

            <Actions
              primary={
                <button className="btn btn-primary" onClick={onNew}>
                  Añadir un alumno
                </button>
              }>
              {/* Two ways of looking, and no third. There is deliberately no
                  table: see the note in `RosterFilters.tsx`. */}
              {rows.length >= 4 ? (
                <button className="btn btn-sm" aria-pressed={grouped}
                        onClick={() => setGrouped((g) => !g)}>
                  {grouped ? 'Ver la lista' : 'Agrupar por curso'}
                </button>
              ) : null}
            </Actions>
          </>
        )}
      </Loaded>
    </Page>
  );
}
