import type { ReactNode } from 'react';
import { Wordmark } from '../components/Logo.js';
import { MAIN_TABS, type LearnerTab, type Route, type RouteAction } from './route.js';

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
 * twice a month, and it sits in the rail's foot beside the cost badge and the text-size
 * control — which is where the things-you-adjust already live.
 */

const TAB_LABEL: Record<LearnerTab, string> = {
  who: 'Quién es',
  prepare: 'Preparar',
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
  labels: { learners: string; work: string; notes: string; connection: string; about: string };
  /** The cost badge, the display controls and the locale — unchanged (`013` FR-1106). */
  foot: ReactNode;
}) {
  const inside = route.at === 'learner';

  const tab = (t: LearnerTab) => (
    <button key={t}
            {...(inside && route.tab === t ? { 'aria-current': 'page' as const } : {})}
            onClick={() => go({ type: 'learner/tab', tab: t })}>
      {TAB_LABEL[t]}
    </button>
  );

  const top = (view: 'notes' | 'connection' | 'about' | 'door', label: string) => (
    <button aria-current={route.at === 'legacy' && route.view === view ? 'page' : undefined}
            onClick={() => go({ type: 'legacy', view })}>
      {label}
    </button>
  );

  return (
    <nav
      className="rail"
      /*
       * The name follows the contents, because a region whose label says «Secciones de
       * Rampa» while holding one child's sections is a region that lies to a screen
       * reader. «Apartados» rather than «Secciones» inside a learner so the two never
       * collide in a locator or in a region list (FR-1822).
       */
      aria-label={inside ? `Apartados de ${learnerName ?? route.code}` : 'Secciones de Rampa'}
    >
      {inside ? (
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
          */}
          <h2 className="rail-who">
            {learnerName ?? route.code}
            <span>{route.code}</span>
          </h2>
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
            The door, still here and going at T028. `020` US1 removes nothing, so this
            stays until `Preparar` inside the learner can do its job — which is why
            FR-1802's «exactly two destinations» is met at T037 and not here.
          */}
          {top('door', labels.work)}
          {top('notes', labels.notes)}
          {top('connection', labels.connection)}
          {top('about', labels.about)}
        </>
      )}
      <div className="grow" />
      <div className="rail-foot">{foot}</div>
    </nav>
  );
}
