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

/** The learner's sections. Five, and two set apart at the foot of the menu. */
export type LearnerTab =
  | 'who'          // Quién es
  | 'prepare'      // Preparar
  /**
   * Material de estructura (`028` FR-2601): agendas, secuencias, historias sociales.
   *
   * Its own entry, **not** a third option inside «Preparar». Adapting starts from a
   * document she has and composing starts from an objective; an agenda starts from
   * neither — it starts from the shape of a day. Routed through either existing door it
   * would have to answer questions that do not apply to it («¿qué tipo de material?»,
   * «¿qué tiene que aprender?»), and a flow that asks the wrong questions first is a flow
   * she concludes is not for what she wants.
   */
  | 'structure'    // Su día y sus rutinas
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
  ['who', 'prepare', 'structure', 'made', 'curriculum', 'handover', 'erase'] as const;

/** The four she works in; the last two are lifecycle and sit below a rule. */
export const MAIN_TABS: readonly LearnerTab[] =
  ['who', 'prepare', 'structure', 'made', 'curriculum'];

/**
 * The sections of Configuración (025 T001).
 *
 * ## This type existed before anything could render it
 *
 * `020` declared `SettingsPane` with five values — `service`, `house`, `display`,
 * `vault`, `about` — and wired `{ at: 'settings' }` into `reduceRoute`. **Nothing ever
 * navigated there and no screen ever rendered it**, because `020` US3/US4 were never
 * built. The fourteenth declaration in this project written by one place and read by
 * nobody, and it was in the file whose whole purpose is «where she is».
 *
 * So it shrinks to what exists. `house` and `vault` come back when the screens do; a
 * type that can express a destination nothing can draw is a type that will be trusted
 * by a caller and then crash — or worse, render blank.
 */
export type SettingsPane =
  'pictograms' | 'normative' | 'house' | 'criterio' | 'service' | 'about';

/**
 * In menu order, and the rail renders from **this** rather than a second list.
 *
 * The same arrangement as `learnerTabs`, for the same reason: two copies of «which
 * sections exist» is where one gets a destination the other does not.
 */
export const settingsPanes: readonly SettingsPane[] =
  ['pictograms', 'normative', 'house', 'criterio', 'service', 'about'] as const;

/*
 * No `display` pane. The text size, contrast and motion controls already live in the
 * rail's foot (`013` FR-1106, «the rail's foot MUST be a composed block»), which is
 * where the things-you-adjust belong and where they work from every screen. A second
 * home for them would be the seventh instance of two copies of one truth in this
 * repository — and the copy she found first would be the one that felt broken.
 */

/**
 * A step of a flow inside `prepare`.
 *
 * `whoElse` comes **after** `verify` and that ordering is a requirement rather than a
 * preference: `005` FR-514/FR-515 need the batch's cost as one figure before the run, so
 * the number of sheets has to be known immediately before adapting — and asking earlier
 * would price a run that may never happen.
 */
export type Flow =
  | {
      of: 'adapt';
      step: 'kind' | 'bring' | 'verify' | 'whoElse' | 'review';
      /**
       * What the material is (`012` FR-1001), `undefined` until she says (`020` T020).
       *
       * Here rather than in a screen's `useState`, and the reason is the rule below it:
       * **changing branch drops it**. That rule lived in `door/intent.ts`; a rule about a
       * value belongs with the value, and a value carried in a component is a value the
       * next component forgets to clear (`020` T021, research R2).
       */
      kind?: string;
    }
  | {
      of: 'compose';
      step: 'ask' | 'summary' | 'whoElse' | 'review';
      /**
       * Composed practice **is** a worksheet: the kind is a fact about what was produced
       * rather than something she chose, so nothing asks and nothing carries it here.
       * Deliberately absent rather than optional — see `flow/start`.
       */
    };

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
 * `025` took «Mi servicio de IA» and «Acerca de» into Configuración, and `020` T028
 * takes the door and the flows.
 */
export type LegacyView =
  /*
   * `door`, `adapt`, `compose` y `composed` se fueron con `020` T028: los pasos viven
   * dentro del alumno y los dibuja `prepare/PrepareFlow`. Quitados del tipo y no dejados
   * como valores sueltos, porque `SettingsPane` se pasó dos especificaciones cargando
   * tres destinos que nada podía dibujar.
   *
   * `ingest` y `verify` **no** son un resto: `017` trae su propio documento por la misma
   * maquinaria, y ahí no hay alumno en el que estar dentro ni tipo de material que
   * preguntar (decisión P37).
   */
  | 'ingest' | 'verify' | 'review'
  /*
   * `connection` and `about` were removed by `025`: they are sections of Configuración
   * now. Removed from the type rather than left as spare values, because `SettingsPane`
   * spent two specifications carrying three destinations nothing could draw.
   *
   * `notes` se fue igual, con `020` T034: es el apartado «Cómo trabajo yo» de
   * Configuración, y lo de cada niño se lee dentro del niño (FR-1818/FR-1819).
   */
  | 'guide' | 'guide-ask' | 'acns' | 'acs';

