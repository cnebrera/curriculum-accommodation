import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { Walkthrough } from './Walkthrough.js';
import { ServiceComparison } from './ServiceComparison.js';
import { loadServices, formatDate, type Service } from './services.js';
import { loadState, saveState } from './state.js';

/**
 * The step most likely to lose her (009 US1–US4, replacing 006 FR-403).
 *
 * The previous version offered two services with a radio button each and one
 * error message for every possible failure. The vocabulary was the barrier, and
 * it still is: "create an API key" is five unfamiliar words before anything
 * works.
 *
 * So: **one question**, then **one recommendation with a reason she could repeat
 * to her head teacher**, then the walkthrough for that service, and the paste
 * box. Comparing all six is one click away and never in the way.
 *
 * Not one word about any service is written in this file. Every label, cost,
 * limit, step and warning comes from `instructions/providers/`, and the
 * recommendation comes from the rule in `@rampa/core` over IPC — because the
 * rule is the part of this feature that is wrong in ways nobody notices, and it
 * belongs where 21 tests can see it.
 */
type Stage = 'question' | 'recommendation' | 'compare' | 'walkthrough';

interface Reco {
  ok: boolean;
  serviceId?: string;
  reason?: string;
  because?: string;
  message?: string;
  suggestion?: string;
}

type Verdict =
  | { ok: true; costCents: number }
  | { ok: false; text: string; switchTo?: Service };

