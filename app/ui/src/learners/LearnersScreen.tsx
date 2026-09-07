import { useState } from 'react';
import { Page, Section, Actions } from '../shell/Page.js';
import { PacketDoorSections } from '../coordination/PacketDoor.js';
import { ProfileEditor } from './ProfileEditor.js';
import { ForgetLearner } from './ForgetLearner.js';
import { RecordScreen } from './RecordScreen.js';
import { AxisStrip } from './AxisStrip.js';
import { Badge } from '../components/Badge.js';
import { Callout } from '../components/Callout.js';
import { useStrings } from '../i18n/context.js';
import { useLearners, useVaultIsNewer, type LearnerRow } from '../data/learners.js';
import { usePendingIngest, useClaimIngest } from '../data/ingest.js';
import { ReleaseNotice } from '../settings/ReleaseNotice.js';
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
function LearnerCard({ row, made, year, halfDone, onOpen }: {
  row: LearnerRow;
  /** How much she has prepared for him. Her work, never a measure of him. */
  made?: number;
  /** His course, in her words. */
  year?: string;
  /**
   * Work of his left half-finished, and how far it got (`020` T026, FR-1825).
   *
   * **In the caseload** rather than only inside him, and the requirement says why: on
   * Wednesday she does not remember which child Tuesday's worksheet was for, and a
   * marker visible only inside each learner would have her opening thirty of them to
   * find one.
   *
   * Her work, like `made` — «se quedó a medias» is about the reading she did not finish
   * confirming, and never a remark about the child.
   */
  halfDone?: { confirmed: number; pages: number };
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
      {/*
        Not a colour and not an icon alone (`010` FR-812): a sentence, because that is
        what she can act on. «A medias» with no distance to go would send her in to find
        out how much was left, which is the click this marker exists to save.
      */}
      {halfDone ? (
        <span className="small">
          <strong>Se quedó algo a medias</strong>
          {` · ${halfDone.confirmed} de ${halfDone.pages} páginas confirmadas`}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Trabajo a medias que no es de nadie (`020` T027, FR-1827).
 *
 * **Todo el de cualquier vault que exista hoy**: `for_learner` se empezó a escribir en
 * T006, así que esto no es el camino de un caso raro sino cómo su trabajo de esta semana
 * llega a ser alcanzable. Y una lectura por la que ya se ha pagado a un proveedor es
 * trabajo que ella ha metido (FR-1811), así que no puede quedarse sin puerta.
 *
 * Pregunta de quién es **antes** de continuar, y no lo adivina: la carpeta no lo sabe,
 * el fichero no lo dice, y elegir por ella pondría la ficha de un niño en el expediente
 * de otro. El `select` empieza sin nadie seleccionado por lo mismo.
 */
function OrphanWork({ rows, onContinue }: {
  rows: readonly LearnerRow[];
  onContinue: (jobId: string, learner: string) => void;
}) {
  const pending = usePendingIngest();
  const claim = useClaimIngest();
  const [whose, setWhose] = useState<Record<string, string>>({});

  const orphans = (pending.state === 'ready' ? pending.value : [])
    .filter((j) => j.learner === undefined);
  if (!orphans.length) return null;

  return (
    <Section title="Esto se quedó a medias y no sé de quién es">
      <p className="small">
        Lo leí pero no me dijiste para quién era, o lo empezaste con una versión anterior
        de Rampa. Dime de quién es y seguimos donde lo dejamos —{' '}
        <strong>no vuelvo a leerlo</strong>, eso ya está pagado.
      </p>
      {orphans.map((j) => (
        <div className="row gap2" key={j.jobId}
             style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="small">
            {j.confirmed} de {j.pages} páginas confirmadas
            <span className="meta"> · {j.jobId}</span>
          </span>
          <span className="row gap2">
            <label className="small" htmlFor={`whose-${j.jobId}`}>¿De quién es?</label>
            <select id={`whose-${j.jobId}`} className="select"
                    value={whose[j.jobId] ?? ''}
                    onChange={(e) => setWhose((w) => ({ ...w, [j.jobId]: e.target.value }))}>
              <option value="">Dime de quién</option>
              {rows.map((r) => (
                <option key={r.code} value={r.code}>{r.name || r.code}</option>
              ))}
            </select>
            <button className="btn btn-sm" disabled={!whose[j.jobId]}
                    onClick={() => {
                      const who = whose[j.jobId];
                      if (!who) return;
                      /*
                       * Se estampa **y** se continúa. Sin estampar, cerrar la ventana a
                       * mitad la traería aquí otra vez a contestar lo mismo, que es
                       * preguntarle dos veces por una respuesta que ya dio.
                       */
                      void claim.run(j.jobId, who).then(() => onContinue(j.jobId, who));
                    }}>
              Seguir con esto
            </button>
          </span>
        </div>
      ))}
    </Section>
  );
}

export function LearnersScreen({ onOpen, onNew, onContinue }: {
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
  /**
   * Seguir un trabajo a medias, ya con dueño (`020` T027, FR-1827).
   *
   * Toma el alumno además del trabajo porque la respuesta la acaba de dar ella aquí: la
   * portada es el único sitio donde se puede preguntar de quién es algo que no es de
   * nadie todavía.
   */
  onContinue: (jobId: string, learner: string) => void;
}) {
  const { t: es } = useStrings();
  /*
   * One hook, and the join lives in it (013 FR-1107). This screen used to list
   * the codes, fetch the name map, load every profile and zip the three by hand
   * — with a `loading` flag it set and cleared itself, a bespoke skeleton, and
   * no error branch at all. `learners:list` rejecting left it loading for ever.
   */
  const roster = useLearners();
  /*
   * A colleague on a newer build wrote in this folder (`032` FR-3008, P50).
   *
   * On the opening screen because it is about the **folder**, not about one learner, and
   * because the alternative is her noticing that two laptops disagree about a child and
   * having nothing to attribute it to.
   */
  const newer = useVaultIsNewer();
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
  /*
   * Por el nombre que ella le puso (decisión de Carlos, 2026-09-07, `020` T038).
   *
   * El orden anterior era el del roster, y `015` decidió con razón que **no encoda
   * nada** — no ordena por ningún eje ni dice nada del niño, y hay un test que lo
   * afirma cambiando todos los ejes y comprobando que el orden no se mueve. Pero con
   * treinta alumnos «no encoda nada» se lee como aleatorio, y encontrar a uno cuesta.
   * Lo encontró mirarlo con una lista de treinta (T038).
   *
   * Alfabético **sigue sin comparar a nadie**: es el nombre, que es lo único que ella
   * usa para reconocerlo, y no una propiedad suya. Así que FR-1821 se cumple igual y el
   * test de invariancia sigue verde — que es la comprobación de que este orden no se ha
   * convertido en un ranking por la puerta de atrás.
   *
   * `localeCompare` con `es` porque «Álvaro» va antes de «Ana» y una comparación de
   * cadenas cruda lo manda al final. Los que no tienen nombre todavía van **al final**
   * y entre ellos por código: la lista los muestra como «Sin nombre todavía», y
   * repartirlos por el alfabeto de un código que ella no lee sería colocarlos al azar
   * dentro de un orden que promete no serlo.
   */
  const visible = (searchRoster(
    filterRoster(learners, filter, (code) => workedIn[code] ?? []), query) as LearnerRow[])
    .slice()
    .sort((a, b) => {
      if (!a.name && !b.name) return a.code.localeCompare(b.code);
      if (!a.name) return 1;
      if (!b.name) return -1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true });
    });
  const facets = facetsOf(learners);

  /* Which school years she has worked in, and with whom (014, via the data
     layer — a screen never calls `window.rampa`, 013 FR-1107). */
  const facts = useCaseloadFacts(learners.map((l) => l.code));
  /** Years only, for the filter, which is what it has always taken. */
  const workedIn: Record<string, string[]> =
    Object.fromEntries(Object.entries(facts).map(([code, f]) => [code, f.years]));

  const schoolYears = [...new Set(Object.values(workedIn).flat())].sort().reverse();

  /*
   * Quién tiene algo a medias, en **una** lectura de `material/` (FR-1828).
   *
   * Un `usePendingIngest` por tarjeta serían treinta recorridos del directorio que más
   * crece en su carpeta, y `014` FR-1214 sólo permite una caché cuando una medida la
   * pide. El manejador ya devuelve el alumno de cada trabajo, así que aquí sólo hay un
   * índice por código — y `OrphanWork` lee el mismo hook, que React deduplica.
   */
  const pendingLoaded = usePendingIngest();
  const halfDone: Record<string, { confirmed: number; pages: number }> = {};
  for (const j of pendingLoaded.state === 'ready' ? pendingLoaded.value : []) {
    if (!j.learner) continue;
    // La más atrasada gana: si tiene dos a medias, la cifra que le sirve es la peor.
    const seen = halfDone[j.learner];
    if (!seen || j.confirmed < seen.confirmed) {
      halfDone[j.learner] = { confirmed: j.confirmed, pages: j.pages };
    }
  }

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
      {/*
        `info`, not `decide` — corrected by looking at it. The `decide` badge reads
        «Necesita tu decisión», and there is no decision here: nothing in this application
        can change what another build wrote. What she needs is the fact and the reason her
        screen may differ from her colleague's.
      */}
      {/*
        Lo que encontró la comprobación al abrir, si encontró algo (`034` FR-3203).

        Aquí por el mismo motivo que el aviso de debajo: es un hecho sobre su
        **instalación** y no sobre un alumno, y ésta es la pantalla por la que pasa. Se
        calla por versión en cuanto lo dice.
      */}
      <ReleaseNotice />

      {newer.state === 'ready' && newer.value ? (
        <Callout intent="info" title="Esta carpeta la ha tocado una versión más nueva">
          <p>
            Alguien ha guardado aquí con una versión de Rampa posterior a la tuya. No he
            tocado nada y todo tu trabajo sigue ahí, pero puede que <strong>yo no te
            enseñe algo que sí está en los ficheros</strong> — por ejemplo un nivel
            curricular apuntado por área. Si trabajáis los dos sobre la misma carpeta,
            actualiza y vuelve a mirar.
          </p>
        </Callout>
      ) : null}

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
                                   {...(halfDone[l.code] ? { halfDone: halfDone[l.code]! } : {})}
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
                               {...(halfDone[l.code] ? { halfDone: halfDone[l.code]! } : {})}
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

            {/*
              The door (`030` T011). Here because a packet arrives about **somebody in
              her class**, and until she opens it she does not know which one — so the
              screen that lists her class is where she is standing when a colleague's
              file lands.
            */}
            {/*
              Antes de la puerta de los paquetes y después de la lista: es trabajo suyo
              que ya existe, no algo que llega de fuera.
            */}
            <OrphanWork rows={rows} onContinue={onContinue} />

            <PacketDoorSections learners={rows.map((r) => r.code)} />
          </>
        )}
      </Loaded>
    </Page>
  );
}