/**
 * What a legacy screen is about, when it is about something (FLU-01/FLU-02, P11/P14).
 *
 * ## Why these are here and not four `useState`s in `App.tsx`
 *
 * They were. `review`, `ingested` and `reconnect` were written by a handler and
 * **cleared by nobody**, and the review found what that costs: after reviewing one
 * sheet the adapt screen rendered nothing for the rest of the session, so sheets
 * 2..N of a batch could never be signed; a second adaptation pre-loaded the first
 * one's material and could be paid for against the wrong document; and «cambiar de
 * servicio» held Configuración hostage with no way out.
 *
 * All three are the same defect — session state with no lifecycle — and the fix is
 * the one this file already argued for: put it where navigation decides it. A
 * `go({ view: 'adapt' })` that carries no job **has** no job, so there is nothing to
 * remember to clear. That is the difference between a rule and a habit.
 */
export interface LegacyContext {
  /** The job this screen is about. Absent means new work, never «the last one». */
  job?: string;
  /**
   * The sheet under review: whose it is, and what made it (`005` FR-513).
   *
   * The recipes are optional because a review reached from the record has none to
   * hand — the screen derives them from the report it loads anyway.
   */
  sheet?: { learner: string; recipes?: string[] };
  /**
   * This job has already run, so «adaptar» shows its batch — derived from the vault
   * — rather than the verification of new material (FLU-01, P11).
   */
  ran?: boolean;
  /**
   * Where the verification gate hands her next (COD-01, decision P37).
   *
   * `008`'s ingest and its page-by-page confirmation are the only honest way to
   * bring a document in, and `017`'s guide *requires* a verified extraction —
   * `readGuideJob` refuses an unverified one. But the only route into the ingest
   * was the door: «Adaptar algo que tengo» → **choose a material kind** (is a DIAC
   * «una ficha» or «un examen»?) → bring the photo → verify → abandon the adapt
   * flow → walk back to the learner → «Su adaptación curricular». A dead step, and
   * the questions in the wrong order.
   *
   * So the curriculum section brings its own document, and this says where the gate
   * leads when it does. Absent means the adapt flow, which is what it was.
   */
  then?: 'guide';
  /**
   * Where «volver» goes from here (FLU-01).
   *
   * `batch` is the run she came from; `learner` is the section she came from, for a
   * review opened out of the record. Absent means the screen offers no way back,
   * which is what it did before and what P11 was answered against.
   */
  /*
   * `{ of: 'batch' }` se fue con la vista que lo producía (`020` T028). Ahora una revisión
   * siempre vuelve a un sitio con nombre —la sección del alumno de la que salió— y ese
   * era el punto: «volver al lote» era volver a una pantalla que la ruta no sabía
   * reconstruir.
   */
  back?: { of: 'learner'; code: string; tab: LearnerTab };
}

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
  | {
      at: 'settings';
      pane: SettingsPane;
      /**
       * The learner she came from, so «volver» goes back to him (FR-2304).
       *
       * A **code**, like everywhere else in this file — never his name (`003`). And
       * route state rather than a component's `useState`, because both navigation
       * defects this project has found were exactly that: the door forgot which child
       * it was for, and «Mis alumnos» did nothing from inside a profile.
       */
      from?: { code: string; tab: LearnerTab };
      /**
       * A service she is in the middle of reconnecting (`009` US5, FLU-03).
       *
       * Here rather than beside the route, and that is the whole fix: it used to be a
       * `useState` in `App.tsx` that cleared only on a **successful** reconnection, so
       * a teacher who pressed «cambiar de servicio» out of curiosity and left by the
       * rail found the paste-a-key wizard instead of every section of Configuración —
       * including the pictograms her learner's profile had just pointed her at (`025`
       * SC-2304).
       *
       * Unlike `from` it is deliberately **not** carried between sections: `from`
       * answers «where do I go back to», which does not change when she looks at
       * another section; this answers «what am I in the middle of», which does.
       */
      reconnecting?: string;
    }
  | ({ at: 'legacy'; view: LegacyView } & LegacyContext)
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
  | {
      type: 'settings'; pane?: SettingsPane;
      from?: { code: string; tab: LearnerTab };
      reconnecting?: string;
    }
  /**
   * Open a learner. Takes a **code and nothing else**: a name in navigation state is a
   * name a future «restore where I was» could try to persist, and `003` says a
   * learner's name never reaches a file. The heading resolves it for display.
   */
  | { type: 'learner/open'; code: string; tab?: LearnerTab }
  | { type: 'learner/tab'; tab: LearnerTab }
  | { type: 'flow/start'; of: 'adapt' | 'compose' }
  | { type: 'flow/step'; step: Flow['step'] }
  | { type: 'flow/kind'; kind: string }
  | { type: 'flow/job'; job: string }
  | { type: 'flow/also'; codes: readonly string[] }
  | { type: 'flow/leave' }
  | ({ type: 'legacy'; view: LegacyView } & LegacyContext)
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
      return {
        at: 'settings',
        pane: action.pane ?? 'pictograms',
        /*
         * `from` is carried when given and **kept** when only the pane changes, so
         * moving between sections does not lose the way back to Iker. Explicit,
         * because the natural `{ at: 'settings', pane }` drops it and the loss would
         * only show up as a «volver» that goes to the caseload instead.
         */
        ...(action.from ? { from: action.from }
          : route.at === 'settings' && route.from ? { from: route.from } : {}),
        /*
         * And `reconnecting` is **not** carried (FLU-03). Only the action that asks for
         * it produces it, so moving to any other section — or to this one from the
         * profile's pictogram pointer — leaves the wizard behind by construction. There
         * is no `setReconnect(null)` to forget.
         */
        ...(action.reconnecting ? { reconnecting: action.reconnecting } : {}),
      };

    /*
     * A different learner is a different place. The job, the flow and the others are
     * dropped rather than carried, because the alternative is Marco's screen showing
     * Lucía's worksheet — which is worse than losing the work, since it looks like it
     * worked.
     */
    case 'learner/open':
      /*
       * `tab` because coming back from a review opened out of the record must land on
       * the record and not on «Quién es» — the same argument `from` makes for
       * Configuración. Defaults to «Quién es», which is where picking a learner lands.
       */
      return { at: 'learner', code: action.code, tab: action.tab ?? 'who' };

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
      /*
       * A flow belongs to `prepare`. Starting one from another section moves her to the
       * section that owns it rather than rendering a step under «Quién es».
       *
       * And **the kind does not survive a change of branch** (`016` FR-1408's other
       * half, moved here from `door/intent.ts` by `020` T021). The learners do survive —
       * they are in `also` and this action rebuilds it from the same code — but carrying
       * «examen» onto the compose branch would assert that a composed practice sheet is
       * an exam, which is exactly the silent mislabelling `012` exists to prevent.
       *
       * It falls out of the shape rather than being coded: the new flow is built fresh,
       * so there is no `kind` to carry and no line that clears one.
       */
      return {
        ...route,
        tab: 'prepare',
        flow: { of: action.of, step: FIRST_STEP[action.of] } as Flow,
        also: withSelf(route.code, []),
      };
    }

    case 'flow/kind': {
      // Only the adapt branch has one to set. On `compose` the kind is a fact about what
      // was produced, so this is a no-op rather than a field that quietly appears.
      if (route.at !== 'learner' || route.flow?.of !== 'adapt') return route;
      return { ...route, flow: { ...route.flow, kind: action.kind } };
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
      /*
       * Everything the action does not carry is **gone**, and that is the point (P11,
       * P14). The three defects this replaced were all «written by a handler, cleared by
       * nobody»; here the absence of a job in the action is the absence of a job in the
       * route, so a second adaptation cannot inherit the first one's material.
       */
      return {
        at: 'legacy', view: action.view,
        ...(action.job ? { job: action.job } : {}),
        ...(action.sheet ? { sheet: action.sheet } : {}),
        ...(action.ran ? { ran: action.ran } : {}),
        ...(action.then ? { then: action.then } : {}),
        ...(action.back ? { back: action.back } : {}),
      };

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

/**
 * What is still missing before the run can start, in her words (`013` FR-1105).
 *
 * Moved out of `door/intent.ts` with its tests (`020` T021). One thing at a time, in the
 * order the steps ask: a primary action that goes grey with no explanation is a dead end
 * she cannot debug, and «dime qué es este material» is a next step.
 *
 * Returns `null` when nothing is missing.
 */
export function whatIsMissing(route: Route): string | null {
  if (route.at !== 'learner') return 'Dime primero para quién es.';
  if (!route.flow) return 'Dime qué quieres hacer.';
  if (route.flow.of === 'adapt' && route.flow.kind === undefined) {
    return 'Dime qué es este material.';
  }
  if ((route.also ?? []).length === 0) return 'Dime primero para quién es.';
  return null;
}

/** Ready to start: the branch chosen, the kind said when it is asked, and somebody to do it for. */
export const flowReady = (route: Route): boolean => whatIsMissing(route) === null;
