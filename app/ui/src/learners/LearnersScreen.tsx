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
import { useWorkedYears } from '../data/record.js';
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
function LearnerCard({ row, onOpen }: { row: LearnerRow; onOpen: (code: string) => void }) {
  return (
    <button className="card card-action stack gap3" onClick={() => onOpen(row.code)}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row gap2">
          <strong>{row.name}</strong>
          <Badge>{row.code}</Badge>
        </span>
        <span className="small">
          {row.works} {row.works === 1 ? 'apoyo' : 'apoyos'} · {row.avoid} a evitar
        </span>
      </div>
      <AxisStrip axes={row.axes} compact />
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
  const workedIn = useWorkedYears(learners.map((l) => l.code));

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
            {/* The bar only earns its space once there are enough learners to
                need it. At five, a filter is one more thing to read. */}
            {rows.length >= 6 ? (
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
                    {(members as LearnerRow[]).map((l) => <LearnerCard key={l.code} row={l} onOpen={onOpen} />)}
                  </Section>
                ))}
              </>
            ) : (
              <div className="stack gap3">
                {visible.map((l) => <LearnerCard key={l.code} row={l} onOpen={onOpen} />)}
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
              {rows.length >= 6 ? (
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
