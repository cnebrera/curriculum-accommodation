import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  startRoute, reduceRoute, learnerTabs, settingsPanes,
  type Route, type SettingsPane,
} from '../src/nav/route.js';

/**
 * Where she is (020 T001-T005, data-model.md).
 *
 * Written before any screen moves, and that ordering is the whole of this feature's
 * risk management. **Both navigation defects this project has already found were
 * navigation state held in the wrong place:**
 *
 * - The door forgot which child it was for when she pressed «Volver», because its
 *   reducer lived inside a screen that navigation unmounted (`016` FR-1408).
 * - «Mis alumnos» did nothing from inside a profile, because the rail set a `view` it
 *   already had while the screen's own `editing` state survived.
 *
 * Twenty destinations moved on top of that same mistake would produce twenty of it. A
 * screen can be reviewed into compliance; a reducer either does this or fails.
 */
const src = readFileSync(
  join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'nav', 'route.ts'), 'utf8');

const intoLearner = (code = 'E38'): Route =>
  reduceRoute(startRoute(), { type: 'learner/open', code });

describe('she starts where her work is', () => {
  it('opens on the caseload (FR-1801)', () => {
    expect(startRoute()).toEqual({ at: 'caseload' });
  });

  it('lands on a section when she picks a learner, never on nothing', () => {
    // A route with a learner and no tab is a blank panel with a heading over it.
    const r = intoLearner();
    expect(r.at).toBe('learner');
    if (r.at !== 'learner') throw new Error('unreachable');
    expect(r.code).toBe('E38');
    expect(learnerTabs).toContain(r.tab);
  });

  it('carries the code and never a name (FR-1806)', () => {
    /*
     * A name in navigation state is a name a future «restore where I was» could try to
     * persist, and `003` says a learner's name never reaches a file. The check is over
     * the source: no field of the route may be called anything like a name.
     */
    expect(src).not.toMatch(/\bname\s*[?]?\s*:/);
  });
});

describe('the current destination, pressed again, starts over (FR-1809)', () => {
  it('takes her back to the list from inside a learner', () => {
    // Shipped broken once: the rail set a `view` it already had, so the one control
    // that must always mean «start again here» was the one that looked broken.
    expect(reduceRoute(intoLearner(), { type: 'caseload' })).toEqual({ at: 'caseload' });
  });

  it('takes her back to the branches from inside a flow', () => {
    let r = reduceRoute(intoLearner(), { type: 'learner/tab', tab: 'prepare' });
    r = reduceRoute(r, { type: 'flow/start', of: 'adapt' });
    if (r.at !== 'learner') throw new Error('unreachable');
    expect(r.flow).toBeDefined();

    const again = reduceRoute(r, { type: 'learner/tab', tab: 'prepare' });
    if (again.at !== 'learner') throw new Error('unreachable');
    expect(again.flow).toBeUndefined();
    expect(again.tab).toBe('prepare');
  });
});

describe('changing learner does not carry the previous one', () => {
  it('drops the job, the flow and the others (FR-1811)', () => {
    /*
     * The defect this is written against, in its new form: she is midway through
     * adapting for Lucía, clicks Marco, and the flow's job id survives — so Marco's
     * screen is about Lucía's worksheet. Worse than losing the work, because it looks
     * like it worked.
     */
    let r = reduceRoute(intoLearner('E38'), { type: 'learner/tab', tab: 'prepare' });
    r = reduceRoute(r, { type: 'flow/start', of: 'adapt' });
    r = reduceRoute(r, { type: 'flow/job', job: 'job-2026' });
    r = reduceRoute(r, { type: 'flow/also', codes: ['E38', 'E41'] });

    const moved = reduceRoute(r, { type: 'learner/open', code: 'E41' });
    if (moved.at !== 'learner') throw new Error('unreachable');
    expect(moved.code).toBe('E41');
    expect(moved.job).toBeUndefined();
    expect(moved.flow).toBeUndefined();
    expect(moved.also).toBeUndefined();
  });
});

