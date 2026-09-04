import { useEffect, useReducer, useState } from 'react';
import { useStrings } from './i18n/context.js';
import { LearnersScreen } from './learners/LearnersScreen.js';
import { LearnerSection } from './learners/LearnerSections.js';
import { Rail } from './nav/Rail.js';
import { startRoute, reduceRoute, type LearnerTab } from './nav/route.js';
import { useLearners } from './data/learners.js';
import { DoorScreen } from './door/DoorScreen.js';
import { ComposeScreen, ComposeSummary } from './compose/ComposeScreen.js';
import {
  GuideScreen, AcnsDraftScreen, GuideConversation, AcsHelpScreen,
} from './guide/GuideScreen.js';
import type { ComposeResult } from './data/compose.js';
import { emptyIntent, reduceIntent } from './door/intent.js';
import { AdaptScreen } from './adapt/AdaptScreen.js';
import { IngestScreen } from './ingest/IngestScreen.js';
import { VerifyScreen } from './ingest/VerifyScreen.js';
import { ReviewScreen } from './review/ReviewScreen.js';
import { NotesScreen } from './notes/NotesScreen.js';
import { SettingsSections } from './settings/SettingsSections.js';
import { VaultStep } from './onboarding/VaultStep.js';
import { ConnectStep } from './onboarding/ConnectStep.js';
import { ProfileEditor } from './learners/ProfileEditor.js';
import { Page } from './shell/Page.js';
import { CostBadge } from './components/CostBadge.js';
import { Logo, Wordmark } from './components/Logo.js';
import { DisplayPreferences } from './settings/DisplayPreferences.js';
import { applyStoredPreferences } from './data/preferences.js';
import { detectStep, loadState, saveState, type Step } from './data/onboarding.js';

/**
 * Where she is lives in `nav/route.ts` since `020`, not in a `useState<View>` here.
 *
 * This file held sixteen views in one flat switch and `LearnersScreen` hid five more in
 * its own state — twenty destinations with no hierarchy and no way to say «I am inside a
 * learner». `020` T002 moved that decision into a tested reducer, and both navigation
 * defects this project has found were this state held in the wrong place.
 *
 * The destinations that have not moved yet are `{ at: 'legacy' }` rather than a second
 * source of truth beside the route. That type shrinks to nothing across US2 and US4.
 */

