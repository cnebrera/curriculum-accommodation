import { useState } from 'react';
import { useLearners } from '../data/learners.js';
import { useEducationSystems } from '../data/corpus.js';
import { Loaded } from '../data/Loaded.js';
import {
  filterRoster, searchRoster, facetsOf, type RosterFilter,
} from '../../../packages/core/src/roster/filter.js';
import { RosterFilters, whyNothingMatched } from '../learners/RosterFilters.js';
import { EmptyState } from '../components/EmptyState.js';

/**
 * Who this is for (016 T008/T009, research R1).
 *
 * ## Why this is not `LearnersScreen`
 *
 * `LearnersScreen` is where she **manages** learners: it opens profiles, edits
 * axes, prepares handovers and offers erasure. Reaching a work flow through it
 * would put the destructive control beside the one she wants, every single time
 * she starts a piece of work.
 *
 * Its own picker also does the thing that screen correctly does not: **one click
 * selects and advances.** A place is browsed; a flow moves.
 *
 * The filtering is `015`'s — `searchRoster`, `filterRoster`, `facetsOf`, and its
 * filter bar unchanged. Not reimplemented: the bar's «sin curso» option and the
 * «which filter matched nobody» sentence are the two things a second copy would
 * lose first, and they are the two that matter to the learner with the least
 * recorded.
 *
 * ## No axis appears here
 *
 * Deliberate, and not for lack of room. This is a list of children she is choosing
 * between, which is the exact shape Principle V forbids ranking — and `015`'s
 * filter accepts no axis and no ordering, so there is nowhere for one to go.
 * A name and a course is what she needs to recognise him.
 */
export function LearnerPicker({ chosen, onPick, onUnpick, onNewLearner }: {
  chosen: readonly string[];
  onPick: (code: string) => void;
  onUnpick: (code: string) => void;
  /** No learners at all routes to creating one — never a disabled control (T011). */
  onNewLearner: () => void;
}) {
  const roster = useLearners();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RosterFilter>({});
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
    <Loaded from={roster} busyLabel="Buscando a tus alumnos">
      {(learners) => {
        if (learners.length === 0) {
          /*
           * T011. With learner-first this stopped being an edge case and became
           * the first screen a new teacher meets, so it offers the action rather
           * than a greyed-out control explaining what she cannot do yet.
           */
          return (
            <EmptyState
              title="Todavía no tienes alumnos"
              action={
                <button className="btn btn-primary" onClick={onNewLearner}>
                  Añadir un alumno
                </button>
              }>
              Rampa trabaja a partir de lo que le cuesta a cada alumno. Empieza por uno.
            </EmptyState>
          );
        }

        const visible = searchRoster(filterRoster(learners, filter), query);

        return (
          <div className="stack gap4">
            {/* The bar appears from six, like `015`'s: at five it is one more
                thing to read. */}
            {learners.length >= 6 ? (
              <RosterFilters
                query={query} onQuery={setQuery}
                filter={filter} onFilter={setFilter}
                facets={facetsOf(learners)} schoolYears={[]}
                matched={visible.length} total={learners.length}
                label={yearLabel} />
            ) : null}

            {visible.length === 0 ? (
              <p className="small" role="status">{whyNothingMatched(filter, query)}</p>
            ) : (
              <ul className="pick-list" role="list">
                {visible.map((row) => {
                  const picked = chosen.includes(row.code);
                  const name = (row as { name?: string }).name ?? row.code;
                  return (
                    <li key={row.code}>
                      {/*
                        One control, one action. A checkbox plus a «continuar»
                        button would be two decisions for the commonest case,
                        which is one child.
                      */}
                      <button
                        className={picked ? 'pick pick-on' : 'pick'}
                        aria-pressed={picked}
                        onClick={() => (picked ? onUnpick(row.code) : onPick(row.code))}>
                        <strong>{name}</strong>
                        <span className="small">
                          {row.year ? yearLabel(row.year) : 'Sin curso'}
                          {row.school ? ` · ${row.school}` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      }}
    </Loaded>
  );
}