describe('the learner she entered through is in the batch (FR-1814)', () => {
  it('is always included, however `also` is set', () => {
    /*
     * `016` FR-1411: the first learner is not the only one — and modelling the others
     * as «the rest» is how that gets broken by a data structure rather than by a
     * screen. So the reducer, not the screen, guarantees it.
     */
    let r = reduceRoute(intoLearner('E38'), { type: 'learner/tab', tab: 'prepare' });
    r = reduceRoute(r, { type: 'flow/start', of: 'adapt' });

    for (const codes of [[], ['E41'], ['E41', 'E50'], ['E41', 'E38']]) {
      const next = reduceRoute(r, { type: 'flow/also', codes });
      if (next.at !== 'learner') throw new Error('unreachable');
      expect(next.also, `also for ${JSON.stringify(codes)}`).toContain('E38');
      // And no duplicate when she picks him explicitly.
      expect(next.also!.filter((c) => c === 'E38')).toHaveLength(1);
    }
  });
});

describe('a flow cannot exist outside the section that owns it', () => {
  it('is dropped when she leaves `prepare`', () => {
    let r = reduceRoute(intoLearner(), { type: 'learner/tab', tab: 'prepare' });
    r = reduceRoute(r, { type: 'flow/start', of: 'compose' });
    const away = reduceRoute(r, { type: 'learner/tab', tab: 'made' });
    if (away.at !== 'learner') throw new Error('unreachable');
    expect(away.flow).toBeUndefined();
  });

  it('cannot be started from another section', () => {
    const r = reduceRoute(intoLearner(), { type: 'learner/tab', tab: 'who' });
    const attempted = reduceRoute(r, { type: 'flow/start', of: 'adapt' });
    if (attempted.at !== 'learner') throw new Error('unreachable');
    // Either refused, or it moved her to the section that owns it — never a flow
    // rendered under «Quién es».
    if (attempted.flow) expect(attempted.tab).toBe('prepare');
  });
});

describe('nothing is remembered across restarts', () => {
  it('reads and writes no storage', () => {
    /*
     * `015` settled this for filters: a half-finished state restored on Monday is a
     * screen that looks wrong with no visible cause. Asserted over the source, because
     * the tempting version of «be helpful» is one `localStorage` call away.
     */
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });
});

describe('the destinations that have not moved yet', () => {
  it('are in the route, not beside it', () => {
    /*
     * `020` ships in pieces, so «Preparar material», «Mis notas» and the long flows are
     * still top-level. The tempting shortcut is a second `useState<View>` next to the
     * route — and two things deciding where she is, is how «Mis alumnos» came to do
     * nothing from inside a profile. One source, and it shrinks to nothing at T028.
     */
    const r = reduceRoute(intoLearner(), { type: 'legacy', view: 'notes' });
    expect(r).toEqual({ at: 'legacy', view: 'notes' });
    expect(reduceRoute(r, { type: 'caseload' })).toEqual({ at: 'caseload' });
  });
});

describe('settings is a place too', () => {
  it('is reachable and comes back to the caseload', () => {
    const s = reduceRoute(intoLearner(), { type: 'settings' });
    expect(s.at).toBe('settings');
    expect(reduceRoute(s, { type: 'caseload' })).toEqual({ at: 'caseload' });
  });
});

/**
 * Configuración, and the way back (025 T003).
 *
 * `020` wrote `{ at: 'settings' }` into the reducer and **nothing ever navigated
 * there** — so these are the first tests that case has had. The one that matters is the
 * way back: a pointer that takes her out of a learner has to return her to *that*
 * learner, and both navigation defects this project has found were this state living
 * somewhere it did not survive.
 */