export function App() {
  const { t: es, locale, setLocale, locales } = useStrings();
  const [step, setStep] = useState<Step | null>(null);
  const [route, go] = useReducer(reduceRoute, undefined, startRoute);
  /** Her caseload, for the learner's heading — the join already lives here (`013` FR-1107). */
  const roster = useLearners();
  const learners = roster.state === 'ready' ? roster.value : [];
  const whoIs = (code: string) => learners.find((l) => l.code === code);
  /**
   * What the door answered (`016`, contracts/door.md).
   *
   * Held here rather than inside the door, and the e2e suite is why: with the
   * reducer inside `DoorScreen`, pressing «Volver» from the compose screen
   * returned to a door that had forgotten which child it was for — the screen had
   * unmounted, and FR-1408 says entered work survives moving between the doors.
   *
   * Deliberately **not** persisted across restarts: a half-finished intent
   * restored on Monday is a screen that looks wrong with no visible cause, which
   * is the reasoning `015` applied to filters.
   */
  const [intent, dispatch] = useReducer(reduceIntent, undefined, emptyIntent);
  /** A composition waiting for her to decide whether to adapt it (`002`, T013). */
  const [composed, setComposed] = useState<{ jobId: string; result: ComposeResult } | null>(null);
  /**
   * The learner whose adaptación curricular she is working on (`017`).
   *
   * Held here rather than inside the guide screens for the same reason the door's
   * intent is: going into the verification screen and back must not lose which child
   * this is about.
   */
  const [guideFor, setGuideFor] = useState<{ code: string; name?: string } | null>(null);
  /*
   * `review`, `ingested` and `reconnect` used to be three more `useState`s here, and
   * **nothing ever cleared any of them** (review themes 2, FLU-01/02/03, P11/P14):
   *
   * - after reviewing one sheet, `route.view === 'adapt' && !review` rendered nothing
   *   for the rest of the session, so sheets 2..N of a batch could never be signed;
   * - the second adaptation of a session pre-loaded the first one's material and could
   *   be paid for against the wrong document, silently;
   * - «cambiar de servicio» held all of Configuración hostage with no cancel.
   *
   * They are in the route now (`nav/route.ts`, `LegacyContext`), which is the argument
   * this file already makes about the sixteen views: state whose lifecycle *is* the
   * navigation belongs where navigation decides it. A `go({ view: 'adapt' })` that
   * carries no job has no job — there is nothing left to remember to clear.
   */

  /**
   * «Volver» from the review (FLU-01, P11).
   *
   * Two destinations and no third: the batch she came from, re-derived from the vault
   * by `AdaptScreen`; or the learner's section she opened the sheet out of. The route
   * carries which, so the screen does not have to know where it was reached from.
   */
  const goBack = (back: { of: 'batch' } | { of: 'learner'; code: string; tab: LearnerTab },
                  job?: string): void => {
    if (back.of === 'batch') go({ type: 'legacy', view: 'adapt', ...(job ? { job } : {}), ran: true });
    else go({ type: 'learner/open', code: back.code, tab: back.tab });
  };

  /**
   * The review's way out, as props (FLU-01).
   *
   * A function rather than a ternary inside the JSX so `back` is a local `const` when
   * the handler closes over it — the alternative was `route.back!` inside a callback,
   * and this file's own history says a `!` in a handler is how a real null gets in.
   */
  const reviewBack = (
    back?: { of: 'batch' } | { of: 'learner'; code: string; tab: LearnerTab },
    job?: string,
  ) => (back
    ? {
        back: {
          label: back.of === 'batch'
            ? '← Volver a la tanda'
            : '← Volver a lo que le he preparado',
          go: () => goBack(back, job),
        },
      }
    : {});

  useEffect(() => {
    // Her display preferences apply before anything else, so the first frame is
    // already the one she chose (spec 010 FR-818).
    void applyStoredPreferences();
    const saved = loadState();
    void detectStep().then((detected) => setStep(saved.vaultRoot || detected !== 'vault' ? detected : 'vault'));
  }, []);

  if (step === null) {
    return (
      <div className="main stack gap4" style={{ alignItems: 'center', paddingTop: 'var(--s8)' }}>
        <Logo size={44} />
        <p className="small" aria-live="polite">Abriendo…</p>
      </div>
    );
  }

  if (step !== 'done') {
    const order: Step[] = ['vault', 'connect', 'learner'];
    return (
      <main className="main stack gap5" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 'var(--s7)' }}>
        <div className="stack gap4" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Wordmark size={26} />
          <div className="stack gap2">
            <h1>{es.onboarding.welcome}</h1>
            <p className="small">{es.onboarding.intro}</p>
          </div>
        </div>
        <div className="stack gap2">
          <div className="progress-steps" aria-hidden="true">
            {order.map((s, i) => <i key={s} {...(i <= order.indexOf(step) ? { 'data-done': '' } : {})} />)}
          </div>
          <span className="meta" aria-live="polite">
            Paso {order.indexOf(step) + 1} de {order.length}
          </span>
        </div>
        {step === 'vault' ? (
          <VaultStep onDone={(root) => { saveState({ step: 'connect', vaultRoot: root }); setStep('connect'); }} />
        ) : step === 'connect' ? (
          <ConnectStep onDone={(id) => { saveState({ step: 'learner', providerId: id }); setStep('learner'); }} />
        ) : (
          <div className="stack">
            <h2>{es.onboarding.learnerTitle}</h2>
            <p>{es.onboarding.learnerWhy}</p>
            <ProfileEditor code={null} onConfigure={() => go({ type: 'settings' })}
                           onSaved={() => { saveState({ step: 'done' }); setStep('done'); go({ type: 'legacy', view: 'door' }); }} />
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="app">
      <Rail
        route={route}
        go={go}
        {...(route.at === 'learner' && whoIs(route.code)?.name
          ? { learnerName: whoIs(route.code)!.name } : {})}
        labels={es.nav}
        foot={<>
          <CostBadge />
          <DisplayPreferences />
          {/*
            Real since T095: every screen reads its strings through this context, so a
            locale change moves the whole interface. A key missing from a partial locale
            falls back to Spanish rather than showing blank — which is why offering an
            incomplete translation is honest, and why offering it *before* the sweep was
            not.
          */}
          {locales.length > 1 ? (
            <select className="select" aria-label="Idioma" value={locale}
                    onChange={(e) => setLocale(e.target.value as typeof locale)}>
              {locales.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          ) : null}
        </>} />
      <main className="main">
        {route.at === 'legacy' && route.view === 'door' ? (
          <DoorScreen
            intent={intent}
            dispatch={dispatch}
            onAdapt={() => go({ type: 'legacy', view: 'adapt' })}
            onCompose={() => go({ type: 'legacy', view: 'compose' })}
            onNewLearner={() => go({ type: 'caseload' })} />
        ) : null}
        {route.at === 'legacy' && route.view === 'compose' ? (
          <ComposeScreen
            learners={intent.learners}
            onComposed={(jobId, result) => { setComposed({ jobId, result }); go({ type: 'legacy', view: 'composed' }); }}
            onBack={() => go({ type: 'legacy', view: 'door' })} />
        ) : null}
        {route.at === 'legacy' && route.view === 'composed' && composed ? (
          /*
           * The decision point research R2 argued for: she reads what nothing could
           * check **before** paying to adapt it, and can abandon without spending
           * more. Adapting reuses `presetJobId`, so the composed sheet goes through
           * the existing pipeline unchanged (`002` T013).
           */
          <ComposeSummary
            result={composed.result}
            jobId={composed.jobId}
            learners={intent.learners}
            onAdapt={() => {
              const job = composed.jobId;
              // Let go of the summary as we leave it: a composition kept in state is one
              // more thing written by a handler and cleared by nobody.
              setComposed(null);
              go({ type: 'legacy', view: 'adapt', job });
            }}
            onDiscard={() => { setComposed(null); go({ type: 'legacy', view: 'door' }); }} />
        ) : null}
        {route.at === 'legacy' && route.view === 'guide' && guideFor ? (
          <GuideScreen
            /*
             * The job comes from `008`'s ingest and its verification gate —
             * `ingested` is set by exactly that flow, and there is no second path
             * (FR-1505/1506).
             */
            jobId={route.job ?? null}
            learnerCode={guideFor.code}
            /*
             * Its own «traer el documento» (COD-01, decision P37).
             *
             * The screen used to say «trae primero el documento y comprueba que lo
             * he leído bien» and offer **no control to do it** — a note describing a
             * step with no door. Now it opens `008`'s ingest with the destination
             * carried, so the gate hands her back here instead of into the adapt
             * flow.
             */
            onBring={() => go({ type: 'legacy', view: 'ingest', then: 'guide' })}
            /*
             * And the conversation, which was rendered by this file and reachable
             * from nowhere: no code anywhere dispatched `view: 'guide-ask'`. `017`
             * US3 — «she loads a guide and asks about it» — was an entire feature
             * that could not be opened, in a specification marked «Built, all 26
             * tasks».
             */
            {...(route.job ? { onAsk: () => go({ type: 'legacy', view: 'guide-ask', job: route.job }) } : {})}
            {...(guideFor.name ? { learnerName: guideFor.name } : {})}
            onDone={() => { setGuideFor(null); go({ type: 'caseload' }); }}
            onBack={() => { setGuideFor(null); go({ type: 'caseload' }); }} />
        ) : null}
        {route.at === 'legacy' && route.view === 'guide-ask' && route.job ? (
          /*
           * Back to the document she was asking about, not out to the caseload
           * (COD-01). Asking is a read that writes nothing, so leaving it must
           * return her to where she was — and the job is on the route, so it can.
           */
          <GuideConversation jobId={route.job}
                             onBack={() => go({ type: 'legacy', view: 'guide', job: route.job })} />
        ) : null}
        {route.at === 'legacy' && route.view === 'acns' && guideFor ? (
          <AcnsDraftScreen
            learnerCode={guideFor.code}
            {...(guideFor.name ? { learnerName: guideFor.name } : {})}
            onBack={() => { setGuideFor(null); go({ type: 'caseload' }); }} />
        ) : null}
        {route.at === 'legacy' && route.view === 'acs' && guideFor ? (
          <AcsHelpScreen
            learnerCode={guideFor.code}
            {...(guideFor.name ? { learnerName: guideFor.name } : {})}
            onBack={() => { setGuideFor(null); go({ type: 'caseload' }); }} />
        ) : null}
        {/*
          `&& !review` is gone with the state it guarded. That condition is what made the
          screen render nothing after one review — it was reading a value nothing ever
          reset, and the fix is that there is no such value (FLU-01).
        */}
        {route.at === 'legacy' && route.view === 'adapt'
          ? <AdaptScreen
              onReview={(jobId, learner, recipes) => go({
                type: 'legacy', view: 'review',
                job: jobId, sheet: { learner, recipes }, back: { of: 'batch' },
              })}
              onChooseFile={() => go({ type: 'legacy', view: 'ingest' })}
              onFinished={() => dispatch({ type: 'reset' })}
              {...(route.ran ? { resumeBatch: route.job } : { presetJobId: route.job })}
              presetLearners={intent.learners}
              {...(intent.kind ? { presetKind: intent.kind } : {})} />
          : null}
        {route.at === 'legacy' && route.view === 'ingest'
          ? <IngestScreen
              /*
               * `then` travels through the gate (COD-01, decision P37). The
               * curriculum section brings its own document, and `017`'s guide needs
               * a **verified** extraction — so the ingest and the verification are
               * the same machinery either way, and only the destination differs.
               */
              onIngested={(r) => go({
                type: 'legacy', view: 'verify', job: r.jobId,
                ...(route.then ? { then: route.then } : {}),
              })}
              onResume={(jobId) => go({
                type: 'legacy', view: 'verify', job: jobId,
                ...(route.then ? { then: route.then } : {}),
              })} />
          : null}
        {route.at === 'legacy' && route.view === 'verify' && route.job
          ? <VerifyScreen jobId={route.job}
                          /*
                           * What is on the other side of the gate, said in the words
                           * of the document she actually brought (COD-01).
                           */
                          {...(route.then === 'guide' ? {
                            next: {
                              label: 'Ver sus medidas',
                              why: 'Ya puedo sacarte las medidas de este documento. Las verás antes de que guarde nada.',
                            },
                          } : {})}
                          onVerified={() => go(route.then === 'guide'
                            ? { type: 'legacy', view: 'guide', job: route.job }
                            : { type: 'legacy', view: 'adapt', job: route.job })} />
          : null}
        {route.at === 'legacy' && route.view === 'review' && route.sheet
          ? <ReviewScreen jobId={route.job ?? ''} learner={route.sheet.learner}
                          {...(route.sheet.recipes ? { recipes: route.sheet.recipes } : {})}
                          {...reviewBack(route.back, route.job)} />
          : null}
        {/*
          Her caseload: the opening screen, and the only thing it does is list and say
          which learner she picked (`020` T010). It used to hold four sub-views of its
          own in local state — the profile editor, the record, the handover and erasure
          — which is how the editor became the centre of the learner.
        */}
        {route.at === 'caseload' ? (
          <LearnersScreen
            onOpen={(code) => go({ type: 'learner/open', code })}
            onNew={() => go({ type: 'learner/new' })} />
        ) : null}

        {/*
          A learner who does not exist yet. The editor, and nothing around it — she is
          answering «who is this child», not choosing what to do with him.
        */}
        {route.at === 'newLearner' ? (
          <Page title="Un alumno nuevo"
                lede="Con lo que ves en clase es suficiente. No hace falta ningún diagnóstico, y su nombre no llega a ningún fichero.">
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                    onClick={() => go({ type: 'caseload' })}>
              ← Mis alumnos
            </button>
            {/*
              Saved, and she is now inside the learner she just created — «Quién es»,
              where she can keep going with his axes.

              The first version went back to the caseload, and `e2e/learner.spec.ts`
              caught what that costs: the editor's own «Guardado» never appeared, because
              the screen had already changed. Being thrown out of a form the instant it
              succeeds is disorienting even when nothing is lost, and here she is usually
              only half done.
            */}
            {/*
              Saving does **not** navigate.

              Two versions of this were wrong and `e2e/learner.spec.ts` caught both:
              going back to the caseload, and opening the learner just created. Both
              unmount the editor, and the editor's own «Guardado» is the only thing that
              tells her it worked — so she pressed save and the screen changed under her
              with no confirmation. She leaves when she decides to, by «← Mis alumnos».
            */}
            <ProfileEditor code={null} onConfigure={() => go({ type: 'settings' })}
                           onSaved={() => { /* she stays, and sees «Guardado» */ }} />
          </Page>
        ) : null}

        {/*
          Inside a learner (`020` US1) — the point of the whole specification.

          Her name comes from the roster join in the data layer (`013` FR-1107) and is
          display only; the route carries the code, because a name in navigation state is
          a name something could later try to persist (`003`).
        */}
        {/*
          Inside a learner (`020` US1, option A) — the point of the whole specification.
          The rail carries who this is and which section she is in, so the content area
          is the section itself and nothing wraps it.
        */}
        {route.at === 'learner' ? (
          <LearnerSection
              code={route.code}
              {...(whoIs(route.code)?.name ? { name: whoIs(route.code)!.name } : {})}
              tab={route.tab}
              /*
               * `017`, reached from the learner it is about — which is where it always
               * belonged: it is one child's official document, not a piece of work.
               */
              onGuide={(what) => {
                const who = whoIs(route.code);
                setGuideFor({ code: route.code, ...(who?.name ? { name: who.name } : {}) });
                go({ type: 'legacy', view: what });
              }}
              /*
               * T018 · «hazlo otra vez para otro alumno». The extraction is reused —
               * `presetJobId` skips the paste and the verification gate, so no provider
               * call is made for the reading (`016` FR-1409, SC-1405). The learners are
               * cleared and the kind is kept: same material, different child.
               */
              onReuse={(jobId, kind) => {
                dispatch({ type: 'reset' });
                dispatch({ type: 'work/set', work: 'adapt' });
                dispatch({ type: 'kind/set', kind });
                go({ type: 'legacy', view: 'adapt', job: jobId });
              }}
              /*
               * «Revisar y firmar» for a draft that is still waiting (P11).
               *
               * The route carries where to come back to, so signing a sheet from the
               * record returns her to the record — and the review is reachable for any
               * unsigned sheet at any time, not only inside the run that made it.
               */
              onReview={(jobId, learner) => go({
                type: 'legacy', view: 'review',
                job: jobId, sheet: { learner },
                back: { of: 'learner', code: route.code, tab: 'made' },
              })}
              /*
               * Until US2 builds the steps here, `Preparar` hands her to the existing
               * door **with this learner already chosen**. That is what makes US1
               * shippable without taking anything away: the section is real and works,
               * and US2 replaces what is inside it rather than where it is.
               */
              onPrepare={() => {
                dispatch({ type: 'reset' });
                dispatch({ type: 'learner/add', code: route.code });
                go({ type: 'legacy', view: 'door' });
              }}
              onErased={() => go({ type: 'caseload' })}
              /*
               * Out to Configuración ▸ Pictogramas **carrying where she came from**, so
               * the way back lands on this learner and this section rather than on the
               * caseload (`025` FR-2304).
               */
              onConfigure={() => go({
                type: 'settings', pane: 'pictograms',
                from: { code: route.code, tab: route.tab },
              })} />
        ) : null}

        {route.at === 'legacy' && route.view === 'notes' ? <NotesScreen /> : null}
        {/*
          Configuración (`025` FR-2305). «Mi servicio de IA» and «Acerca de» used to be
          top-level `legacy` views beside «Mis alumnos»; they are settings, so they are
          sections of this. `020`'s own diagnosis was that the rail mixed «una acción,
          una entidad, datos, un ajuste e información» as if they were siblings.
        */}
        {route.at === 'settings' ? (
          /*
           * Reconnecting reuses the onboarding step rather than a second paste box: the
           * walkthrough, the five failure sentences and the validate-before-store
           * ordering all live there, and a second copy would be a second place for them
           * to drift. Moved with the screen, unchanged (FR-2307).
           */
          route.reconnecting
            ? (
              <div className="stack gap4">
                {/*
                  A way out (FLU-03).

                  There was none: `ConnectStep` only reports success, and the state that
                  put it on screen only cleared on a completed reconnection — so a
                  teacher who pressed «cambiar de servicio» out of curiosity found the
                  paste-a-key wizard in place of *every* section of Configuración, for
                  the rest of the session. Including the pictograms her learner's profile
                  had just sent her to (`025` SC-2304).

                  The wizard itself is untouched (FR-2307 moved it unchanged); leaving is
                  the shell's business, and this is the shell.
                */}
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                        onClick={() => go({ type: 'settings', pane: 'service' })}>
                  ← Dejarlo como está
                </button>
                <ConnectStep onDone={() => go({ type: 'settings', pane: 'service' })} />
              </div>
            )
            : (
              <SettingsSections pane={route.pane}
                                onReconnect={(id) => go({
                                  type: 'settings', pane: 'service', reconnecting: id,
                                })} />
            )
        ) : null}
      </main>
    </div>
  );
}
