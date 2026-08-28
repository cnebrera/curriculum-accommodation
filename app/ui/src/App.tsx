import { useEffect, useState } from 'react';
import { useStrings } from './i18n/context.js';
import { LearnersScreen } from './learners/LearnersScreen.js';
import { AdaptScreen } from './adapt/AdaptScreen.js';
import { ReviewScreen } from './review/ReviewScreen.js';
import { NotesScreen } from './notes/NotesScreen.js';
import { AboutScreen } from './about/AboutScreen.js';
import { VaultStep } from './onboarding/VaultStep.js';
import { ConnectStep } from './onboarding/ConnectStep.js';
import { ProfileEditor } from './learners/ProfileEditor.js';
import { CostBadge } from './components/CostBadge.js';
import { detectStep, loadState, saveState, type Step } from './onboarding/state.js';

type View = 'learners' | 'adapt' | 'review' | 'notes' | 'about';

export function App() {
  const { t: es, locale, setLocale, locales } = useStrings();
  const [step, setStep] = useState<Step | null>(null);
  const [view, setView] = useState<View>('adapt');
  const [review, setReview] = useState<{ jobId: string; learner: string } | null>(null);

  useEffect(() => {
    const saved = loadState();
    void detectStep().then((detected) => setStep(saved.vaultRoot || detected !== 'vault' ? detected : 'vault'));
  }, []);

  if (step === null) return <div className="main"><p className="muted">Abriendo…</p></div>;

  if (step !== 'done') {
    const order: Step[] = ['vault', 'connect', 'learner'];
    return (
      <div className="main" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1>{es.onboarding.welcome}</h1>
        <p className="muted">{es.onboarding.intro}</p>
        <div className="steps" aria-hidden="true">
          {order.map((s) => <span key={s} className={order.indexOf(s) <= order.indexOf(step) ? 'done' : ''} />)}
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
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="nav" aria-label="Secciones">
        <h1>{es.app}</h1>
        <button aria-current={view === 'adapt' ? 'page' : undefined} onClick={() => { setView('adapt'); setReview(null); }}>
          {es.nav.adapt}</button>
        <button aria-current={view === 'learners' ? 'page' : undefined} onClick={() => setView('learners')}>
          {es.nav.learners}</button>
        <button aria-current={view === 'notes' ? 'page' : undefined} onClick={() => setView('notes')}>
          {es.nav.notes}</button>
        <button aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')}>
          {es.nav.about}</button>
        <div style={{ padding: '14px 10px' }} className="stack">
          <CostBadge />
          {locales.length > 1 ? (
            <select aria-label="Idioma" value={locale}
                    onChange={(e) => setLocale(e.target.value as typeof locale)}>
              {locales.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          ) : null}
        </div>
      </nav>
      <main className="main">
        {view === 'adapt' && !review
          ? <AdaptScreen onReview={(jobId, learner) => { setReview({ jobId, learner }); setView('review'); }} />
          : null}
        {view === 'review' && review ? <ReviewScreen jobId={review.jobId} learner={review.learner} /> : null}
        {view === 'learners' ? <LearnersScreen /> : null}
        {view === 'notes' ? <NotesScreen /> : null}
        {view === 'about' ? <AboutScreen /> : null}
      </main>
    </div>
  );
}