describe('Configuración', () => {
  it('opens at Pictogramas, because that is what she is usually sent for', () => {
    expect(reduceRoute(startRoute(), { type: 'settings' }))
      .toEqual({ at: 'settings', pane: 'pictograms' });
  });

  it('moves between its own sections', () => {
    const at = reduceRoute(startRoute(), { type: 'settings', pane: 'service' });
    expect(reduceRoute(at, { type: 'settings', pane: 'about' }))
      .toEqual({ at: 'settings', pane: 'about' });
  });

  it('remembers the learner she came from', () => {
    const from = { code: 'K42', tab: 'who' as const };
    expect(reduceRoute(
      { at: 'learner', code: 'K42', tab: 'who' },
      { type: 'settings', pane: 'pictograms', from },
    )).toEqual({ at: 'settings', pane: 'pictograms', from });
  });

  it('keeps the way back while she moves between sections', () => {
    /*
     * The natural `{ at: 'settings', pane }` drops `from`, and the loss would only show
     * up as a «volver» landing on the caseload instead of on Iker — which reads as a
     * design choice rather than a bug.
     */
    const from = { code: 'K42', tab: 'who' as const };
    let at = reduceRoute(startRoute(), { type: 'settings', pane: 'pictograms', from });
    at = reduceRoute(at, { type: 'settings', pane: 'service' });
    expect(at).toEqual({ at: 'settings', pane: 'service', from });
  });

  it('carries no name, only a code (003)', () => {
    const from = { code: 'K42', tab: 'who' as const };
    const at = reduceRoute(startRoute(), { type: 'settings', pane: 'pictograms', from });
    expect(JSON.stringify(at)).not.toMatch(/[A-Za-z]{4,}\s[A-Z]/);
    expect(JSON.stringify(at)).toContain('K42');
  });

  it('lets «Mis alumnos» win from inside it', () => {
    const from = { code: 'K42', tab: 'who' as const };
    const at = reduceRoute(startRoute(), { type: 'settings', pane: 'pictograms', from });
    expect(reduceRoute(at, { type: 'caseload' })).toEqual({ at: 'caseload' });
  });

  it('has a menu list that matches the type exactly', () => {
    /*
     * `SettingsPane` had five values and no screen could draw one of them. The list the
     * rail renders from and the type are two copies of «which sections exist», so they
     * are checked against each other rather than trusted to stay in step.
     *
     * Four, and no `display`: the text-size and contrast controls live in the rail's
     * foot (`013` FR-1106) and work from every screen. A second home for them would be
     * two copies of one truth, and the copy she found first would feel broken.
     *
     * `normative` joined in `029`: which normativa her documents are written in is a
     * fact about her school, not about a child, so it sits beside the pictogram set for
     * the same reason that one is here.
     */
    const panes: SettingsPane[] = ['pictograms', 'normative', 'service', 'about'];
    expect([...settingsPanes].sort()).toEqual([...panes].sort());
  });
});

/**
 * Session state has a lifecycle, and the lifecycle is the navigation (P11/P14).
 *
 * `review`, `ingested` and `reconnect` were four `useState`s in `App.tsx` that a
 * handler wrote and **nobody cleared**. What that cost, from the review:
 *
 * - after reviewing one sheet the adapt screen rendered nothing for the rest of the
 *   session, so sheets 2..N of a batch could never be signed (FLU-01);
 * - the second adaptation of a session pre-loaded the first one's material and could
 *   be paid for against the wrong document, silently (FLU-02);
 * - «cambiar de servicio» held every section of Configuración hostage (FLU-03).
 *
 * All three are one defect. The fix is that the value lives here, so *not carrying
 * it* is what clears it — there is no `setX(null)` anybody can forget.
 */
