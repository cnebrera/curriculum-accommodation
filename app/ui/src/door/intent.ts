/**
 * What the door produces (016 T001, contracts/door.md).
 *
 * The door's whole output is one value, and every screen downstream **reads** it
 * rather than asking again. That is the failure every wizard has: she answers "for
 * whom" on screen one, is asked again on screen three, and concludes the first
 * answer did not register.
 *
 * A reducer rather than three `useState`s in a screen, for the reason `015` and
 * `013` both found: the rules that matter here are rules about a value — no
 * default door, no default kind, going back keeps what she typed — and a screen can
 * be reviewed into compliance where a function either does this or fails a test.
 */

export type Work = 'adapt' | 'compose';

export interface Intent {
  /**
   * The learners, in the order she picked them.
   *
   * The first is the **first**, never the only one (FR-1411). Learner-first was
   * chosen in clarification against my recommendation, and this is what it costs:
   * one child is asked about before the others, so the control that adds the rest
   * has to be part of the flow rather than a repair to it (FR-1412).
   */
  learners: string[];
  /** What she is doing. No third value, and no default. */
  work: Work | null;
  /**
   * What the material is (`012` FR-1001). `null` until she says.
   *
   * On the compose branch this is filled in by what was produced rather than
   * chosen — composed practice is a worksheet — which is why it is dropped when
   * she changes door.
   */
  kind: string | null;
}

export type IntentAction =
  | { type: 'learner/add'; code: string }
  | { type: 'learner/remove'; code: string }
  | { type: 'work/set'; work: Work }
  | { type: 'kind/set'; kind: string }
  | { type: 'reset' };

export const emptyIntent = (): Intent => ({ learners: [], work: null, kind: null });

export function reduceIntent(state: Intent, action: IntentAction): Intent {
  switch (action.type) {
    case 'learner/add':
      // Deduplicated, order preserved. Order is hers and encodes nothing about
      // the children (Principle V).
      return state.learners.includes(action.code)
        ? state
        : { ...state, learners: [...state.learners, action.code] };

    case 'learner/remove':
      return { ...state, learners: state.learners.filter((c) => c !== action.code) };

    case 'work/set':
      if (state.work === action.work) return state;
      /*
       * The learners survive the switch (FR-1408) and the kind does not — and that
       * is a reason rather than tidiness. On the compose branch the kind is a fact
       * about what was produced; carrying «examen» across would assert that a
       * composed practice sheet is an exam, which is exactly the silent
       * mislabelling `012` exists to prevent.
       */
      return { ...state, work: action.work, kind: null };

    case 'kind/set':
      return { ...state, kind: action.kind };

    case 'reset':
      return emptyIntent();
  }
}

/** Ready to start: all three answered. */
export const intentReady = (i: Intent): boolean =>
  i.learners.length > 0 && i.work !== null && (i.work === 'compose' || i.kind !== null);

/**
 * What is still missing, in her words (`013` FR-1105).
 *
 * One thing at a time, in the order the door asks. A primary action that goes grey
 * with no explanation is a dead end she cannot debug; «dime primero para quién es»
 * is a next step. Returns `null` when nothing is missing.
 */
export function whatIsMissing(i: Intent): string | null {
  if (i.learners.length === 0) return 'Dime primero para quién es.';
  if (i.work === null) return 'Dime qué quieres hacer.';
  if (i.work === 'adapt' && i.kind === null) return 'Dime qué es este material.';
  return null;
}
