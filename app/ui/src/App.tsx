import { useEffect, useReducer, useState } from 'react';
import { useStrings } from './i18n/context.js';
import { LearnersScreen } from './learners/LearnersScreen.js';
import { DoorScreen } from './door/DoorScreen.js';
import { ComposeScreen, ComposeSummary } from './compose/ComposeScreen.js';
import type { ComposeResult } from './data/compose.js';
import { emptyIntent, reduceIntent } from './door/intent.js';
import { AdaptScreen } from './adapt/AdaptScreen.js';
import { IngestScreen } from './ingest/IngestScreen.js';
import { VerifyScreen } from './ingest/VerifyScreen.js';
import { ReviewScreen } from './review/ReviewScreen.js';
import { NotesScreen } from './notes/NotesScreen.js';
import { AboutScreen } from './about/AboutScreen.js';
import { ConnectionScreen } from './settings/ConnectionScreen.js';
import { VaultStep } from './onboarding/VaultStep.js';
import { ConnectStep } from './onboarding/ConnectStep.js';
import { ProfileEditor } from './learners/ProfileEditor.js';
import { CostBadge } from './components/CostBadge.js';
import { Logo, Wordmark } from './components/Logo.js';
import { DisplayPreferences } from './settings/DisplayPreferences.js';
import { applyStoredPreferences } from './data/preferences.js';
import { detectStep, loadState, saveState, type Step } from './data/onboarding.js';

/**
 * `door` is the front screen since `016`.
 *
 * `adapt` is no longer an entry point — it is where the adapt door leads, with the
 * learners and the kind already answered. That is the whole of what `016` changed
 * structurally: the application's first question stopped being «which file?».
 */
type View = 'door' | 'learners' | 'adapt' | 'compose' | 'composed'
  | 'ingest' | 'verify' | 'review' | 'notes' | 'connection' | 'about';

