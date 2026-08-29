import { useEffect, useState } from 'react';
import { useStrings } from './i18n/context.js';
import { LearnersScreen } from './learners/LearnersScreen.js';
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
import { applyStoredPreferences } from './settings/preferences.js';
import { detectStep, loadState, saveState, type Step } from './onboarding/state.js';

type View = 'learners' | 'adapt' | 'ingest' | 'verify' | 'review' | 'notes' | 'connection' | 'about';

export function App() {
  const { t: es, locale, setLocale, locales } = useStrings();
  const [step, setStep] = useState<Step | null>(null);
  const [view, setView] = useState<View>('adapt');
  const [review, setReview] = useState<{ jobId: string; learner: string; recipes: string[] } | null>(null);
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
            <ProfileEditor code={null} onSaved={() => { saveState({ step: 'done' }); setStep('done'); setView('adapt'); }} />
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="app">
      <nav className="rail" aria-label="Secciones de Rampa">
        <div className="rail-brand"><Wordmark size={19} /></div>
        <button aria-current={view === 'adapt' ? 'page' : undefined} onClick={() => { setView('adapt'); setReview(null); }}>
          {es.nav.adapt}</button>
        <button aria-current={view === 'learners' ? 'page' : undefined} onClick={() => setView('learners')}>
          {es.nav.learners}</button>
        <button aria-current={view === 'notes' ? 'page' : undefined} onClick={() => setView('notes')}>
          {es.nav.notes}</button>
        <button aria-current={view === 'connection' ? 'page' : undefined} onClick={() => setView('connection')}>
          {es.nav.connection}</button>
        <button aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')}>
          {es.nav.about}</button>
        <div className="grow" />
        <div className="stack gap2" style={{ padding: 'var(--s3) var(--s2) 0' }}>
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
        {view === 'adapt' && !review
          ? <AdaptScreen
              onReview={(jobId, learner, recipes) => { setReview({ jobId, learner, recipes }); setView('review'); }}
              onChooseFile={() => setView('ingest')}
              presetJobId={ingested ?? undefined} />
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
        {view === 'learners' ? <LearnersScreen /> : null}
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
