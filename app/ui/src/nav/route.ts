/**
 * Where she is (020 T002-T005, data-model.md).
 *
 * ## Why this is a value and not a `useState<View>`
 *
 * `App.tsx` held sixteen views in one flat switch and `LearnersScreen` hid five more in
 * its own state. Twenty destinations, no hierarchy, and no way to express «I am inside
 * a learner» — which is the sentence `020` exists to make true.
 *
 * Both navigation defects this project has already found were navigation state held in
 * the wrong place: the door forgetting which child it was for when she pressed «Volver»
 * (its reducer lived in the screen navigation unmounts), and «Mis alumnos» doing nothing
 * from inside a profile (the rail set a `view` it already had while the screen's own
 * state survived). Moving twenty destinations on top of that mistake would produce
 * twenty of it, so the route comes first and is tested before a screen moves.
 *
 * No router. There is no URL in this shell, so a routing library would contribute a
 * dependency and an API and solve nothing a discriminated union does not. The precedent
 * is `door/intent.ts`, which exists for the same reason and is tested the same way.
 */

/** The learner's sections. Four, and two set apart at the foot of the menu. */
export type LearnerTab =
  | 'who'          // Quién es
  | 'prepare'      // Preparar
  | 'made'         // Lo que le he preparado
  | 'curriculum'   // Su adaptación curricular
  | 'handover'     // Preparar el traspaso
  | 'erase';       // Borrar todo lo suyo

/**
 * In menu order, and exported because the menu renders from this rather than from a
 * second list. Two copies of «which sections exist» is where a destination gets added
 * to one and not the other.
 */
export const learnerTabs: readonly LearnerTab[] =
  ['who', 'prepare', 'made', 'curriculum', 'handover', 'erase'] as const;

/** The four she works in; the last two are lifecycle and sit below a rule. */
export const MAIN_TABS: readonly LearnerTab[] = ['who', 'prepare', 'made', 'curriculum'];

export type SettingsPane = 'service' | 'house' | 'display' | 'vault' | 'about';

/**
 * A step of a flow inside `prepare`.
 *
 * `whoElse` comes **after** `verify` and that ordering is a requirement rather than a
 * preference: `005` FR-514/FR-515 need the batch's cost as one figure before the run, so
 * the number of sheets has to be known immediately before adapting — and asking earlier
 * would price a run that may never happen.
 */
export type Flow =
  | { of: 'adapt'; step: 'kind' | 'bring' | 'verify' | 'whoElse' | 'review' }
  | { of: 'compose'; step: 'ask' | 'summary' | 'whoElse' | 'review' };

const FIRST_STEP = { adapt: 'kind', compose: 'ask' } as const;

/**
 * Destinations that have not moved yet, held in the route rather than beside it.
 *
 * `020` ships in pieces and US1 removes nothing, so «Preparar material», «Mis notas»,
 * «Mi servicio de IA» and «Acerca de» are still top-level and the long flows are still
 * where they were. The tempting shortcut is a second `useState<View>` next to the route
 * — and two things deciding where she is, is how «Mis alumnos» came to do nothing from
 * inside a profile in the first place.
 *
 * So they live here, named for what they are, and this type **shrinks to nothing**:
 * T028 takes the door and the flows, T033/T036 take the settings and «Acerca de».
 */
export type LegacyView =
  | 'door' | 'adapt' | 'compose' | 'composed'
  | 'ingest' | 'verify' | 'review'
  | 'notes' | 'connection' | 'about'
  | 'guide' | 'guide-ask' | 'acns' | 'acs';

export type Route =
  | { at: 'caseload' }
  /**
   * A learner who does not exist yet, so has no place to enter (`020` T010).
   *
   * Its own case rather than `{ at: 'learner', code: '' }`: an empty code would be a
   * value every consumer has to remember to check, and the first one that forgot would
   * ask the vault for `profiles//profile.yaml`.
   *
   * Found by `e2e/learner.spec.ts` timing out: «Añadir un alumno» had been wired to the
   * door, so the control that says «add a learner» opened «¿Qué vas a hacer?». Six
   * tests caught it in the first full run after the rewire.
   */
  | { at: 'newLearner' }
  | { at: 'settings'; pane: SettingsPane }
  | { at: 'legacy'; view: LegacyView }
  | {
      at: 'learner';
      /** The code. **Never** her name for him — see the note on `RouteAction`. */
      code: string;
      tab: LearnerTab;
      /** The job this flow is about, once one exists. */
      job?: string;
      flow?: Flow;
      /** Who else it is for. Always contains `code` — see `withSelf`. */
      also?: string[];
    };