export function App() {
  const { t: es, locale, setLocale, locales } = useStrings();
  const [step, setStep] = useState<Step | null>(null);
  const [view, setView] = useState<View>('door');
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
  const [review, setReview] = useState<{ jobId: string; learner: string; recipes: string[] } | null>(null);
  const [learnersNonce, setLearnersNonce] = useState(0);
  /** A service she is reconnecting from the connection screen (009 US5). */
  const [reconnect, setReconnect] = useState<string | null>(null);
  /** An ingested job waiting to be verified (008). */
  const [ingested, setIngested] = useState<string | null>(null);

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
            <ProfileEditor code={null} onSaved={() => { saveState({ step: 'done' }); setStep('done'); setView('door'); }} />
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="app">
      <nav className="rail" aria-label="Secciones de Rampa">
        <div className="rail-brand"><Wordmark size={19} /></div>
        {/*
          FR-1402: the rail said «Adaptar material», which is what `012` FR-1011
          forbids in so many words — the interface must stop using one word for
          several things. It is now the door, and the door asks.
        */}
        <button aria-current={view === 'door' ? 'page' : undefined}
                onClick={() => { setView('door'); setReview(null); setComposed(null); }}>
          {es.nav.work}</button>
        {/*
          Bumping the nonce remounts `LearnersScreen`, which is what makes
          pressing «Mis alumnos» while already inside a learner's profile take
          her back to the list. Before this it did nothing visible: the rail
          changed `view` to a value it already had, and the screen's own
          `editing` state survived — so the one control that should always mean
          "start again here" was the one that appeared broken.
        */}
        <button aria-current={view === 'learners' ? 'page' : undefined}
                onClick={() => { setView('learners'); setLearnersNonce((n) => n + 1); }}>
          {es.nav.learners}</button>
        <button aria-current={view === 'notes' ? 'page' : undefined} onClick={() => setView('notes')}>
          {es.nav.notes}</button>
        <button aria-current={view === 'connection' ? 'page' : undefined} onClick={() => setView('connection')}>
          {es.nav.connection}</button>
        <button aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')}>
          {es.nav.about}</button>
        <div className="grow" />
        {/*
          T006 · a composed block, not two controls pinned to the floor.
          Separated by a rule rather than by a void, so it reads as the rail's
          foot rather than as things that fell down there.
        */}
        <div className="rail-foot">
          <CostBadge />
          <DisplayPreferences />
          {/*
            Real since T095: every screen reads its strings through this context,
            so a locale change moves the whole interface. A key missing from a
            partial locale falls back to Spanish rather than showing blank —
            which is why offering an incomplete translation is honest, and why
            offering it *before* the sweep was not.
          */}
          {locales.length > 1 ? (
            <select className="select" aria-label="Idioma" value={locale}
                    onChange={(e) => setLocale(e.target.value as typeof locale)}>
              {locales.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          ) : null}
        </div>
      </nav>
      <main className="main">
        {view === 'door' ? (
          <DoorScreen
            intent={intent}
            dispatch={dispatch}
            onAdapt={() => setView('adapt')}
            onCompose={() => setView('compose')}
            onNewLearner={() => { setView('learners'); setLearnersNonce((n) => n + 1); }} />
        ) : null}
        {view === 'compose' ? (
          <ComposeScreen
            learners={intent.learners}
            onComposed={(jobId, result) => { setComposed({ jobId, result }); setView('composed'); }}
            onBack={() => setView('door')} />
        ) : null}
        {view === 'composed' && composed ? (
          /*
           * The decision point research R2 argued for: she reads what nothing could
           * check **before** paying to adapt it, and can abandon without spending
           * more. Adapting reuses `presetJobId`, so the composed sheet goes through
           * the existing pipeline unchanged (`002` T013).
           */
          <ComposeSummary
            result={composed.result}
            learners={intent.learners}
            onAdapt={() => { setIngested(composed.jobId); setView('adapt'); }}
            onDiscard={() => { setComposed(null); setView('door'); }} />
        ) : null}
        {view === 'adapt' && !review
          ? <AdaptScreen
              onReview={(jobId, learner, recipes) => { setReview({ jobId, learner, recipes }); setView('review'); }}
              onChooseFile={() => setView('ingest')}
              presetJobId={ingested ?? undefined}
              presetLearners={intent.learners}
              {...(intent.kind ? { presetKind: intent.kind } : {})} />
          : null}
        {view === 'ingest'
          ? <IngestScreen
              onIngested={(r) => { setIngested(r.jobId); setView('verify'); }}
              onResume={(jobId) => { setIngested(jobId); setView('verify'); }} />
          : null}
        {view === 'verify' && ingested
          ? <VerifyScreen jobId={ingested} onVerified={() => setView('adapt')} />
          : null}
        {view === 'review' && review
          ? <ReviewScreen jobId={review.jobId} learner={review.learner} recipes={review.recipes} />
          : null}
        {view === 'learners' ? (
          <LearnersScreen
            key={learnersNonce}
            /*
             * T018 · the shortcut into the same door. The extraction is reused —
             * `presetJobId` skips the paste and the verification gate, so no
             * provider call is made for the reading (FR-1409, SC-1405). She still
             * picks the learners, because that is the whole point of the reuse.
             */
            onReuse={(jobId, kind) => {
              setIngested(jobId);
              /*
               * The learners are cleared and the kind is kept: it is the same
               * material, and the whole point of the reuse is that it goes to
               * somebody else.
               */
              dispatch({ type: 'reset' });
              dispatch({ type: 'work/set', work: 'adapt' });
              dispatch({ type: 'kind/set', kind });
              setView('adapt');
            }} />
        ) : null}
        {view === 'notes' ? <NotesScreen /> : null}
        {view === 'connection' ? (
          /*
           * Reconnecting reuses the onboarding step rather than a second paste
           * box: the walkthrough, the five failure sentences and the
           * validate-before-store ordering all live there, and a second copy
           * would be a second place for them to drift.
           */
          reconnect
            ? <ConnectStep onDone={() => { setReconnect(null); setView('connection'); }} />
            : <ConnectionScreen onReconnect={(id) => setReconnect(id)} />
        ) : null}
        {view === 'about' ? <AboutScreen /> : null}
      </main>
    </div>
  );
}
