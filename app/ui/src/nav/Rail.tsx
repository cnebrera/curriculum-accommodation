import type { ReactNode } from 'react';
import { Wordmark } from '../components/Logo.js';
import {
  MAIN_TABS, settingsPanes,
  type LearnerTab, type Route, type RouteAction, type SettingsPane,
} from './route.js';

/**
 * One rail, and it changes with where she is (020 T009, option A).
 *
 * ## Why there is not a second menu
 *
 * The first build gave the learner their own menu **beside** the rail, which is what
 * Carlos asked for and what he rejected on sight — correctly, and the reason is
 * measurable: a 248px rail plus a 221px learner menu plus the gap is **501px of chrome
 * before the content starts**, 37% of a 1366px window. The learner menu is sized in
 * `em`, so at the large text scale it reaches 592px — 43% — in an application whose
 * content is a worksheet.
 *
 * So the rail *becomes* the learner's. Outside a learner it holds her caseload and the
 * settings; inside one it holds the way back, their name, and their sections. One
 * column, one place to look, and the same 253px of width handed back to the sheet.
 *
 * ## What that costs, stated
 *
 * «Configuración» is not visible from inside a learner. It is a destination she reaches
 * twice a month, and the one time she needs it urgently — the pictogram set is missing —
 * the learner's own page points at it (`025` FR-2303).
 *
 * ## The third shape (025 T005)
 *
 * The rail now becomes Configuración's too, by the same rule: outside anything it holds
 * her caseload and the top level, inside a learner it holds their sections, inside
 * Configuración it holds its own. Three shapes, one column, one `aria-label` that
 * follows the contents — and no second menu, which is the thing Carlos rejected on
 * sight and the measurement that killed it (501px of chrome).
 */

const TAB_LABEL: Record<LearnerTab, string> = {
  who: 'Quién es',
  prepare: 'Preparar',
  structure: 'Su día y sus rutinas',
  made: 'Lo que le he preparado',
  curriculum: 'Su adaptación curricular',
  handover: 'Preparar el traspaso',
  erase: 'Borrar todo lo suyo',
};

/**
 * Below a rule, because they are not what she came for — and **not** hidden.
 *
 * A school has to be able to erase a learner: burying it means she asks somebody to do
 * it in the filesystem instead, which reaches neither the journal entries nor the
 * adapted sheets (`003`).
 */
const FOOT_TABS: LearnerTab[] = ['handover', 'erase'];