describe('what a screen is about is carried, and therefore cleared', () => {
  it('goes to «adaptar» with no job at all, so no second run inherits the first', () => {
    // FLU-02: the exact defect. She adapts a photo, then comes back for new material
    // and lands on the verification of the old one — «está bien leído, sigue» and she
    // has paid to adapt the wrong document for the wrong child.
    const after = reduceRoute(
      { at: 'legacy', view: 'review', job: 'job-1', sheet: { learner: 'E38' } },
      { type: 'legacy', view: 'adapt' },
    );
    expect(after).toEqual({ at: 'legacy', view: 'adapt' });
    expect(after).not.toHaveProperty('job');
    expect(after).not.toHaveProperty('sheet');
  });

  it('carries the job when the navigation is about one', () => {
    expect(reduceRoute(startRoute(), { type: 'legacy', view: 'verify', job: 'job-7' }))
      .toEqual({ at: 'legacy', view: 'verify', job: 'job-7' });
  });

  it('carries whose sheet it is, and where «volver» goes (FLU-01)', () => {
    const at = reduceRoute(
      { at: 'legacy', view: 'adapt', job: 'job-7' },
      {
        type: 'legacy', view: 'review',
        job: 'job-7', sheet: { learner: 'E38', recipes: ['one-task-per-page'] },
        back: { of: 'batch' },
      },
    );
    expect(at).toEqual({
      at: 'legacy', view: 'review', job: 'job-7',
      sheet: { learner: 'E38', recipes: ['one-task-per-page'] },
      back: { of: 'batch' },
    });
  });

  it('comes back to the batch with the job and the flag that says it already ran', () => {
    /*
     * `ran` is what tells the adapt screen to re-derive the batch from the vault
     * instead of offering to verify material she has already adapted. Without it the
     * way back from a review would land her on «comprueba que lo he leído bien» for a
     * job that is finished.
     */
    const at = reduceRoute(
      { at: 'legacy', view: 'review', job: 'job-7', sheet: { learner: 'E38' }, back: { of: 'batch' } },
      { type: 'legacy', view: 'adapt', job: 'job-7', ran: true },
    );
    expect(at).toEqual({ at: 'legacy', view: 'adapt', job: 'job-7', ran: true });
  });

  it('can send her back into the learner she opened the sheet out of', () => {
    // A review reached from the record returns to the record, not to «Quién es» —
    // which is what `learner/open` used to be able to say and now can.
    const at = reduceRoute(startRoute(), { type: 'learner/open', code: 'E38', tab: 'made' });
    expect(at).toEqual({ at: 'learner', code: 'E38', tab: 'made' });
  });

  it('still lands on «Quién es» when no section is asked for', () => {
    expect(reduceRoute(startRoute(), { type: 'learner/open', code: 'E38' }))
      .toEqual({ at: 'learner', code: 'E38', tab: 'who' });
  });

  it('carries no learner name into the review, only a code (003)', () => {
    const at = reduceRoute(startRoute(), {
      type: 'legacy', view: 'review', job: 'job-7', sheet: { learner: 'E38' },
    });
    expect(JSON.stringify(at)).toContain('E38');
    expect(JSON.stringify(at)).not.toMatch(/Luc[ií]a|Mateo/);
  });
});

describe('a reconnection she started is something she is in the middle of (FLU-03)', () => {
  it('is left behind by moving to any other section', () => {
    /*
     * The defect, exactly: she pressed «cambiar de servicio», thought better of it and
     * left by the rail. The wizard stayed armed, so the next time she entered
     * Configuración — including following «Traer los pictogramas →» from a learner's
     * profile — she got the paste-a-key box instead (`025` SC-2304).
     */
    const armed = reduceRoute(startRoute(), {
      type: 'settings', pane: 'service', reconnecting: 'anthropic',
    });
    expect(armed).toEqual({ at: 'settings', pane: 'service', reconnecting: 'anthropic' });

    const away = reduceRoute(armed, { type: 'settings', pane: 'pictograms' });
    expect(away).not.toHaveProperty('reconnecting');
  });

  it('is left behind by leaving Configuración altogether', () => {
    const armed = reduceRoute(startRoute(), {
      type: 'settings', pane: 'service', reconnecting: 'anthropic',
    });
    expect(reduceRoute(armed, { type: 'caseload' })).toEqual({ at: 'caseload' });
  });

  it('does not take the way back with it', () => {
    // `from` answers «where do I go back to» and survives a change of section;
    // `reconnecting` answers «what am I in the middle of» and does not. Two different
    // questions, and the test says which is which.
    const from = { code: 'K42', tab: 'who' as const };
    let at = reduceRoute(startRoute(), { type: 'settings', pane: 'pictograms', from });
    at = reduceRoute(at, { type: 'settings', pane: 'service', reconnecting: 'anthropic' });
    expect(at).toEqual({ at: 'settings', pane: 'service', from, reconnecting: 'anthropic' });
    at = reduceRoute(at, { type: 'settings', pane: 'pictograms' });
    expect(at).toEqual({ at: 'settings', pane: 'pictograms', from });
  });
});