export type RouteAction =
  | { type: 'caseload' }
  | { type: 'settings'; pane?: SettingsPane }
  /**
   * Open a learner. Takes a **code and nothing else**: a name in navigation state is a
   * name a future «restore where I was» could try to persist, and `003` says a
   * learner's name never reaches a file. The heading resolves it for display.
   */
  | { type: 'learner/open'; code: string }
  | { type: 'learner/tab'; tab: LearnerTab }
  | { type: 'flow/start'; of: 'adapt' | 'compose' }
  | { type: 'flow/step'; step: Flow['step'] }
  | { type: 'flow/job'; job: string }
  | { type: 'flow/also'; codes: readonly string[] }
  | { type: 'flow/leave' }
  | { type: 'legacy'; view: LegacyView }
  | { type: 'learner/new' };

export const startRoute = (): Route => ({ at: 'caseload' });

/**
 * The entered learner is *in* the batch, not beside it (FR-1814).
 *
 * `016` FR-1411 — «the learner chosen first MUST be the first learner and not the only
 * one» — and FR-1412 — «a second learner must not feel like a correction». Modelling the
 * others as «the rest» is how both get broken by a data structure rather than by a
 * screen, so the guarantee lives here and not in the control that renders the list.
 */
const withSelf = (code: string, codes: readonly string[]): string[] =>
  [code, ...codes.filter((c) => c !== code)];

export function reduceRoute(route: Route, action: RouteAction): Route {
  switch (action.type) {
    case 'caseload':
      return { at: 'caseload' };

    case 'settings':
      return { at: 'settings', pane: action.pane ?? 'service' };

    /*
     * A different learner is a different place. The job, the flow and the others are
     * dropped rather than carried, because the alternative is Marco's screen showing
     * Lucía's worksheet — which is worse than losing the work, since it looks like it
     * worked.
     */
    case 'learner/open':
      return { at: 'learner', code: action.code, tab: 'who' };

    case 'learner/tab': {
      if (route.at !== 'learner') return route;
      /*
       * Pressing the section she is already in starts it over (FR-1809). Shipped broken
       * once, and the reason it matters: a control that means «start again here» and
       * does nothing is worse than one that is absent, because she stops trusting the
       * menu.
       */
      return { at: 'learner', code: route.code, tab: action.tab };
    }

    case 'flow/start': {
      if (route.at !== 'learner') return route;
      // A flow belongs to `prepare`. Starting one from another section moves her to the
      // section that owns it rather than rendering a step under «Quién es».
      return {
        ...route,
        tab: 'prepare',
        flow: { of: action.of, step: FIRST_STEP[action.of] } as Flow,
        also: withSelf(route.code, []),
      };
    }

    case 'flow/step': {
      if (route.at !== 'learner' || !route.flow) return route;
      return { ...route, flow: { ...route.flow, step: action.step } as Flow };
    }

    case 'flow/job': {
      if (route.at !== 'learner') return route;
      return { ...route, job: action.job };
    }

    case 'flow/also': {
      if (route.at !== 'learner') return route;
      return { ...route, also: withSelf(route.code, action.codes) };
    }

    case 'legacy':
      return { at: 'legacy', view: action.view };

    case 'learner/new':
      return { at: 'newLearner' };

    case 'flow/leave': {
      if (route.at !== 'learner') return route;
      // Leaving is always possible (FR-1808). Whether anything was already paid for is
      // the screen's message to give, not this function's decision to make.
      return { at: 'learner', code: route.code, tab: 'prepare' };
    }
  }
}

/** True while she is inside this learner, whatever section she is in. */
export const insideLearner = (route: Route, code: string): boolean =>
  route.at === 'learner' && route.code === code;