export function Rail({ route, go, learnerName, labels, foot }: {
  route: Route;
  go: (action: RouteAction) => void;
  /** Her name for the learner she is inside, if she is inside one. Display only. */
  learnerName?: string;
  /** The top-level labels, from the locale. */
  /**
   * Every label in the rail, from the locale — including Configuración's sections.
   *
   * Hardcoding «Pictogramas» here would put it out of reach of the locale sweep, which
   * is the same shape as a class name a stylesheet does not have: it works, in one
   * language, until somebody offers another.
   */
  labels: {
    learners: string; work: string; notes: string;
    connection: string; about: string; settings: string; pictograms: string;
    normative: string; criterio: string; house: string;
  };
  /** The cost badge, the display controls and the locale — unchanged (`013` FR-1106). */
  foot: ReactNode;
}) {
  const inside = route.at === 'learner';
  const inSettings = route.at === 'settings';

  /**
   * Configuración's sections, labelled from the locale.
   *
   * «Pictogramas» is first because it is the only one she is ever *sent* here for: a
   * learner's page points at it when the set is missing.
   */
  const paneLabel: Record<SettingsPane, string> = {
    pictograms: labels.pictograms,
    normative: labels.normative,
    house: labels.house,
    criterio: labels.criterio,
    service: labels.connection,
    about: labels.about,
  };

  const pane = (p: SettingsPane) => (
    <button key={p}
            {...(inSettings && route.pane === p ? { 'aria-current': 'page' as const } : {})}
            onClick={() => go({ type: 'settings', pane: p })}>
      {paneLabel[p]}
    </button>
  );

  const tab = (t: LearnerTab) => (
    <button key={t}
            {...(inside && route.tab === t ? { 'aria-current': 'page' as const } : {})}
            onClick={() => go({ type: 'learner/tab', tab: t })}>
      {TAB_LABEL[t]}
    </button>
  );

  /*
   * `top` se ha ido con «Mis notas» (T037). Era el ayudante que dibujaba una entrada de
   * nivel superior que no es ni el alumnado ni Configuración, y ya no hay ninguna — el
   * tipo del parámetro se había estrechado a `'notes'` en T028 y ahora no le queda
   * ningún valor, que es la señal de que el ayudante sobra.
   */

  return (
    <nav
      className="rail"
      /*
       * The name follows the contents, because a region whose label says «Secciones de
       * Rampa» while holding one child's sections is a region that lies to a screen
       * reader. «Apartados» rather than «Secciones» inside a learner so the two never
       * collide in a locator or in a region list (FR-1822).
       */
      aria-label={
        inside ? `Apartados de ${learnerName ?? route.code}`
          : inSettings ? 'Apartados de Configuración'
          : 'Secciones de Rampa'
      }
    >
      {inSettings ? (
        <>
          {/*
            The way back names where it goes, like the learner's does — and when she
            arrived from a learner it goes back to **him**, not to the caseload
            (FR-2304). Route state, so it survives her moving between sections.
          */}
          {route.from ? (
            <button className="rail-back"
                    onClick={() => go({ type: 'learner/open', code: route.from!.code })}>
              ← {learnerName ?? route.from.code}
            </button>
          ) : (
            <button className="rail-back" onClick={() => go({ type: 'caseload' })}>
              ← {labels.learners}
            </button>
          )}
          {/* A `<p>`, for the reason on the learner's one above. */}
          <p className="rail-who">{labels.settings}</p>
          {settingsPanes.map(pane)}
        </>
      ) : inside ? (
        <>
          {/*
            The way back names where it goes rather than saying «atrás»: a control that
            says where it leads is one she can use without remembering how she arrived.
          */}
          <button className="rail-back" onClick={() => go({ type: 'caseload' })}>
            ← {labels.learners}
          </button>
          {/*
            Who this is, at the top of their own rail (FR-1806, `005` FR-513). The name
            is resolved in memory; the code is what reaches disk (`003`).

            **A `<p>` and not an `<h2>`** (025, from `e2e/a11y.spec.ts`). The rail comes
            before `<main>` in the DOM, so a heading here is the document's *first*
            heading and the page's own `h1` then arrives second: «starts at H2, not H1».
            It went unnoticed because the a11y sweep only walked top-level screens and
            the rail only showed this inside a learner — until `025` gave Configuración
            the same treatment and the sweep reached it.

            Nothing is lost: the `<nav>` already carries «Apartados de Lucía» as its
            accessible name, which is what a screen reader announces on entering the
            region. A heading inside a navigation landmark was decoration with a tag.
          */}
          <p className="rail-who">
            {learnerName ?? route.code}
            <span>{route.code}</span>
          </p>
          {MAIN_TABS.map(tab)}
          <hr />
          {FOOT_TABS.map(tab)}
        </>
      ) : (
        <>
          <div className="rail-brand"><Wordmark size={19} /></div>
          {/*
            Her caseload is first and it is where the application opens (FR-1801):
            everything she does starts from a child, so the children are the top of the
            interface rather than one entry among five.
          */}
          <button
            aria-current={route.at === 'caseload' || route.at === 'newLearner' ? 'page' : undefined}
            onClick={() => go({ type: 'caseload' })}>
            {labels.learners}
          </button>
          {/*
            **Dos, exactamente dos** (FR-1802, T037).

            Eran cinco, y el diagnóstico de `020` era que mezclaban categorías como si
            fueran hermanas: una acción («Preparar material»), una entidad («Mis
            alumnos»), datos («Mis notas»), un ajuste («Mi servicio de IA») e
            información («Acerca de»). Cada una se ha ido a donde pertenecía y ninguna
            se ha perdido: la acción está dentro del alumno (T028), el ajuste y la
            información en Configuración (`025`), y los datos se han partido por su
            propio `scope` (T034/T035) — lo de un niño con ese niño, lo de ella en
            Configuración.

            Un tercer destino aquí es una categoría nueva, y esta especificación existe
            porque había cinco.
          */}
          {/*
            Four entries, not five (`025` FR-2310). «Mi servicio de IA» and «Acerca de»
            were never siblings of «Mis alumnos» — `020`'s own diagnosis was that this
            rail mixed «una acción, una entidad, datos, un ajuste e información» as if
            they were the same kind of thing. They are settings, so they are in
            Configuración.
          */}
          {/*
            No `aria-current` here: this branch only renders when she is *not* in
            Configuración, so the compiler narrowed the comparison away — correctly, and
            it is the kind of dead condition that would otherwise sit there looking like
            a guarantee. Inside Configuración the rail shows its own sections, and each
            of those carries the `aria-current`.
          */}
          <button onClick={() => go({ type: 'settings' })}>{labels.settings}</button>
        </>
      )}
      <div className="grow" />
      <div className="rail-foot">{foot}</div>
    </nav>
  );
}