export function ConnectStep({ onDone }: { onDone: (providerId: string) => void }) {
  const { t: es } = useStrings();
  const c = es.connect;

  const [services, setServices] = useState<Service[] | null>(null);
  const [stage, setStage] = useState<Stage>('question');
  const [canUseCard, setCanUseCard] = useState<boolean | null>(null);
  const [location, setLocation] = useState<'eu' | undefined>(undefined);
  const [reco, setReco] = useState<Reco | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    void loadServices().then((list) => {
      setServices(list);
      /**
       * T017 · FR-719. Reopening returns her to the service she was working on.
       * She will be interrupted — that is the premise of the whole onboarding —
       * and coming back to "¿puedes usar una tarjeta?" after she had already
       * answered it and opened Groq's console is how a setup gets abandoned.
       */
      const saved = loadState().connectServiceId;
      if (saved && list.some((s) => s.id === saved)) {
        setChosen(saved);
        setStage('walkthrough');
      }
    });
  }, []);

  const answer = async (card: boolean, loc?: 'eu') => {
    setCanUseCard(card);
    setLocation(loc);
    const r = await window.rampa.corpus.recommend({ canUseCard: card, locationConstraint: loc }) as Reco;
    setReco(r);
    setStage('recommendation');
  };

  const pick = (id: string) => {
    setChosen(id);
    setKey('');
    setVerdict(null);
    setStage('walkthrough');
    saveState({ ...loadState(), connectServiceId: id });
  };

  const service = services?.find((s) => s.id === chosen) ?? null;

  /**
   * The five sentences (T030–T032).
   *
   * The shape check runs first and offline: it costs nothing, it works when the
   * school connection is down, and it is what makes these five *different*
   * sentences rather than one generic one with five causes.
   */
  const check = async () => {
    if (!service || !services) return;
    setChecking(true);
    setVerdict(null);
    try {
      const shape = await window.rampa.providers.shapeCheck(service.id, key) as
        { ok: boolean; kind?: string; ownerId?: string; key?: string };

      if (!shape.ok) {
        const owner = services.find((s) => s.id === shape.ownerId);
        setVerdict({
          ok: false,
          switchTo: shape.kind === 'wrong-service' ? owner : undefined,
          text:
            shape.kind === 'empty' ? c.errEmpty
            : shape.kind === 'page' ? c.errPage
            : shape.kind === 'wrong-service' && owner ? c.errWrongService(owner.label, service.label)
            : shape.kind === 'too-short' ? c.errTooShort
            : c.errUnknown,
        });
        return;
      }

      const r = await window.rampa.providers.validate(service.id, shape.key ?? key);
      if (r.ok) {
        // FR-730/T035: validation precedes storage, so a failed replacement can
        // never be destructive. The save happens only on this branch.
        await window.rampa.providers.save(service.id, shape.key ?? key);
        setVerdict({ ok: true, costCents: service.costCents });
        saveState({ ...loadState(), connectServiceId: undefined });
        setTimeout(() => onDone(service.id), 1200);
        return;
      }
      setVerdict({
        ok: false,
        text:
          r.reason === 'expired' ? c.errExpired
          : r.reason === 'no-credit' ? c.errNoCredit
          : r.reason === 'network' ? c.errNetwork
          : r.reason === 'wrong-provider' ? (r.message ?? c.errUnknown)
          : r.reason === 'malformed' ? (r.message ?? c.errUnknown)
          : c.errUnknown,
      });
    } finally {
      setChecking(false);
    }
  };

  if (!services) {
    return <p className="small" aria-live="polite">Un momento…</p>;
  }

  if (services.length === 0) {
    // An empty catalogue is a broken installation, not a state she caused.
    return (
      <Callout intent="danger" title="No encuentro los servicios">
        Es un problema de la instalación, no tuyo. Vuelve a instalar Rampa.
      </Callout>
    );
  }

  /* ── One question ─────────────────────────────────────────────────────── */
  if (stage === 'question') {
    return (
      <div className="stack gap5">
        <div className="stack gap2">
          <h2>{es.onboarding.connectTitle}</h2>
          <p className="lede">{es.onboarding.connectWhy}</p>
        </div>

        <fieldset className="fieldset">
          <legend><h3>{c.cardQuestion}</h3></legend>
          <p className="small">{c.cardWhy}</p>
          <div className="row gap2">
            <button className="btn btn-primary btn-lg" onClick={() => void answer(true, location)}>
              {c.cardYes}
            </button>
            <button className="btn btn-lg" onClick={() => void answer(false, location)}>
              {c.cardNo}
            </button>
          </div>
          <p className="small">{c.cardNoHint}</p>
        </fieldset>

        {/*
          T018 · FR-708. One quiet line, and "no lo sé" is first-class: it leaves
          the recommendation exactly as it would have been. A teacher who has not
          been told what her school requires must not end up worse off than one
          who has.
        */}
        <details className="details">
          <summary>{c.locationQuestion}</summary>
          <div className="stack gap3" style={{ paddingBottom: 'var(--s4)' }}>
            <p className="small">{c.locationWhy}</p>
            <div className="segmented" role="group" aria-label={c.locationQuestion}>
              <button type="button" aria-pressed={location === 'eu'} onClick={() => setLocation('eu')}>
                {c.locationEu}
              </button>
              <button type="button" aria-pressed={location === undefined} onClick={() => setLocation(undefined)}>
                {c.locationUnknown}
              </button>
            </div>
            {/* FR-708a. Never claims that nothing personal leaves. */}
            <p className="small">{c.residual}</p>
          </div>
        </details>
      </div>
    );
  }

  /* ── The comparison ───────────────────────────────────────────────────── */
  if (stage === 'compare') {
    return (
      <ServiceComparison
        services={services}
        onChoose={pick}
        onBack={() => setStage(reco ? 'recommendation' : 'question')}
      />
    );
  }

  /* ── One recommendation, with its reason ──────────────────────────────── */
  if (stage === 'recommendation') {
    const recommended = services.find((s) => s.id === reco?.serviceId);

    return (
      <div className="stack gap5">
        <h2>{reco?.ok ? c.recommendTitle : c.conflictTitle}</h2>

        {reco?.ok && recommended ? (
          <>
            <div className="card card-plain stack gap4">
              <div className="stack gap1">
                <span className="svc-name">{recommended.label}</span>
                <span className="meta">{recommended.vendor}</span>
              </div>

              <div className="stack gap2">
                <span className="small"><strong>{c.recommendWhy}</strong></span>
                {/* Generated by the rule, so it cannot drift from the decision. */}
                <p style={{ margin: 0 }}>{reco.reason}</p>
              </div>

              <dl className="facts">
                <dt>{c.colCost}</dt>
                <dd>
                  {recommended.costCents === 0
                    ? 'gratis'
                    : `~${recommended.costCents} céntimo${recommended.costCents === 1 ? '' : 's'}`}
                  {!recommended.costMeasured ? <span className="meta"> ({c.estimate})</span> : null}
                </dd>
                <dt>{c.colWhere}</dt>
                <dd>{recommended.processedIn}</dd>
                <dt>{c.colTrains}</dt>
                <dd>{c.trains[recommended.trainsOnInput] ?? recommended.trainsOnInput}</dd>
                {recommended.freeTier ? (<><dt>{c.colFree}</dt><dd>{recommended.freeTier}</dd></>) : null}
              </dl>

              <span className="meta">
                {recommended.freshness === 'ageing'
                  ? `⚠ ${c.checkedAgo(recommended.monthsSinceChecked)}`
                  : c.checkedOn(formatDate(recommended.lastChecked))}
              </span>
            </div>

            <div className="row gap2">
              <button className="btn btn-primary btn-lg" onClick={() => pick(recommended.id)}>
                {c.recommendUse}
              </button>
              <button className="btn btn-ghost" onClick={() => setStage('compare')}>
                {c.recommendCompare}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* FR-713: a dead end is never the last thing she reads. */}
            <Callout intent="decide" title={reco?.message ?? ''}>{reco?.suggestion ?? ''}</Callout>
            <div className="row gap2">
              <button className="btn btn-primary" onClick={() => setStage('compare')}>
                {c.recommendCompare}
              </button>
              <button className="btn btn-ghost" onClick={() => { setStage('question'); setReco(null); }}>
                Cambiar mi respuesta
              </button>
            </div>
          </>
        )}

        <p className="small">{c.residual}</p>
      </div>
    );
  }

  /* ── The walkthrough, and the paste box ───────────────────────────────── */
  if (!service) {
    setStage('question');
    return null;
  }

  return (
    <Walkthrough service={service} onBack={() => setStage(reco ? 'recommendation' : 'question')}>
      <div className="card stack gap3">
        <label htmlFor="key"><strong>{c.pasteLabel}</strong></label>
        <input className="input" id="key" type="password" value={key}
               autoComplete="off" spellCheck={false} aria-describedby="key-hint"
               onChange={(e) => { setKey(e.target.value); setVerdict(null); }} />
        <p className="small" id="key-hint">{c.pasteHint}</p>

        <div className="row">
          <button className="btn btn-primary" disabled={checking || !key} aria-busy={checking}
                  onClick={() => void check()}>
            {checking ? c.checking : es.onboarding.connectCheck}
          </button>
        </div>

        {/*
          `role="status"` rather than a bare `aria-live` div: `aria-label` on a
          generic element is prohibited by ARIA in HTML, and axe flags it as
          serious. The role permits a name and already implies polite.

          Named because this window has more than one polite live region — the
          onboarding step counter is the other — and an unnamed one is
          indistinguishable both to a screen reader user and to a test.
        */}
        <div role="status" aria-label="Resultado">
          {verdict?.ok ? (
            <Callout intent="ok" title={
              verdict.costCents === 0
                ? c.connectedFree
                : c.connectedCost(`unos ${verdict.costCents} céntimo${verdict.costCents === 1 ? '' : 's'}`)
            }>
              {/* FR-724: from the entry, never from a hardcoded three. */}
              Ya puedes adaptar tu primera ficha.
            </Callout>
          ) : verdict ? (
            <Callout intent="danger" title="No he podido conectar">
              {verdict.text}
              {verdict.switchTo ? (
                <div className="row" style={{ marginTop: 'var(--s3)' }}>
                  <button className="btn btn-sm" onClick={() => pick(verdict.switchTo!.id)}>
                    {c.errSwitchTo(verdict.switchTo.label)}
                  </button>
                </div>
              ) : null}
            </Callout>
          ) : null}
        </div>
      </div>
    </Walkthrough>
  );
}
